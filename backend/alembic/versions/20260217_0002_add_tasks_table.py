"""add tasks table

Revision ID: 20260217_0002
Revises: 20260216_0001
Create Date: 2026-02-17 00:02:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260217_0002"
down_revision = "20260216_0001"
branch_labels = None
depends_on = None


def _task_status_enum() -> sa.Enum:
    return sa.Enum("To Do", "In Progress", "Blocked", "Done", name="task_status")


def _task_priority_enum() -> sa.Enum:
    return sa.Enum("High", "Medium", "Low", name="task_priority")


def upgrade() -> None:
    bind = op.get_bind()
    task_status = _task_status_enum()
    task_priority = _task_priority_enum()

    if bind.dialect.name == "postgresql":
        task_status.create(bind, checkfirst=True)
        task_priority.create(bind, checkfirst=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("status", task_status, nullable=False),
        sa.Column("priority", task_priority, nullable=False),
        sa.Column("assignee_id", sa.Uuid(), nullable=True),
        sa.Column("assignee_name", sa.String(length=100), nullable=True),
        sa.Column("gear_id", sa.String(length=4), nullable=True),
        sa.Column("blocking_reason", sa.String(), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["assignee_id"],
            ["members.id"],
            name="fk_tasks_assignee_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_tasks_status", "tasks", ["status"])
    op.create_index("idx_tasks_assignee_id", "tasks", ["assignee_id"])


def downgrade() -> None:
    bind = op.get_bind()
    task_status = _task_status_enum()
    task_priority = _task_priority_enum()

    op.drop_index("idx_tasks_assignee_id", table_name="tasks")
    op.drop_index("idx_tasks_status", table_name="tasks")
    op.drop_table("tasks")

    if bind.dialect.name == "postgresql":
        task_priority.drop(bind, checkfirst=True)
        task_status.drop(bind, checkfirst=True)
