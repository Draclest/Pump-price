"""
Tests for configuration validation.

Verifies that the application fails fast with clear errors when required
environment variables are missing or invalid.
"""

import pytest
from pydantic import ValidationError

from app.config import Settings


def _base_env(**overrides) -> dict:
    """Return a minimal valid env dict."""
    base = {
        "elasticsearch_password": "supersecret",
        "cors_allowed_origins": "http://localhost:4200",
    }
    base.update(overrides)
    return base


def test_settings_valid_minimal():
    s = Settings(**_base_env())
    assert s.elasticsearch_password == "supersecret"
    assert s.elasticsearch_url == "http://elasticsearch:9200"
    assert s.rate_limit_per_minute == 60


def test_settings_missing_password_raises():
    with pytest.raises(ValidationError, match="elasticsearch_password"):
        Settings(
            elasticsearch_url="http://localhost:9200",
            # elasticsearch_password intentionally omitted
        )


def test_cors_origins_parsed_correctly():
    s = Settings(**_base_env(cors_allowed_origins="http://localhost:4200,https://example.com"))
    origins = s.get_cors_origins()
    assert origins == ["http://localhost:4200", "https://example.com"]


def test_cors_origins_single():
    s = Settings(**_base_env(cors_allowed_origins="https://example.com"))
    assert s.get_cors_origins() == ["https://example.com"]


def test_cors_origins_empty_raises():
    with pytest.raises(ValidationError):
        Settings(**_base_env(cors_allowed_origins=""))


def test_verify_certs_defaults_to_false():
    s = Settings(**_base_env())
    assert s.elasticsearch_verify_certs is False


def test_verify_certs_can_be_enabled():
    s = Settings(**_base_env(elasticsearch_verify_certs=True))
    assert s.elasticsearch_verify_certs is True


def test_log_level_invalid_raises():
    with pytest.raises(ValidationError):
        Settings(**_base_env(log_level="VERBOSE"))  # not in Literal


def test_rate_limit_default():
    s = Settings(**_base_env())
    assert s.rate_limit_per_minute == 60


def test_ingestion_api_key_defaults_to_empty():
    s = Settings(**_base_env())
    assert s.ingestion_api_key == ""
