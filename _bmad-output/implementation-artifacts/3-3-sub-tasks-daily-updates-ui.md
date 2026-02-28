# Story 3.3: Sub-Tasks & Daily Updates UI

Status: ready-for-dev

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

- [ ] Task 1: Update API types, interface, and mock adapter (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [ ] 1.1 Add `position: number` to `SubTask` in `src/lib/api/types.ts`.
  - [ ] 1.2 Add `editSubTask(taskId: string, subTaskId: string, data: { title: string }): Promise<SubTask>` and `reorderSubTasks(taskId: string, subTaskIds: string[]): Promise<SubTask[]>` to the `ApiClient` interface in `src/lib/api/client.ts`.
  - [ ] 1.3 Implement `editSubTask` in `src/lib/api/adapters/mock.ts`: validate title 1–200 chars (use `MAX_SUBTASK_TITLE_LENGTH` from `constants.ts`), trim whitespace, reject empty, update task `updatedAt`.
  - [ ] 1.4 Implement `reorderSubTasks` in `src/lib/api/adapters/mock.ts`: accept full ordered `subTaskIds` array, reassign `position` values (0-indexed), update task `updatedAt`, return all sub-tasks in new order.
  - [ ] 1.5 Align sub-task method contracts in `src/lib/api/client.ts` and `src/lib/api/adapters/mock.ts` with `API_CONTRACT.md`: `toggleSubTask` returns updated `SubTask`; `deleteSubTask` remains `Promise<void>` (`204 No Content` semantics); all returned sub-task objects include `position`.
  - [ ] 1.6 Verify existing `addDailyUpdate`, `editDailyUpdate`, `deleteDailyUpdate` mock methods correctly enforce 24h window and resolve `authorName`.
- [ ] Task 2: Install drag-and-drop library (AC: #5)
  - [ ] 2.1 Run `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` in ``.
- [ ] Task 3: Build Sub-Tasks UI — extract `SubTaskList` component (AC: #1, #2, #3, #4, #5)
  - [ ] 3.1 Create `src/components/SubTaskList.tsx` extracted from `src/pages/TaskDetail.tsx`.
  - [ ] 3.2 Render completion progress text ("X/Y completed") with `<Progress>` bar.
  - [ ] 3.3 Sub-task list: each row has drag handle (`GripVertical` icon), `<Checkbox>`, inline-editable title, delete button (hover-to-reveal).
  - [ ] 3.4 Inline title editing: click title text → convert to `<Input>` → save on Enter/blur, cancel on Escape. Validate 1–200 chars, trim whitespace, reject empty. Call `apiClient.editSubTask()`.
  - [ ] 3.5 Drag-and-drop reorder: wrap list in `<DndContext>` + `<SortableContext>` from `@dnd-kit/sortable`. Each sub-task row uses `useSortable`. On `onDragEnd`, compute new order and call `apiClient.reorderSubTasks(taskId, orderedIds)`.
  - [ ] 3.6 Optimistic toggle: on checkbox click, immediately flip `completed` state in local state and update progress count, then call `apiClient.toggleSubTask()`. Revert on error.
  - [ ] 3.7 "Add sub-task" input at bottom: Enter key or button to submit. Show `toast({ variant: "destructive" })` with error message if max 20 limit reached.
  - [ ] 3.8 Keyboard-accessible drag-and-drop (enabled by default with `@dnd-kit`).
- [ ] Task 4: Build Daily Updates UI — extract `DailyUpdateFeed` component (AC: #6, #7, #8, #9, #10)
  - [ ] 4.1 Create `src/components/DailyUpdateFeed.tsx` extracted from `src/pages/TaskDetail.tsx`.
  - [ ] 4.2 Display reverse chronological feed: each update shows author name, `formatRelativeDate(createdAt)` timestamp, content text, and `"(edited)"` badge when `edited === true`.
  - [ ] 4.3 For updates where `isWithin24Hours(createdAt)` is true: show Edit and Delete buttons on hover (`opacity-0 group-hover:opacity-100`).
  - [ ] 4.4 For updates where `isWithin24Hours(createdAt)` is false: hide Edit/Delete buttons entirely, and show a `<Tooltip>` from shadcn/ui wrapping a small `<span className="text-xs text-muted-foreground italic">Past edit window</span>` label.
  - [ ] 4.5 "Add Update" dialog: author `<Select>` dropdown populated from `members` prop (parent still loads via `apiClient.getMembers()`, active members only), content `<Textarea>` (max 1000 chars). Pre-select last-used author from `localStorage` key `taskflow-last-author` (existing key; do not rename). Save selected author to localStorage on submit.
  - [ ] 4.6 Edit flow: inline textarea replaces content, save calls `apiClient.editDailyUpdate()`, sets `"(edited)"` indicator. Handle 403 response gracefully (show destructive toast with error message).
  - [ ] 4.7 Delete flow: `<AlertDialog>` confirmation, then `apiClient.deleteDailyUpdate()`. Handle 403 response gracefully.
- [ ] Task 5: Wire up components in `TaskDetail.tsx`
  - [ ] 5.1 Replace inline sub-task and daily update sections in `src/pages/TaskDetail.tsx` with `<SubTaskList>` and `<DailyUpdateFeed>` components.
  - [ ] 5.2 Pass task data, active members, and `load()` refetch callback as props. Continue using existing `apiClient` + `useEffect` + manual `load()` pattern (consistent with Story 2.2 — TanStack Query migration is deferred to a separate story).
  - [ ] 5.3 All mutations call `load()` after success to refresh parent task data (including `updatedAt`).
- [ ] Task 6: Add/Update frontend tests for Story 3.3 behavior (AC: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10)
  - [ ] 6.1 Update existing TaskDetail tests to pass after extraction while preserving current behavior and selectors (`taskflow-last-author`, `data-testid="add-subtask-btn"`, `data-testid="delete-subtask-{id}"`, existing confirm-delete test IDs).
  - [ ] 6.2 Add tests for sub-task inline edit and drag reorder flows (including optimistic path + error path rollback).
  - [ ] 6.3 Add tests for daily update 24h gating UI (`Past edit window` indicator), edit/delete 403 error toasts, and newest-first rendering.
  - [ ] 6.4 Run targeted frontend tests for touched flows before marking story complete.

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

### Debug Log References

### Completion Notes List

### File List
