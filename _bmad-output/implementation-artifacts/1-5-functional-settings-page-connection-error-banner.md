# Story 1.5: Functional Settings Page & Connection Error Banner

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team lead,
I want the Settings page to allow configuring database connection details and see a connection error banner when the database is unreachable,
so that I can set up and troubleshoot the database connection through the UI.

## Acceptance Criteria

1. Settings page includes editable fields: Host, Port, Database Name, Username, Password.
2. Password field is masked by default and supports show/hide toggle (NFR9).
3. "Test Connection" calls `apiClient.testConnection(data)`, shows loading state, and shows success/failure toast feedback without saving credentials.
4. "Save" calls `apiClient.saveConnection(data)`, persists settings in mock mode (localStorage), and shows success toast.
5. Dashboard shows `ConnectionErrorBanner` at top when database is unreachable, with error text and link to `/settings`; banner is hidden in mock mode.
6. Settings page displays application version text `v1.0.0` at the bottom.

## Tasks / Subtasks

- [x] Build functional Settings form and local state handling (AC: 1, 2)
  - [x] Update `taskflow-ui/src/pages/SettingsPage.tsx` (existing route target) with controlled inputs for host, port, database, username, password.
  - [x] Add password visibility toggle and keep masked-by-default behavior.
  - [x] Keep existing layout constraints (`max-w-xl`) and header/navigation patterns.
- [x] Wire settings actions to adapter layer (AC: 3, 4)
  - [x] Implement `handleTestConnection` calling `apiClient.testConnection(payload)`.
  - [x] Implement `handleSaveConnection` calling `apiClient.saveConnection(payload)`.
  - [x] Add loading/disabled states for action buttons while async work is running.
  - [x] Add toast feedback for success and error paths using existing `useToast` pattern.
- [x] Add dashboard connection error banner component (AC: 5)
  - [x] Create `taskflow-ui/src/components/ConnectionErrorBanner.tsx` using shadcn `Alert`.
  - [x] Include error icon, actionable copy, and a `Go to Settings` link/button to `/settings`.
  - [x] Mount banner near top of `taskflow-ui/src/pages/Index.tsx`, above filters/grid.
  - [x] Keep banner hidden in mock mode (no false alarms while mock adapter is active).
- [x] Add version display in Settings (AC: 6)
  - [x] Render `v1.0.0` near page footer using subdued text style.
- [x] Add tests and run verification gates (AC: 1-6)
  - [x] Add/extend frontend tests for Settings interactions and banner visibility behavior.
  - [x] Add/extend adapter smoke coverage for settings calls (`testConnection`, `saveConnection` persistence).
  - [x] Run `npm test` and `npm run build` in `taskflow-ui`.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Update Dev Agent Record File List to include all actual implementation files (SettingsPage.tsx, ConnectionErrorBanner.tsx, Index.tsx, mock.smoke.test.ts, settings-page.test.tsx, connection-error-banner.test.tsx, package.json, playwright.config.ts, tests/) [story file]
- [x] [AI-Review][HIGH] SettingsPage reads connection settings directly from localStorage, bypassing the adapter pattern. Add `getConnectionSettings()` method to ApiClient interface and mock adapter, then use it in SettingsPage.tsx:36-51 instead of direct localStorage access [taskflow-ui/src/lib/api/client.ts, taskflow-ui/src/lib/api/adapters/mock.ts, taskflow-ui/src/pages/SettingsPage.tsx]
- [x] [AI-Review][HIGH] Remove newly added packages (`@playwright/test`, `@seontechnologies/playwright-utils`, `dotenv`) from package.json — story constraint says "do not add or upgrade packages in this story". If Playwright is needed, create a separate story for e2e infrastructure [taskflow-ui/package.json]
- [x] [AI-Review][MEDIUM] Add `getConnectionSettings()` to ApiClient interface to close the API contract gap — testConnection and saveConnection exist but there is no read method [taskflow-ui/src/lib/api/client.ts]
- [x] [AI-Review][MEDIUM] Integrate Playwright properly: add `test:e2e` npm script, add `playwright-report/` and `test-results/` to `.gitignore`, fix `playwright.config.ts` baseURL from port 8080 to match Vite's actual dev server port [taskflow-ui/package.json, taskflow-ui/.gitignore, taskflow-ui/playwright.config.ts]
- [x] [AI-Review][MEDIUM] Add missing test coverage: SettingsPage loading saved settings from localStorage on mount, save connection failure path, ConnectionErrorBanner error icon rendering [taskflow-ui/src/test/settings-page.test.tsx, taskflow-ui/src/test/connection-error-banner.test.tsx]
- [x] [AI-Review][LOW] Move or gitignore LOVABLE_HANDOFF_STORY_1_5.md and LOVABLE_PROMPT_STORY_1_5.md — these are process artifacts, not application source code [taskflow-ui/]
- [x] [AI-Review][LOW] e2e test infrastructure (Playwright config, fixtures, specs) exceeds story scope — consider splitting into a dedicated testing story for proper tracking

## Dev Notes

### Developer Context

- This is a UI-track story and should stay in `taskflow-ui`.
- Story 1.4 already completed API adapter consolidation; UI code must call `apiClient` only.
- Story 1.3 backend endpoints exist, but this story is still primarily mock-mode behavior for the current adapter.

### Technical Requirements

- Use the existing page file `taskflow-ui/src/pages/SettingsPage.tsx` (do not rename route/page files).
- Form payload shape must align with `ConnectionSettings` in `taskflow-ui/src/lib/api/types.ts`:
  - `{ host: string, port: number, database: string, username: string, password: string }`
- Convert/validate port as a number before calling adapter methods.
- `Test Connection` behavior:
  - show pending/loading state while request is active
  - show toast success when `result.success` is true
  - show destructive/error toast when `result.success` is false or when call throws
  - never persist credentials in this action
- `Save` behavior:
  - call `apiClient.saveConnection(payload)`
  - show success toast on success
  - on failure show destructive/error toast
- Banner behavior:
  - display text: "Unable to connect to database" with clear action to open settings
  - in mock mode, render hidden/not mounted state
  - avoid introducing fake failure flags that would confuse users during mock development
- Version behavior:
  - display exact text `v1.0.0` at bottom of Settings page.

### Architecture Compliance

- Preserve adapter boundary established in Story 1.4:
  - UI calls `apiClient` from `@/lib/api`
  - no direct localStorage reads/writes from page components for connection persistence
- Keep route mapping unchanged:
  - `/settings` -> `SettingsPage`
  - `/` -> `Index`
- Use existing component composition strategy (shadcn primitives + local components), no parallel design system.
- No backend file or API contract changes in this story.

### Library / Framework Requirements

- Use existing dependencies from `taskflow-ui/package.json`; do not add or upgrade packages in this story.
- Use existing UI primitives:
  - `Alert`, `AlertDescription`
  - `Button`, `Input`, `Label`
  - `useToast`
- Use existing routing primitives (`Link`/`useNavigate`) from `react-router-dom`.

### File Structure Requirements

Expected files to create/update:

- Create:
  - `taskflow-ui/src/components/ConnectionErrorBanner.tsx`
- Update:
  - `taskflow-ui/src/pages/SettingsPage.tsx`
  - `taskflow-ui/src/pages/Index.tsx`
  - `taskflow-ui/src/lib/api/adapters/mock.smoke.test.ts` (extend for settings behavior if needed)
  - `taskflow-ui/src/test/*.test.tsx` (new/updated UI tests as needed)

### Testing Requirements

- Add coverage for:
  - Settings form renders all required fields
  - password masking default + show/hide toggle behavior
  - test-connection button loading and toast flow
  - save action success flow and persistence effect through adapter
  - dashboard banner hidden behavior in mock mode
- Verify no regressions in dashboard/task/team flows.
- Required checks before moving to `review`:
  - `npm test`
  - `npm run build`

### Previous Story Intelligence (Story 1.4)

- Adapter layer is active and centralized:
  - `taskflow-ui/src/lib/api/client.ts`
  - `taskflow-ui/src/lib/api/index.ts`
  - `taskflow-ui/src/lib/api/adapters/mock.ts`
- Story 1.4 hardening already added:
  - safer error handling pattern (`err instanceof Error`)
  - `saveConnection` mock persistence to `localStorage` (`taskflow_connection`)
- Reuse this pattern for new Settings UI error handling and avoid `any` in catches.

### Git Intelligence Summary

- Recent commits (`49f790a`, `f82460a`) indicate active direction:
  - keep API adapter as the single integration point
  - keep TypeScript-safe error handling (`err instanceof Error`)
  - avoid behavioral regressions while refactoring UI pages

### Latest Technical Information (researched 2026-02-16)

- `react-router-dom` project has active v7 releases; v6 maintenance branch includes `6.30.3`.
- `@tanstack/react-query` v5 line continues active patching (latest visible: `5.90.16`).
- Vite indicates security backports for `5.4` line; project currently uses `vite@5.4.19`.
- Guidance for this story: stay on pinned project versions and focus on feature completion; do not include dependency upgrades in scope.

### Project Structure Notes

- `project-context.md` not found in repository; planning and implementation artifacts provide sufficient context.
- Epics prompt references `src/pages/Settings.tsx`; actual project file is `taskflow-ui/src/pages/SettingsPage.tsx` and should be treated as canonical.

### References

- `_bmad-output/planning-artifacts/epics.md` (Story 1.5 requirements and ACs)
- `_bmad-output/planning-artifacts/prd.md` (FR38-FR44, NFR9, NFR12)
- `_bmad-output/planning-artifacts/architecture.md` (frontend adapter boundary, route/file conventions)
- `_bmad-output/planning-artifacts/ux-design-specification.md` (ConnectionErrorBanner behavior and placement)
- `_bmad-output/implementation-artifacts/1-4-frontend-api-layer-refactor-to-adapter-pattern.md` (previous story learnings)
- `taskflow-ui/src/pages/SettingsPage.tsx` (current placeholder implementation)
- `taskflow-ui/src/pages/Index.tsx` (dashboard mount point for banner)
- `taskflow-ui/src/lib/api/adapters/mock.ts` (settings mock behavior)
- `taskflow-ui/src/lib/api/client.ts` (adapter contract)
- `taskflow-ui/src/lib/api/types.ts` (settings payload/result types)
- `taskflow-ui/src/lib/api/adapters/mock.smoke.test.ts` (existing smoke testing pattern)
- https://github.com/remix-run/react-router/releases
- https://github.com/TanStack/query/releases
- https://vite.dev/releases

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow synthesis from planning artifacts, implementation artifacts, current source tree, and recent git history.
- dev-story review remediation: adapter contract fix (`getConnectionSettings`), settings page boundary correction, and review follow-up test additions.
- Verification gates run in `taskflow-ui`: `npm test` (20/20 passing) and `npm run build` (success).

### Completion Notes List

- Created comprehensive Story 1.5 developer context and implementation guardrails.
- Story marked `ready-for-dev` in sprint tracking.
- Included constraints to prevent adapter-boundary regressions and file-path drift.
- Resolved all 8 AI review follow-up items and closed adapter boundary gap by routing settings reads through `apiClient`.
- Removed out-of-scope Playwright-related dependency additions for this story and gitignored process/e2e artifacts.
- Added missing UI/adapter coverage for saved-settings load, save failure path, and banner icon rendering.

### File List

- `_bmad-output/implementation-artifacts/1-5-functional-settings-page-connection-error-banner.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.gitignore`
- `taskflow-ui/.gitignore`
- `taskflow-ui/package.json`
- `taskflow-ui/package-lock.json`
- `taskflow-ui/src/components/ConnectionErrorBanner.tsx`
- `taskflow-ui/src/lib/api/client.ts`
- `taskflow-ui/src/lib/api/adapters/mock.ts`
- `taskflow-ui/src/lib/api/adapters/mock.smoke.test.ts`
- `taskflow-ui/src/pages/Index.tsx`
- `taskflow-ui/src/pages/SettingsPage.tsx`
- `taskflow-ui/src/test/connection-error-banner.test.tsx`
- `taskflow-ui/src/test/settings-page.test.tsx`

## Change Log

- 2026-02-17: Fixed code review findings. Deleted redundant `settings.test.ts` and added `_bmad-output/test-artifacts/` to root `.gitignore`. Story marked as done.
- 2026-02-17: Addressed AI code review findings. Added `getConnectionSettings` adapter contract + SettingsPage integration, expanded test coverage, removed out-of-scope Playwright dependency additions, gitignored process/e2e artifacts, and reran verification gates (`npm test`, `npm run build`). Status moved to `review`.
- 2026-02-17: Code review completed by AI reviewer. 0 Critical, 3 High, 5 Medium, 2 Low issues found. 8 action items created. Status moved to `in-progress`. All 6 ACs verified as implemented. Tests (17/17) and build pass.
- 2026-02-16: Story context created and moved to `ready-for-dev`.
