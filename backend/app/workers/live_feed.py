"""
Live Feed Worker
================
Polls the prix-carburants-flux-instantane-v2 dataset every 10 minutes.

Strategy:
  - Fetch the full live feed (~74k records, ~2-3 MB, updated every few minutes by stations)
  - Group by station ID and extract current prices
  - Bulk-patch only the `fuels` and `gov_last_updated` fields in Elasticsearch
  - Never touches OSM data, addresses, or brand info (those are handled by the daily ingestion)
  - doc_as_upsert=false: skips stations not yet in ES (avoids creating incomplete documents)

This gives near-real-time prices without the cost of a full re-ingestion.
"""

import logging
from datetime import datetime, timezone

from elasticsearch import AsyncElasticsearch

from app.services.elasticsearch_client import INDEX_NAME
from app.services import gov_client
from app.services.opening_hours import is_open_now
from app.services.ingestion_state import live_feed_state

logger = logging.getLogger(__name__)

_CHUNK = 1000

# Simple in-process guard — prevents overlapping runs if a fetch takes > 10 min
_running = False


async def run_live_feed(es: AsyncElasticsearch) -> dict:
    """
    Fetch the live price feed and patch Elasticsearch with updated fuel prices.
    Non-blocking guard: skips if a previous run is still in progress.
    """
    global _running
    if _running:
        logger.debug("Live feed already running — skipping this tick")
        return {"skipped": True, "reason": "already running"}

    _running = True
    live_feed_state.start()
    start = datetime.now(timezone.utc)
    logger.info("=== Live feed refresh started ===")

    try:
        stations = await gov_client.fetch_live()
    except Exception as exc:
        _running = False
        live_feed_state.fail(str(exc))
        logger.error("Live feed fetch failed: %s", exc)
        return {"error": str(exc)}

    now_iso = datetime.now(timezone.utc).isoformat()

    # Build bulk update operations.
    # We use "update" (not "index") to patch only the price-related fields.
    # doc_as_upsert=false → silently skips stations absent from ES (404 = noop).
    operations = []
    skipped_no_fuels = 0
    for station in stations:
        sid = station.get("id")
        if not sid:
            continue
        fuels = station.get("fuels", [])
        if not fuels:
            skipped_no_fuels += 1
            continue

        # Re-compute is_open from opening_hours if available
        oh = station.get("opening_hours")
        is_open = station.get("is_open")
        if oh and is_open is None:
            is_open = is_open_now(oh)

        patch: dict = {
            "fuels":            fuels,
            "gov_last_updated": now_iso,
        }
        if is_open is not None:
            patch["is_open"] = is_open

        operations.append({"update": {"_index": INDEX_NAME, "_id": sid}})
        operations.append({"doc": patch, "doc_as_upsert": False})

    if not operations:
        _running = False
        result = {
            "stations_in_feed": len(stations),
            "updated": 0,
            "errors": 0,
            "skipped_no_fuels": skipped_no_fuels,
            "duration_seconds": round((datetime.now(timezone.utc) - start).total_seconds(), 2),
        }
        live_feed_state.complete(result)
        logger.info("Live feed: no stations to patch")
        return result

    updated = 0
    errors = 0
    for i in range(0, len(operations), _CHUNK * 2):
        chunk = operations[i: i + _CHUNK * 2]
        try:
            resp = await es.bulk(operations=chunk, refresh=False)
            for item in resp.get("items", []):
                op = item.get("update", {})
                if op.get("error"):
                    errors += 1
                elif op.get("result") in ("updated", "noop"):
                    updated += 1
                # result == "not_found" means station not yet in ES → silently skip
        except Exception as exc:
            logger.error("Live feed bulk error in chunk %d: %s", i // (_CHUNK * 2), exc)
            errors += len(chunk) // 2

    # Refresh so search queries immediately see the new prices
    await es.indices.refresh(index=INDEX_NAME)

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    result = {
        "stations_in_feed": len(stations),
        "updated":          updated,
        "errors":           errors,
        "skipped_no_fuels": skipped_no_fuels,
        "duration_seconds": elapsed,
    }
    live_feed_state.complete(result)
    logger.info("=== Live feed complete: %s ===", result)
    _running = False
    return result
