"""
API endpoint tests.

These tests use ASGI transport (no real server) and mock Elasticsearch.
They verify routing, input validation, authentication, and response shapes.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock

from app.main import app


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_station(**overrides) -> dict:
    """Return a minimal valid station dict."""
    base = {
        "id": "1",
        "name": "Station Test",
        "brand": "Total",
        "address": "1 rue de la Paix",
        "city": "Paris",
        "postal_code": "75001",
        "location": {"lat": 48.87, "lon": 2.33},
        "fuels": [{"type": "SP95", "price": 1.85, "updated_at": "2024-01-01T00:00:00Z"}],
        "services": [],
        "data_sources": ["gov"],
        "distance_meters": 500.0,
    }
    base.update(overrides)
    return base


# ── Health ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_returns_ok():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ── Security headers ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_security_headers_present():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("x-xss-protection") == "1; mode=block"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


# ── /stations/search ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_missing_lat_lon_returns_422():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/stations/search")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_invalid_lat_returns_422():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/stations/search?lat=999&lon=2.33")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_invalid_radius_returns_422():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # radius_km must be between 0.1 and 100
        resp = await client.get("/api/v1/stations/search?lat=48.87&lon=2.33&radius_km=200")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_returns_results():
    mock_station = _make_station()

    with patch(
        "app.api.stations.station_service.search_stations",
        new=AsyncMock(return_value=[MagicMock(**mock_station, model_dump=lambda: mock_station)]),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/stations/search?lat=48.87&lon=2.33")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── /ingestion/trigger (auth) ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingestion_trigger_no_key_returns_403():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/ingestion/trigger")
    # 403 whether INGESTION_API_KEY is set or not (no key provided)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_ingestion_trigger_wrong_key_returns_403():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/ingestion/trigger",
            headers={"X-API-Key": "wrong-key"},
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_ingestion_trigger_correct_key_accepted():
    """Correct API key → ingestion is accepted (background task, status 200)."""
    test_key = "test-secret-key-abc123"

    with (
        patch("app.api.ingestion.settings.ingestion_api_key", test_key),
        patch("app.api.ingestion.run_ingestion", new=AsyncMock()),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/ingestion/trigger",
                headers={"X-API-Key": test_key},
            )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ingestion started"
