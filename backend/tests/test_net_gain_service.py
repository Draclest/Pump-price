"""
Test d'orchestration du moteur de gain net (étage service).

ES + OSRM moqués (pas d'I/O réseau) : on vérifie le ranking deux étages —
filtre dur de détour, scoring, tri par gain net, baseline, contrat de sortie.
"""
import asyncio

import pytest

from app.services import net_gain_service as svc
from app.services import net_gain_repository as repo
from app.services import osrm_client
from app.services.net_gain import Preferences, Vehicle
from app.services.net_gain_repository import Candidate
from app.services.osrm_client import OsrmTable


ORIGIN = (50.0, 3.0)


def _cand(sid, price, lat=50.01, lon=3.01, age=95.0):
    return Candidate(
        station_id=sid, brand="Test", name=sid,
        lat=lat, lon=lon, services=[], price=price, price_age_min=age,
    )


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def patched(monkeypatch):
    # 3 candidates ; S2 sera exclu par le détour (filtre dur).
    candidates = [_cand("S1", 1.799), _cand("S2", 1.799), _cand("S3", 1.839)]

    async def fake_prefilter_radius(*a, **k):
        return candidates

    async def fake_station_candidate(*a, **k):
        return _cand("HAB", 1.879)  # station habituelle (baseline)

    # Matrice OSRM : points = [origin, S1, S2, S3] (aller simple, mètres / secondes).
    # detour = 2 × aller. S2 : 2×6min = 12min > max_detour_min (10) → exclu.
    async def fake_table(points):
        n = len(points)
        dist = [[0.0] * n for _ in range(n)]
        dur = [[0.0] * n for _ in range(n)]
        dist[0][1], dur[0][1] = 1200.0, 150.0   # S1 → 2.4 km / 5 min
        dist[0][2], dur[0][2] = 8000.0, 360.0   # S2 → 16 km / 12 min (exclu)
        dist[0][3], dur[0][3] = 1500.0, 150.0   # S3 → 3 km / 5 min
        return OsrmTable(distances=dist, durations=dur)

    monkeypatch.setattr(repo, "prefilter_radius", fake_prefilter_radius)
    monkeypatch.setattr(repo, "station_candidate", fake_station_candidate)
    monkeypatch.setattr(osrm_client, "table", fake_table)
    return candidates


def test_habitual_orchestration(patched):
    vehicle = Vehicle(fuel="gazole", consumption_l_100km=5.6, tank_capacity_l=50, current_level_l=8)
    prefs = Preferences(time_value_eur_h=10, max_detour_min=10, max_price_age_h=72)

    out = _run(svc.search_net_gain(
        es=object(), mode="habitual", vehicle=vehicle, prefs=prefs,
        origin=ORIGIN, destination=None, baseline_station_id="HAB",
    ))

    # Baseline = station habituelle
    assert out["baseline"]["source"] == "habitual_station"
    assert out["baseline"]["price"] == 1.879
    assert out["fill_liters"] == 42.0

    results = out["results"]
    ids = [r["station_id"] for r in results]

    # S2 exclu (détour 12 min > 10) ; S1 et S3 conservés
    assert "S2" not in ids
    assert ids == ["S1", "S3"]                 # tri par gain net décroissant

    s1 = results[0]
    assert s1["net_gain_eur"] == 2.28          # fixture A
    assert s1["verdict"] == "worth_it"
    assert s1["detour"] == {"km": 2.4, "min": 5.0}
    assert s1["confidence"] == "high"
    # breakdown toujours présent (crédibilité du verdict)
    assert s1["breakdown"] == {"pump_saving_eur": 3.36, "detour_fuel_eur": 0.24, "time_cost_eur": 0.83}


def test_nearby_ignores_detour_hard_filter(patched):
    """En nearby, le rayon borne la portée : pas de filtre dur de détour.

    S2 (détour 12 min > max_detour_min 10) DOIT rester présent — contrairement à
    habitual/route. Le coût carburant du détour le pénalise déjà dans le gain net.
    """
    vehicle = Vehicle(fuel="gazole", consumption_l_100km=5.6, tank_capacity_l=50)
    prefs = Preferences(max_detour_min=10, max_price_age_h=72)

    out = _run(svc.search_net_gain(
        es=object(), mode="nearby", vehicle=vehicle, prefs=prefs,
        origin=ORIGIN, destination=None, baseline_station_id=None,
    ))

    ids = [r["station_id"] for r in out["results"]]
    assert "S2" in ids                         # plus exclu par le détour
    assert set(ids) == {"S1", "S2", "S3"}


def test_empty_when_no_candidates(monkeypatch):
    async def empty(*a, **k):
        return []
    monkeypatch.setattr(repo, "prefilter_radius", empty)

    vehicle = Vehicle(fuel="gazole", consumption_l_100km=5.6, tank_capacity_l=50)
    out = _run(svc.search_net_gain(
        es=object(), mode="nearby", vehicle=vehicle, prefs=Preferences(),
        origin=ORIGIN, destination=None, baseline_station_id=None,
    ))
    assert out["results"] == []
    assert out["baseline"] is None
