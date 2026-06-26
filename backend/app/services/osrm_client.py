"""
Client OSRM `/table` — matrice de distances/durées entre points.

Sert l'étage 2 du moteur de gain net : un seul appel matrice borne le coût OSRM
pour les K candidates (cf. IMPLEMENTATION.md T3 / spec §6). L'URL OSRM vient de
settings.osrm_url (pas de secret en dur).
"""
from __future__ import annotations

from typing import Optional

import httpx

from app.config import settings


class OsrmTable:
    """Matrice OSRM. `distances` en mètres, `durations` en secondes (None si indispo)."""

    def __init__(self, distances: list[list[Optional[float]]], durations: list[list[Optional[float]]]):
        self.distances = distances
        self.durations = durations

    def km(self, i: int, j: int) -> float:
        v = self.distances[i][j]
        return (v / 1000.0) if v is not None else 0.0

    def minutes(self, i: int, j: int) -> float:
        v = self.durations[i][j]
        return (v / 60.0) if v is not None else 0.0


async def table(points: list[tuple[float, float]]) -> OsrmTable:
    """
    Matrice complète entre `points` = [(lat, lon), ...].
    Lève en cas d'échec (l'appelant décide du fallback).
    """
    if len(points) < 2:
        raise ValueError("OSRM table needs at least 2 points")

    coords = ";".join(f"{lon},{lat}" for (lat, lon) in points)
    url = (
        f"{settings.osrm_url}/table/v1/driving/{coords}"
        "?annotations=distance,duration"
    )
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    data = resp.json()
    if data.get("code") != "Ok":
        raise ValueError(f"OSRM table error: {data.get('code')}")

    n = len(points)
    distances = data.get("distances") or [[None] * n for _ in range(n)]
    durations = data.get("durations") or [[None] * n for _ in range(n)]
    return OsrmTable(distances=distances, durations=durations)
