# Story 1.1: Initialize Backend Project & Health Endpoint

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the backend project initialized with FastAPI, proper project structure, CORS configuration, normalized error handling, and a `/health` endpoint,
so that all future backend stories have a consistent foundation to build on and Electron can poll readiness.

## Acceptance Criteria

1. Initialize `backend/` using `uv` with Python 3.12+ and dependencies for FastAPI, SQLAlchemy 2.x, Pydantic v2 + `pydantic-settings`, Alembic, `psycopg2-binary`, `uvicorn[standard]`, `cryptography`, and dev dependencies `pytest` + `httpx`.
2. Backend structure exists and matches architecture: `app/main.py`, `app/api/`, `app/core/`, `app/crud/`, `app/db/`, `app/models/`, `app/schemas/`, `alembic/`, `tests/`.
3. `app/main.py` creates FastAPI app with title `TaskFlow API` and API prefix `/api/v1`; CORS allows Electron renderer (`http://localhost:*`); app binds to `127.0.0.1`.
4. `GET /health` exists at root level (not `/api/v1`) and returns `200` with `{"status": "healthy"}`.
5. API errors are normalized to `{"error": "Human-readable message"}` via handlers for `RequestValidationError`, `HTTPException`, and generic `Exception`.
6. Alembic is configured with model metadata and runtime URL override from decrypted credentials.
7. Root-level `pyinstaller_entrypoint.py` calls `multiprocessing.freeze_support()` before app startup.

## Tasks / Subtasks

- [x] Create backend scaffold with `uv` and dependency constraints (AC: 1)
  - [x] Run `uv init` in new `backend/` directory with Python 3.12 target
  - [x] Add runtime dependencies and dev dependencies in `backend/pyproject.toml`
  - [x] Add minimal scripts for dev server and tests
- [x] Build backend directory skeleton and package initialization files (AC: 2)
  - [x] Create `app/api/v1`, `app/core`, `app/crud`, `app/db`, `app/models`, `app/schemas`, `alembic`, `tests`
  - [x] Add required `__init__.py` files to Python packages
- [x] Implement base FastAPI app initialization (AC: 3)
  - [x] Create `app/main.py` with `FastAPI(title="TaskFlow API")`
  - [x] Mount versioned router prefix `/api/v1` for future endpoints
  - [x] Configure CORS middleware for localhost renderer origins
  - [x] Ensure startup host target is `127.0.0.1` in run instructions
- [x] Implement root health endpoint and schema (AC: 4)
  - [x] Create `app/api/v1/health.py` (or root router module) exposing `GET /health`
  - [x] Return exact JSON payload `{"status": "healthy"}`
- [x] Implement normalized exception handling (AC: 5)
  - [x] Create `app/core/exceptions.py` handlers for `HTTPException`, `RequestValidationError`, and generic `Exception`
  - [x] Register handlers in `app/main.py`
  - [x] Confirm no default FastAPI `{"detail": ...}` leaks on handled paths
- [x] Configure Alembic runtime integration (AC: 6)
  - [x] Wire `alembic.ini` + `alembic/env.py` to `app.models` metadata
  - [x] Add runtime URL override hook so URL comes from decrypted settings, not static ini
- [x] Add PyInstaller entrypoint for frozen execution (AC: 7)
  - [x] Create root `pyinstaller_entrypoint.py`
  - [x] Call `multiprocessing.freeze_support()` before launching app
- [x] Add foundation tests and smoke checks (AC: 3, 4, 5)
  - [x] Add `tests/test_health.py` for status code and exact response body
  - [x] Add tests for normalized error format from exception handlers
  - [x] Verify app startup and route registration via `pytest`

## Dev Notes

### Developer Context

- This story establishes the backend baseline for all upcoming stories; prioritize clean scaffolding over feature breadth.
- Team boundary rule applies: backend/electron changes only. Do not edit `taskflow-ui/` in this story.
- API contract naming rules start now (snake_case fields, `/members` naming, PATCH semantics).
- Keep implementation production-friendly for Windows enterprise machines without admin privileges.

### Technical Requirements

- Use `uv` tooling (`uv init`, `uv add`, `uv run`), not `pip`, `poetry`, or `conda`.
- Keep all backend network binding local (`127.0.0.1`) to match desktop threat model.
- Implement `/health` outside `/api/v1` because Electron startup polling targets root endpoint.
- Register exception handlers centrally so every future endpoint inherits normalized error shape.
- Prepare Alembic for programmatic startup migrations; do not hardcode plaintext DB URL in committed files.

### Architecture Compliance

- Follow canonical backend layout from architecture doc.
- Preserve API_CONTRACT-driven conventions even if this story only ships health and foundation.
- Ensure error payload contract is always `{"error": "..."}` for handled exceptions.
- Keep settings and credential strategy aligned with upcoming Epic 1 security stories (`core/security.py`, backend-owned config).

### Library / Framework Requirements

- Keep acceptance-criteria minimums, but lock to current stable releases compatible with Python 3.12.
- Suggested baseline constraints for `pyproject.toml` (as of 2026-02-16):
  - `fastapi >=0.129.0,<0.130.0`
  - `sqlalchemy >=2.0.46,<2.1.0`
  - `pydantic >=2.12.0,<3.0.0`
  - `pydantic-settings >=2.12.0,<3.0.0`
  - `alembic >=1.18.4,<2.0.0`
  - `psycopg2-binary >=2.9.11,<3.0.0`
  - `uvicorn[standard] >=0.40.0,<1.0.0`
  - `cryptography >=46.0.5,<47.0.0`
  - Dev: `pytest >=9.0.2,<10.0.0`, `httpx >=0.28.1,<1.0.0`
- Pin exact resolved versions in lockfile for reproducibility.

### File Structure Requirements

Create these files/directories in this story (minimum):

- `backend/pyproject.toml`
- `backend/app/main.py`
- `backend/app/api/__init__.py`
- `backend/app/api/v1/__init__.py`
- `backend/app/api/v1/health.py`
- `backend/app/core/__init__.py`
- `backend/app/core/exceptions.py`
- `backend/app/db/__init__.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/__init__.py`
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/tests/test_health.py`
- `backend/pyinstaller_entrypoint.py`

### Testing Requirements

- Use `pytest` + FastAPI test client coverage for foundation behavior.
- Required checks:
  - `GET /health` returns 200 and exact JSON payload.
  - Exception handlers return `{"error": ...}` for validation and HTTP exceptions.
  - App object boots with middleware and router registration intact.
- Keep tests deterministic and local (no real DB dependency for this story).

### Latest Technical Information (Web Verification)

Verified against PyPI package pages on 2026-02-16:

- FastAPI latest stable: `0.129.0`
- SQLAlchemy latest stable in 2.x line: `2.0.46` (`2.1.0b1` is pre-release)
- Alembic latest stable: `1.18.4`
- Pydantic latest stable: `2.12.5`
- pydantic-settings latest stable: `2.12.0`
- Uvicorn latest stable: `0.40.0`
- cryptography latest stable: `46.0.5`
- psycopg2-binary latest stable: `2.9.11`
- uv tool latest stable: `0.10.2`

Use these as guardrails; if pinning lower, document compatibility reason in the PR.

### Project Structure Notes

- No `project-context.md` was found in repository paths matching `**/project-context.md`.
- Architecture and epics artifacts are sufficient to execute this story.

### References

- `taskflow-ui/API_CONTRACT.md` (error shape + naming conventions)
- `_bmad-output/planning-artifacts/epics.md` (Epic 1, Story 1.1 acceptance criteria)
- `_bmad-output/planning-artifacts/architecture.md` (backend structure, error handling, startup sequencing, Alembic rules)
- `_bmad-output/planning-artifacts/prd.md` (FR38-FR44, NFR4, NFR6-NFR8, NFR10-NFR14)
- `_bmad-output/planning-artifacts/ux-design-specification.md` (actionable error messaging expectations)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `uv init --python 3.12 backend`
- `uv add` runtime dependencies and `uv add --dev` test dependencies
- `uv run pytest -q` (backend test suite): `5 passed`
- `npm test` and `npx vitest run` in `taskflow-ui/` were not executable in this environment (`vitest: Permission denied` / network DNS failure)

### Completion Notes List

- Implemented backend foundation scaffold in `backend/` with FastAPI app factory and root-level `/health` endpoint.
- Added normalized exception handlers for `HTTPException`, `RequestValidationError`, and unhandled exceptions.
- Added CORS configuration for `http://localhost:*` and API prefix registration at `/api/v1`.
- Added Alembic runtime URL override wiring through `app/core/security.py` and `alembic/env.py`.
- Added `pyinstaller_entrypoint.py` with `multiprocessing.freeze_support()`.
- Added backend smoke and behavior tests for health and error normalization; backend tests pass.
- Added backend helper scripts for dev and test execution.
- Story status set to `review`.

### File List

- `_bmad-output/implementation-artifacts/1-1-initialize-backend-project-health-endpoint.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/.gitignore`
- `backend/.python-version`
- `backend/README.md`
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/pyinstaller_entrypoint.py`
- `backend/pyproject.toml`
- `backend/scripts/dev.sh`
- `backend/scripts/test.sh`
- `backend/uv.lock`
- `backend/app/__init__.py`
- `backend/app/main.py`
- `backend/app/api/__init__.py`
- `backend/app/api/v1/__init__.py`
- `backend/app/api/v1/api.py`
- `backend/app/api/v1/health.py`
- `backend/app/core/__init__.py`
- `backend/app/core/config.py`
- `backend/app/core/exceptions.py`
- `backend/app/core/security.py`
- `backend/app/crud/__init__.py`
- `backend/app/db/__init__.py`
- `backend/app/db/base.py`
- `backend/app/db/session.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/__init__.py`
- `backend/app/schemas/health.py`
- `backend/tests/conftest.py`
- `backend/tests/test_health.py`
- `backend/tests/__init__.py`

## Change Log

- 2026-02-16: Implemented Story 1.1 backend foundation, tests, and sprint/story status updates; story moved to `review`.
- 2026-02-16: Addressed code review feedback: improved error handling logging and serialization, updated documentation.
- 2026-02-16: Story status updated to `done`.
