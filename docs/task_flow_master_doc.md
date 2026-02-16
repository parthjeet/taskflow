# TaskFlow - Comprehensive Project Documentation

**Version:** 1.2
**Date:** February 16, 2026
**Document Type:** BRD, PRD, TDD
**Author:** Parth (Lead DevOps Engineer, AIG)

---

> **NOTE FOR AI CODING ASSISTANTS (Codex CLI / Claude CLI / Gemini CLI):**
> This document is the single source of truth for the TaskFlow project. It contains business requirements, product specifications, and full technical design. When working on this codebase:
> - The **frontend** is embedded via a Git subtree (`taskflow-ui/`) built with React + TypeScript + shadcn/ui + Tailwind CSS. It was scaffolded by Lovable and has its own GitHub repo. The code is fully present in this repo — no submodule init needed.
> - The **backend** lives in `backend/` and uses FastAPI + SQLAlchemy + PostgreSQL. Use **`uv`** (by Astral) as the Python package manager — NOT pip, poetry, or conda.
> - The **Electron desktop wrapper** lives in `electron/`.
> - The frontend currently runs with a **mock API client** using localStorage. The backend must implement the exact same API contract so the frontend can switch from mock to real with a one-line change in `src/lib/api/index.ts`.
> - Read Section TDD-1 (Repository Structure) and TDD-2 (Development Setup) before making any changes.

---

# Table of Contents

1. [Business Requirements Document (BRD)](#business-requirements-document-brd)
2. [Product Requirements Document (PRD)](#product-requirements-document-prd)
3. [Technical Design Document (TDD)](#technical-design-document-tdd)

---

# Business Requirements Document (BRD)

## 1. Executive Summary

### 1.1 Project Overview
TaskFlow is a standalone desktop task management application designed specifically for DevOps teams working in ad-hoc, non-standardized workflow environments. The application addresses the limitations of manual Excel-based tracking by providing an intuitive, automated solution for managing tasks, assignments, blockers, and daily updates.

### 1.2 Business Problem
The DevOps team at AIG faces several challenges with their current task management approach:
- **Manual overhead:** Excel-based tracking requires constant manual updates
- **Low adoption:** Team members don't consistently update task status
- **Limited visibility:** Difficulty tracking what's in flight, blocked items, and priorities
- **Knowledge gaps:** No mechanism for capturing daily progress or knowledge transfer
- **Estimation challenges:** No systematic way to track effort or prioritize work
- **Context switching:** Managing multiple applications and ad-hoc requests becomes chaotic

### 1.3 Business Objectives
1. Reduce manual task management overhead by 70%
2. Improve team visibility into task status and blockers
3. Enable better prioritization and effort estimation
4. Facilitate knowledge transfer through daily updates
5. Provide a single source of truth for all ad-hoc work
6. Improve team coordination and reduce duplicated effort

### 1.4 Success Criteria
- **Adoption:** 100% of team members (6 engineers) actively use TaskFlow within 2 weeks
- **Update frequency:** Tasks updated at least daily by assigned engineers
- **Visibility:** Lead can view all team activities in < 30 seconds
- **Time savings:** Reduce task management overhead from ~2 hours/week to < 30 minutes/week per person
- **Blocker tracking:** All blocked tasks identified with clear blocking reasons

### 1.5 Scope
**In Scope (v1):**
- Task creation, assignment, and tracking
- Sub-task management
- Status management with visual blocked indicators
- Team member management
- Daily update logs
- Priority management
- PostgreSQL database integration (local for dev, cloud for production)
- Windows desktop application distribution

**Out of Scope (v1):**
- Role-based permissions (future v2)
- Integrations with Teams/Slack/Email (future v2)
- Time tracking
- Reporting and analytics
- Mobile application
- Multi-team support
- Tags and labels

### 1.6 Stakeholders
- **Primary Users:** 6 DevOps engineers (task executors)
- **Lead User:** Team lead (Parth) - task assignment, prioritization, oversight
- **Secondary Beneficiaries:** Development teams, project managers (improved transparency)

---

## 2. Business Requirements

### 2.1 Functional Requirements

#### FR-001: Task Management
The system shall allow users to create, view, update, and delete tasks with the following attributes:
- Title (required)
- Description
- Assigned team member
- Status (To Do, In Progress, Blocked, Done)
- Priority (High, Medium, Low)
- Application GEAR ID (4-digit UID)
- Blocking reason (when status is "Blocked")
- Date created (auto-generated)
- Date updated (auto-updated)

#### FR-002: Sub-task Management
The system shall allow users to break down tasks into sub-tasks with:
- Sub-task title
- Sub-task status (checkbox: complete/incomplete)
- Ability to add/remove sub-tasks

#### FR-003: Team Member Management
The system shall allow adding and removing team members with:
- Name (required)
- Email (optional)
- Active/Inactive status

#### FR-004: Daily Updates
The system shall provide a daily updates mechanism where:
- Engineers can log daily progress notes for assigned tasks
- Updates are timestamped
- Updates are visible on the task detail view
- Updates persist in chronological order

#### FR-005: Blocked Task Visibility
The system shall provide clear visual indicators for blocked tasks:
- Red border around blocked task cards
- Blocking reason prominently displayed
- Filter/view for all blocked tasks

#### FR-006: Database Configuration
The system shall allow secure storage of PostgreSQL database credentials:
- Settings page for DB connection configuration
- Credentials encrypted using Fernet symmetric encryption and stored in a user-writable config directory
- Connection validation before saving (test-connection endpoint)
- Separate save-connection endpoint to persist credentials
- Auto-connect on startup using saved credentials

### 2.2 Non-Functional Requirements

#### NFR-001: Performance
- Application launch time: < 5 seconds
- Task list load time: < 2 seconds for up to 500 tasks
- UI responsiveness: < 200ms for user interactions

#### NFR-002: Usability
- Zero-training required for basic task operations
- Intuitive UI following modern design patterns
- Keyboard shortcuts for common operations

#### NFR-003: Reliability
- Auto-save functionality for task updates
- Graceful error handling with user-friendly messages
- Database connection retry logic

#### NFR-004: Security
- Database credentials encrypted at rest using Fernet symmetric encryption (no admin privileges required)
- No sensitive data stored in logs, temp files, or error messages
- SQL injection prevention (parameterized queries via SQLAlchemy ORM)

#### NFR-005: Maintainability
- Clean code architecture with separation of concerns
- Comprehensive error logging
- Version information displayed in UI

#### NFR-006: Portability
- Portable Windows executable — no installer, no admin privileges required
- No external dependencies required for end users
- Portable executable total size < 200MB
- No registry modifications, file associations, or system-level side effects
- Runs on Windows 10 and Windows 11 (x64)

---

## 3. Business Impact

### 3.1 Quantitative Benefits
- **Time Savings:** 1.5 hours/week per engineer × 6 engineers = 9 hours/week team-wide
- **Reduced Context Switching:** Estimated 20% improvement in focus time
- **Blocker Resolution:** Expected 30% faster blocker identification and resolution

### 3.2 Qualitative Benefits
- Improved team morale through reduced manual overhead
- Better knowledge sharing and documentation
- Enhanced transparency for stakeholders
- Reduced "lost" work or forgotten tasks
- Improved estimation capability over time

---

# Product Requirements Document (PRD)

## 1. Product Overview

### 1.1 Product Vision
TaskFlow empowers DevOps teams to manage ad-hoc work efficiently through a lightweight, intuitive desktop application that captures tasks, tracks progress, highlights blockers, and preserves knowledge — all without the overhead of traditional project management tools.

### 1.2 Product Goals
1. Provide a frictionless task management experience
2. Make blocked tasks immediately visible
3. Enable daily progress tracking and knowledge capture
4. Support distributed team coordination
5. Integrate seamlessly with existing infrastructure

### 1.3 Target Audience
**Primary Persona: DevOps Engineer (Task Executor)**
- **Demographics:** 25-40 years old, technical background
- **Skills:** Proficient in command-line tools, scripting, cloud platforms
- **Pain Points:**
  - Too many context switches
  - Manual Excel updates are tedious
  - Difficulty tracking what's blocked and why
- **Goals:**
  - Quick task updates without leaving workflow
  - Clear visibility into what needs attention
  - Easy progress logging

**Secondary Persona: DevOps Lead (Task Manager)**
- **Responsibilities:** Team coordination, prioritization, stakeholder updates
- **Pain Points:**
  - Difficulty getting team status updates
  - Can't easily identify blockers
  - Limited insight into effort estimation
- **Goals:**
  - Real-time team visibility
  - Proactive blocker management
  - Data-driven prioritization

### 1.4 Key Differentiators
- **No overhead:** Lighter than Jira, smarter than Excel
- **Blocker-first design:** Visual emphasis on blocked work
- **Daily updates built-in:** Knowledge capture without separate tools
- **DevOps-focused:** Designed for ad-hoc, interrupt-driven work

---

## 2. Feature Specifications

### 2.1 Core Features

#### Feature 1: Task Dashboard
**Description:** Main view displaying all tasks with filtering and sorting capabilities

**User Stories:**
- **US-001:** As a DevOps engineer, I want to see all my assigned tasks so I can prioritize my work
- **US-002:** As a team lead, I want to view all team tasks so I can understand workload distribution
- **US-003:** As a DevOps engineer, I want to filter tasks by status so I can focus on active work
- **US-004:** As a team lead, I want to see all blocked tasks so I can help unblock them quickly

**Acceptance Criteria:**
- Tasks displayed in card/list format
- Filters available: Status, Priority, Assigned To, Blocked
- Sorting options: Date Created, Date Updated, Priority
- Visual indicators: Priority color codes, blocked tasks with red border
- Quick actions: Mark complete, edit, delete
- Empty state messaging when no tasks exist

**UI/UX Requirements:**
- Clean, modern interface using shadcn/ui components
- Responsive layout adapting to window size
- Loading states for data fetching
- Smooth transitions between views

---

#### Feature 2: Task Creation & Editing
**Description:** Form-based interface for creating and editing tasks

**User Stories:**
- **US-005:** As a DevOps engineer, I want to create a new task so I can track work requests
- **US-006:** As a DevOps engineer, I want to edit task details so I can keep information current
- **US-007:** As a team lead, I want to assign tasks to team members so work is distributed
- **US-008:** As a DevOps engineer, I want to set task priority so critical work is visible

**Acceptance Criteria:**
- Modal or slide-over panel for task creation/editing
- Required fields: Title, Status
- Optional fields: Description, Assigned To, Priority, Application GEAR ID, Blocking Reason
- Field validation:
  - Title: Max 200 characters, required
  - Description: Rich text area, max 2000 characters
  - Application GEAR ID: 4-digit numeric format
  - Blocking Reason: Required when status is "Blocked"
- Auto-save draft functionality
- Cancel with unsaved changes warning
- Success/error messaging

**Field Specifications:**

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| Title | Text | Yes | 1-200 chars | - |
| Description | Textarea | No | Max 2000 chars | - |
| Assigned To | Dropdown | No | Valid team member | Unassigned |
| Status | Dropdown | Yes | Predefined values | To Do |
| Priority | Dropdown | No | High/Medium/Low | Medium |
| Application GEAR ID | Text | No | 4 digits, numeric | - |
| Blocking Reason | Textarea | Conditional | Required if Blocked | - |

**Status Values:**
- To Do (default)
- In Progress
- Blocked (requires blocking reason)
- Done

---

#### Feature 3: Sub-task Management
**Description:** Ability to break down tasks into smaller, trackable sub-tasks

**User Stories:**
- **US-009:** As a DevOps engineer, I want to break tasks into sub-tasks so complex work is manageable
- **US-010:** As a DevOps engineer, I want to check off sub-tasks so I can track incremental progress
- **US-011:** As a team lead, I want to see sub-task completion percentage so I understand progress

**Acceptance Criteria:**
- Add/remove sub-tasks within task detail view
- Sub-task fields: Title (required), Completed (checkbox)
- Sub-tasks displayed as checklist
- Progress indicator showing X of Y sub-tasks completed
- Drag-and-drop reordering of sub-tasks
- Sub-task completion doesn't auto-change task status
- Maximum 20 sub-tasks per task

**UI Components:**
- Checklist component with add/remove buttons
- Inline editing for sub-task titles
- Visual progress bar (e.g., "3 of 5 completed")

---

#### Feature 4: Daily Updates Log
**Description:** Chronological log of daily progress updates for each task

**User Stories:**
- **US-012:** As a DevOps engineer, I want to log daily progress so my work is documented
- **US-013:** As a team lead, I want to review team updates so I understand daily activities
- **US-014:** As a DevOps engineer, I want to see historical updates so I can recall previous work

**Acceptance Criteria:**
- "Add Daily Update" button on task detail view
- Update form fields: Date (auto-populated), Update text (required)
- Updates displayed in reverse chronological order (newest first)
- Each update shows: Date, Update text, Author (team member)
- Edit/delete own updates within 24 hours
- Read-only view for updates older than 24 hours
- Maximum 1000 characters per update
- Empty state when no updates exist

**Data Structure:**
```
DailyUpdate {
  id: UUID
  task_id: UUID (foreign key)
  author_id: UUID (team member)
  author_name: String (server-resolved)
  content: String (max 1000 chars)
  created_at: Timestamp
  updated_at: Timestamp
  edited: Boolean (default false)
}
```

---

#### Feature 5: Team Member Management
**Description:** Interface for managing team member profiles

**User Stories:**
- **US-015:** As a team lead, I want to add new team members so they can be assigned tasks
- **US-016:** As a team lead, I want to deactivate team members so former members don't appear in assignment lists
- **US-017:** As a team lead, I want to view all team members so I know who's available

**Acceptance Criteria:**
- Team members page/section
- Add member form: Name (required), Email (optional)
- Edit member details
- Toggle Active/Inactive status
- Inactive members not shown in task assignment dropdown
- Cannot delete members with assigned tasks (must reassign first)
- Member list shows: Name, Email, Status, # of assigned tasks

**Future Consideration (v2):**
- Role assignment (Lead, Manager, Engineer)
- Permission levels based on roles

---

#### Feature 6: Blocked Task Highlighting
**Description:** Visual system to make blocked tasks immediately obvious

**User Stories:**
- **US-018:** As a team lead, I want blocked tasks to stand out visually so I can prioritize unblocking them
- **US-019:** As a DevOps engineer, I want to clearly mark why a task is blocked so others understand dependencies
- **US-020:** As a team lead, I want to filter for all blocked tasks so I can review them in one view

**Acceptance Criteria:**
- Tasks with "Blocked" status have 3px red border
- Blocking reason displayed prominently on task card
- "Blocked" badge/label on task card
- Filter option: "Show only blocked tasks"
- Blocked tasks optionally sorted to top of list
- Notification/alert when blocking reason is missing for blocked task

**Visual Design:**
- Red (#EF4444 or similar) border color
- Optional blocked icon/emoji (🚫)
- Blocking reason in italic or distinct styling

---

#### Feature 7: Application GEAR ID Tracking
**Description:** Associate tasks with specific applications using 4-digit GEAR IDs

**User Stories:**
- **US-021:** As a DevOps engineer, I want to tag tasks with application GEAR ID so I can track work by application
- **US-022:** As a team lead, I want to filter tasks by GEAR ID so I can see all work for a specific application

**Acceptance Criteria:**
- Application GEAR ID field on task form
- Validation: Must be exactly 4 digits (0000-9999)
- Optional field (can be left empty)
- Display GEAR ID badge on task card when present
- Filter option by GEAR ID
- Search functionality includes GEAR ID

**UI Components:**
- 4-digit numeric input with validation
- Badge display on task card (e.g., "GEAR: 1234")

---

#### Feature 8: Database Configuration
**Description:** Secure settings page for PostgreSQL database connection

**User Stories:**
- **US-023:** As a team lead, I want to configure database connection so the app connects to our Postgres
- **US-024:** As a team lead, I want to test database connection before saving so I know credentials are correct
- **US-025:** As a user, I want my database credentials stored securely so they aren't exposed

**Acceptance Criteria:**
- Settings page accessible from main menu
- Connection form fields:
  - Host (required)
  - Port (required, default 5432)
  - Database Name (required)
  - Username (required)
  - Password (required, masked)
- "Test Connection" button validates credentials
- Success/failure messaging for connection test
- "Save" button stores encrypted credentials locally
- Credentials stored in local encrypted file (not plain text)
- Auto-connect on app startup using saved credentials
- Error handling for connection failures with retry option

**Security Requirements:**
- Credentials encrypted using Fernet symmetric encryption (`cryptography.fernet.Fernet`)
- Encryption key generated once and stored in user-writable config directory (e.g., `config_dir/fernet.key`)
- No admin privileges required for any file operations
- No credentials stored in logs, temp files, or error messages
- Password field masked with option to reveal

---

### 2.2 User Workflows

#### Workflow 1: Creating a New Task
1. User clicks "New Task" button
2. Task creation modal/panel opens
3. User enters required fields (Title, Status)
4. User optionally fills: Description, Assigned To, Priority, GEAR ID
5. If Status = "Blocked", user must enter Blocking Reason
6. User clicks "Save"
7. System validates input
8. Task created, user redirected to task list
9. Success message displayed

#### Workflow 2: Daily Update Entry
1. User opens task detail view
2. User clicks "Add Daily Update" button
3. Update form appears with today's date pre-filled
4. User types progress update (max 1000 chars)
5. User clicks "Save Update"
6. Update added to task's update log
7. Update appears at top of chronological list
8. Success message displayed

#### Workflow 3: Managing Blockers
1. Team lead opens dashboard
2. Team lead clicks "Show Blocked Tasks" filter
3. System displays all tasks with "Blocked" status
4. Blocked tasks shown with red border
5. Team lead reviews blocking reasons
6. Team lead clicks task to view details
7. Team lead adds daily update or reassigns as needed
8. When blocker resolved, team lead changes status to "In Progress"
9. Red border removed, task returns to normal view

#### Workflow 4: Sub-task Completion
1. Engineer opens assigned task
2. Engineer views sub-task checklist
3. Engineer completes work for a sub-task
4. Engineer checks off completed sub-task
5. Progress bar updates (e.g., "3 of 5 completed")
6. Engineer adds daily update noting sub-task completion
7. When all sub-tasks complete, engineer changes task status to "Done"

---

### 2.3 UI/UX Specifications

#### Design Principles
1. **Simplicity First:** Minimize clicks, maximize clarity
2. **Visual Hierarchy:** Important information (blockers, priorities) stands out
3. **Consistency:** Use shadcn/ui components throughout
4. **Responsiveness:** Adapt to different window sizes gracefully
5. **Feedback:** Always confirm user actions with visual feedback

#### Color Palette
- **Primary:** Blue (#3B82F6) - Actions, links
- **Success:** Green (#10B981) - Done status, success messages
- **Warning:** Yellow (#F59E0B) - Medium priority, warnings
- **Danger:** Red (#EF4444) - High priority, blocked tasks, errors
- **Neutral:** Gray scale (#F3F4F6 to #1F2937) - Text, backgrounds

#### Priority Color Coding
- **High:** Red badge or indicator
- **Medium:** Yellow badge or indicator
- **Low:** Blue or gray badge or indicator

#### Status Color Coding
- **To Do:** Gray
- **In Progress:** Blue
- **Blocked:** Red (with border)
- **Done:** Green

#### Typography
- **Headers:** Clear, bold, readable (e.g., 24px, 20px, 16px)
- **Body:** 14px-16px, comfortable line height
- **Monospace:** For GEAR IDs, technical details

#### Responsive Breakpoints
- **Desktop (primary):** 1024px and above
- **Tablet:** 768px - 1023px (future consideration)
- **Mobile:** Below 768px (future consideration)

---

### 2.4 Data Model Overview

#### Entities

**Task**
- id (UUID, PK)
- title (VARCHAR 200, NOT NULL)
- description (VARCHAR 2000, NULLABLE)
- assignee_id (UUID, FK to Member, NULLABLE)
- assignee_name (VARCHAR 100, NULLABLE, server-resolved from assignee_id)
- status (ENUM: "To Do", "In Progress", "Blocked", "Done", NOT NULL, default 'To Do')
- priority (ENUM: "High", "Medium", "Low", NOT NULL, default 'Medium')
- gear_id (VARCHAR 4, NULLABLE)
- blocking_reason (VARCHAR, NOT NULL, default "")
- created_at (TIMESTAMP, NOT NULL)
- updated_at (TIMESTAMP, NOT NULL)

**SubTask**
- id (UUID, PK)
- task_id (UUID, FK to Task, NOT NULL, ON DELETE CASCADE)
- title (VARCHAR 200, NOT NULL)
- completed (BOOLEAN, NOT NULL, default FALSE)
- position (INTEGER, NOT NULL, for ordering)
- created_at (TIMESTAMP, NOT NULL)

**DailyUpdate**
- id (UUID, PK)
- task_id (UUID, FK to Task, NOT NULL, ON DELETE CASCADE)
- author_id (UUID, FK to Member, NOT NULL)
- author_name (VARCHAR 100, NOT NULL, server-resolved from author_id)
- content (VARCHAR 1000, NOT NULL)
- created_at (TIMESTAMP, NOT NULL)
- updated_at (TIMESTAMP, NOT NULL)
- edited (BOOLEAN, NOT NULL, default FALSE)

**TeamMember (table name: `members`)**
- id (UUID, PK)
- name (VARCHAR 100, NOT NULL)
- email (VARCHAR 255, NOT NULL, UNIQUE)
- active (BOOLEAN, NOT NULL, default TRUE)

**AppConfig** (local storage only, not in Postgres)
- db_host (ENCRYPTED)
- db_port (ENCRYPTED)
- db_name (ENCRYPTED)
- db_username (ENCRYPTED)
- db_password (ENCRYPTED)

---

### 2.5 Future Enhancements (v2 and beyond)

#### Phase 2 Features
- **Role-based permissions:** Lead, Manager, Engineer roles with different capabilities
- **Teams integration:** Post task updates to Teams channels
- **Email notifications:** Automated reminders for blocked or overdue tasks
- **Tags/Labels:** Flexible categorization system
- **Advanced filtering:** Complex filter combinations
- **Bulk operations:** Select multiple tasks for status updates

#### Phase 3 Features
- **Time tracking:** Log time spent on tasks
- **Reporting & Analytics:** Task completion rates, blocker analysis, team velocity
- **Templates:** Recurring task templates
- **Comments/Mentions:** Discussion threads on tasks with @mentions
- **Attachments:** Upload files to tasks

#### Phase 4 Features
- **Mobile companion app:** View-only mobile interface
- **API:** External integrations
- **Multi-team support:** Manage multiple teams in one instance
- **Dashboard widgets:** Customizable dashboard views

---

# Technical Design Document (TDD)

## 1. Repository Structure & Setup

### 1.1 Monorepo with Git Subtree

TaskFlow uses a monorepo structure where the frontend is embedded via a **Git subtree** from a separate GitHub repository. The frontend was built using Lovable (an AI app builder) which manages its own repo (`taskflow-ui`). Using a subtree (instead of a submodule) means:
- The frontend code is **fully committed** inside the main repo — no special clone flags needed.
- Team members clone the repo normally and get everything.
- We can still **pull future updates** from the Lovable remote when needed.
- No `.gitmodules` file, no submodule initialization steps.

```
taskflow/                          # Main repo (github.com/<GITHUB_USERNAME>/taskflow)
├── taskflow-ui/                   # Git subtree (from github.com/<GITHUB_USERNAME>/taskflow-ui)
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── lib/
│   │   │   └── api/               # API client (mock + real)
│   │   ├── pages/                 # Route pages
│   │   └── ...
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── backend/                       # FastAPI backend (Python, managed by uv)
│   ├── app/
│   │   ├── api/v1/                # API route handlers
│   │   ├── core/                  # Config, security
│   │   ├── crud/                  # Database CRUD operations
│   │   ├── db/                    # Database session, base
│   │   ├── models/                # SQLAlchemy ORM models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── __init__.py
│   │   └── main.py                # FastAPI app entrypoint
│   ├── alembic/                   # Database migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── tests/                     # Backend tests
│   ├── pyproject.toml             # uv project config (dependencies here)
│   ├── uv.lock                    # uv lockfile (auto-generated)
│   └── alembic.ini
├── electron/                      # Electron desktop wrapper
│   ├── main.js
│   └── preload.js
├── pyinstaller_entrypoint.py       # Root-level entrypoint for PyInstaller (calls freeze_support())
├── .gitignore
├── package.json                   # Root package.json (Electron + build scripts)
├── README.md
└── docs/
    └── task_flow_master_doc.md    # This document
```

### 1.2 Git Subtree Setup

**Initial setup (one-time, adding the frontend into the main repo):**

```bash
# Navigate to your main taskflow repo
cd taskflow

# Add the Lovable repo as a named remote
git remote add taskflow-ui https://github.com/<GITHUB_USERNAME>/taskflow-ui.git

# Fetch the remote
git fetch taskflow-ui

# Add the subtree (squash merges the full history into one commit)
git subtree add --prefix=taskflow-ui taskflow-ui main --squash

# Push the combined repo
git push
```

> **IMPORTANT:** Replace `<GITHUB_USERNAME>` with your actual GitHub username in the commands above.

**Cloning the repo (for new machines or team members):**

```bash
# Normal clone — no special flags needed, the frontend code is already in the repo
git clone https://github.com/<GITHUB_USERNAME>/taskflow.git
```

> Unlike submodules, subtree requires NO extra init/update steps after cloning. The code is already there.

**Pulling future Lovable updates into the main repo:**

```bash
cd taskflow

# Make sure the remote is added (only needed once per machine)
git remote add taskflow-ui https://github.com/<GITHUB_USERNAME>/taskflow-ui.git 2>/dev/null || true

# Pull latest changes from the Lovable repo
git subtree pull --prefix=taskflow-ui taskflow-ui main --squash -m "Pull latest taskflow-ui updates from Lovable"
```

**Pushing local frontend changes back to the Lovable repo (if needed):**

```bash
git subtree push --prefix=taskflow-ui taskflow-ui main
```

> **Tip:** If `git subtree pull` gives merge conflicts, resolve them normally (`git add` the resolved files, then `git commit`).

### 1.3 Development Environment Setup

**Prerequisites:**
- Python 3.12+ installed
- Node.js 20+ and npm installed
- PostgreSQL 14+ installed locally
- Git installed
- `uv` installed (`curl -LsSf https://astral.sh/uv/install.sh | sh` or `pip install uv`)

**Step 1: Clone the repo**
```bash
# Normal clone — frontend code is already included via subtree
git clone https://github.com/<GITHUB_USERNAME>/taskflow.git
cd taskflow
```

**Step 2: Backend setup (uv)**
```bash
cd backend

# Initialize uv project (first time only, creates pyproject.toml)
uv init --name taskflow-backend --python 3.12

# Add dependencies
uv add fastapi uvicorn[standard] sqlalchemy[asyncio] psycopg2-binary pydantic[email] alembic python-dotenv cryptography

# Add dev dependencies
uv add --dev pytest pytest-asyncio httpx black ruff mypy

# Sync / install all deps (creates .venv automatically)
uv sync

cd ..
```

**Step 3: Frontend setup**
```bash
cd taskflow-ui
npm install
cd ..
```

**Step 4: PostgreSQL local database**
```bash
# Create database (run in psql or pgAdmin)
createdb taskflow_db

# Or via psql:
psql -U postgres -c "CREATE DATABASE taskflow_db;"
```

**Step 5: Backend environment configuration**

Create `backend/.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow_db
LOG_LEVEL=INFO
```

**Step 6: Run database migrations**
```bash
cd backend
uv run alembic upgrade head
cd ..
```

**Step 7: Start development servers**

Terminal 1 — Backend:
```bash
cd backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — Frontend:
```bash
cd taskflow-ui
npm run dev
# Runs on http://localhost:5173 (Vite default)
```

The frontend currently runs with a mock API client. To switch to the real backend, change one line in `taskflow-ui/src/lib/api/index.ts`:
```typescript
// FROM:
export const apiClient = mockClient;
// TO:
export const apiClient = realClient;
```

---

## 2. System Architecture

### 2.1 Architecture Overview

TaskFlow follows a **client-server architecture** packaged as a standalone desktop application:

```
┌─────────────────────────────────────────────┐
│         Electron Shell (Desktop App)        │
│  ┌───────────────────────────────────────┐  │
│  │      React Frontend (Renderer)        │  │
│  │  - shadcn/ui Components               │  │
│  │  - Tailwind CSS Styling               │  │
│  │  - React Query / Zustand State        │  │
│  │  - React Router for navigation        │  │
│  └──────────────┬────────────────────────┘  │
│                 │ HTTP/REST                  │
│  ┌──────────────▼────────────────────────┐  │
│  │   FastAPI Backend (Child Process)     │  │
│  │  - REST API Endpoints                 │  │
│  │  - Business Logic                     │  │
│  │  - PostgreSQL ORM (SQLAlchemy)        │  │
│  └──────────────┬────────────────────────┘  │
└─────────────────┼──────────────────────────┘
                  │ PostgreSQL Protocol
        ┌─────────▼─────────┐
        │  Local PostgreSQL │  (dev)
        │  Cloud PostgreSQL │  (prod)
        └───────────────────┘
```

### 2.2 Technology Stack

#### Frontend (taskflow-ui subtree)
- **Framework:** React 18.x with TypeScript
- **UI Components:** shadcn/ui (https://ui.shadcn.com/)
- **Styling:** Tailwind CSS 3.x
- **Build Tool:** Vite
- **Routing:** React Router v6
- **HTTP Client:** Fetch API (wrapped in API client)
- **State Management:** React hooks + context (or Zustand/TanStack Query if added by Lovable)
- **Form Handling:** React Hook Form (if added) or controlled components

#### Backend
- **Framework:** FastAPI 0.100+
- **Python Version:** 3.12+
- **Package Manager:** uv (by Astral) — NOT pip/poetry/conda
- **ORM:** SQLAlchemy 2.x
- **Database Driver:** psycopg2-binary
- **Validation:** Pydantic v2
- **Server:** Uvicorn (ASGI server)
- **Migrations:** Alembic

#### Desktop Wrapper
- **Framework:** Electron 28.x
- **Builder:** electron-builder
- **Process Manager:** Node.js child_process

#### Database
- **Development:** PostgreSQL 14+ (local)
- **Production:** PostgreSQL 14+ (cloud-hosted, e.g., AWS RDS, Azure, Neon, Supabase)
- **Connection Pooling:** SQLAlchemy engine pooling

#### Packaging
- **Backend Compilation:** PyInstaller
- **App Packaging:** electron-builder
- **Target Platform:** Windows 10/11 (x64)

#### Development Tools
- **Backend:** uv (package management + virtual env), Ruff (linting), Black (formatting)
- **Frontend:** npm, ESLint, Prettier
- **Version Control:** Git (subtree for frontend integration)

---

## 3. Frontend Architecture (React)

### 3.1 Technology Details

The frontend was built using **Lovable** (AI app builder) and uses:
- React 18 + TypeScript
- Vite as build tool
- shadcn/ui component library
- Tailwind CSS for styling
- React Router for client-side routing

The frontend lives in its own GitHub repo (`taskflow-ui`) and is included in the main `taskflow` repo as a Git subtree.

### 3.2 Frontend Directory Structure

```
taskflow-ui/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── checkbox.tsx
│   │   │   └── ...
│   │   ├── TaskCard.tsx           # Task summary card
│   │   ├── TaskForm.tsx           # Create/edit task dialog
│   │   ├── SubTaskList.tsx        # Sub-task checklist
│   │   ├── DailyUpdateLog.tsx     # Daily updates timeline
│   │   ├── TeamMemberList.tsx     # Team member management
│   │   ├── SettingsForm.tsx       # DB connection settings
│   │   └── Layout.tsx             # App shell with nav
│   ├── lib/
│   │   └── api/
│   │       ├── types.ts           # TypeScript interfaces (matches API_CONTRACT.md)
│   │       ├── client.ts          # ApiClient interface definition
│   │       ├── adapters/
│   │       │   ├── mock.ts        # Mock adapter (localStorage-backed)
│   │       │   └── real.ts        # Real adapter (HTTP to FastAPI, Backend-owned)
│   │       └── index.ts           # Exports active apiClient singleton
│   ├── pages/
│   │   ├── Dashboard.tsx          # Task list (route: /)
│   │   ├── TaskDetail.tsx         # Task detail view (route: /tasks/:id)
│   │   ├── Team.tsx               # Team management (route: /team)
│   │   └── Settings.tsx           # Settings (route: /settings)
│   ├── hooks/                     # Custom React hooks
│   ├── App.tsx                    # Root component + Router
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles + Tailwind
├── public/
│   └── favicon.ico
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── components.json                # shadcn/ui config
```

### 3.3 API Client Architecture (Critical for Backend Integration)

The frontend has a **swappable API client** pattern. Both `mockClient.ts` and `realClient.ts` implement the **exact same interface**. The active client is exported from `index.ts`.

**API Client Interface (types.ts):**

> **NOTE:** The canonical API contract is `taskflow-ui/API_CONTRACT.md`. The interfaces below use camelCase (frontend convention); the backend uses snake_case. The adapter layer handles the transformation.

```typescript
// These are the TypeScript interfaces the backend MUST match
// Field names use camelCase per frontend convention; backend uses snake_case

interface Task {
  id: string;                     // UUID
  title: string;                  // 1-200 chars, required
  description: string | null;     // Max 2000 chars
  status: 'To Do' | 'In Progress' | 'Blocked' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
  assigneeId: string | null;     // UUID of team member (backend: assignee_id)
  assigneeName: string | null;   // Server-resolved from assigneeId (backend: assignee_name)
  gearId: string | null;         // 4 digits (backend: gear_id)
  blockingReason: string;        // Required when Blocked, "" otherwise (backend: blocking_reason)
  subTasks: SubTask[];           // Embedded array (backend: sub_tasks)
  dailyUpdates: DailyUpdate[];   // Embedded array, newest first (backend: daily_updates)
  createdAt: string;             // ISO timestamp (backend: created_at)
  updatedAt: string;             // ISO timestamp (backend: updated_at)
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;             // backend: created_at
}

interface DailyUpdate {
  id: string;
  taskId: string;                // backend: task_id
  authorId: string;              // backend: author_id
  authorName: string;            // Server-resolved from authorId (backend: author_name)
  content: string;               // 1-1000 chars (NOT update_text)
  createdAt: string;             // backend: created_at
  updatedAt: string;             // backend: updated_at
  edited: boolean;               // true if content was modified after creation
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  active: boolean;               // NOT is_active
}

interface ApiClient {
  // Tasks
  getTasks(filters?: { status?: string; priority?: string; assignee?: string; search?: string; sort?: string }): Promise<Task[]>;
  getTask(id: string): Promise<Task>;
  createTask(data: Partial<Task>): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task>;  // PATCH, not PUT
  deleteTask(id: string): Promise<void>;

  // Sub-tasks
  addSubTask(taskId: string, data: { title: string }): Promise<SubTask>;
  toggleSubTask(taskId: string, subTaskId: string): Promise<SubTask>;  // PATCH .../toggle
  deleteSubTask(taskId: string, subTaskId: string): Promise<void>;

  // Daily Updates
  addDailyUpdate(taskId: string, data: { authorId: string; content: string }): Promise<DailyUpdate>;
  editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<DailyUpdate>;  // PATCH
  deleteDailyUpdate(taskId: string, updateId: string): Promise<void>;

  // Team Members — endpoint is /members (NOT /team-members)
  getMembers(): Promise<TeamMember[]>;
  createMember(data: Partial<TeamMember>): Promise<TeamMember>;
  updateMember(id: string, data: Partial<TeamMember>): Promise<TeamMember>;  // PATCH
  deleteMember(id: string): Promise<void>;

  // Settings
  testConnection(config: DBConfig): Promise<{ status: string }>;
  saveConnection(config: DBConfig): Promise<{ status: string }>;
}
```

**Switching from mock to real (index.ts):**
```typescript
import { MockApiClient } from './adapters/mock';
// import { RealApiClient } from './adapters/real';

// Switch to real adapter when backend is available
// Toggle via VITE_API_MODE=real env variable or runtime detection
export const apiClient = new MockApiClient();
// export const apiClient = new RealApiClient();
```

**Real Client (adapters/real.ts) — to be implemented:**

> **NOTE:** The real adapter is owned by the Backend/CLI AI tools team because it requires a running FastAPI server to test against. Lovable AI cannot test real HTTP calls. It handles camelCase ↔ snake_case transformation at the adapter boundary.

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

class RealApiClient implements ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const config: RequestInit = {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    };

    const response = await fetch(url, config);
    if (!response.ok) {
      // Backend always returns {"error": "message"} — NOT {"detail": ...}
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // Tasks — all use PATCH for partial updates (NOT PUT)
  async getTasks(filters = {}) {
    const params = new URLSearchParams(toSnakeCase(filters));
    return this.request<Task[]>(`/tasks?${params}`).then(tasks => tasks.map(toCamelCase));
  }
  async getTask(id: string) { return this.request(`/tasks/${id}`).then(toCamelCase); }
  async createTask(data: Partial<Task>) {
    return this.request('/tasks', { method: 'POST', body: JSON.stringify(toSnakeCase(data)) }).then(toCamelCase);
  }
  async updateTask(id: string, data: Partial<Task>) {
    return this.request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(toSnakeCase(data)) }).then(toCamelCase);
  }
  async deleteTask(id: string) {
    return this.request<void>(`/tasks/${id}`, { method: 'DELETE' });
  }

  // Sub-tasks — toggle via dedicated PATCH endpoint
  async addSubTask(taskId: string, data: { title: string }) {
    return this.request(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify(data) }).then(toCamelCase);
  }
  async toggleSubTask(taskId: string, subTaskId: string) {
    return this.request(`/tasks/${taskId}/subtasks/${subTaskId}/toggle`, { method: 'PATCH' }).then(toCamelCase);
  }
  async deleteSubTask(taskId: string, subTaskId: string) {
    return this.request<void>(`/tasks/${taskId}/subtasks/${subTaskId}`, { method: 'DELETE' });
  }

  // Daily Updates — uses 'content' field (NOT 'update_text')
  async addDailyUpdate(taskId: string, data: { authorId: string; content: string }) {
    return this.request(`/tasks/${taskId}/updates`, {
      method: 'POST', body: JSON.stringify({ author_id: data.authorId, content: data.content }),
    }).then(toCamelCase);
  }
  async editDailyUpdate(taskId: string, updateId: string, data: { content: string }) {
    return this.request(`/tasks/${taskId}/updates/${updateId}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }).then(toCamelCase);
  }
  async deleteDailyUpdate(taskId: string, updateId: string) {
    return this.request<void>(`/tasks/${taskId}/updates/${updateId}`, { method: 'DELETE' });
  }

  // Members — endpoint is /members (NOT /team-members)
  async getMembers() { return this.request<TeamMember[]>('/members').then(ms => ms.map(toCamelCase)); }
  async createMember(data: Partial<TeamMember>) {
    return this.request('/members', { method: 'POST', body: JSON.stringify(toSnakeCase(data)) }).then(toCamelCase);
  }
  async updateMember(id: string, data: Partial<TeamMember>) {
    return this.request(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(toSnakeCase(data)) }).then(toCamelCase);
  }
  async deleteMember(id: string) {
    return this.request<void>(`/members/${id}`, { method: 'DELETE' });
  }

  // Settings
  async testConnection(config: DBConfig) {
    return this.request('/settings/test-connection', { method: 'POST', body: JSON.stringify(config) });
  }
  async saveConnection(config: DBConfig) {
    return this.request('/settings/save-connection', { method: 'POST', body: JSON.stringify(config) });
  }
}

export const realClient = new RealApiClient();
```

### 3.4 Key Frontend Behaviors

**Blocked Task Red Border (CRITICAL):**
- Tasks with `status === 'Blocked'` MUST render with `border: 3px solid #EF4444`
- The blocking reason is displayed prominently on the card
- This is the highest-priority visual feature

**Mock Data:**
The mock client pre-populates localStorage with sample data including 6 tasks, 3 team members, subtasks, and daily updates. At least 2 tasks are "Blocked" to showcase the red border styling.

**Validation Rules (client-side):**
- Title: required, 1-200 characters
- Status: required, defaults to "To Do"
- Blocking reason: required ONLY when status is "Blocked"; auto-cleared when status changes away from "Blocked"
- GEAR ID: must match `/^\d{4}$/` if provided
- Daily update content: 1-1000 characters (field is `content`, NOT `update_text`)
- Sub-tasks: maximum 20 per task
- Forms must preserve user input if an API call fails (do NOT clear on error)

---

## 4. Backend Architecture (FastAPI)

### 4.1 Package Management with uv

**IMPORTANT:** This project uses `uv` by Astral as its Python package manager. Do NOT use pip, poetry, or conda directly.

**Common uv commands:**
```bash
# Install all dependencies from pyproject.toml
uv sync

# Add a new dependency
uv add <package>

# Add a dev dependency
uv add --dev <package>

# Run a command within the virtual environment
uv run <command>

# Run the FastAPI server
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Run tests
uv run pytest

# Run alembic migrations
uv run alembic upgrade head

# Run linting
uv run ruff check .
uv run black .
```

### 4.2 pyproject.toml

```toml
[project]
name = "taskflow-backend"
version = "1.0.0"
description = "TaskFlow - DevOps Task Management API"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "sqlalchemy>=2.0.0",
    "psycopg2-binary>=2.9.9",
    "pydantic[email]>=2.5.0",
    "pydantic-settings>=2.1.0",
    "alembic>=1.13.0",
    "cryptography>=42.0.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
    "black>=24.0.0",
    "ruff>=0.2.0",
    "mypy>=1.8.0",
]

[tool.ruff]
line-length = 120
target-version = "py312"

[tool.black]
line-length = 120
target-version = ["py312"]
```

### 4.3 Backend Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── tasks.py          # Task CRUD endpoints
│   │   │   ├── subtasks.py       # Sub-task endpoints (including toggle)
│   │   │   ├── daily_updates.py  # Daily update endpoints
│   │   │   ├── members.py        # Member endpoints (NOT team_members.py)
│   │   │   └── settings.py       # Settings endpoints (test-connection, save-connection)
│   │   └── deps.py               # Dependency injection (get_db)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # App configuration (reads .env)
│   │   └── security.py           # Encryption utilities
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py            # Database engine + session factory
│   │   └── base.py               # SQLAlchemy declarative base
│   ├── models/
│   │   ├── __init__.py
│   │   ├── task.py               # Task ORM model
│   │   ├── subtask.py            # SubTask ORM model
│   │   ├── daily_update.py       # DailyUpdate ORM model
│   │   └── member.py             # Member ORM model (NOT team_member.py)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── task.py               # Task Pydantic schemas
│   │   ├── subtask.py            # SubTask Pydantic schemas
│   │   ├── daily_update.py       # DailyUpdate Pydantic schemas
│   │   └── member.py             # Member Pydantic schemas
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── task.py               # Task CRUD operations
│   │   ├── subtask.py            # SubTask CRUD operations
│   │   ├── daily_update.py       # DailyUpdate CRUD operations
│   │   └── member.py             # Member CRUD operations
│   ├── __init__.py
│   └── main.py                   # FastAPI app initialization
├── alembic/                      # Database migrations
│   ├── versions/
│   └── env.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py               # Test fixtures
│   ├── test_tasks.py
│   ├── test_subtasks.py
│   ├── test_daily_updates.py
│   └── test_team_members.py
├── .env                          # Local environment variables (NOT committed)
├── .env.example                  # Example env file (committed)
├── pyproject.toml                # uv project config + dependencies
├── uv.lock                       # Auto-generated lockfile
└── alembic.ini
```

### 4.4 Database Models (SQLAlchemy)

**models/task.py**
```python
from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=True)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    assignee_name = Column(String(100), nullable=True)  # Server-resolved from assignee_id
    status = Column(
        Enum("To Do", "In Progress", "Blocked", "Done", name="task_status"),
        nullable=False,
        default="To Do",
    )
    priority = Column(
        Enum("High", "Medium", "Low", name="task_priority"),
        nullable=False,
        default="Medium",
    )
    gear_id = Column(String(4), nullable=True)
    blocking_reason = Column(String, nullable=False, default="")  # NOT NULL, empty when not blocked
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Indexes
    __table_args__ = (
        Index("idx_tasks_status", "status"),
        Index("idx_tasks_assignee_id", "assignee_id"),
    )

    # Relationships
    assignee = relationship("Member", back_populates="tasks")
    sub_tasks = relationship("SubTask", back_populates="task", cascade="all, delete-orphan", order_by="SubTask.position")
    daily_updates = relationship("DailyUpdate", back_populates="task", cascade="all, delete-orphan", order_by="DailyUpdate.created_at.desc()")
```

**models/subtask.py**
```python
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.db.base import Base


class SubTask(Base):
    __tablename__ = "sub_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("idx_sub_tasks_task_id", "task_id"),)

    # Relationships
    task = relationship("Task", back_populates="sub_tasks")
```

**models/daily_update.py**
```python
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.db.base import Base


class DailyUpdate(Base):
    __tablename__ = "daily_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False)
    author_name = Column(String(100), nullable=False)  # Server-resolved from author_id
    content = Column(String(1000), nullable=False)  # NOT update_text
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    edited = Column(Boolean, default=False, nullable=False)  # true if content modified after creation

    __table_args__ = (Index("idx_daily_updates_task_id", "task_id"),)

    # Relationships
    task = relationship("Task", back_populates="daily_updates")
    author = relationship("Member", back_populates="daily_updates")
```

**models/member.py**
```python
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Member(Base):
    __tablename__ = "members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    active = Column(Boolean, default=True, nullable=False)  # NOT is_active

    # Relationships
    tasks = relationship("Task", back_populates="assignee")
    daily_updates = relationship("DailyUpdate", back_populates="author")
```

### 4.5 Pydantic Schemas

**schemas/task.py**
```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class TaskStatus(str, Enum):
    TO_DO = "To Do"
    IN_PROGRESS = "In Progress"
    BLOCKED = "Blocked"
    DONE = "Done"


class TaskPriority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assignee_id: Optional[UUID] = None  # NOT assigned_to
    status: TaskStatus = TaskStatus.TO_DO
    priority: TaskPriority = TaskPriority.MEDIUM
    gear_id: Optional[str] = Field(None, pattern=r"^\d{4}$")
    blocking_reason: str = Field("", max_length=2000)  # NOT NULL, default ""

    @field_validator("blocking_reason", mode="after")
    @classmethod
    def validate_blocking_reason(cls, v, info):
        if info.data.get("status") == TaskStatus.BLOCKED and not v:
            raise ValueError("Blocking reason is required when status is Blocked")
        return v


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assignee_id: Optional[UUID] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    gear_id: Optional[str] = Field(None, pattern=r"^\d{4}$")
    blocking_reason: Optional[str] = Field(None, max_length=2000)


class TaskInDB(TaskBase):
    id: UUID
    assignee_name: Optional[str] = None  # Server-resolved
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TaskResponse(TaskInDB):
    sub_tasks: List["SubTaskResponse"] = []
    daily_updates: List["DailyUpdateResponse"] = []
    model_config = {"from_attributes": True}
```

**schemas/subtask.py**
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class SubTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    completed: bool = False
    position: int = 0


class SubTaskCreate(SubTaskBase):
    pass


class SubTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    completed: Optional[bool] = None
    position: Optional[int] = None


class SubTaskResponse(SubTaskBase):
    id: UUID
    task_id: UUID
    created_at: datetime
    model_config = {"from_attributes": True}
```

**schemas/daily_update.py**
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class DailyUpdateBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)  # NOT update_text


class DailyUpdateCreate(DailyUpdateBase):
    author_id: UUID


class DailyUpdateUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=1000)


class DailyUpdateResponse(DailyUpdateBase):
    id: UUID
    task_id: UUID
    author_id: UUID
    author_name: str  # Server-resolved from author_id
    created_at: datetime
    updated_at: datetime
    edited: bool = False  # true if content was modified after creation
    model_config = {"from_attributes": True}
```

**schemas/member.py**
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class MemberBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr  # Required, NOT optional
    active: bool = True  # NOT is_active


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    active: Optional[bool] = None


class MemberResponse(MemberBase):
    id: UUID
    model_config = {"from_attributes": True}
```

### 4.6 API Endpoints

All endpoint implementations follow the same patterns from v1.0 (see Appendix A for full endpoint table). Key implementation notes:

**Business Rules enforced by the API:**
- `blocking_reason` is required when `status` is `"Blocked"` — return 400 with `{"error": "Blocking reason is required when status is Blocked"}`
- `blocking_reason` is cleared (set to `""`) when status changes away from `"Blocked"`
- Daily updates can only be edited/deleted within 24 hours of creation — return 403 with `{"error": "Updates can only be edited/deleted within 24 hours."}`
- Members with assigned tasks cannot be deleted — return 409 with `{"error": "Cannot delete member with N assigned task(s). Reassign or complete them first."}`
- Sub-tasks are limited to 20 per task — return 400 with `{"error": "Maximum of 20 sub-tasks per task"}`
- `gear_id` must match `^\d{4}$` regex if provided — return 400 with `{"error": "GEAR ID must be exactly 4 digits"}`
- `assignee_name` is server-resolved from `assignee_id` on create/update
- `author_name` is server-resolved from `author_id` on daily update creation
- All errors use normalized format: `{"error": "message"}` (NOT FastAPI's default `{"detail": ...}`)

**Main Application (main.py):**

```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api.v1 import tasks, subtasks, daily_updates, members, settings

app = FastAPI(
    title="TaskFlow API",
    description="Task management API for DevOps teams",
    version="1.0.0",
)

# --- Normalized error responses: {"error": "message"} for ALL errors ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = "; ".join([f"{e['loc'][-1]}: {e['msg']}" for e in exc.errors()])
    return JSONResponse(status_code=400, content={"error": errors})

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal server error"})

# CORS middleware — allow Electron renderer origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*"],  # Electron renderer
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers — NOTE: /members (NOT /team-members)
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(subtasks.router, prefix="/api/v1", tags=["subtasks"])
app.include_router(daily_updates.router, prefix="/api/v1", tags=["daily_updates"])
app.include_router(members.router, prefix="/api/v1/members", tags=["members"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["settings"])


# Health endpoint at root level (NOT under /api/v1)
@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

> **NOTE:** Database tables are created via Alembic migrations (programmatic runner on startup), NOT via `Base.metadata.create_all()`. The app binds to `127.0.0.1` only (not `0.0.0.0`).

**Database Session (db/session.py):**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

**Dependency Injection (api/deps.py):**

```python
from app.db.session import SessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Configuration (core/config.py):**

```python
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # Config directory path (set by Electron via TASKFLOW_CONFIG_DIR env var)
    CONFIG_DIR: str = os.path.expanduser("~/.taskflow")
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": ".env"}


settings = Settings()
```

> **NOTE:** Database credentials are NOT stored in environment variables. They are encrypted with Fernet and stored in `config_dir/db_credentials.enc`. The `app/core/security.py` module handles encryption/decryption. The `DATABASE_URL` is constructed at runtime from decrypted credentials.

---

## 5. Database Design

### 5.1 Entity-Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   TeamMember    │       │      Task       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────┤ assigned_to(FK) │
│ name            │       │ id (PK)         │
│ email           │       │ title           │
│ is_active       │       │ description     │
│ created_at      │       │ status          │
└─────────────────┘       │ priority        │
        │                 │ gear_id         │
        │                 │ blocking_reason │
        │                 │ created_at      │
        │                 │ updated_at      │
        │                 └─────────────────┘
        │                         │
        │                 ┌───────┴───────┐
        │                 │               │
        │          ┌──────▼─────┐  ┌──────▼────────┐
        │          │  SubTask   │  │ DailyUpdate   │
        │          ├────────────┤  ├───────────────┤
        │          │ id (PK)    │  │ id (PK)       │
        │          │ task_id(FK)│  │ task_id (FK)  │
        │          │ title      │  │ author_id(FK) │◄──┘
        │          │ completed  │  │ update_text   │
        │          │ position   │  │ created_at    │
        │          │ created_at │  │ updated_at    │
        │          └────────────┘  └───────────────┘
        │
        └────────────────────────────────────────────┘
```

### 5.2 Database Schema (PostgreSQL DDL)

```sql
-- Extension for UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE task_status AS ENUM ('To Do', 'In Progress', 'Blocked', 'Done');
CREATE TYPE task_priority AS ENUM ('High', 'Medium', 'Low');

-- Members table (NOT team_members)
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE  -- NOT is_active
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    assignee_id UUID REFERENCES members(id) ON DELETE SET NULL,  -- NOT assigned_to
    assignee_name VARCHAR(100),  -- Server-resolved from assignee_id
    status task_status NOT NULL DEFAULT 'To Do',
    priority task_priority NOT NULL DEFAULT 'Medium',
    gear_id VARCHAR(4),
    blocking_reason VARCHAR NOT NULL DEFAULT '',  -- NOT NULL, empty when not blocked
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sub-Tasks table (NOT subtasks)
CREATE TABLE sub_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Daily Updates table
CREATE TABLE daily_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES members(id),
    author_name VARCHAR(100) NOT NULL,  -- Server-resolved from author_id
    content VARCHAR(1000) NOT NULL,  -- NOT update_text
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited BOOLEAN NOT NULL DEFAULT FALSE  -- true if content modified after creation
);

CREATE TRIGGER update_daily_updates_updated_at BEFORE UPDATE ON daily_updates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_sub_tasks_task_id ON sub_tasks(task_id);
CREATE INDEX idx_daily_updates_task_id ON daily_updates(task_id);
```

### 5.3 Database Migrations (Alembic)

```bash
# Initialize alembic (first time only)
cd backend
uv run alembic init alembic

# Generate migration from model changes
uv run alembic revision --autogenerate -m "Initial schema"

# Apply migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1
```

---

## 6. Electron Desktop Wrapper

### 6.1 electron/main.js

```javascript
const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let fastApiProcess;

const isDev = process.env.NODE_ENV === 'development';
const HEALTH_URL = 'http://127.0.0.1:8000/health';
const HEALTH_INTERVAL_MS = 200;
const HEALTH_MAX_RETRIES = 30;  // 6 seconds maximum

const getConfigDir = () => {
  // User-writable config directory — no admin privileges required
  return path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'TaskFlow');
};

const getFastApiPath = () => {
  if (isDev) {
    return { command: 'python', args: [path.join(__dirname, '../backend/app/main.py')] };
  } else {
    // PyInstaller --onedir output
    return { command: path.join(process.resourcesPath, 'backend', 'api.exe'), args: [] };
  }
};

const startFastApi = () => {
  const { command, args } = getFastApiPath();
  console.log('Starting FastAPI server:', command, args);

  fastApiProcess = spawn(command, args, {
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      TASKFLOW_CONFIG_DIR: getConfigDir(),  // Pass config dir to backend
    },
  });
  fastApiProcess.stdout.on('data', (data) => console.log(`FastAPI: ${data}`));
  fastApiProcess.stderr.on('data', (data) => console.error(`FastAPI Error: ${data}`));
  fastApiProcess.on('close', (code) => console.log(`FastAPI exited with code ${code}`));
};

const stopFastApi = () => {
  if (fastApiProcess) {
    fastApiProcess.kill();
    // Force-kill after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      if (fastApiProcess) { fastApiProcess.kill('SIGKILL'); fastApiProcess = null; }
    }, 5000);
    fastApiProcess = null;
  }
};

// Health-check polling instead of setTimeout
const waitForHealth = (retries = 0) => {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(HEALTH_URL, (res) => {
        if (res.statusCode === 200) resolve();
        else if (retries < HEALTH_MAX_RETRIES) setTimeout(() => { check(); retries++; }, HEALTH_INTERVAL_MS);
        else reject(new Error('Health check failed'));
      }).on('error', () => {
        if (retries < HEALTH_MAX_RETRIES) setTimeout(() => { check(); retries++; }, HEALTH_INTERVAL_MS);
        else reject(new Error('Backend unreachable'));
      });
    };
    check();
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 600,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../taskflow-ui/dist/index.html'));
  }

  Menu.setApplicationMenu(null);
  mainWindow.on('closed', () => { mainWindow = null; });
};

app.on('ready', async () => {
  startFastApi();
  try {
    await waitForHealth();
    createWindow();
  } catch {
    dialog.showErrorBox('Startup Error',
      'Backend failed to start. Please check if port 8000 is already in use, ' +
      'or if your database credentials are configured correctly in Settings.');
    app.quit();
  }
});

// Clean shutdown — no orphan processes (NFR11)
app.on('window-all-closed', () => { stopFastApi(); if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => stopFastApi());
process.on('SIGINT', () => { stopFastApi(); process.exit(); });
process.on('SIGTERM', () => { stopFastApi(); process.exit(); });
process.on('uncaughtException', () => { stopFastApi(); process.exit(1); });
```

### 6.2 electron/preload.js

```javascript
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.env.npm_package_version,
});
```

---

## 7. Security Architecture

### 7.1 Credential Storage

Database credentials are encrypted locally using **Fernet symmetric encryption** via the `cryptography` library:
- An encryption key is generated once and stored in `config_dir/fernet.key`
- Encrypted credentials are stored in `config_dir/db_credentials.enc`
- The config directory path is passed from Electron via the `TASKFLOW_CONFIG_DIR` environment variable
- No admin privileges are required — all files stored in user-writable directory (e.g., `%LOCALAPPDATA%/TaskFlow/`)
- No machine-specific key derivation — Fernet key is portable

### 7.2 SQL Injection Prevention

All database queries use SQLAlchemy ORM (no raw SQL). Pydantic validates all input data types and formats before they reach the database layer.

### 7.3 CORS Configuration

In development, CORS allows `http://localhost:5173` (Vite dev server). In production (packaged Electron app), frontend is loaded from `file://` protocol, so CORS is not an issue.

---

## 8. Build & Packaging

### 8.1 Backend Compilation (PyInstaller)

> **NOTE:** Uses `--onedir` mode (NOT `--onefile`) with a root-level entrypoint that calls `freeze_support()`.

**Root-level entrypoint (pyinstaller_entrypoint.py):**
```python
from multiprocessing import freeze_support

if __name__ == "__main__":
    freeze_support()
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)
```

**Build command:**
```bash
uv run pyinstaller --onedir --name api pyinstaller_entrypoint.py \
  --hidden-import uvicorn \
  --hidden-import uvicorn.logging \
  --hidden-import uvicorn.protocols \
  --hidden-import pydantic \
  --hidden-import sqlalchemy \
  --hidden-import alembic \
  --hidden-import psycopg2 \
  --hidden-import cryptography \
  --add-data "alembic/:alembic/" \
  --add-data "alembic.ini:."
# Output: dist/api/ (directory, NOT single file)
```

### 8.2 Frontend Build

```bash
cd taskflow-ui
npm run build
# Output: dist/
```

### 8.3 Electron Packaging

```bash
# From root taskflow/
npm run package:win
# Output: release/TaskFlow.exe (portable — no installer)
```

### 8.4 Root package.json

```json
{
  "name": "taskflow",
  "version": "1.0.0",
  "description": "DevOps Task Management Application",
  "main": "electron/main.js",
  "scripts": {
    "dev:frontend": "cd taskflow-ui && npm run dev",
    "dev:backend": "cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000",
    "build:frontend": "cd taskflow-ui && npm run build",
    "build:backend": "cd backend && uv run pyinstaller --onedir --name api pyinstaller_entrypoint.py",
    "package:win": "electron-builder --win --x64"
  },
  "build": {
    "appId": "com.taskflow.app",
    "productName": "TaskFlow",
    "directories": { "output": "release" },
    "files": [
      "electron/**/*",
      "taskflow-ui/dist/**/*"
    ],
    "extraResources": [
      { "from": "backend/dist/api/", "to": "backend/" }
    ],
    "win": { "target": "portable" }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

> **NOTE:** Uses `portable` target (NOT NSIS installer). No installer, no admin privileges required. Output is a single portable `.exe` that runs directly.

---

## 9. Testing Strategy

### 9.1 Backend Testing

```bash
cd backend
uv run pytest                    # Run all tests
uv run pytest -v                 # Verbose output
uv run pytest tests/test_tasks.py  # Specific file
```

**Example test (tests/test_tasks.py):**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_task():
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Test Task", "status": "To Do"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["status"] == "To Do"


def test_blocked_task_requires_reason():
    response = client.post(
        "/api/v1/tasks",
        json={"title": "Blocked Task", "status": "Blocked"},
    )
    assert response.status_code == 422  # Validation error


def test_blocked_task_with_reason():
    response = client.post(
        "/api/v1/tasks",
        json={
            "title": "Blocked Task",
            "status": "Blocked",
            "blocking_reason": "Waiting for DBA approval",
        },
    )
    assert response.status_code == 201
```

### 9.2 Frontend Testing

```bash
cd taskflow-ui
npm run test                # If Vitest is configured
```

### 9.3 Integration Testing (Playwright)

```bash
npx playwright test
```

---

## 10. Deployment & Maintenance

### 10.1 Deployment Checklist

**Pre-release:**
- [ ] All backend tests passing (`uv run pytest`)
- [ ] Frontend builds cleanly (`npm run build`)
- [ ] Database migration scripts tested
- [ ] Windows installer built and tested on clean machine
- [ ] Security review (credentials encryption verified)
- [ ] Performance benchmarks met (<5s launch, <2s task load)

### 10.2 User Onboarding

**Day 1 — Installation:**
1. Download `TaskFlow.exe` (portable executable — no installer needed)
2. Double-click to launch (no admin privileges required)
3. Application starts automatically
4. Configure database connection in Settings
5. Click "Test Connection" → Success → "Save"

**Day 2 — First Tasks:**
1. Lead creates team members
2. Lead creates initial tasks and assigns them
3. Engineers see their tasks and begin updating

### 10.3 Maintenance Plan

**Weekly:** Review logs, check blocked tasks
**Monthly:** Database backup, performance review, user feedback
**Quarterly:** Feature updates, dependency updates, security audit

---

## 11. Future Roadmap

### Version 1.1 (Q2 2026)
- Export/Import (Excel, JSON)
- Full-text search
- Keyboard shortcuts

### Version 2.0 (Q3 2026)
- Role-based permissions
- Teams integration
- Email notifications
- Tags/Labels

### Version 3.0 (Q4 2026)
- Time tracking
- Reporting & Analytics
- Mobile companion app

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **GEAR ID** | 4-digit unique identifier for applications managed by the DevOps team |
| **Blocked Task** | A task that cannot progress due to external dependency or blocker |
| **Daily Update** | A timestamped progress note added by an engineer to document work done |
| **Sub-task** | A smaller, actionable item that is part of a larger task |
| **Team Member** | A DevOps engineer who can be assigned tasks |
| **uv** | Fast Python package manager by Astral (Rust-based). Replaces pip/poetry |
| **PyInstaller** | Tool to compile Python applications into standalone executables |
| **Electron** | Framework for building cross-platform desktop apps with web technologies |
| **FastAPI** | Modern Python web framework for building APIs |
| **React** | JavaScript library for building user interfaces |
| **shadcn/ui** | Collection of reusable UI components built with React and Tailwind CSS |
| **Lovable** | AI app builder used to scaffold the TaskFlow frontend |

---

## 13. Appendices

### Appendix A: API Endpoints Summary

> **Canonical source:** `taskflow-ui/API_CONTRACT.md`. This table is a summary — see API_CONTRACT for full request/response shapes.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tasks` | List all tasks (filters: status, priority, assignee, search, sort) |
| GET | `/api/v1/tasks/{id}` | Get task by ID (includes sub_tasks + daily_updates) |
| POST | `/api/v1/tasks` | Create new task |
| PATCH | `/api/v1/tasks/{id}` | Update task (partial update, NOT PUT) |
| DELETE | `/api/v1/tasks/{id}` | Delete task (cascades sub-tasks + updates) |
| POST | `/api/v1/tasks/{id}/subtasks` | Create sub-task |
| PATCH | `/api/v1/tasks/{id}/subtasks/{sid}` | Update sub-task title |
| PATCH | `/api/v1/tasks/{id}/subtasks/{sid}/toggle` | Toggle sub-task completed |
| PUT | `/api/v1/tasks/{id}/subtasks/reorder` | Reorder sub-tasks |
| DELETE | `/api/v1/tasks/{id}/subtasks/{sid}` | Delete sub-task |
| POST | `/api/v1/tasks/{id}/updates` | Create daily update |
| PATCH | `/api/v1/tasks/{id}/updates/{uid}` | Edit daily update (within 24h only) |
| DELETE | `/api/v1/tasks/{id}/updates/{uid}` | Delete daily update (within 24h only) |
| GET | `/api/v1/members` | List all members (NOT /team-members) |
| POST | `/api/v1/members` | Create member |
| PATCH | `/api/v1/members/{id}` | Update member (partial update) |
| DELETE | `/api/v1/members/{id}` | Delete member (409 if tasks assigned) |
| POST | `/api/v1/settings/test-connection` | Test DB connection |
| POST | `/api/v1/settings/save-connection` | Save encrypted DB credentials |
| GET | `/health` | Health check (root level, NOT under /api/v1) |

### Appendix B: Environment Variables

**Backend (.env) — for local development only, NOT committed to git:**
```
LOG_LEVEL=INFO
```

> **NOTE:** `DATABASE_URL` is no longer stored in `.env`. In production, credentials are encrypted with Fernet and stored in the config directory. For development, use the Settings page or create `config_dir/db_credentials.enc` manually.

**Electron → Backend (set by Electron when spawning backend):**
```
TASKFLOW_CONFIG_DIR=%LOCALAPPDATA%/TaskFlow/   # Path to config directory
```

**Frontend (.env) — optional:**
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_API_MODE=mock    # Set to "real" to use real backend adapter
```

### Appendix C: Common Development Commands

```bash
# === BACKEND (from backend/ directory) ===
uv sync                                    # Install all deps
uv run uvicorn app.main:app --reload       # Start dev server
uv run pytest                              # Run tests
uv run alembic upgrade head                # Run migrations
uv run alembic revision --autogenerate -m "description"  # Create migration
uv run ruff check .                        # Lint
uv run black .                             # Format
uv add <package>                           # Add dependency
uv add --dev <package>                     # Add dev dependency

# === FRONTEND (from taskflow-ui/ directory) ===
npm install                                # Install deps
npm run dev                                # Start dev server (port 5173)
npm run build                              # Production build
npm run test                               # Run tests (if configured)

# === GIT SUBTREE (pull Lovable updates into main repo) ===
git remote add taskflow-ui https://github.com/<GITHUB_USERNAME>/taskflow-ui.git 2>/dev/null || true
git subtree pull --prefix=taskflow-ui taskflow-ui main --squash -m "Pull latest taskflow-ui"
git subtree push --prefix=taskflow-ui taskflow-ui main   # Push local changes back (if needed)

# === ELECTRON (from root taskflow/ directory) ===
npm run package:win                        # Build portable Windows executable

# === DATABASE ===
createdb taskflow_db                       # Create database
psql -U postgres -d taskflow_db            # Connect to database
```

### Appendix D: Troubleshooting

**Issue: Database connection fails**
- Verify PostgreSQL is running: `pg_isready`
- Check that `taskflow_db` exists: `psql -U postgres -l`
- Validate `DATABASE_URL` in `backend/.env`

**Issue: FastAPI doesn't start**
- Check port 8000: `lsof -i :8000` or `netstat -ano | findstr 8000`
- Run `cd backend && uv sync` to ensure deps are installed
- Check `backend/.env` exists

**Issue: Frontend can't reach backend**
- Ensure backend is running on port 8000
- Check CORS settings in `main.py`
- If using real client, verify `VITE_API_BASE_URL` is correct

**Issue: `git subtree pull` gives merge conflicts**
- Resolve conflicts normally: edit files, `git add`, `git commit`
- If conflicts are severe, consider a fresh `git subtree add` after removing the directory

**Issue: "fatal: refusing to merge unrelated histories" on subtree pull**
- Make sure you include `--squash` flag in the pull command
- Verify the remote is correct: `git remote -v`

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-15 | Parth | Initial comprehensive documentation (BRD, PRD, TDD) |
| 1.1 | 2026-02-16 | Parth | Updated: React frontend (from Svelte), uv package manager (from pip), local PostgreSQL for dev, Git subtree structure (not submodule), CLI-optimized instructions, Pydantic v2 validators |
| 1.2 | 2026-02-16 | Parth | BMAD planning alignment — synchronized with API_CONTRACT.md, Architecture, and Epics. See change log below. |

---

### v1.2 Change Log — BMAD Planning Alignment

The following changes were made to align this master doc with decisions from the BMAD planning process (PRD, Architecture, UX Design, Epics & Stories, and API_CONTRACT.md):

**Field Naming (API_CONTRACT.md is canonical):**
- `assigned_to` → `assignee_id` (Task entity, all code references)
- Added `assignee_name` field to Task (server-resolved from assignee_id)
- `is_active` → `active` (Member entity)
- `update_text` → `content` (DailyUpdate entity)
- Added `author_name` field to DailyUpdate (server-resolved from author_id)
- Added `edited` field to DailyUpdate (boolean, tracks post-creation edits)
- `blocking_reason` changed from nullable TEXT to NOT NULL VARCHAR default `""`
- `team_members` table → `members` table
- `subtasks` table → `sub_tasks` table

**API Endpoints:**
- All update endpoints changed from `PUT` to `PATCH` (partial updates per API_CONTRACT)
- `/api/v1/team-members` → `/api/v1/members`
- Added `PATCH /tasks/{id}/subtasks/{sid}/toggle` (dedicated toggle endpoint)
- Added `PUT /tasks/{id}/subtasks/reorder` (reorder sub-tasks)
- Added `POST /api/v1/settings/save-connection` (save encrypted credentials)
- All errors now return `{"error": "message"}` (not FastAPI's default `{"detail": ...}`)
- Custom exception handlers for RequestValidationError, HTTPException, and generic Exception

**Security & Encryption:**
- AES-256 with machine-specific key → Fernet symmetric encryption with generated key file
- No admin privileges required for any file operations
- Config directory passed via `TASKFLOW_CONFIG_DIR` environment variable
- Credentials stored in `config_dir/fernet.key` + `config_dir/db_credentials.enc`
- DATABASE_URL no longer stored in `.env` — constructed at runtime from decrypted credentials

**Packaging & Distribution:**
- NSIS installer → `portable` target (no installer, no admin privileges)
- PyInstaller `--onefile` → `--onedir` mode
- Added root-level `pyinstaller_entrypoint.py` with `multiprocessing.freeze_support()`
- Size limit updated from 150MB to 200MB
- Added explicit hidden imports and Alembic data bundling in .spec config

**Electron:**
- `setTimeout(2000)` startup → health-check polling (200ms interval, 30 retries max)
- Added `TASKFLOW_CONFIG_DIR` env variable passed to backend child process
- Added signal handlers (SIGINT, SIGTERM, uncaughtException) for clean shutdown
- Added force-kill timeout for unresponsive backend process
- Added error dialog for startup failures with actionable guidance

**Backend Structure:**
- `team_member.py` → `member.py` (models, schemas, crud, api)
- Database migrations via Alembic programmatic runner on startup (not `create_all()`)
- `pydantic-settings` added to dependencies, `python-dotenv` removed
- Frontend API layer restructured: `mockClient.ts` / `realClient.ts` → `adapters/mock.ts` / `adapters/real.ts` with `client.ts` interface and `types.ts`
- Email field on Member changed from optional to required + unique

---

**END OF DOCUMENT**
