from __future__ import annotations

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import main as main_module
from app.main import create_app


def _mark_ready(app) -> None:  # noqa: ANN001
    app.state.is_ready = True
    app.state.startup_error = None


def _mark_unready(app, message: str = "Database startup failed") -> None:  # noqa: ANN001
    app.state.is_ready = False
    app.state.startup_error = message


def _build_client(monkeypatch, startup_initializer) -> TestClient:  # noqa: ANN001
    monkeypatch.setattr(main_module, "initialize_backend_services", startup_initializer)
    app = create_app()
    startup_initializer(app)
    return TestClient(app)


def test_health_endpoint_returns_healthy_when_ready(monkeypatch) -> None:  # noqa: ANN001
    client = _build_client(monkeypatch, _mark_ready)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_health_endpoint_returns_unhealthy_when_startup_failed(monkeypatch) -> None:  # noqa: ANN001
    client = _build_client(monkeypatch, lambda app: _mark_unready(app, "Database startup failed: unavailable"))

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy", "error": "Database startup failed: unavailable"}


def test_health_endpoint_is_not_nested_under_api_prefix(monkeypatch) -> None:  # noqa: ANN001
    client = _build_client(monkeypatch, _mark_ready)

    response = client.get("/api/v1/health")

    assert response.status_code == 404


def test_http_exception_is_normalized_to_error_shape(monkeypatch) -> None:  # noqa: ANN001
    client = _build_client(monkeypatch, _mark_ready)
    app = client.app

    @app.get("/test-http-error")
    def test_http_error() -> None:
        raise HTTPException(status_code=404, detail="missing")

    response = client.get("/test-http-error")

    assert response.status_code == 404
    assert response.json() == {"error": "missing"}


def test_validation_error_is_normalized_to_error_shape(monkeypatch) -> None:  # noqa: ANN001
    client = _build_client(monkeypatch, _mark_ready)
    app = client.app

    @app.get("/test-validation/{item_id}")
    def test_validation(item_id: int) -> dict[str, int]:
        return {"item_id": item_id}

    response = client.get("/test-validation/not-an-int")

    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert isinstance(body["error"], str)
    assert body["error"]


def test_unhandled_exception_is_normalized_to_error_shape(monkeypatch) -> None:  # noqa: ANN001
    monkeypatch.setattr(main_module, "initialize_backend_services", _mark_ready)
    app = create_app()

    @app.get("/test-unhandled-error")
    def test_unhandled_error() -> None:
        raise RuntimeError("boom")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/test-unhandled-error")

    assert response.status_code == 500
    assert response.json() == {"error": "Internal server error"}


def test_initialize_backend_services_marks_ready_on_success(monkeypatch) -> None:  # noqa: ANN001
    app = create_app()
    monkeypatch.setattr(main_module, "run_migrations", lambda: None)
    monkeypatch.setattr(main_module, "reset_session_factory", lambda: None)
    monkeypatch.setattr(main_module, "verify_database_connection", lambda: None)

    main_module.initialize_backend_services(app)

    assert app.state.is_ready is True
    assert app.state.startup_error is None


def test_initialize_backend_services_marks_unready_on_failure(monkeypatch) -> None:  # noqa: ANN001
    app = create_app()
    monkeypatch.setattr(main_module, "run_migrations", lambda: (_ for _ in ()).throw(RuntimeError("not configured")))

    main_module.initialize_backend_services(app)

    assert app.state.is_ready is False
    assert app.state.startup_error.startswith("Database startup failed:")
