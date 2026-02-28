from __future__ import annotations

from typing import Any
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud import task as task_crud
from app.models.subtask import SubTask
from app.schemas.subtask import SubTaskCreate, SubTaskReorder, SubTaskResponse, SubTaskUpdate

_MAX_SUBTASKS_PER_TASK = 20
_MAX_SUBTASKS_ERROR = "Maximum of 20 sub-tasks per task"
_REORDER_IDS_ERROR = "must include each existing sub-task exactly once"


def _serialize_subtask(subtask: SubTask) -> dict[str, Any]:
    return SubTaskResponse.model_validate(subtask, from_attributes=True).model_dump()


def _get_subtask(db: Session, task_id: uuid.UUID, sub_task_id: uuid.UUID) -> SubTask | None:
    statement = select(SubTask).where(SubTask.task_id == task_id, SubTask.id == sub_task_id)
    return db.scalars(statement).first()


def _list_subtasks_for_task(db: Session, task_id: uuid.UUID) -> list[SubTask]:
    statement = select(SubTask).where(SubTask.task_id == task_id).order_by(SubTask.position.asc())
    return list(db.scalars(statement))


def create_subtask(db: Session, *, task_id: uuid.UUID, payload: SubTaskCreate) -> SubTask:
    """Create a sub-task with contiguous next-position assignment and task touch."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    counts_statement = select(
        func.count(SubTask.id),
        func.coalesce(func.max(SubTask.position), -1) + 1,
    ).where(SubTask.task_id == task_id)
    current_count, next_position = db.execute(counts_statement).one()
    if current_count >= _MAX_SUBTASKS_PER_TASK:
        raise ValueError(_MAX_SUBTASKS_ERROR)

    subtask = SubTask(task_id=task_id, title=payload.title, position=next_position)
    db.add(subtask)
    task_crud.touch_task_updated_at(db, task)
    db.commit()
    db.refresh(subtask)
    return subtask


def toggle_subtask(db: Session, *, task_id: uuid.UUID, sub_task_id: uuid.UUID) -> SubTask:
    """Toggle a sub-task completion state and refresh parent task timestamp."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    subtask = _get_subtask(db, task_id, sub_task_id)
    if subtask is None:
        raise LookupError("Sub-task not found")

    subtask.completed = not subtask.completed
    task_crud.touch_task_updated_at(db, task)
    db.commit()
    db.refresh(subtask)
    return subtask


def update_subtask(db: Session, *, task_id: uuid.UUID, sub_task_id: uuid.UUID, payload: SubTaskUpdate) -> SubTask:
    """Update a sub-task title and refresh parent task timestamp."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    subtask = _get_subtask(db, task_id, sub_task_id)
    if subtask is None:
        raise LookupError("Sub-task not found")

    if payload.title == subtask.title:
        db.rollback()
        return subtask

    subtask.title = payload.title
    task_crud.touch_task_updated_at(db, task)
    db.commit()
    db.refresh(subtask)
    return subtask


def reorder_subtasks(db: Session, *, task_id: uuid.UUID, payload: SubTaskReorder) -> list[dict[str, Any]]:
    """Apply a full reorder payload and return subtasks in requested order."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    subtasks = _list_subtasks_for_task(db, task_id)
    existing_ids = [subtask.id for subtask in subtasks]
    requested_ids = payload.sub_task_ids

    if set(existing_ids) != set(requested_ids):
        raise ValueError(_REORDER_IDS_ERROR)

    if requested_ids == existing_ids:
        ordered_subtasks = [_serialize_subtask(subtask) for subtask in subtasks]
        db.rollback()
        return ordered_subtasks

    subtasks_by_id = {subtask.id: subtask for subtask in subtasks}
    # Move all rows out of the target 0..n-1 range first to avoid transient
    # collisions against the (task_id, position) unique constraint.
    # This runs inside one transaction, so READ COMMITTED readers never see
    # the offset positions before commit.
    offset = len(subtasks)
    for subtask in subtasks:
        subtask.position += offset
    db.flush()

    for position, sub_task_id in enumerate(requested_ids):
        subtask = subtasks_by_id[sub_task_id]
        subtask.position = position

    # Materialize response payload before commit so serialization does not
    # trigger per-row lazy loads after expire_on_commit.
    ordered_subtasks = [_serialize_subtask(subtasks_by_id[sub_task_id]) for sub_task_id in requested_ids]
    task_crud.touch_task_updated_at(db, task)
    db.commit()
    return ordered_subtasks


def delete_subtask(db: Session, *, task_id: uuid.UUID, sub_task_id: uuid.UUID) -> None:
    """Delete a sub-task and compact remaining positions without gaps."""

    task = task_crud.get_task_by_id(
        db,
        task_id,
        for_update=True,
        include_sub_tasks=False,
        include_daily_updates=False,
    )
    if task is None:
        raise LookupError("Task not found")

    subtasks = _list_subtasks_for_task(db, task_id)
    subtask = next((item for item in subtasks if item.id == sub_task_id), None)
    if subtask is None:
        raise LookupError("Sub-task not found")

    db.delete(subtask)
    db.flush()

    # Keep positions gapless after deletion so future inserts remain contiguous.
    remaining_subtasks = [item for item in subtasks if item.id != sub_task_id]
    # Move rows out of the target range first to avoid transient collisions
    # against the (task_id, position) unique constraint during compaction.
    offset = len(subtasks)
    for remaining_subtask in remaining_subtasks:
        remaining_subtask.position += offset
    db.flush()

    for position, remaining_subtask in enumerate(remaining_subtasks):
        remaining_subtask.position = position

    task_crud.touch_task_updated_at(db, task)
    db.commit()
