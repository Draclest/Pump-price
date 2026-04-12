from pydantic_settings import BaseSettings
from typing import Literal

_BASE = (
    "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
    "prix-carburants-quotidien"
)


class Settings(BaseSettings):
    elasticsearch_url:      str = "http://localhost:9200"
    elasticsearch_username: str = "elastic"
    elasticsearch_password: str = "changeme"

    backend_port: int = 8000
    log_level:    str = "INFO"

    otel_exporter_type:          Literal["console", "otlp", "jaeger"] = "console"
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    otel_service_name:           str = "prix-pompe-api"

    # Government dataset
    data_gouv_url:         str = f"{_BASE}/exports/json"   # full export
    data_gouv_records_url: str = f"{_BASE}/records"        # filtered records

    # Scheduled full ingestion — dataset updated daily at 11h
    ingestion_schedule: str = "0 11 * * *"

    # Background refresh thresholds
    osm_refresh_days:  int = 7    # re-fetch OSM metadata if older than N days

    # History retention
    price_history_days: int = 30

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
