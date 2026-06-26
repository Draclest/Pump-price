"""
Route HTTP du moteur de gain net — POST /api/v2/net-gain/search.

Valide la requête au bord (pydantic + règles conditionnelles → 400 explicites),
délègue l'orchestration au service, renvoie le contrat du spec §8 (breakdown
toujours inclus). Erreurs ES/OSRM sanitisées (pas d'exception brute exposée).
"""
from __future__ import annotations

import logging
from typing import Literal, Optional

from elasticsearch import AsyncElasticsearch
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_es
from app.services import net_gain_service
from app.services.net_gain import (
    DEFAULT_NEGATIVE_THRESHOLD_EUR,
    DEFAULT_POSITIVE_THRESHOLD_EUR,
    Fuel,
    Preferences,
    Vehicle,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/net-gain", tags=["net-gain"])

Mode = Literal["route", "habitual", "nearby"]


class GeoPointIn(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class VehicleIn(BaseModel):
    fuel: Fuel
    consumption_l_100km: float = Field(..., gt=0, le=50)
    tank_capacity_l: float = Field(..., gt=0, le=500)
    current_level_l: Optional[float] = Field(default=None, ge=0)


class PreferencesIn(BaseModel):
    fill_target_l: Optional[float] = Field(default=None, gt=0, le=500)
    time_value_eur_h: float = Field(default=10.0, ge=0, le=1000)
    max_detour_min: float = Field(default=10.0, gt=0, le=600)
    max_price_age_h: float = Field(default=72.0, gt=0, le=24 * 30)
    urban_consumption_factor: float = Field(default=1.0, ge=1.0, le=2.0)
    positive_threshold_eur: float = Field(default=DEFAULT_POSITIVE_THRESHOLD_EUR, ge=0, le=100)
    negative_threshold_eur: float = Field(default=DEFAULT_NEGATIVE_THRESHOLD_EUR, ge=0, le=100)


class NetGainRequest(BaseModel):
    mode: Mode
    origin: Optional[GeoPointIn] = None
    destination: Optional[GeoPointIn] = None
    baseline_station_id: Optional[str] = None
    vehicle: VehicleIn
    preferences: PreferencesIn = Field(default_factory=PreferencesIn)


@router.post("/search")
async def search(
    req: NetGainRequest,
    es: AsyncElasticsearch = Depends(get_es),
) -> dict:
    # ── Règles conditionnelles → 400 explicites ──────────────────────────────
    if req.origin is None:
        raise HTTPException(status_code=400, detail="`origin` is required.")
    if req.mode == "route" and req.destination is None:
        raise HTTPException(status_code=400, detail="`destination` is required in mode=route.")
    if req.mode == "habitual" and not req.baseline_station_id:
        raise HTTPException(status_code=400, detail="`baseline_station_id` is required in mode=habitual.")

    vehicle = Vehicle(
        fuel=req.vehicle.fuel,
        consumption_l_100km=req.vehicle.consumption_l_100km,
        tank_capacity_l=req.vehicle.tank_capacity_l,
        current_level_l=req.vehicle.current_level_l,
    )
    prefs = Preferences(
        time_value_eur_h=req.preferences.time_value_eur_h,
        max_detour_min=req.preferences.max_detour_min,
        max_price_age_h=req.preferences.max_price_age_h,
        fill_target_l=req.preferences.fill_target_l,
        urban_consumption_factor=req.preferences.urban_consumption_factor,
        positive_threshold_eur=req.preferences.positive_threshold_eur,
        negative_threshold_eur=req.preferences.negative_threshold_eur,
    )

    origin = (req.origin.lat, req.origin.lon)
    destination = (req.destination.lat, req.destination.lon) if req.destination else None

    try:
        return await net_gain_service.search_net_gain(
            es=es,
            mode=req.mode,
            vehicle=vehicle,
            prefs=prefs,
            origin=origin,
            destination=destination,
            baseline_station_id=req.baseline_station_id,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("net-gain search failed")
        raise HTTPException(status_code=502, detail="Net-gain engine temporarily unavailable.")
