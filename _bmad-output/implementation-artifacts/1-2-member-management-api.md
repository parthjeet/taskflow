# Story 1.2: Member Management API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team lead,  
I want to add, edit, view, and deactivate team members via API endpoints,  
so that the team roster is managed and available for task assignment.

## Acceptance Criteria

1. Create `members` table via Alembic with columns: `id` (UUID PK, server-generated), `name` (VARCHAR(100), NOT NULL), `email` (VARCHAR, NOT NULL, UNIQUE), `active` (BOOLEAN, NOT NULL, default TRUE).  
2. Implement `GET /api/v1/members` returning `200` and an array of `{id, name, email, active}`.  
3. Implement `POST /api/v1/members` with `{name, email, active}` validation (name 1-100 chars, valid email), returning `201` with full created member.  
4. Implement `PATCH /api/v1/members/{id}` partial update semantics, returning `200` with full updated member.  
5. Implement `DELETE /api/v1/members/{id}` returning `204` when member has zero assigned tasks.  
6. Return `409` on deleting a member with assigned tasks using: `{"error": "Cannot delete member with N assigned task(s). Reassign or complete them first."}`.  
7. Return `404` with `{"error": "Member not found"}` for unknown member IDs across member endpoints.  
8. Ensure all DB access is parameterized (no raw SQL string concatenation), and all API errors remain normalized to `{"error": "..."}`.

## Tasks / Subtasks

- [x] Build member persistence layer and migration (AC: 1)
  - [x] Add `backend/app/models/member.py` with `members` table and required constraints.
  - [x] Update `backend/app/models/__init__.py` so Alembic metadata discovery includes `Member`.
  - [x] Add Alembic revision in `backend/alembic/versions/` creating `members` with unique index/constraint on `email`.
- [x] Add DB dependency and CRUD module for members (AC: 2, 3, 4, 5, 6, 7, 8)
  - [x] Add `backend/app/api/deps.py` with `get_db()` session dependency.
  - [x] Add `backend/app/crud/member.py` with list/get/create/update/delete operations.
  - [x] Add assigned-task count helper used by delete guard (FR29 / AC6).
- [x] Add member schemas (AC: 2, 3, 4)
  - [x] Add `backend/app/schemas/member.py` with `MemberCreate`, `MemberUpdate`, `MemberResponse`.
  - [x] Enforce name length and valid email using Pydantic.
  - [x] Ensure `MemberUpdate` fields are optional for PATCH semantics.
- [x] Implement member API routes and wire router (AC: 2, 3, 4, 5, 6, 7, 8)
  - [x] Add `backend/app/api/v1/members.py` with `GET/POST/PATCH/DELETE` handlers.
  - [x] Raise `HTTPException` with exact contract messages so global handlers emit `{"error": "..."}`.
  - [x] Register members router in `backend/app/api/v1/api.py` with prefix `/members`.
- [x] Handle FR29 sequencing risk explicitly (AC: 6)
  - [x] Story order introduces delete-protection dependency on `tasks.assignee_id` before Story 2.1 creates tasks table.
  - [x] Implement deletion guard in a way that is forward-compatible with Story 2.1 and does not hard-fail Story 1.2 environments.
  - [x] Add clear TODO/notes and test coverage strategy for the assigned-task conflict path once task model is present.
- [x] Add backend test coverage for members API (AC: 2, 3, 4, 5, 7, 8; AC6 where feasible)
  - [x] Add `backend/tests/test_members.py` for list/create/update/delete/not-found and validation failures.
  - [x] Assert status codes and exact normalized error payload shape.
  - [x] Ensure tests verify PATCH partial updates (unchanged fields preserved).
  - [x] Add/plan conflict-path test for `409` assigned-task deletion constraint.
- [x] Review Follow-ups (AI)
  - [x] [AI-Review][High] Enforce DB-generated UUID for `members.id` to satisfy AC1 "server-generated" requirement. Add `server_default=sa.text("gen_random_uuid()")` (PostgreSQL) in `backend/alembic/versions/20260216_0001_create_members_table.py`; add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` if required by target DB.
  - [x] [AI-Review][High] Add `409` email-conflict test coverage for CREATE and UPDATE in `backend/tests/test_members.py`, covering both guard-query conflicts and DB `IntegrityError` fallback paths.
  - [x] [AI-Review][Medium] Remove redundant uniqueness duplication on `members.email`: keep one DB uniqueness mechanism (prefer `uq_members_email`) and align ORM metadata (`backend/app/models/member.py`) so autogenerate does not reintroduce duplicate unique index definitions.
  - [x] [AI-Review][Medium] Optimize assigned-task delete guard in `backend/app/crud/member.py` by improving `count_assigned_tasks` (current per-call inspect/autoload reflection), not `delete_member` itself.
  - [x] [AI-Review][Low] Clarify migration revision-ID convention in team docs; current timestamp-style ID is acceptable but should be standardized if multiple contributors will generate revisions concurrently.
- [x] [AI-Review][High] Reject explicit `null` in `MemberUpdate` for `name` and `email` to prevent DB integrity failures and unintended `500`s. [backend/app/schemas/member.py, backend/tests/test_members.py]
  - [x] Update schema validation so omitted PATCH fields remain allowed, but explicit `{"name": null}` or `{"email": null}` is rejected with normalized `400` error payload.
  - [x] Add API tests for PATCH null payloads (`name`, `email`) and assert `{"error": "..."}` format.
- [x] [AI-Review][Medium] Implement `GET /api/v1/members/{id}` endpoint. [backend/app/api/v1/members.py, backend/tests/test_members.py]
  - [x] Add route returning `200` with `MemberResponse` when member exists.
  - [x] Return `404` with exact payload `{"error": "Member not found"}` for unknown ID.
  - [x] Add tests for both success and not-found paths.
- [x] [AI-Review][Medium] Record backend implementation in git to prevent loss of untracked work. [backend/]
  - [x] Stage Story 1.2 backend files only (avoid unrelated workspace files).
  - [x] Create commit after tests pass with a message scoped to Story 1.2 review fixes.
- [x] [AI-Review][Low] Tighten `count_assigned_tasks` missing-schema detection to prefer SQLSTATE-driven logic and avoid brittle message parsing. [backend/app/crud/member.py, backend/tests/test_members.py]
  - [x] Keep forward-compatibility with Story 2.1 (`tasks` table absent must still behave as zero assigned tasks).
  - [x] Add/update tests validating behavior when tasks schema is missing vs present.

## Dev Notes

### Developer Context

- Story 1.1 is complete and provides FastAPI app bootstrapping, `/api/v1` routing, CORS, and global error normalization.
- This story is backend-only. Do not modify `taskflow-ui/` in `dev-story`.
- Use `taskflow-ui/API_CONTRACT.md` as canonical API shape and behavior source.

### Technical Requirements

- Endpoint path must be `/api/v1/members` (not `/api/v1/team-members`).
- Use `PATCH` for updates (no `PUT` member update endpoint).
- Use `active` field naming everywhere (never `is_active`).
- Keep all error payloads normalized via existing handlers: `{"error": "message"}`.
- Prefer ORM/query-builder operations for parameterized SQL behavior.

### Architecture Compliance

- Follow backend pattern: router in `api/v1`, operations in `crud`, schema DTOs in `schemas`, ORM entity in `models`.
- Keep files/classes/functions naming aligned with architecture conventions (snake_case files, PascalCase models/schemas).
- Preserve one-model-per-file convention for `Member`.
- Ensure Alembic autogenerate can discover model metadata via `app/models/__init__.py`.

### Library / Framework Requirements

- Use currently pinned backend stack in `backend/pyproject.toml` (FastAPI 0.129.x, SQLAlchemy 2.0.x, Pydantic 2.x, Alembic 1.18.x).
- No new framework dependency should be required for Story 1.2.
- Continue Python 3.12+ compatibility.

### File Structure Requirements

Expected new/updated files:

- `backend/app/api/deps.py` (new)
- `backend/app/api/v1/members.py` (new)
- `backend/app/api/v1/api.py` (update: include router)
- `backend/app/crud/member.py` (new)
- `backend/app/models/member.py` (new)
- `backend/app/models/__init__.py` (update)
- `backend/app/schemas/member.py` (new)
- `backend/alembic/versions/<revision>_create_members_table.py` (new)
- `backend/tests/test_members.py` (new)
- `backend/tests/conftest.py` (update if DB fixtures/dependency overrides are required)

### Testing Requirements

- Add API-level tests for:
  - `GET /api/v1/members` success shape.
  - `GET /api/v1/members/{id}` success + unknown ID `404`.
  - `POST /api/v1/members` success and validation failure paths.
  - `PATCH /api/v1/members/{id}` partial update behavior.
  - `PATCH /api/v1/members/{id}` explicit `null` rejection for `name` and `email`.
  - `DELETE /api/v1/members/{id}` success + unknown ID `404`.
  - Contract message assertions for normalized errors.
- Keep test assertions strict on response shape for compatibility with `API_CONTRACT.md`.
- Cover AC6 conflict path in this story if feasible; otherwise leave explicit, trackable coverage note to complete immediately when task assignment exists.

### Review Follow-up Execution Instructions (Code Dev Agent)

Recommended execution order for remaining work:

1. Schema hardening: implement explicit-`null` rejection in `backend/app/schemas/member.py`, then add failing/passing tests in `backend/tests/test_members.py`.
2. API completeness: add `GET /api/v1/members/{id}` in `backend/app/api/v1/members.py` with exact contract behavior, then cover with tests.
3. Delete-guard robustness: refine `count_assigned_tasks` error-path logic in `backend/app/crud/member.py` and verify with tests.
4. Full regression: run `uv run pytest -q` and resolve all failures before task checkoffs.
5. Git hygiene: stage only Story 1.2 backend files and create one focused commit for the remaining AI review fixes.

Definition of done for these follow-ups:

- All four unchecked AI review tasks and their subtasks are marked `[x]`.
- New API behavior is covered by deterministic tests.
- Error payloads remain normalized to `{"error": "..."}`.
- Story file `File List` and `Completion Notes` reflect all touched files and test runs.

### Previous Story Intelligence (Story 1.1)

- `backend/app/main.py` already registers exception handlers and `api_router` with `/api/v1` prefix.
- `backend/app/core/exceptions.py` already normalizes `HTTPException`, validation, and unhandled exceptions into `{"error": ...}`.
- `backend/app/api/v1/api.py` is currently empty aside from `APIRouter()` and is ready for members router inclusion.
- DB runtime URL is sourced via `app/core/security.py` (`TASKFLOW_DATABASE_URL`), so tests should use dependency overrides/fixtures instead of requiring real runtime config.

### Git Intelligence Summary

- Recent commits are primarily planning/documentation checkpoints, with no competing backend member implementation present.
- No existing member domain files were detected in `backend/app/{models,schemas,crud,api/v1}`.

### Latest Technical Information

- Project already pins backend dependencies to current tested versions in `backend/pyproject.toml`.
- Story 1.2 should remain within those pinned versions to avoid unnecessary upgrade churn during implementation.

### Project Structure Notes

- `project-context.md` was not found under configured discovery paths; planning artifacts plus existing backend code are sufficient.
- The acceptance criteria include a future dependency (`assigned tasks` constraint) ahead of task model introduction in Story 2.1; implement delete logic so it can evolve cleanly without API contract breaks.

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 1, Story 1.2)
- `_bmad-output/planning-artifacts/architecture.md` (API conventions, file structure, naming, error handling)
- `taskflow-ui/API_CONTRACT.md` (Team Members API and error contract)
- `docs/task_flow_master_doc.md` (member schema and API conventions, dependency pattern)
- `_bmad-output/implementation-artifacts/1-1-initialize-backend-project-health-endpoint.md` (previous story learnings)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `uv run python -m pytest -q tests/test_members.py`
- `uv run python -m pytest -q`
- `git add backend/app/api/v1/members.py backend/app/crud/member.py backend/app/schemas/member.py backend/tests/test_members.py`
- `git commit -m "fix(backend): address story 1.2 review follow-ups"` (`ae89082`)

### Completion Notes List

- Implemented complete members API surface under `/api/v1/members` with list/create/patch/delete.
- Added `members` SQLAlchemy model and Alembic migration with uniqueness constraints on `email`.
- Added dependency injection via `api/deps.py` and lazy session factory retrieval.
- Added CRUD layer with forward-compatible assigned-task count guard for delete conflict behavior.
- Added schema validation for member fields and normalized API error behavior through existing exception handlers.
- Added integration-style API tests including conflict-path validation for assigned tasks.
- ✅ Resolved review finding [High]: enforced DB-side UUID generation in member migration (`gen_random_uuid()` + conditional `pgcrypto` enablement for PostgreSQL) and model server default alignment.
- ✅ Resolved review finding [High]: expanded member API tests for create/update email `409` conflicts in both guard-query and `IntegrityError` fallback paths.
- ✅ Resolved review finding [Medium]: removed duplicate email uniqueness mechanism by keeping named unique constraint `uq_members_email` and removing redundant unique index metadata.
- ✅ Resolved review finding [Medium]: optimized `count_assigned_tasks` to avoid per-call schema reflection/autoload and use direct parameterized count with safe missing-schema handling.
- ✅ Resolved review finding [Low]: documented Alembic migration revision-ID convention in backend team docs.
- ✅ Resolved review finding [High]: rejected explicit `null` for PATCH `name`/`email` updates while preserving omitted-field PATCH semantics.
- ✅ Resolved review finding [Medium]: implemented `GET /api/v1/members/{id}` with normalized `404` contract behavior.
- ✅ Resolved review finding [Low]: switched delete-guard missing-schema logic to SQLSTATE-first handling with explicit SQLite schema checks (no brittle message parsing).
- Added deterministic API coverage for get-by-id, PATCH explicit-null rejection, and delete behavior for missing vs present task-assignment schema.
- Re-ran full backend regression suite: `22 passed`.
- Recorded Story 1.2 backend review-fix implementation in git commit `ae89082`.

### File List

- `_bmad-output/implementation-artifacts/1-2-member-management-api.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/README.md`
- `backend/app/api/deps.py`
- `backend/app/api/v1/api.py`
- `backend/app/api/v1/members.py`
- `backend/app/crud/member.py`
- `backend/app/db/session.py`
- `backend/app/models/__init__.py`
- `backend/app/models/member.py`
- `backend/app/schemas/member.py`
- `backend/alembic/versions/20260216_0001_create_members_table.py`
- `backend/tests/test_members.py`

## Change Log

- 2026-02-16: Addressed remaining Story 1.2 AI review findings (PATCH null rejection, GET-by-id endpoint, delete-guard robustness tests), validated with `22` passing backend tests, and moved story to `review`.
