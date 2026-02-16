from __future__ import annotations

from fastapi.testclient import TestClient

from app import main as main_module
from app.api.v1 import settings as settings_api
from app.core.security import load_encrypted_credentials
from app.main import create_app


def _mark_ready(app) -> None:  # noqa: ANN001
    app.state.is_ready = True
    app.state.startup_error = None


def _build_client(monkeypatch) -> TestClient:  # noqa: ANN001
    monkeypatch.setattr(main_module, "initialize_backend_services", _mark_ready)
    app = create_app()
    return TestClient(app)


def _payload(password: str = "secretpass123") -> dict[str, object]:
    return {
        "host": "localhost",
        "port": 5432,
        "database": "taskflow_db",
        "username": "taskflow_user",
        "password": password,
    }


def test_test_connection_returns_ok_without_persisting_credentials(monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("TASKFLOW_CONFIG_DIR", str(tmp_path))
    monkeypatch.setattr(settings_api, "test_database_connection", lambda _credentials: None)
    client = _build_client(monkeypatch)

    response = client.post("/api/v1/settings/test-connection", json=_payload())

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert not (tmp_path / "fernet.key").exists()
    assert not (tmp_path / "db_credentials.enc").exists()


def test_test_connection_returns_normalized_400_on_failure(monkeypatch) -> None:  # noqa: ANN001
    def _raise(_credentials) -> None:  # noqa: ANN001
        raise RuntimeError("authentication failed: password=secretpass123")

    monkeypatch.setattr(settings_api, "test_database_connection", _raise)
    client = _build_client(monkeypatch)

    response = client.post("/api/v1/settings/test-connection", json=_payload())

    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert body["error"].startswith("Connection failed:")
    assert "secretpass123" not in body["error"]


def test_save_connection_persists_encrypted_credentials(monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("TASKFLOW_CONFIG_DIR", str(tmp_path))
    client = _build_client(monkeypatch)

    response = client.post("/api/v1/settings/save-connection", json=_payload("supersafe"))

    assert response.status_code == 200
    assert response.json() == {"status": "saved"}

    encrypted_file = tmp_path / "db_credentials.enc"
    key_file = tmp_path / "fernet.key"
    assert encrypted_file.exists()
    assert key_file.exists()

    encrypted_contents = encrypted_file.read_bytes()
    assert b"supersafe" not in encrypted_contents

    loaded = load_encrypted_credentials(tmp_path)
    assert loaded is not None
    assert loaded["host"] == "localhost"
    assert loaded["port"] == 5432
    assert loaded["database"] == "taskflow_db"
    assert loaded["username"] == "taskflow_user"
    assert loaded["password"] == "supersafe"
