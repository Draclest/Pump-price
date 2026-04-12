import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.api import stations, ingestion
from app.api.deps import get_es, close_es
from app.workers.ingestion import run_ingestion
from app.services.elasticsearch_client import INDEX_NAME

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", "message": "%(message)s"}',
)

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _bootstrap_if_empty(es) -> None:
    """Run a full ingestion at startup if the index is empty or missing."""
    try:
        exists = await es.indices.exists(index=INDEX_NAME)
        if not exists:
            logger.info("Index missing — running initial ingestion")
            await run_ingestion(es)
            return

        count_resp = await es.count(index=INDEX_NAME)
        doc_count = count_resp.get("count", 0)
        if doc_count == 0:
            logger.info("Index empty — running initial ingestion")
            await run_ingestion(es)
        else:
            logger.info("Index has %d documents — skipping initial ingestion", doc_count)
    except Exception as exc:
        logger.error("Bootstrap ingestion failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Prix à la Pompe API")
    es = get_es()

    # Bootstrap: run ingestion at startup if data is missing
    asyncio.create_task(_bootstrap_if_empty(es))

    # Scheduled cron ingestion
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
    logger.info(
        "Scheduler started — next ingestion: %s",
        settings.ingestion_schedule,
    )

    yield

    scheduler.shutdown(wait=False)
    await close_es()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Prix à la Pompe",
    description="API pour trouver les stations-service les moins chères autour de vous",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router,  prefix="/api/v1")
app.include_router(ingestion.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
