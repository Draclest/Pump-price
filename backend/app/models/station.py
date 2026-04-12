from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GeoPoint(BaseModel):
    lat: float
    lon: float


class FuelPrice(BaseModel):
    type: str
    price: float
    updated_at: datetime


class Station(BaseModel):
    id: str
    # Display fields
    name: Optional[str] = None
    brand: Optional[str] = None
    brand_key: Optional[str] = None
    logo_url: Optional[str] = None
    brand_color: Optional[str] = None
    address: str
    city: str
    postal_code: str
    location: GeoPoint
    fuels: list[FuelPrice] = []
    services: list[str] = []
    # Status
    is_open: Optional[bool] = None
    opening_hours: Optional[str] = None
    opening_hours_display: Optional[str] = None
    # Provenance
    data_sources: list[str] = []          # ["gov"], ["osm"], ["gov","osm"]
    gov_station_id: Optional[str] = None
    gov_last_updated: Optional[str] = None
    osm_node_id: Optional[str] = None
    osm_node_type: Optional[str] = None   # "node" | "way"
    osm_last_updated: Optional[str] = None
    # Geographic/administrative
    region: Optional[str] = None
    department: Optional[str] = None
    dep_code: Optional[str] = None
    reg_code: Optional[str] = None


class StationSearchResult(BaseModel):
    id: str
    name: Optional[str] = None
    brand: Optional[str] = None
    brand_key: Optional[str] = None
    logo_url: Optional[str] = None
    brand_color: Optional[str] = None
    address: str
    city: str
    postal_code: str
    location: GeoPoint
    fuels: list[FuelPrice] = []
    services: list[str] = []
    is_open: Optional[bool] = None
    opening_hours: Optional[str] = None
    opening_hours_display: Optional[str] = None
    # Provenance (needed by refresh worker)
    data_sources: list[str] = []
    gov_station_id: Optional[str] = None
    gov_last_updated: Optional[str] = None
    osm_node_id: Optional[str] = None
    osm_node_type: Optional[str] = None
    osm_last_updated: Optional[str] = None
    # Geographic/administrative
    region: Optional[str] = None
    department: Optional[str] = None
    dep_code: Optional[str] = None
    reg_code: Optional[str] = None
    # Search result
    distance_meters: Optional[float] = None
    # Scoring / recommendation (populated by /recommend endpoint)
    score: Optional[float] = None
    score_breakdown: Optional[dict] = None
    recommendation_label: Optional[str] = None
    matched_fuel: Optional[dict] = None


class SearchParams(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10.0, ge=0.1, le=100.0)
    fuel_type: Optional[str] = Field(default=None)
    max_price: Optional[float] = Field(default=None, ge=0)
    limit: int = Field(default=20, ge=1, le=1000)
