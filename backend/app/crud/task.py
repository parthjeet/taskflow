from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
import uuid

import sqlalchemy as sa
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, noload, selectinload

from app.models.member import Member
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskPriority, TaskStatus, TaskUpdate

_ASSIGNEE_FILTER_ERROR = "Assignee filter must be a UUID or 'unassigned'"


def _escape_like_term(value: str) -> str:
    escaped = value.replace("\\", r"\\")
    escaped = escaped.replace("%", r"\%")
    escaped = escaped.replace("_", r"\_")
    return escaped


def _resolve_assignee_name(db: Session, assignee_id: uuid.UUID) -> str:
    statement = select(Member.name).where(Member.id == assignee_id)
    assignee_name = db.execute(statement).scalar_one_or_none()
    if assignee_name is None:
        raise ValueError("Assignee not found")
    return assignee_name


def _normalize_update_value(field: str, value: object) -> object:
    if field == "status" and isinstance(value, TaskStatus):
        return value.value
    if field == "priority" and isinstance(value, TaskPriority):
        return value.value
    return value


def touch_task_updated_at(db: Session, task: Task) -> None:
    """Refresh a task's update timestamp inside the current transaction."""
    task.updated_at = datetime.now(timezone.utc)


def list_tasks(
    db: Session,
    *,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    assignee: str | None = None,
    search: str | None = None,
    sort: Literal["updated", "priority", "status"] = "updated",
) -> list[Task]:
    # List view intentionally omits daily update payloads to avoid unbounded fan-out.
    statement = select(Task).options(selectinload(Task.sub_tasks), noload(Task.daily_updates))

    if status is not None:
        statement = statement.where(Task.status == status.value)

    if priority is not None:
        statement = statement.where(Task.priority == priority.value)

    if assignee is not None:
        if assignee == "unassigned":
            statement = statement.where(Task.assignee_id.is_(None))
        else:
            try:
                assignee_id = uuid.UUID(assignee)
            except ValueError as exc:
                raise ValueError(_ASSIGNEE_FILTER_ERROR) from exc
            statement = statement.where(Task.assignee_id == assignee_id)

    stripped_search = search.strip() if search is not None else None
    if stripped_search:
        search_term = f"%{_escape_like_term(stripped_search)}%"
        statement = statement.where(
            or_(
                Task.title.ilike(search_term, escape="\\"),
                Task.description.ilike(search_term, escape="\\"),
                Task.gear_id.ilike(search_term, escape="\\"),
            )
        )

    if sort == "priority":
        priority_order = sa.case(
            (Task.priority == "High", 1),
            (Task.priority == "Medium", 2),
            (Task.priority == "Low", 3),
            else_=99,
        )
        statement = statement.order_by(priority_order.asc(), Task.updated_at.desc())
    elif sort == "status":
        status_order = sa.case(
            (Task.status == "To Do", 1),
            (Task.status == "In Progress", 2),
            (Task.status == "Blocked", 3),
            (Task.status == "Done", 4),
            else_=99,
        )
        statement = statement.order_by(status_order.asc(), Task.updated_at.desc())
    elif sort == "updated":
        statement = statement.order_by(Task.updated_at.desc())
    else:
        raise ValueError(f"Invalid sort value: {sort!r}")

    return list(db.scalars(statement))


def get_task_by_id(
    db: Session,
    task_id: uuid.UUID,
    *,
    for_update: bool = False,
    include_sub_tasks: bool = True,
    include_daily_updates: bool = True,
) -> Task | None:
    statement = select(Task).where(Task.id == task_id)
    if include_sub_tasks:
        statement = statement.options(selectinload(Task.sub_tasks))
    if include_daily_updates:
        statement = statement.options(selectinload(Task.daily_updates))
    if for_update:
        statement = statement.with_for_update()
    return db.scalars(statement).first()


def create_task(db: Session, payload: TaskCreate) -> Task:
    blocking_reason = (payload.blocking_reason or "").strip()
    if payload.status != TaskStatus.BLOCKED:
        blocking_reason = ""

    assignee_name: str | None = None
    if payload.assignee_id is not None:
        assignee_name = _resolve_assignee_name(db, payload.assignee_id)

    task = Task(
        title=payload.title,
        description=payload.description,
        status=payload.status.value,
        priority=payload.priority.value,
        assignee_id=payload.assignee_id,
        assignee_name=assignee_name,
        gear_id=payload.gear_id,
        blocking_reason=blocking_reason,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    db.refresh(task, attribute_names=["sub_tasks", "daily_updates"])
    return task


def update_task(db: Session, task: Task, payload: TaskUpdate) -> Task:
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        db.refresh(task, attribute_names=["sub_tasks", "daily_updates"])
        return task

    current_status = TaskStatus(task.status)
    next_status_raw = update_data.get("status", task.status)
    if isinstance(next_status_raw, TaskStatus):
        next_status_raw = next_status_raw.value
    next_status = TaskStatus(next_status_raw)
    status_changed = "status" in update_data and next_status != current_status

    if "blocking_reason" in update_data and update_data["blocking_reason"] is None:
        update_data["blocking_reason"] = ""

    if next_status != TaskStatus.BLOCKED:
        update_data["blocking_reason"] = ""
    elif "blocking_reason" in update_data or status_changed:
        blocking_reason_raw = update_data.get("blocking_reason", task.blocking_reason)
        update_data["blocking_reason"] = (blocking_reason_raw or "").strip()

    if "assignee_id" in update_data:
        assignee_id = update_data["assignee_id"]
        if assignee_id is None:
            update_data["assignee_name"] = None
        else:
            update_data["assignee_name"] = _resolve_assignee_name(db, assignee_id)

    normalized_update_data = {
        field: _normalize_update_value(field, value)
        for field, value in update_data.items()
    }
    effective_update_data = {
        field: value
        for field, value in normalized_update_data.items()
        if getattr(task, field) != value
    }
    if not effective_update_data:
        db.refresh(task, attribute_names=["sub_tasks", "daily_updates"])
        return task

    for field, value in effective_update_data.items():
        setattr(task, field, value)

    touch_task_updated_at(db, task)
    db.commit()
    db.refresh(task)
    db.refresh(task, attribute_names=["sub_tasks", "daily_updates"])
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()
