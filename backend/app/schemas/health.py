from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    error: str | None = None
