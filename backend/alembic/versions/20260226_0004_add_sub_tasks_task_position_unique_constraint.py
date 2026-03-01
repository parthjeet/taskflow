"""add unique task_id/position constraint on sub_tasks

Revision ID: 20260226_0004
Revises: 20260226_0003
Create Date: 2026-02-26 00:04:00
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260226_0004"
down_revision = "20260226_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_sub_tasks_task_id_position",
        "sub_tasks",
        ["task_id", "position"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_sub_tasks_task_id_position", "sub_tasks", type_="unique")
