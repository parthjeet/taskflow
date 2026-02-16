from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import get_runtime_database_url


def create_session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        get_runtime_database_url(),
        future=True,
        pool_pre_ping=True,
        pool_recycle=3600,
    )
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    return create_session_factory()


def reset_session_factory() -> None:
    get_session_factory.cache_clear()


def verify_database_connection() -> None:
    session_factory = get_session_factory()
    with session_factory() as session:
        session.execute(text("SELECT 1"))
