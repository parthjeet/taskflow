from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import time

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.api.v1.api import api_router
from app.api.v1.health import router as health_router
from app.core.config import settings
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.security import sanitize_sensitive_error_message
from app.db.migrations import run_migrations
from app.db.session import reset_session_factory, verify_database_connection

_TRANSIENT_ERROR_HINTS = (
    "connection refused",
    "could not connect",
    "timeout",
    "temporarily unavailable",
    "connection reset",
)


def _is_transient_connection_error(exc: Exception) -> bool:
    if isinstance(exc, OperationalError):
        return True

    message = str(exc).lower()
    return any(hint in message for hint in _TRANSIENT_ERROR_HINTS)


def initialize_backend_services(app: FastAPI) -> None:
    if getattr(app.state, "testing_session_factory", None) is not None:
        app.state.is_ready = True
        app.state.startup_error = None
        return

    attempts = max(1, settings.db_startup_retry_attempts)
    backoff_seconds = max(0.0, settings.db_startup_retry_backoff_seconds)

    last_exception: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            run_migrations()
            reset_session_factory()
            verify_database_connection()
            app.state.is_ready = True
            app.state.startup_error = None
            return
        except Exception as exc:  # noqa: BLE001
            last_exception = exc
            if attempt == attempts or not _is_transient_connection_error(exc):
                break
            time.sleep(backoff_seconds * attempt)

    app.state.is_ready = False
    if last_exception is None:
        app.state.startup_error = "Database startup failed. Check connection settings."
        return

    reason = sanitize_sensitive_error_message(str(last_exception))
    app.state.startup_error = f"Database startup failed: {reason}"


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    initialize_backend_services(app)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_title, lifespan=_lifespan)
    app.state.is_ready = False
    app.state.startup_error = "Database startup has not completed"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost"],
        allow_origin_regex=r"^http://localhost(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Root-level health endpoint for Electron startup polling.
    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
