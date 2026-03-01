from __future__ import annotations

from app.core.security import (
    DatabaseCredentials,
    build_database_url,
    get_config_dir,
    get_runtime_database_url,
    load_encrypted_credentials,
    load_or_create_key,
    sanitize_sensitive_error_message,
    save_encrypted_credentials,
)


def _credentials(password: str = "topsecret") -> DatabaseCredentials:
    return DatabaseCredentials(
        host="127.0.0.1",
        port=5432,
        database="taskflow_db",
        username="taskflow_user",
        password=password,
    )


def test_get_config_dir_reads_taskflow_config_dir_env(monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("TASKFLOW_CONFIG_DIR", str(tmp_path))

    config_dir = get_config_dir()

    assert config_dir == tmp_path


def test_load_or_create_key_is_idempotent(monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("TASKFLOW_CONFIG_DIR", str(tmp_path))

    first = load_or_create_key(tmp_path)
    second = load_or_create_key(tmp_path)

    assert first == second
    assert len(first) > 0


def test_encrypted_credentials_round_trip(monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("TASKFLOW_CONFIG_DIR", str(tmp_path))
    creds = _credentials("roundtrip")

    save_encrypted_credentials(creds, tmp_path)
    loaded = load_encrypted_credentials(tmp_path)

    assert loaded == creds


def test_get_runtime_database_url_prefers_encrypted_credentials(monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("TASKFLOW_CONFIG_DIR", str(tmp_path))
    monkeypatch.setenv("TASKFLOW_DATABASE_URL", "postgresql+psycopg2://fallback:pw@localhost:5432/fallback")
    creds = _credentials("encrypted")
    save_encrypted_credentials(creds, tmp_path)

    runtime_url = get_runtime_database_url()

    assert runtime_url == build_database_url(creds)


def test_get_runtime_database_url_falls_back_to_environment(monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("TASKFLOW_CONFIG_DIR", str(tmp_path))
    monkeypatch.setenv("TASKFLOW_DATABASE_URL", "postgresql+psycopg2://user:pw@localhost:5432/from_env")

    runtime_url = get_runtime_database_url()

    assert runtime_url == "postgresql+psycopg2://user:pw@localhost:5432/from_env"


def test_sanitize_sensitive_error_message_masks_password() -> None:
    message = "FATAL: password=topsecret in postgresql://user:topsecret@localhost:5432/db"

    sanitized = sanitize_sensitive_error_message(message, "topsecret")

    assert "topsecret" not in sanitized
    assert "***" in sanitized
