"""
Background Station Refresh
===========================
Triggered after each search response to keep station data fresh.

Staleness thresholds (configurable via settings):
  - GOV prices  : refresh if gov_last_updated > GOV_REFRESH_HOURS  (default 6h)
  - OSM metadata: refresh if osm_last_updated > OSM_REFRESH_DAYS   (default 7d)

Concurrency guard:
  _in_flight: set of ES station IDs currently being refreshed.
  Prevents duplicate concurrent refreshes for the same station.

Each refresh patches only the changed fields via ES update (not full replace).
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from elasticsearch import AsyncElasticsearch

from app.config import settings
from app.services.elasticsearch_client import INDEX_NAME
from app.services import gov_client, osm_enrichment
from app.services.brand_logos import get_logo_url, get_brand_color
from app.services.opening_hours import is_open_now, format_opening_hours

logger = logging.getLogger(__name__)

# In-memory concurrency guard (per process)
_in_flight: set[str] = set()


def _is_gov_stale(gov_last_updated: Optional[str]) -> bool:
    if not gov_last_updated:
        return True
    try:
        updated = datetime.fromisoformat(gov_last_updated.replace("Z", "+00:00"))
        threshold = datetime.now(timezone.utc) - timedelta(hours=settings.gov_refresh_hours)
        return updated < threshold
    except Exception:
        return True


def _is_osm_stale(osm_last_updated: Optional[str]) -> bool:
    if not osm_last_updated:
        return True
    try:
        updated = datetime.fromisoformat(osm_last_updated.replace("Z", "+00:00"))
        threshold = datetime.now(timezone.utc) - timedelta(days=settings.osm_refresh_days)
        return updated < threshold
    except Exception:
        return True


async def _patch_station(es: AsyncElasticsearch, station_id: str, fields: dict) -> None:
    """Partial update of a station document in ES."""
    try:
        await es.update(
            index=INDEX_NAME,
            id=station_id,
            body={"doc": fields},
        )
        logger.debug("Patched station %s with fields: %s", station_id, list(fields.keys()))
    except Exception as exc:
        logger.warning("Failed to patch station %s: %s", station_id, exc)


async def _refresh_gov(es: AsyncElasticsearch, station_id: str, gov_station_id: str) -> None:
    """Re-fetch prices from the gov API and patch ES."""
    logger.info("GOV refresh: station=%s gov_id=%s", station_id, gov_station_id)
    stations = await gov_client.fetch_by_ids([gov_station_id])
    if not stations:
        logger.warning("GOV refresh: no data returned for gov_id=%s", gov_station_id)
        return

    s = stations[0]
    patch = {
        "fuels":            s["fuels"],
        "services":         s["services"],
        "is_open":          s.get("is_open"),
        "gov_last_updated": s["gov_last_updated"],
    }
    # Propagate 24/7 opening_hours from gov if OSM didn't set one
    if s.get("opening_hours") == "24/7":
        patch["opening_hours"] = "24/7"
        patch["opening_hours_display"] = "Ouvert 24h/24"

    await _patch_station(es, station_id, patch)


async def _refresh_osm(
    es: AsyncElasticsearch,
    station_id: str,
    osm_node_id: str,
    osm_node_type: str,
) -> None:
    """Re-fetch metadata from OSM and patch ES."""
    logger.info("OSM refresh: station=%s osm_id=%s", station_id, osm_node_id)
    osm = await osm_enrichment.fetch_by_osm_id(osm_node_id, osm_node_type)
    if not osm:
        logger.warning("OSM refresh: no data returned for osm_id=%s", osm_node_id)
        return

    fields = osm_enrichment.extract_osm_fields(osm)
    brand_key = fields["_osm_brand_key"]

    patch: dict = {"osm_last_updated": fields["osm_last_updated"]}

    if fields["_osm_opening_hours"]:
        oh = fields["_osm_opening_hours"]
        patch["opening_hours"]         = oh
        patch["opening_hours_display"] = format_opening_hours(oh)
        # Recompute is_open with fresh hours
        computed = is_open_now(oh)
        if computed is not None:
            patch["is_open"] = computed

    if brand_key:
        patch["brand_key"]    = brand_key
        patch["logo_url"]     = get_logo_url(brand_key)
        patch["brand_color"]  = get_brand_color(brand_key)

    # Fill name/brand only if still missing
    if fields["_osm_name"]:
        patch["_osm_name_hint"] = fields["_osm_name"]   # stored for merge logic below
    if fields["_osm_brand"] and not patch.get("brand"):
        patch["brand"] = fields["_osm_brand"]

    # Remove internal hints before patching
    patch.pop("_osm_name_hint", None)

    await _patch_station(es, station_id, patch)


async def _refresh_station(
    es: AsyncElasticsearch,
    station_id: str,
    gov_station_id: Optional[str],
    osm_node_id: Optional[str],
    osm_node_type: Optional[str],
    gov_last_updated: Optional[str],
    osm_last_updated: Optional[str],
    data_sources: list[str],
) -> None:
    """Refresh a single station from its stale sources."""
    tasks = []

    if "gov" in data_sources and gov_station_id and _is_gov_stale(gov_last_updated):
        tasks.append(_refresh_gov(es, station_id, gov_station_id))

    if "osm" in data_sources and osm_node_id and _is_osm_stale(osm_last_updated):
        tasks.append(_refresh_osm(es, station_id, osm_node_id, osm_node_type or "node"))

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


async def schedule_refresh(
    es: AsyncElasticsearch,
    stations: list[dict],
) -> None:
    """
    Entry point called after each search response.

    Filters stations that need refreshing, deduplicates against in-flight
    set, and runs refresh jobs concurrently (max MAX_CONCURRENT per call).
    """
    MAX_CONCURRENT = 5

    candidates = [
        s for s in stations
        if s["id"] not in _in_flight
        and (
            _is_gov_stale(s.get("gov_last_updated"))
            or _is_osm_stale(s.get("osm_last_updated"))
        )
    ]

    if not candidates:
        return

    logger.info(
        "Scheduling background refresh for %d/%d stations",
        len(candidates), len(stations),
    )

    # Acquire concurrency slots
    to_refresh = candidates[:MAX_CONCURRENT]
    for s in to_refresh:
        _in_flight.add(s["id"])

    async def _run_and_release(s: dict) -> None:
        try:
            await _refresh_station(
                es,
                station_id      = s["id"],
                gov_station_id  = s.get("gov_station_id"),
                osm_node_id     = s.get("osm_node_id"),
                osm_node_type   = s.get("osm_node_type"),
                gov_last_updated= s.get("gov_last_updated"),
                osm_last_updated= s.get("osm_last_updated"),
                data_sources    = s.get("data_sources", []),
            )
        finally:
            _in_flight.discard(s["id"])

    # Fire and forget — caller does not await this
    asyncio.gather(*[_run_and_release(s) for s in to_refresh], return_exceptions=True)
