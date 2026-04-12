import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_search_stations_missing_params():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/stations/search")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_stations_returns_results():
    mock_results = [
        {
            "id": "1",
            "name": "Test Station",
            "brand": "Total",
            "address": "1 rue de la Paix",
            "city": "Paris",
            "postal_code": "75001",
            "location": {"lat": 48.87, "lon": 2.33},
            "fuels": [{"type": "SP95", "price": 1.85, "updated_at": "2024-01-01T00:00:00"}],
            "distance_meters": 500.0,
        }
    ]

    with patch("app.api.stations.station_service.search_stations", new=AsyncMock(return_value=mock_results)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/stations/search?lat=48.87&lon=2.33")
    assert resp.status_code == 200
