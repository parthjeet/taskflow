from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.security import (
    DatabaseCredentials,
    sanitize_sensitive_error_message,
    save_encrypted_credentials,
    test_database_connection,
)
from app.schemas.settings import ConnectionSaveResponse, ConnectionSettingsPayload, ConnectionTestResponse

router = APIRouter()


def _to_credentials(payload: ConnectionSettingsPayload) -> DatabaseCredentials:
    return DatabaseCredentials(
        host=payload.host,
        port=payload.port,
        database=payload.database,
        username=payload.username,
        password=payload.password,
    )


@router.post("/test-connection", response_model=ConnectionTestResponse)
def test_connection(payload: ConnectionSettingsPayload) -> ConnectionTestResponse:
    credentials = _to_credentials(payload)
    try:
        test_database_connection(credentials)
    except Exception as exc:  # noqa: BLE001
        reason = sanitize_sensitive_error_message(str(exc), credentials["password"])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection failed: {reason}",
        ) from exc

    return ConnectionTestResponse(status="ok")


@router.post("/save-connection", response_model=ConnectionSaveResponse)
def save_connection(payload: ConnectionSettingsPayload) -> ConnectionSaveResponse:
    credentials = _to_credentials(payload)
    try:
        save_encrypted_credentials(credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save connection settings") from exc

    return ConnectionSaveResponse(status="saved")
