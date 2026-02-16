"""Import models here so Alembic autogenerate can discover metadata."""

from app.db.base import Base
from app.models.member import Member

__all__ = ["Base", "Member"]
