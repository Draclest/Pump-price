"""
Government Data Client (data.economie.gouv.fr)
===============================================
Wraps the prix-des-carburants-en-france-flux-instantane-v2 dataset.

Two modes:
  - fetch_all()            → full export (used at init)
  - fetch_by_ids(ids)      → targeted records (used for background refresh)

The export endpoint returns a flat JSON array.
The records endpoint supports OData-style `where=` filters and is used
to fetch individual or small groups of stations.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# Records endpoint (supports `where=` filtering)
_RECORDS_URL = settings.data_gouv_records_url

FUEL_MAP = {
    "gazole": "Gazole",
    "sp95":   "SP95",
    "sp98":   "SP98",
    "e10":    "E10",
    "e85":    "E85",
    "gplc":   "GPLc",
}

# Max IDs per batch request (API limit per call)
_BATCH_SIZE = 100


def parse_station(raw: dict) -> Optional[dict]:
    """
    Parse a raw gov record into an internal station dict.
    Returns None if the record is invalid (no coordinates, no ID).
    """
    try:
        geom = raw.get("geom") or {}
        lat = geom.get("lat")
        lon = geom.get("lon")
        if lat is None or lon is None:
            return None

        station_id = str(raw.get("id", "")).strip()
        if not station_id:
            return None

        fuels = []
        for prefix, fuel_name in FUEL_MAP.items():
            price = raw.get(f"{prefix}_prix")
            date_str = raw.get(f"{prefix}_maj")
            if price is None:
                continue
            try:
                updated_at = (datetime.fromisoformat(date_str)
                              if date_str else datetime.now(timezone.utc))
            except ValueError:
                updated_at = datetime.now(timezone.utc)
            fuels.append({
                "type":       fuel_name,
                "price":      float(price),
                "updated_at": updated_at.isoformat(),
            })

        services_raw = raw.get("services_service") or []
        services = (services_raw if isinstance(services_raw, list)
                    else [s.strip() for s in str(services_raw).split("//") if s.strip()])

        automate = raw.get("horaires_automate_24_24", "")
        is_automate_24h = str(automate).lower() in ("oui", "1", "true")

        gov_brand = raw.get("enseignes_enseigne") or None

        return {
            "id":           station_id,
            "gov_station_id": station_id,
            "name":         raw.get("nom") or gov_brand,
            "brand":        gov_brand,
            "address":      raw.get("adresse", ""),
            "city":         raw.get("ville", ""),
            "postal_code":  str(raw.get("cp", "")),
            "location":     {"lat": float(lat), "lon": float(lon)},
            "fuels":        fuels,
            "services":     services,
            "is_open":      True if is_automate_24h else None,
            "opening_hours": "24/7" if is_automate_24h else None,
            "gov_last_updated": datetime.now(timezone.utc).isoformat(),
            "data_sources": ["gov"],
        }
    except Exception as exc:
        logger.warning("parse_station failed for id=%s: %s", raw.get("id"), exc)
        return None


async def fetch_all() -> list[dict]:
    """Fetch the full gov dataset (export endpoint, returns a JSON array)."""
    logger.info("GOV fetch_all from %s", settings.data_gouv_url)
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.get(settings.data_gouv_url, params={"limit": -1})
            resp.raise_for_status()
            raw = resp.json()
    except Exception as exc:
        logger.error("GOV fetch_all failed: %s", exc)
        raise

    if not isinstance(raw, list):
        raw = raw.get("results", [])

    stations = []
    for record in raw:
        s = parse_station(record)
        if s:
            stations.append(s)

    logger.info("GOV fetch_all: %d valid stations", len(stations))
    return stations


async def fetch_by_ids(gov_ids: list[str]) -> list[dict]:
    """
    Fetch a subset of stations by their gov IDs.
    Used for targeted price refresh.
    Batches requests in groups of _BATCH_SIZE.
    """
    if not gov_ids:
        return []

    results: list[dict] = []
    for i in range(0, len(gov_ids), _BATCH_SIZE):
        batch = gov_ids[i: i + _BATCH_SIZE]
        id_list = ", ".join(f'"{gid}"' for gid in batch)
        params = {
            "where":  f"id in ({id_list})",
            "limit":  _BATCH_SIZE,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(_RECORDS_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.warning("GOV fetch_by_ids batch failed: %s", exc)
            continue

        records = data.get("results", data) if isinstance(data, dict) else data
        for record in (records if isinstance(records, list) else []):
            s = parse_station(record)
            if s:
                results.append(s)

    logger.debug("GOV fetch_by_ids: requested=%d found=%d", len(gov_ids), len(results))
    return results
