from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint_returns_healthy():
    app = create_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_health_endpoint_is_not_nested_under_api_prefix():
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 404


def test_http_exception_is_normalized_to_error_shape():
    app = create_app()

    @app.get("/test-http-error")
    def test_http_error() -> None:
        raise HTTPException(status_code=404, detail="missing")

    client = TestClient(app)
    response = client.get("/test-http-error")

    assert response.status_code == 404
    assert response.json() == {"error": "missing"}


def test_validation_error_is_normalized_to_error_shape():
    app = create_app()

    @app.get("/test-validation/{item_id}")
    def test_validation(item_id: int) -> dict[str, int]:
        return {"item_id": item_id}

    client = TestClient(app)
    response = client.get("/test-validation/not-an-int")

    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert isinstance(body["error"], str)
    assert body["error"]


def test_unhandled_exception_is_normalized_to_error_shape():
    app = create_app()

    @app.get("/test-unhandled-error")
    def test_unhandled_error() -> None:
        raise RuntimeError("boom")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/test-unhandled-error")

    assert response.status_code == 500
    assert response.json() == {"error": "Internal server error"}
