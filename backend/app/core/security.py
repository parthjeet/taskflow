"""Credential encryption and runtime database URL helpers."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import TypedDict
from urllib.parse import quote_plus

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import create_engine, text

from app.core.config import settings

_DEFAULT_CONFIG_DIR_NAME = ".taskflow"
_FERNET_KEY_FILE = "fernet.key"
_CREDENTIALS_FILE = "db_credentials.enc"
_REQUIRED_CREDENTIAL_KEYS = {"host", "port", "database", "username", "password"}
_CONNECTION_URL_PASSWORD_PATTERN = re.compile(r"://([^:/]+):([^@]+)@")
_KEY_VALUE_PASSWORD_PATTERN = re.compile(r"(password\s*=\s*)([^,\s]+)", re.IGNORECASE)


class DatabaseCredentials(TypedDict):
    host: str
    port: int
    database: str
    username: str
    password: str


def get_config_dir() -> Path:
    configured = os.getenv("TASKFLOW_CONFIG_DIR") or settings.config_dir
    if configured:
        return Path(configured).expanduser()
    return Path.home() / _DEFAULT_CONFIG_DIR_NAME


def get_fernet_key_path(config_dir: Path | None = None) -> Path:
    base_dir = config_dir or get_config_dir()
    return base_dir / _FERNET_KEY_FILE


def get_credentials_path(config_dir: Path | None = None) -> Path:
    base_dir = config_dir or get_config_dir()
    return base_dir / _CREDENTIALS_FILE


def _ensure_config_dir(config_dir: Path) -> None:
    config_dir.mkdir(parents=True, exist_ok=True)


def load_or_create_key(config_dir: Path | None = None) -> bytes:
    key_path = get_fernet_key_path(config_dir)
    _ensure_config_dir(key_path.parent)

    if key_path.exists():
        return key_path.read_bytes()

    key = Fernet.generate_key()
    key_path.write_bytes(key)
    return key


def _get_fernet(config_dir: Path | None = None) -> Fernet:
    return Fernet(load_or_create_key(config_dir))


def sanitize_sensitive_error_message(message: str, password: str | None = None) -> str:
    sanitized = message.strip()
    if password:
        sanitized = sanitized.replace(password, "***")

    sanitized = _CONNECTION_URL_PASSWORD_PATTERN.sub(r"://\1:***@", sanitized)
    sanitized = _KEY_VALUE_PASSWORD_PATTERN.sub(r"\1***", sanitized)
    if not sanitized:
        return "Unknown connection error"
    if len(sanitized) > 300:
        return f"{sanitized[:297]}..."
    return sanitized


def save_encrypted_credentials(credentials: DatabaseCredentials, config_dir: Path | None = None) -> None:
    credential_path = get_credentials_path(config_dir)
    _ensure_config_dir(credential_path.parent)

    payload = json.dumps(credentials).encode("utf-8")
    encrypted = _get_fernet(config_dir).encrypt(payload)
    credential_path.write_bytes(encrypted)


def load_encrypted_credentials(config_dir: Path | None = None) -> DatabaseCredentials | None:
    credential_path = get_credentials_path(config_dir)
    if not credential_path.exists():
        return None

    token = credential_path.read_bytes()
    try:
        raw = _get_fernet(config_dir).decrypt(token)
    except InvalidToken as exc:
        raise RuntimeError("Encrypted database credentials are invalid or corrupted") from exc

    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("Encrypted database credentials payload is invalid") from exc
    if not isinstance(data, dict):
        raise RuntimeError("Encrypted database credentials payload is invalid")
    if not _REQUIRED_CREDENTIAL_KEYS.issubset(data.keys()):
        raise RuntimeError("Encrypted database credentials payload is incomplete")

    try:
        return DatabaseCredentials(
            host=str(data["host"]),
            port=int(data["port"]),
            database=str(data["database"]),
            username=str(data["username"]),
            password=str(data["password"]),
        )
    except (TypeError, ValueError) as exc:
        raise RuntimeError("Encrypted database credentials payload is invalid") from exc


def build_database_url(credentials: DatabaseCredentials) -> str:
    username = quote_plus(credentials["username"])
    password = quote_plus(credentials["password"])
    host = credentials["host"]
    port = credentials["port"]
    database = credentials["database"]
    return f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}"


def get_runtime_database_url() -> str:
    encrypted_credentials = load_encrypted_credentials()
    if encrypted_credentials:
        return build_database_url(encrypted_credentials)

    database_url = os.getenv("TASKFLOW_DATABASE_URL") or settings.database_url
    if database_url:
        return database_url

    raise RuntimeError("Database connection is not configured. Save connection settings first.")


def test_database_connection(credentials: DatabaseCredentials) -> None:
    database_url = build_database_url(credentials)
    engine = create_engine(database_url, future=True, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    finally:
        engine.dispose()
