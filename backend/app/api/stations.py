import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from elasticsearch import AsyncElasticsearch

from app.models.station import StationSearchResult, SearchParams
from app.services import station_service
from app.services.scoring_service import score_stations
from app.api.deps import get_es
from app.workers.refresh import schedule_refresh

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stations", tags=["stations"])


def _apply_services_filter(stations: list[StationSearchResult], services: list[str]) -> list[StationSearchResult]:
    """Filter stations so that each requested service appears as a substring in the station's services list."""
    if not services:
        return stations
    result = []
    for st in stations:
        st_services = st.services or []
        match = all(
            any(req.lower() in svc.lower() for svc in st_services)
            for req in services
        )
        if match:
            result.append(st)
    return result


@router.get("/search", response_model=list[StationSearchResult])
async def search_stations(
    background_tasks: BackgroundTasks,
    lat:        float           = Query(..., ge=-90,  le=90),
    lon:        float           = Query(..., ge=-180, le=180),
    radius_km:  float           = Query(default=10.0, ge=0.1, le=100.0),
    fuel_type:  str | None      = Query(default=None),
    max_price:  float | None    = Query(default=None, ge=0),
    limit:      int             = Query(default=20, ge=1, le=1000),
    services:   list[str]       = Query(default=[]),
    es: AsyncElasticsearch = Depends(get_es),
):
    params = SearchParams(
        lat=lat, lon=lon,
        radius_km=radius_km,
        fuel_type=fuel_type,
        max_price=max_price,
        limit=limit,
    )
    results = await station_service.search_stations(es, params)

    # Apply services filter (post-ES)
    results = _apply_services_filter(results, services)

    # Trigger background refresh for stale stations — does not block the response
    if results:
        raw_stations = [r.model_dump() for r in results]
        background_tasks.add_task(schedule_refresh, es, raw_stations)

    return results


@router.get("/recommend")
async def recommend_stations(
    background_tasks: BackgroundTasks,
    lat:                    float           = Query(..., ge=-90,  le=90),
    lon:                    float           = Query(..., ge=-180, le=180),
    radius_km:              float           = Query(default=10.0, ge=0.1, le=100.0),
    fuel_type:              str | None      = Query(default=None),
    max_price:              float | None    = Query(default=None, ge=0),
    limit:                  int             = Query(default=50, ge=1, le=1000),
    services:               list[str]       = Query(default=[]),
    min_freshness_hours:    int             = Query(default=48, ge=1),
    es: AsyncElasticsearch = Depends(get_es),
):
    params = SearchParams(
        lat=lat, lon=lon,
        radius_km=radius_km,
        fuel_type=fuel_type,
        max_price=max_price,
        limit=limit,
    )
    results = await station_service.search_stations(es, params)

    # Apply services filter
    results = _apply_services_filter(results, services)

    # Determine which fuel types to consider
    fuel_types: list[str] = [fuel_type] if fuel_type else ["E10", "SP95", "SP98", "E85", "GPLc", "Gazole"]

    # Filter by freshness: matched fuel's updated_at must be within min_freshness_hours
    now = datetime.now(timezone.utc)
    fresh_results: list[StationSearchResult] = []
    for st in results:
        st_fuels = st.fuels or []
        candidates = [f for f in st_fuels if f.type in fuel_types]
        if not candidates:
            continue
        best = min(candidates, key=lambda f: f.price)
        age_h = (now - best.updated_at.replace(tzinfo=timezone.utc) if best.updated_at.tzinfo is None else (now - best.updated_at)).total_seconds() / 3600.0
        if age_h <= min_freshness_hours:
            fresh_results.append(st)

    # Convert to dicts for scoring
    station_dicts = [r.model_dump() for r in fresh_results]

    # Score stations
    scored = score_stations(
        stations=station_dicts,
        fuel_types=fuel_types,
        user_lat=lat,
        user_lon=lon,
        radius_km=radius_km,
    )

    # Map scoring fields back to model-compatible keys
    output = []
    for s in scored[:limit]:
        s["score"] = s.pop("_score", None)
        s["score_breakdown"] = s.pop("_score_breakdown", None)
        s["recommendation_label"] = s.pop("_recommendation_label", None)
        s["matched_fuel"] = s.pop("_matched_fuel", None)
        output.append(s)

    # Trigger background refresh
    if output:
        background_tasks.add_task(schedule_refresh, es, output)

    return output


@router.get("/{station_id}", response_model=StationSearchResult)
async def get_station(
    station_id: str,
    background_tasks: BackgroundTasks,
    es: AsyncElasticsearch = Depends(get_es),
):
    station = await station_service.get_station_by_id(es, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    # Single-station refresh
    background_tasks.add_task(schedule_refresh, es, [station.model_dump()])
    return station


@router.get("/{station_id}/history/{fuel_type}")
async def get_price_history(
    station_id: str,
    fuel_type: str,
    days: int = Query(default=30, ge=1, le=30),
    es: AsyncElasticsearch = Depends(get_es),
):
    return await station_service.get_price_history(es, station_id, fuel_type, days)
