from fastapi import APIRouter, Depends, BackgroundTasks
from elasticsearch import AsyncElasticsearch
from app.workers.ingestion import run_ingestion
from app.api.deps import get_es
from app.services.elasticsearch_client import INDEX_NAME

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.post("/trigger")
async def trigger_ingestion(
    background_tasks: BackgroundTasks,
    es: AsyncElasticsearch = Depends(get_es),
):
    background_tasks.add_task(run_ingestion, es)
    return {"status": "ingestion started"}


@router.post("/trigger/sync")
async def trigger_ingestion_sync(es: AsyncElasticsearch = Depends(get_es)):
    result = await run_ingestion(es)
    return {"status": "done", **result}


@router.get("/debug/index")
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
