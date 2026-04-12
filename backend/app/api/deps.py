from elasticsearch import AsyncElasticsearch
from app.services.elasticsearch_client import get_es_client

_es_client: AsyncElasticsearch | None = None


def get_es() -> AsyncElasticsearch:
    global _es_client
    if _es_client is None:
        _es_client = get_es_client()
    return _es_client


async def close_es() -> None:
    global _es_client
    if _es_client is not None:
        await _es_client.close()
        _es_client = None
