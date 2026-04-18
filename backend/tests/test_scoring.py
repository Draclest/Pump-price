"""
Unit tests for the scoring service.

No external dependencies — pure Python, no mocks needed.
"""

from datetime import datetime, timezone, timedelta
import pytest

from app.services.scoring_service import (
    haversine_km,
    score_stations,
    score_stations_route,
    _fraicheur_score,
    _services_score,
)


# ── haversine_km ──────────────────────────────────────────────────────────────

def test_haversine_same_point_is_zero():
    assert haversine_km(48.85, 2.35, 48.85, 2.35) == pytest.approx(0.0)


def test_haversine_paris_lyon():
    # Paris → Lyon ≈ 391 km by great circle
    dist = haversine_km(48.8566, 2.3522, 45.7640, 4.8357)
    assert 380 < dist < 400


# ── _fraicheur_score ──────────────────────────────────────────────────────────

def _ts(hours_ago: float) -> str:
    dt = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return dt.isoformat()


def test_fraicheur_fresh_data_is_1():
    assert _fraicheur_score(_ts(0)) == pytest.approx(1.0, abs=0.01)


def test_fraicheur_at_168h_is_0():
    assert _fraicheur_score(_ts(168)) == pytest.approx(0.0, abs=0.01)


def test_fraicheur_at_84h_is_half():
    score = _fraicheur_score(_ts(84))  # midpoint = 0.5
    assert score == pytest.approx(0.5, abs=0.01)


def test_fraicheur_none_returns_0():
    assert _fraicheur_score(None) == 0.0


def test_fraicheur_invalid_string_returns_0():
    assert _fraicheur_score("not-a-date") == 0.0


# ── _services_score ───────────────────────────────────────────────────────────

def test_services_score_empty_station_is_0():
    assert _services_score({}) == 0.0


def test_services_score_24_7_adds_open_bonus():
    score = _services_score({"opening_hours": "24/7", "services": []})
    assert score == pytest.approx(0.35)


def test_services_score_all_services_caps_at_1():
    station = {
        "is_open": True,
        "opening_hours": "24/7",
        "services": ["Automate CB", "Boutique alimentaire", "Lavage", "Toilettes"],
    }
    assert _services_score(station) == pytest.approx(1.0)


# ── score_stations ────────────────────────────────────────────────────────────

def _make_station(station_id: str, price: float, lat: float, lon: float) -> dict:
    return {
        "id": station_id,
        "address": "1 rue test",
        "city": "Paris",
        "postal_code": "75001",
        "location": {"lat": lat, "lon": lon},
        "fuels": [{"type": "SP95", "price": price, "updated_at": _ts(1)}],
        "services": [],
        "data_sources": ["gov"],
    }


def test_score_stations_empty_returns_empty():
    assert score_stations([], ["SP95"], 48.85, 2.35, 10.0) == []


def test_cheapest_station_gets_highest_price_score():
    stations = [
        _make_station("cheap", 1.80, 48.85, 2.35),
        _make_station("expensive", 1.95, 48.85, 2.36),
    ]
    scored = score_stations(stations, ["SP95"], 48.85, 2.35, 10.0)
    cheap = next(s for s in scored if s["id"] == "cheap")
    expensive = next(s for s in scored if s["id"] == "expensive")
    assert cheap["_score_breakdown"]["price"] > expensive["_score_breakdown"]["price"]


def test_closest_station_gets_highest_distance_score():
    stations = [
        _make_station("near", 1.85, 48.851, 2.351),   # ~100 m
        _make_station("far",  1.85, 48.90,  2.40),    # ~5 km
    ]
    scored = score_stations(stations, ["SP95"], 48.85, 2.35, 10.0)
    near = next(s for s in scored if s["id"] == "near")
    far  = next(s for s in scored if s["id"] == "far")
    assert near["_score_breakdown"]["distance"] > far["_score_breakdown"]["distance"]


def test_score_is_between_0_and_100():
    stations = [_make_station("s1", 1.85, 48.85, 2.35)]
    scored = score_stations(stations, ["SP95"], 48.85, 2.35, 10.0)
    assert 0.0 <= scored[0]["_score"] <= 100.0


def test_top3_get_recommendation_labels():
    stations = [_make_station(f"s{i}", 1.80 + i * 0.05, 48.85 + i * 0.01, 2.35) for i in range(5)]
    scored = score_stations(stations, ["SP95"], 48.85, 2.35, 10.0)
    for s in scored[:3]:
        assert s["_recommendation_label"] is not None
    for s in scored[3:]:
        assert s["_recommendation_label"] is None


def test_sorted_by_score_descending():
    stations = [_make_station(f"s{i}", 1.80 + i * 0.05, 48.85, 2.35) for i in range(4)]
    scored = score_stations(stations, ["SP95"], 48.85, 2.35, 10.0)
    scores = [s["_score"] for s in scored]
    assert scores == sorted(scores, reverse=True)


def test_station_without_matching_fuel_gets_zero_price_score():
    station = _make_station("s1", 1.85, 48.85, 2.35)
    # Ask for E85 but station only has SP95
    scored = score_stations([station], ["E85"], 48.85, 2.35, 10.0)
    assert scored[0]["_score_breakdown"]["price"] == 0.0


# ── score_stations_route ──────────────────────────────────────────────────────

def _make_route_station(station_id: str, price: float, detour_km: float) -> dict:
    return {
        "id": station_id,
        "address": "1 rue test",
        "city": "Paris",
        "postal_code": "75001",
        "location": {"lat": 48.85, "lon": 2.35},
        "fuels": [{"type": "SP95", "price": price, "updated_at": _ts(1)}],
        "services": [],
        "data_sources": ["gov"],
        "_route_info": {"detour_km": detour_km},
    }


def test_route_score_empty_returns_empty():
    assert score_stations_route([], ["SP95"]) == []


def test_route_zero_detour_gets_full_detour_score():
    stations = [_make_route_station("s1", 1.85, 0.0)]
    scored = score_stations_route(stations, ["SP95"], route_distance_km=100.0, max_detour_km=5.0)
    assert scored[0]["_score_breakdown"]["detour"] == pytest.approx(100.0)


def test_route_max_detour_gets_zero_detour_score():
    stations = [_make_route_station("s1", 1.85, 5.0)]
    scored = score_stations_route(stations, ["SP95"], route_distance_km=100.0, max_detour_km=5.0)
    assert scored[0]["_score_breakdown"]["detour"] == pytest.approx(0.0)
