---
project_name: 'taskflow'
user_name: 'parth'
date: '2026-02-22'
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: 'complete'
rule_count: 56
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend:** React 18.3.1, TypeScript 5.8.3, Vite 5.4.19, Tailwind CSS 3.4.17, shadcn/ui, TanStack Query 5.83.0
- **Backend:** Python 3.12+, FastAPI >=0.109.0, SQLAlchemy 2.x (Sync), Pydantic v2 (>=2.5.0), Alembic >=1.13.0
- **Desktop:** Electron 28.x+, electron-builder 24.x+ (portable target), PyInstaller (onedir mode)
- **Database:** PostgreSQL 16+ (local/external), psycopg2-binary >=2.9.9
- **Package Managers:** `npm` (Frontend/Electron), `uv` (Backend - required)

## Critical Implementation Rules

### Language-Specific Rules

- **Python (Backend):**
    - **Package Manager:** MUST use `uv` (not pip/poetry). Commands: `uv add`, `uv sync`, `uv run`.
    - **Pydantic v2:** Use `model_config = {"from_attributes": True}` (deprecated `orm_mode`).
    - **SQLAlchemy:** Synchronous engine only (not async).
    - **Error Handling:** Return `{"error": "message"}` (not `{"detail": ...}`).
    - **Type Hints:** Mandatory for all function arguments and return types.

- **TypeScript (Frontend):**
    - **Strict Mode:** Enabled. No `any` types.
    - **Components:** Prefer `shadcn/ui` (Radix-based).
    - **State Management:** TanStack Query for server state; React Context/Zustand for client state.
    - **Forms:** React Hook Form + Zod schemas.
    - **API Layer:** Use Adapter pattern (`adapters/real.ts` vs `adapters/mock.ts`).

### Framework-Specific Rules

- **React (Frontend):**
    - **State Management:** Use TanStack Query for server state. Avoid `useEffect` for data fetching.
    - **UI Components:** Use `shadcn/ui` components (Radix-based). Minimize custom CSS.
    - **Forms:** React Hook Form + Zod validation.
    - **Navigation:** React Router.

- **FastAPI (Backend):**
    - **Binding:** Bind to `127.0.0.1` ONLY (for security).
    - **Session:** Use `Depends(get_db)` for DB sessions.
    - **Routers:** Use `APIRouter` for modular endpoints (`app/api/v1/`).
    - **Errors:** Must return `{"error": "message"}` format.

- **Electron (Desktop):**
    - **Lifecycle:** Main process spawns/kills backend child process.
    - **Health Check:** Poll `http://127.0.0.1:8000/health` before creating window.
    - **Security:** Store credentials encrypted (Fernet), not in env vars.

### Testing Rules

- **Backend (Pytest):**
    - **Framework:** `pytest` + `TestClient` (FastAPI).
    - **Structure:** `tests/` directory. Use `conftest.py` for fixtures.
    - **Mocking:** Use `app.dependency_overrides` for DB dependencies.
    - **Naming:** `test_*.py` files, `test_*` functions.

- **Frontend (Vitest):**
    - **Framework:** `vitest` + `@testing-library/react`.
    - **Strategy:** Test user interactions (click, type) over implementation details.
    - **Files:** `*.test.tsx` located alongside components or in `tests/`.

- **Integration (Playwright):**
    - **Scope:** Critical user flows (e.g., Task Creation, Daily Updates).
    - **Execution:** Ensure backend is running before Playwright tests.

### Code Quality & Style Rules

- **Backend (Python):**
    - **Linting:** Use `ruff` for linting.
    - **Formatting:** Use `black` (or `ruff format`).
    - **Naming:** `snake_case` for variables/functions, `PascalCase` for classes.
    - **Docstrings:** Use docstrings for all public modules/classes/functions.

- **Frontend (TypeScript):**
    - **Linting:** `eslint` + `prettier` enabled.
    - **Naming:** `PascalCase` for React components/files, `camelCase` for functions/variables.
    - **Structure:** Follow `shadcn/ui` organization (`components/`, `lib/`, `hooks/`).
    - **No `any`:** Avoid `any` type usage.

- **General:**
    - **Commits:** Use Conventional Commits (e.g., `feat:`, `fix:`, `chore:`).
    - **Functions:** Keep functions small and focused (Single Responsibility Principle).

### Development Workflow Rules

- **Repository Structure:**
    - **Subtree Management:** `taskflow-ui` is managed via `git subtree`. Pull updates with `--squash` (`git subtree pull --prefix=taskflow-ui ...`).
    - **Branching:** Use `feat/`, `fix/`, `chore/` conventions.

- **Build & Package:**
    - **Backend:** `uv run pyinstaller --onedir --name api pyinstaller_entrypoint.py`.
    - **Frontend:** `npm run build`.
    - **Electron:** `npm run package:win` (Portable target).

- **Environment Config:**
    - **Local:** Use `.env` for non-sensitive config.
    - **Production:** Use `TASKFLOW_CONFIG_DIR` for sensitive config (encrypted).

### Workflow Standards (Shift Left)

- **Optimal Flow:**
    1.  **Sprint Planning:** Generate User Stories.
    2.  **Test Design (Mandatory for UI):** Run `/bmad-tea-test-design` *before* implementation.
    3.  **Prompt Engineering:** Enrich Lovable prompts with the `test-plan.md` (Negative Scenarios, Race Conditions, Edge Cases).
    4.  **Implementation:** Execute `dev-story` with the robust prompt.
    5.  **Test Automation:** Run `/bmad-tea-test-automate` to generate suites matching the plan.
    6.  **Code Review:** Final validation.

- **Lovable Constraints:**
    - **Prompt Quality:** MUST contain a "Testing Requirements" section.
    - **No Guessing:** Explicitly define behavior for `null`, `undefined`, and empty strings.
    - **In-Flight Guards:** UI mutations MUST have loading states to prevent race conditions (double-submit).

### Critical Don't-Miss Rules

- **Security:**
    - **Electron:** `nodeIntegration: false`, `contextIsolation: true` MUST be enforced.
    - **Credentials:** NEVER store raw passwords in `.env` or git. Use Fernet encryption (`security.py`).
    - **Binding:** Backend MUST bind to `127.0.0.1` (never `0.0.0.0`).

- **Process Management:**
    - **Lifecycle:** Electron MUST explicitly kill backend process on exit (SIGINT/SIGTERM).
    - **Startup:** Poll `http://127.0.0.1:8000/health` before showing window.
    - **Port Conflicts:** Ensure port 8000 is available or handle error gracefully.

- **Database Integrity:**
    - **Migrations:** Run Alembic programmatically on startup (not `db.create_all()`).
    - **Queries:** NO raw SQL strings. Use SQLAlchemy ORM with Pydantic validation.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-02-22
