from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator


class TaskStatus(str, Enum):
    TO_DO = "To Do"
    IN_PROGRESS = "In Progress"
    BLOCKED = "Blocked"
    DONE = "Done"


class TaskPriority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: TaskStatus
    priority: TaskPriority
    assignee_id: uuid.UUID | None = None
    gear_id: str | None = None
    blocking_reason: str = ""

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("title: String should have at least 1 character")
        return stripped


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: uuid.UUID | None = None
    gear_id: str | None = None
    blocking_reason: str | None = None

    @field_validator("title", "status", "priority", mode="before")
    @classmethod
    def reject_explicit_null(cls, value: object, info: ValidationInfo) -> object:
        if value is None:
            raise ValueError(f"{info.field_name}: field cannot be null")
        return value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("title: String should have at least 1 character")
        return stripped


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    assignee_id: uuid.UUID | None
    assignee_name: str | None
    gear_id: str | None
    blocking_reason: str
    sub_tasks: list[Any] = Field(default_factory=list)
    daily_updates: list[Any] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
