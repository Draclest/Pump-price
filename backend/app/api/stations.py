import asyncio
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from elasticsearch import AsyncElasticsearch

from app.models.station import StationSearchResult, SearchParams
from app.services import station_service
from app.api.deps import get_es
from app.workers.refresh import schedule_refresh

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stations", tags=["stations"])


@router.get("/search", response_model=list[StationSearchResult])
async def search_stations(
    background_tasks: BackgroundTasks,
    lat:        float           = Query(..., ge=-90,  le=90),
    lon:        float           = Query(..., ge=-180, le=180),
    radius_km:  float           = Query(default=10.0, ge=0.1, le=100.0),
    fuel_type:  str | None      = Query(default=None),
    max_price:  float | None    = Query(default=None, ge=0),
    limit:      int             = Query(default=20, ge=1, le=1000),
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

    # Trigger background refresh for stale stations — does not block the response
    if results:
        raw_stations = [r.model_dump() for r in results]
        background_tasks.add_task(schedule_refresh, es, raw_stations)

    return results


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
