"""
Scoring and recommendation service for fuel stations.
Rates stations 0-100 combining price, distance, fraicheur, and services.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in km between two points."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fraicheur_score(updated_at: datetime | str | None) -> float:
    """Return 0.0-1.0 fraîcheur: 1.0 si < 1h, décroit linéairement jusqu'à 0 à 168h (7 jours)."""
    if updated_at is None:
        return 0.0
    if isinstance(updated_at, str):
        try:
            updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        except ValueError:
            return 0.0
    now = datetime.now(timezone.utc)
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    age_hours = (now - updated_at).total_seconds() / 3600.0
    return max(0.0, 1.0 - age_hours / 168.0)


def _services_score(station: dict) -> float:
    """Return 0.0-1.0 score based on available services."""
    services: list[str] = station.get("services", []) or []
    is_open: Optional[bool] = station.get("is_open")
    opening_hours: Optional[str] = station.get("opening_hours", "")

    score = 0.0

    # 0.35 — open now or 24/7
    if is_open is True or (opening_hours and "24/7" in opening_hours):
        score += 0.35

    # 0.30 — Automate CB
    if any("Automate CB" in s for s in services):
        score += 0.30

    # 0.20 — Boutique (alimentaire or non)
    if any("Boutique" in s for s in services):
        score += 0.20

    # 0.10 — Lavage
    if any("Lavage" in s for s in services):
        score += 0.10

    # 0.05 — Toilettes
    if any("Toilettes" in s for s in services):
        score += 0.05

    return min(score, 1.0)


def _best_fuel(station: dict, fuel_types: list[str]) -> Optional[dict]:
    """Return the best matching fuel (lowest price among fuel_types)."""
    fuels: list[dict] = station.get("fuels", []) or []
    candidates = [f for f in fuels if f.get("type") in fuel_types]
    if not candidates:
        return None
    return min(candidates, key=lambda f: f.get("price", float("inf")))


def score_stations(
    stations: list[dict],
    fuel_types: list[str],
    user_lat: float,
    user_lon: float,
    radius_km: float,
) -> list[dict]:
    """
    Enrich station dicts with scoring fields and return sorted by _score desc.

    Scoring rules:
      price    60% — cheapest = 100, gap of ≥1.00 €/L vs cheapest = 0, linear in between
      distance 35% — 0 km = 100, linear decay to 0 at radius_km
      fraicheur 4% — 1.0 à 0h, décroit linéairement jusqu'à 0 à 168h (7 jours)
      services  1% — open now / CB automate / boutique etc.

    Added fields:
      _score: float 0-100
      _score_breakdown: {price, distance, fraicheur, services}  (each 0-100)
      _recommendation_label: str | None
      _matched_fuel: dict | None
    """
    if not stations:
        return []

    # ------------------------------------------------------------------
    # 1. Pre-compute per-station raw values
    # ------------------------------------------------------------------
    enriched: list[dict] = []
    for st in stations:
        loc = st.get("location", {}) or {}
        lat = loc.get("lat", user_lat)
        lon = loc.get("lon", user_lon)
        dist_km = haversine_km(user_lat, user_lon, lat, lon)

        matched = _best_fuel(st, fuel_types)
        freshness = 0.0
        price_raw: Optional[float] = None
        if matched:
            freshness = _fraicheur_score(matched.get("updated_at"))
            price_raw = matched.get("price")

        services_raw = _services_score(st)

        enriched.append({
            **st,
            "_dist_km": dist_km,
            "_price_raw": price_raw,
            "_freshness_raw": freshness,
            "_services_raw": services_raw,
            "_matched_fuel": matched,
        })

    # ------------------------------------------------------------------
    # 2. Price anchor = cheapest in the set; distance anchor = radius_km
    # ------------------------------------------------------------------
    prices = [e["_price_raw"] for e in enriched if e["_price_raw"] is not None]
    min_price = min(prices) if prices else None

    norm_dist = max(radius_km, 0.1)

    # Price gap beyond which score = 0  (1.00 €/L)
    PRICE_ZERO_GAP = 1.0

    # ------------------------------------------------------------------
    # 3. Compute final score
    # ------------------------------------------------------------------
    WEIGHT_PRICE     = 0.60
    WEIGHT_DISTANCE  = 0.35
    WEIGHT_FRAICHEUR = 0.04
    WEIGHT_SERVICES  = 0.01

    for e in enriched:
        # Price score — cheapest = 100; gap ≥ 1 €/L = 0
        if e["_price_raw"] is not None and min_price is not None:
            gap = e["_price_raw"] - min_price
            price_score = max(0.0, (1.0 - gap / PRICE_ZERO_GAP)) * 100.0
        else:
            price_score = 0.0

        # Distance score — 0 km = 100, radius_km = 0
        distance_score = max(0.0, (1.0 - e["_dist_km"] / norm_dist)) * 100.0

        fraicheur_score = e["_freshness_raw"] * 100.0
        services_score  = e["_services_raw"]  * 100.0

        total = (
            WEIGHT_PRICE     * price_score
            + WEIGHT_DISTANCE  * distance_score
            + WEIGHT_FRAICHEUR * fraicheur_score
            + WEIGHT_SERVICES  * services_score
        )

        e["_score"] = round(total, 1)
        e["_score_breakdown"] = {
            "price":     round(price_score, 1),
            "distance":  round(distance_score, 1),
            "fraicheur": round(fraicheur_score, 1),
            "services":  round(services_score, 1),
        }

    # ------------------------------------------------------------------
    # 4. Sort by score descending
    # ------------------------------------------------------------------
    enriched.sort(key=lambda e: e["_score"], reverse=True)

    # ------------------------------------------------------------------
    # 5. Assign recommendation labels to top 3 — based on ACTUAL standings
    # ------------------------------------------------------------------
    top3 = enriched[:3]

    # Find who is actually cheapest / closest / most open among top 3
    cheapest_id  = min(top3, key=lambda e: e["_score_breakdown"]["price"] * -1)["id"]
    closest_id   = min(top3, key=lambda e: e["_score_breakdown"]["distance"] * -1)["id"]
    best_svc_id  = min(top3, key=lambda e: e["_score_breakdown"]["services"] * -1)["id"]
    is_open_ids  = {e["id"] for e in top3 if e.get("is_open") is True}

    def _pick_label(e: dict) -> str:
        sid = e["id"]
        bd  = e["_score_breakdown"]
        dominant = max(bd, key=lambda k: bd[k])   # which criterion contributes most

        if sid == cheapest_id and dominant == "price":
            return "Meilleur prix"
        if sid == closest_id and dominant == "distance":
            return "Le plus proche"
        if sid in is_open_ids and dominant == "services":
            return "Ouvert et bien équipé"
        if sid == cheapest_id:
            return "Meilleur prix"
        if sid == closest_id:
            return "Le plus proche"
        if sid == best_svc_id:
            return "Mieux équipée"
        return "Meilleur compromis"

    for i, e in enumerate(top3):
        if i == 0:
            # Rank 1 always gets a superlative that reflects its real strength
            e["_recommendation_label"] = _pick_label(e)
        else:
            # Rank 2 & 3: label what makes THIS station stand out vs rank 1
            label = _pick_label(e)
            # Avoid duplicating rank-1 label
            if label == top3[0]["_recommendation_label"] and i > 0:
                bd = e["_score_breakdown"]
                # pick second-strongest criterion
                sorted_k = sorted(bd, key=lambda k: bd[k], reverse=True)
                second = sorted_k[1] if len(sorted_k) > 1 else sorted_k[0]
                label = {
                    "price":     "Bon prix",
                    "distance":  "À deux pas",
                    "fraicheur": "Données fraîches",
                    "services":  "Services complets",
                }.get(second, "Bon compromis")
            e["_recommendation_label"] = label

    # Remaining stations get None
    for e in enriched[3:]:
        e["_recommendation_label"] = None

    # ------------------------------------------------------------------
    # 6. Clean up internal keys and return
    # ------------------------------------------------------------------
    for e in enriched:
        e.pop("_dist_km", None)
        e.pop("_price_raw", None)
        e.pop("_freshness_raw", None)
        e.pop("_services_raw", None)

    return enriched


def score_stations_route(
    stations: list[dict],   # already have _route_info from routing_service
    fuel_types: list[str],
    route_distance_km: float = 0.0,  # reserved for future cost calculation
    max_detour_km: float = 5.0,
) -> list[dict]:
    """
    Scoring rules for route mode:
      price   60% — cheapest = 100, gap ≥ 1.00 €/L vs cheapest = 0, linear in between
      detour  35% — free zone ≤ 3% of route_distance_km = 100,
                    linear decay to 0 at max_detour_km
      freshness 4%
      services  1%

    Enriches each station with _score, _score_breakdown, _recommendation_label, _matched_fuel.
    Returns sorted by _score descending.
    """
    if not stations:
        return []

    WEIGHT_PRICE     = 0.60
    WEIGHT_DETOUR    = 0.35
    WEIGHT_FRAICHEUR = 0.04
    WEIGHT_SERVICES  = 0.01

    # Free-zone threshold: detours within 3% of the route are considered negligible
    FREE_ZONE_KM = 0.03 * route_distance_km
    # Effective scoring range: from free_zone to max_detour_km
    norm_detour_range = max(max_detour_km - FREE_ZONE_KM, 0.1)
    # Price gap beyond which score = 0 (1.00 €/L)
    PRICE_ZERO_GAP = 1.0

    enriched: list[dict] = []
    for st in stations:
        matched = _best_fuel(st, fuel_types)
        freshness = 0.0
        price_raw: Optional[float] = None
        if matched:
            freshness = _fraicheur_score(matched.get("updated_at"))
            price_raw = matched.get("price")

        services_raw = _services_score(st)
        route_info = st.get("_route_info", {}) or {}
        detour_km = route_info.get("detour_km", 0.0)

        enriched.append({
            **st,
            "_price_raw": price_raw,
            "_freshness_raw": freshness,
            "_services_raw": services_raw,
            "_detour_raw": detour_km,
            "_matched_fuel": matched,
        })

    # Price anchor = cheapest in the set
    prices = [e["_price_raw"] for e in enriched if e["_price_raw"] is not None]
    min_price = min(prices) if prices else None

    for e in enriched:
        # Price score — cheapest = 100; gap ≥ 1 €/L = 0
        if e["_price_raw"] is not None and min_price is not None:
            gap = e["_price_raw"] - min_price
            price_score = max(0.0, (1.0 - gap / PRICE_ZERO_GAP)) * 100.0
        else:
            price_score = 0.0

        # Detour score — free zone (≤3% route) = 100, max_detour_km = 0
        detour = e["_detour_raw"]
        if detour <= FREE_ZONE_KM:
            detour_score = 100.0
        else:
            detour_score = max(0.0, (1.0 - (detour - FREE_ZONE_KM) / norm_detour_range)) * 100.0

        fraicheur_score = e["_freshness_raw"] * 100.0
        services_score  = e["_services_raw"]  * 100.0

        total = (
            WEIGHT_PRICE     * price_score
            + WEIGHT_DETOUR    * detour_score
            + WEIGHT_FRAICHEUR * fraicheur_score
            + WEIGHT_SERVICES  * services_score
        )

        e["_score"] = round(total, 1)
        e["_score_breakdown"] = {
            "price":     round(price_score, 1),
            "detour":    round(detour_score, 1),
            "fraicheur": round(fraicheur_score, 1),
            "services":  round(services_score, 1),
        }

    enriched.sort(key=lambda e: e["_score"], reverse=True)

    # Assign recommendation labels to top 3 — based on ACTUAL standings
    top3 = enriched[:3]

    cheapest_id     = min(top3, key=lambda e: e["_score_breakdown"]["price"] * -1)["id"]
    least_detour_id = min(top3, key=lambda e: e["_score_breakdown"]["detour"] * -1)["id"]
    best_svc_id     = min(top3, key=lambda e: e["_score_breakdown"]["services"] * -1)["id"]

    def _route_label(e: dict) -> str:
        sid = e["id"]
        bd  = e["_score_breakdown"]
        dominant = max(bd, key=lambda k: bd[k])
        if sid == cheapest_id and dominant == "price":
            return "Meilleur prix sur le trajet"
        if sid == least_detour_id and dominant == "detour":
            return "Moins de détour"
        if sid == cheapest_id:
            return "Meilleur prix sur le trajet"
        if sid == least_detour_id:
            return "Moins de détour"
        if sid == best_svc_id:
            return "Mieux équipée"
        return "Bon compromis prix / détour"

    rank1_label = _route_label(top3[0])
    top3[0]["_recommendation_label"] = rank1_label

    for e in top3[1:]:
        lbl = _route_label(e)
        if lbl == rank1_label:
            bd = e["_score_breakdown"]
            sorted_k = sorted(bd, key=lambda k: bd[k], reverse=True)
            second = next((k for k in sorted_k if k != max(bd, key=lambda k: bd[k])), sorted_k[0])
            lbl = {
                "price":     "Bon prix",
                "detour":    "Sans détour",
                "fraicheur": "Données fraîches",
                "services":  "Services complets",
            }.get(second, "Bon compromis prix / détour")
        e["_recommendation_label"] = lbl

    for e in enriched[3:]:
        e["_recommendation_label"] = None

    # Clean up internal keys
    for e in enriched:
        e.pop("_price_raw", None)
        e.pop("_freshness_raw", None)
        e.pop("_services_raw", None)
        e.pop("_detour_raw", None)

    return enriched
