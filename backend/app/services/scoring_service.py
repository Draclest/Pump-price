"""
Scoring and recommendation service for fuel stations.
Rates stations 0-100 combining price, distance, freshness, and services.
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


def _freshness_score(updated_at: datetime | str | None) -> float:
    """Return 0.0-1.0 freshness: 1.0 if <2h old, linear decay to 0 at 48h."""
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
    if age_hours <= 2.0:
        return 1.0
    if age_hours >= 48.0:
        return 0.0
    return 1.0 - (age_hours - 2.0) / 46.0


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

    Added fields:
      _score: float 0-100
      _score_breakdown: {price, distance, freshness, services}  (each 0-100)
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
            freshness = _freshness_score(matched.get("updated_at"))
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
    # 2. Normalize price and distance across the result set
    # ------------------------------------------------------------------
    prices = [e["_price_raw"] for e in enriched if e["_price_raw"] is not None]
    min_price = min(prices) if prices else None
    max_price = max(prices) if prices else None

    dists = [e["_dist_km"] for e in enriched]
    max_dist = max(dists) if dists else radius_km
    if max_dist == 0:
        max_dist = 1.0

    # ------------------------------------------------------------------
    # 3. Compute final score
    # ------------------------------------------------------------------
    WEIGHT_PRICE     = 0.40
    WEIGHT_DISTANCE  = 0.30
    WEIGHT_FRESHNESS = 0.15
    WEIGHT_SERVICES  = 0.15

    for e in enriched:
        # Price score — lower is better
        if e["_price_raw"] is not None and min_price is not None and max_price is not None:
            if max_price == min_price:
                price_score = 100.0
            else:
                price_score = (1.0 - (e["_price_raw"] - min_price) / (max_price - min_price)) * 100.0
        else:
            price_score = 0.0

        # Distance score — closer is better
        distance_score = max(0.0, (1.0 - e["_dist_km"] / max_dist)) * 100.0

        freshness_score = e["_freshness_raw"] * 100.0
        services_score  = e["_services_raw"]  * 100.0

        total = (
            WEIGHT_PRICE     * price_score
            + WEIGHT_DISTANCE  * distance_score
            + WEIGHT_FRESHNESS * freshness_score
            + WEIGHT_SERVICES  * services_score
        )

        e["_score"] = round(total, 1)
        e["_score_breakdown"] = {
            "price":     round(price_score, 1),
            "distance":  round(distance_score, 1),
            "freshness": round(freshness_score, 1),
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
    cheapest_id  = min(top3, key=lambda e: e["_score_breakdown"]["price"] * -1)["id"]   # highest price_score
    closest_id   = min(top3, key=lambda e: e["_score_breakdown"]["distance"] * -1)["id"]
    freshest_id  = min(top3, key=lambda e: e["_score_breakdown"]["freshness"] * -1)["id"]
    best_svc_id  = min(top3, key=lambda e: e["_score_breakdown"]["services"] * -1)["id"]
    is_open_ids  = {e["id"] for e in top3 if e.get("is_open") is True}

    assigned: set[str] = set()

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
                    "freshness": "Données fraîches",
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
    route_distance_km: float,
) -> list[dict]:
    """
    Scoring weights for route mode:
      price   35%
      detour  35%  (lower detour → higher score, normalized against max_detour in set)
      freshness 15%
      services  15%

    Labels for top 3:
    - Rank 1: "Meilleur prix sur le trajet"
    - Rank 2: if detour_score highest → "Sans détour", if price_score highest → "Moins cher"
    - Rank 3: "Bon compromis prix / détour"

    Enriches each station with _score, _score_breakdown, _recommendation_label, _matched_fuel.
    Returns sorted by _score descending.
    """
    if not stations:
        return []

    WEIGHT_PRICE     = 0.35
    WEIGHT_DETOUR    = 0.35
    WEIGHT_FRESHNESS = 0.15
    WEIGHT_SERVICES  = 0.15

    enriched: list[dict] = []
    for st in stations:
        matched = _best_fuel(st, fuel_types)
        freshness = 0.0
        price_raw: Optional[float] = None
        if matched:
            freshness = _freshness_score(matched.get("updated_at"))
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

    # Normalize price
    prices = [e["_price_raw"] for e in enriched if e["_price_raw"] is not None]
    min_price = min(prices) if prices else None
    max_price = max(prices) if prices else None

    # Normalize detour
    detours = [e["_detour_raw"] for e in enriched]
    max_detour = max(detours) if detours else 1.0
    if max_detour == 0:
        max_detour = 1.0

    for e in enriched:
        # Price score — lower is better
        if e["_price_raw"] is not None and min_price is not None and max_price is not None:
            if max_price == min_price:
                price_score = 100.0
            else:
                price_score = (1.0 - (e["_price_raw"] - min_price) / (max_price - min_price)) * 100.0
        else:
            price_score = 0.0

        # Detour score — lower detour is better
        detour_score = max(0.0, (1.0 - e["_detour_raw"] / max_detour)) * 100.0

        freshness_score = e["_freshness_raw"] * 100.0
        services_score  = e["_services_raw"]  * 100.0

        total = (
            WEIGHT_PRICE     * price_score
            + WEIGHT_DETOUR    * detour_score
            + WEIGHT_FRESHNESS * freshness_score
            + WEIGHT_SERVICES  * services_score
        )

        e["_score"] = round(total, 1)
        e["_score_breakdown"] = {
            "price":     round(price_score, 1),
            "detour":    round(detour_score, 1),
            "freshness": round(freshness_score, 1),
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
                "freshness": "Données fraîches",
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
