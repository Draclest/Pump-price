"""
Repository ES du moteur de gain net — étage 1 (préfiltre).

Réutilise l'index existant `fuel-stations` (décision projet : pas de nouveau
schéma). Le carburant `prices` du spec correspond au `fuels` nested existant
(type / price / updated_at). On préfiltre géo + carburant + fraîcheur, on trie
par prix brut (proxy) et on remonte le top K avec le prix + l'âge du carburant
ciblé via `inner_hits` (cf. spec §7.3 / IMPLEMENTATION.md T2).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from elasticsearch import AsyncElasticsearch

from app.services.elasticsearch_client import INDEX_NAME
from app.services.net_gain import Fuel

# Codes carburant du spec → types stockés dans l'Open Data / ES.
# sp95_e10 couvre E10 ET SP95 (même catégorie 95 sans plomb), comme la recherche existante.
FUEL_TO_ES_TYPES: dict[Fuel, list[str]] = {
    "sp95_e10": ["E10", "SP95"],
    "sp98":     ["SP98"],
    "gazole":   ["Gazole"],
    "e85":      ["E85"],
    "gplc":     ["GPLc"],
}


class Candidate:
    """Une station candidate avec le prix + l'âge du carburant ciblé."""

    def __init__(
        self,
        station_id: str,
        brand: Optional[str],
        name: Optional[str],
        lat: float,
        lon: float,
        services: list[str],
        price: float,
        price_age_min: float,
    ):
        self.station_id = station_id
        self.brand = brand
        self.name = name
        self.lat = lat
        self.lon = lon
        self.services = services
        self.price = price
        self.price_age_min = price_age_min


def es_types_for(fuel: Fuel) -> list[str]:
    return FUEL_TO_ES_TYPES.get(fuel, [fuel])


def _nested_fuel_query(fuel: Fuel, max_price_age_h: float) -> dict:
    return {
        "nested": {
            "path": "fuels",
            "query": {
                "bool": {
                    "filter": [
                        {"terms": {"fuels.type": es_types_for(fuel)}},
                        {"range": {"fuels.updated_at": {"gte": f"now-{int(max_price_age_h)}h"}}},
                    ]
                }
            },
            "inner_hits": {
                "size": 1,
                "sort": [{"fuels.price": {"order": "asc"}}],
            },
        }
    }


def _age_minutes(updated_at: Optional[str]) -> float:
    if not updated_at:
        return float("inf")
    try:
        ts = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return max(0.0, (datetime.now(timezone.utc) - ts).total_seconds() / 60.0)
    except (ValueError, AttributeError):
        return float("inf")


def _to_candidates(hits: list[dict]) -> list[Candidate]:
    out: list[Candidate] = []
    for h in hits:
        src = h.get("_source", {})
        loc = src.get("location") or {}
        lat, lon = loc.get("lat"), loc.get("lon")
        if lat is None or lon is None:
            continue
        # inner_hits = prix + timestamp du carburant ciblé (le moins cher)
        inner = (
            h.get("inner_hits", {}).get("fuels", {}).get("hits", {}).get("hits", [])
        )
        if not inner:
            continue
        fsrc = inner[0].get("_source", {})
        price = fsrc.get("price")
        if price is None:
            continue
        out.append(
            Candidate(
                station_id=src.get("id") or src.get("gov_station_id") or h.get("_id"),
                brand=src.get("brand"),
                name=src.get("name"),
                lat=lat, lon=lon,
                services=src.get("services") or [],
                price=float(price),
                price_age_min=_age_minutes(fsrc.get("updated_at")),
            )
        )
    return out


async def prefilter_radius(
    es: AsyncElasticsearch,
    lat: float,
    lon: float,
    radius_km: float,
    fuel: Fuel,
    max_price_age_h: float,
    k: int,
) -> list[Candidate]:
    """Préfiltre géo (rayon) — modes nearby / habitual."""
    nested = _nested_fuel_query(fuel, max_price_age_h)
    body = {
        "size": k,
        "query": {
            "bool": {
                "filter": [
                    {"geo_distance": {"distance": f"{radius_km}km", "location": {"lat": lat, "lon": lon}}},
                    nested,
                ]
            }
        },
        "sort": [
            {"fuels.price": {
                "order": "asc",
                "nested": {"path": "fuels", "filter": {"terms": {"fuels.type": es_types_for(fuel)}}},
            }}
        ],
    }
    resp = await es.search(index=INDEX_NAME, body=body)
    return _to_candidates(resp["hits"]["hits"])


async def prefilter_bbox(
    es: AsyncElasticsearch,
    top_left: tuple[float, float],
    bottom_right: tuple[float, float],
    fuel: Fuel,
    max_price_age_h: float,
    k: int,
) -> list[Candidate]:
    """Préfiltre par bounding box (corridor d'itinéraire) — mode route.

    top_left = (lat_max, lon_min), bottom_right = (lat_min, lon_max).
    """
    nested = _nested_fuel_query(fuel, max_price_age_h)
    body = {
        "size": k,
        "query": {
            "bool": {
                "filter": [
                    {"geo_bounding_box": {"location": {
                        "top_left":     {"lat": top_left[0], "lon": top_left[1]},
                        "bottom_right": {"lat": bottom_right[0], "lon": bottom_right[1]},
                    }}},
                    nested,
                ]
            }
        },
        "sort": [
            {"fuels.price": {
                "order": "asc",
                "nested": {"path": "fuels", "filter": {"terms": {"fuels.type": es_types_for(fuel)}}},
            }}
        ],
    }
    resp = await es.search(index=INDEX_NAME, body=body)
    return _to_candidates(resp["hits"]["hits"])


async def station_candidate(
    es: AsyncElasticsearch,
    station_id: str,
    fuel: Fuel,
) -> Optional[Candidate]:
    """Station précise (prix + localisation du carburant ciblé) — baseline mode habitual."""
    body = {
        "size": 1,
        "query": {"bool": {"filter": [
            {"term": {"id": station_id}},
            _nested_fuel_query(fuel, max_price_age_h=24 * 365),  # pas de filtre de fraîcheur ici
        ]}},
    }
    resp = await es.search(index=INDEX_NAME, body=body)
    cands = _to_candidates(resp["hits"]["hits"])
    return cands[0] if cands else None
