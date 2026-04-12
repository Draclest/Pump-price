"""
Routing service: fetches route geometry from OSRM and provides
helpers to filter/score stations along a route.
"""
from __future__ import annotations

import math
from typing import Any

import httpx

from app.config import settings


async def get_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
) -> dict:
    """
    Returns:
    {
        "coordinates": [[lon, lat], ...],  # GeoJSON order
        "distance_m": float,
        "duration_s": float,
    }
    Raises on failure.
    """
    url = (
        f"{settings.osrm_url}/route/v1/driving/"
        f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        "?overview=full&geometries=geojson&steps=false"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError(f"OSRM error: {data.get('code')}")
    route = data["routes"][0]
    coords: list[list[float]] = route["geometry"]["coordinates"]
    return {
        "coordinates": coords,
        "distance_m": route["distance"],
        "duration_s": route["duration"],
    }


def _project_point_to_segment(
    px: float, py: float,
    ax: float, ay: float,
    bx: float, by: float,
) -> tuple[float, float, float]:
    """
    Projects point (px,py) onto segment (ax,ay)-(bx,by).
    Returns (closest_x, closest_y, t) where t in [0,1] is the parameter along segment.
    Works in lat/lon degrees (approx OK for short segments <100km).
    """
    dx = bx - ax
    dy = by - ay
    if dx == 0 and dy == 0:
        return ax, ay, 0.0
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return ax + t * dx, ay + t * dy, t


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def station_route_info(
    station_lat: float,
    station_lon: float,
    route_coords: list[list[float]],  # [[lon, lat], ...]
) -> dict:
    """
    Returns:
    {
        "perp_dist_km": float,   # perpendicular distance from route
        "detour_km": float,      # estimated round-trip detour (2x perp dist)
        "nearest_idx": int,      # index of nearest segment start in route_coords
        "progress_pct": float,   # how far along the route (0-100%)
    }
    """
    if not route_coords:
        return {"perp_dist_km": 0.0, "detour_km": 0.0, "nearest_idx": 0, "progress_pct": 0.0}

    best_dist = float("inf")
    best_idx = 0
    best_t = 0.0

    # Total route cumulative distances for progress_pct
    n = len(route_coords)

    for i in range(n - 1):
        ax, ay = route_coords[i][0], route_coords[i][1]   # lon, lat
        bx, by = route_coords[i + 1][0], route_coords[i + 1][1]
        cx, cy, t = _project_point_to_segment(station_lon, station_lat, ax, ay, bx, by)
        dist = _haversine_km(station_lat, station_lon, cy, cx)
        if dist < best_dist:
            best_dist = dist
            best_idx = i
            best_t = t

    # Compute total route distance and distance to nearest point
    total_dist = 0.0
    dist_to_nearest = 0.0
    for i in range(n - 1):
        seg_dist = _haversine_km(
            route_coords[i][1], route_coords[i][0],
            route_coords[i + 1][1], route_coords[i + 1][0],
        )
        if i < best_idx:
            dist_to_nearest += seg_dist
        elif i == best_idx:
            dist_to_nearest += seg_dist * best_t
        total_dist += seg_dist

    progress_pct = (dist_to_nearest / total_dist * 100.0) if total_dist > 0 else 0.0

    return {
        "perp_dist_km": round(best_dist, 3),
        "detour_km": round(best_dist * 2, 3),
        "nearest_idx": best_idx,
        "progress_pct": round(progress_pct, 2),
    }


def filter_stations_near_route(
    stations: list[dict],
    route_coords: list,
    max_detour_km: float = 5.0,
) -> list[dict]:
    """
    Returns stations whose detour_km <= max_detour_km,
    each enriched with _route_info dict from station_route_info().
    Sorted by progress_pct (i.e., order they appear along the route).
    """
    result = []
    for st in stations:
        loc = st.get("location", {}) or {}
        lat = loc.get("lat")
        lon = loc.get("lon")
        if lat is None or lon is None:
            continue
        info = station_route_info(lat, lon, route_coords)
        if info["detour_km"] <= max_detour_km:
            result.append({**st, "_route_info": info})

    result.sort(key=lambda s: s["_route_info"]["progress_pct"])
    return result
