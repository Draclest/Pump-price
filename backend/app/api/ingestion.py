"""
Ingestion endpoints.

All mutating endpoints require a valid API key passed as the X-API-Key header.
The key is configured via the INGESTION_API_KEY environment variable.
If the variable is empty, the endpoints return 403 (disabled).
"""

import secrets
from fastapi import APIRouter, Depends, BackgroundTasks, Header, HTTPException
from elasticsearch import AsyncElasticsearch

from app.config import settings
from app.workers.ingestion import run_ingestion
from app.api.deps import get_es
from app.services.elasticsearch_client import INDEX_NAME
from app.services.ingestion_state import ingestion_state, live_feed_state

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


def _require_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Dependency that validates the X-API-Key header.
    - If INGESTION_API_KEY is not configured → always deny (403).
    - Uses secrets.compare_digest to prevent timing attacks.
    """
    configured_key = settings.ingestion_api_key
    if not configured_key:
        raise HTTPException(
            status_code=403,
            detail="Ingestion endpoints are disabled. Set INGESTION_API_KEY to enable.",
        )
    if not secrets.compare_digest(x_api_key, configured_key):
        raise HTTPException(status_code=403, detail="Invalid API key")


@router.get("/status")
async def get_ingestion_status():
    """
    Public endpoint — no authentication required.
    Returns the current ingestion state so the frontend can show a loading indicator.
    Includes both the daily full ingestion and the 10-minute live feed state.
    """
    data = ingestion_state.to_dict()
    data["live_feed"] = live_feed_state.to_dict()
    return data


@router.post("/trigger", dependencies=[Depends(_require_api_key)])
async def trigger_ingestion(
    background_tasks: BackgroundTasks,
    es: AsyncElasticsearch = Depends(get_es),
):
    """Trigger a full data ingestion in the background (non-blocking)."""
    background_tasks.add_task(run_ingestion, es)
    return {"status": "ingestion started"}


@router.post("/trigger/sync", dependencies=[Depends(_require_api_key)])
async def trigger_ingestion_sync(es: AsyncElasticsearch = Depends(get_es)):
    """Trigger a full data ingestion and wait for completion (blocking)."""
    result = await run_ingestion(es)
    return {"status": "done", **result}


@router.get("/debug/index", dependencies=[Depends(_require_api_key)])
async def debug_index(es: AsyncElasticsearch = Depends(get_es)):
    """Return index stats and a sample document to verify ingestion."""
    exists = await es.indices.exists(index=INDEX_NAME)
    if not exists:
        return {"exists": False}

    count_resp = await es.count(index=INDEX_NAME)
    doc_count = count_resp["count"]

    sample = None
    if doc_count > 0:
        resp = await es.search(index=INDEX_NAME, body={"query": {"match_all": {}}, "size": 1})
        sample = resp["hits"]["hits"][0]["_source"] if resp["hits"]["hits"] else None

    return {"exists": True, "doc_count": doc_count, "sample": sample}
