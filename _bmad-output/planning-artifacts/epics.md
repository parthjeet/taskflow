---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/task_flow_master_doc.md
  - taskflow-ui/API_CONTRACT.md
---

# TaskFlow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TaskFlow, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories. Stories are separated into **Backend** (CLI AI tools) and **Frontend/UI** (Lovable AI) tracks to support the two-team development model.

## Requirements Inventory

### Functional Requirements

**Task Management (FR1-FR11):**
- FR1: User can create a task with title, description, assigned team member, status, priority, GEAR ID, and blocking reason
- FR2: User can view a task's complete details including associated sub-tasks and daily updates
- FR3: User can update any field of an existing task
- FR4: User can delete a task with cascading removal of its sub-tasks and daily updates
- FR5: User can set task status to To Do, In Progress, Blocked, or Done
- FR6: System enforces a blocking reason when task status is set to Blocked
- FR7: System clears the blocking reason when status changes away from Blocked
- FR8: User can assign or reassign a task to any active team member
- FR9: User can set task priority to High, Medium, or Low
- FR10: User can associate a 4-digit GEAR ID (0000-9999) with a task
- FR11: System validates all task field constraints (title length, GEAR ID format, required fields)

**Sub-task Management (FR12-FR17):**
- FR12: User can add sub-tasks to a task (up to 20 per task)
- FR13: User can mark a sub-task as complete or incomplete
- FR14: User can view sub-task completion progress for a task
- FR15: User can remove a sub-task from a task
- FR16: User can reorder sub-tasks within a task
- FR17: User can edit a sub-task title

**Daily Progress Tracking (FR18-FR24):**
- FR18: User can add a timestamped progress update to a task
- FR19: User can view all updates for a task in reverse chronological order
- FR20: User can edit their own update within 24 hours of creation
- FR21: User can delete their own update within 24 hours of creation
- FR22: System attributes each update to the authoring team member with name resolution
- FR23: System prevents modification of updates older than 24 hours
- FR24: System indicates whether a daily update has been edited

**Team Management (FR25-FR30):**
- FR25: User can add a team member with name and email
- FR26: User can edit a team member's details
- FR27: User can toggle a team member between active and inactive status
- FR28: Inactive members are excluded from task assignment options
- FR29: System prevents deletion of members who have assigned tasks
- FR30: User can view all team members with name, email, status, and assigned task count

**Dashboard & Discovery (FR31-FR37):**
- FR31: User can view all tasks in a card/list dashboard
- FR32: User can filter tasks by status, priority, assignee, blocked status, or GEAR ID
- FR33: User can sort tasks by date created, date updated, or priority
- FR34: User can search tasks by title, description, or GEAR ID
- FR35: User can perform quick actions from the dashboard (mark complete, edit, delete)
- FR36: Blocked tasks are visually distinguished with prominent indicators and visible blocking reasons
- FR37: Tasks display visual indicators for priority level and status

**Application Configuration (FR38-FR42):**
- FR38: User can configure database connection settings through the UI
- FR39: User can test a database connection before saving
- FR40: System stores database credentials in an encrypted local file
- FR41: System connects to the database automatically on startup using saved credentials
- FR42: User can view the application version number

**Error Handling & Resilience (FR43-FR47):**
- FR43: System communicates database connection failures with actionable guidance
- FR44: System retries database connections on transient failures
- FR45: System preserves user input during connection interruptions
- FR46: System detects and communicates backend startup failures (e.g., port conflicts)
- FR47: System ensures clean shutdown of all processes when the application closes

### NonFunctional Requirements

**Performance (NFR1-5):**
- NFR1: Application launches and displays the dashboard within 5 seconds of double-clicking the executable
- NFR2: Task list loads within 2 seconds for up to 500 tasks
- NFR3: UI interactions (clicks, form inputs, navigation) respond within 200ms
- NFR4: Backend health check passes within 3 seconds of process start
- NFR5: Filtering and sorting operations complete within 500ms for up to 500 tasks

**Security (NFR6-9):**
- NFR6: Database credentials are encrypted at rest in the local configuration file
- NFR7: No database credentials appear in application logs, temp files, or error messages
- NFR8: All database queries use parameterized statements (no raw SQL string concatenation)
- NFR9: Password fields are masked by default in the Settings UI

**Reliability (NFR10-14):**
- NFR10: Failed database operations are retried automatically on transient connection failures
- NFR11: No orphan backend (api.exe) processes remain after application close -- including crash scenarios
- NFR12: Database connection failures display user-friendly error messages with a path to Settings
- NFR13: Application handles port conflicts on startup with a clear, actionable error message
- NFR14: All data mutations (create, update, delete) are atomic -- partial writes do not corrupt state

**Usability (NFR15-18):**
- NFR15: A new team member can create a task and log a daily update within 5 minutes of first launch without guidance
- NFR16: All user actions provide visual feedback (loading states, success confirmations, error messages)
- NFR17: The interface follows consistent design patterns throughout (shadcn/ui component library)
- NFR18: Minimum window size of 1024x600 with responsive layout adaptation

**Portability & Distribution (NFR19-23):**
- NFR19: Packaged as a portable Windows executable -- no installer, no admin privileges required
- NFR20: Portable executable total size under 200 MB
- NFR21: No antivirus false positives on a clean Windows Defender install
- NFR22: Runs on Windows 10 and Windows 11 (x64) without additional runtime dependencies
- NFR23: No registry modifications, file associations, or system-level side effects

### Additional Requirements

**From Architecture:**
- Not a greenfield project -- existing React frontend (taskflow-ui/) with mock API via git subtree
- API_CONTRACT.md is canonical source of truth: PATCH (not PUT), /members (not /team-members), assignee_id (not assigned_to), content (not update_text), active (not is_active)
- Consistent field naming across all layers: DB columns match API_CONTRACT.md field names exactly
- Auto-migrate database on startup via Alembic (programmatic runner)
- Fernet encryption for credentials (no admin permissions required, no OS credential store)
- Backend owns credential storage with endpoints: POST /settings/save-connection, POST /settings/test-connection
- Normalized error responses: { "error": "message" } for ALL errors (no FastAPI default { "detail": ... })
- uv (by Astral) for Python package management -- NOT pip/poetry/conda
- PyInstaller --onedir mode with root-level entrypoint (pyinstaller_entrypoint.py) and freeze_support()
- Health-check startup sequencing: Electron polls /health every 200ms, max 30 retries
- Electron passes config directory path via environment variable when spawning backend
- Backend binds to 127.0.0.1 only (not 0.0.0.0)
- No authentication in v1
- Subtask toggle endpoint: PATCH /tasks/{id}/subtasks/{sid}/toggle (dedicated endpoint per API_CONTRACT)
- assignee_name and author_name are server-resolved (denormalized)
- daily_update field is content (not update_text) with edited boolean flag
- Sub-task has no position field in API_CONTRACT response (ordering handled server-side)

**From UX:**
- StatusSummaryBar component needed: compact status counts above task grid (clickable to filter)
- InlineStatusSelect component needed: quick status change dropdown on task cards
- ConnectionErrorBanner component needed: persistent error alert on dashboard when DB unreachable
- Remember last-selected author in localStorage for daily update dialog
- Filter persistence: store dashboard filters in localStorage across navigation and app restarts
- Codebase cleanup: extract shared color constants to src/lib/constants.ts, remove dead code (App.css, NavLink.tsx), remove dark mode artifacts, remove unused sidebar component, consolidate toast system (remove Sonner, keep Radix Toaster), remove unused shadcn primitives

**Critical Project Constraints:**
- TaskFlow users won't have admin permissions in Windows -- all solutions must work within that constraint
- Frontend static development (mock data) done by Lovable AI; backend API development done by CLI AI tools
- API_CONTRACT.md is Lovable-owned but backend-driven; backend team does NOT modify taskflow-ui/ directly
- Any required frontend changes are communicated to Lovable AI for implementation

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 2 | Create task with all fields |
| FR2 | Epic 2 | View task details with sub-tasks and daily updates |
| FR3 | Epic 2 | Update any task field |
| FR4 | Epic 2 | Delete task with cascading removal |
| FR5 | Epic 2 | Set task status (To Do, In Progress, Blocked, Done) |
| FR6 | Epic 2 | Enforce blocking reason when Blocked |
| FR7 | Epic 2 | Auto-clear blocking reason on status change |
| FR8 | Epic 2 | Assign/reassign task to active member |
| FR9 | Epic 2 | Set task priority |
| FR10 | Epic 2 | Associate 4-digit GEAR ID |
| FR11 | Epic 2 | Validate all task field constraints |
| FR12 | Epic 3 | Add sub-tasks (max 20 per task) |
| FR13 | Epic 3 | Mark sub-task complete/incomplete (toggle) |
| FR14 | Epic 3 | View sub-task completion progress |
| FR15 | Epic 3 | Remove sub-task |
| FR16 | Epic 3 | Reorder sub-tasks |
| FR17 | Epic 3 | Edit sub-task title |
| FR18 | Epic 3 | Add timestamped progress update |
| FR19 | Epic 3 | View updates in reverse chronological order |
| FR20 | Epic 3 | Edit own update within 24 hours |
| FR21 | Epic 3 | Delete own update within 24 hours |
| FR22 | Epic 3 | Attribute update to author with name resolution |
| FR23 | Epic 3 | Prevent modification after 24 hours |
| FR24 | Epic 3 | Indicate edited status on daily updates |
| FR25 | Epic 1 | Add team member with name and email |
| FR26 | Epic 1 | Edit team member details |
| FR27 | Epic 1 | Toggle active/inactive status |
| FR28 | Epic 1 | Exclude inactive from assignment options |
| FR29 | Epic 1 | Prevent deletion of members with assigned tasks |
| FR30 | Epic 1 | View all members with details and task count |
| FR31 | Epic 4 | View all tasks in card/list dashboard |
| FR32 | Epic 4 | Filter by status, priority, assignee, blocked, GEAR ID |
| FR33 | Epic 4 | Sort by date created, date updated, priority |
| FR34 | Epic 4 | Search by title, description, GEAR ID |
| FR35 | Epic 4 | Quick actions from dashboard |
| FR36 | Epic 4 | Blocked tasks visually distinguished |
| FR37 | Epic 4 | Visual indicators for priority and status |
| FR38 | Epic 1 | Configure DB connection through UI |
| FR39 | Epic 1 | Test DB connection before saving |
| FR40 | Epic 1 | Store credentials in encrypted local file |
| FR41 | Epic 1 | Auto-connect on startup using saved credentials |
| FR42 | Epic 5 | View application version number |
| FR43 | Epic 1 | Communicate DB connection failures with guidance |
| FR44 | Epic 1 | Retry DB connections on transient failures |
| FR45 | Epic 2 | Preserve user input during connection interruptions |
| FR46 | Epic 5 | Detect and communicate backend startup failures |
| FR47 | Epic 5 | Clean shutdown of all processes |

**All 47 FRs mapped. Zero gaps.**

## Epic List

### Epic 1: Project Foundation & Team Management
Team lead can configure TaskFlow's database connection, add/edit/deactivate team members, and see clear error messaging when connection issues occur. The backend foundation is established for all future functionality.
**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30, FR38, FR39, FR40, FR41, FR43, FR44
**NFRs addressed:** NFR4, NFR6, NFR7, NFR8, NFR9, NFR10, NFR14

### Epic 2: Core Task Management
Users can create, view, edit, and delete tasks with full field support -- status-driven business logic (blocked requires reason, auto-clear on unblock), team member assignment with name resolution, GEAR ID tracking, and field validation.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR45
**NFRs addressed:** NFR8, NFR14

### Epic 3: Task Breakdown & Daily Progress Tracking
Engineers can decompose tasks into sub-tasks with checkbox progress tracking (up to 20 per task), and log timestamped daily progress updates with 24-hour edit/delete windows, author name resolution, and edited indicators.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24
**NFRs addressed:** NFR14

### Epic 4: Dashboard, Filtering & Search
Team lead can see full team status at a glance via a status summary bar, filter and sort tasks by any attribute, search by title/description/GEAR ID, and perform quick actions from the dashboard -- enabling efficient standup management and stakeholder responses in under 30 seconds.
**FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37
**NFRs addressed:** NFR2, NFR3, NFR5

### Epic 5: Desktop Packaging & Distribution
TaskFlow is distributed as a portable Windows executable that any team member can run by double-clicking, with reliable startup sequencing, clean process shutdown, and version information -- all without requiring admin privileges.
**FRs covered:** FR42, FR46, FR47
**NFRs addressed:** NFR1, NFR4, NFR11, NFR13, NFR19, NFR20, NFR21, NFR22, NFR23

---

## Epic 1: Project Foundation & Team Management

### Story 1.1: Initialize Backend Project & Health Endpoint [Backend]

As a developer,
I want the backend project initialized with FastAPI, proper project structure, CORS configuration, normalized error handling, and a `/health` endpoint,
So that all future backend stories have a consistent foundation to build on and Electron can poll readiness.

**Acceptance Criteria:**

**Given** no backend project exists yet
**When** a developer runs `uv init` and sets up the project
**Then** a `backend/` directory is created with `pyproject.toml` specifying Python 3.12+, FastAPI >=0.109.0, SQLAlchemy 2.x, Pydantic v2, pydantic-settings, Alembic >=1.13.0, psycopg2-binary >=2.9.9, uvicorn[standard] >=0.27.0, cryptography, and pytest + httpx as dev dependencies
**And** the package manager is `uv` (by Astral) — NOT pip, poetry, or conda
**And** the project follows the architecture's backend structure: `app/main.py`, `app/api/`, `app/core/`, `app/crud/`, `app/db/`, `app/models/`, `app/schemas/`, `alembic/`, `tests/`

**Given** the backend project is initialized
**When** `app/main.py` is created
**Then** it creates a FastAPI application with `title="TaskFlow API"` and `prefix="/api/v1"`
**And** CORS middleware is configured allowing the Electron renderer origin (`http://localhost:*`)
**And** the app binds to `127.0.0.1` only (not `0.0.0.0`)

**Given** the FastAPI app is running
**When** a client sends `GET /health`
**Then** the server responds with `200 OK` and `{"status": "healthy"}`
**And** the health endpoint is at the root level (not under `/api/v1`)

**Given** any API error occurs
**When** the error response is generated
**Then** all errors return the normalized format `{"error": "Human-readable message"}` (not FastAPI's default `{"detail": ...}`)
**And** custom exception handlers are registered for `RequestValidationError`, `HTTPException`, and generic `Exception`

**Given** the Alembic configuration exists
**When** a developer runs Alembic commands
**Then** `alembic.ini` and `alembic/env.py` are configured with SQLAlchemy metadata from `app/models/`
**And** `alembic/env.py` overrides `sqlalchemy.url` at runtime from decrypted credentials

**Given** a root-level `pyinstaller_entrypoint.py` exists
**When** the backend is run via PyInstaller
**Then** it imports `multiprocessing.freeze_support()` and calls it before starting the app

---

### Story 1.2: Member Management API [Backend]

As a team lead,
I want to add, edit, view, and deactivate team members via API endpoints,
So that the team roster is managed and available for task assignment.

**Acceptance Criteria:**

**Given** the backend project from Story 1.1 is in place
**When** the Member model is created
**Then** a `members` table is created via Alembic migration with columns: `id` (UUID, PK, server-generated), `name` (VARCHAR(100), NOT NULL), `email` (VARCHAR, NOT NULL, UNIQUE), `active` (BOOLEAN, NOT NULL, default TRUE)
**And** column names match API_CONTRACT.md exactly (`active`, not `is_active`)

**Given** the `members` table exists
**When** a client sends `GET /api/v1/members`
**Then** the server returns `200 OK` with an array of all member objects: `{id, name, email, active}`

**Given** valid member data
**When** a client sends `POST /api/v1/members` with `{name, email, active}`
**Then** the server validates: name is 1-100 characters, email is valid format
**And** a new member is created with server-generated UUID
**And** the server returns `201 Created` with the full member object

**Given** an existing member
**When** a client sends `PATCH /api/v1/members/{id}` with partial fields (e.g., `{name}` or `{active}`)
**Then** only the provided fields are updated
**And** the server returns `200 OK` with the full updated member object

**Given** a member with zero assigned tasks
**When** a client sends `DELETE /api/v1/members/{id}`
**Then** the member is deleted and the server returns `204 No Content`

**Given** a member with N assigned tasks (N > 0)
**When** a client sends `DELETE /api/v1/members/{id}`
**Then** the server returns `409 Conflict` with `{"error": "Cannot delete member with N assigned task(s). Reassign or complete them first."}`

**Given** a member ID that does not exist
**When** any member endpoint is called with that ID
**Then** the server returns `404 Not Found` with `{"error": "Member not found"}`

**Given** all database queries in this story
**When** they execute
**Then** all use parameterized statements (no raw SQL string concatenation) per NFR8

---

### Story 1.3: Credential Encryption & Settings API [Backend]

As a team lead,
I want to configure the database connection through API endpoints with encrypted credential storage,
So that the application can connect to PostgreSQL securely without requiring admin privileges.

**Acceptance Criteria:**

**Given** the backend project exists
**When** the security module (`app/core/security.py`) is created
**Then** it uses `cryptography.fernet.Fernet` for symmetric encryption
**And** an encryption key is generated once and stored in a local file (e.g., `config_dir/fernet.key`)
**And** encrypted credentials are stored in a separate file (e.g., `config_dir/db_credentials.enc`)
**And** no admin privileges are required for any file operations (files stored in user-writable directory)

**Given** the security module is ready
**When** a client sends `POST /api/v1/settings/test-connection` with `{host, port, database, username, password}`
**Then** the server attempts a PostgreSQL connection with the provided credentials
**And** returns `200 OK` with `{"status": "ok"}` on success
**And** returns `400 Bad Request` with `{"error": "Connection failed: <specific reason>"}` on failure
**And** does NOT save the credentials

**Given** the security module is ready
**When** a client sends `POST /api/v1/settings/save-connection` with `{host, port, database, username, password}`
**Then** the server encrypts the credentials using Fernet and saves to the config directory
**And** returns `200 OK` with `{"status": "saved"}`
**And** no plaintext credentials appear in logs, temp files, or error messages (NFR7)

**Given** encrypted credentials exist in the config directory
**When** the backend starts up
**Then** it reads and decrypts the credentials automatically
**And** creates a SQLAlchemy engine and runs Alembic migrations programmatically
**And** the `/health` endpoint returns `200 OK` only after migrations complete and DB is connected

**Given** a transient database connection failure occurs during startup or operation
**When** the connection is attempted
**Then** the system retries with appropriate backoff (NFR10)
**And** on persistent failure, the `/health` endpoint reflects unhealthy status

**Given** Electron spawns the backend process
**When** the backend starts
**Then** it reads the config directory path from the `TASKFLOW_CONFIG_DIR` environment variable
**And** uses that path to locate encryption key and credential files

---

### Story 1.4: Frontend API Layer Refactor to Adapter Pattern [UI - Lovable]

As a developer,
I want the frontend API layer refactored from a monolithic mock-api.ts into a clean adapter pattern,
So that the mock implementation is cleanly separated and a real backend adapter can be plugged in later.

**Lovable AI Prompt:**

> Refactor the API layer in `src/lib/` from the current monolithic `mock-api.ts` to a clean adapter pattern:
>
> 1. Create `src/lib/api/types.ts` — TypeScript interfaces for all data models matching `API_CONTRACT.md` field names in camelCase: `Task` (with `assigneeId`, `assigneeName`, `gearId`, `blockingReason`, `subTasks`, `dailyUpdates`, `createdAt`, `updatedAt`), `SubTask` (with `id`, `title`, `completed`, `createdAt`), `DailyUpdate` (with `id`, `taskId`, `authorId`, `authorName`, `content`, `createdAt`, `updatedAt`, `edited`), `TeamMember` (with `id`, `name`, `email`, `active`).
>
> 2. Create `src/lib/api/client.ts` — Define an `ApiClient` interface with all methods: `getTasks(filters?)`, `getTask(id)`, `createTask(data)`, `updateTask(id, data)`, `deleteTask(id)`, `addSubTask(taskId, data)`, `toggleSubTask(taskId, subTaskId)`, `deleteSubTask(taskId, subTaskId)`, `addDailyUpdate(taskId, data)`, `editDailyUpdate(taskId, updateId, data)`, `deleteDailyUpdate(taskId, updateId)`, `getMembers()`, `createMember(data)`, `updateMember(id, data)`, `deleteMember(id)`, `testConnection(data)`, `saveConnection(data)`.
>
> 3. Create `src/lib/api/adapters/mock.ts` — Move all current mock logic from `mock-api.ts` into a class implementing `ApiClient`. Keep localStorage-backed data and artificial delays.
>
> 4. Create `src/lib/api/index.ts` — Export a singleton `apiClient` that currently resolves to the mock adapter. Include a comment `// Switch to real adapter when backend is available`.
>
> 5. Delete the old `mock-api.ts` and update all imports across the codebase to use `import { apiClient } from '@/lib/api'`.
>
> 6. Do NOT create a real adapter (`adapters/real.ts`). Only the mock adapter is needed now.
>
> All existing functionality must continue working exactly as before with no regressions.

**Acceptance Criteria:**

**Given** the refactored API layer is in place
**When** the application runs
**Then** all existing functionality works identically to before (no regressions)
**And** the mock adapter is the active implementation

**Given** the `ApiClient` interface exists
**When** a developer reviews it
**Then** all methods match the endpoints defined in API_CONTRACT.md
**And** all TypeScript types use camelCase field names matching the Frontend ↔ Backend Field Mapping table in API_CONTRACT.md

**Given** the adapter pattern is in place
**When** a developer needs to add a real backend adapter
**Then** they can create `adapters/real.ts` implementing `ApiClient` and swap the export in `index.ts` without changing any component code

---

### Story 1.5: Functional Settings Page & Connection Error Banner [UI - Lovable]

As a team lead,
I want the Settings page to allow configuring database connection details and see a connection error banner when the database is unreachable,
So that I can set up and troubleshoot the database connection through the UI.

**Lovable AI Prompt:**

> Update the Settings page and add a ConnectionErrorBanner component:
>
> 1. **Settings Page** (`src/pages/Settings.tsx`): Add a database connection form with fields: Host, Port, Database Name, Username, Password. The Password field must be masked by default with a show/hide toggle. Add two buttons: "Test Connection" (calls `apiClient.testConnection()`) and "Save" (calls `apiClient.saveConnection()`). Show success/error feedback via toast notifications. For mock mode, `testConnection` should simulate a 1-second delay then succeed, and `saveConnection` should store values in localStorage and show a success toast. Add a version number display at the bottom of the page (hardcoded "v1.0.0" for now).
>
> 2. **ConnectionErrorBanner** (`src/components/ConnectionErrorBanner.tsx`): Create a persistent alert banner that appears at the top of the dashboard when the database is unreachable. It should display an error icon, message "Unable to connect to database", and a "Go to Settings" link. For mock mode, this banner should never appear (mock is always "connected"). Style it as a destructive/error alert using shadcn/ui Alert component.
>
> 3. Add `testConnection(data)` and `saveConnection(data)` methods to the mock adapter if not already present. Mock implementations should simulate success after a brief delay.

**Acceptance Criteria:**

**Given** the Settings page is loaded
**When** a user fills in database connection fields
**Then** all fields are present: Host, Port, Database Name, Username, Password
**And** the Password field is masked by default with a show/hide toggle (NFR9)

**Given** valid connection details are entered
**When** the user clicks "Test Connection"
**Then** the system shows a loading state during the test
**And** displays success or failure feedback via toast notification
**And** does NOT save the credentials on test

**Given** valid connection details are entered
**When** the user clicks "Save"
**Then** the credentials are saved (localStorage in mock mode)
**And** a success toast is shown

**Given** the dashboard is loaded and the database is unreachable
**When** a connection error state is active
**Then** a ConnectionErrorBanner appears at the top of the dashboard with an error message and a link to Settings
**And** in mock mode, this banner never appears

**Given** the Settings page is loaded
**When** a user scrolls to the bottom
**Then** the application version "v1.0.0" is displayed

---

### Epic 1 Summary

| Story | Title | Track | FRs Covered |
|---|---|---|---|
| 1.1 | Initialize Backend Project & Health Endpoint | Backend | (Foundation for FR38-44) |
| 1.2 | Member Management API | Backend | FR25, FR26, FR27, FR28, FR29, FR30 |
| 1.3 | Credential Encryption & Settings API | Backend | FR38, FR39, FR40, FR41, FR43, FR44 |
| 1.4 | Frontend API Layer Refactor to Adapter Pattern | UI - Lovable | (Foundation for all FRs) |
| 1.5 | Functional Settings Page & Connection Error Banner | UI - Lovable | FR38, FR39, FR42 |

**Stories created:** 5 (3 Backend, 2 UI - Lovable)
**All Epic 1 FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30, FR38, FR39, FR40, FR41, FR43, FR44 ✅

---

## Epic 2: Core Task Management

### Story 2.1: Task Management API — CRUD & Business Logic [Backend]

As a user,
I want to create, view, update, and delete tasks via API endpoints with full field validation and status-driven business logic,
So that the team can track all work items with accurate status, priority, assignee, and GEAR ID information.

**Acceptance Criteria:**

**Given** the backend project and members table from Epic 1 exist
**When** the Task model is created
**Then** a `tasks` table is created via Alembic migration with columns: `id` (UUID, PK, server-generated), `title` (VARCHAR(200), NOT NULL), `description` (VARCHAR(2000), nullable), `status` (ENUM: "To Do", "In Progress", "Blocked", "Done", NOT NULL), `priority` (ENUM: "High", "Medium", "Low", NOT NULL), `assignee_id` (UUID, FK to members.id, nullable), `assignee_name` (VARCHAR(100), nullable), `gear_id` (VARCHAR(4), nullable), `blocking_reason` (VARCHAR, NOT NULL, default ""), `created_at` (TIMESTAMP, server-generated), `updated_at` (TIMESTAMP, server-managed)
**And** column names match API_CONTRACT.md exactly
**And** indexes are created: `idx_tasks_status`, `idx_tasks_assignee_id`

**Given** the `tasks` table exists
**When** a client sends `GET /api/v1/tasks`
**Then** the server returns `200 OK` with an array of all task objects, each including embedded `sub_tasks: []` and `daily_updates: []` arrays (empty at this stage)
**And** the response includes `assignee_name` resolved from the members table

**Given** query parameters are provided on `GET /api/v1/tasks`
**When** `status` is provided
**Then** results are filtered to tasks matching that status exactly

**Given** query parameters are provided on `GET /api/v1/tasks`
**When** `priority` is provided
**Then** results are filtered to tasks matching that priority exactly

**Given** query parameters are provided on `GET /api/v1/tasks`
**When** `assignee` is provided as a UUID
**Then** results are filtered to tasks where `assignee_id` matches that UUID
**And** when `assignee` is `"unassigned"`, results are filtered to tasks where `assignee_id` is null

**Given** query parameters are provided on `GET /api/v1/tasks`
**When** `search` is provided
**Then** results are filtered to tasks where `title`, `description`, or `gear_id` contain the search term (case-insensitive partial match)

**Given** query parameters are provided on `GET /api/v1/tasks`
**When** `sort` is provided
**Then** results are sorted by: `updated` (default, descending `updated_at`), `priority` (High > Medium > Low), or `status` (To Do > In Progress > Blocked > Done)

**Given** a valid task ID
**When** a client sends `GET /api/v1/tasks/{id}`
**Then** the server returns `200 OK` with the full task object (same shape as list item)

**Given** valid task data
**When** a client sends `POST /api/v1/tasks` with `{title, status, priority}` and optional `{description, assignee_id, gear_id, blocking_reason}`
**Then** the server validates: title 1-200 chars, description max 2000 chars, status is valid enum, priority is valid enum
**And** if `gear_id` is provided, it must match `/^\d{4}$/` (exactly 4 digits) or return `400` with `{"error": "GEAR ID must be exactly 4 digits"}`
**And** if `status` is "Blocked" and `blocking_reason` is empty/missing, return `400` with `{"error": "Blocking reason is required when status is Blocked"}`
**And** if `assignee_id` is provided, `assignee_name` is resolved from the members table
**And** `created_at` and `updated_at` are set server-side
**And** `sub_tasks` and `daily_updates` are initialized as empty arrays
**And** the server returns `201 Created` with the full task object

**Given** an existing task
**When** a client sends `PATCH /api/v1/tasks/{id}` with partial fields
**Then** only the provided fields are updated and `updated_at` is refreshed
**And** the server returns `200 OK` with the full updated task object

**Given** a task with status "Blocked"
**When** a client sends `PATCH /api/v1/tasks/{id}` with `{status: "In Progress"}` (or any non-Blocked status)
**Then** the server automatically sets `blocking_reason` to `""` regardless of whether blocking_reason was included in the request

**Given** a task update changes `assignee_id`
**When** the update is processed
**Then** `assignee_name` is re-resolved from the members table
**And** if `assignee_id` is set to null, `assignee_name` is set to null

**Given** an existing task
**When** a client sends `DELETE /api/v1/tasks/{id}`
**Then** the task and all its sub_tasks and daily_updates are cascading deleted
**And** the server returns `204 No Content`

**Given** a task ID that does not exist
**When** any task endpoint is called with that ID
**Then** the server returns `404 Not Found` with `{"error": "Task not found"}`

**Given** all database mutations in this story
**When** they execute
**Then** all operations are atomic — partial writes do not corrupt state (NFR14)
**And** all queries use parameterized statements (NFR8)
**And** on connection interruptions, appropriate error responses are returned so the frontend can preserve user input (FR45)

---

### Story 2.2: Task Detail Page with Adapter Pattern [UI - Lovable]

As a user,
I want the task detail page and task creation/edit forms to work correctly through the new adapter pattern,
So that all task management features function properly with the refactored API layer.

**Lovable AI Prompt:**

> Verify and update the task management flows to work through the adapter pattern from Story 1.4:
>
> 1. Ensure the mock adapter's task methods correctly implement all business rules: `getTasks(filters?)` with support for `status`, `priority`, `assignee` (UUID or `"unassigned"`), `search` (case-insensitive partial match on title, description, gearId), and `sort` (`updated`, `priority`, `status`) parameters; `getTask(id)` returning full task with `subTasks` and `dailyUpdates` arrays; `createTask(data)` with field validation (title 1-200 chars, gearId `/^\d{4}$/` if provided, blockingReason required when status="Blocked"); `updateTask(id, data)` as partial update with auto-clear of `blockingReason` when status changes away from "Blocked"; `deleteTask(id)` with cascading removal of sub-tasks and daily updates.
>
> 2. Ensure assignee name resolution in mock: when `assigneeId` is set or changed, resolve `assigneeName` from the mock members list. When `assigneeId` is null, set `assigneeName` to null.
>
> 3. All task forms must preserve user input if an API call fails — do NOT clear the form on error.
>
> 4. Ensure all existing task UI components import from `@/lib/api` (the new adapter pattern) and not the old `mock-api.ts`.

**Acceptance Criteria:**

**Given** the adapter pattern from Story 1.4 is in place
**When** a user creates, views, edits, or deletes tasks
**Then** all operations go through `apiClient` methods from the adapter layer
**And** no component directly imports from the old `mock-api.ts`

**Given** a user creates a task with status "Blocked"
**When** they leave the blocking reason empty
**Then** validation prevents submission and shows an error

**Given** a user edits a task and changes status away from "Blocked"
**When** the update is saved
**Then** the blocking reason is automatically cleared

**Given** a user is filling out a task form
**When** an API error occurs during save
**Then** the form retains all entered data (no form clearing on error)

**Given** the mock adapter handles task operations
**When** filtering, sorting, or searching is applied
**Then** all query parameters work correctly matching the API_CONTRACT.md specification

---

### Epic 2 Summary

| Story | Title | Track | FRs Covered |
|---|---|---|---|
| 2.1 | Task Management API — CRUD & Business Logic | Backend | FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR45 |
| 2.2 | Task Detail Page with Adapter Pattern | UI - Lovable | FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR45 |

**Stories created:** 2 (1 Backend, 1 UI - Lovable)
**All Epic 2 FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR45 ✅

---

## Epic 3: Task Breakdown & Daily Progress Tracking

### Story 3.1: Sub-Task Management API [Backend]

As an engineer,
I want to add, toggle, edit, reorder, and remove sub-tasks on a task via API endpoints,
So that I can break down tasks into trackable checklist items with up to 20 items per task.

**Acceptance Criteria:**

**Given** the backend project and tasks table from Epic 2 exist
**When** the SubTask model is created
**Then** a `sub_tasks` table is created via Alembic migration with columns: `id` (UUID, PK, server-generated), `task_id` (UUID, FK to tasks.id, NOT NULL, ON DELETE CASCADE), `title` (VARCHAR(200), NOT NULL), `completed` (BOOLEAN, NOT NULL, default FALSE), `position` (INTEGER, NOT NULL), `created_at` (TIMESTAMP, server-generated)
**And** an index `idx_sub_tasks_task_id` is created on `task_id`

**Given** a valid task exists
**When** a client sends `POST /api/v1/tasks/{taskId}/subtasks` with `{title}`
**Then** the server validates title is 1-200 characters
**And** checks the task does not already have 20 sub-tasks (return `400` with `{"error": "Maximum of 20 sub-tasks per task"}` if exceeded)
**And** creates the sub-task with `completed: false` and `position` auto-assigned as next in sequence
**And** refreshes the parent task's `updated_at`
**And** returns `201 Created` with `{id, title, completed, created_at}`

**Given** an existing sub-task
**When** a client sends `PATCH /api/v1/tasks/{taskId}/subtasks/{subTaskId}/toggle`
**Then** the `completed` field is flipped (true→false or false→true)
**And** the parent task's `updated_at` is refreshed
**And** returns `200 OK` with `{id, title, completed}`

**Given** an existing sub-task
**When** a client sends `PATCH /api/v1/tasks/{taskId}/subtasks/{subTaskId}` with `{title}`
**Then** the sub-task title is updated (validated 1-200 chars)
**And** the parent task's `updated_at` is refreshed
**And** returns `200 OK` with the updated sub-task object

**Given** a task with multiple sub-tasks
**When** a client sends `PUT /api/v1/tasks/{taskId}/subtasks/reorder` with `{sub_task_ids: [id3, id1, id2]}`
**Then** the position values are updated to match the new order
**And** the parent task's `updated_at` is refreshed
**And** returns `200 OK` with the reordered sub-tasks array

**Given** an existing sub-task
**When** a client sends `DELETE /api/v1/tasks/{taskId}/subtasks/{subTaskId}`
**Then** the sub-task is deleted
**And** the parent task's `updated_at` is refreshed
**And** returns `204 No Content`

**Given** sub-tasks exist for a task
**When** the parent task is retrieved (GET /tasks/{id} or GET /tasks)
**Then** sub-tasks are returned in the `sub_tasks` array ordered by `position` ascending

**Given** a sub-task ID or task ID that does not exist
**When** any sub-task endpoint is called
**Then** the server returns `404 Not Found` with appropriate error message

**Given** all mutations in this story
**When** they execute
**Then** all operations are atomic (NFR14) and use parameterized statements (NFR8)

---

### Story 3.2: Daily Update Management API [Backend]

As an engineer,
I want to add, edit, and delete timestamped daily progress updates on a task with author attribution,
So that the team has a chronological log of work progress with 24-hour edit/delete windows and edited indicators.

**Acceptance Criteria:**

**Given** the backend project, tasks table, and members table exist
**When** the DailyUpdate model is created
**Then** a `daily_updates` table is created via Alembic migration with columns: `id` (UUID, PK, server-generated), `task_id` (UUID, FK to tasks.id, NOT NULL, ON DELETE CASCADE), `author_id` (UUID, FK to members.id, NOT NULL), `author_name` (VARCHAR(100), NOT NULL), `content` (VARCHAR(1000), NOT NULL), `created_at` (TIMESTAMP, server-generated), `updated_at` (TIMESTAMP, server-managed), `edited` (BOOLEAN, NOT NULL, default FALSE)
**And** column names match API_CONTRACT.md exactly (`content`, not `update_text`; `edited`, not `is_edited`)
**And** an index `idx_daily_updates_task_id` is created on `task_id`

**Given** a valid task exists
**When** a client sends `POST /api/v1/tasks/{taskId}/updates` with `{author_id, content}`
**Then** the server validates content is 1-1000 characters
**And** resolves `author_name` from `author_id` using the members table (return `400` if author not found)
**And** sets `edited: false`, `created_at` and `updated_at` to current timestamp
**And** refreshes the parent task's `updated_at`
**And** returns `201 Created` with the full daily update object: `{id, task_id, author_id, author_name, content, created_at, updated_at, edited}`

**Given** an existing daily update created less than 24 hours ago
**When** a client sends `PATCH /api/v1/tasks/{taskId}/updates/{updateId}` with `{content}`
**Then** the content is updated (validated 1-1000 chars)
**And** `edited` is set to `true`
**And** `updated_at` is refreshed
**And** the parent task's `updated_at` is refreshed
**And** returns `200 OK` with the full updated daily update object

**Given** an existing daily update created more than 24 hours ago
**When** a client sends `PATCH /api/v1/tasks/{taskId}/updates/{updateId}`
**Then** the server returns `403 Forbidden` with `{"error": "Updates can only be edited within 24 hours."}`

**Given** an existing daily update created less than 24 hours ago
**When** a client sends `DELETE /api/v1/tasks/{taskId}/updates/{updateId}`
**Then** the update is deleted
**And** the parent task's `updated_at` is refreshed
**And** returns `204 No Content`

**Given** an existing daily update created more than 24 hours ago
**When** a client sends `DELETE /api/v1/tasks/{taskId}/updates/{updateId}`
**Then** the server returns `403 Forbidden` with `{"error": "Updates can only be deleted within 24 hours."}`

**Given** daily updates exist for a task
**When** the parent task is retrieved (GET /tasks/{id} or GET /tasks)
**Then** daily updates are returned in the `daily_updates` array ordered by `created_at` descending (newest first)

**Given** an update ID or task ID that does not exist
**When** any daily update endpoint is called
**Then** the server returns `404 Not Found` with appropriate error message

**Given** all mutations in this story
**When** they execute
**Then** all operations are atomic (NFR14) and use parameterized statements (NFR8)

---

### Story 3.3: Sub-Tasks & Daily Updates UI [UI - Lovable]

As an engineer,
I want the task detail page to support sub-task management and daily progress updates through the adapter pattern,
So that I can break down work and log progress directly from the UI.

**Lovable AI Prompt:**

> Update the task detail page and mock adapter to fully support sub-tasks and daily updates:
>
> **Sub-Tasks:**
> 1. Mock adapter methods: `addSubTask(taskId, {title})` — enforce max 20 sub-tasks per task, return error if exceeded; `toggleSubTask(taskId, subTaskId)` — flip completed boolean; `deleteSubTask(taskId, subTaskId)` — remove sub-task. Also add `editSubTask(taskId, subTaskId, {title})` for inline title editing and `reorderSubTasks(taskId, subTaskIds[])` for drag-reorder support.
> 2. Sub-task completion progress display showing "X/Y completed" (e.g., "3/5 completed") on the task detail page.
> 3. Sub-task list with checkboxes, inline title editing on click, drag handles for reorder, and a delete button per item.
> 4. "Add sub-task" input field at the bottom of the sub-task list.
>
> **Daily Updates:**
> 5. Mock adapter methods: `addDailyUpdate(taskId, {authorId, content})` — resolve `authorName` from mock members; `editDailyUpdate(taskId, updateId, {content})` — enforce 24-hour edit window (return 403 error if expired), set `edited: true`; `deleteDailyUpdate(taskId, updateId)` — enforce 24-hour delete window (return 403 error if expired).
> 6. Daily update list displayed in reverse chronological order (newest first) with: author name, timestamp, content, and an "(edited)" indicator when `edited` is true.
> 7. Edit and delete buttons visible only on updates within 24 hours of creation. Hide buttons and show "Past edit window" tooltip for older updates.
> 8. "Add Update" dialog/form with an author dropdown (populated from members list) and a content textarea (max 1000 chars). **Remember the last-selected author in localStorage** so the user doesn't have to re-select each time.
>
> All operations must go through `apiClient` from `@/lib/api`. Ensure parent task's `updatedAt` is refreshed in mock after any sub-task or daily update mutation.

**Acceptance Criteria:**

**Given** a task with sub-tasks
**When** the task detail page is loaded
**Then** sub-tasks are displayed as a checklist with completion progress (e.g., "3/5 completed")
**And** each sub-task has a checkbox, editable title, and delete option

**Given** a task with fewer than 20 sub-tasks
**When** a user adds a new sub-task
**Then** it appears at the bottom of the list with an unchecked checkbox

**Given** a task with exactly 20 sub-tasks
**When** a user tries to add another sub-task
**Then** an error message is shown: "Maximum of 20 sub-tasks per task"

**Given** a sub-task exists
**When** a user clicks the checkbox
**Then** the completed state toggles and the progress count updates

**Given** multiple sub-tasks exist
**When** a user drags a sub-task to a new position
**Then** the sub-tasks are reordered and the new order persists

**Given** a task with daily updates
**When** the task detail page is loaded
**Then** updates are shown newest-first with author name, timestamp, content, and "(edited)" indicator where applicable

**Given** a daily update created less than 24 hours ago
**When** a user clicks edit
**Then** they can modify the content and save it, and "(edited)" appears after save

**Given** a daily update created more than 24 hours ago
**When** a user views the update
**Then** edit and delete buttons are hidden or disabled with a "Past edit window" indicator

**Given** a user opens the "Add Update" dialog
**When** the author dropdown loads
**Then** it shows all active members and pre-selects the last-used author from localStorage

**Given** a user adds a daily update
**When** the update is saved
**Then** it appears at the top of the updates list with the resolved author name

---

### Epic 3 Summary

| Story | Title | Track | FRs Covered |
|---|---|---|---|
| 3.1 | Sub-Task Management API | Backend | FR12, FR13, FR14, FR15, FR16, FR17 |
| 3.2 | Daily Update Management API | Backend | FR18, FR19, FR20, FR21, FR22, FR23, FR24 |
| 3.3 | Sub-Tasks & Daily Updates UI | UI - Lovable | FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24 |

**Stories created:** 3 (2 Backend, 1 UI - Lovable)
**All Epic 3 FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24 ✅

---

## Epic 4: Dashboard, Filtering & Search

### Story 4.1: Dashboard Enhancement — StatusSummaryBar, Filters, Search & Quick Actions [UI - Lovable]

As a team lead,
I want a dashboard with status summary counts, filtering by any attribute, sorting, search, and quick actions on task cards,
So that I can assess team status at a glance, find specific tasks in under 30 seconds, and take common actions without navigating away.

**Lovable AI Prompt:**

> Enhance the task dashboard with the following components and behaviors:
>
> 1. **StatusSummaryBar** (`src/components/StatusSummaryBar.tsx`): A compact horizontal bar above the task grid showing counts per status: "To Do: N | In Progress: N | Blocked: N | Done: N". Each status count is clickable — clicking it sets the status filter to that status. Clicking the already-active status clears the filter. Use color-coded badges matching the task status colors.
>
> 2. **Filter Controls**: Add filter dropdowns below the StatusSummaryBar:
>    - Status dropdown: "All", "To Do", "In Progress", "Blocked", "Done"
>    - Priority dropdown: "All", "High", "Medium", "Low"
>    - Assignee dropdown: "All", "Unassigned", plus each active team member by name (value = member UUID)
>    - GEAR ID text input: filters tasks whose gearId starts with the typed value
>    Filters work additively (AND logic). Pass filter values to `apiClient.getTasks({status, priority, assignee, search, sort})`.
>
> 3. **Sort Controls**: Add a sort dropdown: "Recently Updated" (default), "Recently Created", "Priority (High→Low)".
>
> 4. **Search Bar**: A text input that searches across title, description, and GEAR ID. Debounce input by 300ms before calling the API. Pass as the `search` query parameter.
>
> 5. **Blocked Task Visual Distinction**: Task cards with status "Blocked" must have a visually prominent indicator — red/warning left border or outline. The `blockingReason` must be visible directly on the card (not hidden behind a click). Use a warning icon next to the reason text.
>
> 6. **Priority & Status Visual Indicators**: Each task card shows color-coded badges for priority (High=red, Medium=yellow, Low=green) and status (To Do=gray, In Progress=blue, Blocked=red, Done=green).
>
> 7. **InlineStatusSelect** (`src/components/InlineStatusSelect.tsx`): A dropdown on each task card allowing quick status change without opening the detail page. When changing to "Blocked", show an inline input for blocking reason. When changing away from "Blocked", auto-clear the blocking reason.
>
> 8. **Quick Actions on Task Cards**: Each card has action buttons/menu: "Mark as Done" (one-click status change), "Edit" (navigate to edit form), "Delete" (with confirmation dialog).
>
> 9. **Filter Persistence**: Store the current filter state (status, priority, assignee, GEAR ID, sort, search) in `localStorage` under key `taskflow-dashboard-filters`. Restore filters on page load and after app restart.
>
> 10. **Codebase Cleanup** (from UX spec): Extract shared status/priority color constants to `src/lib/constants.ts`. Remove any dead code files (App.css, NavLink.tsx if unused). Remove dark mode artifacts. Remove unused sidebar component if present. Consolidate toast system — remove Sonner if present, keep only Radix Toaster. Remove unused shadcn primitives.
>
> Ensure all interactions respond within 200ms (NFR3) and filtering/sorting completes within 500ms for up to 500 tasks (NFR5).

**Acceptance Criteria:**

**Given** the dashboard is loaded with tasks
**When** a user views the StatusSummaryBar
**Then** it displays accurate counts for each status category (To Do, In Progress, Blocked, Done)
**And** clicking a status count filters the task list to that status
**And** clicking the active filter again clears it

**Given** the dashboard has filter controls
**When** a user selects filters for status, priority, and/or assignee
**Then** the task list updates to show only tasks matching ALL selected filters (AND logic)
**And** filtering completes within 500ms (NFR5)

**Given** a GEAR ID filter input
**When** a user types a partial GEAR ID (e.g., "10")
**Then** the task list filters to tasks whose GEAR ID starts with "10"

**Given** the sort dropdown
**When** a user selects a sort option
**Then** tasks are reordered accordingly: by updated date, created date, or priority level

**Given** the search bar
**When** a user types a search term
**Then** after a 300ms debounce, the task list filters to tasks matching on title, description, or GEAR ID (case-insensitive)

**Given** a task with status "Blocked"
**When** it appears on the dashboard
**Then** the card has a visually prominent red/warning indicator
**And** the blocking reason text is visible directly on the card

**Given** task cards on the dashboard
**When** a user views any card
**Then** color-coded badges for priority and status are visible

**Given** a task card's InlineStatusSelect
**When** a user changes the status to "Blocked"
**Then** an inline input appears for the blocking reason before the change is saved

**Given** quick action buttons on a task card
**When** a user clicks "Mark as Done"
**Then** the task status changes to "Done" immediately with visual feedback

**Given** quick action buttons on a task card
**When** a user clicks "Delete"
**Then** a confirmation dialog appears before deletion proceeds

**Given** dashboard filters are set
**When** the user navigates away and returns (or restarts the app)
**Then** the previously selected filters are restored from localStorage

**Given** the codebase cleanup is applied
**When** a developer reviews the code
**Then** shared color constants exist in `src/lib/constants.ts`
**And** dead code (unused files, dark mode artifacts, duplicate toast systems) is removed

---

### Story 4.2: Real API Adapter [Backend]

As a developer,
I want a real API adapter that makes HTTP calls to the FastAPI backend with camelCase/snake_case transformation,
So that the frontend can be switched from mock data to the live backend without changing any component code.

**Note:** This story is Backend-owned. The file lives in `taskflow-ui/src/lib/api/adapters/real.ts` but is authored by the CLI AI tools team because it requires a running FastAPI server to test against. Lovable AI cannot test real HTTP calls.

**Acceptance Criteria:**

**Given** the `ApiClient` interface from `src/lib/api/client.ts` exists
**When** `adapters/real.ts` is created
**Then** it implements every method of the `ApiClient` interface with HTTP calls to `http://127.0.0.1:8000/api/v1/...`

**Given** the real adapter makes HTTP requests
**When** sending data to the backend
**Then** all request bodies are transformed from camelCase to snake_case (e.g., `assigneeId` → `assignee_id`, `blockingReason` → `blocking_reason`, `gearId` → `gear_id`)

**Given** the real adapter receives HTTP responses
**When** parsing response bodies
**Then** all response data is transformed from snake_case to camelCase (e.g., `assignee_name` → `assigneeName`, `created_at` → `createdAt`, `daily_updates` → `dailyUpdates`)

**Given** the backend returns an error response `{"error": "message"}`
**When** the real adapter processes it
**Then** it throws a typed error that components can catch and display to the user

**Given** the backend is unreachable (connection refused, timeout)
**When** any API call is made
**Then** the adapter throws a connection error that the ConnectionErrorBanner can detect and display

**Given** the real adapter is complete
**When** `src/lib/api/index.ts` is updated
**Then** it supports toggling between mock and real adapters (e.g., via `VITE_API_MODE=real` environment variable or runtime detection of backend availability)
**And** the default remains mock adapter for Lovable AI development

**Given** the real adapter is activated
**When** a developer runs the full stack (backend + frontend)
**Then** all CRUD operations for tasks, sub-tasks, daily updates, members, and settings work end-to-end through the real adapter

---

### Epic 4 Summary

| Story | Title | Track | FRs Covered |
|---|---|---|---|
| 4.1 | Dashboard Enhancement — StatusSummaryBar, Filters, Search & Quick Actions | UI - Lovable | FR31, FR32, FR33, FR34, FR35, FR36, FR37 |
| 4.2 | Real API Adapter | Backend | (Integration bridge for all FRs) |

**Stories created:** 2 (1 Backend, 1 UI - Lovable)
**All Epic 4 FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37 ✅

---

## Epic 5: Desktop Packaging & Distribution

### Story 5.1: Electron Shell with Health-Check Startup Sequencing [Backend]

As a user,
I want to double-click the TaskFlow executable and have it launch with the backend starting automatically,
So that the application is ready to use without manual setup steps.

**Acceptance Criteria:**

**Given** no Electron project exists yet
**When** a developer initializes the Electron shell
**Then** a root-level `package.json` is created with Electron, electron-builder, and necessary dev dependencies
**And** electron-builder is configured with `portable` target (not NSIS) — no installer, no admin privileges required
**And** the Electron main process file (`electron/main.js` or `electron/main.ts`) is created

**Given** the Electron main process starts
**When** it initializes
**Then** it spawns the PyInstaller-bundled backend (`api.exe` or `api/` directory) as a child process
**And** passes the `TASKFLOW_CONFIG_DIR` environment variable to the child process (pointing to `%LOCALAPPDATA%/TaskFlow/` or a user-writable directory)
**And** the backend binds to `127.0.0.1:8000` (not `0.0.0.0`)

**Given** the backend child process is spawned
**When** Electron begins health-check polling
**Then** it sends `GET http://127.0.0.1:8000/health` every 200ms
**And** retries up to 30 times (6 seconds maximum)

**Given** the health check succeeds (returns `200 OK` with `{"status": "healthy"}`)
**When** Electron receives the success response
**Then** it creates the main BrowserWindow and loads the React frontend (Vite production build from `taskflow-ui/dist/`)
**And** the dashboard is displayed within 5 seconds of the user double-clicking the executable (NFR1)
**And** the health check passes within 3 seconds of the backend process starting (NFR4)

**Given** the health check fails after 30 retries
**When** the maximum retry count is reached
**Then** Electron displays an error dialog with the message: "Backend failed to start. Please check if port 8000 is already in use, or if your database credentials are configured correctly in Settings."
**And** the error message is actionable with clear guidance (FR46, NFR13)

**Given** port 8000 is already in use by another process
**When** the backend attempts to start
**Then** the startup failure is detected and communicated with a clear, actionable error message mentioning the port conflict (NFR13)

**Given** the Electron window is created
**When** it loads the frontend
**Then** the minimum window size is set to 1024x600 with responsive layout adaptation (NFR18)

---

### Story 5.2: Clean Process Shutdown & Version Display [Backend]

As a user,
I want the application to shut down cleanly with no orphan processes and display the version number,
So that I know which version I'm running and the app doesn't leave background processes consuming resources.

**Acceptance Criteria:**

**Given** the Electron application is running with the backend child process
**When** the user closes the application window
**Then** Electron's `will-quit` or `window-all-closed` event triggers
**And** the backend child process is killed via `child_process.kill()`
**And** no orphan `api.exe` processes remain after application close (NFR11)

**Given** the Electron main process crashes unexpectedly
**When** the crash occurs
**Then** signal handlers (`SIGINT`, `SIGTERM`, `uncaughtException`, `unhandledRejection`) ensure the backend child process is also terminated
**And** no orphan processes remain even in crash scenarios (NFR11)

**Given** the backend child process becomes unresponsive
**When** Electron attempts to shut it down
**Then** it first sends a graceful shutdown signal, then force-kills after a timeout (e.g., 5 seconds)

**Given** the application version is defined in root `package.json`
**When** the Electron app starts
**Then** the version number is made available to the frontend via `window.electronAPI.getVersion()` or an injected environment variable
**And** the Settings page displays the version number (FR42)

**Given** the application is running
**When** any process (Electron, backend) needs to shut down
**Then** all processes are cleaned up — no zombie processes, no dangling connections (FR47)

---

### Story 5.3: PyInstaller Bundling & Portable Executable [Backend]

As a team member,
I want TaskFlow packaged as a portable Windows executable under 200MB that runs without installation or admin privileges,
So that I can run the app by copying it to any Windows 10/11 machine and double-clicking.

**Acceptance Criteria:**

**Given** the backend code is complete
**When** a PyInstaller `.spec` file is created
**Then** it is configured for `--onedir` mode (not `--onefile`)
**And** the root-level `pyinstaller_entrypoint.py` is the entry point
**And** `multiprocessing.freeze_support()` is called before any app code executes

**Given** the `.spec` file is configured
**When** the backend is bundled
**Then** all hidden imports are explicitly specified: uvicorn, uvicorn.logging, uvicorn.protocols, pydantic, sqlalchemy, alembic, psycopg2, cryptography
**And** Alembic migration files are bundled via `.spec` `datas` configuration (e.g., `('alembic/', 'alembic/')`)
**And** `alembic.ini` is bundled alongside

**Given** the frontend is built and the backend is bundled
**When** electron-builder packages the application
**Then** the output is a `portable` target executable (not NSIS installer)
**And** the backend `dist/` folder is embedded within the Electron package
**And** the React frontend `dist/` folder is embedded within the Electron package

**Given** the portable executable is created
**When** its size is checked
**Then** the total size is under 200MB (NFR20)

**Given** the portable executable is scanned
**When** running on a machine with clean Windows Defender
**Then** no antivirus false positives are triggered (NFR21)

**Given** the portable executable is run
**When** executed on Windows 10 or Windows 11 (x64)
**Then** it launches successfully without additional runtime dependencies (NFR22)
**And** no admin privileges are required to run (NFR19)
**And** no registry modifications are made (NFR23)
**And** no file associations are created (NFR23)
**And** no system-level side effects occur (NFR23)

**Given** the application stores data
**When** writing configuration or credentials
**Then** all files are stored in a user-writable directory (e.g., `%LOCALAPPDATA%/TaskFlow/`)
**And** no writes to Program Files, Windows directory, or registry

---

### Epic 5 Summary

| Story | Title | Track | FRs Covered |
|---|---|---|---|
| 5.1 | Electron Shell with Health-Check Startup Sequencing | Backend | FR46 |
| 5.2 | Clean Process Shutdown & Version Display | Backend | FR42, FR47 |
| 5.3 | PyInstaller Bundling & Portable Executable | Backend | (NFR19-23 packaging) |

**Stories created:** 3 (3 Backend, 0 UI - Lovable)
**All Epic 5 FRs covered:** FR42, FR46, FR47 ✅

---

## Complete Story Index

| Story | Title | Track |
|---|---|---|
| 1.1 | Initialize Backend Project & Health Endpoint | Backend |
| 1.2 | Member Management API | Backend |
| 1.3 | Credential Encryption & Settings API | Backend |
| 1.4 | Frontend API Layer Refactor to Adapter Pattern | UI - Lovable |
| 1.5 | Functional Settings Page & Connection Error Banner | UI - Lovable |
| 2.1 | Task Management API — CRUD & Business Logic | Backend |
| 2.2 | Task Detail Page with Adapter Pattern | UI - Lovable |
| 3.1 | Sub-Task Management API | Backend |
| 3.2 | Daily Update Management API | Backend |
| 3.3 | Sub-Tasks & Daily Updates UI | UI - Lovable |
| 4.1 | Dashboard Enhancement — StatusSummaryBar, Filters, Search & Quick Actions | UI - Lovable |
| 4.2 | Real API Adapter | Backend |
| 5.1 | Electron Shell with Health-Check Startup Sequencing | Backend |
| 5.2 | Clean Process Shutdown & Version Display | Backend |
| 5.3 | PyInstaller Bundling & Portable Executable | Backend |

**Total: 15 stories (10 Backend, 5 UI - Lovable)**
