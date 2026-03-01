# Story 2.1: Task Management API — CRUD & Business Logic

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to create, view, update, and delete tasks via API endpoints with full field validation and status-driven business logic,
so that the team can track all work items with accurate status, priority, assignee, and GEAR ID information.

## Acceptance Criteria

1. **Given** the backend project and `members` table from Epic 1 exist
   **When** the Task model is created
   **Then** a `tasks` table exists via Alembic migration with columns:
   - `id` (UUID, PK, `gen_random_uuid()`)
   - `title` (VARCHAR(200), NOT NULL)
   - `description` (VARCHAR(2000), nullable)
   - `status` (ENUM: `"To Do"`, `"In Progress"`, `"Blocked"`, `"Done"`, NOT NULL)
   - `priority` (ENUM: `"High"`, `"Medium"`, `"Low"`, NOT NULL)
   - `assignee_id` (UUID, FK to `members.id`, nullable, ON DELETE SET NULL)
   - `assignee_name` (VARCHAR(100), nullable — denormalized)
   - `gear_id` (VARCHAR(4), nullable)
   - `blocking_reason` (VARCHAR, NOT NULL, default `""`)
   - `created_at` (TIMESTAMPTZ, server-generated)
   - `updated_at` (TIMESTAMPTZ, server-managed, refreshed on every update)
   **And** indexes `idx_tasks_status` and `idx_tasks_assignee_id` are created.

2. **Given** the `tasks` table exists
   **When** `GET /api/v1/tasks` is called
   **Then** `200 OK` with an array of all task objects, each embedding `sub_tasks: []` and `daily_updates: []` (empty at this stage) and `assignee_name` server-resolved.

3. **Given** query parameters on `GET /api/v1/tasks`
   **When** `status` is provided → filter by exact status match
   **When** `priority` is provided → filter by exact priority match
   **When** `assignee` is a UUID → filter by `assignee_id`
   **When** `assignee` is `"unassigned"` → filter where `assignee_id IS NULL`
   **When** `search` is provided → case-insensitive partial match on `title`, `description`, `gear_id`
   **When** `sort` is provided → sort by `updated` (desc `updated_at`, default), `priority` (High > Medium > Low), or `status` (To Do > In Progress > Blocked > Done)

4. **Given** a valid task ID
   **When** `GET /api/v1/tasks/{id}` is called
   **Then** `200 OK` with the full task object (same shape as list item).

5. **Given** valid task data
   **When** `POST /api/v1/tasks` with `{title, status, priority}` and optional `{description, assignee_id, gear_id, blocking_reason}`
   **Then** the server validates:
   - `title`: 1–200 chars (required)
   - `description`: max 2000 chars (optional)
   - `status`: valid enum value
   - `priority`: valid enum value
   - `gear_id`: matches `/^\d{4}$/` if provided → else `400` with `{"error": "GEAR ID must be exactly 4 digits"}`
   - If `status == "Blocked"` and `blocking_reason` empty/missing → `400` with `{"error": "Blocking reason is required when status is Blocked"}`
   - If `assignee_id` provided, resolve `assignee_name` from members table
   **And** server returns `201 Created` with full task object including `sub_tasks: []` and `daily_updates: []`.

6. **Given** an existing task
   **When** `PATCH /api/v1/tasks/{id}` with partial fields
   **Then** only provided fields updated, `updated_at` refreshed, `200 OK` with full updated task object.

7. **Given** a task with `status == "Blocked"`
   **When** `PATCH /api/v1/tasks/{id}` with `{status: "In Progress"}` (or any non-Blocked status)
   **Then** server automatically sets `blocking_reason = ""` regardless of whether it was in the request.

8. **Given** a task update that changes `assignee_id`
   **When** update is processed
   **Then** `assignee_name` is re-resolved from members table; if `assignee_id` is null → `assignee_name` is null.

9. **Given** an existing task
   **When** `DELETE /api/v1/tasks/{id}`
   **Then** task and all its sub_tasks and daily_updates are cascade-deleted; server returns `204 No Content`.

10. **Given** a task ID that does not exist
    **When** any task endpoint is called
    **Then** `404 Not Found` with `{"error": "Task not found"}`.

11. **Given** all database mutations in this story
    **When** they execute
    **Then** all operations are atomic (NFR14), use parameterized statements (NFR8), and connection interruption errors return appropriate error responses so the frontend can preserve user input (FR45).

## Tasks / Subtasks

- [x] Create Alembic migration for `tasks` table (AC: 1)
  - [x] Create `backend/alembic/versions/XXXX_add_tasks_table.py` with `tasks` table and `task_status`, `task_priority` PostgreSQL enums
  - [x] Add indexes `idx_tasks_status` (on `status`) and `idx_tasks_assignee_id` (on `assignee_id`)
  - [x] Add FK constraint `fk_tasks_assignee_id` → `members.id` with ON DELETE SET NULL
  - [x] Run and verify `uv run alembic upgrade head` applies cleanly (no errors, `downgrade` also clean)
- [x] Create SQLAlchemy Task model (AC: 1)
  - [x] Create `backend/app/models/task.py` using `Mapped`/`mapped_column` pattern (mirror `models/member.py`)
  - [x] Add `task_status` and `task_priority` Python enums (or use `sa.Enum` with exact string values)
  - [x] Add `relationship` to `sub_tasks` and `daily_updates` (empty at this stage — placeholder for Epic 3)
  - [x] Update `backend/app/models/__init__.py` to import `Task`
- [x] Create Pydantic schemas for tasks (AC: 5, 6)
  - [x] Create `backend/app/schemas/task.py` with `TaskCreate`, `TaskUpdate` (all Optional), `TaskResponse`
  - [x] `TaskResponse` must include `sub_tasks: list = []` and `daily_updates: list = []`
  - [x] `model_config = ConfigDict(from_attributes=True)` on `TaskResponse`
  - [x] Add `TaskStatus` and `TaskPriority` enums matching API_CONTRACT.md values exactly
- [x] Create CRUD module for tasks (AC: 2, 3, 5, 6, 7, 8, 9)
  - [x] Create `backend/app/crud/task.py` with `list_tasks`, `get_task_by_id`, `create_task`, `update_task`, `delete_task`
  - [x] `list_tasks`: apply status/priority/assignee/search/sort filters via SQLAlchemy query (parameterized)
  - [x] `create_task`: validate gear_id regex, blocked-requires-reason, resolve assignee_name
  - [x] `update_task`: partial update via `model_dump(exclude_unset=True)`, auto-clear blocking_reason, re-resolve assignee_name
  - [x] `delete_task`: DB cascade handles sub_tasks and daily_updates removal
  - [x] `updated_at` refresh on every mutation (use `func.now()` or `datetime.utcnow()`)
- [x] Create tasks API router (AC: 2–11)
  - [x] Create `backend/app/api/v1/tasks.py` with GET (list), GET (single), POST, PATCH, DELETE endpoints
  - [x] Register router in `backend/app/api/v1/api.py` with prefix `/tasks` and tag `tasks`
  - [x] Validate GEAR ID format (`/^\d{4}$/`) returning `{"error": "GEAR ID must be exactly 4 digits"}`
  - [x] Validate blocked-status + blocking_reason at endpoint layer (before CRUD call)
  - [x] Return 404 with `{"error": "Task not found"}` for missing task_id (all verbs)
- [x] Write backend tests (AC: 1–11)
  - [x] Create `backend/tests/test_tasks.py` covering all ACs
  - [x] Test `POST /tasks` valid creation (verified `201`, all fields present, `sub_tasks: []`, `daily_updates: []`)
  - [x] Test `POST /tasks` validation failures: missing title, title too long, invalid status/priority, invalid gear_id, blocked without reason
  - [x] Test `GET /tasks` list (all tasks, status filter, priority filter, assignee UUID filter, `"unassigned"` filter, search, sort by `priority` and `status`)
  - [x] Test `GET /tasks/{id}` exists and 404
  - [x] Test `PATCH /tasks/{id}` partial update, blocking_reason auto-clear, assignee re-resolution (null and valid), 404
  - [x] Test `DELETE /tasks/{id}` success (204) and 404
  - [x] Test assignee_name resolution (create task with valid `assignee_id`, verify `assignee_name` in response)
  - [x] Run `uv run pytest` — all tests must pass
- [x] Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Add test for search by `description` field — AC3 requires case-insensitive partial match on title, description, AND gear_id; description branch is untested [backend/tests/test_tasks.py — add `test_list_tasks_search_by_description`]
  - [x] [AI-Review][MEDIUM] Remove duplicate gear_id validation from CRUD layer — router validates first and raises HTTPException, making `_validate_gear_id` in `create_task` dead code; on PATCH, the router validation is always a no-op for unset fields while the CRUD check is the only effective one [backend/app/crud/task.py:107, backend/app/api/v1/tasks.py:80]
  - [x] [AI-Review][MEDIUM] Remove duplicate blocking_reason validation from CRUD layer — `_validate_blocking_reason` in `create_task` is dead code since router's `_validate_blocked_status` fires first and raises HTTPException [backend/app/crud/task.py:110, backend/app/api/v1/tasks.py:81]
  - [x] [AI-Review][MEDIUM] Strengthen `updated_at` test — `test_update_task_refreshes_updated_at` only checks `is not None`, not that the value actually changed; compare timestamps before and after update [backend/tests/test_tasks.py:387-393]
  - [x] [AI-Review][MEDIUM] Add test for invalid `assignee` filter format — `GET /api/v1/tasks?assignee=not-a-valid-uuid` should return 400; behavior exists in code but is untested [backend/tests/test_tasks.py — add `test_list_tasks_invalid_assignee_format_returns_400`]
  - [x] [AI-Review][MEDIUM] Add test for default sort order — `sort=updated` (newest first) is the most common call and has no coverage; add `test_list_tasks_default_sort_is_updated_at_descending` [backend/tests/test_tasks.py — missing test]
  - [x] [AI-Review][MEDIUM] Add `tests/test-summary.md` to story File List — file was modified in git but omitted from Dev Agent Record → File List [_bmad-output/implementation-artifacts/tests/test-summary.md]
  - [x] [AI-Review][LOW] Fix return type annotations on route handlers — all handlers annotate `-> TaskResponse` or `-> list[TaskResponse]` but actually return SQLAlchemy `Task` ORM objects; use `Task` as the return type or add a `# type: ignore` comment [backend/app/api/v1/tasks.py:50, 67, 84, 109]
  - [x] [AI-Review][LOW] Replace `@property` sub_tasks/daily_updates with SQLAlchemy `relationship()` placeholder — current `@property` approach will require a larger refactor in Epic 3 when actual tables are added [backend/app/models/task.py:39-45]
  - [x] [AI-Review][LOW] Set `app.state.testing_engine = engine` in `_build_test_client` — inconsistent with `test_members.py` pattern; limits ability to add direct DB manipulation tests in the future [backend/tests/test_tasks.py:16-41]
  - [x] [AI-Review][MEDIUM] Prevent `blocking_reason` from being persisted on non-Blocked tasks — PATCH `{"blocking_reason": "text"}` on a "To Do" task succeeds silently; router `_validate_blocked_status` only fires when status==Blocked, and auto-clear only fires when status is explicitly changed; should reject or ignore `blocking_reason` when status != "Blocked" [backend/app/api/v1/tasks.py:105-107, backend/app/crud/task.py:149-155]
  - [x] [AI-Review][MEDIUM] Add test for updating `blocking_reason` while task stays Blocked — `PATCH {"blocking_reason": "Updated reason"}` on a Blocked task exercises the `elif "blocking_reason" in update_data` branch (crud/task.py:154) but is completely untested; add `test_update_task_blocking_reason_updated_while_still_blocked` [backend/tests/test_tasks.py]
  - [x] [AI-Review][LOW] Remove dead `_validate_gear_id` call in `update_task` CRUD — router always validates `payload.gear_id` first (tasks.py:95) before calling CRUD, making the CRUD check at task.py:137 unreachable; keep the function but remove the call from `update_task` [backend/app/crud/task.py:136-138]
  - [x] [AI-Review][LOW] Remove dead `_validate_blocking_reason` call in `update_task` CRUD — router's `_validate_blocked_status` (tasks.py:107) always fires before `task_crud.update_task`, making crud.py:147 unreachable dead code for all PATCH paths [backend/app/crud/task.py:147]
  - [x] [AI-Review][LOW] Switch placeholder relationships to `lazy="noload"` to eliminate unnecessary queries — `lazy="selectin"` fires 2 extra SELECT queries on every list/get call even though sub_tasks and daily_updates always return []; use `lazy="noload"` to skip the queries entirely until Epic 3 adds real models [backend/app/models/task.py:41-56]
  - [x] [AI-Review][LOW] Unify enum unwrapping logic in `update_task` loop — `status` uses `isinstance(value, TaskStatus)` while `priority` uses `hasattr(value, "value")`; both Pydantic-validated fields are always enums at this point, use the same `isinstance` pattern for consistency [backend/app/crud/task.py:165-170]
- [x] Review Follow-ups (AI) — Round 3
  - [x] [AI-Review][MEDIUM] Escape LIKE metacharacters in search term — `%` and `_` in user search strings are interpreted as SQL wildcards; `search=%` matches all tasks, `search=_` matches any single-char title segment; use `ilike(..., escape="\\")` with `%`, `_` replaced by `\%`, `\_` before wrapping in `%...%` [backend/app/crud/task.py:68-75]
  - [x] [AI-Review][LOW] Remove dead functions `_validate_gear_id`, `_validate_blocking_reason`, and orphaned `_GEAR_ID_PATTERN` regex from CRUD module — all three are defined but never called after previous review removed the call sites; dead code adds confusion about whether CRUD independently validates [backend/app/crud/task.py:15-30]
  - [x] [AI-Review][LOW] Annotate `_handle_operational_error` with `-> NoReturn` — function always raises but is typed `-> None`, causing mypy/pyright to flag `task` as potentially unbound in `get_task`, `update_task`, and `delete_task` after the `except OperationalError` block [backend/app/api/v1/tasks.py:38]
  - [x] [AI-Review][LOW] Add test for whitespace-only title validation — `validate_title` strips and rejects `"   "` on both POST and PATCH, but no test covers this edge case [backend/tests/test_tasks.py]
  - [x] [AI-Review][LOW] Add test for empty PATCH body `{}` — should return the task unchanged without bumping `updated_at`; exercises the `if not update_data: return task` early-exit path in `update_task` [backend/tests/test_tasks.py]
  - [x] [AI-Review][LOW] Avoid unconditional `blocking_reason` write on Blocked-task PATCH — every PATCH on a Blocked task writes `blocking_reason` back to its current value even when the field was not in the request; add a guard: only set `blocking_reason` in `update_data` if it was explicitly provided or the status is changing [backend/app/crud/task.py:144-148]
- [x] Review Follow-ups (AI) — Round 5
  - [x] [AI-Review][MEDIUM] Unify status/priority passing from router to CRUD — `list_tasks` passes `status` as a `TaskStatus` enum but `priority` as a `str` (via `.value`); CRUD signature reflects this asymmetry; pick one convention (either both pass enum, or both pass `.value`) to make the interface predictable for future callers [backend/app/api/v1/tasks.py:56, backend/app/crud/task.py:43]
  - [x] [AI-Review][MEDIUM] Add test for `PATCH {"gear_id": "invalid"}` → 400 — router calls `_validate_gear_id` on PATCH but there is no test covering this path; add `test_update_task_invalid_gear_id_returns_400` [backend/tests/test_tasks.py — missing test]
  - [x] [AI-Review][LOW] Remove dead `if value is None: return None` branch in `TaskUpdate.validate_title` — `reject_explicit_null` runs with `mode="before"` and raises before `validate_title` can receive None; the branch is permanently unreachable [backend/app/schemas/task.py:59-61]
  - [x] [AI-Review][LOW] Change `sub_tasks`/`daily_updates` in `TaskResponse` from `list[object]` to `list[Any]` — `list[object]` is technically valid but semantically misleading; `list[Any]` makes the "type unknown until Epic 3" intent explicit and avoids Pydantic v2 serialization surprises when real items are added [backend/app/schemas/task.py:78-79]
  - [x] [AI-Review][LOW] Document LPE agent files in story File List — `_bmad/lpe/agents/lovable-prompt-engineer.agent.yaml` and `_bmad/lpe/agents/lovable-prompt-engineer.md` are untracked in the working tree but absent from Dev Agent Record → File List; add them or commit them separately to keep story 2.1's working tree attributable [story File List]
  - [x] [AI-Review][LOW] Strengthen `test_update_task_noop_status_patch_keeps_updated_at` datetime comparison — `assert after_update == before_update` compares `datetime.fromisoformat` results that may differ in timezone-awareness or precision between creation (SQLite `func.now()`) and subsequent read; normalize both to UTC string or truncate to seconds before comparing [backend/tests/test_tasks.py:501]
- [x] Review Follow-ups (AI) — Round 4
  - [x] [AI-Review][HIGH] `taskflow-ui/` files present in working tree violate story mandate — eslint.config.js, mock.ts, TaskDetail.tsx, and 3 new test files are modified/untracked in the working tree; story explicitly says "DO NOT touch taskflow-ui/"; these must NOT be staged with story 2.1's commit — confirm they belong to story 2.2 and keep them unstaged [taskflow-ui/eslint.config.js, taskflow-ui/src/lib/api/adapters/mock.ts, taskflow-ui/src/pages/TaskDetail.tsx, taskflow-ui/src/test/]
  - [x] [AI-Review][MEDIUM] Pydantic validation errors expose internal location path and "Value error," prefix — validators like `reject_explicit_null` produce `{"error": "body.title: Value error, title: field cannot be null"}` instead of a clean message; update `_stringify_validation_error` to strip the `body.` prefix from the location and strip the `Value error, ` prefix from the message [backend/app/core/exceptions.py:12-20, backend/app/schemas/task.py:51-55]
  - [x] [AI-Review][MEDIUM] Spurious `updated_at` bump when PATCH sets a field to its current value — `PATCH {"blocking_reason": ""}` on a non-Blocked task (where blocking_reason is already "") and `PATCH {"status": "To Do"}` on an already-To-Do task both bypass the early-return guard and still bump `updated_at`; add a pre-commit equality check or absorb no-op writes before reaching the `updated_at` refresh [backend/app/crud/task.py:124-125, 137-138, 159]
  - [x] [AI-Review][MEDIUM] Missing test for `POST /tasks` with non-Blocked status and non-empty `blocking_reason` — verify the CRUD silently clears it to `""` in the response (the PATCH equivalent is tested but the POST path is not) [backend/tests/test_tasks.py]
  - [x] [AI-Review][MEDIUM] `_bmad/_config/agent-manifest.csv` and `bmad-help.csv` appear modified in git working tree but are absent from story File List — document or separate them in a dedicated commit if they are unrelated tooling changes [_bmad/_config/agent-manifest.csv, _bmad/_config/bmad-help.csv]
  - [x] [AI-Review][LOW] Four validation-error tests use imprecise `in (400, 422)` assertions — the `validation_exception_handler` always returns 400; change all four to `== 400` for consistency with peer tests and to catch future regressions [backend/tests/test_tasks.py:117, 126, 145, 154]
  - [x] [AI-Review][LOW] Fake self-referential `sub_tasks`/`daily_updates` relationships need a "do not touch lazy" guard comment — the unsatisfiable `1=0` join + `lazy="noload"` + `overlaps` suppression is functional but will silently break if `lazy` is changed; add a comment warning developers not to change `lazy` until Epic 3 replaces these with real models [backend/app/models/task.py:41-56]
  - [x] [AI-Review][LOW] `test_update_task_blocked_title_patch_preserves_existing_blocking_reason` tests an unreachable DB state — it directly inserts a Task with spaced `blocking_reason="  Keep spacing  "` that the API would never produce; either replace with an API-reachable scenario or add a comment explaining why direct DB insertion is necessary [backend/tests/test_tasks.py:516-537]
  - [x] [AI-Review][LOW] No-op status PATCH still bumps `updated_at` — `PATCH {"status": "Blocked"}` on an already-Blocked task still refreshes `updated_at`; add a test documenting whether this is intentional behavior or add a guard to skip the update when no effective field change occurred [backend/app/crud/task.py:127-161]
- [x] Review Follow-ups (AI) — Round 7
  - [x] [AI-Review][MEDIUM] Add test for `PATCH /tasks/{id}` with non-existent `assignee_id` → 400 "Assignee not found"; POST path has `test_create_task_with_nonexistent_assignee_returns_400` but the PATCH path is untested; add `test_update_task_nonexistent_assignee_returns_400` [backend/tests/test_tasks.py]
  - [x] [AI-Review][MEDIUM] Guard whitespace-only `search` values in `list_tasks` — `GET /tasks?search=   ` strips to `""`, produces `%%` ILIKE that matches all tasks instead of applying no filter (or returning no results); change `if search:` to `if search and search.strip():` [backend/app/crud/task.py:67]
  - [x] [AI-Review][LOW] Rename misleading test functions — `test_create_task_invalid_status_returns_422` (line 149) and `test_create_task_invalid_priority_returns_422` (line 158) both assert `== 400`; rename to `_returns_400` to match actual expectation [backend/tests/test_tasks.py:149,158]
  - [x] [AI-Review][LOW] Add tests for `PATCH {"status": null}` → 400 and `PATCH {"priority": null}` → 400; `reject_explicit_null` covers all three fields but only `title=null` has a dedicated test; add `test_update_task_explicit_null_status_returns_400` and `test_update_task_explicit_null_priority_returns_400` [backend/tests/test_tasks.py]
  - [x] [AI-Review][LOW] Add test for `PATCH {"description": null}` to clear description → 200 with `description: null`; the functionality works (TaskUpdate allows null, CRUD effective-update logic handles it) but is completely untested; add `test_update_task_clear_description_to_null` [backend/tests/test_tasks.py]
  - [x] [AI-Review][LOW] Tighten `list_tasks` CRUD `sort` type annotation from `str` to `Literal["updated", "priority", "status"]` — router enforces the constraint but CRUD signature allows any string; add `from typing import Literal` import and update the parameter type [backend/app/crud/task.py:47]
  - [x] [AI-Review][LOW] Add sub-second timing guard to `test_list_tasks_default_sort_is_updated_at_descending` — test relies on monotonic `datetime.now()` across three rapid sequential operations with no sleep; add `time.sleep(0.01)` between the second `_create_task` call and the PATCH to ensure the patched `updated_at` is strictly greater than the second task's `created_at` [backend/tests/test_tasks.py:419-429]
- [x] Review Follow-ups (AI) — Round 6
  - [x] [AI-Review][MEDIUM] Add test for `PATCH {"blocking_reason": ""}` (or whitespace-only `"  "`) on a Blocked task → `400 {"error": "Blocking reason is required when status is Blocked"}`; `_validate_blocked_status` fires via `resolved_blocking_reason` in the router but this path is completely untested [backend/tests/test_tasks.py — add `test_update_task_clearing_blocking_reason_on_blocked_task_returns_400`]
  - [x] [AI-Review][LOW] Fix fragile datetime comparison in `test_update_task_refreshes_updated_at` — `before_update` is parsed from a SQLite `server_default=func.now()` timestamp (may be naive) while `after_update` is from `datetime.now(timezone.utc)` stored as UTC-aware; Python raises `TypeError` on naive vs aware `>` comparison on some configurations; replace the direct `>` comparison with `_normalize_utc_second` (already defined in the file) after asserting the normalized strings differ [backend/tests/test_tasks.py:499-503]
  - [x] [AI-Review][LOW] Remove redundant anchors from `_GEAR_ID_PATTERN` — `re.compile(r"^\d{4}$")` is used with `.fullmatch()` which already anchors at both ends; `^` and `$` are permanently dead; change to `re.compile(r"\d{4}")` [backend/app/api/v1/tasks.py:18]
  - [x] [AI-Review][LOW] Add guard for unknown `sort` values in `list_tasks()` CRUD — the `else` branch silently defaults to `updated_at DESC` for any unrecognized sort string; while the router's `Literal` type prevents invalid HTTP values, direct CRUD callers get silent misbehavior; add `raise ValueError(f"Invalid sort value: {sort!r}")` in the `else` branch [backend/app/crud/task.py:47, 94-95]
  - [x] [AI-Review][LOW] Add test for clearing `gear_id` to `null` via PATCH — `PATCH {"gear_id": null}` should return 200 with `gear_id: null`; `_validate_gear_id(None)` returns immediately and CRUD stores `None`, but this path is completely untested [backend/tests/test_tasks.py — add `test_update_task_clear_gear_id_to_null`]
  - [x] [AI-Review][LOW] Capture missing text search index as Tech Debt — `ILIKE '%term%'` search on `title`, `description`, `gear_id` does full table scans in PostgreSQL; migration creates `idx_tasks_status` and `idx_tasks_assignee_id` but no text index; acceptable for Epic 2 scale, but should be noted for Epic 4 or a dedicated performance story [backend/alembic/versions/20260217_0002_add_tasks_table.py:58-59]
- [x] Review Follow-ups (AI) — Round 8
  - [x] [AI-Review][MEDIUM] Add regression test for whitespace-only search guard — Round 7 added `if search and search.strip():` to prevent whitespace-only `search` from producing `%%` ILIKE that matches all tasks, but no test was written to protect this guard; add `test_list_tasks_whitespace_only_search_returns_all_tasks` asserting `GET /api/v1/tasks?search=   ` returns all tasks without applying a filter [backend/app/crud/task.py:68, backend/tests/test_tasks.py — missing test]
  - [x] [AI-Review][LOW] Add test for `PATCH {"blocking_reason": null}` on Blocked task → 400 — `test_update_task_clearing_blocking_reason_on_blocked_task_returns_400` tests `""` and `"   "` but not JSON `null`; the router correctly resolves `resolved_blocking_reason = None` → `_validate_blocked_status` raises 400, but the path is untested; add `test_update_task_null_blocking_reason_on_blocked_task_returns_400` [backend/tests/test_tasks.py — missing test]
  - [x] [AI-Review][LOW] Add test for `POST /tasks` with Blocked status and whitespace-only `blocking_reason` → 400 — `test_create_task_blocked_without_reason_returns_400` only covers `blocking_reason: ""` and the missing-field case; `POST {"status": "Blocked", "blocking_reason": "   "}` should return 400 but is untested; add `test_create_task_blocked_with_whitespace_only_reason_returns_400` [backend/tests/test_tasks.py — missing test]
  - [x] [AI-Review][LOW] Add test for invalid `status`/`priority` query filter values — `GET /api/v1/tasks?status=InvalidValue` triggers Pydantic query-param validation failure → `validation_exception_handler` → 400; this path is exercised for POST body params but never for query params; add `test_list_tasks_invalid_status_filter_returns_400` [backend/tests/test_tasks.py — missing test]
  - [x] [AI-Review][LOW] Assign `search.strip()` to a local variable in `list_tasks` — `search.strip()` is called twice: once in the guard condition and once inside `_escape_like_term(...)`; assign `stripped = search.strip()` once and reuse it [backend/app/crud/task.py:68-69]
- [ ] Review Follow-ups (AI) — Round 9
  - [ ] [AI-Review][LOW] Add `__table_args__` index definitions to `Task` model — `idx_tasks_status` and `idx_tasks_assignee_id` exist in the migration but not in the SQLAlchemy model; future `alembic revision --autogenerate` runs will see these indexes in the DB without a model declaration and may emit spurious `DROP INDEX` statements [backend/app/models/task.py]
  - [ ] [AI-Review][LOW] Add max-length to `blocking_reason` DB column — `String()` without a length arg creates an unlimited VARCHAR; every other text column has an explicit cap (`title` 200, `description` 2000, etc.); add a reasonable bound (e.g., `String(1000)`) with a matching migration and schema `max_length` constraint [backend/alembic/versions/20260217_0002_add_tasks_table.py:47, backend/app/models/task.py:35]
  - [ ] [AI-Review][LOW] Add strip validator for `description` field — `title` is stripped and rejects whitespace-only values but `description` has no equivalent validator; `POST/PATCH {"description": "   "}` stores three spaces as a non-empty description, which appears blank to the user; add a strip-and-none-coerce validator to `TaskCreate` and `TaskUpdate` [backend/app/schemas/task.py:26,43]
  - [ ] [AI-Review][LOW] Document or fix `POST` body `{"blocking_reason": null}` behavior — `TaskCreate.blocking_reason: str = ""` rejects `null` with Pydantic's generic "Input should be a valid string" while `TaskUpdate.blocking_reason: str | None` accepts `null`; the asymmetry can confuse API consumers; either coerce `null → ""` on POST (change to `str | None = None` + validator) or add an explicit note in the schema docstring [backend/app/schemas/task.py:31]
  - [ ] [AI-Review][LOW] Add test for combined multi-filter `GET /tasks` — all filter tests use a single query parameter; add `test_list_tasks_combined_status_and_priority_filter` that sends `?status=To+Do&priority=High` and asserts only tasks matching BOTH criteria are returned [backend/tests/test_tasks.py — missing test]
  - [ ] [AI-Review][LOW] Add test for `PATCH {"status": "In Progress", "blocking_reason": "text"}` on Blocked task → blocking_reason auto-cleared — the unblock auto-clear is tested without the explicit `blocking_reason` field; when both are present, the `if next_status != BLOCKED: update_data["blocking_reason"] = ""` branch fires first, overwriting the explicit value; add `test_update_task_unblock_with_explicit_blocking_reason_clears_it` [backend/tests/test_tasks.py — missing test]
  - [ ] [AI-Review][LOW] Reduce `time.sleep(1.1)` in `test_update_task_refreshes_updated_at` — the 1.1-second sleep is required because `_normalize_utc_second` truncates to whole seconds; if the comparison switched to millisecond precision (e.g., truncating to `microsecond=0` but keeping the full ISO string) the sleep could be reduced to `time.sleep(0.05)` matching the pattern used elsewhere [backend/tests/test_tasks.py:550]

## Dev Notes

### Developer Context

- **Track:** Backend (CLI AI tools). Do NOT touch `taskflow-ui/`.
- **Epic dependency:** Epic 1 is complete — `members` table exists with `id`, `name`, `email`, `active` columns.
- **Epic 3 dependency:** Sub-tasks (`sub_tasks`) and daily updates (`daily_updates`) tables do NOT exist yet. The Task model may define empty relationship placeholders but the embedded arrays in responses must return `[]` for now (implemented via `@property` or default fields in the schema). Do NOT attempt to create sub_tasks or daily_updates tables in this story.
- **`count_assigned_tasks` in `crud/member.py`** uses a forward-reference table (`_TASKS_TABLE`) that gracefully returns 0 when the tasks table is missing. Once this story's migration runs, the FK check will automatically activate — no changes needed in `crud/member.py`.
- This story is the most complex backend story so far. Read every AC carefully before implementing.

### Technical Requirements

- **Database ENUM values** must exactly match the API_CONTRACT.md strings (including spaces):
  - `status`: `"To Do"`, `"In Progress"`, `"Blocked"`, `"Done"` (native PostgreSQL ENUM type recommended: `task_status`)
  - `priority`: `"High"`, `"Medium"`, `"Low"` (native PostgreSQL ENUM: `task_priority`)
- **`blocking_reason` column**: `VARCHAR`, NOT NULL, `server_default=""` (empty string, not null — per API_CONTRACT.md)
- **`updated_at` column**: Use `server_default=func.now()` on the column for DB-level insert default. In the CRUD `update_task()` function, explicitly set `task.updated_at = datetime.now(timezone.utc)` before `db.commit()` — do NOT rely on `onupdate` alone (SQLAlchemy `onupdate` is ORM-layer only and may not fire reliably in all update paths). For this story, only task mutations are in scope; Epic 3 sub_task/daily_update mutations will also refresh `updated_at`.
- **GEAR ID validation**: regex `/^\d{4}$/` — exactly 4 digits, no letters. Error: `{"error": "GEAR ID must be exactly 4 digits"}`.
- **Blocked status validation**: if `status == "Blocked"` and `blocking_reason` is empty string or None → `400` `{"error": "Blocking reason is required when status is Blocked"}`.
- **Auto-clear blocking_reason**: on any PATCH that changes status away from `"Blocked"` (to any other value), unconditionally set `blocking_reason = ""` regardless of whether it was included in the request.
- **Assignee resolution**: when `assignee_id` is set, query `members` table for `name` and store in `assignee_name`. If member not found → `400` `{"error": "Assignee not found"}`. When `assignee_id` is explicitly set to `null` → set `assignee_name = null`.
- **Sort order for `priority`**: High=1, Medium=2, Low=3 (ascending sort produces High → Medium → Low as specified).
- **Sort order for `status`**: To Do=1, In Progress=2, Blocked=3, Done=4 (ascending).
- **Default sort**: `updated` = descending `updated_at` (most recently updated first).
- **Search**: `ILIKE '%search_term%'` on `title`, `description`, `gear_id` — OR logic between fields.
- **`assignee` filter**: accepts UUID string (exact `assignee_id` match) or the literal string `"unassigned"` (filter `assignee_id IS NULL`).
- **Atomicity (NFR14)**: use `db.commit()` only after all mutations are complete in a given operation. Do not commit partial writes. Use `db.rollback()` on exception.
- **Parameterized queries (NFR8)**: use SQLAlchemy ORM or `select()` constructs only — never f-strings or % formatting in SQL.
- **FR45 (input preservation)**: on connection error (e.g., `OperationalError`), return `503 Service Unavailable` with `{"error": "Database connection lost. Please retry."}` so the frontend can preserve user input.

### Architecture Compliance

- Router file: `backend/app/api/v1/tasks.py` — one file per API resource (mirrors `members.py`).
- CRUD module: `backend/app/crud/task.py` — one module per resource.
- Model: `backend/app/models/task.py` — one model per file.
- Schema: `backend/app/schemas/task.py` — contains `TaskCreate`, `TaskUpdate`, `TaskResponse` (and enums).
- **Error responses**: ALL errors must return `{"error": "message"}` — never `{"detail": "..."}` (FastAPI default). This is already handled by the global exception handlers in `app/core/exceptions.py` for `HTTPException`.
- **Backend binds to 127.0.0.1 only** — no changes needed for this story.
- Register the tasks router in `backend/app/api/v1/api.py`:
  ```python
  from app.api.v1.tasks import router as tasks_router
  api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
  ```
- Import `Task` model in `backend/app/models/__init__.py` for Alembic autogenerate to work.

### Library / Framework Requirements

- **SQLAlchemy 2.x** with `Mapped` / `mapped_column` pattern (mirror `models/member.py` exactly).
- **Pydantic v2** with `model_config = ConfigDict(from_attributes=True)` on response schemas.
- **Alembic** for migration. Use `uv run alembic revision --autogenerate -m "add_tasks_table"` as a starting point, then verify and adjust the generated migration.
- **PostgreSQL native ENUM types** via `sa.Enum("To Do", "In Progress", "Blocked", "Done", name="task_status")` — preferred over VARCHAR with Python-side validation for DB-level integrity.
- **uv** for all Python commands: `uv run pytest`, `uv run alembic upgrade head`, etc. Never use `pip` or `python` directly.
- Do NOT add new Python packages. Everything needed is already in `pyproject.toml` (FastAPI, SQLAlchemy, Pydantic, Alembic, psycopg2, cryptography).

### File Structure Requirements

**Files to create:**
- `backend/app/models/task.py` — SQLAlchemy `Task` model
- `backend/app/schemas/task.py` — Pydantic schemas + enums
- `backend/app/crud/task.py` — CRUD operations
- `backend/app/api/v1/tasks.py` — FastAPI router
- `backend/alembic/versions/XXXX_add_tasks_table.py` — migration

**Files to update:**
- `backend/app/models/__init__.py` — add `from app.models.task import Task`
- `backend/app/api/v1/api.py` — include `tasks_router` with prefix `/tasks`

**Files to create (tests):**
- `backend/tests/test_tasks.py` — comprehensive task API tests

**Files NOT to touch:**
- Anything under `taskflow-ui/` — this is a Backend story
- `backend/app/crud/member.py` — the `count_assigned_tasks` forward-reference is correct as-is
- `backend/app/models/member.py` — no changes needed

### Testing Requirements

#### ⚠️ Critical: Test Infrastructure Pattern

Tests use **SQLite in-memory** (NOT PostgreSQL). Each test function calls `_build_test_client()` locally — there are NO shared pytest fixtures. Copy this exact pattern from `tests/test_members.py`:

```python
from __future__ import annotations
import uuid
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app import models  # noqa: F401 — MUST import to register all models with Base.metadata
from app.api.deps import get_db
from app.db.base import Base
from app.main import create_app

def _build_test_client() -> TestClient:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    @event.listens_for(engine, "connect")
    def _register_sqlite_functions(dbapi_connection, _connection_record) -> None:
        dbapi_connection.create_function("gen_random_uuid", 0, lambda: uuid.uuid4().hex)
    testing_session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    app = create_app()
    def override_get_db():
        db = testing_session_factory()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)
```

**SQLite ENUM note**: Use `sa.Enum("To Do", "In Progress", "Blocked", "Done", name="task_status")` — SQLAlchemy automatically falls back to VARCHAR on SQLite. Do NOT use `ARRAY`, `JSON`, or PostgreSQL-specific types in `models/task.py`.

Also create helper functions in `test_tasks.py`:
```python
def _create_member(client, **overrides) -> dict:
    payload = {"name": "Alice Chen", "email": "alice@example.com", "active": True}
    payload.update(overrides)
    r = client.post("/api/v1/members", json=payload)
    assert r.status_code == 201
    return r.json()

def _create_task(client, **overrides) -> dict:
    payload = {"title": "Test task", "status": "To Do", "priority": "Medium"}
    payload.update(overrides)
    r = client.post("/api/v1/tasks", json=payload)
    assert r.status_code == 201
    return r.json()
```

The test file `backend/tests/test_tasks.py` must cover the following cases (aiming for 20+ tests):

```
POST /tasks
  - test_create_task_valid_minimal (title, status, priority only)
  - test_create_task_valid_full (all fields including assignee_id, gear_id)
  - test_create_task_returns_201_with_sub_tasks_and_daily_updates_empty
  - test_create_task_missing_title_returns_400
  - test_create_task_title_too_long_returns_400
  - test_create_task_invalid_status_returns_422
  - test_create_task_invalid_priority_returns_422
  - test_create_task_invalid_gear_id_returns_400
  - test_create_task_blocked_without_reason_returns_400
  - test_create_task_blocked_with_reason_succeeds
  - test_create_task_with_nonexistent_assignee_returns_400
  - test_create_task_resolves_assignee_name

GET /tasks
  - test_list_tasks_empty
  - test_list_tasks_returns_all
  - test_list_tasks_filter_by_status
  - test_list_tasks_filter_by_priority
  - test_list_tasks_filter_by_assignee_uuid
  - test_list_tasks_filter_by_unassigned
  - test_list_tasks_search_by_title
  - test_list_tasks_search_by_gear_id
  - test_list_tasks_sort_by_priority
  - test_list_tasks_sort_by_status

GET /tasks/{id}
  - test_get_task_exists
  - test_get_task_not_found_returns_404

PATCH /tasks/{id}
  - test_update_task_partial_update
  - test_update_task_blocking_reason_auto_cleared_on_unblock
  - test_update_task_assignee_re_resolved_on_reassign
  - test_update_task_assignee_cleared_to_null
  - test_update_task_not_found_returns_404

DELETE /tasks/{id}
  - test_delete_task_returns_204
  - test_delete_task_not_found_returns_404
```

**Required checks before moving to `review`:**
```
uv run pytest backend/tests/test_tasks.py -v
uv run pytest   # full suite must still pass (no regressions in members, health, settings tests)
uv run alembic upgrade head  # migration must apply cleanly
uv run alembic downgrade -1  # migration must reverse cleanly
```

### Previous Story Intelligence

#### From Story 1.2 (Member Management API)

- **Model pattern** (`models/member.py`): Use `from __future__ import annotations`, import `uuid`, `sa`, `Mapped`, `mapped_column`. Use `Uuid` type with `server_default=sa.text("gen_random_uuid()")`. Apply `__table_args__` for constraints.
- **CRUD pattern** (`crud/member.py`): Use `select(Model)`, `db.scalars()`, `db.commit()`, `db.refresh()`. For `update_*`: use `payload.model_dump(exclude_unset=True)`.
- **Router pattern** (`api/v1/members.py`): Use `Depends(get_db)`, `HTTPException(status_code=..., detail="message")`. Return type annotations on all route functions.
- **Test pattern**: Tests use pytest fixtures from `conftest.py` (test DB, TestClient). Follow `test_{action}_{scenario}` naming.

#### From Story 1.3 (Credential Encryption & Settings API)

- **`get_db` dependency** is in `backend/app/api/deps.py` — import from there.
- **`app/main.py`** registers exception handlers in `core/exceptions.py` that normalize `HTTPException.detail` to `{"error": "..."}`. Raising `HTTPException(status_code=400, detail="Blocking reason is required...")` will automatically produce the correct error shape — no manual `JSONResponse` needed.

#### From Story 1.4 (Frontend Adapter Pattern)

- `crud/member.py` has a forward-reference shim (`_TASKS_TABLE`) that queries `tasks.assignee_id` safely even before the migration runs. Once story 2.1's migration runs, the `count_assigned_tasks` guard becomes fully active. No changes needed.

#### From Story 1.5 (Functional Settings Page)

- **Review insight**: keep type annotations strict, avoid `Any` in error handling.
- **Pattern for error catches**: `err instanceof Error`-equivalent in Python → `except Exception as exc:` with `raise HTTPException(...)` from `exc`.

### Git Intelligence Summary

Recent commits (as of 2026-02-17):
- `acd0f3c feat(lpe): add Lovable Prompt Engineer agent` — new tooling, no backend impact
- `0a53083 Merge subtree changes` — taskflow-ui subtree updates
- `2409fc3 fix(api): update functional settings page status` — sprint-status housekeeping
- `1d45589 feat(api): implement adapter pattern for story 1.4` — confirmed backend patterns stable

**Takeaway**: Backend codebase is stable. Follow established SQLAlchemy 2.x, Pydantic v2, and FastAPI patterns exactly.

### Project Structure Notes

- `backend/app/models/__init__.py` must import `Task` for Alembic autogenerate to detect the model.
- `backend/app/api/v1/api.py` currently includes only `members` and `settings` routers — add `tasks` router.
- No `project-context.md` found; planning artifacts and story file provide sufficient context.
- `tasks.py` must go in `backend/app/api/v1/` (not `api.py` which is the aggregator).
- Test conftest.py sets up test client with SQLite (in-memory) — ENUM types must handle SQLite fallback gracefully if tests use SQLite. Check `conftest.py` for DB setup before choosing PostgreSQL-native vs SQLAlchemy-agnostic ENUM.

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.1 requirements and acceptance criteria
- `_bmad-output/planning-artifacts/architecture.md` — Backend project structure, naming conventions, CRUD/Router/Schema patterns, error response format
- `taskflow-ui/API_CONTRACT.md` — Canonical field names, HTTP methods, query parameters, response shapes
- `_bmad-output/planning-artifacts/prd.md` — FR1–FR11, FR45, NFR8, NFR14
- `backend/app/models/member.py` — SQLAlchemy model pattern to follow exactly
- `backend/app/crud/member.py` — CRUD pattern + forward-reference shim (already handles tasks FK)
- `backend/app/api/v1/members.py` — Router pattern to follow
- `backend/app/api/v1/api.py` — Router aggregator to update
- `backend/app/schemas/member.py` — Pydantic schema pattern
- `backend/tests/test_members.py` — Test pattern and conftest.py fixtures
- `_bmad-output/implementation-artifacts/epic-1-retro-2026-02-17.md` — Key learnings from Epic 1

## Dev Agent Record

### Agent Model Used

gpt-5-codex (Codex CLI)

### Debug Log References

- Implemented migration: `backend/alembic/versions/20260217_0002_add_tasks_table.py`.
- Implemented model/schema/crud/router files for tasks API and registered router.
- Verified migration commands:
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check.db uv run alembic upgrade head`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check.db uv run alembic downgrade -1`
- Verified tests:
  - `uv run pytest tests/test_tasks.py -v` (47 passed)
  - `uv run pytest -q` (81 passed)
- Re-verified migration commands:
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check.db uv run alembic upgrade head`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check.db uv run alembic downgrade -1`
- Round 4 validation commands:
  - `uv run pytest tests/test_tasks.py -q`
  - `uv run pytest -q`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round4.db uv run alembic upgrade head`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round4.db uv run alembic downgrade -1`
- Final completion validation:
  - `uv run pytest -q` (84 passed)
- Round 5 validation commands:
  - `uv run python -m pytest tests/test_tasks.py -q` (51 passed)
  - `uv run python -m pytest -q` (85 passed)
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round5.db uv run alembic upgrade head`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round5.db uv run alembic downgrade -1`
- Round 6 validation commands:
  - `uv run pytest tests/test_tasks.py -q` (53 passed)
  - `uv run pytest -q` (87 passed)
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round6.db uv run alembic upgrade head`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round6.db uv run alembic downgrade -1`
- Round 7 validation commands:
  - `uv run pytest tests/test_tasks.py -q` (57 passed)
  - `uv run pytest -q` (91 passed)
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round7.db uv run alembic upgrade head`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round7.db uv run alembic downgrade -1`
- Round 8 validation commands:
  - `uv run pytest tests/test_tasks.py -q` (62 passed)
  - `uv run pytest -q` (96 passed)
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round8_seq.db uv run alembic upgrade head`
  - `UV_CACHE_DIR=/tmp/uv-cache PYTHONPATH=. TASKFLOW_DATABASE_URL=sqlite+pysqlite:////tmp/taskflow_migration_check_round8_seq.db uv run alembic downgrade -1`

### Completion Notes List

- Added `tasks` DB migration with `task_status`/`task_priority` enums, FK (`fk_tasks_assignee_id`), and indexes (`idx_tasks_status`, `idx_tasks_assignee_id`).
- Added `Task` SQLAlchemy model and imported it in `backend/app/models/__init__.py`.
- Added Pydantic task schemas with enums and response hydration via `from_attributes`.
- Added task CRUD operations for list/get/create/update/delete with filters, search, sort, assignee resolution, blocking/GEAR validations, and `updated_at` refresh.
- Added tasks API router (`GET/POST/PATCH/DELETE`) with endpoint-layer validation and `503` handling for DB operational errors (`Database connection lost. Please retry.`).
- Registered tasks router in API aggregator.
- Completed task API test coverage in `backend/tests/test_tasks.py` and updated two member tests to align with the introduced `tasks` schema.
- ✅ Resolved review finding [HIGH]: Added `test_list_tasks_search_by_description` to cover search on `description`.
- ✅ Resolved review finding [MEDIUM]: Removed duplicate `create_task` gear ID validation in CRUD; kept router as create-path validator.
- ✅ Resolved review finding [MEDIUM]: Removed duplicate `create_task` blocked-reason validation in CRUD; kept router as create-path validator.
- ✅ Resolved review finding [MEDIUM]: Strengthened `updated_at` refresh test to assert timestamp changes after PATCH.
- ✅ Resolved review finding [MEDIUM]: Added invalid `assignee` filter format coverage (`400`).
- ✅ Resolved review finding [MEDIUM]: Added default sort coverage verifying `updated_at` descending behavior.
- ✅ Resolved review finding [LOW]: Updated tasks route handler return type annotations to ORM `Task`.
- ✅ Resolved review finding [LOW]: Replaced placeholder `@property` fields with SQLAlchemy `relationship()` placeholders that remain empty in Epic 2.
- ✅ Resolved review finding [LOW]: Set `app.state.testing_engine` in task test client builder for parity with member tests.
- ✅ Resolved review finding [MEDIUM]: Prevented `blocking_reason` persistence for non-Blocked tasks and added regression coverage.
- ✅ Resolved review finding [MEDIUM]: Added `test_update_task_blocking_reason_updated_while_still_blocked`.
- ✅ Resolved review finding [LOW]: Removed dead `_validate_gear_id` call from `update_task` CRUD path.
- ✅ Resolved review finding [LOW]: Removed dead `_validate_blocking_reason` call from `update_task` CRUD path.
- ✅ Resolved review finding [LOW]: Changed placeholder relationships to `lazy="noload"` to avoid unnecessary query overhead.
- ✅ Resolved review finding [LOW]: Unified enum unwrapping in `update_task` to explicit `isinstance` checks for both status and priority.
- ✅ Resolved review finding [MEDIUM]: Escaped SQL LIKE metacharacters in task search and added wildcard-escaping coverage for `%` and `_`.
- ✅ Resolved review finding [LOW]: Removed dead CRUD validation helpers/constants (`_validate_gear_id`, `_validate_blocking_reason`, `_GEAR_ID_PATTERN`).
- ✅ Resolved review finding [LOW]: Updated `_handle_operational_error` annotation to `NoReturn`.
- ✅ Resolved review finding [LOW]: Added whitespace-only title validation tests for both create and patch paths.
- ✅ Resolved review finding [LOW]: Added empty PATCH payload coverage to verify unchanged response and `updated_at`.
- ✅ Resolved review finding [LOW]: Guarded Blocked-task PATCH flow to avoid unconditional `blocking_reason` rewrites when status is unchanged and reason not provided.
- ✅ Resolved review finding [HIGH]: Confirmed `taskflow-ui/` working-tree changes belong to Story 2.2 and remained unstaged/unmodified during Story 2.1 Round 4 fixes.
- ✅ Resolved review finding [MEDIUM]: Cleaned validation error formatting by removing `body.` location prefix and `Value error, ` prefix in API error output.
- ✅ Resolved review finding [MEDIUM]: Prevented no-op PATCH updates from bumping `updated_at` by applying effective-change detection before commit.
- ✅ Resolved review finding [MEDIUM]: Added `test_create_task_non_blocked_with_reason_is_cleared` for POST path parity.
- ✅ Resolved review finding [MEDIUM]: Documented `_bmad/_config/agent-manifest.csv` and `_bmad/_config/bmad-help.csv` as existing working-tree changes in this story record.
- ✅ Resolved review finding [LOW]: Tightened four validation-status assertions from `in (400, 422)` to exact `== 400`.
- ✅ Resolved review finding [LOW]: Added explicit guard comment on placeholder `sub_tasks`/`daily_updates` relationships to keep `lazy="noload"` until Epic 3.
- ✅ Resolved review finding [LOW]: Added explanatory comment in `test_update_task_blocked_title_patch_preserves_existing_blocking_reason` for intentional direct-DB setup.
- ✅ Resolved review finding [LOW]: Added `test_update_task_noop_status_patch_keeps_updated_at` to lock no-op status behavior.
- ✅ Resolved follow-on regression: Updated two member tests to match normalized validation error format (`name/email: field cannot be null`).
- ✅ Resolved review finding [MEDIUM]: Unified `status` and `priority` filter passing from router to CRUD using enum inputs for both.
- ✅ Resolved review finding [MEDIUM]: Added `test_update_task_invalid_gear_id_returns_400` to cover PATCH gear ID validation.
- ✅ Resolved review finding [LOW]: Removed unreachable `if value is None` branch from `TaskUpdate.validate_title`.
- ✅ Resolved review finding [LOW]: Updated `TaskResponse.sub_tasks` and `TaskResponse.daily_updates` typing from `list[object]` to `list[Any]`.
- ✅ Resolved review finding [LOW]: Added LPE agent files to story File List for working-tree attribution.
- ✅ Resolved review finding [LOW]: Strengthened no-op status PATCH timestamp comparison via UTC-second normalization in test assertions.
- ✅ Resolved review finding [MEDIUM]: Added blocked-task validation coverage for clearing/whitespace `blocking_reason` in PATCH (`400` expected).
- ✅ Resolved review finding [LOW]: Stabilized `test_update_task_refreshes_updated_at` with UTC-second normalization and deterministic delay to avoid same-second flakes.
- ✅ Resolved review finding [LOW]: Simplified `_GEAR_ID_PATTERN` to remove dead anchors while keeping `.fullmatch()` behavior unchanged.
- ✅ Resolved review finding [LOW]: Added explicit `ValueError` for unknown CRUD `sort` values to protect direct non-router callers from silent fallback behavior.
- ✅ Resolved review finding [LOW]: Added PATCH coverage for clearing `gear_id` to `null`.
- ✅ Captured tech debt: add PostgreSQL text-search indexing for `tasks` search fields (`title`, `description`, `gear_id`) in Epic 4 or dedicated performance follow-up.
- ✅ Resolved review finding [MEDIUM]: Added PATCH coverage for non-existent `assignee_id` returning `400 Assignee not found`.
- ✅ Resolved review finding [MEDIUM]: Guarded `list_tasks` whitespace-only `search` input to avoid unintended wildcard-all matching.
- ✅ Resolved review finding [LOW]: Renamed invalid status/priority create tests to `_returns_400` to match asserted behavior.
- ✅ Resolved review finding [LOW]: Added explicit-null PATCH coverage for `status` and `priority`.
- ✅ Resolved review finding [LOW]: Added PATCH coverage for clearing `description` to `null`.
- ✅ Resolved review finding [LOW]: Tightened CRUD `sort` annotation to `Literal["updated", "priority", "status"]`.
- ✅ Resolved review finding [LOW]: Added sub-second timing guard to default-sort test for deterministic timestamp ordering.
- ✅ Resolved review finding [MEDIUM]: Added whitespace-only search regression coverage via `test_list_tasks_whitespace_only_search_returns_all_tasks`.
- ✅ Resolved review finding [LOW]: Added Blocked-task null `blocking_reason` PATCH coverage (`400` expected).
- ✅ Resolved review finding [LOW]: Added create-path coverage for Blocked status with whitespace-only `blocking_reason` (`400` expected).
- ✅ Resolved review finding [LOW]: Added invalid query filter coverage for both `status` and `priority` values (`400` expected).
- ✅ Resolved review finding [LOW]: Refactored `list_tasks` to reuse a local stripped-search variable before wildcard escaping.

### File List

- backend/alembic/versions/20260217_0002_add_tasks_table.py
- backend/app/models/task.py
- backend/app/models/__init__.py
- backend/app/schemas/task.py
- backend/app/crud/task.py
- backend/app/core/exceptions.py
- backend/app/api/v1/tasks.py
- backend/app/api/v1/api.py
- backend/tests/test_tasks.py
- backend/tests/test_members.py
- _bmad/_config/agent-manifest.csv
- _bmad/_config/bmad-help.csv
- _bmad-output/implementation-artifacts/2-1-task-management-api-crud-business-logic.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/tests/test-summary.md
- _bmad/lpe/agents/lovable-prompt-engineer.agent.yaml
- _bmad/lpe/agents/lovable-prompt-engineer.md

### Change Log

- 2026-02-18: Implemented Story 2.1 tasks backend (migration, model, schemas, CRUD, API router), completed tests, and moved story to `review`.
- 2026-02-18: Addressed code review findings - 10 items resolved (1 High, 6 Medium, 3 Low).
- 2026-02-18: Second code review pass — 6 new action items added (2 Medium, 4 Low); story remains in-progress pending resolution.
- 2026-02-18: Addressed second code review pass - 6 items resolved (2 Medium, 4 Low); story returned to `review`.
- 2026-02-18: Third code review pass — 6 new action items added (1 Medium, 5 Low); story remains in `review`.
- 2026-02-18: Addressed third code review pass - 6 items resolved (1 Medium, 5 Low); story is `review`-ready.
- 2026-02-18: Fourth code review pass — 9 new action items added (1 High, 4 Medium, 4 Low); story returned to in-progress pending resolution.
- 2026-02-18: Addressed fourth code review pass - 9 items resolved (1 High, 4 Medium, 4 Low); normalized validation messages, fixed no-op PATCH `updated_at`, added missing tests, and revalidated full suite/migrations.
- 2026-02-18: All Story 2.1 tasks complete; story and sprint status updated to `review`.
- 2026-02-19: Fifth code review pass — 6 new action items added (2 Medium, 4 Low); story returned to in-progress pending resolution.
- 2026-02-19: Addressed fifth code review pass - 6 items resolved (2 Medium, 4 Low); unified filter typing, added PATCH gear_id validation coverage, improved schema typing/cleanup, documented LPE artifacts, and revalidated tests/migrations.
- 2026-02-19: Story 2.1 completion revalidated; story status updated to `review`.
- 2026-02-19: Sixth code review pass — 6 new action items added (1 Medium, 5 Low); story returned to in-progress pending resolution.
- 2026-02-19: Addressed sixth code review pass - 6 items resolved (1 Medium, 5 Low); added blocked-reason and gear_id PATCH coverage, tightened sort guard behavior, and removed dead regex anchors.
- 2026-02-19: Captured tasks text-search indexing gap as tech debt for Epic 4/performance follow-up.
- 2026-02-19: Story 2.1 completion revalidated; story and sprint status updated to `review`.
- 2026-02-20: Seventh code review pass — 7 new action items added (2 Medium, 5 Low); story returned to in-progress pending resolution.
- 2026-02-20: Addressed seventh code review pass - 7 items resolved (2 Medium, 5 Low); added assignee PATCH error coverage, whitespace-search guard, null-field PATCH coverage, deterministic default-sort timing guard, and tightened CRUD sort typing.
- 2026-02-20: Story 2.1 completion revalidated; story and sprint status updated to `review`.
- 2026-02-20: Eighth code review pass — 5 new action items added (1 Medium, 4 Low); story returned to in-progress pending resolution.
- 2026-02-20: Addressed eighth code review pass - 5 items resolved (1 Medium, 4 Low); added whitespace-search regression coverage, blocked-reason null/whitespace tests, invalid status/priority query-filter tests, and stripped-search local reuse in CRUD.
- 2026-02-20: Story 2.1 completion revalidated; story and sprint status updated to `review`.
- 2026-02-20: Ninth code review pass — 7 new action items added (0 Medium, 7 Low); all ACs verified implemented; no HIGH/MEDIUM issues found.
