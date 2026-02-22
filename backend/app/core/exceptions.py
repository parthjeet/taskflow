from __future__ import annotations

import logging

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _stringify_validation_error(exc: RequestValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "Validation error"

    first_error = errors[0]
    raw_location = [str(item) for item in first_error.get("loc", [])]
    if raw_location and raw_location[0] == "body":
        raw_location = raw_location[1:]
    location = ".".join(raw_location)

    message = str(first_error.get("msg", "Validation error"))
    value_error_prefix = "Value error, "
    if message.startswith(value_error_prefix):
        message = message[len(value_error_prefix):]
    if location:
        location_prefix = f"{location}: "
        if message.startswith(location_prefix):
            message = message[len(location_prefix):]
    return f"{location}: {message}" if location else str(message)


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, str):
        message = detail
    else:
        # Fallback for structured error details (e.g. dicts/lists)
        try:
            import json
            message = json.dumps(detail)
        except (TypeError, ValueError):
            message = str(detail)

    return JSONResponse(status_code=exc.status_code, content={"error": message})


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": _stringify_validation_error(exc)})


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception")
    return JSONResponse(status_code=500, content={"error": "Internal server error"})
