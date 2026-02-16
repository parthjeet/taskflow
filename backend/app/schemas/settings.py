from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ConnectionSettingsPayload(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    database: str = Field(min_length=1, max_length=255)
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)

    @field_validator("host", "database", "username", "password")
    @classmethod
    def validate_non_empty_trimmed(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("field cannot be blank")
        return stripped


class ConnectionTestResponse(BaseModel):
    status: Literal["ok"]


class ConnectionSaveResponse(BaseModel):
    status: Literal["saved"]
