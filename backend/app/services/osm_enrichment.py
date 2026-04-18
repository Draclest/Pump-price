"""
OSM Enrichment Service
======================
Two modes:

  1. fetch_all_france()        → used at init, returns ~10-15k OSM fuel stations
  2. fetch_by_osm_id(id, type) → used for background refresh of a single station

Matching (cross-reference):
  - Spatial grid index (0.01° ≈ 1 km cells) for O(n) nearest-neighbour lookup
  - Match radius: MATCH_RADIUS_M = 100 m
  - For each gov station: find nearest OSM node → merge metadata
  - OSM-only stations (no gov match) are also returned for indexing
"""

import asyncio
import logging
import math
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# France bounding box (south, west, north, east) for Overpass
_BBOX = (41.3, -5.6, 51.2, 9.7)

OVERPASS_TIMEOUT = 180   # seconds — France-wide query needs generous time
MATCH_RADIUS_M   = 150   # metres — slightly wider to catch imprecise coordinates
_GRID_PREC       = 0.01  # degrees ≈ 1 km

# Mirrors tried in order — public Overpass instances require a User-Agent.
_OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# Overpass instances block requests without a recognisable User-Agent.
_HEADERS = {
    "User-Agent": "PrixAlaPompe/1.0 (fuel price comparison app; contact@example.com)",
    "Accept": "application/json",
}


# ── Spatial helpers ────────────────────────────────────────────────────────────

def _cell(lat: float, lon: float) -> tuple[int, int]:
    return (int(math.floor(lat / _GRID_PREC)),
            int(math.floor(lon / _GRID_PREC)))


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_spatial_index(osm_stations: list[dict]) -> dict[tuple, list[dict]]:
    index: dict[tuple, list[dict]] = {}
    for s in osm_stations:
        index.setdefault(_cell(s["lat"], s["lon"]), []).append(s)
    return index


def nearest_osm(lat: float, lon: float, index: dict) -> Optional[dict]:
    """Return closest OSM station within MATCH_RADIUS_M, or None."""
    row, col = _cell(lat, lon)
    best_d, best = MATCH_RADIUS_M + 1, None
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            for s in index.get((row + dr, col + dc), []):
                d = _haversine_m(lat, lon, s["lat"], s["lon"])
                if d < best_d:
                    best_d, best = d, s
    return best


# ── Overpass helpers ───────────────────────────────────────────────────────────

def _parse_osm_element(el: dict, fetched_at: str) -> Optional[dict]:
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")
    if lat is None or lon is None:
        return None
    return {
        "osm_id":   str(el["id"]),
        "osm_type": el["type"],
        "lat":      float(lat),
        "lon":      float(lon),
        "tags":     el.get("tags", {}),
        "fetched_at": fetched_at,
    }


async def _run_overpass(query: str, timeout: int = OVERPASS_TIMEOUT) -> list[dict]:
    """Run an Overpass query, trying mirrors on failure."""
    fetched_at = datetime.now(timezone.utc).isoformat()
    last_exc: Exception | None = None

    for url in _OVERPASS_MIRRORS:
        try:
            async with httpx.AsyncClient(timeout=float(timeout + 30), headers=_HEADERS) as client:
                resp = await client.post(url, data={"data": query})
                resp.raise_for_status()
                data = resp.json()
            result = []
            for el in data.get("elements", []):
                parsed = _parse_osm_element(el, fetched_at)
                if parsed:
                    result.append(parsed)
            logger.info("Overpass OK via %s: %d elements", url, len(result))
            return result
        except Exception as exc:
            logger.info("Overpass mirror %s unavailable (%s) — trying next", url, exc)
            last_exc = exc

    logger.error(
        "All Overpass mirrors failed — OSM enrichment skipped. "
        "Stations will be indexed with gov data only. Last error: %s", last_exc,
    )
    return []


# ── Public API ─────────────────────────────────────────────────────────────────

async def fetch_all_france() -> list[dict]:
    """
    Fetch all fuel stations in France from Overpass API.
    Splits into north/south halves to avoid query timeout on large datasets.
    """
    south, west, north, east = _BBOX
    mid = (south + north) / 2  # ≈ 46.25°N

    def _q(s: float, n: float) -> str:
        return (
            f"[out:json][timeout:{OVERPASS_TIMEOUT}];"
            f"(node[\"amenity\"=\"fuel\"]({s},{west},{n},{east});"
            f"way[\"amenity\"=\"fuel\"]({s},{west},{n},{east}););"
            "out center tags;"
        )

    south_task = asyncio.create_task(_run_overpass(_q(south, mid)))
    north_task = asyncio.create_task(_run_overpass(_q(mid, north)))
    south_res, north_res = await asyncio.gather(south_task, north_task)

    # Deduplicate by osm_id (shouldn't overlap, but be safe)
    seen: set[str] = set()
    stations: list[dict] = []
    for s in south_res + north_res:
        key = s["osm_id"]
        if key not in seen:
            seen.add(key)
            stations.append(s)

    logger.info("OSM fetch_all_france: %d elements (south=%d north=%d)",
                len(stations), len(south_res), len(north_res))
    return stations


async def fetch_by_osm_id(osm_id: str, osm_type: str = "node") -> Optional[dict]:
    """
    Fetch a single OSM element by ID and type.
    Returns the parsed element dict, or None on failure.
    """
    if osm_type == "node":
        query = f"[out:json];node({osm_id});out tags;"
    else:
        query = f"[out:json];way({osm_id});out center tags;"

    elements = await _run_overpass(query, timeout=15)
    return elements[0] if elements else None


# ── Brand normalization ────────────────────────────────────────────────────────

_BRAND_ALIASES: dict[str, str] = {
    "total":             "totalenergies",
    "total energies":    "totalenergies",
    "total energy":      "totalenergies",
    "totalenergies":     "totalenergies",
    "bp":                "bp",
    "british petroleum": "bp",
    "shell":             "shell",
    "esso":              "esso",
    "esso express":      "esso",
    "avia":              "avia",
    "dyneff":            "dyneff",
    "agip":              "agip",
    "eni":               "agip",
    "q8":                "q8",
    "gulf":              "gulf",
    "e.leclerc":         "leclerc",
    "leclerc":           "leclerc",
    "intermarché":       "intermarche",
    "intermarche":       "intermarche",
    "carrefour":         "carrefour",
    "carrefour market":  "carrefour",
    "super u":           "systeme-u",
    "système u":         "systeme-u",
    "systeme u":         "systeme-u",
    "hyper u":           "systeme-u",
    "u express":         "systeme-u",
    "auchan":            "auchan",
    "netto":             "netto",
    "casino":            "casino",
    "géant casino":      "casino",
    "géant":             "casino",
    "lidl":              "lidl",
    "colruyt":           "colruyt",
    "cora":              "cora",
    "vito":              "vito",
    "pétroplus":         "petroplus",
    "petroplus":         "petroplus",
    "elan":              "elan",
    "access":            "access",
}


def normalize_brand(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    key = raw.strip().lower()
    for alias, normalized in _BRAND_ALIASES.items():
        if key == alias or key.startswith(alias):
            return normalized
    return key.replace(" ", "-") if key not in ("indépendant", "independant", "") else None


def extract_osm_fields(osm: dict) -> dict:
    """
    Extract enrichment fields from a parsed OSM element.
    Returns a partial station dict with OSM-sourced fields.
    """
    tags = osm.get("tags", {})
    raw_brand = tags.get("brand") or tags.get("operator")
    brand_key = normalize_brand(raw_brand)

    return {
        "osm_node_id":    osm["osm_id"],
        "osm_node_type":  osm["osm_type"],
        "osm_last_updated": osm.get("fetched_at"),
        # Fill name/brand only if not already set (gov has priority)
        "_osm_name":      tags.get("name") or tags.get("operator") or tags.get("brand"),
        "_osm_brand":     raw_brand,
        "_osm_brand_key": brand_key,
        "_osm_opening_hours": tags.get("opening_hours"),
        "_osm_website":   tags.get("website") or tags.get("contact:website"),
        "_osm_phone":     tags.get("phone") or tags.get("contact:phone"),
    }


# ── Cross-reference ────────────────────────────────────────────────────────────

def cross_reference(
    gov_stations: list[dict],
    osm_stations: list[dict],
) -> tuple[list[dict], list[dict]]:
    """
    Cross-reference gov and OSM stations by proximity.

    Returns:
        merged   : gov stations enriched with OSM data
        osm_only : OSM stations with no gov match (indexed without prices)
    """
    if not osm_stations:
        logger.warning("No OSM stations — skipping cross-reference")
        return gov_stations, []

    index = build_spatial_index(osm_stations)
    matched_osm_ids: set[str] = set()

    gov_matched = gov_unmatched = 0

    for station in gov_stations:
        loc = station.get("location", {})
        lat, lon = loc.get("lat"), loc.get("lon")
        if lat is None or lon is None:
            continue

        osm = nearest_osm(lat, lon, index)
        if osm is None:
            gov_unmatched += 1
            continue

        gov_matched += 1
        matched_osm_ids.add(osm["osm_id"])
        fields = extract_osm_fields(osm)

        # Gov has priority: only fill missing fields
        if not station.get("name"):
            station["name"] = fields["_osm_name"]
        if not station.get("brand") and fields["_osm_brand"]:
            station["brand"] = fields["_osm_brand"]

        station["brand_key"]       = fields["_osm_brand_key"] or normalize_brand(station.get("brand"))
        station["osm_node_id"]     = fields["osm_node_id"]
        station["osm_node_type"]   = fields["osm_node_type"]
        station["osm_last_updated"] = fields["osm_last_updated"]

        # Opening hours: OSM only if gov doesn't have 24/7 already
        if not station.get("opening_hours") and fields["_osm_opening_hours"]:
            station["opening_hours"] = fields["_osm_opening_hours"]

        # Mark as enriched by both sources
        station["data_sources"] = ["gov", "osm"]

    logger.info(
        "Cross-reference: gov_matched=%d gov_unmatched=%d",
        gov_matched, gov_unmatched,
    )

    # Build OSM-only list (stations in OSM but not in gov dataset)
    osm_only = []
    for osm in osm_stations:
        if osm["osm_id"] in matched_osm_ids:
            continue
        fields = extract_osm_fields(osm)
        brand_key = fields["_osm_brand_key"]
        osm_only.append({
            "id":              f"osm_{osm['osm_id']}",
            "gov_station_id":  None,
            "osm_node_id":     osm["osm_id"],
            "osm_node_type":   osm["osm_type"],
            "name":            fields["_osm_name"],
            "brand":           fields["_osm_brand"],
            "brand_key":       brand_key,
            "address":         osm["tags"].get("addr:street", ""),
            "city":            osm["tags"].get("addr:city", ""),
            "postal_code":     osm["tags"].get("addr:postcode", ""),
            "location":        {"lat": osm["lat"], "lon": osm["lon"]},
            "fuels":           [],       # no price data from OSM
            "services":        [],
            "is_open":         None,
            "opening_hours":   fields["_osm_opening_hours"],
            "osm_last_updated": osm.get("fetched_at"),
            "gov_last_updated": None,
            "data_sources":    ["osm"],
        })

    logger.info("OSM-only stations (no gov match): %d", len(osm_only))
    return gov_stations, osm_only
