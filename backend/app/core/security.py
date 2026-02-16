"""Credential and migration URL helpers.

Story 1.1 wires migration URL lookup to runtime config. Full encrypted file handling is
implemented in Story 1.3.
"""

from __future__ import annotations

import os



def get_runtime_database_url() -> str:
    database_url = os.getenv("TASKFLOW_DATABASE_URL")
    if not database_url:
        raise RuntimeError("TASKFLOW_DATABASE_URL is not set")
    return database_url
