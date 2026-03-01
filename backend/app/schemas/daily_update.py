from __future__ import annotations

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DailyUpdateCreate(BaseModel):
    author_id: uuid.UUID
    content: str = Field(min_length=1, max_length=1000)

    @field_validator("content", mode="before")
    @classmethod
    def validate_content(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("String should have at least 1 character")
        return stripped


class DailyUpdateUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)

    @field_validator("content", mode="before")
    @classmethod
    def validate_content(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("String should have at least 1 character")
        return stripped


class DailyUpdateResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str
    content: str
    created_at: datetime
    updated_at: datetime
    edited: bool

    model_config = ConfigDict(from_attributes=True)
