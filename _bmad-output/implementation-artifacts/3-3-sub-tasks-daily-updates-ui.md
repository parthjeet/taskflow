# Story 3.3: Sub-Tasks & Daily Updates UI

Status: in-progress

<!-- Validated by validate-create-story on 2026-02-28 -->

## Story

As an engineer,
I want the task detail page to support sub-task management and daily progress updates through the adapter pattern,
So that I can break down work and log progress directly from the UI.

## Acceptance Criteria

1. **Given** a task with sub-tasks
   **When** the task detail page is loaded
   **Then** sub-tasks are displayed as a checklist with completion progress (e.g., "3/5 completed")
   **And** each sub-task has a checkbox, editable title, and delete option
2. **Given** a task with fewer than 20 sub-tasks
   **When** a user adds a new sub-task
   **Then** it appears at the bottom of the list with an unchecked checkbox
3. **Given** a task with exactly 20 sub-tasks
   **When** a user tries to add another sub-task
   **Then** an error message is shown: "Maximum of 20 sub-tasks per task"
4. **Given** a sub-task exists
   **When** a user clicks the checkbox
   **Then** the completed state toggles and the progress count updates
5. **Given** multiple sub-tasks exist
   **When** a user drags a sub-task to a new position
   **Then** the sub-tasks are reordered and the new order persists
6. **Given** a task with daily updates
   **When** the task detail page is loaded
   **Then** updates are shown newest-first with author name, timestamp, content, and "(edited)" indicator where applicable
7. **Given** a daily update created less than 24 hours ago
   **When** a user clicks edit
   **Then** they can modify the content and save it, and "(edited)" appears after save
8. **Given** a daily update created more than 24 hours ago
   **When** a user views the update
   **Then** edit and delete buttons are hidden or disabled with a "Past edit window" indicator
9. **Given** a user opens the "Add Update" dialog
   **When** the author dropdown loads
   **Then** it shows all active members and pre-selects the last-used author from localStorage
10. **Given** a user adds a daily update
    **When** the update is saved
    **Then** it appears at the top of the updates list with the resolved author name

## Tasks / Subtasks

- [x] Task 1: Update API types, interface, and mock adapter (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [x] 1.1 Add `position: number` to `SubTask` in `src/lib/api/types.ts`.
  - [x] 1.2 Add `editSubTask(taskId: string, subTaskId: string, data: { title: string }): Promise<SubTask>` and `reorderSubTasks(taskId: string, subTaskIds: string[]): Promise<SubTask[]>` to the `ApiClient` interface in `src/lib/api/client.ts`.
  - [x] 1.3 Implement `editSubTask` in `src/lib/api/adapters/mock.ts`: validate title 1–200 chars (use `MAX_SUBTASK_TITLE_LENGTH` from `constants.ts`), trim whitespace, reject empty, update task `updatedAt`.
  - [x] 1.4 Implement `reorderSubTasks` in `src/lib/api/adapters/mock.ts`: accept full ordered `subTaskIds` array, reassign `position` values (0-indexed), update task `updatedAt`, return all sub-tasks in new order.
  - [x] 1.5 Align sub-task method contracts in `src/lib/api/client.ts` and `src/lib/api/adapters/mock.ts` with `API_CONTRACT.md`: `toggleSubTask` returns updated `SubTask`; `deleteSubTask` remains `Promise<void>` (`204 No Content` semantics); all returned sub-task objects include `position`.
  - [x] 1.6 Verify existing `addDailyUpdate`, `editDailyUpdate`, `deleteDailyUpdate` mock methods correctly enforce 24h window and resolve `authorName`.
- [x] Task 2: Install drag-and-drop library (AC: #5)
  - [x] 2.1 Run `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` in ``.
- [x] Task 3: Build Sub-Tasks UI — extract `SubTaskList` component (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Create `src/components/SubTaskList.tsx` extracted from `src/pages/TaskDetail.tsx`.
  - [x] 3.2 Render completion progress text ("X/Y completed") with `<Progress>` bar.
  - [x] 3.3 Sub-task list: each row has drag handle (`GripVertical` icon), `<Checkbox>`, inline-editable title, delete button (hover-to-reveal).
  - [x] 3.4 Inline title editing: click title text → convert to `<Input>` → save on Enter/blur, cancel on Escape. Validate 1–200 chars, trim whitespace, reject empty. Call `apiClient.editSubTask()`.
  - [x] 3.5 Drag-and-drop reorder: wrap list in `<DndContext>` + `<SortableContext>` from `@dnd-kit/sortable`. Each sub-task row uses `useSortable`. On `onDragEnd`, compute new order and call `apiClient.reorderSubTasks(taskId, orderedIds)`.
  - [x] 3.6 Optimistic toggle: on checkbox click, immediately flip `completed` state in local state and update progress count, then call `apiClient.toggleSubTask()`. Revert on error.
  - [x] 3.7 "Add sub-task" input at bottom: Enter key or button to submit. Show `toast({ variant: "destructive" })` with error message if max 20 limit reached.
  - [x] 3.8 Keyboard-accessible drag-and-drop (enabled by default with `@dnd-kit`).
- [ ] Task 4: Build Daily Updates UI — extract `DailyUpdateFeed` component (AC: #6, #7, #8, #9, #10)
  - [x] 4.1 Create `src/components/DailyUpdateFeed.tsx` extracted from `src/pages/TaskDetail.tsx`.
  - [x] 4.2 Display reverse chronological feed: each update shows author name, `formatRelativeDate(createdAt)` timestamp, content text, and `"(edited)"` badge when `edited === true`.
  - [ ] 4.3 For updates where `isWithin24Hours(createdAt)` is true: show Edit and Delete buttons on hover (`opacity-0 group-hover:opacity-100`).
  - [ ] 4.4 For updates where `isWithin24Hours(createdAt)` is false: hide Edit/Delete buttons entirely, and show a `<Tooltip>` from shadcn/ui wrapping a small `<span className="text-xs text-muted-foreground italic">Past edit window</span>` label.
  - [x] 4.5 "Add Update" dialog: author `<Select>` dropdown populated from `members` prop (parent still loads via `apiClient.getMembers()`, active members only), content `<Textarea>` (max 1000 chars). Pre-select last-used author from `localStorage` key `taskflow-last-author` (existing key; do not rename). Save selected author to localStorage on submit.
  - [x] 4.6 Edit flow: inline textarea replaces content, save calls `apiClient.editDailyUpdate()`, sets `"(edited)"` indicator. Handle 403 response gracefully (show destructive toast with error message).
  - [x] 4.7 Delete flow: `<AlertDialog>` confirmation, then `apiClient.deleteDailyUpdate()`. Handle 403 response gracefully.
- [ ] Task 5: Wire up components in `TaskDetail.tsx`
  - [ ] 5.1 Replace inline sub-task and daily update sections in `src/pages/TaskDetail.tsx` with `<SubTaskList>` and `<DailyUpdateFeed>` components.
  - [x] 5.2 Pass task data, active members, and `load()` refetch callback as props. Continue using existing `apiClient` + `useEffect` + manual `load()` pattern (consistent with Story 2.2 — TanStack Query migration is deferred to a separate story).
  - [x] 5.3 All mutations call `load()` after success to refresh parent task data (including `updatedAt`).
- [ ] Task 6: Add/Update frontend tests for Story 3.3 behavior (AC: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10)
  - [x] 6.1 Update existing TaskDetail tests to pass after extraction while preserving current behavior and selectors (`taskflow-last-author`, `data-testid="add-subtask-btn"`, `data-testid="delete-subtask-{id}"`, existing confirm-delete test IDs).
  - [ ] 6.2 Add tests for sub-task inline edit and drag reorder flows (including optimistic path + error path rollback).
  - [ ] 6.3 Add tests for daily update 24h gating UI (`Past edit window` indicator), edit/delete 403 error toasts, and newest-first rendering.
  - [x] 6.4 Run targeted frontend tests for touched flows before marking story complete.

### Review Follow-ups (AI)

- [ ] [AI-Review][CRITICAL] Remove dead `handleAddSubTask` function and its undeclared variable references (`newSub`, `addingSubTask`, `setAddingSubTask`, `setNewSub`) from `src/pages/TaskDetail.tsx:82-94` — causes `tsc` compilation failure
- [ ] [AI-Review][CRITICAL] Remove unused imports (`MAX_DAILY_UPDATE_CONTENT_LENGTH`, `MAX_SUBTASK_TITLE_LENGTH`) at `src/pages/TaskDetail.tsx:14` and unused `LAST_AUTHOR_KEY` constant at `src/pages/TaskDetail.tsx:20`
- [ ] [AI-Review][HIGH] Add keyboard accessibility to sub-task inline title edit `<span>` in `src/components/SubTaskList.tsx:128-133` — add `role="button"`, `tabIndex={0}`, and `onKeyDown` (Enter/Space triggers edit mode)
- [ ] [AI-Review][HIGH] Write Story 3.3 tests: sub-task inline edit + drag reorder (optimistic + error rollback) per Task 6.2
- [ ] [AI-Review][HIGH] Write Story 3.3 tests: daily update 24h gating UI ("Past edit window" indicator), edit/delete 403 error toasts, newest-first rendering per Task 6.3
- [ ] [AI-Review][MEDIUM] Add hover-to-reveal for daily update Edit/Delete buttons (`opacity-0 group-hover:opacity-100`) in `src/components/DailyUpdateFeed.tsx` — currently always visible, story Task 4.3 requires hover pattern
- [ ] [AI-Review][MEDIUM] Add `italic` class to "Past edit window" span in `src/components/DailyUpdateFeed.tsx:158` per story Task 4.4 spec
- [ ] [AI-Review][MEDIUM] Fix optional chaining lint warnings in `src/lib/api/adapters/mock.ts` — lines 263, 312, 421: `!member || !member.active` → `!member?.active`
- [ ] [AI-Review][MEDIUM] Update story File Map to document additional changed files: `TaskFormDialog.tsx`, `mock.smoke.test.ts`, `no-direct-mock-adapter-imports.test.ts`, `tsconfig.app.json`, `tsconfig.json`
- [ ] [AI-Review][LOW] Mark component props as `Readonly<>` in `SubTaskList.tsx`, `DailyUpdateFeed.tsx`, `TaskFormDialog.tsx` per ESLint rule
- [ ] [AI-Review][LOW] Restore trailing newlines in `tsconfig.json` and `tsconfig.app.json`

## Dev Notes

- **Anti-Patterns (DO NOT):**
  - Do NOT use `react-beautiful-dnd` — it is deprecated and unmaintained. Use `@dnd-kit/core` + `@dnd-kit/sortable`.
  - Do NOT add direct `fetch()` or `axios` calls — use `apiClient` from `@/lib/api` exclusively.
  - Do NOT create or modify a real adapter in this story (`src/lib/api/adapters/` currently uses mock only).
  - Do NOT migrate to TanStack Query hooks in this story. Continue using the existing `apiClient` + `useEffect` + manual `load()` pattern established in Story 2.2. TanStack Query migration is explicitly deferred.
  - Do NOT use `PUT` for partial updates — the API uses `PATCH` for edits, `PUT` only for reorder.
- **Architectural Rules:**
  - All changes inside ``. No backend changes.
  - Use repository-root paths with explicit `` prefix in all edits to avoid touching the wrong `src/` tree.
  - Use camelCase consistently in TypeScript (snake_case conversion only in `real.ts` adapter).
  - All interactions must respond within 200ms (NFR3) — use optimistic updates for toggle and reorder.
  - Preserve existing localStorage author persistence key: `taskflow-last-author` (introduced in Story 2.2).
- **Error Handling Pattern:**
  - All `apiClient` calls that can fail (add sub-task at limit, edit/delete past 24h) must be wrapped in try/catch.
  - Extract the error message: `const msg = err instanceof Error ? err.message : "An error occurred"`.
  - Display via `toast({ variant: "destructive", title: "Error", description: msg })`.
  - The mock adapter throws `Error("Maximum of 20 sub-tasks per task")` and `Error("Updates can only be edited within 24 hours.")` etc.
- **Dependencies:**
  - Install: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (for `CSS` transform utility).
  - Existing: `shadcn/ui` components (Dialog, Input, Checkbox, Tooltip, AlertDialog, Select, Textarea, Progress, Badge).
  - Existing: `date-fns` via `src/lib/date-utils.ts` — `formatRelativeDate()` and `isWithin24Hours()`.
  - Existing: `src/lib/api/constants.ts` — `MAX_SUBTASK_TITLE_LENGTH` (200), `MAX_DAILY_UPDATE_CONTENT_LENGTH` (1000).
- **Inline Title Editing UX:**
  - Click on sub-task title text → replace `<span>` with `<Input>` pre-filled with current title.
  - Enter key or blur → save (call `apiClient.editSubTask()`). Escape → cancel, revert to original title.
  - Validate: trim whitespace, reject empty, enforce 1–200 chars. Show toast on validation failure.
  - Save-on-blur pattern (no debounce needed since it's discrete save, not continuous).
- **Drag-and-Drop Implementation:**
  - Use `@dnd-kit/sortable` with `verticalListSortingStrategy`.
  - Each sub-task row: `useSortable({ id: subTask.id })`. Drag handle uses `GripVertical` icon from `lucide-react`.
  - `onDragEnd` handler: compute new ordered array of sub-task IDs, call `apiClient.reorderSubTasks(taskId, orderedIds)`.
  - Optimistic reorder: update local state immediately, revert on API error.
  - `@dnd-kit` provides keyboard accessibility (Arrow keys + Space) by default — no extra config needed.
- **Component Extraction:**
  - `TaskDetail.tsx` is currently 428 lines. Extract `SubTaskList` and `DailyUpdateFeed` to keep each component under 200 lines.
  - Props for `SubTaskList`: `taskId: string`, `subTasks: SubTask[]`, `onMutate: () => void` (calls parent `load()`).
  - Props for `DailyUpdateFeed`: `taskId: string`, `dailyUpdates: DailyUpdate[]`, `members: TeamMember[]`, `onMutate: () => void`.
- **Seed Data:**
  - Ensure at least one mock task has 3+ sub-tasks for meaningful drag-and-drop testing.
- **Regression Guardrails:**
  - Preserve existing user-visible strings where tests already rely on them (`"No updates yet."`, `"Maximum of 20 sub-tasks per task"`, `"(edited)"`, `"Past edit window"`).
  - Preserve existing critical test IDs in `TaskDetail` flows while extracting components: `add-subtask-btn`, `delete-subtask-{id}`, `confirm-delete-update`, `confirm-delete-task`.

### File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/api/types.ts` | Modify | Add `position: number` to `SubTask` interface |
| `src/lib/api/client.ts` | Modify | Add `editSubTask`, `reorderSubTasks`; align `toggleSubTask` return type with API contract |
| `src/lib/api/adapters/mock.ts` | Modify | Implement `editSubTask`, `reorderSubTasks`; return `position`; align toggle/delete contract behavior |
| `src/components/SubTaskList.tsx` | Create | Extracted sub-task checklist with DnD, inline editing, progress |
| `src/components/DailyUpdateFeed.tsx` | Create | Extracted daily updates feed with 24h gating, "Past edit window" indicator |
| `src/pages/TaskDetail.tsx` | Modify | Replace inline sections with extracted components |
| `src/test/task-detail-author-persistence.test.tsx` | Modify | Keep author persistence and extraction regressions covered |
| `src/test/story-2-2-comprehensive.test.tsx` | Modify | Extend coverage for sub-task and daily-update UI flows after extraction |
| `package.json` | Modify | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| `package-lock.json` | Modify | Lockfile updates from npm dependency install |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.3-Sub-Tasks-Daily-Updates-UI]
- [Source: API_CONTRACT.md]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, API Naming, Data Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Task Detail Page, Sub-Tasks, Daily Updates]
- [Source: _bmad-output/implementation-artifacts/2-2-task-detail-page-with-adapter-pattern.md — established `taskflow-last-author` localStorage contract and existing TaskDetail test hooks]
- [Source: _bmad-output/implementation-artifacts/3-1-sub-task-management-api.md — Backend endpoints & patterns]
- [Source: _bmad-output/implementation-artifacts/3-2-daily-update-management-api.md — Backend endpoints & patterns]

## Dev Agent Record

### Agent Model Used

Lovable AI (implementation), GitHub Copilot / Claude Opus 4.6 (code review)

### Debug Log References

### Completion Notes List

- 2026-02-28: Code review completed. All 10 ACs functionally implemented. 2 CRITICAL, 3 HIGH, 4 MEDIUM, 2 LOW issues found. Action items created under "Review Follow-ups (AI)". Story status set to in-progress pending fixes.
- Key blockers: dead code in TaskDetail.tsx causes `tsc` compilation failure (C1, C2); missing test coverage for 3.3-specific UI flows (H2); sub-task title edit not keyboard-accessible (H1).

### Change Log

| Date | Author | Changes |
|---|---|---|
| 2026-02-28 | AI Code Review | Reviewed Lovable AI implementation. 11 action items created. Status → in-progress. |

### File List

| File | Action | Notes |
|---|---|---|
| `src/lib/api/types.ts` | Modified | Added `position: number` to SubTask |
| `src/lib/api/client.ts` | Modified | Added `editSubTask`, `reorderSubTasks` to ApiClient interface |
| `src/lib/api/adapters/mock.ts` | Modified | Implemented `editSubTask`, `reorderSubTasks`, aligned contracts |
| `src/components/SubTaskList.tsx` | Created | Extracted sub-task checklist with DnD, inline editing, progress |
| `src/components/DailyUpdateFeed.tsx` | Created | Extracted daily updates feed with 24h gating |
| `src/pages/TaskDetail.tsx` | Modified | Replaced inline sections with extracted components (has dead code) |
| `src/components/TaskFormDialog.tsx` | Modified | (undocumented in story) |
| `src/lib/api/adapters/mock.smoke.test.ts` | Modified | Added subtask edit/reorder/24h smoke tests |
| `src/test/no-direct-mock-adapter-imports.test.ts` | Modified | (undocumented in story) |
| `src/test/story-2-2-comprehensive.test.tsx` | Modified | Added race condition tests |
| `package.json` | Modified | Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |
| `tsconfig.app.json` | Modified | Reformatted, target bumped ES2020→ES2021 |
| `tsconfig.json` | Modified | Reformatted |
