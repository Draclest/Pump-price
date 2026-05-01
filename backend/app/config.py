"""
Application settings — all values come from environment variables or .env file.
Sensitive fields (passwords, API keys) have NO hardcoded defaults:
the application refuses to start if they are missing.
"""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from typing import Literal

_BASE = (
    "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
    "prix-carburants-quotidien"
)

_LIVE_BASE = (
    "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
    "prix-des-carburants-en-france-flux-instantane-v2"
)


class Settings(BaseSettings):
    # ── Elasticsearch ────────────────────────────────────────────────────────
    elasticsearch_url:      str = "http://elasticsearch:9200"
    elasticsearch_username: str = "elastic"
    # No default — the app will raise a clear error if this is not set.
    elasticsearch_password: str = Field(..., description="Elasticsearch password (required)")
    elasticsearch_verify_certs: bool = False  # Set True in production with real TLS certs

    # ── Server ───────────────────────────────────────────────────────────────
    backend_port: int = 8000
    log_level:    Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # ── CORS ─────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins, e.g. "http://localhost:4200,https://example.com"
    # Use "*" ONLY for local development — never in production.
    cors_allowed_origins: str = "http://localhost:4200"

    # ── Rate limiting ─────────────────────────────────────────────────────────
    # Requests per minute per IP on search/recommend endpoints
    rate_limit_per_minute: int = 60

    # ── Ingestion API key ─────────────────────────────────────────────────────
    # Protects /ingestion/trigger endpoints. Set a strong random value in .env.
    # If empty, ingestion endpoints are disabled (returns 403).
    ingestion_api_key: str = Field(default="", description="API key for ingestion endpoints")

    # ── Observability ─────────────────────────────────────────────────────────
    otel_exporter_type:          Literal["console", "otlp", "jaeger"] = "console"
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    otel_service_name:           str = "prix-pompe-api"

    # ── Government dataset ────────────────────────────────────────────────────
    # Daily snapshot (full, ~74k records, updated once a day at ~11h)
    data_gouv_url:         str = f"{_BASE}/exports/json"
    data_gouv_records_url: str = f"{_BASE}/records"
    # Live feed (flux instantané v2 — updated every few minutes by stations)
    data_gouv_live_url:    str = f"{_LIVE_BASE}/exports/json"

    # ── Scheduling ───────────────────────────────────────────────────────────
    # Full ingestion — dataset updated daily at 11h
    ingestion_schedule:   str = "0 11 * * *"
    # Live feed — poll every 10 minutes for near-real-time price updates
    live_feed_schedule:   str = "*/10 * * * *"

    # ── Routing ──────────────────────────────────────────────────────────────
    osrm_url: str = "https://router.project-osrm.org"

    # ── Data retention ────────────────────────────────────────────────────────
    osm_refresh_days:   int = 7
    price_history_days: int = 30

    @field_validator("cors_allowed_origins")
    @classmethod
    def parse_cors_origins(cls, v: str) -> str:
        # Validation: ensure no empty entries
        origins = [o.strip() for o in v.split(",") if o.strip()]
        if not origins:
            raise ValueError("cors_allowed_origins must contain at least one origin")
        return v

    def get_cors_origins(self) -> list[str]:
        """Return CORS origins as a list."""
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
