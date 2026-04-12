import logging
from elasticsearch import AsyncElasticsearch
from app.models.station import StationSearchResult, SearchParams, GeoPoint, FuelPrice
from app.services.elasticsearch_client import INDEX_NAME
from app.services.opening_hours import is_open_now

logger = logging.getLogger(__name__)


def _to_result(src: dict, distance: float | None = None) -> StationSearchResult:
    """Map an ES _source dict to StationSearchResult, recomputing is_open live."""
    fuels = [
        FuelPrice(type=f["type"], price=f["price"], updated_at=f["updated_at"])
        for f in src.get("fuels", [])
    ]

    # Recompute from stored opening_hours at query time (always current)
    oh = src.get("opening_hours")
    is_open = is_open_now(oh)
    if is_open is None:
        is_open = src.get("is_open")   # fallback to stored value

    return StationSearchResult(
        id=src["id"],
        name=src.get("name"),
        brand=src.get("brand"),
        brand_key=src.get("brand_key"),
        logo_url=src.get("logo_url"),
        brand_color=src.get("brand_color"),
        address=src["address"],
        city=src["city"],
        postal_code=src["postal_code"],
        location=GeoPoint(lat=src["location"]["lat"], lon=src["location"]["lon"]),
        fuels=fuels,
        services=src.get("services", []),
        is_open=is_open,
        opening_hours=oh,
        opening_hours_display=src.get("opening_hours_display"),
        data_sources=src.get("data_sources", []),
        gov_station_id=src.get("gov_station_id"),
        gov_last_updated=src.get("gov_last_updated"),
        osm_node_id=src.get("osm_node_id"),
        osm_node_type=src.get("osm_node_type"),
        osm_last_updated=src.get("osm_last_updated"),
        region=src.get("region"),
        department=src.get("department"),
        dep_code=src.get("dep_code"),
        reg_code=src.get("reg_code"),
        distance_meters=distance,
    )


async def search_stations(
    es: AsyncElasticsearch,
    params: SearchParams,
) -> list[StationSearchResult]:
    filter_clauses: list[dict] = [
        {
            "geo_distance": {
                "distance": f"{params.radius_km}km",
                "location": {"lat": params.lat, "lon": params.lon},
            }
        }
    ]

    if params.fuel_type:
        fuel_filter: dict = {"term": {"fuels.type": params.fuel_type}}
        if params.max_price:
            fuel_filter = {
                "bool": {
                    "must": [
                        {"term":  {"fuels.type":  params.fuel_type}},
                        {"range": {"fuels.price": {"lte": params.max_price}}},
                    ]
                }
            }
        filter_clauses.append({"nested": {"path": "fuels", "query": fuel_filter}})

    query = {
        "query": {"bool": {"filter": filter_clauses}},
        "sort": [
            {
                "_geo_distance": {
                    "location": {"lat": params.lat, "lon": params.lon},
                    "order": "asc",
                    "unit":  "m",
                }
            }
        ],
        "size": params.limit,
    }

    logger.info(
        "ES search | lat=%.4f lon=%.4f radius=%.1fkm fuel=%s limit=%d",
        params.lat, params.lon, params.radius_km, params.fuel_type, params.limit,
    )

    resp = await es.search(index=INDEX_NAME, body=query)
    hits = resp["hits"]["hits"]
    logger.info(
        "ES search | total=%d returned=%d",
        resp["hits"]["total"]["value"], len(hits),
    )

    results = []
    for hit in hits:
        src = hit["_source"]
        distance = hit.get("sort", [None])[0]
        result = _to_result(src, distance)
        if params.fuel_type:
            result.fuels = [f for f in result.fuels if f.type == params.fuel_type]
        results.append(result)

    return results


async def get_station_by_id(
    es: AsyncElasticsearch,
    station_id: str,
) -> StationSearchResult | None:
    resp = await es.get(index=INDEX_NAME, id=station_id)
    if not resp["found"]:
        return None
    return _to_result(resp["_source"])


async def get_price_history(
    es: AsyncElasticsearch,
    station_id: str,
    fuel_type: str,
    days: int = 30,
):
    query = {
        "query": {
            "bool": {
                "filter": [
                    {"term":  {"station_id": station_id}},
                    {"term":  {"fuel_type":  fuel_type}},
                    {"range": {"recorded_at": {"gte": f"now-{days}d/d"}}},
                ]
            }
        },
        "sort": [{"recorded_at": "asc"}],
        "size": days * 4,
    }
    resp = await es.search(index="fuel-price-history", body=query)
    return [h["_source"] for h in resp["hits"]["hits"]]
