from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import get_runtime_database_url


def create_session_factory() -> sessionmaker[Session]:
    engine = create_engine(get_runtime_database_url(), future=True)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    return create_session_factory()
