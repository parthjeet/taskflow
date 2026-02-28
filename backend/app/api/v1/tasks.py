from __future__ import annotations

import re
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.v1.common import handle_operational_error, rollback_safely
from app.api.deps import get_db
from app.crud import task as task_crud
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskPriority, TaskResponse, TaskStatus, TaskUpdate

router = APIRouter()

_GEAR_ID_PATTERN = re.compile(r"\d{4}")
_GEAR_ID_ERROR = "GEAR ID must be exactly 4 digits"
_BLOCKED_REASON_ERROR = "Blocking reason is required when status is Blocked"


def _validate_gear_id(gear_id: str | None) -> None:
    if gear_id is None:
        return
    if not _GEAR_ID_PATTERN.fullmatch(gear_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_GEAR_ID_ERROR)


def _validate_blocked_status(status_value: str, blocking_reason: str | None) -> None:
    if status_value != TaskStatus.BLOCKED.value:
        return
    if not (blocking_reason or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_BLOCKED_REASON_ERROR)


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    priority_filter: TaskPriority | None = Query(default=None, alias="priority"),
    assignee: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort: Literal["updated", "priority", "status"] = Query(default="updated"),
    db: Session = Depends(get_db),
) -> list[Task]:
    try:
        return task_crud.list_tasks(
            db,
            status=status_filter,
            priority=priority_filter,
            assignee=assignee,
            search=search,
            sort=sort,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: uuid.UUID, db: Session = Depends(get_db)) -> Task:
    try:
        task = task_crud.get_task_by_id(db, task_id)
    except OperationalError as exc:
        handle_operational_error(db, exc)

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)) -> Task:
    _validate_gear_id(payload.gear_id)
    _validate_blocked_status(payload.status.value, payload.blocking_reason)

    try:
        return task_crud.create_task(db, payload)
    except ValueError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: uuid.UUID, payload: TaskUpdate, db: Session = Depends(get_db)) -> Task:
    _validate_gear_id(payload.gear_id)

    try:
        task = task_crud.get_task_by_id(db, task_id, for_update=True)
    except OperationalError as exc:
        handle_operational_error(db, exc)

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    resolved_status = payload.status.value if payload.status is not None else task.status
    resolved_blocking_reason = payload.blocking_reason if "blocking_reason" in payload.model_fields_set else task.blocking_reason
    _validate_blocked_status(resolved_status, resolved_blocking_reason)

    try:
        return task_crud.update_task(db, task, payload)
    except ValueError as exc:
        rollback_safely(db)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OperationalError as exc:
        handle_operational_error(db, exc)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    try:
        task = task_crud.get_task_by_id(db, task_id, for_update=True, include_sub_tasks=False)
    except OperationalError as exc:
        handle_operational_error(db, exc)

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    try:
        task_crud.delete_task(db, task)
    except OperationalError as exc:
        handle_operational_error(db, exc)
