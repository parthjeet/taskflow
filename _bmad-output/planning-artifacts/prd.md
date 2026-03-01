---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-taskflow-2026-02-16.md
  - _bmad-output/planning-artifacts/research/domain-electron-fastapi-react-desktop-bundling-research-2026-02-16.md
  - docs/task_flow_master_doc.md
documentCounts:
  briefs: 1
  research: 1
  projectDocs: 1
classification:
  projectType: desktop_app
  domain: general_internal_tooling
  complexity: low-medium
  projectContext: brownfield
workflowType: 'prd'
---

# Product Requirements Document - TaskFlow

**Author:** parth
**Date:** 2026-02-16

## Executive Summary

TaskFlow is a lightweight desktop task management application for a 6-person strategic DevOps team at AIG. It replaces Excel-based tracking with a purpose-built tool that makes blockers impossible to miss, captures daily progress without overhead, and gives the team lead full visibility in 30 seconds.

**Key Differentiator:** Blocker-first design — blocked tasks aren't just a status filter, they're visually unmissable with red borders and prominent reasons, directly addressing the #1 pain from the Excel era.

**Target Users:**
- **Engineers (6):** Log progress, mark blockers, track assigned work — TaskFlow feels like a personal dashboard, not a compliance tool
- **Team Lead (1):** Assigns tasks, monitors blockers, runs standups from the dashboard — management overhead drops from ~50% to < 20%

**Technology:** Electron desktop shell + React frontend (shadcn/ui, Tailwind) + FastAPI backend (SQLAlchemy, PostgreSQL). Packaged as a portable Windows executable — no installer, double-click and run.

**MVP Scope:** 8 core features (Dashboard, Task CRUD, Sub-tasks, Daily Updates, Team Members, Blocked Highlighting, GEAR ID, Settings UI). Single developer with AI-assisted development. Brownfield project with existing frontend and backend structure.

## Success Criteria

### User Success

- Engineers log daily progress updates unprompted — TaskFlow feels like a personal work dashboard, not a compliance tool
- Engineers proactively mark tasks as blocked with clear reasons on their own initiative
- Lead sees full team status in < 30 seconds before standup — no manual consolidation
- Lead management overhead drops from ~50% to < 20% of time
- "Aha!" moments: engineer marks a blocker and gets proactive help; standup runs in half the time because everything is already visible

### Business Success

- 100% team adoption (6/6 engineers) within 2 weeks of rollout
- Task management overhead reduced from ~2 hr/week to < 30 min/week per engineer (75% reduction)
- 9+ hours/week saved team-wide
- Zero missed critical tasks — no work falls through the cracks
- Zero production surprises from untracked or forgotten tasks
- Excel fully retired within 3 months (manual task re-entry; no import feature needed for MVP)
- &gt; 80% daily update rate on active tasks at 3 months without prompting

### Technical Success

- App launch < 5 seconds
- Task list load < 2 seconds for up to 500 tasks
- UI interactions < 200ms
- Portable executable size < 200 MB
- No antivirus false positives on clean Windows Defender install
- Backend startup within 3 seconds (health check passes before window loads)
- No orphan `api.exe` processes after app close
- Database connection retry with user-friendly error messaging

### Measurable Outcomes

| Timeframe | Metric | Target |
|-----------|--------|--------|
| 2 weeks | Team adoption | 100% (6/6) |
| 2 weeks | Standup integration | Dashboard used daily |
| 2 weeks | Task migration | All active Excel tasks re-entered |
| 3 months | Daily update rate | > 80% of active tasks |
| 3 months | Blocker response time | < 4 hours (team behavior) |
| 3 months | Management overhead | < 30 min/week per person |
| 3 months | Lead admin time | < 20% |
| 3 months | Missed tasks | Zero |
| 3 months | Excel retirement | Complete |

## User Journeys

### Journey 1: Parth Sets Up TaskFlow for the First Time

**Opening Scene:** It's Sunday evening. Parth has been building TaskFlow for weeks — the backend is deployed, the cloud PostgreSQL is provisioned, and the portable exe is sitting in a shared network folder. Tomorrow morning he'll roll it out to the team. But first, he needs to prove it works end-to-end.

**Rising Action:** Parth double-clicks `TaskFlow.exe`. The app launches in under 5 seconds. The dashboard is empty — clean slate. He navigates to **Settings**, enters the PostgreSQL credentials (host, port, database, username, password), and clicks **Test Connection**. Green checkmark — connected. He hits **Save**.

Next, he goes to **Team** and creates 6 team member profiles: himself and 5 engineers. Names and emails — takes 2 minutes.

Now the real test. He clicks **New Task**, types "Migrate Jenkins pipelines to GitHub Actions," assigns it to Ravi, sets priority to High, adds GEAR ID `4521`. He creates 5 more tasks — a mix of To Do, In Progress, and one Blocked task with a reason: "Waiting for DBA to provision read replica." He adds sub-tasks to the Jenkins migration and logs a daily update.

**Climax:** Parth switches to the dashboard and sees it all: color-coded priorities, the blocked task screaming in red with "Waiting for DBA to provision read replica" right on the card, task counts per status. He filters by "Blocked" — one task, clear as day. He filters by assignee — Ravi's queue looks manageable.

**Resolution:** For the first time, Parth can see his team's work in 30 seconds without opening a spreadsheet. He copies the `TaskFlow.exe` link to the team channel and types: "New tool for tomorrow's standup. Double-click, it works."

### Journey 2: Ravi's First Day with TaskFlow

**Opening Scene:** Monday morning. Ravi opens the link Parth shared, double-clicks the exe. TaskFlow launches. The dashboard shows 3 tasks assigned to him — no setup needed, no account creation, no password. His tasks are already there because Parth pre-loaded them.

**Rising Action:** Ravi sees his task list: one High priority (Jenkins migration), one Medium, one Low. The Jenkins task has sub-tasks — he clicks into it and sees "Audit existing pipelines," "Write GHA workflow files," "Test in staging," "Cutover." He checks off "Audit existing pipelines" — the progress bar updates to "1 of 4 completed."

He clicks **Add Daily Update** and types: "Completed pipeline audit. 12 pipelines total, 8 can migrate directly, 4 need custom runners. Starting workflow files tomorrow." Takes 15 seconds.

**Climax:** Mid-afternoon, Ravi hits a wall. The custom runner configuration requires IAM permissions he doesn't have. He opens the Jenkins migration task, changes status to **Blocked**, and types the reason: "Need IAM role for custom GHA runners — requires Cloud team approval." The task card immediately turns red.

Within an hour, Parth sees the red card on his dashboard, reads the blocking reason, and messages the Cloud team lead directly. By end of day, the IAM role is provisioned.

**Resolution:** Ravi unblocks himself the next morning, changes status back to In Progress, and logs a daily update: "IAM role received. Resuming custom runner setup." The red border disappears. He didn't have to chase anyone — the tool did the chasing for him.

### Journey 3: Parth Runs Monday Standup

**Opening Scene:** Monday 9:00 AM. The team joins the call. In the old world, Parth would have spent 20 minutes before the meeting piecing together status from a sprawling Excel file and Slack messages. Today, he opens TaskFlow.

**Rising Action:** Parth shares his screen showing the dashboard. He filters by status — 4 tasks In Progress, 1 Blocked, 3 To Do, 2 Done since last week. He clicks into the Blocked task — the red card shows "Waiting for DBA to provision read replica" assigned to Amit. "Amit, I see you're blocked on the read replica — where are we with DBA?" Amit updates the team live.

Parth scrolls through recent daily updates across tasks. He can see who worked on what without asking each person for a status report. He spots that one engineer hasn't logged an update since Thursday — a gentle nudge, not a confrontation.

**Climax:** During standup, a project manager pings Parth on Teams: "What's the status on the GEAR 4521 migration?" Parth types `4521` in the GEAR ID filter — the Jenkins migration task appears instantly with sub-task progress (2 of 4), daily updates, and current status. He pastes a screenshot back to the PM in under 30 seconds.

**Resolution:** Standup finishes in 12 minutes instead of 25. Everyone knew their status going in. Parth didn't ask "what are you working on?" once — he asked "what do you need?" instead. The team notices the difference.

### Journey 4: Error Paths — When Things Go Wrong

**Scenario A: Database connection fails on startup.**
Parth launches TaskFlow on a new machine. The app opens but the dashboard shows an error: "Unable to connect to database. Check your connection settings." A button takes him directly to Settings. He realizes he hasn't configured credentials on this machine. He enters them, tests — green checkmark — saves. The dashboard loads.

**Scenario B: Database goes down mid-session.**
Ravi is updating a task when the cloud PostgreSQL goes briefly offline. He clicks Save and sees: "Unable to save — connection lost. Your changes have been preserved. Retrying..." The app retries automatically. When the connection returns, the save completes and Ravi sees a success message. No data lost.

**Scenario C: Deleting a team member with assigned tasks.**
Parth tries to remove a team member who left the company. He clicks Delete and sees: "Cannot delete — this member has 3 assigned tasks. Reassign them first." He reassigns the tasks, then successfully deactivates the member. The member disappears from assignment dropdowns but their historical daily updates remain.

**Scenario D: Port conflict on startup.**
Ravi launches TaskFlow but another process is using port 8000. The app shows: "TaskFlow backend couldn't start — port 8000 is in use. Close the conflicting application and try again." Clear, actionable, no cryptic error.

### Journey 5: Onboarding a New Team Member

**Opening Scene:** Month 2. The team grows from 6 to 7 — Priya joins as a new DevOps engineer. She's never seen TaskFlow before.

**Rising Action:** Parth goes to the **Team** page and adds Priya — name and email. She's immediately available in the assignment dropdown. Parth creates two tasks for her onboarding week: "Set up local dev environment" and "Shadow Amit on monitoring alerts." He assigns both to Priya with Medium priority.

Priya receives the `TaskFlow.exe` link on her first day. She double-clicks it — the app launches, connects to the team database (same credentials pre-configured in the exe's saved settings), and she sees her 2 assigned tasks immediately.

**Climax:** Priya clicks into "Set up local dev environment," sees the sub-tasks (install tools, clone repos, run test suite), and starts checking them off. She adds her first daily update: "Installed Docker and Terraform. Cloning repos tomorrow." It took 30 seconds and she didn't need a tutorial.

**Resolution:** By her second standup, Priya is updating TaskFlow like everyone else. Zero training needed. Parth didn't write a user guide — the interface taught itself.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| First-time setup | Settings UI, test connection, team member CRUD, task seeding, portable exe startup |
| Engineer daily use | Dashboard filtering, task detail view, sub-task checkoff, daily updates, blocker marking/unblocking |
| Lead standup | Dashboard overview, status filtering, GEAR ID search, daily update review, team visibility |
| Error paths | Connection error messaging, retry logic, delete protection, port conflict detection |
| New member onboarding | Team member creation, instant task visibility, zero-config user experience, intuitive UI |

## Desktop App Specific Requirements

### Project-Type Overview

TaskFlow is a portable Windows desktop application — no installer, no system integration, no auto-update. Users download the exe, double-click, and it works. The app runs in an enterprise environment with guaranteed network/database connectivity.

### Technical Architecture Considerations

**Platform Support**
- Windows 10/11 (x64) only — no Mac, Linux, or ARM builds for MVP
- Packaged as portable executable via electron-builder (`portable` target)
- No NSIS installer — single exe or self-contained directory that runs in place
- No admin privileges required to run

**Update Strategy**
- Manual distribution — lead provides new exe versions via shared network folder or internal channel
- No auto-update mechanism in v1
- Version number displayed in UI so users can confirm they're on the latest

**System Integration**
- Plain window — opens and closes, no system tray, no startup launch, no desktop notifications
- No registry modifications, no file associations
- Application menu disabled
- Minimum window size: 1024x600

**Offline Capabilities**
- None required — enterprise environment guarantees database connectivity
- Connection failure shows error with link to Settings page
- Database connection retry logic for transient failures
- No local caching or offline read-only mode

### Implementation Considerations

- electron-builder target: `portable` instead of `nsis` in `package.json`
- Remove NSIS-specific configuration (`oneClick`, `allowToChangeInstallationDirectory`, etc.)
- Backend binary bundled via `extraResources` inside the portable package
- DB credentials stored locally in encrypted file (persists across sessions since the exe runs from a fixed location)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — ship the minimum that replaces Excel and makes blockers impossible to miss. All 8 core features are included because each one directly supports the core workflow. Cutting any one (e.g., removing sub-tasks or GEAR ID) would leave a gap that sends engineers back to Excel for that specific need.

**Resource Requirements:** Single developer (parth) with AI-assisted development. The tight scope and well-defined spec make this achievable — the codebase already has a React frontend (via Lovable/git subtree) and a FastAPI backend structure in place.

**Simplification Decisions:**
- DB credential encryption: Simpler encryption approach for v1 (not AES-256 with machine-specific key derivation). Low threat model — local file on enterprise machines, not a public-facing service.
- No import/migration tooling: Engineers manually re-enter active tasks from Excel. Task volume (~50-100 active tasks) makes this a one-afternoon effort, not a feature worth building.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- First-time setup (Journey 1) — Settings, team creation, task seeding
- Engineer daily use (Journey 2) — Dashboard, task updates, blocker marking
- Lead standup (Journey 3) — Dashboard overview, filtering, GEAR ID search
- Error paths (Journey 4) — Connection errors, delete protection, port conflicts
- New member onboarding (Journey 5) — Zero-config experience

**Must-Have Capabilities:**

| # | Feature | Why It's MVP |
|---|---------|-------------|
| 1 | Task Dashboard | The primary interface — without it, there's no product |
| 2 | Task CRUD | Can't manage tasks without creating and editing them |
| 3 | Sub-tasks | Complex migrations need breakdown; without this, engineers track sub-work elsewhere |
| 4 | Daily Updates | Core differentiator — knowledge capture built into workflow, with edit/delete within 24 hours for accuracy |
| 5 | Team Members | Assignment is fundamental to "who's doing what" visibility |
| 6 | Blocked Highlighting | The #1 pain point from the Excel era — this is the product's reason for existing |
| 7 | GEAR ID | Critical AIG identifier; without it, the PM lookup from Journey 3 doesn't work |
| 8 | Settings UI | Database connection must be configurable through UI — no .env file editing |

**Technical Must-Haves:**
- Portable Windows executable (electron-builder `portable` target)
- Health-check startup sequencing (backend `/health` polling, not `setTimeout`)
- PyInstaller `--onedir` mode with root-level entrypoint and `freeze_support()`
- Alembic migrations bundled and run programmatically at startup
- Code signing to prevent AV false positives

### Post-MVP Roadmap

**Phase 2 — Growth (v1.1, Q2 2026):**
- Export/Import (Excel, JSON) — data portability once core workflow is proven
- Full-text search — becomes valuable as task count grows past ~200
- Keyboard shortcuts — power user efficiency
- Bulk operations — manageable without at < 500 tasks, but nice to have

**Phase 3 — Expansion (v2+, Q3-Q4 2026):**
- Role-based permissions — needed only if tool expands beyond single team
- Teams/Slack/Email integrations — notifications for blockers and overdue tasks
- Tags and labels — flexible categorization beyond status/priority/GEAR ID
- Time tracking — effort estimation and capacity planning
- Reporting & analytics — completion rates, blocker analysis, team velocity
- Mobile companion app — view-only for on-the-go status checks

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AV false positives block exe | Users can't launch the app | Code signing + `--onedir` mode + bootloader recompilation if needed |
| PyInstaller hidden import failures | Backend crashes on startup | Comprehensive `.spec` file with all hidden imports; test on clean Windows VM |
| Portable exe size exceeds 200 MB | Distribution friction | Monitor during build; strip unused dependencies; `--onedir` inherently smaller |
| Orphan `api.exe` processes | Resource leak, port conflicts on relaunch | Electron `app.on('before-quit')` kills child process; handle crash scenarios |
| Startup sequencing race condition | UI loads before backend is ready | Health-check polling loop (max 30 retries, 200ms interval) replaces fragile setTimeout |

**Resource Risks:**

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Single developer bottleneck | Delays if blocked or unavailable | Well-defined spec reduces ambiguity; AI-assisted development accelerates delivery |
| Scope creep during development | MVP timeline slips | Strict 8-feature boundary; all "nice to haves" explicitly deferred to v1.1+ |
| Team adoption resistance | Tool goes unused | Pre-load tasks before rollout; zero-config user experience; prove value in first standup |

## Functional Requirements

### Task Management

- **FR1:** User can create a task with title, description, assigned team member, status, priority, GEAR ID, and blocking reason
- **FR2:** User can view a task's complete details including associated sub-tasks and daily updates
- **FR3:** User can update any field of an existing task
- **FR4:** User can delete a task with cascading removal of its sub-tasks and daily updates
- **FR5:** User can set task status to To Do, In Progress, Blocked, or Done
- **FR6:** System enforces a blocking reason when task status is set to Blocked
- **FR7:** System clears the blocking reason when status changes away from Blocked
- **FR8:** User can assign or reassign a task to any active team member
- **FR9:** User can set task priority to High, Medium, or Low
- **FR10:** User can associate a 4-digit GEAR ID (0000-9999) with a task
- **FR11:** System validates all task field constraints (title length, GEAR ID format, required fields)

### Sub-task Management

- **FR12:** User can add sub-tasks to a task (up to 20 per task)
- **FR13:** User can mark a sub-task as complete or incomplete
- **FR14:** User can view sub-task completion progress for a task
- **FR15:** User can remove a sub-task from a task
- **FR16:** User can reorder sub-tasks within a task
- **FR17:** User can edit a sub-task title

### Daily Progress Tracking

- **FR18:** User can add a timestamped progress update to a task
- **FR19:** User can view all updates for a task in reverse chronological order
- **FR20:** User can edit their own update within 24 hours of creation
- **FR21:** User can delete their own update within 24 hours of creation
- **FR22:** System attributes each update to the authoring team member with name resolution
- **FR23:** System prevents modification of updates older than 24 hours
- **FR24:** System indicates whether a daily update has been edited

### Team Management

- **FR25:** User can add a team member with name and email
- **FR26:** User can edit a team member's details
- **FR27:** User can toggle a team member between active and inactive status
- **FR28:** Inactive members are excluded from task assignment options
- **FR29:** System prevents deletion of members who have assigned tasks
- **FR30:** User can view all team members with name, email, status, and assigned task count

### Dashboard & Discovery

- **FR31:** User can view all tasks in a card/list dashboard
- **FR32:** User can filter tasks by status, priority, assignee, blocked status, or GEAR ID
- **FR33:** User can sort tasks by date created, date updated, or priority
- **FR34:** User can search tasks by title, description, or GEAR ID
- **FR35:** User can perform quick actions from the dashboard (mark complete, edit, delete)
- **FR36:** Blocked tasks are visually distinguished with prominent indicators and visible blocking reasons
- **FR37:** Tasks display visual indicators for priority level and status

### Application Configuration

- **FR38:** User can configure database connection settings through the UI
- **FR39:** User can test a database connection before saving
- **FR40:** System stores database credentials in an encrypted local file
- **FR41:** System connects to the database automatically on startup using saved credentials
- **FR42:** User can view the application version number

### Error Handling & Resilience

- **FR43:** System communicates database connection failures with actionable guidance
- **FR44:** System retries database connections on transient failures
- **FR45:** System preserves user input during connection interruptions
- **FR46:** System detects and communicates backend startup failures (e.g., port conflicts)
- **FR47:** System ensures clean shutdown of all processes when the application closes

## Non-Functional Requirements

### Performance

- **NFR1:** Application launches and displays the dashboard within 5 seconds of double-clicking the executable
- **NFR2:** Task list loads within 2 seconds for up to 500 tasks
- **NFR3:** UI interactions (clicks, form inputs, navigation) respond within 200ms
- **NFR4:** Backend health check passes within 3 seconds of process start
- **NFR5:** Filtering and sorting operations complete within 500ms for up to 500 tasks

### Security

- **NFR6:** Database credentials are encrypted at rest in the local configuration file
- **NFR7:** No database credentials appear in application logs, temp files, or error messages
- **NFR8:** All database queries use parameterized statements (no raw SQL string concatenation)
- **NFR9:** Password fields are masked by default in the Settings UI

### Reliability

- **NFR10:** Failed database operations are retried automatically on transient connection failures
- **NFR11:** No orphan backend (`api.exe`) processes remain after application close — including crash scenarios
- **NFR12:** Database connection failures display user-friendly error messages with a path to Settings
- **NFR13:** Application handles port conflicts on startup with a clear, actionable error message
- **NFR14:** All data mutations (create, update, delete) are atomic — partial writes do not corrupt state

### Usability

- **NFR15:** A new team member can create a task and log a daily update within 5 minutes of first launch without guidance
- **NFR16:** All user actions provide visual feedback (loading states, success confirmations, error messages)
- **NFR17:** The interface follows consistent design patterns throughout (shadcn/ui component library)
- **NFR18:** Minimum window size of 1024x600 with responsive layout adaptation

### Portability & Distribution

- **NFR19:** Packaged as a portable Windows executable — no installer, no admin privileges required
- **NFR20:** Portable executable total size under 200 MB
- **NFR21:** No antivirus false positives on a clean Windows Defender install
- **NFR22:** Runs on Windows 10 and Windows 11 (x64) without additional runtime dependencies
- **NFR23:** No registry modifications, file associations, or system-level side effects
