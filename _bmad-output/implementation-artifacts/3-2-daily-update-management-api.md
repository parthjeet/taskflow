# Story 3.2: Daily Update Management API [Backend]

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an engineer,
I want to add, edit, and delete timestamped daily progress updates on a task with author attribution,
so that I can track daily progress with 24-hour edit/delete windows and author name resolution.

## Acceptance Criteria

1. **Given** the backend project, tasks table, and members table exist
   **When** the DailyUpdate model is created
   **Then** a `daily_updates` table is created via Alembic migration with columns: `id` (UUID, PK, server-generated), `task_id` (UUID, FK to tasks.id, NOT NULL, ON DELETE CASCADE), `author_id` (UUID, FK to members.id, NOT NULL, ON DELETE RESTRICT), `author_name` (VARCHAR(100), NOT NULL), `content` (VARCHAR(1000), NOT NULL), `created_at` (TIMESTAMPTZ, server-generated), `updated_at` (TIMESTAMPTZ, server-managed), `edited` (BOOLEAN, NOT NULL, default FALSE)
   **And** column names match API_CONTRACT.md exactly (`content`, not `update_text`; `edited`, not `is_edited`)
   **And** an index `idx_daily_updates_task_id` is created on `task_id`

2. **Given** a valid task exists
   **When** a client sends `POST /api/v1/tasks/{taskId}/updates` with `{author_id, content}`
   **Then** the server validates content is 1-1000 characters
   **And** resolves `author_name` from `author_id` using the members table (return `400` if author not found)
   **And** sets `edited: false`, `created_at` and `updated_at` to current timestamp
   **And** refreshes the parent task's `updated_at`
   **And** returns `201 Created` with the full daily update object: `{id, task_id, author_id, author_name, content, created_at, updated_at, edited}`

3. **Given** an existing daily update created less than 24 hours ago
   **When** a client sends `PATCH /api/v1/tasks/{taskId}/updates/{updateId}` with `{content}`
   **Then** the content is updated (validated 1-1000 chars)
   **And** `edited` is set to `true`
   **And** `updated_at` is refreshed
   **And** the parent task's `updated_at` is refreshed
   **And** returns `200 OK` with the full updated daily update object

4. **Given** an existing daily update created more than 24 hours ago
   **When** a client sends `PATCH /api/v1/tasks/{taskId}/updates/{updateId}`
   **Then** the server returns `403 Forbidden` with `{"error": "Updates can only be edited within 24 hours."}`

5. **Given** an existing daily update created less than 24 hours ago
   **When** a client sends `DELETE /api/v1/tasks/{taskId}/updates/{updateId}`
   **Then** the update is deleted
   **And** the parent task's `updated_at` is refreshed
   **And** returns `204 No Content`

6. **Given** an existing daily update created more than 24 hours ago
   **When** a client sends `DELETE /api/v1/tasks/{taskId}/updates/{updateId}`
   **Then** the server returns `403 Forbidden` with `{"error": "Updates can only be deleted within 24 hours."}`

7. **Given** daily updates exist for a task
   **When** the parent task is retrieved (GET /tasks/{id} or GET /tasks)
   **Then** daily updates are returned in the `daily_updates` array ordered by `created_at` descending (newest first)

8. **Given** an update ID or task ID that does not exist
   **When** any daily update endpoint is called
   **Then** the server returns `404 Not Found` with appropriate error message

9. **Given** all mutations in this story
   **When** any create/edit/delete operation succeeds
   **Then** the parent task's `updated_at` timestamp is refreshed

10. **Given** a transient database connectivity failure occurs during `POST`, `PATCH`, or `DELETE` daily update operations
    **When** the API handles the failure
    **Then** it returns `503 Service Unavailable` with `{"error": "Database connection lost. Please retry."}` and header `Retry-After: 5`

11. **Given** a member has authored one or more daily updates
    **When** a client sends `DELETE /api/v1/members/{memberId}`
    **Then** the API returns `409 Conflict` with a clear message instead of leaking a raw DB integrity failure (`500`)

## Tasks / Subtasks

- [x] Task 1: Create DailyUpdate model and Alembic migration (AC: #1)
  - [x] 1.1 Create `backend/app/models/daily_update.py` with SQLAlchemy model matching API_CONTRACT.md field names; `author_id` FK uses `ondelete="RESTRICT"` (referential integrity for authored updates)
  - [x] 1.2 Replace temporary placeholder in `backend/app/models/task.py` with real `daily_updates` relationship (`order_by=DailyUpdate.created_at.desc()`)
  - [x] 1.3 Update `backend/app/models/__init__.py` to import DailyUpdate
  - [x] 1.4 Generate Alembic migration for `daily_updates` table with FK, index on `task_id`
- [x] Task 2: Create Pydantic schemas (AC: #2, #3)
  - [x] 2.1 Create `backend/app/schemas/daily_update.py` with `DailyUpdateCreate`, `DailyUpdateUpdate`, `DailyUpdateResponse`
  - [x] 2.2 Update `TaskResponse` in `backend/app/schemas/task.py` to replace `daily_updates: list[Any]` with `daily_updates: list[DailyUpdateResponse]` (add `from app.schemas.daily_update import DailyUpdateResponse` import; no circular dependency risk)
- [x] Task 3: Create CRUD operations (AC: #2, #3, #4, #5, #6, #7, #8, #9, #10)
  - [x] 3.1 Create `backend/app/crud/daily_update.py` with `create_daily_update`, `update_daily_update`, `delete_daily_update`
  - [x] 3.2 Implement author_name resolution from members table in create
  - [x] 3.3 Implement 24-hour edit window check for update and delete (403 path)
  - [x] 3.4 Ensure update lookup is scoped by BOTH `task_id` and `update_id` (wrong pair returns 404)
  - [x] 3.5 Implement parent task `updated_at` touch on all mutations
- [x] Task 4: Create API router (AC: #2, #3, #4, #5, #6, #8, #10)
  - [x] 4.1 Create `backend/app/api/v1/daily_updates.py` with POST, PATCH, DELETE endpoints
  - [x] 4.2 Map time-window violations to `403` explicitly in router exception handling
  - [x] 4.3 Use shared `handle_operational_error()` path for `OperationalError` to enforce standardized `503` + `Retry-After: 5`
  - [x] 4.4 Register router in `backend/app/api/v1/api.py` at `/tasks/{task_id}/updates`
- [x] Task 5: Integrate daily_updates into task queries and responses (AC: #7, #9)
  - [x] 5.1 Add `selectinload(Task.daily_updates)` to `list_tasks` query in `backend/app/crud/task.py`
  - [x] 5.2 Add `include_daily_updates: bool = True` parameter to `get_task_by_id` (parallel to existing `include_sub_tasks`), loading `selectinload(Task.daily_updates)` when `True`
  - [x] 5.3 Update `db.refresh(task, attribute_names=["sub_tasks"])` → `db.refresh(task, attribute_names=["sub_tasks", "daily_updates"])` in both `create_task` and `update_task` in `backend/app/crud/task.py` (lines 146, 196)
- [x] Task 6: Write comprehensive tests (AC: all)
  - [x] 6.1 Create `backend/tests/test_daily_updates.py` with full acceptance criteria coverage
  - [x] 6.2 Add cross-task pairing tests (existing update ID under wrong task returns 404)
  - [x] 6.3 Add 24-hour boundary tests (exactly 24h allowed; >24h forbidden)
  - [x] 6.4 Add OperationalError-to-503 tests for POST/PATCH/DELETE
  - [x] 6.5 Add cascade delete test (deleting parent task removes all daily updates)
  - [x] 6.6 Add member-delete regression test (member referenced by daily update returns 409, not 500)
  - [x] 6.7 Run full backend regression suite
- [x] Task 7: Prevent member deletion regression from `daily_updates.author_id` FK (AC: #11)
  - [x] 7.1 Update `backend/app/crud/member.py` to account for authored daily updates before delete (new helper count or equivalent)
  - [x] 7.2 Update `backend/app/api/v1/members.py` delete path to return `409` with deterministic message when member is referenced by daily updates
  - [x] 7.3 Add/extend tests in `backend/tests/test_members.py` to verify the new `409` contract

### Review Follow-ups (AI)

- [x] [AI-Review][MEDIUM] Update `taskflow-ui/API_CONTRACT.md` Delete Member section to document second `409 Conflict` response for authored daily updates (`"Cannot delete member with N authored daily update(s). Delete those updates first."`) [taskflow-ui/API_CONTRACT.md: Delete Member section]
- [x] [AI-Review][MEDIUM] Add `PRAGMA foreign_keys=ON` to `_build_test_client` in `test_members.py` to enable SQLite FK enforcement, matching the pattern in `test_daily_updates.py` [backend/tests/test_members.py:43-44]
- [x] [AI-Review][LOW] Add test asserting content whitespace stripping on valid create (e.g., `"  hello  "` stored as `"hello"`) [backend/tests/test_daily_updates.py]
- [x] [AI-Review][LOW] Remove `onupdate=sa.func.now()` from `DailyUpdate.updated_at` — it's dead code (CRUD always sets explicitly) and inconsistent with Task model [backend/app/models/daily_update.py:47]

### Review Follow-ups Round 2 (AI — 2026-02-28)

- [x] [AI-Review-R2][MEDIUM] Catch `IntegrityError` in POST `create_daily_update` route to handle race condition where member is deleted between author resolution and INSERT commit; return `409` instead of leaking `500` [backend/app/api/v1/daily_updates.py:20-31]
- [x] [AI-Review-R2][LOW] Add boundary test: exactly 1000-char content succeeds on POST create [backend/tests/test_daily_updates.py]
- [x] [AI-Review-R2][LOW] Add test: missing `author_id` in POST request body returns 400 [backend/tests/test_daily_updates.py]
- [x] [AI-Review-R2][LOW] Add test: empty string `""` content returns 400 on POST create [backend/tests/test_daily_updates.py]
- [x] [AI-Review-R2][LOW] Pass `include_daily_updates=False, include_sub_tasks=False` to `get_task_by_id` lock query in `update_task` route to avoid wasted eager-load before refresh [backend/app/api/v1/tasks.py:100]

### Review Follow-ups Round 3 (AI — 2026-02-28)

- [x] [AI-Review-R3][LOW] Fix docstring inaccuracy in `delete_daily_update`: says "within the 24-hour edit window" but should say "24-hour delete window" or "24-hour window" [backend/app/crud/daily_update.py:107]
- [x] [AI-Review-R3][LOW] Add PATCH boundary test: exactly 1000-char content succeeds (mirrors existing POST boundary test) [backend/tests/test_daily_updates.py]
- [x] [AI-Review-R3][LOW] Add PATCH `content: null` rejection test: `{"content": null}` returns 400 (mirrors null-rejection tests for TaskUpdate fields) [backend/tests/test_daily_updates.py]

## Dev Notes

### Architecture Compliance

- **API Endpoints** follow the nested resource pattern established in Story 3.1 (subtasks):
  - `POST   /api/v1/tasks/{task_id}/updates` — Create daily update
  - `PATCH  /api/v1/tasks/{task_id}/updates/{update_id}` — Edit daily update (24h window)
  - `DELETE /api/v1/tasks/{task_id}/updates/{update_id}` — Delete daily update (24h window)
- **Error format**: All errors MUST return `{"error": "message"}` — NOT `{"detail": ...}`.
- **Transient DB failures**: All daily update endpoints MUST map `OperationalError` to `503` with header `Retry-After: 5` via `handle_operational_error()` (same shared pattern as task/subtask routers).
- **Atomic operations**: All mutations must be atomic (NFR14).
- **Field names**: Use API_CONTRACT.md field names exactly: `content` (NOT `update_text`), `edited` (NOT `is_edited`), `author_id`, `author_name`.
- **No position management needed**: Unlike subtasks, daily updates have no position/ordering complexity — they are ordered by `created_at DESC` (newest first).
- **No max-count limit**: Unlike subtasks (max 20), daily updates have no count limit per task.
- **Member delete regression guard**: Because `daily_updates.author_id` is an FK to `members.id`, member deletion must stay a controlled `409` response path (not an unhandled `IntegrityError` → `500`).

### Key Differences from Story 3.1

Daily updates differ from subtasks: auto-ordered by `created_at DESC` (no position management, no count limit), enforce 24-hour edit/delete windows (subtasks do not), require `author_name` resolution from members table, and use `content` (1000 chars) + `edited` tracking instead of `title` (200 chars) + `completed`.

### Source Tree Components

**New files:**
- `backend/app/models/daily_update.py` — DailyUpdate ORM model
- `backend/app/schemas/daily_update.py` — Pydantic schemas (create, update, response)
- `backend/app/crud/daily_update.py` — CRUD operations with 24h window enforcement
- `backend/app/api/v1/daily_updates.py` — API router with POST, PATCH, DELETE
- `backend/tests/test_daily_updates.py` — Comprehensive test suite

**Modified files:**
- `backend/app/models/__init__.py` — Add DailyUpdate import
- `backend/app/models/task.py` — Add `daily_updates` relationship
- `backend/app/schemas/task.py` — Replace `daily_updates: list[Any]` with typed `list[DailyUpdateResponse]`
- `backend/app/api/v1/api.py` — Register daily_updates router
- `backend/app/crud/task.py` — Add `selectinload(Task.daily_updates)` to task queries, add `include_daily_updates` param to `get_task_by_id`, update `db.refresh` attribute_names in `create_task`/`update_task`
- `backend/app/crud/member.py` — Add authored-daily-update reference guard for member deletion
- `backend/app/api/v1/members.py` — Return deterministic `409` when member is referenced by daily updates
- `backend/tests/test_members.py` — Add member-delete regression test for daily-update FK references

### Established Patterns to Follow (from Story 3.1)

1. **Model pattern**: Follow `backend/app/models/subtask.py` structure:
   - Use `Mapped[]` type annotations for all columns
   - Add Python-side defaults (`default=uuid.uuid4`, `default=False`, UTC timestamp defaults)
   - Keep DB-side `server_default` for production PostgreSQL
   - Set reverse relationship `lazy="noload"` to avoid accidental lazy loads

2. **Schema pattern**: 
   - Define schemas directly in `backend/app/schemas/daily_update.py`.
   - Use Pydantic V2 `Field` for string constraints: `content: str = Field(min_length=1, max_length=1000)`
   - Add a custom `field_validator('content', mode='before')` to `strip()` whitespace and reject empty strings before length validation.
   - `model_config = ConfigDict(from_attributes=True)` on response schemas.

3. **CRUD pattern**: Follow `backend/app/crud/subtask.py`:
   - Lock parent task with `task_crud.get_task_by_id(..., for_update=True, include_sub_tasks=False, include_daily_updates=False)` before mutations
   - Use `task_crud.touch_task_updated_at(db, task)` to refresh parent
   - Raise `LookupError` for not-found (caught as 404 by router)
   - Raise `ValueError` for 400-level validation/business rule failures (e.g., author lookup/content issues)
   - Raise `PermissionError` for 24-hour window violations (router maps to 403)
   - Use `OperationalError` handling via `common.handle_operational_error()`
   - Scope update/delete queries by both `task_id` and `update_id` to enforce nested-resource ownership

4. **Router pattern**: Follow `backend/app/api/v1/subtasks.py`:
   - Try/except blocks catching `LookupError`, `ValueError`, `PermissionError`, `OperationalError`
   - Call `rollback_safely(db)` before raising HTTPException for ALL error types (LookupError, ValueError, PermissionError)
   - Map `PermissionError` to `HTTPException(status_code=403, detail=...)`
   - Return `Any` from endpoints to avoid serialization type issues
   - Include docstrings on all handler functions

5. **Test pattern**: Follow `backend/tests/test_subtasks.py` structure, `backend/tests/test_tasks.py` for `_create_member` helper:
   - Use `testing_session_factory` fixture with SQLite in-memory DB
   - `client` fixture with `create_app()` and `dependency_overrides`
   - Helper functions: `_create_task()` (from subtask tests), `_create_member()` (creates via `POST /api/v1/members` — see `test_tasks.py` line 57 for reference pattern)
   - Cover success AND failure paths (400, 403, 404, 503)
   - Assert full response shape on success responses
   - Use `unittest.mock.patch` for time-based tests (24h window) — do NOT use `time.sleep`
   - Add cascade delete test: deleting parent task removes all its daily updates

6. **Router registration**: In `api.py`, use:
   ```python
   api_router.include_router(daily_updates_router, prefix="/tasks/{task_id}/updates", tags=["daily-updates"])
   ```

7. **Eager loading**: Add `selectinload(Task.daily_updates)` alongside existing `selectinload(Task.sub_tasks)` in task CRUD queries. Also add `include_daily_updates: bool = True` parameter to `get_task_by_id` (parallel to `include_sub_tasks`). For mutation paths that only need parent task existence/locking, pass `include_sub_tasks=False` and `include_daily_updates=False`. Update `db.refresh(task, attribute_names=["sub_tasks"])` → `db.refresh(task, attribute_names=["sub_tasks", "daily_updates"])` in both `create_task` and `update_task`.

### 24-Hour Window Implementation

- Compare `created_at` with `datetime.now(timezone.utc)`
- Normalize `created_at` before comparison: if DB returns naive datetime (SQLite), treat as UTC (`created_at = created_at.replace(tzinfo=timezone.utc)`)
- If `now - created_at > timedelta(hours=24)`: return 403 (strict `>`, exactly-24h remains allowed)
- **Import datetime symbols at module scope** (`from datetime import datetime, timezone, timedelta`) — patch target should be `app.crud.daily_update.datetime` (same pattern as `app.crud.task.datetime` used in subtask tests).
- Use `unittest.mock.patch` on `datetime` to test window expiry without `time.sleep`
- Exact error messages from API_CONTRACT.md:
  - Edit: `"Updates can only be edited within 24 hours."`
  - Delete: `"Updates can only be deleted within 24 hours."`

### Author Resolution

- On create: look up member by `author_id` in the members table
- If member not found: return `400` with `{"error": "Author not found"}`
- Author resolution does NOT filter by `active` status — any existing member can author an update (consistent with `_resolve_assignee_name` in task CRUD which also resolves all members regardless of active flag)
- Store `author_name` denormalized in the `daily_updates` row (same pattern as `assignee_name` on tasks)
- Author name is NOT updated if member name changes later (snapshot at creation time)
- `author_id` FK uses `ON DELETE RESTRICT`; member deletion flow must catch this relationship and return a controlled `409` contract response instead of a DB-leak `500`

### Testing Standards

- Framework: `pytest` + `TestClient` (FastAPI)
- Structure: `backend/tests/test_daily_updates.py`
- Naming: `test_*` functions
- Coverage targets:
  - AC1: Model/migration existence (implicit in all tests)
  - AC2: Create happy path, author resolution, content validation (empty, too long, whitespace)
  - AC3: Edit within 24h, `edited` flag set, `updated_at` refreshed
  - AC4: Edit after 24h returns 403 with exact error message (and exactly-24h remains allowed)
  - AC5: Delete within 24h, parent `updated_at` refreshed
  - AC6: Delete after 24h returns 403 with exact error message (and exactly-24h remains allowed)
  - AC7: Daily updates returned in task response, ordered newest-first
  - AC8: 404 for non-existent task_id/update_id and wrong task/update pairings on all endpoints
  - AC9: Parent `updated_at` touched on every mutation
  - AC10: `OperationalError` handling for POST/PATCH/DELETE endpoints returns `503` with `Retry-After: 5`
  - AC11: Deleting a member referenced by daily updates returns `409` (no `500` integrity leak)

### Project Structure Notes

- Maintain one-file-per-resource pattern (daily_update.py, not updates.py)
- Keep snake_case field naming throughout backend
- Follow layered architecture: model → schema → CRUD → API
- The `daily_updates` relationship on Task should use `order_by=DailyUpdate.created_at.desc()` for automatic newest-first ordering
- Remove the temporary `Task.daily_updates` placeholder relationship once real `DailyUpdate` model is wired

### References

- [Source: taskflow-ui/API_CONTRACT.md#Daily-Updates-API]
- [Source: taskflow-ui/API_CONTRACT.md#Error-Handling]
- [Source: taskflow-ui/API_CONTRACT.md#Team-Members-API]
- [Source: taskflow-ui/API_CONTRACT.md#Business-Rules — Rules 4, 7, 8, 9]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3, Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API-Communication-Patterns]
- [Source: _bmad-output/project-context.md — FastAPI rules, Testing rules, Database integrity rules]
- [Source: _bmad-output/implementation-artifacts/3-1-sub-task-management-api.md — Established patterns]

### Previous Story Intelligence (from 3.1)

**Key learnings to apply:**
1. **Use `task_crud.get_task_by_id(..., for_update=True)` for parent task lookup** — row-level locking is required for mutation consistency.
2. **Touch parent `updated_at` via `task_crud.touch_task_updated_at()`** — established utility, do not reimplement.
3. **Schema-driven serialization**: Use `DailyUpdateResponse.model_validate(..., from_attributes=True).model_dump()` if returning dicts, or return ORM objects and let FastAPI serialize.
4. **Eager loading**: Must add `selectinload(Task.daily_updates)` to both `list_tasks` and `get_task_by_id` to avoid N+1 queries.
5. **`lazy="noload"` on reverse relationship**: Set `DailyUpdate.task` relationship to `lazy="noload"` to prevent accidental lazy loads.
6. **`rollback_safely()` and `handle_operational_error()`**: Use shared utilities from `backend/app/api/v1/common.py`.
7. **Python-side defaults**: Add `default=uuid.uuid4` for `id`, `default=False` for `edited`, UTC timestamp defaults for `created_at`/`updated_at`.
8. **SQLite FK enforcement in tests**: Enable foreign keys in test connections (`@event.listens_for(engine, "connect")` → `PRAGMA foreign_keys=ON`).
9. **No `time.sleep` in tests**: Use `unittest.mock.patch` on datetime for time-window tests.
10. **`uv --project backend run pytest`**: Correct command for running tests.

### Git Intelligence

Recent commits show:
- Story 3.1 (subtasks) was completed with 138 passing tests after extensive code review
- Story 2.1 (task CRUD) checkpoint established base patterns
- Frontend tests for TaskDetail and TaskFormDialog were added separately
- The project uses conventional commits (`feat:`, `fix:`, `chore:`)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `uv --project backend run pytest backend/tests/test_daily_updates.py backend/tests/test_members.py` (42 passed)
- `uv --project backend run pytest` (163 passed)
- `uv --project backend run pytest backend/tests/test_daily_updates.py backend/tests/test_members.py` (43 passed)
- `uv --project backend run pytest` (164 passed)
- `uv --project backend run ruff check backend/app backend/tests` (ruff executable unavailable in this environment)
- `uv --project backend run pytest backend/tests/test_daily_updates.py backend/tests/test_tasks.py` (91 passed)
- `uv --project backend run pytest` (168 passed)
- `uv --project backend run ruff check backend/app backend/tests` (`ruff` failed to spawn: permission denied)
- `uv --project backend run pytest backend/tests/test_daily_updates.py` (31 passed)
- `uv --project backend run pytest` (170 passed)
- `uv --project backend run ruff check backend/app backend/tests` (`ruff` failed to spawn: permission denied)
### Completion Notes List

- Implemented DailyUpdate data model with proper FK behavior (`task_id` CASCADE, `author_id` RESTRICT), timestamp defaults, and `edited` tracking.
- Added Alembic revision `20260228_0006` creating `daily_updates` with `idx_daily_updates_task_id`.
- Replaced Task daily-updates placeholder with a real relationship ordered by `created_at DESC`.
- Added DailyUpdate schemas (`create`, `update`, `response`) and typed `TaskResponse.daily_updates` with `DailyUpdateResponse`.
- Implemented daily update CRUD with parent-task locking, author-name resolution, strict 24-hour edit/delete enforcement, scoped `(task_id, update_id)` lookup, and parent `updated_at` touches.
- Added nested daily update API routes (`POST`, `PATCH`, `DELETE`) with standardized 400/403/404/503 handling.
- Integrated daily updates into task read paths via `selectinload(Task.daily_updates)` and refreshed task mutation responses with `daily_updates`.
- Added member deletion guardrails for authored daily updates with deterministic `409` behavior.
- Added comprehensive daily-update regression tests, member-delete regression coverage, and validated full backend regression (163 passing tests).
- ✅ Resolved review finding [MEDIUM]: documented member-delete `409` contract for authored daily updates in `taskflow-ui/API_CONTRACT.md`.
- ✅ Resolved review finding [MEDIUM]: enabled SQLite foreign key enforcement in `backend/tests/test_members.py` test client setup.
- ✅ Resolved review finding [LOW]: added create-path whitespace-stripping regression test for daily update content in `backend/tests/test_daily_updates.py`.
- ✅ Resolved review finding [LOW]: removed redundant `onupdate` from `DailyUpdate.updated_at` in `backend/app/models/daily_update.py`.
- Re-ran targeted and full backend suites after review fixes (43 targeted tests, 164 full-suite tests passing).
- ✅ Resolved review finding [MEDIUM]: catch `IntegrityError` in daily-update create route and return deterministic `409` for member-delete race conditions.
- ✅ Resolved review finding [LOW]: added POST create boundary/validation tests for exactly-1000-char content, missing `author_id`, and empty-string content.
- ✅ Resolved review finding [LOW]: optimized task update lock query by disabling eager-loading (`include_sub_tasks=False`, `include_daily_updates=False`).
- Re-ran targeted and full backend suites after round-2 fixes (91 targeted tests, 168 full-suite tests passing).
- ✅ Resolved review finding [LOW]: corrected `delete_daily_update` docstring to reference the 24-hour delete window.
- ✅ Resolved review finding [LOW]: added PATCH boundary test confirming exactly 1000-char content succeeds.
- ✅ Resolved review finding [LOW]: added PATCH null-content rejection test (`content: null` returns 400).
- Re-ran targeted and full backend suites after round-3 fixes (31 targeted tests, 170 full-suite tests passing).
### File List

- _bmad-output/implementation-artifacts/3-2-daily-update-management-api.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/alembic/versions/20260228_0006_add_daily_updates_table.py
- backend/app/api/v1/api.py
- backend/app/api/v1/daily_updates.py
- backend/app/api/v1/members.py
- backend/app/api/v1/tasks.py
- backend/app/crud/daily_update.py
- backend/app/crud/member.py
- backend/app/crud/subtask.py
- backend/app/crud/task.py
- backend/app/models/__init__.py
- backend/app/models/daily_update.py
- backend/app/models/task.py
- backend/app/schemas/daily_update.py
- backend/app/schemas/task.py
- backend/tests/test_daily_updates.py
- backend/tests/test_members.py
- taskflow-ui/API_CONTRACT.md

## Change Log

- 2026-02-28: Implemented Story 3.2 Daily Update Management API end-to-end (model, migration, schemas, CRUD, nested routes, task integration, member delete safeguards, and comprehensive tests). Story moved to `review`.
- 2026-02-28: Code review completed (Claude Opus 4.6). 0 HIGH, 2 MEDIUM, 2 LOW issues found. 4 action items added to Tasks/Subtasks. Story moved back to `in-progress` pending MEDIUM follow-ups.
- 2026-02-28: Addressed code review findings - 4 items resolved (2 MEDIUM, 2 LOW), validated with 43 targeted tests and 164 full-suite backend tests. Story moved to `review`.
- 2026-02-28: Code review round 2 (Claude Opus 4.6). 0 HIGH, 1 MEDIUM, 4 LOW issues found. 5 action items added to Tasks/Subtasks (Review Follow-ups Round 2). Story moved to `in-progress`.
- 2026-02-28: Addressed round-2 code review findings - 5 items resolved (1 MEDIUM, 4 LOW), validated with 91 targeted tests and 168 full-suite backend tests. Story moved to `review`.
- 2026-02-28: Code review round 3 (Claude Opus 4.6). 0 HIGH, 0 MEDIUM, 3 LOW issues found. 3 action items added to Tasks/Subtasks (Review Follow-ups Round 3). Story remains `in-progress` pending LOW follow-ups.
- 2026-02-28: Addressed round-3 code review findings - 3 items resolved (0 HIGH, 0 MEDIUM, 3 LOW), validated with 31 targeted tests and 170 full-suite backend tests. Story moved to `review`.

- 2026-02-28: Code review round 4 (AI). 0 HIGH, 2 MEDIUM, 3 LOW issues found. 5 action items added to Tasks/Subtasks (Review Follow-ups Round 4). Story moved to `in-progress`.

### Review Follow-ups Round 4 (AI — 2026-02-28)

- [ ] [AI-Review-R4][MEDIUM] Optimize `list_tasks` to avoid unbounded eager-loading of `daily_updates`. Consider omitting them from the list view (or only returning a count), restricting full data to the detail view (`GET /tasks/{id}`). [backend/app/crud/task.py: list_tasks]
- [ ] [AI-Review-R4][MEDIUM] Fix N+1 lazy-loading regression in `update_task` early return. Ensure `db.refresh(task, attribute_names=["sub_tasks", "daily_updates"])` is called even when no fields change. [backend/app/crud/task.py: update_task]
- [x] [AI-Review-R4][LOW] Update `update_daily_update` to return early without side effects if the new content exactly matches the existing content. [backend/app/crud/daily_update.py: update_daily_update]
- [x] [AI-Review-R4][LOW] Optimize lock duration in `create_daily_update` by moving `_resolve_author_name` above the `get_task_by_id(..., for_update=True)` call. [backend/app/crud/daily_update.py: create_daily_update]
- [x] [AI-Review-R4][LOW] Optimize lock behavior in `update_daily_update` and `delete_daily_update` by performing a fast unlocked read of the daily update existence before executing the expensive `get_task_by_id(..., for_update=True)`. [backend/app/crud/daily_update.py]
