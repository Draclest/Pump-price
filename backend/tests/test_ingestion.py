import pytest
from app.workers.ingestion import _parse_station


def make_raw_station(**kwargs):
    base = {
        "id": "12345",
        "geom": {"geometry": {"coordinates": [2.3488, 48.8534]}},
        "adresse": "1 rue de la Paix",
        "ville": "Paris",
        "cp": "75001",
        "prix_sp95": "1.85",
        "prix_sp95_maj": "2024-01-01T10:00:00",
        "prix_gazole": "1.65",
        "prix_gazole_maj": "2024-01-01T10:00:00",
    }
    base.update(kwargs)
    return base


def test_parse_station_basic():
    raw = make_raw_station()
    station = _parse_station(raw)
    assert station is not None
    assert station["id"] == "12345"
    assert station["city"] == "Paris"
    assert station["location"]["lat"] == 48.8534
    assert station["location"]["lon"] == 2.3488
    assert len(station["fuels"]) == 2


def test_parse_station_missing_coordinates():
    raw = make_raw_station(geom={})
    station = _parse_station(raw)
    assert station is None


def test_parse_station_no_fuels():
    raw = {
        "id": "99",
        "geom": {"geometry": {"coordinates": [2.3, 48.8]}},
        "adresse": "test",
        "ville": "Lyon",
        "cp": "69000",
    }
    station = _parse_station(raw)
    assert station is not None
    assert station["fuels"] == []
