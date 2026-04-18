"""
Government Data Client (data.economie.gouv.fr)
===============================================
Wraps the prix-carburants-quotidien dataset.

The dataset returns ~74k records where each record = one (station × fuel_type) pair.
The same station appears multiple times (once per fuel type).
Records are grouped by `id` to build station objects.

Two modes:
  - fetch_all()            → full export (used at init / daily cron)
  - fetch_by_ids(ids)      → targeted records (used for background refresh)
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

_RECORDS_URL = settings.data_gouv_records_url

_BATCH_SIZE = 100

# gov day id → OSM day abbreviation
_DAY_MAP = {
    "1": "Mo", "2": "Tu", "3": "We",
    "4": "Th", "5": "Fr", "6": "Sa", "7": "Su",
}


def _fmt_time(t: str) -> str:
    """Convert '07.40' or '07:40' to '07:40'."""
    return t.replace(".", ":")


def _parse_horaires(raw_horaires) -> Optional[str]:
    """
    Convert the gov 'horaires' JSON field to an OSM-format opening_hours string.

    Gov format:
      {"@automate-24-24": "1"|"", "jour": [
        {"@id": "1", "@nom": "Lundi", "@ferme": "1"|"",
         "horaire": {"@ouverture": "07.00", "@fermeture": "21.00"}
                  | [{"@ouverture": "08.00", "@fermeture": "12.00"}, ...]}
      ]}

    Returns OSM format like "Mo 07:00-21:00; Tu 07:00-21:00; Sa off"
    or "24/7" for automats.
    """
    if not raw_horaires:
        return None
    try:
        if isinstance(raw_horaires, str):
            data = json.loads(raw_horaires)
        else:
            data = raw_horaires

        # Automat 24h
        if str(data.get("@automate-24-24", "")).strip() == "1":
            return "24/7"

        jours = data.get("jour", [])
        if not jours:
            return None

        parts = []
        for jour in jours:
            day_id = str(jour.get("@id", ""))
            osm_day = _DAY_MAP.get(day_id)
            if not osm_day:
                continue

            ferme = str(jour.get("@ferme", "")).strip()
            if ferme == "1":
                parts.append(f"{osm_day} off")
                continue

            horaire = jour.get("horaire")
            if not horaire:
                # Open but no hours given — skip this day (unknown hours)
                continue

            # Normalise to list
            if isinstance(horaire, dict):
                horaire = [horaire]

            ranges = []
            for h in horaire:
                ouv = h.get("@ouverture", "")
                fer = h.get("@fermeture", "")
                if ouv and fer:
                    ranges.append(f"{_fmt_time(ouv)}-{_fmt_time(fer)}")

            if ranges:
                parts.append(f"{osm_day} {','.join(ranges)}")

        return "; ".join(parts) if parts else None
    except Exception as exc:
        logger.debug("_parse_horaires failed: %s", exc)
        return None


def parse_records_to_stations(records: list[dict]) -> list[dict]:
    """
    Group raw records (one per station × fuel_type) into station dicts.

    Each record contributes one fuel entry from prix_nom/prix_valeur/prix_maj.
    The first record per station provides address/city/cp/location/services/horaires.
    Records with prix_nom or prix_valeur == None are skipped for fuel data.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # Use insertion-ordered dict to group by station id
    grouped: dict[str, dict] = {}

    for rec in records:
        sid = str(rec.get("id", "")).strip()
        if not sid:
            continue

        geom = rec.get("geom") or {}
        lat = geom.get("lat")
        lon = geom.get("lon")
        if lat is None or lon is None:
            continue

        if sid not in grouped:
            services_raw = rec.get("services_service") or []
            services = (
                services_raw if isinstance(services_raw, list)
                else [s.strip() for s in str(services_raw).split("//") if s.strip()]
            )

            opening_hours = _parse_horaires(rec.get("horaires"))
            is_open: Optional[bool] = None
            if opening_hours == "24/7":
                is_open = True

            grouped[sid] = {
                "id":             sid,
                "gov_station_id": sid,
                "name":           None,   # filled by OSM
                "brand":          None,   # filled by OSM
                "address":        rec.get("adresse", ""),
                "city":           rec.get("ville", ""),
                "postal_code":    str(rec.get("cp", "")),
                "location":       {"lat": float(lat), "lon": float(lon)},
                "fuels":          [],
                "services":       services,
                "is_open":        is_open,
                "opening_hours":  opening_hours,
                "opening_hours_display": None,
                "region":         rec.get("reg_name"),
                "department":     rec.get("dep_name"),
                "dep_code":       rec.get("dep_code"),
                "reg_code":       rec.get("reg_code"),
                "gov_last_updated": now_iso,
                "data_sources":   ["gov"],
            }

        # Add fuel entry if present
        prix_nom = rec.get("prix_nom")
        prix_valeur = rec.get("prix_valeur")
        if prix_nom is None or prix_valeur is None:
            continue

        prix_maj = rec.get("prix_maj")
        try:
            updated_at = (
                datetime.fromisoformat(prix_maj)
                if prix_maj else datetime.now(timezone.utc)
            )
        except ValueError:
            updated_at = datetime.now(timezone.utc)

        fuel_type = str(prix_nom)
        new_fuel = {
            "type":       fuel_type,
            "price":      float(prix_valeur),
            "updated_at": updated_at.isoformat(),
        }

        # Deduplicate: keep only the most recent entry per fuel type.
        # The gov dataset sometimes sends multiple records for the same
        # (station, fuel_type) — e.g. successive price updates in the same export.
        existing_fuels: list[dict] = grouped[sid]["fuels"]
        existing_idx = next(
            (i for i, f in enumerate(existing_fuels) if f["type"] == fuel_type),
            None,
        )
        if existing_idx is None:
            existing_fuels.append(new_fuel)
        else:
            # Keep the entry with the more recent updated_at
            existing = existing_fuels[existing_idx]
            try:
                if updated_at.isoformat() > existing["updated_at"]:
                    existing_fuels[existing_idx] = new_fuel
            except Exception:
                existing_fuels[existing_idx] = new_fuel

    return list(grouped.values())


async def fetch_all() -> list[dict]:
    """Fetch the full gov dataset (export endpoint, returns a flat JSON list of ~74k records)."""
    logger.info("GOV fetch_all from %s", settings.data_gouv_url)
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.get(settings.data_gouv_url)
            resp.raise_for_status()
            raw = resp.json()
    except Exception as exc:
        logger.error("GOV fetch_all failed: %s", exc)
        raise

    if not isinstance(raw, list):
        raw = raw.get("results", [])

    logger.info("GOV fetch_all: %d raw records received", len(raw))
    stations = parse_records_to_stations(raw)
    logger.info("GOV fetch_all: %d stations after grouping", len(stations))
    return stations


async def fetch_by_ids(gov_ids: list[str]) -> list[dict]:
    """
    Fetch a subset of stations by their gov IDs.
    Used for targeted price refresh.
    Batches requests in groups of _BATCH_SIZE.
    Each batch may return multiple records per station (one per fuel type).
    """
    if not gov_ids:
        return []

    all_records: list[dict] = []
    for i in range(0, len(gov_ids), _BATCH_SIZE):
        batch = gov_ids[i: i + _BATCH_SIZE]
        id_list = ", ".join(f'"{gid}"' for gid in batch)
        params = {
            "where": f"id in ({id_list})",
            "limit": _BATCH_SIZE * 10,  # up to 10 fuels per station
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
        if isinstance(records, list):
            all_records.extend(records)

    stations = parse_records_to_stations(all_records)
    logger.debug(
        "GOV fetch_by_ids: requested=%d raw_records=%d stations=%d",
        len(gov_ids), len(all_records), len(stations),
    )
    return stations
