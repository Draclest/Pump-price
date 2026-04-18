"""
Application entry point.

Security measures implemented here:
- CORS: restricted to configured origins (no wildcard in production)
- Rate limiting: slowapi, per-IP, configurable
- Security headers: X-Content-Type-Options, X-Frame-Options, etc.
- Structured JSON logging
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.api import stations, ingestion
from app.api.deps import get_es, close_es
from app.workers.ingestion import run_ingestion
from app.services.elasticsearch_client import INDEX_NAME

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", "message": "%(message)s"}',
)
logger = logging.getLogger(__name__)

# ── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
)

scheduler = AsyncIOScheduler()


# ── Startup / Shutdown ────────────────────────────────────────────────────────
async def _bootstrap_if_empty(es) -> None:
    """
    Run a full ingestion at startup if the index is empty or missing.
    Retries up to 3 times with exponential backoff on failure.
    """
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            exists = await es.indices.exists(index=INDEX_NAME)
            if not exists:
                logger.info("Index missing — running initial ingestion (attempt %d)", attempt)
                await run_ingestion(es)
                return

            count_resp = await es.count(index=INDEX_NAME)
            doc_count = count_resp.get("count", 0)
            if doc_count == 0:
                logger.info("Index empty — running initial ingestion (attempt %d)", attempt)
                await run_ingestion(es)
            else:
                logger.info("Index has %d documents — skipping initial ingestion", doc_count)
            return

        except Exception as exc:
            if attempt < max_attempts:
                wait = 2 ** attempt  # 2s, 4s
                logger.error(
                    "Bootstrap ingestion failed (attempt %d/%d): %s — retrying in %ds",
                    attempt, max_attempts, exc, wait,
                )
                await asyncio.sleep(wait)
            else:
                logger.error(
                    "Bootstrap ingestion failed after %d attempts: %s — "
                    "data will not be available until the next scheduled run.",
                    max_attempts, exc,
                )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting Prix à la Pompe API")
    es = get_es()

    asyncio.create_task(_bootstrap_if_empty(es))

    cron_parts = settings.ingestion_schedule.split()
    if len(cron_parts) == 5:
        minute, hour, day, month, day_of_week = cron_parts
        scheduler.add_job(
            run_ingestion,
            CronTrigger(
                minute=minute, hour=hour,
                day=day, month=month, day_of_week=day_of_week,
            ),
            args=[es],
            id="data_ingestion",
            replace_existing=True,
        )
    scheduler.start()
    logger.info("Scheduler started — schedule: %s", settings.ingestion_schedule)

    yield

    scheduler.shutdown(wait=False)
    await close_es()
    logger.info("Shutdown complete")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Prix à la Pompe",
    description="API pour trouver les stations-service les moins chères autour de vous",
    version="1.0.0",
    lifespan=lifespan,
    # Disable /docs and /redoc in production to reduce attack surface.
    # Remove these lines (or set to True) during development.
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Origins are loaded from CORS_ALLOWED_ORIGINS env var (comma-separated).
# Example: "http://localhost:4200,https://myprod.example.com"
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)


# ── Security headers middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next: Callable) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
    # Note: HSTS is intentionally omitted here — set it at the reverse proxy (Nginx) level.
    return response


# ── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next: Callable) -> Response:
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        '{"method": "%s", "path": "%s", "status": %d, "duration_ms": %.1f}',
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(stations.router,  prefix="/api/v1")
app.include_router(ingestion.router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}
