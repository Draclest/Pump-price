import logging
from elasticsearch import AsyncElasticsearch
from app.config import settings

logger = logging.getLogger(__name__)

INDEX_NAME = "fuel-stations"
HISTORY_INDEX = "fuel-price-history"

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
            # Geographic/administrative fields
            "region":          {"type": "keyword"},
            "department":      {"type": "keyword"},
            "dep_code":        {"type": "keyword"},
            "reg_code":        {"type": "keyword"},
        }
    },
    "settings": {
        "number_of_shards":   1,
        "number_of_replicas": 0,
    },
}


HISTORY_MAPPING = {
    "mappings": {
        "properties": {
            "station_id":  {"type": "keyword"},
            "fuel_type":   {"type": "keyword"},
            "price":       {"type": "float"},
            "recorded_at": {"type": "date", "format": "yyyy-MM-dd"},
            "city":        {"type": "keyword"},
            "postal_code": {"type": "keyword"},
            "dep_code":    {"type": "keyword"},
            "reg_code":    {"type": "keyword"},
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
        # verify_certs is False by default for local/Docker setups (self-signed certs).
        # Set ELASTICSEARCH_VERIFY_CERTS=true in production with a trusted CA.
        verify_certs=settings.elasticsearch_verify_certs,
        request_timeout=settings.elasticsearch_timeout,
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


async def ensure_history_index(es: AsyncElasticsearch) -> None:
    exists = await es.indices.exists(index=HISTORY_INDEX)
    if not exists:
        await es.indices.create(index=HISTORY_INDEX, body=HISTORY_MAPPING)
        logger.info("Created index: %s", HISTORY_INDEX)
    else:
        try:
            await es.indices.put_mapping(
                index=HISTORY_INDEX,
                body=HISTORY_MAPPING["mappings"],
            )
            logger.info("Updated mapping for index: %s", HISTORY_INDEX)
        except Exception as exc:
            logger.warning("Could not update history mapping (non-fatal): %s", exc)
