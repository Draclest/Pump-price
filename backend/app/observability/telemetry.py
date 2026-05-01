"""
OpenTelemetry setup — traces, metrics, logs via OTLP HTTP.

Activated only when OTEL_ENABLED=true in .env.
When disabled, all calls are no-ops and zero overhead is added.
"""

import logging
from typing import Optional

from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logger = logging.getLogger(__name__)

_initialized = False


def _parse_headers(raw: str) -> dict[str, str]:
    """Parse 'Key=Value,Key2=Value2' into a dict."""
    result: dict[str, str] = {}
    for part in raw.split(","):
        part = part.strip()
        if "=" in part:
            k, _, v = part.partition("=")
            result[k.strip()] = v.strip()
    return result


def setup_telemetry(
    enabled: bool,
    service_name: str,
    otlp_endpoint: str,
    otlp_headers_raw: str,
    exporter_type: str = "otlp",
) -> Optional[logging.Handler]:
    """
    Configure OTel SDK.  Returns a LoggingHandler to attach to the root logger,
    or None when telemetry is disabled.

    Call this once at application startup before the FastAPI app is created.
    """
    global _initialized
    if not enabled:
        logger.info("OpenTelemetry disabled (OTEL_ENABLED=false)")
        return None
    if _initialized:
        return None

    headers = _parse_headers(otlp_headers_raw)
    resource = Resource.create({"service.name": service_name})

    # ── Traces ────────────────────────────────────────────────────────────────
    tracer_provider = TracerProvider(resource=resource)
    if exporter_type == "console":
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter
        span_exporter = ConsoleSpanExporter()
    else:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        span_exporter = OTLPSpanExporter(
            endpoint=f"{otlp_endpoint.rstrip('/')}/v1/traces",
            headers=headers,
        )
    tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(tracer_provider)

    # ── Metrics ───────────────────────────────────────────────────────────────
    if exporter_type == "console":
        from opentelemetry.sdk.metrics.export import ConsoleMetricExporter
        metric_exporter = ConsoleMetricExporter()
    else:
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        metric_exporter = OTLPMetricExporter(
            endpoint=f"{otlp_endpoint.rstrip('/')}/v1/metrics",
            headers=headers,
        )
    metric_reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=30_000)
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # ── Logs ──────────────────────────────────────────────────────────────────
    if exporter_type == "console":
        from opentelemetry.sdk._logs.export import ConsoleLogExporter
        log_exporter = ConsoleLogExporter()
    else:
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
        log_exporter = OTLPLogExporter(
            endpoint=f"{otlp_endpoint.rstrip('/')}/v1/logs",
            headers=headers,
        )
    log_provider = LoggerProvider(resource=resource)
    log_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
    set_logger_provider(log_provider)
    otel_handler = LoggingHandler(level=logging.NOTSET, logger_provider=log_provider)

    _initialized = True
    logger.info(
        "OpenTelemetry initialized — service=%s exporter=%s endpoint=%s",
        service_name, exporter_type, otlp_endpoint if exporter_type != "console" else "console",
    )
    return otel_handler


def instrument_fastapi(app) -> None:
    """Attach FastAPI auto-instrumentation (traces on every route)."""
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
    except ImportError:
        logger.warning("opentelemetry-instrumentation-fastapi not installed — route tracing disabled")
