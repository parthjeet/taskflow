from __future__ import annotations

from pydantic import BaseModel, Field, field_validator



class BaseTitlePayload(BaseModel):
    """Shared title normalization and validation for title-bearing payloads."""

    title: str = Field(min_length=1, max_length=200)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("String should have at least 1 character")
        return stripped
