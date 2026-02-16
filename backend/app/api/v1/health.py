from fastapi import APIRouter, Request, Response, status

from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, response_model_exclude_none=True)
def health_check(request: Request, response: Response) -> HealthResponse:
    is_ready = bool(getattr(request.app.state, "is_ready", False))
    if is_ready:
        return HealthResponse(status="healthy")

    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    startup_error = getattr(request.app.state, "startup_error", None)
    message = startup_error or "Database not ready. Check connection settings."
    return HealthResponse(status="unhealthy", error=message)
