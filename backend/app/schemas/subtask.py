from __future__ import annotations

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.base import BaseTitlePayload


class SubTaskCreate(BaseTitlePayload):
    """Payload for creating a sub-task."""

    pass


class SubTaskUpdate(BaseTitlePayload):
    """Payload for updating a sub-task title."""

    pass


class SubTaskReorder(BaseModel):
    """Payload containing the desired ordered list of sub-task IDs."""

    sub_task_ids: list[uuid.UUID] = Field(min_length=1, max_length=20)

    @field_validator("sub_task_ids")
    @classmethod
    def validate_unique_sub_task_ids(cls, value: list[uuid.UUID]) -> list[uuid.UUID]:
        if len(set(value)) != len(value):
            raise ValueError("must not contain duplicates")
        return value


class SubTaskResponse(BaseModel):
    """Serialized sub-task response shape returned by the API."""

    id: uuid.UUID
    task_id: uuid.UUID
    title: str
    completed: bool
    position: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
