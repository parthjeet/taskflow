"""drop redundant sub_tasks task_id index

Revision ID: 20260227_0005
Revises: 20260226_0004
Create Date: 2026-02-27 00:05:00
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260227_0005"
down_revision = "20260226_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("idx_sub_tasks_task_id", table_name="sub_tasks")


def downgrade() -> None:
    op.create_index("idx_sub_tasks_task_id", "sub_tasks", ["task_id"])
