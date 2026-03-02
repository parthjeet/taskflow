# Story 4.1: Dashboard Enhancement — StatusSummaryBar, Filters, Search & Quick Actions

Status: ready-for-dev

<!-- Validated by validate-create-story on 2026-03-02 -->

## Story

As a team lead,
I want a dashboard with status summary counts, filtering by any attribute, sorting, search, and quick actions on task cards,
so that I can assess team status at a glance, find specific tasks in under 30 seconds, and take common actions without navigating away.

## Acceptance Criteria

1. **Given** the dashboard is loaded with tasks **When** a user views the StatusSummaryBar **Then** it displays accurate counts for each status category (To Do, In Progress, Blocked, Done) **And** clicking a status count filters the task list to that status **And** clicking the active filter again clears it
2. **Given** the dashboard has filter controls **When** a user selects filters for status, priority, and/or assignee **Then** the task list updates to show only tasks matching ALL selected filters (AND logic) **And** filtering completes within 500ms (NFR5)
3. **Given** a GEAR ID filter input **When** a user types a partial GEAR ID (e.g., "10") **Then** the task list filters to tasks whose GEAR ID starts with "10"
4. **Given** the sort dropdown **When** a user selects a sort option **Then** tasks are reordered accordingly: by updated date, created date, or priority level
5. **Given** the search bar **When** a user types a search term **Then** after a 300ms debounce, the task list filters to tasks matching on title, description, or GEAR ID (case-insensitive)
6. **Given** a task with status "Blocked" **When** it appears on the dashboard **Then** the card has a visually prominent red/warning indicator **And** the blocking reason text is visible directly on the card
7. **Given** task cards on the dashboard **When** a user views any card **Then** color-coded badges for priority and status are visible
8. **Given** a task card's InlineStatusSelect **When** a user changes the status to "Blocked" **Then** an inline input appears for the blocking reason before the change is saved
9. **Given** quick action buttons on a task card **When** a user clicks "Mark as Done" **Then** the task status changes to "Done" immediately with visual feedback **And** when a user clicks "Edit" they are navigated to `/tasks/:id` (existing TaskDetail flow) where the existing edit dialog can be used
10. **Given** quick action buttons on a task card **When** a user clicks "Delete" **Then** a confirmation dialog appears before deletion proceeds
11. **Given** dashboard filters are set **When** the user navigates away and returns (or restarts the app) **Then** the previously selected filters are restored from localStorage
12. **Given** the codebase cleanup is applied **When** a developer reviews the code **Then** shared color constants exist in `src/lib/constants.ts` **And** dead code (unused files, dark mode artifacts, duplicate toast systems) is removed

## Tasks / Subtasks

- [ ] Task 1: Extract shared visual constants (AC: 7, 12)
  - [ ] Create `taskflow-ui/src/lib/constants.ts` with `STATUS_STYLES` and `PRIORITY_STYLES`. Use Low=green (`bg-green-100 text-green-700 border-green-200`) per epics spec (existing code uses blue — must be corrected).
  - [ ] Refactor `taskflow-ui/src/components/TaskCard.tsx` to consume shared constants (remove local `priorityStyles`/`statusStyles` maps).
  - [ ] Refactor `taskflow-ui/src/pages/TaskDetail.tsx` to consume shared constants (remove its duplicate `priorityStyles`/`statusStyles` maps).
  - [ ] Ensure `StatusSummaryBar` and `InlineStatusSelect` consume the same constants to avoid style drift.
- [ ] Task 2: Codebase cleanup for dashboard scope (AC: 12)
  - [ ] Limit cleanup scope to story-specified items only: `App.css`, `NavLink.tsx`, dark mode artifacts, unused sidebar artifacts, and duplicate toast system. Do not perform broad deletion of unrelated shadcn primitives in this story.
  - [ ] Remove `taskflow-ui/src/App.css` if unused; verify no imports remain.
  - [ ] Remove `taskflow-ui/src/components/NavLink.tsx` if unused.
  - [ ] Remove `.dark` block in `taskflow-ui/src/index.css` and remove `darkMode` setting from `taskflow-ui/tailwind.config.ts`.
  - [ ] Remove `next-themes` dependency if unused.
  - [ ] Remove unused `taskflow-ui/src/components/ui/sidebar.tsx` usage paths and related sidebar-only CSS variables if they are no longer referenced.
  - [ ] Consolidate toast system: keep `taskflow-ui/src/components/ui/toaster.tsx`, remove Sonner usage from `taskflow-ui/src/App.tsx` and remove Sonner dependency if no longer used.
- [ ] Task 3: Build `StatusSummaryBar` (AC: 1)
  - [ ] Create `taskflow-ui/src/components/StatusSummaryBar.tsx`.
  - [ ] Derive counts from current in-memory task list (`useMemo`), no extra API call.
  - [ ] Implement toggle filter behavior: click status to set, click active status to clear.
  - [ ] Add accessibility: status chips rendered as buttons with `aria-label` and `aria-pressed`.
  - [ ] Mount in `taskflow-ui/src/pages/Index.tsx` above the task grid.
- [ ] Task 4: Dashboard filters, sort, and persistence (AC: 2, 3, 4, 11)
  - [ ] Keep filtering/sorting client-side on loaded tasks (instant local operations).
  - [ ] Add/confirm dropdown filters in `taskflow-ui/src/pages/Index.tsx`: Status, Priority, Assignee.
  - [ ] Preserve assignee semantics: options include `All`, `Unassigned`, and active members only (reuse `getActiveAssigneeMembers()` behavior).
  - [ ] Add GEAR ID prefix filter input (starts-with match). Extend `DashboardQuery` in `taskflow-ui/src/lib/dashboard/tasks.ts` with a `gearIdFilter` field and add starts-with logic in `filterAndSortDashboardTasks()` (existing search uses substring `.includes()` — GEAR ID filter must use `.startsWith()`).
  - [ ] Replace sort options with: Recently Updated, Recently Created, Priority. Remove existing "Status" sort option (not in epics spec). Update `DashboardSort` type in `taskflow-ui/src/lib/dashboard/tasks.ts` accordingly: add `'created'`, remove `'status'`.
  - [ ] Persist filter state in `localStorage` key `taskflow-dashboard-filters` and restore on mount.
  - [ ] Add defensive restore logic: if persisted filter JSON is invalid/malformed, fall back to defaults and clear the bad value.
  - [ ] Add "Clear Filters" action that resets defaults and clears persisted filter state.
- [ ] Task 5: Search behavior (AC: 5)
  - [ ] Keep search in `taskflow-ui/src/pages/Index.tsx` with 300ms debounce.
  - [ ] Apply debounced search to title/description/GEAR ID case-insensitive matching.
  - [ ] Keep search and filters AND-combined.
- [ ] Task 6: `TaskCard` + `InlineStatusSelect` + quick actions (AC: 6, 7, 8, 9, 10)
  - [ ] Ensure blocked cards show high-contrast warning treatment and visible blocking reason.
  - [ ] If blocked reason text is truncated for card layout, keep full reason accessible via `title` or tooltip.
  - [ ] Create `taskflow-ui/src/components/InlineStatusSelect.tsx`.
  - [ ] If selecting `Blocked`, require blocking reason before persisting.
  - [ ] If transitioning away from `Blocked`, send empty `blockingReason`.
  - [ ] Add quick actions on task cards: Mark as Done, Edit, Delete.
  - [ ] Define Edit behavior explicitly: Edit quick action navigates to `/tasks/:id` and uses the existing TaskDetail edit dialog (no new route in this story).
  - [ ] For all quick-action controls, prevent card click-through navigation (`event.stopPropagation()` and related guards as needed).
  - [ ] Delete action must require `AlertDialog` confirmation.
  - [ ] Implement optimistic updates with rollback on failure for status mutations.
  - [ ] Add in-flight guards (disable action controls while request is pending; block double submit).
- [ ] Task 7: Tests for Story 4.1 behaviors (AC: 1-12)
  - [ ] Add/extend tests in `taskflow-ui/src/test/` for StatusSummaryBar counts and click-to-filter toggle.
  - [ ] Add tests for AND-combined filters (status + priority + assignee + gearId prefix + search).
  - [ ] Update sort tests for new contract: `updated`, `created`, `priority`; remove dashboard/status sort expectations for Story 4.1 scope.
  - [ ] Add debounce test for 300ms search behavior.
  - [ ] Add tests for localStorage persistence and restore using `taskflow-dashboard-filters`.
  - [ ] Add test for malformed `taskflow-dashboard-filters` value in localStorage (fallback to defaults + invalid value cleared).
  - [ ] Add tests for inline status change to Blocked requiring reason.
  - [ ] Add tests for quick actions: Mark as Done optimistic success and rollback on failure.
  - [ ] Add tests that quick-action clicks do not trigger task-card navigation.
  - [ ] Add tests for Edit quick action navigation to `/tasks/:id` (existing TaskDetail edit flow).
  - [ ] Add tests for Delete confirmation and cancel path.
  - [ ] Add separate tests for in-flight guards preventing duplicate calls for inline status, Mark as Done, and Delete actions.

## Dev Notes

### Developer Context

- UI-track story. All code changes remain under `taskflow-ui/`.
- Use adapter boundary consistently: UI components/pages call `apiClient` only.
- Reuse existing dashboard filter utilities in `taskflow-ui/src/lib/dashboard/tasks.ts`; do not duplicate filtering logic.

### Technical Requirements

- **Path safety:** Prefer `taskflow-ui/src/...` paths explicitly (avoid ambiguous root `src/` path edits). For cleanup in this story, `taskflow-ui/tailwind.config.ts` and `taskflow-ui/package.json` edits are allowed when required.
- **Filtering/sorting strategy:** Keep dashboard filtering/sorting client-side on the loaded task list (`useMemo`) for instant response and NFR alignment.
- **Sort contract handling:** Implement "Recently Created" in UI/client sorting logic using `createdAt`. Do not send unsupported `sort=created` to API adapter in this story.
- **Search + filters composition:** Search, gearId prefix filter, and dropdown filters are AND-combined.
- **Assignee filter contract:** Assignee options must remain `All`, `Unassigned`, and active members only.
- **Mutation safety:** All card mutations (inline status, mark done, delete) must have in-flight guards (`disabled` and duplicate-click prevention).
- **Optimistic behavior:** Status mutation and "Mark as Done" must update UI optimistically and rollback with destructive toast on API failure.
- **Quick-action click safety:** Quick-action controls on task cards must not trigger card-level navigation (stop event propagation).
- **Blocked rules:** Changing to `Blocked` requires non-empty blocking reason before save; changing away clears reason.
- **Persistence key:** Use exactly `taskflow-dashboard-filters` for save/restore/clear flows.
- **Persistence resilience:** Handle malformed persisted filter payloads gracefully (defaults + clear invalid value).
- **Cleanup boundaries:** Restrict cleanup to story-listed targets; avoid unrelated refactors or broad component-library deletions.

### Architecture Compliance

- Keep shadcn composition pattern (Badge/Button/Select/DropdownMenu/AlertDialog/Input).
- Keep camelCase in frontend types and calls.
- No backend file changes in this story.

### Testing Requirements

- Add explicit negative tests for:
  - status mutation failure rollback,
  - mark-done failure rollback,
  - blocked transition without reason rejected,
  - duplicate click while mutation in-flight suppressed.
- Add persistence tests:
  - filters saved on change,
  - filters restored on mount,
  - clear filters removes localStorage state.
- Add behavior tests:
  - 300ms debounce for search,
  - GEAR ID prefix filtering,
  - StatusSummaryBar count accuracy and toggle behavior,
  - quick-action click does not navigate via parent card click handler,
  - Edit quick action navigates to `/tasks/:id`,
  - malformed localStorage filter payload fallback behavior,
  - sort contract updated to `updated|created|priority`,
  - Delete confirmation cancel path does not call delete API.
- Add in-flight guard tests per action:
  - InlineStatusSelect duplicate submit suppression,
  - Mark-as-Done duplicate submit suppression,
  - Delete duplicate submit suppression.
- Run targeted frontend checks before completion:
  - `cd taskflow-ui && npm test`
  - `cd taskflow-ui && npm run build`

### Definition of Done

- Story ACs 1-12 pass with tests.
- New dashboard behavior tests are present in `taskflow-ui/src/test/` and include:
  - StatusSummaryBar interactions,
  - filter + search + persistence flows,
  - quick actions (Mark as Done, Edit, Delete) including no click-through navigation.
- Cleanup scope is limited to the explicitly listed files/artifacts in this story.
- Verification commands complete successfully:
  - `cd taskflow-ui && npm test`
  - `cd taskflow-ui && npm run build`

### Project Structure Notes

- New components:
  - `taskflow-ui/src/components/StatusSummaryBar.tsx`
  - `taskflow-ui/src/components/InlineStatusSelect.tsx`
- `taskflow-ui/src/components/ui/` remains reserved for shadcn primitives.
- Shared color/status constants live in `taskflow-ui/src/lib/constants.ts`.
- Keep dashboard logic in `taskflow-ui/src/pages/Index.tsx` and `taskflow-ui/src/lib/dashboard/tasks.ts`.
- Keep edit routing unchanged in this story (use existing `/tasks/:id`; do not introduce `/tasks/:id/edit`).

### References

- [Source: _bmad-output/planning-artifacts/prd.md]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- [Source: _bmad-output/planning-artifacts/epics.md#story-41-dashboard-enhancement--statussummarybar-filters-search--quick-actions-ui---lovable]
- [Source: _bmad-output/planning-artifacts/architecture.md]

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
