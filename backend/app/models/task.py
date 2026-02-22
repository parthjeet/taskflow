from __future__ import annotations

from datetime import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship, remote

from app.db.base import Base

TASK_STATUS_ENUM = sa.Enum("To Do", "In Progress", "Blocked", "Done", name="task_status")
TASK_PRIORITY_ENUM = sa.Enum("High", "Medium", "Low", name="task_priority")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(TASK_STATUS_ENUM, nullable=False)
    priority: Mapped[str] = mapped_column(TASK_PRIORITY_ENUM, nullable=False)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("members.id", name="fk_tasks_assignee_id", ondelete="SET NULL"),
        nullable=True,
    )
    assignee_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gear_id: Mapped[str | None] = mapped_column(String(4), nullable=True)
    blocking_reason: Mapped[str] = mapped_column(String, nullable=False, server_default=sa.text("''"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=sa.func.now())

    # Placeholder relationships until Epic 3 introduces real sub-task and daily-update models.
    # The join condition is intentionally unsatisfiable so API responses remain [] for this story.
    # Do not change lazy="noload" until Epic 3 replaces these placeholders with real models.
    sub_tasks: Mapped[list["Task"]] = relationship(
        "Task",
        primaryjoin=lambda: sa.and_(remote(Task.id) == foreign(Task.id), sa.text("1=0")),
        viewonly=True,
        lazy="noload",
        uselist=True,
        overlaps="sub_tasks,daily_updates",
    )
    daily_updates: Mapped[list["Task"]] = relationship(
        "Task",
        primaryjoin=lambda: sa.and_(remote(Task.id) == foreign(Task.id), sa.text("1=0")),
        viewonly=True,
        lazy="noload",
        uselist=True,
        overlaps="sub_tasks,daily_updates",
    )
