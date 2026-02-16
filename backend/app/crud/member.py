from __future__ import annotations

import uuid

from sqlalchemy import Uuid, column, func, inspect, select, table
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate

_TASKS_TABLE = table("tasks", column("assignee_id", Uuid))
_POSTGRES_UNDEFINED_TABLE = "42P01"
_POSTGRES_UNDEFINED_COLUMN = "42703"


def _is_missing_tasks_schema_error(exc: DBAPIError) -> bool:
    orig = getattr(exc, "orig", None)
    sqlstate = getattr(orig, "pgcode", None) or getattr(orig, "sqlstate", None)
    return sqlstate in {_POSTGRES_UNDEFINED_TABLE, _POSTGRES_UNDEFINED_COLUMN}


def _has_tasks_assignment_schema(db: Session) -> bool:
    bind = db.get_bind()
    if bind is None:
        return True

    if bind.dialect.name != "sqlite":
        return True

    inspector = inspect(bind)
    if not inspector.has_table("tasks"):
        return False

    columns = {column_data["name"] for column_data in inspector.get_columns("tasks")}
    return "assignee_id" in columns


def list_members(db: Session) -> list[Member]:
    statement = select(Member).order_by(Member.name.asc())
    return list(db.scalars(statement))


def get_member(db: Session, member_id: uuid.UUID) -> Member | None:
    statement = select(Member).where(Member.id == member_id)
    return db.scalars(statement).first()


def get_member_by_email(db: Session, email: str) -> Member | None:
    statement = select(Member).where(Member.email == email)
    return db.scalars(statement).first()


def create_member(db: Session, payload: MemberCreate) -> Member:
    member = Member(**payload.model_dump())
    db.add(member)
    db.commit()
    statement = select(Member).where(Member.email == payload.email)
    created_member = db.scalars(statement).first()
    if created_member is None:
        raise RuntimeError("Member creation succeeded but row could not be reloaded")
    return created_member


def update_member(db: Session, member: Member, payload: MemberUpdate) -> Member:
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return member

    for field, value in update_data.items():
        setattr(member, field, value)

    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def count_assigned_tasks(db: Session, member_id: uuid.UUID) -> int:
    if not _has_tasks_assignment_schema(db):
        return 0

    try:
        statement = (
            select(func.count())
            .select_from(_TASKS_TABLE)
            .where(_TASKS_TABLE.c.assignee_id == member_id)
        )
        return int(db.execute(statement).scalar_one())
    except DBAPIError as exc:
        if _is_missing_tasks_schema_error(exc):
            db.rollback()
            return 0
        raise


def delete_member(db: Session, member: Member) -> None:
    db.delete(member)
    db.commit()
