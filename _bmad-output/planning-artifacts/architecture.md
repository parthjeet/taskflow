---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - docs/task_flow_master_doc.md
  - _bmad-output/planning-artifacts/product-brief-taskflow-2026-02-16.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/research/domain-electron-fastapi-react-desktop-bundling-research-2026-02-16.md
  - taskflow-ui/API_CONTRACT.md
  - taskflow-ui/ (existing frontend codebase)
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-16'
project_name: 'taskflow'
user_name: 'parth'
date: '2026-02-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (47 total across 7 categories):**

| Category | Count | Architectural Implication |
|---|---|---|
| Task Management (FR1-11) | 11 | Core CRUD entity with status-driven business logic (blocked requires reason, auto-clear on status change) |
| Sub-task Management (FR12-17) | 6 | Child entity with ordering (position), max 20 per parent, drag-reorder support |
| Daily Progress Tracking (FR18-24) | 7 | Child entity with 24-hour edit window enforcement, author resolution, edited flag tracking |
| Team Management (FR25-30) | 6 | Reference entity with soft-delete (active/inactive), deletion protection when tasks assigned |
| Dashboard & Discovery (FR31-37) | 7 | Client-side filtering/sorting on loaded data, search across title/description/GEAR ID, visual status hierarchy |
| Application Configuration (FR38-42) | 5 | Local credential encryption, connection testing, auto-connect on startup, version display |
| Error Handling & Resilience (FR43-47) | 5 | Connection retry, input preservation during interruptions, clean process shutdown, port conflict detection |

**Non-Functional Requirements (23 total across 5 areas):**

| Area | Count | Key Constraints |
|---|---|---|
| Performance (NFR1-5) | 5 | Launch <5s, task list <2s for 500 tasks, interactions <200ms, health check <3s, filtering <500ms |
| Security (NFR6-9) | 4 | Encrypted credentials at rest, no credentials in logs, parameterized queries only, masked passwords |
| Reliability (NFR10-14) | 5 | Auto-retry on transient failures, no orphan processes, user-friendly errors, port conflict handling, atomic mutations |
| Usability (NFR15-18) | 4 | <5 min onboarding without guidance, visual feedback on all actions, consistent design patterns, min 1024x600 |
| Portability (NFR19-23) | 5 | Portable exe (no installer), <200MB, no AV false positives, Windows 10/11 x64 only, no system side effects |

**Scale & Complexity:**

- Primary domain: Full-stack desktop application (Electron shell + React renderer + FastAPI backend + PostgreSQL)
- Complexity level: Low-Medium
- Estimated architectural components: ~15 (4 DB models, 4 API routers, 4 page components, Electron main/preload, credential encryption module)

### Technical Constraints & Dependencies

1. **Brownfield project:** Existing React frontend (`taskflow-ui/`) with mock API, git subtree from Lovable. Architecture must preserve existing patterns.
2. **Package manager mandate:** `uv` (by Astral) for Python -- not pip/poetry/conda.
3. **Platform:** Windows 10/11 x64 only. Portable executable, no installer, no admin privileges.
4. **External database dependency:** PostgreSQL is a service, not bundled. Users configure via Settings UI.
5. **Three-process model:** Electron (main) spawns FastAPI (child), which connects to PostgreSQL (external). Startup sequencing and lifecycle management are critical.
6. **API contract source of truth:** Two documents define the API (`task_flow_master_doc.md` TDD Section 4.6 and `taskflow-ui/API_CONTRACT.md`). They diverge on HTTP methods (PUT vs PATCH), field names (`assigned_to` vs `assignee_id`, `update_text` vs `content`), and team member endpoint paths (`/team-members` vs `/members`). **A single canonical contract must be chosen before implementation.**
7. **Research-validated pitfalls:** Must use `--onedir` (not `--onefile`), root-level PyInstaller entrypoint with `freeze_support()`, health-check polling (not setTimeout), bundled Alembic migrations run programmatically.

### Cross-Cutting Concerns Identified

1. **Process Lifecycle Management** -- Electron must reliably start, health-check, and terminate the FastAPI child process across normal and crash scenarios. Affects: Electron main, backend entrypoint, error handling.
2. **API Contract Consistency** -- Frontend mock API, API contract doc, backend implementation, and Pydantic schemas must all agree on field names, HTTP methods, and response shapes. Affects: every layer.
3. **Error Handling & User Feedback** -- Three-tier feedback system (toast, error toast, system alert) must be consistent across all user interactions. Connection failures need specific, actionable messages. Affects: all frontend components, backend error responses.
4. **Credential Encryption** -- DB credentials stored locally in encrypted file. Encryption approach simplified for v1 (not AES-256 with machine-specific key derivation). Affects: Settings page, backend config, Electron storage.
5. **Startup Sequencing** -- Backend must pass health check before frontend loads. Alembic migrations run programmatically at startup. Connection retry on transient failures. Affects: Electron main, backend entrypoint, frontend loading states.

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack desktop application** -- Electron shell wrapping a React frontend communicating with a FastAPI backend over localhost HTTP, backed by external PostgreSQL. This is a brownfield project with an existing frontend codebase.

### Existing Stack Assessment (Not Greenfield)

TaskFlow is **not a starter template project**. The frontend exists and the backend/Electron architecture is well-defined. This evaluation validates the existing choices and documents what they provide architecturally.

### Frontend Stack (Existing -- `taskflow-ui/`)

| Technology | Version | Status | Notes |
|---|---|---|---|
| React | 18.3.1 | Current stable | React 19 available but 18 is correct for Electron compatibility |
| TypeScript | 5.8.3 | Current | |
| Vite | 5.4.19 | Current (v5 LTS) | Vite 6 available but v5 is stable and appropriate |
| Tailwind CSS | 3.4.17 | Current (v3 LTS) | Tailwind v4 available but v3 is stable and well-supported |
| shadcn/ui | Latest (Radix-based) | Current | 38 primitives installed, ~15 actively used |
| TanStack React Query | 5.83.0 | Current | Already installed -- ready for real API integration |
| React Router | 6.30.1 | Current | |
| Zod | 3.25.76 | Current | Available for schema validation |
| React Hook Form | 7.61.1 | Current | Available for form management |
| Vitest | 3.2.4 | Current | Test infrastructure ready |

### Backend Stack (Defined -- Not Yet Built)

| Technology | Specified Version | Notes |
|---|---|---|
| FastAPI | >=0.109.0 | Specify minimum in pyproject.toml |
| SQLAlchemy | 2.x | Synchronous engine (not async) per TDD |
| Pydantic | v2 (>=2.5.0) | With `pydantic-settings` for config |
| Alembic | >=1.13.0 | Bundled programmatically for production |
| psycopg2-binary | >=2.9.9 | PostgreSQL driver |
| uvicorn | >=0.27.0 | ASGI server with standard extras |
| Python | 3.12+ | 3.12 is the safe choice for PyInstaller compatibility |

### Desktop Stack (Defined -- Not Yet Built)

| Technology | Specified Version | Notes |
|---|---|---|
| Electron | 28.x+ | Verify latest stable at build time |
| electron-builder | 24.x+ | `portable` target (not NSIS) per PRD |
| PyInstaller | Latest | `--onedir` mode per research |

### Architectural Decisions Already Made by Stack

**Language & Runtime:**
- TypeScript (strict mode) for frontend, Python 3.12+ for backend
- SWC compiler for React (via `@vitejs/plugin-react-swc`) -- faster than Babel

**Styling Solution:**
- Tailwind CSS 3 with CSS custom properties for theming
- class-variance-authority (CVA) for component variants
- `cn()` utility (clsx + tailwind-merge) for conditional classes

**Build Tooling:**
- Vite for frontend dev server and production builds
- PyInstaller for backend compilation
- electron-builder for final packaging

**Testing Framework:**
- Vitest + Testing Library (React) for frontend
- pytest + httpx for backend (defined in TDD)

**Code Organization:**
- Frontend: pages/ + components/ + lib/ + hooks/ + types/ pattern
- Backend: api/v1/ + models/ + schemas/ + crud/ + core/ + db/ layered architecture
- Monorepo with git subtree for frontend

**State Management:**
- TanStack React Query (already installed) for server state
- React hooks + context for UI state
- localStorage for persistence (filters, preferences)

**API Pattern:**
- Swappable API client (mock/real) via `src/lib/api/index.ts`
- REST over localhost HTTP
- Snake_case in backend, camelCase transformation in frontend API client layer

### What Still Needs Architectural Decision

The starter stack is established. The remaining decisions are:

1. **API contract canonical source** -- resolve TDD vs API_CONTRACT.md divergences
2. **Backend project initialization** -- `uv init` with exact dependency versions
3. **Electron project initialization** -- root `package.json` with electron + electron-builder
4. **Credential encryption approach** -- simplified for v1
5. **Startup sequencing implementation** -- health-check polling pattern
6. **Error handling patterns** -- backend error response format
7. **Database migration strategy** -- Alembic bundling for production

**Note:** No `create-xxx` CLI command needed. The frontend exists. Backend and Electron need manual initialization following the TDD structure.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. API_CONTRACT.md is the canonical API specification
2. Consistent field naming across all layers (DB, Pydantic, API, TypeScript)
3. Auto-migrate database on startup via Alembic

**Important Decisions (Shape Architecture):**
4. Fernet encryption for credential storage (no admin permissions required)
5. Backend owns credential encryption; Electron passes config path at startup
6. Error responses normalized to `{ "error": "message" }` format
7. Unified API client layer with TanStack Query hooks (Lovable AI refactors mock, CLI AI tools build real client)

**Deferred Decisions (Post-MVP):**
- Authentication/authorization (no auth in v1)
- Auto-update mechanism (manual distribution in v1)
- Monitoring/logging infrastructure (console logging sufficient for v1)

### Critical Project Context Rules

These rules apply to ALL architectural decisions and implementation:

1. **No admin permissions.** TaskFlow users run on locked-down Windows enterprise machines. All solutions (encryption, file storage, process management, packaging) must work without elevated privileges. No registry writes, no Program Files installation, no system-level services.

2. **Two-team development model.** Frontend static development (mock data, UI components, UX enhancements) is done by **Lovable AI**. Backend API development (FastAPI, database, Electron integration) is done by **CLI AI tools** (Claude Code, Codex, Gemini). The API_CONTRACT.md is the coordination interface between the two.

3. **API_CONTRACT.md is Lovable-owned but backend-driven.** The contract was generated by Lovable AI and can be updated if backend development needs require it. Any required frontend changes are communicated to Lovable AI for implementation. Backend team does not modify frontend codebase directly.

### Data Architecture

**Decision: Consistent field naming across all layers**
- Database columns, Pydantic schemas, API responses, and TypeScript types all use the same field names as defined in `API_CONTRACT.md`
- Field names: `assignee_id`, `assignee_name`, `content` (not `update_text`), `active` (not `is_active`), `sub_tasks`, `daily_updates`
- SQLAlchemy models use `API_CONTRACT.md` field names as column names
- Pydantic schemas mirror the same names with no aliasing
- TypeScript types use camelCase equivalents (`assigneeId`, `assigneeName`, etc.) with transformation in the API client layer
- Rationale: Single source of truth for field names eliminates discrepancies between layers

**Decision: Auto-migrate on startup**
- Alembic migrations run programmatically when the FastAPI backend starts
- Health endpoint (`/health`) returns 200 only after migrations complete
- Migration files bundled with PyInstaller via `.spec` datas configuration
- `alembic.ini` sqlalchemy.url overridden at runtime from decrypted credentials
- Rationale: Simplest approach for a 7-person team; no manual migration step needed

**Decision: PostgreSQL as external service**
- Not bundled in the app
- Users configure connection via Settings UI
- Dev: local PostgreSQL; Prod: cloud-hosted PostgreSQL

### Authentication & Security

**Decision: No authentication in v1**
- All endpoints are unauthenticated
- Acceptable for a 7-person internal team on an enterprise network
- Backend binds to `127.0.0.1` only (not `0.0.0.0`)
- Future: JWT Bearer token auth planned for v2

**Decision: Fernet encryption for credentials**
- Uses `cryptography` library's `Fernet` (symmetric, AES-128-CBC under the hood)
- Encryption key generated once and stored in a local file alongside encrypted credentials
- Both key file and encrypted credentials stored in a known app data directory (user-writable, no admin required)
- Backend handles all encryption/decryption via `core/security.py`
- No OS-level credential store (avoids admin permission issues)
- Rationale: Simple, well-tested, works without admin privileges

**Decision: Backend owns credential storage**
- Backend provides endpoints: `POST /api/v1/settings/save-connection` (encrypt + save) and `POST /api/v1/settings/test-connection` (test without saving)
- Encrypted credentials stored in app data directory (e.g., `%LOCALAPPDATA%/TaskFlow/` or alongside the exe)
- On startup, backend reads and decrypts its own config file
- Electron passes the config directory path via environment variable when spawning the backend
- Rationale: Backend is self-contained regarding config; Electron just manages lifecycle

### API & Communication Patterns

**Decision: API_CONTRACT.md is canonical**
- Backend MUST implement the exact endpoints, methods, field names, and response shapes defined in `taskflow-ui/API_CONTRACT.md`
- TDD code samples (Section 4) are illustrative guidance, not prescriptive
- If backend development needs require changes to the contract, the API_CONTRACT.md is updated first, then frontend changes are communicated to Lovable AI
- HTTP methods: `PATCH` for partial updates (not `PUT`)
- Endpoints: `/members` for team members (not `/team-members`)
- Subtask toggle: `PATCH /tasks/{id}/subtasks/{sid}/toggle` (dedicated endpoint)

**Decision: Normalized error responses**
- All API errors return `{ "error": "Human-readable message" }`
- Custom FastAPI exception handlers normalize:
  - Pydantic validation errors -> `{ "error": "descriptive message" }` with 400 status
  - Business rule violations -> `{ "error": "message" }` with appropriate status (400, 403, 409)
  - Not found -> `{ "error": "Task not found" }` with 404
  - Server errors -> `{ "error": "Internal server error" }` with 500
- Rationale: Frontend already expects this format; consistent UX for error handling

### Frontend Architecture

**Decision: Unified API client layer with TanStack Query**
- Refactor from current `mock-api.ts` to a proper layered architecture:
  - **API interface** (`types.ts`): TypeScript interfaces defining the contract
  - **TanStack Query hooks** (`hooks/useTasks.ts`, etc.): Application-level data access
  - **Mock adapter** (`adapters/mock.ts`): localStorage-backed implementation (Lovable AI maintains)
  - **Real adapter** (`adapters/real.ts`): HTTP client to FastAPI (CLI AI tools build)
  - **Adapter selection** (`api/index.ts`): Toggle between mock and real
- Interface defined in frontend to ensure UI needs are met
- camelCase <-> snake_case transformation happens in the adapter layer
- Lovable AI handles mock adapter refactoring
- CLI AI tools build real adapter to match the same interface
- Rationale: Clean separation of concerns, easy to switch between mock and real, TanStack Query provides caching/refetching/optimistic updates

### Infrastructure & Deployment

**Decision: Portable executable, no installer**
- electron-builder `portable` target (not NSIS)
- No admin privileges required to run
- No registry modifications, no file associations
- App data stored in user-writable directory (`%LOCALAPPDATA%/TaskFlow/`)
- Manual distribution via shared network folder

**Decision: PyInstaller `--onedir` mode**
- Directory mode (not single file) for faster startup and fewer AV false positives
- Root-level entrypoint (`pyinstaller_entrypoint.py`) with `multiprocessing.freeze_support()`
- All hidden imports explicitly specified in `.spec` file
- Alembic migration files bundled via `.spec` datas

**Decision: Health-check startup sequencing**
- Electron polls `http://127.0.0.1:8000/health` every 200ms, max 30 retries
- Window created only after health check passes
- On failure after 30 retries: show error dialog with actionable message
- Backend health endpoint returns 200 only after Alembic migrations complete and DB is connected

### Decision Impact Analysis

**Implementation Sequence:**
1. Define canonical TypeScript API types from API_CONTRACT.md
2. Initialize backend with `uv init`, create FastAPI app structure
3. Build SQLAlchemy models with API_CONTRACT.md field names
4. Build Pydantic schemas matching the same names
5. Implement API endpoints matching API_CONTRACT.md exactly
6. Implement Fernet credential encryption
7. Refactor frontend API client to TanStack Query hooks (Lovable AI)
8. Build real API adapter (CLI AI tools)
9. Set up Electron shell with health-check polling
10. Package with PyInstaller + electron-builder

**Cross-Component Dependencies:**
- API_CONTRACT.md field names -> SQLAlchemy models -> Pydantic schemas -> API responses -> TypeScript types (all must agree)
- Fernet encryption module -> Settings endpoint -> Electron config path passing -> Backend startup
- Health-check polling -> Alembic auto-migration -> Backend readiness -> Frontend loading

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

**12 areas** where AI agents (Lovable AI, Claude Code, Codex, Gemini) could make different choices that break integration.

### Naming Patterns

**Database Naming Conventions:**
- Tables: **plural, snake_case** -- `tasks`, `sub_tasks`, `daily_updates`, `members`
- Columns: **snake_case, matching API_CONTRACT.md** -- `assignee_id`, `assignee_name`, `content`, `active`
- Primary keys: always `id` (UUID)
- Foreign keys: `{referenced_table_singular}_id` -- `task_id`, `author_id`, `assignee_id`
- Indexes: `idx_{table}_{column}` -- `idx_tasks_status`, `idx_daily_updates_task_id`
- Enums: `{table}_{column}` -- `task_status`, `task_priority`

```sql
-- CORRECT
CREATE TABLE daily_updates (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id),
    author_id UUID NOT NULL REFERENCES members(id),
    content VARCHAR(1000) NOT NULL,
    ...
);

-- WRONG (old TDD naming)
CREATE TABLE daily_updates (
    id UUID PRIMARY KEY,
    update_text VARCHAR(1000),  -- Wrong: should be "content"
    ...
);
```

**API Naming Conventions (from API_CONTRACT.md):**
- Endpoints: **plural nouns** -- `/tasks`, `/members`
- Nested resources: `/tasks/{taskId}/subtasks`, `/tasks/{taskId}/updates`
- Route parameters: `{camelCase}` -- `{taskId}`, `{subTaskId}`, `{updateId}`
- Query parameters: **snake_case** -- `?active_only=true`, `?sort=updated`
- HTTP methods: `GET` (read), `POST` (create), `PATCH` (update), `DELETE` (remove)
- No `PUT` -- all updates are partial via `PATCH`

**Python Code Naming (Backend):**
- Files: **snake_case** -- `daily_updates.py`, `members.py`
- Classes: **PascalCase** -- `Task`, `DailyUpdate`, `TaskCreate`, `TaskResponse`
- Functions: **snake_case** -- `get_tasks()`, `create_daily_update()`
- Variables: **snake_case** -- `task_id`, `blocking_reason`
- Constants: **UPPER_SNAKE_CASE** -- `MAX_SUBTASKS_PER_TASK = 20`

**TypeScript Code Naming (Frontend):**
- Component files: **PascalCase** -- `TaskCard.tsx`, `StatusSummaryBar.tsx`
- Hook files: **camelCase with `use` prefix** -- `useTasks.ts`, `useMembers.ts`
- Utility files: **kebab-case** -- `date-utils.ts`, `api-client.ts`
- Type files: **kebab-case or index** -- `types/index.ts`
- Interfaces/Types: **PascalCase** -- `Task`, `DailyUpdate`, `ApiClient`
- Functions/hooks: **camelCase** -- `useTasks()`, `formatRelativeDate()`
- Variables: **camelCase** -- `taskId`, `blockingReason`

### Structure Patterns

**Backend Project Organization:**

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, router includes, startup events
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py                # get_db dependency
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── tasks.py           # Task CRUD endpoints
│   │       ├── subtasks.py        # SubTask endpoints (nested under tasks)
│   │       ├── daily_updates.py   # DailyUpdate endpoints (nested under tasks)
│   │       ├── members.py         # Member endpoints (NOT team_members.py)
│   │       └── settings.py        # Settings endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Settings class (pydantic-settings)
│   │   ├── security.py            # Fernet encryption utilities
│   │   └── exceptions.py          # Custom exception handlers
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── task.py                # Task CRUD operations
│   │   ├── subtask.py
│   │   ├── daily_update.py
│   │   └── member.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                # SQLAlchemy Base
│   │   └── session.py             # Engine + SessionLocal
│   ├── models/
│   │   ├── __init__.py            # Import all models (for Alembic)
│   │   ├── task.py
│   │   ├── subtask.py
│   │   ├── daily_update.py
│   │   └── member.py
│   └── schemas/
│       ├── __init__.py
│       ├── task.py
│       ├── subtask.py
│       ├── daily_update.py
│       └── member.py
├── alembic/
│   ├── env.py
│   └── versions/
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # Fixtures: test DB, test client
│   ├── test_tasks.py
│   ├── test_subtasks.py
│   ├── test_daily_updates.py
│   └── test_members.py
├── pyinstaller_entrypoint.py      # Root-level entrypoint with freeze_support()
├── pyproject.toml
├── alembic.ini
└── .env.example
```

**Key structural rule:** Endpoint file names match API_CONTRACT.md resource names -- `members.py` (not `team_members.py`), because the endpoint is `/members`.

**Frontend API Client Organization (after Lovable AI refactor):**

```
src/
├── lib/
│   └── api/
│       ├── types.ts               # TypeScript interfaces matching API_CONTRACT.md
│       ├── client.ts              # ApiClient interface definition
│       ├── adapters/
│       │   ├── mock.ts            # localStorage-backed (Lovable AI maintains)
│       │   └── real.ts            # HTTP client to FastAPI (CLI AI tools build)
│       └── index.ts               # Export active adapter
├── hooks/
│   ├── useTasks.ts                # TanStack Query hooks for tasks
│   ├── useSubtasks.ts
│   ├── useDailyUpdates.ts
│   ├── useMembers.ts
│   └── useSettings.ts
```

**Test Organization:**
- Backend: `tests/test_{resource}.py` -- one test file per API resource
- Frontend: `src/test/` directory with `*.test.ts` files (existing pattern)
- Test naming: `test_{action}_{scenario}` -- `test_create_task_blocked_without_reason`

### Format Patterns

**API Response Formats:**

```
Success (single):    { ...resource fields }          (200/201)
Success (list):      [ { ...resource }, ... ]         (200)
Success (delete):    (empty body)                     (204)
Error:               { "error": "Human message" }     (400/403/404/409/500)
```

- No wrapper objects. Success responses are the resource directly (or array of resources).
- Error responses always use `{ "error": "..." }` regardless of error type.
- No pagination in v1 (max 500 tasks).

**Date/Time Format:**
- All timestamps: **ISO 8601 with timezone** -- `2026-02-16T14:00:00Z`
- Backend stores as `TIMESTAMPTZ` (PostgreSQL)
- Backend serializes with Pydantic's default ISO format
- Frontend displays via `date-fns` `formatRelativeDate()` (existing utility)
- All times in UTC in the API; frontend converts for display if needed

**JSON Field Naming:**
- API layer: **snake_case** -- `assignee_id`, `blocking_reason`, `created_at`
- Frontend TypeScript: **camelCase** -- `assigneeId`, `blockingReason`, `createdAt`
- Transformation happens in the API adapter layer (`adapters/real.ts`)
- Mock adapter already uses camelCase internally

**Boolean Handling:**
- Always `true`/`false` (never `1`/`0`, never `"true"/"false"`)
- Nullable booleans not used; all booleans have defaults

**Null Handling:**
- Nullable fields: return `null` in JSON (not omitted, not empty string)
- Exception: `blocking_reason` returns `""` (empty string) when not blocked, per API_CONTRACT.md

### Process Patterns

**Backend CRUD Pattern (every resource follows this):**

```python
# crud/task.py -- EVERY CRUD module follows this structure:
def get_all(db: Session, filters: dict) -> list[Model]:
def get_by_id(db: Session, id: UUID) -> Model | None:
def create(db: Session, data: CreateSchema) -> Model:
def update(db: Session, id: UUID, data: UpdateSchema) -> Model | None:
def delete(db: Session, id: UUID) -> bool:
```

**Backend Router Pattern (every endpoint file follows this):**

```python
# api/v1/tasks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.crud import task as task_crud
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter()

@router.get("", response_model=list[TaskResponse])
def list_tasks(db: Session = Depends(get_db), ...):
    ...

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: UUID, db: Session = Depends(get_db)):
    task = task_crud.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
```

**Pydantic Schema Pattern (every resource follows this):**

```python
# schemas/task.py
class TaskCreate(BaseModel):    # POST body
class TaskUpdate(BaseModel):    # PATCH body (all fields Optional)
class TaskResponse(BaseModel):  # API response
    model_config = ConfigDict(from_attributes=True)
```

- `Create` schemas: required fields match API_CONTRACT.md "Required" column
- `Update` schemas: ALL fields Optional (PATCH semantics)
- `Response` schemas: ALL fields present, `from_attributes=True` for ORM conversion

**Error Handling Pattern:**

```python
# core/exceptions.py -- Custom exception handler registered in main.py
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": format_validation_error(exc)}
    )
```

**Frontend Hook Pattern (every resource follows this):**

```typescript
// hooks/useTasks.ts
export function useTasks(filters?: TaskFilters) {
  return useQuery({ queryKey: ['tasks', filters], queryFn: ... });
}
export function useTask(id: string) {
  return useQuery({ queryKey: ['tasks', id], queryFn: ... });
}
export function useCreateTask() {
  return useMutation({ mutationFn: ..., onSuccess: invalidate(['tasks']) });
}
export function useUpdateTask() {
  return useMutation({ mutationFn: ..., onSuccess: invalidate(['tasks']) });
}
export function useDeleteTask() {
  return useMutation({ mutationFn: ..., onSuccess: invalidate(['tasks']) });
}
```

**Loading State Pattern:**
- TanStack Query handles loading/error/success states
- Components use `isLoading`, `isError`, `error`, `data` from hooks
- Initial page load: `Loader2` spinner (existing pattern)
- Button submissions: `disabled` + `Loader2` inside button (existing pattern)
- Mutations: optimistic updates where appropriate (status changes, sub-task toggles)

### Enforcement Guidelines

**All AI Agents MUST:**

1. **Check API_CONTRACT.md before implementing any endpoint or API call.** The contract is the source of truth for field names, methods, and response shapes.
2. **Use the exact field names from API_CONTRACT.md** in database columns, Pydantic schemas, and TypeScript types. No aliases, no transformations except camelCase in TypeScript.
3. **Follow the CRUD/Router/Schema/Hook patterns above** for every new resource. Consistency in structure prevents integration surprises.
4. **Return `{ "error": "message" }` for ALL error responses.** No FastAPI default `{ "detail": ... }` leaking through.
5. **Never modify code outside your team boundary.** Backend agents don't touch `taskflow-ui/`. Frontend agents don't touch `backend/`. API_CONTRACT.md is the handoff point.

**Anti-Patterns to Avoid:**

```python
# WRONG: Using TDD field names instead of API_CONTRACT.md
class Task(Base):
    assigned_to = Column(...)    # Wrong -- should be assignee_id
    update_text = Column(...)    # Wrong -- should be content

# WRONG: Returning FastAPI default error format
raise HTTPException(status_code=422, detail=[{"loc": [...], "msg": "..."}])
# Should return: {"error": "Blocking reason is required when status is Blocked"}

# WRONG: PUT for updates
@router.put("/{task_id}")       # Wrong -- should be PATCH

# WRONG: Endpoint naming
router = APIRouter(prefix="/team-members")  # Wrong -- should be /members
```

```typescript
// WRONG: Using snake_case in TypeScript component code
const task_id = params.id;       // Wrong -- should be taskId

// WRONG: Calling API directly instead of through hooks
fetch('/api/v1/tasks');          // Wrong -- use useTasks() hook

// WRONG: Backend team modifying frontend files
// Backend agents must NOT edit files under taskflow-ui/
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
taskflow/
├── .github/
│   └── workflows/
│       └── ci.yml                          # Lint + test for backend and frontend
├── docs/
│   └── task_flow_master_doc.md             # Original BRD/PRD/TDD (reference only)
│
├── ─── ELECTRON SHELL ────────────────────
├── electron/
│   ├── main.ts                             # Electron main process (window, lifecycle)
│   ├── preload.ts                          # Context bridge (exposes appVersion, configPath)
│   ├── backend-manager.ts                  # Spawn/health-check/kill FastAPI child process
│   └── tsconfig.json                       # Electron-specific TS config
├── package.json                            # Root: electron + electron-builder deps
├── electron-builder.yml                    # Portable target config
│
├── ─── FASTAPI BACKEND ───────────────────
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                         # FastAPI app, CORS, exception handlers, startup
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                     # get_db(), get_settings() dependencies
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── tasks.py                # GET/POST/PATCH/DELETE /tasks
│   │   │       ├── subtasks.py             # POST/PATCH/DELETE /tasks/{taskId}/subtasks
│   │   │       ├── daily_updates.py        # POST/PATCH/DELETE /tasks/{taskId}/updates
│   │   │       ├── members.py              # GET/POST/PATCH/DELETE /members
│   │   │       ├── settings.py             # POST /settings/save-connection, test-connection
│   │   │       └── health.py               # GET /health
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py                   # pydantic-settings: Settings class
│   │   │   ├── security.py                 # Fernet encrypt/decrypt credential utilities
│   │   │   └── exceptions.py               # Custom HTTP + validation exception handlers
│   │   ├── crud/
│   │   │   ├── __init__.py
│   │   │   ├── task.py                     # Task CRUD operations
│   │   │   ├── subtask.py                  # SubTask CRUD operations
│   │   │   ├── daily_update.py             # DailyUpdate CRUD operations
│   │   │   └── member.py                   # Member CRUD operations
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                     # SQLAlchemy declarative Base
│   │   │   ├── session.py                  # Engine, SessionLocal factory
│   │   │   └── migrations.py               # Programmatic Alembic runner
│   │   ├── models/
│   │   │   ├── __init__.py                 # Import all models (Alembic autogenerate)
│   │   │   ├── task.py                     # Task SQLAlchemy model
│   │   │   ├── subtask.py                  # SubTask SQLAlchemy model
│   │   │   ├── daily_update.py             # DailyUpdate SQLAlchemy model
│   │   │   └── member.py                   # Member SQLAlchemy model
│   │   └── schemas/
│   │       ├── __init__.py
│   │       ├── task.py                     # TaskCreate, TaskUpdate, TaskResponse
│   │       ├── subtask.py                  # SubTaskCreate, SubTaskResponse
│   │       ├── daily_update.py             # DailyUpdateCreate, DailyUpdateUpdate, DailyUpdateResponse
│   │       ├── member.py                   # MemberCreate, MemberUpdate, MemberResponse
│   │       ├── settings.py                 # ConnectionSave, ConnectionTest schemas
│   │       └── health.py                   # HealthResponse schema
│   ├── alembic/
│   │   ├── env.py                          # Alembic environment (uses app.db.session engine)
│   │   ├── script.py.mako                  # Migration template
│   │   └── versions/                       # Auto-generated migration files
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                     # Test DB, test client, fixtures
│   │   ├── test_tasks.py
│   │   ├── test_subtasks.py
│   │   ├── test_daily_updates.py
│   │   ├── test_members.py
│   │   ├── test_settings.py
│   │   └── test_health.py
│   ├── pyinstaller_entrypoint.py           # Root entrypoint with freeze_support()
│   ├── taskflow.spec                       # PyInstaller spec (--onedir, datas, hiddenimports)
│   ├── pyproject.toml                      # uv project: dependencies, scripts
│   ├── alembic.ini                         # Alembic config (sqlalchemy.url overridden at runtime)
│   └── .env.example                        # Example env vars for local development
│
├── ─── REACT FRONTEND (git subtree) ──────
├── taskflow-ui/
│   ├── API_CONTRACT.md                     # CANONICAL API specification
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── components.json                     # shadcn/ui config
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx                        # React entry point
│   │   ├── App.tsx                         # Router setup
│   │   ├── App.css
│   │   ├── index.css                       # Tailwind base + custom properties
│   │   ├── vite-env.d.ts
│   │   ├── types/
│   │   │   └── index.ts                    # Task, SubTask, DailyUpdate, TeamMember types
│   │   ├── lib/
│   │   │   ├── utils.ts                    # cn() utility
│   │   │   ├── date-utils.ts               # formatRelativeDate()
│   │   │   ├── mock-api.ts                 # CURRENT: monolithic mock (pre-refactor)
│   │   │   └── api/                        # FUTURE: refactored API layer
│   │   │       ├── types.ts                # ApiClient interface contract
│   │   │       ├── adapters/
│   │   │       │   ├── mock.ts             # localStorage mock (Lovable AI maintains)
│   │   │       │   └── real.ts             # HTTP client to FastAPI (CLI AI builds)
│   │   │       └── index.ts                # Active adapter export + toggle
│   │   ├── hooks/
│   │   │   ├── use-mobile.tsx              # EXISTING: responsive breakpoint hook
│   │   │   ├── use-toast.ts                # EXISTING: toast hook
│   │   │   ├── useTasks.ts                 # FUTURE: TanStack Query task hooks
│   │   │   ├── useSubtasks.ts              # FUTURE: TanStack Query subtask hooks
│   │   │   ├── useDailyUpdates.ts          # FUTURE: TanStack Query update hooks
│   │   │   ├── useMembers.ts               # FUTURE: TanStack Query member hooks
│   │   │   └── useSettings.ts              # FUTURE: TanStack Query settings hooks
│   │   ├── components/
│   │   │   ├── Header.tsx                  # App header with navigation
│   │   │   ├── NavLink.tsx                 # Navigation link component
│   │   │   ├── TaskCard.tsx                # Task list card
│   │   │   ├── TaskFormDialog.tsx           # Create/edit task dialog
│   │   │   └── ui/                         # shadcn/ui primitives (38 components)
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── ... (35 more)
│   │   │       └── use-toast.ts
│   │   ├── pages/
│   │   │   ├── Index.tsx                   # Dashboard / task list
│   │   │   ├── TaskDetail.tsx              # Single task view (subtasks, updates)
│   │   │   ├── Team.tsx                    # Team member management
│   │   │   ├── SettingsPage.tsx            # DB connection settings
│   │   │   └── NotFound.tsx                # 404 page
│   │   └── test/
│   │       ├── setup.ts                    # Vitest setup (testing-library/jest-dom)
│   │       └── example.test.ts
│   └── public/
│       └── (static assets)
│
├── ─── PLANNING & DOCS ───────────────────
├── _bmad-output/
│   └── planning-artifacts/
│       ├── architecture.md                 # THIS DOCUMENT
│       ├── prd.md
│       ├── product-brief-taskflow-2026-02-16.md
│       ├── ux-design-specification.md
│       └── research/
└── _bmad/                                  # BMAD workflow tooling (not shipped)
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Interface | Owner | Consumer |
|---|---|---|---|
| Frontend <-> Backend | `API_CONTRACT.md` REST endpoints over `http://127.0.0.1:8000/api/v1/` | CLI AI tools (backend) | Lovable AI (frontend) |
| Electron <-> Backend | Child process lifecycle (spawn, health-check, kill) + env vars | CLI AI tools | CLI AI tools |
| Electron <-> Frontend | `preload.ts` context bridge (appVersion, configPath) | CLI AI tools | Lovable AI (reads only) |
| Backend <-> PostgreSQL | SQLAlchemy session via connection string from decrypted credentials | CLI AI tools | N/A (external service) |

**Component Boundaries (Team Ownership):**

```
┌─────────────────────────────────────────────────────┐
│  Electron Shell  (CLI AI tools own)                 │
│  ┌───────────────┐  ┌────────────────────────────┐  │
│  │ main.ts       │  │ backend-manager.ts         │  │
│  │ preload.ts    │  │ (spawn + health-check)     │  │
│  └───────┬───────┘  └────────────┬───────────────┘  │
│          │ loads                  │ spawns            │
│  ┌───────▼───────────────┐  ┌────▼───────────────┐  │
│  │ React Frontend        │  │ FastAPI Backend     │  │
│  │ (Lovable AI owns)     │  │ (CLI AI tools own)  │  │
│  │                       │  │                     │  │
│  │ taskflow-ui/src/      │  │ backend/app/        │  │
│  │ - pages/              │  │ - api/v1/           │  │
│  │ - components/         │  │ - crud/             │  │
│  │ - hooks/              │  │ - models/           │  │
│  │ - lib/api/            │  │ - schemas/          │  │
│  └───────────┬───────────┘  │ - core/             │  │
│              │               │ - db/               │  │
│              │ HTTP REST     └──────────┬──────────┘  │
│              └──────────────────────────┘              │
│                                         │ TCP          │
│                              ┌──────────▼──────────┐  │
│                              │ PostgreSQL (external)│  │
│                              └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Data Boundaries:**

| Layer | Technology | Naming | Transforms At |
|---|---|---|---|
| Database | PostgreSQL + SQLAlchemy | `snake_case` (`assignee_id`, `blocking_reason`) | N/A |
| Pydantic Schemas | Pydantic v2 | `snake_case` (same as DB) | N/A |
| API JSON | FastAPI responses | `snake_case` (same as schemas) | N/A |
| Frontend Types | TypeScript | `camelCase` (`assigneeId`, `blockingReason`) | `adapters/real.ts` |

**Firewall Rule:** The `snake_case <-> camelCase` transformation happens **only** in `taskflow-ui/src/lib/api/adapters/real.ts`. No other file performs this transformation.

### Requirements to Structure Mapping

**FR Category -> Directory Mapping:**

| FR Category | Backend Location | Frontend Location |
|---|---|---|
| Task Management (FR1-11) | `backend/app/api/v1/tasks.py`, `crud/task.py`, `models/task.py`, `schemas/task.py` | `pages/Index.tsx`, `pages/TaskDetail.tsx`, `components/TaskCard.tsx`, `components/TaskFormDialog.tsx`, `hooks/useTasks.ts` |
| Sub-task Management (FR12-17) | `backend/app/api/v1/subtasks.py`, `crud/subtask.py`, `models/subtask.py`, `schemas/subtask.py` | `pages/TaskDetail.tsx` (inline section), `hooks/useSubtasks.ts` |
| Daily Progress Tracking (FR18-24) | `backend/app/api/v1/daily_updates.py`, `crud/daily_update.py`, `models/daily_update.py`, `schemas/daily_update.py` | `pages/TaskDetail.tsx` (inline section), `hooks/useDailyUpdates.ts` |
| Team Management (FR25-30) | `backend/app/api/v1/members.py`, `crud/member.py`, `models/member.py`, `schemas/member.py` | `pages/Team.tsx`, `hooks/useMembers.ts` |
| Dashboard & Discovery (FR31-37) | `backend/app/api/v1/tasks.py` (query params: `status`, `priority`, `assignee`, `search`, `sort`) | `pages/Index.tsx` (filters, search bar, sort controls) |
| Application Configuration (FR38-42) | `backend/app/api/v1/settings.py`, `backend/app/core/security.py`, `backend/app/core/config.py` | `pages/SettingsPage.tsx`, `hooks/useSettings.ts` |
| Error Handling & Resilience (FR43-47) | `backend/app/core/exceptions.py`, `backend/app/api/v1/health.py` | `electron/backend-manager.ts` (retry/health), frontend toast/error handling |

**Cross-Cutting Concerns -> Location Mapping:**

| Concern | Files |
|---|---|
| Process Lifecycle | `electron/main.ts`, `electron/backend-manager.ts`, `backend/pyinstaller_entrypoint.py` |
| API Contract Consistency | `taskflow-ui/API_CONTRACT.md` (source), `backend/app/schemas/*.py` (enforces), `taskflow-ui/src/lib/api/types.ts` (mirrors) |
| Error Handling | `backend/app/core/exceptions.py` (backend), `taskflow-ui/src/hooks/use*.ts` (frontend, TanStack Query `onError`) |
| Credential Encryption | `backend/app/core/security.py` (Fernet), `backend/app/api/v1/settings.py` (endpoints), `backend/app/core/config.py` (reads decrypted) |
| Startup Sequencing | `electron/backend-manager.ts` (polls `/health`), `backend/app/main.py` (startup event runs migrations), `backend/app/db/migrations.py` (Alembic runner) |

### Integration Points

**Internal Communication:**

| From | To | Method | When |
|---|---|---|---|
| Electron `main.ts` | `backend-manager.ts` | Function calls | App startup/shutdown |
| `backend-manager.ts` | FastAPI process | Child process (stdin/stdout/env) | Spawn at startup, kill at shutdown |
| `backend-manager.ts` | `/health` endpoint | HTTP GET polling (200ms interval) | Startup sequencing |
| React pages | TanStack Query hooks | React hook calls | User interactions |
| TanStack Query hooks | API adapter | Function calls | Data fetch/mutation |
| API adapter (real) | FastAPI `/api/v1/*` | HTTP REST (GET/POST/PATCH/DELETE) | All CRUD operations |
| FastAPI routers | CRUD functions | Direct function calls | Request handling |
| CRUD functions | SQLAlchemy models | ORM operations | Database access |

**Data Flow (Create Task Example):**

```
User clicks "Create Task"
  → TaskFormDialog.tsx calls useCreateTask().mutate(data)
    → useTasks.ts calls apiClient.createTask(data)     [camelCase]
      → adapters/real.ts transforms to snake_case, POST /api/v1/tasks
        → api/v1/tasks.py validates via TaskCreate schema
          → crud/task.py inserts via SQLAlchemy Task model
            → PostgreSQL stores row
          ← returns Task model instance
        ← FastAPI serializes via TaskResponse schema    [snake_case JSON]
      ← adapters/real.ts transforms to camelCase
    ← TanStack Query invalidates ['tasks'] cache
  ← UI re-renders with new task
```

### File Organization Patterns

**Configuration Files:**

| File | Location | Purpose |
|---|---|---|
| `package.json` (root) | `taskflow/` | Electron + electron-builder deps, build scripts |
| `electron-builder.yml` | `taskflow/` | Portable packaging config |
| `package.json` (frontend) | `taskflow-ui/` | React + UI deps, dev/build/test scripts |
| `pyproject.toml` | `backend/` | Python deps (via `uv`), scripts |
| `alembic.ini` | `backend/` | Alembic config (URL overridden at runtime) |
| `.env.example` | `backend/` | Dev environment template (DB URL, port) |
| `taskflow.spec` | `backend/` | PyInstaller bundling config |

**Source Organization Rules:**

1. **One model per file** -- `models/task.py`, `models/member.py` (never a single `models.py`)
2. **One schema set per file** -- `schemas/task.py` contains `TaskCreate`, `TaskUpdate`, `TaskResponse`
3. **One CRUD module per resource** -- `crud/task.py` exports `get_all`, `get_by_id`, `create`, `update`, `delete`
4. **One router per API resource** -- `api/v1/tasks.py`, nested routes in `api/v1/subtasks.py`
5. **One hook file per resource** -- `hooks/useTasks.ts` exports `useTasks`, `useTask`, `useCreateTask`, etc.
6. **Pages map to routes** -- `pages/Index.tsx` = `/`, `pages/TaskDetail.tsx` = `/tasks/:id`, `pages/Team.tsx` = `/team`, `pages/SettingsPage.tsx` = `/settings`

**Test Organization:**

| Layer | Location | Pattern | Runner |
|---|---|---|---|
| Backend unit/integration | `backend/tests/test_*.py` | `test_{action}_{scenario}()` | pytest + httpx TestClient |
| Backend fixtures | `backend/tests/conftest.py` | Test DB, client, seed data | pytest fixtures |
| Frontend unit | `taskflow-ui/src/test/*.test.ts` | `describe/it` blocks | Vitest + Testing Library |
| Frontend setup | `taskflow-ui/src/test/setup.ts` | jest-dom matchers | Vitest |

### Development Workflow Integration

**Development Server Structure (3 terminals):**

```
Terminal 1: Frontend dev server
  cd taskflow-ui && npm run dev        → http://localhost:5173

Terminal 2: Backend dev server
  cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Terminal 3: PostgreSQL
  (already running as a service or docker container)
```

- During development, frontend talks to backend directly at `http://127.0.0.1:8000/api/v1/`
- Vite proxy can be configured but not required since both are localhost
- Mock adapter can be used for frontend-only development without backend running

**Build Process Structure:**

```
Step 1: Build frontend
  cd taskflow-ui && npm run build      → taskflow-ui/dist/

Step 2: Build backend
  cd backend && pyinstaller taskflow.spec  → backend/dist/taskflow/

Step 3: Package with Electron
  (root) electron-builder               → dist/TaskFlow-portable.exe
    bundles: electron/ + taskflow-ui/dist/ + backend/dist/taskflow/
```

**Deployment Structure (Portable Exe):**

```
TaskFlow-portable.exe unpacks to:
├── TaskFlow.exe                        # Electron main
├── resources/
│   └── app/                            # Electron app code + frontend dist
├── backend/                            # PyInstaller --onedir output
│   ├── taskflow.exe                    # FastAPI server
│   ├── alembic/                        # Bundled migration files
│   └── (Python runtime + deps)
└── (Electron runtime files)
```

User data stored at `%LOCALAPPDATA%/TaskFlow/`:
```
%LOCALAPPDATA%/TaskFlow/
├── credentials.enc                     # Fernet-encrypted DB credentials
└── fernet.key                          # Fernet encryption key
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices are compatible.

| Stack Layer | Versions | Compatibility |
|---|---|---|
| React 18.3.1 + Vite 5.4 + TypeScript 5.8.3 | All current stable | No conflicts |
| FastAPI 0.109+ + SQLAlchemy 2.x + Pydantic v2 | FastAPI natively uses Pydantic v2 | No conflicts |
| Electron 28+ wrapping Vite-built React + spawning PyInstaller-bundled FastAPI | Research-validated pattern | Proven in production |
| Fernet (`cryptography` lib) + PyInstaller `--onedir` | Pure Python, bundles cleanly | No conflicts |
| TanStack React Query 5.83 (already installed) + adapter pattern | Built for exactly this pattern | No conflicts |

No contradictory decisions found.

**Pattern Consistency:** All naming, structure, and communication patterns align.

- API_CONTRACT.md field names flow through DB -> Pydantic -> API JSON without aliasing
- camelCase transformation isolated to a single file (`adapters/real.ts`)
- CRUD/Router/Schema/Hook patterns are symmetrical across all 4 resources
- Error format (`{ "error": "message" }`) consistent everywhere

**Structure Alignment:** Project structure directly supports all decisions.

- Two-team boundary enforced: `taskflow-ui/` (Lovable AI) vs `backend/` + `electron/` (CLI AI tools)
- Each architectural decision maps to specific files in the tree
- Integration points (health endpoint, API adapter, preload bridge) are structurally clear

### Requirements Coverage Validation

**Functional Requirements (47/47 covered):**

| FR Category | Count | Coverage | Notes |
|---|---|---|---|
| Task Management (FR1-11) | 11 | All covered | CRUD endpoints, status-driven business logic in `crud/task.py` |
| Sub-task Management (FR12-17) | 6 | All covered | Max 20 limit enforced in `crud/subtask.py`, toggle endpoint |
| Daily Progress (FR18-24) | 7 | All covered | 24-hour window enforced in `crud/daily_update.py`, edited flag |
| Team Management (FR25-30) | 6 | All covered | Deletion protection (409), active/inactive in `crud/member.py` |
| Dashboard & Discovery (FR31-37) | 7 | All covered | Query params on `GET /tasks`, frontend filter/sort/search |
| App Configuration (FR38-42) | 5 | All covered | `settings.py` endpoints, Fernet in `security.py`, version via `preload.ts` |
| Error Handling (FR43-47) | 5 | All covered | `exceptions.py`, health polling, `backend-manager.ts` lifecycle |

**Non-Functional Requirements (23/23 covered):**

| NFR Area | Count | Coverage | Notes |
|---|---|---|---|
| Performance (NFR1-5) | 5 | All covered | Health poll 200ms x ~15 avg < 5s launch. No pagination needed (500 tasks). TanStack Query caching for <200ms interactions |
| Security (NFR6-9) | 4 | All covered | Fernet encryption at rest, `pydantic-settings` (no creds in logs), SQLAlchemy parameterized queries, frontend password masking |
| Reliability (NFR10-14) | 5 | All covered | Health-check retry, `backend-manager.ts` process kill (no orphans), normalized error responses, port detection at spawn |
| Usability (NFR15-18) | 4 | All covered | Existing shadcn/ui patterns, toast feedback, consistent design, min 1024x600 (Electron window config) |
| Portability (NFR19-23) | 5 | All covered | `portable` target, `--onedir` (~100-200MB), no installer/registry, Windows 10/11 x64 only, `%LOCALAPPDATA%` only |

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions are documented with exact versions, code examples, and correct/incorrect patterns. No ambiguity remains for AI agents.

**Structure Completeness:** Every file in the project tree has a purpose annotation. All integration points are mapped in the communication table. No orphan files or undefined directories.

**Pattern Completeness:** All 12 conflict points identified and resolved. Code examples provided for CRUD, Router, Schema, Hook, Error handling, and Loading state patterns. Anti-patterns explicitly documented.

### Gap Analysis Results

**Critical Gaps: None.**

**Important Gaps (2 items -- documented, not blocking):**

1. **CORS configuration details** -- `main.py` is annotated with "CORS" but the exact `allow_origins` setting for development (`http://localhost:5173`) vs production (same-origin via Electron) should be explicit. **Resolution:** Document in `main.py` as a dev vs production toggle. Not blocking -- standard FastAPI CORS setup.

2. **Port conflict handling specifics** -- NFR14 requires port conflict detection. Architecture assigns this to `backend-manager.ts` but doesn't detail the pattern. **Resolution:** `backend-manager.ts` should check if port 8000 is in use before spawning and show a user-facing error dialog. Implementation detail, not architectural.

**Nice-to-Have Gaps (deferred):**
- No structured logging pattern (console logging sufficient for v1 per decision)
- No dev seed data/fixtures pattern (mock adapter covers frontend dev)
- `electron-builder.yml` specifics (standard config, not architectural)

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (47 FRs, 23 NFRs mapped)
- [x] Scale and complexity assessed (Low-Medium, ~15 components)
- [x] Technical constraints identified (no admin, brownfield, two-team, external DB)
- [x] Cross-cutting concerns mapped (5 concerns -> specific files)

**Architectural Decisions**
- [x] Critical decisions documented with versions (7 decisions + 3 context rules)
- [x] Technology stack fully specified (all versions pinned)
- [x] Integration patterns defined (REST, child process, context bridge)
- [x] Performance considerations addressed (caching, polling, no pagination)

**Implementation Patterns**
- [x] Naming conventions established (DB, API, Python, TypeScript)
- [x] Structure patterns defined (one-file-per-resource across all layers)
- [x] Communication patterns specified (HTTP REST, function calls, ORM)
- [x] Process patterns documented (CRUD, Router, Schema, Hook, Error, Loading)

**Project Structure**
- [x] Complete directory structure defined (every file annotated)
- [x] Component boundaries established (two-team ownership model)
- [x] Integration points mapped (8-row communication table)
- [x] Requirements to structure mapping complete (7 FR categories + 5 cross-cutting)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level:** High -- brownfield project with existing validated frontend, research-validated architecture pattern, and a well-defined canonical API contract.

**Key Strengths:**
1. Single source of truth (API_CONTRACT.md) eliminates ambiguity between teams
2. Symmetric patterns across all layers reduce cognitive load for AI agents
3. Two-team boundary is structurally enforced (separate directories, no cross-edits)
4. Every requirement traceable to specific files

**Areas for Future Enhancement (post-MVP):**
- JWT authentication (v2)
- Auto-update mechanism
- Structured logging + monitoring
- Pagination for task lists beyond 500

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and team boundaries
- Refer to this document for all architectural questions
- Check API_CONTRACT.md before implementing any endpoint or API call

**First Implementation Priority:**
1. `uv init` the `backend/` directory with `pyproject.toml` dependencies
2. Create SQLAlchemy models matching API_CONTRACT.md field names exactly
3. Create Pydantic schemas (Create/Update/Response) for all 4 resources
4. Implement `GET /health` endpoint as the smoke test
5. Set up Alembic with programmatic migration runner
