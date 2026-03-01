from __future__ import annotations

from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.api.v1.common import handle_operational_error, rollback_safely
from app.api.deps import get_db
from app.crud import daily_update as daily_update_crud
from app.schemas.daily_update import DailyUpdateCreate, DailyUpdateResponse, DailyUpdateUpdate

router = APIRouter()


@router.post("", response_model=DailyUpdateResponse, status_code=status.HTTP_201_CREATED)
def create_daily_update(task_id: uuid.UUID, payload: DailyUpdateCreate, db: Session = Depends(get_db)) -> Any:
    """Create a daily update for a task."""
    try:
        return daily_update_crud.create_daily_update(db, task_id=task_id, payload=payload)
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except IntegrityError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Author no longer exists") from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.patch("/{update_id}", response_model=DailyUpdateResponse)
def update_daily_update(
    task_id: uuid.UUID,
    update_id: uuid.UUID,
    payload: DailyUpdateUpdate,
    db: Session = Depends(get_db),
) -> Any:
    """Update a daily update for a task."""
    try:
        return daily_update_crud.update_daily_update(
            db,
            task_id=task_id,
            update_id=update_id,
            payload=payload,
        )
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.delete("/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_daily_update(task_id: uuid.UUID, update_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    """Delete a daily update for a task."""
    try:
        daily_update_crud.delete_daily_update(db, task_id=task_id, update_id=update_id)
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)
