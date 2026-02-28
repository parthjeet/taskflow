from __future__ import annotations

from datetime import datetime, timedelta, timezone
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import task as task_crud
from app.models.daily_update import DailyUpdate
from app.models.member import Member
from app.schemas.daily_update import DailyUpdateCreate, DailyUpdateUpdate

_EDIT_WINDOW_ERROR = "Updates can only be edited within 24 hours."
_DELETE_WINDOW_ERROR = "Updates can only be deleted within 24 hours."


def _resolve_author_name(db: Session, author_id: uuid.UUID) -> str:
    statement = select(Member.name).where(Member.id == author_id)
    author_name = db.execute(statement).scalar_one_or_none()
    if author_name is None:
        raise ValueError("Author not found")
    return author_name


def _get_daily_update(db: Session, task_id: uuid.UUID, update_id: uuid.UUID) -> DailyUpdate | None:
    statement = select(DailyUpdate).where(
        DailyUpdate.task_id == task_id,
        DailyUpdate.id == update_id,
    )
    return db.scalars(statement).first()


def _normalize_created_at(created_at: datetime) -> datetime:
    if created_at.tzinfo is None:
        return created_at.replace(tzinfo=timezone.utc)
    return created_at.astimezone(timezone.utc)


def _is_outside_edit_window(created_at: datetime, now: datetime) -> bool:
    normalized_created_at = _normalize_created_at(created_at)
    return (now - normalized_created_at) > timedelta(hours=24)


def create_daily_update(db: Session, *, task_id: uuid.UUID, payload: DailyUpdateCreate) -> DailyUpdate:
    """Create a daily update for a task and refresh the parent task timestamp."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    author_name = _resolve_author_name(db, payload.author_id)
    now = datetime.now(timezone.utc)
    daily_update = DailyUpdate(
        task_id=task_id,
        author_id=payload.author_id,
        author_name=author_name,
        content=payload.content,
        created_at=now,
        updated_at=now,
        edited=False,
    )
    db.add(daily_update)
    task_crud.touch_task_updated_at(db, task)
    db.commit()
    db.refresh(daily_update)
    return daily_update


def update_daily_update(
    db: Session,
    *,
    task_id: uuid.UUID,
    update_id: uuid.UUID,
    payload: DailyUpdateUpdate,
) -> DailyUpdate:
    """Update a daily update within the 24-hour edit window."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    daily_update = _get_daily_update(db, task_id, update_id)
    if daily_update is None:
        raise LookupError("Daily update not found")

    now = datetime.now(timezone.utc)
    if _is_outside_edit_window(daily_update.created_at, now):
        raise PermissionError(_EDIT_WINDOW_ERROR)

    daily_update.content = payload.content
    daily_update.edited = True
    daily_update.updated_at = now
    task_crud.touch_task_updated_at(db, task)
    db.commit()
    db.refresh(daily_update)
    return daily_update


def delete_daily_update(db: Session, *, task_id: uuid.UUID, update_id: uuid.UUID) -> None:
    """Delete a daily update within the 24-hour delete window."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    daily_update = _get_daily_update(db, task_id, update_id)
    if daily_update is None:
        raise LookupError("Daily update not found")

    now = datetime.now(timezone.utc)
    if _is_outside_edit_window(daily_update.created_at, now):
        raise PermissionError(_DELETE_WINDOW_ERROR)

    db.delete(daily_update)
    task_crud.touch_task_updated_at(db, task)
    db.commit()
