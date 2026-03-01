from __future__ import annotations

from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.v1.common import handle_operational_error, rollback_safely
from app.api.deps import get_db
from app.crud import subtask as subtask_crud
from app.schemas.subtask import SubTaskCreate, SubTaskReorder, SubTaskResponse, SubTaskUpdate

router = APIRouter()
_REORDER_IDS_FIELD = "sub_task_ids"


@router.post("", response_model=SubTaskResponse, status_code=status.HTTP_201_CREATED)
def create_subtask(task_id: uuid.UUID, payload: SubTaskCreate, db: Session = Depends(get_db)) -> Any:
    """Create a sub-task for the given task ID."""
    try:
        return subtask_crud.create_subtask(db, task_id=task_id, payload=payload)
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.patch("/{sub_task_id}/toggle", response_model=SubTaskResponse)
def toggle_subtask(task_id: uuid.UUID, sub_task_id: uuid.UUID, db: Session = Depends(get_db)) -> Any:
    """Toggle a sub-task completion flag."""
    try:
        return subtask_crud.toggle_subtask(db, task_id=task_id, sub_task_id=sub_task_id)
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.patch("/{sub_task_id}", response_model=SubTaskResponse)
def update_subtask(
    task_id: uuid.UUID,
    sub_task_id: uuid.UUID,
    payload: SubTaskUpdate,
    db: Session = Depends(get_db),
) -> Any:
    """Update a sub-task title."""
    try:
        return subtask_crud.update_subtask(db, task_id=task_id, sub_task_id=sub_task_id, payload=payload)
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.put("/reorder", response_model=list[SubTaskResponse])
def reorder_subtasks(
    task_id: uuid.UUID, payload: SubTaskReorder, db: Session = Depends(get_db)
) -> Any:
    """Reorder all sub-tasks for a task."""
    try:
        return subtask_crud.reorder_subtasks(db, task_id=task_id, payload=payload)
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        rollback_safely(db)
        detail = str(exc)
        field_prefix = f"{_REORDER_IDS_FIELD}: "
        if not detail.startswith(field_prefix):
            detail = f"{field_prefix}{detail}"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.delete("/{sub_task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(task_id: uuid.UUID, sub_task_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    """Delete a sub-task by ID."""
    try:
        subtask_crud.delete_subtask(db, task_id=task_id, sub_task_id=sub_task_id)
    except LookupError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)
