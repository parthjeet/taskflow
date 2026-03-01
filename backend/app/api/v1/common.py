from __future__ import annotations

from typing import NoReturn

from fastapi import HTTPException, status
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

_TRANSIENT_DB_ERROR = "Database connection lost. Please retry."


def rollback_safely(db: Session) -> None:
    """Try to rollback and suppress rollback failures on broken connections."""
    try:
        db.rollback()
    except Exception:
        # The original DB error is more actionable than rollback failures.
        pass


def handle_operational_error(db: Session, exc: OperationalError) -> NoReturn:
    """Rollback and raise a standardized transient database outage response."""
    rollback_safely(db)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_TRANSIENT_DB_ERROR,
        headers={"Retry-After": "5"},
    ) from exc
