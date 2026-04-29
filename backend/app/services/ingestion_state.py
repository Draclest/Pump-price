"""
In-memory ingestion state tracker.

Provides a single source of truth for the current ingestion status,
readable by any endpoint without requiring authentication.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal


IngestionStatus = Literal["idle", "running", "done", "error"]


@dataclass
class IngestionState:
    status: IngestionStatus = "idle"
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None
    result: dict = field(default_factory=dict)

    def start(self) -> None:
        self.status = "running"
        self.started_at = datetime.now(timezone.utc)
        self.finished_at = None
        self.error = None
        self.result = {}

    def complete(self, result: dict) -> None:
        self.status = "done"
        self.finished_at = datetime.now(timezone.utc)
        self.result = result

    def fail(self, error: str) -> None:
        self.status = "error"
        self.finished_at = datetime.now(timezone.utc)
        self.error = error

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "error": self.error,
            "result": self.result,
        }


# Singleton — imported by main.py, ingestion worker, and the status endpoint
ingestion_state = IngestionState()

# Separate singleton for the 10-minute live feed job
live_feed_state = IngestionState()
