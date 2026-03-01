"""add daily_updates table

Revision ID: 20260228_0006
Revises: 20260227_0005
Create Date: 2026-02-28 00:06:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260228_0006"
down_revision = "20260227_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_updates",
        sa.Column("id", sa.Uuid(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("author_name", sa.String(length=100), nullable=False),
        sa.Column("content", sa.String(length=1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("edited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            name="fk_daily_updates_task_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["members.id"],
            name="fk_daily_updates_author_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_daily_updates_task_id", "daily_updates", ["task_id"])


def downgrade() -> None:
    op.drop_index("idx_daily_updates_task_id", table_name="daily_updates")
    op.drop_table("daily_updates")
