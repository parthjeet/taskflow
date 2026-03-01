from __future__ import annotations

import re
import uuid
from email.utils import parseaddr

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _is_valid_email(value: str) -> bool:
    parsed = parseaddr(value)[1]
    return bool(_EMAIL_PATTERN.match(parsed))


class MemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
    active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name: String should have at least 1 character")
        return stripped

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        candidate = value.strip()
        if not _is_valid_email(candidate):
            raise ValueError("email: value is not a valid email address")
        return candidate


class MemberUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = None
    active: bool | None = None

    @field_validator("name", "email", mode="before")
    @classmethod
    def reject_explicit_null(cls, value: object, info: ValidationInfo) -> object:
        if value is None:
            raise ValueError(f"{info.field_name}: field cannot be null")
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("name: String should have at least 1 character")
        return stripped

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        candidate = value.strip()
        if not _is_valid_email(candidate):
            raise ValueError("email: value is not a valid email address")
        return candidate


class MemberResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    active: bool

    model_config = ConfigDict(from_attributes=True)
