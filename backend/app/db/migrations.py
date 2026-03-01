from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.security import get_runtime_database_url


def run_migrations(database_url: str | None = None) -> None:
    backend_root = Path(__file__).resolve().parents[2]
    alembic_ini = backend_root / "alembic.ini"
    alembic_dir = backend_root / "alembic"

    alembic_config = Config(str(alembic_ini))
    alembic_config.set_main_option("script_location", str(alembic_dir))
    alembic_config.set_main_option("sqlalchemy.url", database_url or get_runtime_database_url())

    command.upgrade(alembic_config, "head")
