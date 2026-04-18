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

from app.services.elasticsearch_client import (
    INDEX_NAME, ensure_index, HISTORY_INDEX, ensure_history_index,
)
from app.config import settings
from app.services import gov_client, osm_enrichment
from app.services.brand_logos import get_logo_url, get_brand_color
from app.services.opening_hours import is_open_now, format_opening_hours
from app.services.ingestion_state import ingestion_state

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


async def _index_history(
    es: AsyncElasticsearch,
    stations: list[dict],
    date_str: str,
) -> int:
    """
    Bulk-index daily price snapshots into the history index.
    Doc IDs are deterministic: {station_id}_{fuel_type}_{date_str} — safe to re-run.
    Returns count of indexed docs.
    """
    operations = []
    for station in stations:
        sid = station.get("id")
        if not sid:
            continue
        for fuel in station.get("fuels", []):
            doc_id = f"{sid}_{fuel['type']}_{date_str}"
            operations.append(
                {"index": {"_index": HISTORY_INDEX, "_id": doc_id}}
            )
            operations.append({
                "station_id":  sid,
                "fuel_type":   fuel["type"],
                "price":       fuel["price"],
                "recorded_at": date_str,
                "city":        station.get("city"),
                "postal_code": station.get("postal_code"),
                "dep_code":    station.get("dep_code"),
                "reg_code":    station.get("reg_code"),
            })

    total = 0
    CHUNK = 2000
    for i in range(0, len(operations), CHUNK):
        bulk_resp = await es.bulk(operations=operations[i: i + CHUNK], refresh=False)
        errors = [
            item for item in bulk_resp.get("items", [])
            if item.get("index", {}).get("error")
        ]
        indexed = len(bulk_resp.get("items", [])) - len(errors)
        total += indexed
        if errors:
            logger.warning("%d history bulk errors in chunk %d", len(errors), i // CHUNK)

    await es.indices.refresh(index=HISTORY_INDEX)
    logger.info("History indexed: %d docs for date %s", total, date_str)
    return total


async def _cleanup_old_history(es: AsyncElasticsearch, keep_days: int) -> int:
    """Delete history records older than keep_days. Returns deleted count."""
    query = {
        "query": {
            "range": {
                "recorded_at": {"lt": f"now-{keep_days}d/d"}
            }
        }
    }
    try:
        resp = await es.delete_by_query(index=HISTORY_INDEX, body=query, refresh=True)
        deleted = resp.get("deleted", 0)
        logger.info("History cleanup: deleted %d docs older than %d days", deleted, keep_days)
        return deleted
    except Exception as exc:
        logger.warning("History cleanup failed (non-fatal): %s", exc)
        return 0


async def run_ingestion(es: AsyncElasticsearch) -> dict:
    # Prevent concurrent ingestion runs
    if ingestion_state.status == "running":
        logger.warning("Ingestion already running — skipping")
        return {"skipped": True, "reason": "already running"}

    ingestion_state.start()
    start = datetime.now(timezone.utc)
    logger.info("=== Ingestion started ===")

    try:
        return await _run_ingestion_inner(es, start)
    except Exception as exc:
        ingestion_state.fail(str(exc))
        logger.error("=== Ingestion FAILED: %s ===", exc)
        raise


async def _run_ingestion_inner(es: AsyncElasticsearch, start: datetime) -> dict:
    await ensure_index(es)
    await ensure_history_index(es)

    # ── Step 1 & 2 : fetch both sources in parallel ────────────────────────────
    gov_task = asyncio.create_task(gov_client.fetch_all())
    osm_task = asyncio.create_task(osm_enrichment.fetch_all_france())

    gov_stations, osm_stations = await asyncio.gather(gov_task, osm_task)

    if not osm_stations:
        logger.warning(
            "OSM fetch returned 0 stations — indexing with gov data only "
            "(no opening hours / services enrichment)."
        )
    logger.info("Fetched: gov=%d osm=%d", len(gov_stations), len(osm_stations))

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

    # ── Step 6 : history indexing ─────────────────────────────────────────────
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    history_indexed = await _index_history(es, all_stations, today_str)
    history_deleted = await _cleanup_old_history(es, settings.price_history_days)

    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    result = {
        "gov_fetched":             len(gov_stations),
        "osm_fetched":             len(osm_stations),
        "gov_enriched":            len(enriched_gov),
        "osm_only":                len(osm_only),
        "total_indexed":           len(all_stations) - error_count,
        "bulk_errors":             error_count,
        "history_indexed":         history_indexed,
        "history_cleanup_deleted": history_deleted,
        "duration_seconds":        round(elapsed, 2),
    }
    ingestion_state.complete(result)
    logger.info("=== Ingestion complete: %s ===", result)
    return result
