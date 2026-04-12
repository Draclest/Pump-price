import logging
from elasticsearch import AsyncElasticsearch
from app.config import settings

logger = logging.getLogger(__name__)

INDEX_NAME = "fuel-stations"

STATION_MAPPING = {
    "mappings": {
        "properties": {
            # Core display fields
            "id":           {"type": "keyword"},
            "name":         {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
            "brand":        {"type": "keyword"},
            "brand_key":    {"type": "keyword"},
            "logo_url":     {"type": "keyword", "index": False},
            "brand_color":  {"type": "keyword", "index": False},
            "address":      {"type": "text"},
            "city":         {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
            "postal_code":  {"type": "keyword"},
            "location":     {"type": "geo_point"},
            # Prices
            "fuels": {
                "type": "nested",
                "properties": {
                    "type":       {"type": "keyword"},
                    "price":      {"type": "float"},
                    "updated_at": {"type": "date"},
                },
            },
            "services": {"type": "keyword"},
            # Status
            "is_open":               {"type": "boolean"},
            "opening_hours":         {"type": "keyword", "index": False},
            "opening_hours_display": {"type": "keyword", "index": False},
            # Provenance
            "data_sources":    {"type": "keyword"},
            "gov_station_id":  {"type": "keyword"},
            "gov_last_updated":{"type": "date"},
            "osm_node_id":     {"type": "keyword"},
            "osm_node_type":   {"type": "keyword"},
            "osm_last_updated":{"type": "date"},
            "ingested_at":     {"type": "date"},
        }
    },
    "settings": {
        "number_of_shards":   1,
        "number_of_replicas": 0,
    },
}


def get_es_client() -> AsyncElasticsearch:
    return AsyncElasticsearch(
        hosts=[settings.elasticsearch_url],
        basic_auth=(settings.elasticsearch_username, settings.elasticsearch_password),
        verify_certs=False,
        request_timeout=10,
    )


async def ensure_index(es: AsyncElasticsearch) -> None:
    exists = await es.indices.exists(index=INDEX_NAME)
    if not exists:
        await es.indices.create(index=INDEX_NAME, body=STATION_MAPPING)
        logger.info("Created index: %s", INDEX_NAME)
    else:
        try:
            await es.indices.put_mapping(
                index=INDEX_NAME,
                body=STATION_MAPPING["mappings"],
            )
            logger.info("Updated mapping for index: %s", INDEX_NAME)
        except Exception as exc:
            logger.warning("Could not update mapping (non-fatal): %s", exc)
