# Story 1.3: Credential Encryption & Settings API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team lead,  
I want to configure the database connection through API endpoints with encrypted credential storage,  
so that the application can connect to PostgreSQL securely without requiring admin privileges.

## Acceptance Criteria

1. Implement credential security module in `backend/app/core/security.py` using `cryptography.fernet.Fernet`, with key generation/loading at `config_dir/fernet.key` and encrypted credential persistence at `config_dir/db_credentials.enc` in a user-writable location.  
2. Implement `POST /api/v1/settings/test-connection` accepting `{host, port, database, username, password}`, returning `200` with `{"status": "ok"}` on success and `400` with `{"error": "Connection failed: <specific reason>"}` on failure, without persisting credentials.  
3. Implement `POST /api/v1/settings/save-connection` accepting `{host, port, database, username, password}`, encrypting and saving credentials, returning `200` with `{"status": "saved"}`, and ensuring no plaintext credentials are logged, written to temp files, or returned in error payloads.  
4. On backend startup, load encrypted credentials, construct runtime DB URL, initialize SQLAlchemy connectivity, and run Alembic migrations programmatically before reporting readiness.  
5. Health behavior aligns with startup sequencing: `/health` only returns `200` after migrations and DB connection are ready; persistent startup DB failure reflects unhealthy state.  
6. Backend reads `TASKFLOW_CONFIG_DIR` to resolve credential/key file location when launched by Electron and remains compatible with non-admin enterprise environments.

## Tasks / Subtasks

- [x] Build secure credential storage utilities (AC: 1, 3, 6)
  - [x] Extend `backend/app/core/security.py` with Fernet key lifecycle (`load_or_create_key`) and encrypted credential read/write helpers.
  - [x] Introduce explicit config-dir resolution from `TASKFLOW_CONFIG_DIR` with safe fallback to a user-writable local path.
  - [x] Ensure helper functions never expose plaintext password values in exceptions or logs.
- [x] Add settings schemas and API endpoints (AC: 2, 3)
  - [x] Add `backend/app/schemas/settings.py` with request DTO validation for `host`, `port`, `database`, `username`, `password`.
  - [x] Add `backend/app/api/v1/settings.py` implementing `test-connection` (connect-only, no persistence) and `save-connection` (encrypt + persist).
  - [x] Register settings router in `backend/app/api/v1/api.py` at `/settings`.
- [x] Integrate startup connection + migration readiness flow (AC: 4, 5, 6)
  - [x] Add `backend/app/db/migrations.py` to run Alembic `upgrade head` programmatically.
  - [x] Update DB runtime URL resolution (`backend/app/core/security.py`, `backend/app/db/session.py`) to prioritize decrypted saved credentials and keep a safe development fallback path.
  - [x] Update `backend/app/main.py` startup lifecycle to perform retry/backoff for transient DB connectivity failures and track readiness for `/health`.
- [x] Preserve established backend contracts and avoid regressions (AC: 2, 3, 5)
  - [x] Keep normalized error envelope `{"error": "..."}` for all settings and startup-related failures exposed via API.
  - [x] Preserve existing member API behavior and route structure under `/api/v1`.
  - [x] Keep `/health` at root path (`/health`, not `/api/v1/health`).
- [x] Add backend tests for settings/security/startup behavior (AC: 1, 2, 3, 4, 5, 6)
  - [x] Add `backend/tests/test_settings.py` for endpoint success/failure behavior and “test-connection does not persist” assertions.
  - [x] Add/extend tests for `core/security.py` credential encryption/decryption and config-dir resolution behavior.
  - [x] Add/extend health/startup readiness tests to verify unhealthy state before DB+migrations readiness and healthy state after readiness.
  - [x] Run full backend regression suite (`uv run python -m pytest -q`) after implementing story changes.

## Dev Notes

### Developer Context

- Story 1.1 and Story 1.2 are complete and established current backend architecture, normalized error handling, and member APIs.
- This story is backend-focused in implementation. Do not modify `taskflow-ui/` in `dev-story`.
- Story 1.4 and 1.5 will consume these settings endpoints from the frontend adapter/UI, so endpoint contracts must be stable and explicit now.

### Technical Requirements

- Endpoints must be:
  - `POST /api/v1/settings/test-connection`
  - `POST /api/v1/settings/save-connection`
- Request body shape: `{host, port, database, username, password}`.
- Error envelope remains normalized: `{"error": "..."}`.
- `test-connection` must not persist credentials in any code path.
- Credential files must be stored in user-writable location and driven by `TASKFLOW_CONFIG_DIR` when present.
- No plaintext secrets in logs, exception text, temp files, or API responses.
- Startup readiness must enforce: DB connectivity + migrations complete before `/health` reports healthy.

### Architecture Compliance

- Follow existing backend layering:
  - API route handlers: `backend/app/api/v1/settings.py`
  - Input/output schemas: `backend/app/schemas/settings.py`
  - Security/credential helpers: `backend/app/core/security.py`
  - DB migration orchestration: `backend/app/db/migrations.py`
  - Startup orchestration and health readiness: `backend/app/main.py`
- Keep naming conventions consistent (snake_case files/fields, PascalCase schemas).
- Preserve canonical error handling in `backend/app/core/exceptions.py` and raise `HTTPException` with explicit detail strings so handlers emit `{"error": ...}`.

### Library / Framework Requirements

- Use currently pinned backend stack from `backend/pyproject.toml`:
  - FastAPI `0.129.x`
  - SQLAlchemy `2.0.x`
  - Pydantic `2.x` + `pydantic-settings`
  - Alembic `1.18.x`
  - `cryptography` (`Fernet`) and `psycopg2-binary`
- No new dependency should be required for Story 1.3.
- Maintain Python 3.12+ compatibility.

### File Structure Requirements

Expected new/updated files for this story:

- `backend/app/api/v1/settings.py` (new)
- `backend/app/api/v1/api.py` (update: include settings router)
- `backend/app/schemas/settings.py` (new)
- `backend/app/core/security.py` (update: Fernet + encrypted credential storage utilities)
- `backend/app/core/config.py` (update: config-dir related settings if needed)
- `backend/app/db/session.py` (update: runtime DB URL and engine/session handling aligned to decrypted credentials)
- `backend/app/db/migrations.py` (new: programmatic Alembic execution)
- `backend/app/main.py` (update: startup readiness/retry/migration flow)
- `backend/tests/test_settings.py` (new)
- `backend/tests/test_health.py` (update if readiness semantics change)

### Testing Requirements

- Add API tests for:
  - `POST /api/v1/settings/test-connection` success (`200`, `{"status":"ok"}`) and failure (`400`, normalized error).
  - `POST /api/v1/settings/save-connection` success (`200`, `{"status":"saved"}`), including persisted encrypted artifact assertion.
  - Confirmation that `test-connection` does not write credential/key files.
- Add security utility tests for:
  - key file creation/reuse behavior
  - encrypted credential round-trip (save + load/decrypt)
  - config-dir behavior from `TASKFLOW_CONFIG_DIR`.
- Add readiness tests for:
  - unhealthy state before DB/migrations readiness
  - healthy state only after readiness is achieved.
- Run full backend regression suite after changes to guard Story 1.2 behavior.

### Previous Story Intelligence (Story 1.2)

- Existing backend patterns already in place and should be extended, not replaced:
  - `backend/app/api/deps.py` session dependency pattern
  - `backend/app/api/v1/members.py` route style and explicit HTTP error signaling
  - `backend/app/core/exceptions.py` normalized error output
- Story 1.2 established strict contract testing for exact status codes and payloads; use the same strictness for settings endpoints.
- `backend/app/core/security.py` currently resolves runtime DB URL from settings/env only; Story 1.3 should evolve this to decrypted credentials while preserving safe local development behavior.

### Git Intelligence Summary

- Recent backend commits:
  - `5e358de` - backend scaffold + member management foundation
  - `ae89082` - Story 1.2 review fixes for members API robustness
- Current codebase already has baseline backend structure, migration setup, and tests; Story 1.3 should incrementally build on this foundation.

### Latest Technical Information

- Project dependencies are already pinned in `backend/pyproject.toml`; Story 1.3 should stay within these versions to avoid scope creep.
- Architecture decisions for this story require:
  - Fernet-based local encryption (no OS credential store dependency)
  - programmatic Alembic migration on startup
  - health-gated startup readiness for Electron polling

### Project Structure Notes

- `project-context.md` was not found under configured discovery paths.
- Planning artifacts (`epics.md`, `architecture.md`, `prd.md`, `ux-design-specification.md`) plus implemented Stories 1.1/1.2 provide sufficient context.

### References

- `_bmad-output/planning-artifacts/epics.md` (Story 1.3 acceptance criteria and epic sequencing)
- `_bmad-output/planning-artifacts/architecture.md` (credential encryption, startup sequencing, file placement, error normalization patterns)
- `_bmad-output/planning-artifacts/prd.md` (FR38-FR44, NFR7, NFR10, NFR12)
- `_bmad-output/planning-artifacts/ux-design-specification.md` (actionable connection error messaging expectations)
- `docs/task_flow_master_doc.md` (settings endpoint contract examples and env/config-dir behavior notes)
- `_bmad-output/implementation-artifacts/1-2-member-management-api.md` (previous story learnings and backend test conventions)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `uv run python -m pytest -q tests/test_security.py tests/test_settings.py tests/test_health.py`
- `uv run python -m pytest -q`

### Completion Notes List

- Implemented secure credential lifecycle in `core/security.py` using Fernet with `fernet.key` and `db_credentials.enc` under `TASKFLOW_CONFIG_DIR` (with user-writable fallback).
- Added settings contract DTOs and new settings API endpoints:
  - `POST /api/v1/settings/test-connection`
  - `POST /api/v1/settings/save-connection`
- Added password-safe error sanitization to prevent plaintext credential leakage in connection failure messages.
- Added programmatic Alembic migration runner (`app/db/migrations.py`) and startup service initialization flow with retry/backoff and readiness state tracking.
- Updated health endpoint to return:
  - `200 {"status":"healthy"}` after readiness
  - `503 {"status":"unhealthy","error":"..."}` on startup/DB failure.
- Preserved normalized API error behavior and existing member route behavior.
- Added new test coverage:
  - `backend/tests/test_settings.py`
  - `backend/tests/test_security.py`
  - readiness-aware updates in `backend/tests/test_health.py`
- Full backend regression passed: `34 passed`.

### File List

- `_bmad-output/implementation-artifacts/1-3-credential-encryption-settings-api.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/app/api/v1/api.py`
- `backend/app/api/v1/health.py`
- `backend/app/api/v1/settings.py`
- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/app/db/migrations.py`
- `backend/app/db/session.py`
- `backend/app/main.py`
- `backend/app/schemas/health.py`
- `backend/app/schemas/settings.py`
- `backend/tests/test_health.py`
- `backend/tests/test_security.py`
- `backend/tests/test_settings.py`

## Change Log

- 2026-02-16: Implemented Story 1.3 credential encryption and settings API, startup readiness/migration flow, and backend tests; story moved to `review`.
