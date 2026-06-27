"""
Service d'orchestration du moteur de gain net — ranking deux étages.

ES (préfiltre K) → OSRM /table (détour marginal) → scoring pur (compute_net_gain)
→ filtres durs → tri par gain net → top N. (spec §6 / IMPLEMENTATION.md T4.)

L'I/O (ES, OSRM) est isolé dans les repositories/clients ; le calcul reste pur
(net_gain.py). Spans OTel optionnels (T6) si l'instrumentation est active.
"""
from __future__ import annotations

import statistics
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Literal, Optional

from elasticsearch import AsyncElasticsearch

from app.services import net_gain_repository as repo
from app.services import osrm_client
from app.services.routing_service import _haversine_km
from app.services.station_service import _to_result
from app.services.net_gain import (
    Confidence,
    Fuel,
    NetGainInput,
    Preferences,
    Vehicle,
    compute_net_gain,
    confidence_from_age,
    resolve_fill_liters,
)
from app.services.net_gain_repository import Candidate

try:  # T6 — observabilité best-effort, no-op si OTel absent
    from opentelemetry import trace
    _tracer = trace.get_tracer("net_gain")
except Exception:  # pragma: no cover
    _tracer = None

Mode = Literal["route", "habitual", "nearby"]

K_CANDIDATES = 25       # borne le coût OSRM
N_RESULTS = 10
NEARBY_RADIUS_KM = 12.0
ROUTE_CORRIDOR_PAD_KM = 8.0
DEST_BASELINE_RADIUS_KM = 6.0


@contextmanager
def _span(name: str):
    if _tracer is None:
        yield
        return
    with _tracer.start_as_current_span(name):
        yield


@dataclass(frozen=True)
class Baseline:
    price: float
    source: str
    station_id: Optional[str] = None


def _median_price(cands: list[Candidate]) -> Optional[float]:
    prices = [c.price for c in cands if c.price is not None]
    return statistics.median(prices) if prices else None


def _km_to_bbox(coords: list[list[float]], pad_km: float) -> tuple[tuple[float, float], tuple[float, float]]:
    """BBox englobante des coords [[lon,lat],...] + marge en km (≈ deg)."""
    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]
    pad_deg = pad_km / 111.0
    return (
        (max(lats) + pad_deg, min(lons) - pad_deg),  # top_left  (lat_max, lon_min)
        (min(lats) - pad_deg, max(lons) + pad_deg),  # bottom_right (lat_min, lon_max)
    )


def _confidence_excluded(conf: Confidence, max_price_age_h: float, age_min: float) -> bool:
    return conf == "stale" and age_min > max_price_age_h * 60


async def search_net_gain(
    es: AsyncElasticsearch,
    mode: Mode,
    vehicle: Vehicle,
    prefs: Preferences,
    origin: Optional[tuple[float, float]],
    destination: Optional[tuple[float, float]],
    baseline_station_id: Optional[str],
    radius_km: Optional[float] = None,
) -> dict:
    """Retourne le payload {baseline, fill_liters, results} (cf. spec §8)."""
    fill_liters = resolve_fill_liters(vehicle, prefs)
    eff_consumption = vehicle.consumption_l_100km * (prefs.urban_consumption_factor or 1.0)

    # ── Étage 1 : préfiltre ES + baseline ────────────────────────────────────
    with _span("es.prefilter"):
        candidates, baseline, route = await _prefilter_and_baseline(
            es, mode, vehicle.fuel, prefs, origin, destination, baseline_station_id, radius_km
        )

    if baseline is None or not candidates:
        return {"baseline": None, "fill_liters": round(fill_liters, 1), "results": []}

    # ── Étage 2 : détour marginal via OSRM /table ────────────────────────────
    with _span("osrm.table"):
        detours = await _compute_detours(mode, candidates, origin, destination, baseline_station_id, es, route)

    # ── Scoring + filtres durs + tri ─────────────────────────────────────────
    with _span("scoring.compute"):
        results = []
        for cand in candidates:
            det = detours.get(cand.station_id)
            if det is None:
                continue
            detour_km, detour_min = det
            if detour_min > prefs.max_detour_min:   # filtre dur
                continue
            conf = confidence_from_age(cand.price_age_min)
            if _confidence_excluded(conf, prefs.max_price_age_h, cand.price_age_min):
                continue

            ng = compute_net_gain(
                NetGainInput(
                    price_candidate=cand.price,
                    price_baseline=baseline.price,
                    fill_liters=fill_liters,
                    consumption_l_100km=eff_consumption,
                    detour_km=detour_km,
                    detour_min=detour_min,
                    time_value_eur_h=prefs.time_value_eur_h,
                ),
                thresholds=(prefs.positive_threshold_eur, prefs.negative_threshold_eur),
            )
            # Station au format complet (réutilise _to_result) pour que le front
            # rende exactement comme /recommend ; repli slim si pas de _source (tests).
            if cand.source:
                station = _to_result(cand.source).model_dump(mode="json")
            else:
                station = {
                    "id": cand.station_id, "name": cand.name, "brand": cand.brand,
                    "address": "", "city": "", "postal_code": "",
                    "location": {"lat": cand.lat, "lon": cand.lon},
                    "fuels": [], "services": cand.services,
                }
            station["id"] = cand.station_id
            station["matched_fuel"] = {
                "type": cand.fuel_type, "price": cand.price, "updated_at": cand.updated_at,
            }
            if mode == "route":
                station["_route_info"] = {
                    "perp_dist_km": round(detour_km / 2, 3), "detour_km": round(detour_km, 3),
                    "nearest_idx": 0, "progress_pct": 0.0,
                }
            else:
                station["distance_meters"] = round(
                    _haversine_km(origin[0], origin[1], cand.lat, cand.lon) * 1000.0
                )
            station.update({
                "station_id": cand.station_id,
                "price": cand.price,
                "price_age_min": round(cand.price_age_min, 1),
                "confidence": conf,
                "detour": {"km": round(detour_km, 2), "min": round(detour_min, 1)},
                "net_gain_eur": ng.net_gain_eur,
                "verdict": ng.verdict,
                "breakdown": {
                    "pump_saving_eur": ng.breakdown.pump_saving_eur,
                    "detour_fuel_eur": ng.breakdown.detour_fuel_eur,
                    "time_cost_eur": ng.breakdown.time_cost_eur,
                },
                "_conf_rank": {"high": 0, "medium": 1, "low": 2, "stale": 3}[conf],
            })
            results.append(station)

    # Tri : gain net décroissant ; départage par confiance (fraîcheur).
    results.sort(key=lambda r: (-r["net_gain_eur"], r["_conf_rank"]))
    for r in results:
        r.pop("_conf_rank", None)

    return {
        "baseline": {
            "station_id": baseline.station_id,
            "fuel": vehicle.fuel,
            "price": round(baseline.price, 3),
            "source": baseline.source,
        },
        "fill_liters": round(fill_liters, 1),
        # Géométrie du tracé (mode route) pour que le front affiche la polyline
        # sans second appel.
        "route": {
            "coordinates": route["coordinates"],
            "distance_m": route.get("distance_m"),
            "duration_s": route.get("duration_s"),
        } if route else None,
        "results": results[:N_RESULTS],
    }


# ── Helpers d'orchestration ──────────────────────────────────────────────────

async def _prefilter_and_baseline(
    es, mode, fuel: Fuel, prefs: Preferences,
    origin, destination, baseline_station_id, radius_km=None,
) -> tuple[list[Candidate], Optional[Baseline], Optional[dict]]:
    route = None
    nearby_radius = radius_km or NEARBY_RADIUS_KM

    if mode == "route":
        from app.services import routing_service
        route = await routing_service.get_route(origin[0], origin[1], destination[0], destination[1])
        tl, br = _km_to_bbox(route["coordinates"], ROUTE_CORRIDOR_PAD_KM)
        candidates = await repo.prefilter_bbox(es, tl, br, fuel, prefs.max_price_age_h, K_CANDIDATES)
        # Baseline = prix de référence de la zone de destination (sans détour).
        dest_zone = await repo.prefilter_radius(
            es, destination[0], destination[1], DEST_BASELINE_RADIUS_KM, fuel, prefs.max_price_age_h, K_CANDIDATES
        )
        med = _median_price(dest_zone)
        baseline = Baseline(price=med, source="route_destination") if med is not None else None
        return candidates, baseline, route

    # nearby / habitual : préfiltre autour de l'origine (rayon UI si fourni)
    candidates = await repo.prefilter_radius(
        es, origin[0], origin[1], nearby_radius, fuel, prefs.max_price_age_h, K_CANDIDATES
    )

    if mode == "habitual":
        base_cand = await repo.station_candidate(es, baseline_station_id, fuel)
        if base_cand is not None:
            return candidates, Baseline(base_cand.price, "habitual_station", baseline_station_id), None
        # fallback médiane de zone si station habituelle introuvable
        med = _median_price(candidates)
        return candidates, (Baseline(med, "zone_median") if med is not None else None), None

    # nearby : référence = prix médian de la zone (« ce que tu paierais par défaut »)
    med = _median_price(candidates)
    return candidates, (Baseline(med, "zone_median") if med is not None else None), None


async def _compute_detours(
    mode, candidates: list[Candidate], origin, destination, baseline_station_id, es, route,
) -> dict[str, tuple[float, float]]:
    """{station_id: (detour_km, detour_min)}. Repli haversine ×2 si OSRM échoue."""
    if mode == "route":
        points = [origin, destination] + [(c.lat, c.lon) for c in candidates]
        try:
            t = await osrm_client.table(points)
            base_km = t.km(0, 1)
            base_min = t.minutes(0, 1)
            out = {}
            for idx, c in enumerate(candidates, start=2):
                ins_km = t.km(0, idx) + t.km(idx, 1) - base_km
                ins_min = t.minutes(0, idx) + t.minutes(idx, 1) - base_min
                out[c.station_id] = (max(0.0, ins_km), max(0.0, ins_min))
            return out
        except Exception:
            return _detour_fallback_route(candidates, route)

    # nearby / habitual : aller-retour depuis l'origine vers chaque candidate.
    # (Le différentiel vs station habituelle est porté par le prix baseline.)
    points = [origin] + [(c.lat, c.lon) for c in candidates]
    try:
        t = await osrm_client.table(points)
        out = {}
        for idx, c in enumerate(candidates, start=1):
            out[c.station_id] = (2.0 * t.km(0, idx), 2.0 * t.minutes(0, idx))
        return out
    except Exception:
        return _detour_fallback_radius(candidates, origin)


def _detour_fallback_route(candidates: list[Candidate], route: Optional[dict]) -> dict[str, tuple[float, float]]:
    from app.services.routing_service import station_route_info
    coords = (route or {}).get("coordinates", [])
    out = {}
    for c in candidates:
        info = station_route_info(c.lat, c.lon, coords)
        km = info["detour_km"]
        out[c.station_id] = (km, _km_to_min(km))
    return out


def _detour_fallback_radius(candidates: list[Candidate], origin) -> dict[str, tuple[float, float]]:
    from app.services.routing_service import _haversine_km
    out = {}
    for c in candidates:
        km = 2.0 * _haversine_km(origin[0], origin[1], c.lat, c.lon)
        out[c.station_id] = (km, _km_to_min(km))
    return out


def _km_to_min(km: float, avg_speed_kmh: float = 40.0) -> float:
    return (km / avg_speed_kmh) * 60.0
