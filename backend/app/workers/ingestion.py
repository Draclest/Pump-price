"""
Full Ingestion Pipeline
=======================
Run at startup and on the scheduled cron (every 6h by default).

Steps:
  1. Fetch gov data      ─┐
  2. Fetch OSM data       ├─ in parallel
     └─────────────────────┘
  3. Cross-reference gov ↔ OSM (enrich gov stations + collect OSM-only stations)
  4. Finalise: logos, brand colors, opening_hours display, is_open
  5. Bulk-index everything into Elasticsearch
"""

import asyncio
import logging
from datetime import datetime, timezone

from elasticsearch import AsyncElasticsearch

from app.services.elasticsearch_client import INDEX_NAME, ensure_index
from app.services import gov_client, osm_enrichment
from app.services.brand_logos import get_logo_url, get_brand_color
from app.services.opening_hours import is_open_now, format_opening_hours

logger = logging.getLogger(__name__)


def _finalise(station: dict) -> dict:
    """Compute derived display fields after cross-reference."""
    brand_key = station.get("brand_key")

    if brand_key:
        station.setdefault("logo_url", get_logo_url(brand_key))
        station.setdefault("brand_color", get_brand_color(brand_key))

    oh = station.get("opening_hours")
    if oh:
        if station.get("is_open") is None:
            computed = is_open_now(oh)
            if computed is not None:
                station["is_open"] = computed
        if not station.get("opening_hours_display"):
            station["opening_hours_display"] = format_opening_hours(oh)

    station.setdefault("ingested_at", datetime.now(timezone.utc).isoformat())
    return station


async def run_ingestion(es: AsyncElasticsearch) -> dict:
    start = datetime.now(timezone.utc)
    logger.info("=== Ingestion started ===")

    await ensure_index(es)

    # ── Step 1 & 2 : fetch both sources in parallel ────────────────────────────
    gov_task = asyncio.create_task(gov_client.fetch_all())
    osm_task = asyncio.create_task(osm_enrichment.fetch_all_france())

    gov_stations, osm_stations = await asyncio.gather(gov_task, osm_task)
    logger.info(
        "Fetched: gov=%d osm=%d",
        len(gov_stations), len(osm_stations),
    )

    # ── Step 3 : cross-reference ───────────────────────────────────────────────
    enriched_gov, osm_only = osm_enrichment.cross_reference(gov_stations, osm_stations)

    all_stations = enriched_gov + osm_only
    logger.info(
        "After cross-reference: gov_enriched=%d osm_only=%d total=%d",
        len(enriched_gov), len(osm_only), len(all_stations),
    )

    # ── Step 4 : finalise ─────────────────────────────────────────────────────
    all_stations = [_finalise(s) for s in all_stations]

    # ── Step 5 : bulk index ───────────────────────────────────────────────────
    operations = []
    for station in all_stations:
        if not station.get("id"):
            continue
        operations.append({"index": {"_index": INDEX_NAME, "_id": station["id"]}})
        operations.append(station)

    error_count = 0
    CHUNK = 1000
    for i in range(0, len(operations), CHUNK):
        bulk_resp = await es.bulk(operations=operations[i: i + CHUNK], refresh=False)
        errors = [
            item for item in bulk_resp.get("items", [])
            if item.get("index", {}).get("error")
        ]
        error_count += len(errors)
        if errors:
            logger.warning(
                "%d bulk errors in chunk %d", len(errors), i // CHUNK
            )

    await es.indices.refresh(index=INDEX_NAME)

    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    result = {
        "gov_fetched":   len(gov_stations),
        "osm_fetched":   len(osm_stations),
        "gov_enriched":  len(enriched_gov),
        "osm_only":      len(osm_only),
        "total_indexed": len(all_stations) - error_count,
        "bulk_errors":   error_count,
        "duration_seconds": round(elapsed, 2),
    }
    logger.info("=== Ingestion complete: %s ===", result)
    return result
