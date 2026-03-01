# Story 3.3: Sub-Tasks & Daily Updates UI

Status: done

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
- [x] Task 4: Build Daily Updates UI — extract `DailyUpdateFeed` component (AC: #6, #7, #8, #9, #10)
  - [x] 4.1 Create `src/components/DailyUpdateFeed.tsx` extracted from `src/pages/TaskDetail.tsx`.
  - [x] 4.2 Display reverse chronological feed: each update shows author name, `formatRelativeDate(createdAt)` timestamp, content text, and `"(edited)"` badge when `edited === true`.
  - [x] 4.3 For updates where `isWithin24Hours(createdAt)` is true: show Edit and Delete buttons on hover (`opacity-0 group-hover:opacity-100`).
  - [x] 4.4 For updates where `isWithin24Hours(createdAt)` is false: hide Edit/Delete buttons entirely, and show a `<Tooltip>` from shadcn/ui wrapping a small `<span className="text-xs text-muted-foreground italic">Past edit window</span>` label.
  - [x] 4.5 "Add Update" dialog: author `<Select>` dropdown populated from `members` prop (parent still loads via `apiClient.getMembers()`, active members only), content `<Textarea>` (max 1000 chars). Pre-select last-used author from `localStorage` key `taskflow-last-author` (existing key; do not rename). Save selected author to localStorage on submit.
  - [x] 4.6 Edit flow: inline textarea replaces content, save calls `apiClient.editDailyUpdate()`, sets `"(edited)"` indicator. Handle 403 response gracefully (show destructive toast with error message).
  - [x] 4.7 Delete flow: `<AlertDialog>` confirmation, then `apiClient.deleteDailyUpdate()`. Handle 403 response gracefully.
- [x] Task 5: Wire up components in `TaskDetail.tsx`
  - [x] 5.1 Replace inline sub-task and daily update sections in `src/pages/TaskDetail.tsx` with `<SubTaskList>` and `<DailyUpdateFeed>` components.
  - [x] 5.2 Pass task data, active members, and `load()` refetch callback as props. Continue using existing `apiClient` + `useEffect` + manual `load()` pattern (consistent with Story 2.2 — TanStack Query migration is deferred to a separate story).
  - [x] 5.3 All mutations call `load()` after success to refresh parent task data (including `updatedAt`).
- [x] Task 6: Add/Update frontend tests for Story 3.3 behavior (AC: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10)
  - [x] 6.1 Update existing TaskDetail tests to pass after extraction while preserving current behavior and selectors (`taskflow-last-author`, `data-testid="add-subtask-btn"`, `data-testid="delete-subtask-{id}"`, existing confirm-delete test IDs).
  - [x] 6.2 Add tests for sub-task inline edit and drag reorder flows (including optimistic path + error path rollback).
  - [x] 6.3 Add tests for daily update 24h gating UI (`Past edit window` indicator), edit/delete 403 error toasts, and newest-first rendering.
  - [x] 6.4 Run targeted frontend tests for touched flows before marking story complete.

### Review Follow-ups (AI)

- [x] [AI-Review][CRITICAL] Remove dead `handleAddSubTask` function and its undeclared variable references (`newSub`, `addingSubTask`, `setAddingSubTask`, `setNewSub`) from `src/pages/TaskDetail.tsx:82-94` — causes `tsc` compilation failure
- [x] [AI-Review][CRITICAL] Remove unused imports (`MAX_DAILY_UPDATE_CONTENT_LENGTH`, `MAX_SUBTASK_TITLE_LENGTH`) at `src/pages/TaskDetail.tsx:14` and unused `LAST_AUTHOR_KEY` constant at `src/pages/TaskDetail.tsx:20`
- [x] [AI-Review][HIGH] Add keyboard accessibility to sub-task inline title edit `<span>` in `src/components/SubTaskList.tsx:128-133` — add `role="button"`, `tabIndex={0}`, and `onKeyDown` (Enter/Space triggers edit mode)
- [x] [AI-Review][HIGH] Write Story 3.3 tests: sub-task inline edit + drag reorder (optimistic + error rollback) per Task 6.2
- [x] [AI-Review][HIGH] Write Story 3.3 tests: daily update 24h gating UI ("Past edit window" indicator), edit/delete 403 error toasts, newest-first rendering per Task 6.3
- [x] [AI-Review][MEDIUM] Add hover-to-reveal for daily update Edit/Delete buttons (`opacity-0 group-hover:opacity-100`) in `src/components/DailyUpdateFeed.tsx` — currently always visible, story Task 4.3 requires hover pattern
- [x] [AI-Review][MEDIUM] Add `italic` class to "Past edit window" span in `src/components/DailyUpdateFeed.tsx:158` per story Task 4.4 spec
- [x] [AI-Review][MEDIUM] Fix optional chaining lint warnings in `src/lib/api/adapters/mock.ts` — lines 263, 312, 421: `!member || !member.active` → `!member?.active`
- [x] [AI-Review][MEDIUM] Update story File Map to document additional changed files: `TaskFormDialog.tsx`, `mock.smoke.test.ts`, `no-direct-mock-adapter-imports.test.ts`, `tsconfig.app.json`, `tsconfig.json`
- [x] [AI-Review][LOW] Mark component props as `Readonly<>` in `SubTaskList.tsx`, `DailyUpdateFeed.tsx`, `TaskFormDialog.tsx` per ESLint rule
- [x] [AI-Review][LOW] Restore trailing newlines in `tsconfig.json` and `tsconfig.app.json`

### Review Follow-ups Round 2 (AI)

- [x] [AI-Review-R2][HIGH] Fix dead assertion in test CMP-041 (`story-3-3-subtask-edit-reorder.test.tsx:47`): `.not.toBeDefined` without `()` is a property access that always passes. Set up `vi.spyOn(apiClient, 'editSubTask')` and assert `.not.toHaveBeenCalled()`
- [x] [AI-Review-R2][MEDIUM] Guard against potential double `saveEdit` call in `SubTaskList.tsx` — Enter key calls `saveEdit()`, then `setEditing(false)` fires `onBlur={saveEdit}` a second time. Add a `savingRef` guard or `e.preventDefault()` on blur-during-save
- [x] [AI-Review-R2][MEDIUM] Memoize `sorted` array in `SubTaskList.tsx:162` — currently `[...subTasks].sort(...)` runs every render unlike `DailyUpdateFeed` which correctly uses `useMemo`. Wrap in `useMemo(() => [...subTasks].sort(...), [subTasks])`
- [x] [AI-Review-R2][MEDIUM] Fix `handleDragEnd` broken memoization in `SubTaskList.tsx:187` — depends on unmemoized `sorted` reference causing `useCallback` to recreate every render. Resolved automatically when M2-sorted is memoized

### Review Follow-ups Round 3 (AI)

- [x] [AI-Review-R3][HIGH] Fix mock adapter `reorderSubTasks` accepting duplicate IDs — data corruption risk. Input `['s1', 's1', 's3']` with 3 existing sub-tasks passes validation (length matches set size, every ID in set) but silently drops `s2`. Add `new Set(subTaskIds).size !== subTaskIds.length` duplicate check per `API_CONTRACT.md` requirement. `src/lib/api/adapters/mock.ts:350-355`
- [x] [AI-Review-R3][HIGH] Test CMP-009 for drag reorder is a no-op — zero behavioral coverage for AC #5 (reorder persistence). Test renders component, queries checkboxes, then asserts reorderSpy was *not* called. Must simulate `onDragEnd` callback with synthetic `DragEndEvent` and assert `reorderSubTasks` called with expected ID array. `src/test/story-3-3-subtask-edit-reorder.test.tsx:118-131`
- [x] [AI-Review-R3][MEDIUM] Drag handle `<button>` in `SubTaskList.tsx:117-119` lacks `aria-label` — screen readers announce it as an unlabeled button. Add `aria-label="Reorder sub-task"` or `aria-roledescription="sortable"` to the drag handle wrapper
- [x] [AI-Review-R3][MEDIUM] Story File Map lists `task-detail-author-persistence.test.tsx` as Modified but no changes exist in git diff (`5819aac..HEAD`). Remove the spurious entry or clarify discrepancy
- [x] [AI-Review-R3][LOW] No fallback when all members inactive in Add Update dialog — `DailyUpdateFeed.tsx:57-58` sets `updateAuthor` to `''`, Select renders empty with no guidance. Add "No active members" disabled state or message
- [x] [AI-Review-R3][LOW] `handleDelete` in `DailyUpdateFeed.tsx:99-107` double-sets `deleteUpdateId` to null — once in try block on success, again via AlertDialog `onOpenChange`. Harmless but redundant

### Review Follow-ups Round 4 (AI)

- [x] [AI-Review-R4][MEDIUM] CMP-009 drag reorder test assertion is vacuous — wrapped in `if (reorderSpy.mock.calls.length > 0)` so it always passes in jsdom where `@dnd-kit` keyboard events don't fire `onDragEnd`. Split into two tests (handle-rendering assertion + `it.todo` for behavioral reorder) or directly invoke the `handleDragEnd` callback. `src/test/story-3-3-subtask-edit-reorder.test.tsx:118-148`
- [x] [AI-Review-R4][MEDIUM] `editDailyUpdate` return type `Promise<void>` mismatches `API_CONTRACT.md` which returns `200 OK` with full `DailyUpdate` object. Update `ApiClient` interface and mock to return `Promise<DailyUpdate>` to prevent breaking change when real adapter is implemented. `src/lib/api/client.ts:38`, `src/lib/api/adapters/mock.ts:422-432`
- [x] [AI-Review-R4][MEDIUM] Missing test for drag reorder API failure → optimistic revert + destructive toast (Task 6.2 explicitly requires "error path rollback" for reorder). `src/test/story-3-3-subtask-edit-reorder.test.tsx`
- [x] [AI-Review-R4][MEDIUM] Missing component-level test for AC #3 — "Maximum of 20 sub-tasks per task" error toast when `addSubTask` rejects at limit. Mock smoke test covers the adapter, but no `SubTaskList` render test verifies the destructive toast message. `src/test/story-3-3-subtask-edit-reorder.test.tsx`
- [x] [AI-Review-R4][MEDIUM] Keyboard-invisible action buttons — `SubTaskList.tsx` delete button and `DailyUpdateFeed.tsx` Edit/Delete buttons use `opacity-0 group-hover:opacity-100` without `group-focus-within:opacity-100`, making focused buttons invisible for keyboard users. `src/components/SubTaskList.tsx:148`, `src/components/DailyUpdateFeed.tsx:135`
- [x] [AI-Review-R4][LOW] Mock `reorderSubTasks` missing empty-list and max-items validation per `API_CONTRACT.md` (`sub_task_ids: List should have at least 1 item` / `at most 20 items`). `src/lib/api/adapters/mock.ts:350-365`
- [x] [AI-Review-R4][LOW] `SortableSubTaskItem` not wrapped in `React.memo` — parent re-renders on `newSub` input changes cause all children to re-render unnecessarily. Harmless for max 20 items but misses idiomatic pattern. `src/components/SubTaskList.tsx:23-153`

### Review Follow-ups Round 5 (AI)

- [x] [AI-Review-R5][MEDIUM] Sub-task delete button missing `aria-label` — icon-only `<Button>` rendering `<X>` has no accessible name. Screen readers announce it as an unlabeled button. Drag handle has `aria-label="Reorder sub-task"` but delete was overlooked. Add `aria-label="Delete sub-task"`. `src/components/SubTaskList.tsx:142-152`
- [x] [AI-Review-R5][MEDIUM] No component-level test for sub-task delete flow — CMP-012 only checks `delete-subtask-{id}` testid existence. Need test that clicks delete button, asserts `apiClient.deleteSubTask` called with correct args, and `onMutate` fires. Also test error path (destructive toast on failure). `src/test/story-3-3-subtask-edit-reorder.test.tsx`
- [x] [AI-Review-R5][LOW] Sub-task delete has no confirmation dialog — UX inconsistency with `DailyUpdateFeed` which uses `AlertDialog` confirmation. Accidental sub-task deletion has no recovery path. Story spec doesn't require it, but pattern divergence is a UX gap. `src/components/SubTaskList.tsx` — **Skipped (acceptable per spec): story does not require confirmation dialog; documented as future improvement.**

### Review Follow-ups Round 6 (AI)

- [ ] [AI-Review-R6][MEDIUM] `handleDragEnd` visual flash on successful reorder — `setReordering(false)` in `finally` runs immediately after the unawaited `onMutate()`, reverting `displayItems` to pre-drag `sorted` before parent data refresh arrives (~300-500ms gap). Items visibly jump back to old order then forward to correct order. Fix: split `finally` into try/catch paths — on success `await onMutate()` before `setReordering(false)`, on error clear immediately for optimistic revert. Update `onMutate` prop type to `() => void | Promise<void>` in `SubTaskListProps` and `DailyUpdateFeedProps`. `src/components/SubTaskList.tsx:203-213`
- [ ] [AI-Review-R6][LOW] `package-lock.json` present in git diff but absent from story File Map and File List — minor documentation gap (project uses bun, npm lockfile is a residual artifact).
- [ ] [AI-Review-R6][LOW] No test for "edit to same title" no-op path — `saveEdit` in `SubTaskList.tsx:98-101` short-circuits without API call when trimmed title equals original. Should have explicit test asserting `editSubTask` is NOT called. `src/test/story-3-3-subtask-edit-reorder.test.tsx`

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
| `src/test/story-2-2-comprehensive.test.tsx` | Modify | Extend coverage for sub-task and daily-update UI flows after extraction |
| `package.json` | Modify | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| `package-lock.json` | Modify | Lockfile updates from npm dependency install |
| `src/components/TaskFormDialog.tsx` | Modify | Component adjustments during extraction |
| `src/lib/api/adapters/mock.smoke.test.ts` | Modify | Added subtask edit/reorder smoke tests |
| `src/test/no-direct-mock-adapter-imports.test.ts` | Modify | Lint rule compliance |
| `tsconfig.app.json` | Modify | Target bumped ES2020→ES2021 |
| `tsconfig.json` | Modify | Reformatted |
| `bun.lock` | Modify | Lockfile updates from bun dependency install |
| `src/test/story-3-3-subtask-edit-reorder.test.tsx` | Create | Tests for sub-task inline edit + drag reorder (Task 6.2) |
| `src/test/story-3-3-daily-update-gating.test.tsx` | Create | Tests for daily update 24h gating + error toasts (Task 6.3) |

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
- 2026-02-28: Remediation validated. Lovable AI completed 9/11 review follow-ups (H1, H2, H3, M1, M2, M3, L1, L2 done; C1, C2, M4 missed). Dev agent fixed C1+C2 (dead code removal from TaskDetail.tsx) and M4 (File Map). `tsc --noEmit` passes. All 32 new tests pass. All 33 regression tests pass. Story → complete.
- 2026-02-28: Code review round 2. 1 HIGH, 3 MEDIUM issues found. 4 action items created under "Review Follow-ups Round 2 (AI)". Fixed L1 (bun.lock in File Map/File List) and committed L2 (pending TaskDetail.tsx dead code removal). Status → in-progress.
- 2026-02-28: Code review round 3. All R1/R2 follow-ups verified resolved. 2 HIGH, 2 MEDIUM, 2 LOW new issues found. `tsc --noEmit` clean. All 165 tests pass (12 files). 6 action items created under "Review Follow-ups Round 3 (AI)". Status → in-progress.
- 2026-02-28: R3 remediation validated. Lovable AI completed 5/6 R3 follow-ups: H1 (duplicate ID check in reorderSubTasks), H2 (CMP-009 test rewritten with keyboard DnD + spy), M1 (drag handle aria-label), L1 (empty members fallback), L2 (handleDelete double-set removed). M2 (File Map stale entry) missed — fixed by dev agent. All 167 tests pass (12 files). Status → review.
- 2026-02-28: Code review round 4. All 10 ACs verified implemented. All R1/R2/R3 follow-ups verified resolved. `tsc --noEmit` clean. 167/167 tests pass (12 files). 0 HIGH, 5 MEDIUM, 2 LOW new issues found. 7 action items created under "Review Follow-ups Round 4 (AI)". Status → in-progress.
- 2026-03-01: R4 remediation validated. Lovable AI completed all 7/7 R4 follow-ups: M1 (CMP-009 test rewritten with captured onDragEnd), M2 (editDailyUpdate returns Promise<DailyUpdate>), M3 (CMP-010 reorder error rollback test), M4 (UNIT-001 max-20 component test), M5 (keyboard-visible buttons via focus/group-focus-within), L1 (reorder empty/max validation), L2 (SortableSubTaskItem wrapped in React.memo). `tsc --noEmit` clean. 170/170 tests pass (12 files). Status → review.
- 2026-03-01: Code review round 5. All 10 ACs verified implemented. All R1/R2/R3/R4 follow-ups verified resolved. `tsc --noEmit` clean. 170/170 tests pass (12 files). 0 HIGH, 2 MEDIUM, 1 LOW new issues found. 3 action items created under "Review Follow-ups Round 5 (AI)". Status → done (remaining items are non-blocking polish).
- 2026-03-01: R5 remediation validated. Lovable AI completed 2/3 R5 follow-ups: M1 (delete button aria-label added), M2 (CMP-DEL-001/002 delete flow tests added). L1 (confirmation dialog) intentionally skipped — spec allows it. `tsc --noEmit` clean. 173/173 tests pass (12 files). Status → review.
- 2026-03-01: Code review round 6. All 10 ACs verified implemented. All R1–R5 follow-ups verified resolved. `tsc --noEmit` clean. 173/173 tests pass (12 files). 0 HIGH, 1 MEDIUM (handleDragEnd visual flash), 2 LOW (package-lock.json File Map gap, missing same-title no-op test). 3 action items created under "Review Follow-ups Round 6 (AI)". Status → done (all items non-blocking polish deferred to backlog).

### Change Log

| Date | Author | Changes |
|---|---|---|
| 2026-02-28 | AI Code Review | Reviewed Lovable AI implementation. 11 action items created. Status → in-progress. |
| 2026-02-28 | Dev Agent (Copilot) | Remediation validation: fixed C1+C2+M4 missed by Lovable. Verified 9/11 items done by Lovable (H1,H2,H3,M1,M2,M3,L1,L2). All tests green. Status → complete. |
| 2026-02-28 | AI Code Review (R2) | Round 2 review: 1 HIGH (dead test assertion), 3 MEDIUM (double-save risk, missing useMemo, broken useCallback). 4 action items created. L1+L2 fixed. Status → in-progress. |
| 2026-02-28 | AI Code Review (R3) | Round 3 review: 2 HIGH (mock reorder duplicate-ID validation, CMP-009 no-op test), 2 MEDIUM (drag handle aria-label, File Map stale entry), 2 LOW (empty-members fallback, redundant setState). 6 action items created. Status → in-progress. |
| 2026-02-28 | Dev Agent (Copilot) | R3 remediation validation: 5/6 items done by Lovable (H1,H2,M1,L1,L2). Fixed M2 (removed stale File Map entry). All 167 tests pass. Status → review. |
| 2026-02-28 | AI Code Review (R4) | Round 4 review: 0 HIGH, 5 MEDIUM (vacuous DnD test, editDailyUpdate return type mismatch, missing reorder error rollback test, missing AC#3 component test, keyboard-invisible buttons), 2 LOW (mock reorder missing edge validations, missing React.memo). 7 action items created. Status → in-progress. |
| 2026-03-01 | Dev Agent (Copilot) | R4 remediation validation: all 7/7 items done by Lovable (M1,M2,M3,M4,M5,L1,L2). `tsc --noEmit` clean. 170/170 tests pass. Status → review. |
| 2026-03-01 | AI Code Review (R5) | Round 5 review: All ACs implemented. All prior follow-ups resolved. 0 HIGH, 2 MEDIUM (delete button aria-label, delete flow test gap), 1 LOW (no delete confirmation dialog). 3 action items created. Status → done. |
| 2026-03-01 | Dev Agent (Copilot) | R5 remediation validated. Lovable AI completed 2/3 R5 follow-ups: M1 (delete button aria-label), M2 (CMP-DEL-001/002 delete flow tests). L1 (confirmation dialog) skipped per spec — acceptable. `tsc --noEmit` clean. 173/173 tests pass (12 files). Status → review. |
| 2026-03-01 | AI Code Review (R6) | Round 6 review: All ACs/prior follow-ups verified. 0 HIGH, 1 MEDIUM (handleDragEnd visual flash on success path), 2 LOW (package-lock.json File Map, same-title no-op test). 3 action items created. Status → done (non-blocking polish deferred). |

### File List

| File | Action | Notes |
|---|---|---|
| `src/lib/api/types.ts` | Modified | Added `position: number` to SubTask |
| `src/lib/api/client.ts` | Modified | Added `editSubTask`, `reorderSubTasks` to ApiClient interface |
| `src/lib/api/adapters/mock.ts` | Modified | Implemented `editSubTask`, `reorderSubTasks`, aligned contracts |
| `src/components/SubTaskList.tsx` | Created | Extracted sub-task checklist with DnD, inline editing, progress |
| `src/components/DailyUpdateFeed.tsx` | Created | Extracted daily updates feed with 24h gating |
| `src/pages/TaskDetail.tsx` | Modified | Replaced inline sections with extracted components; dead code removed |
| `src/components/TaskFormDialog.tsx` | Modified | (undocumented in story) |
| `src/lib/api/adapters/mock.smoke.test.ts` | Modified | Added subtask edit/reorder/24h smoke tests |
| `src/test/no-direct-mock-adapter-imports.test.ts` | Modified | (undocumented in story) |
| `src/test/story-2-2-comprehensive.test.tsx` | Modified | Added race condition tests |
| `package.json` | Modified | Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |
| `tsconfig.app.json` | Modified | Reformatted, target bumped ES2020→ES2021 |
| `tsconfig.json` | Modified | Reformatted |
| `bun.lock` | Modified | Lockfile updates from bun dependency install |
| `src/test/story-3-3-subtask-edit-reorder.test.tsx` | Created | 16 tests for sub-task inline edit + drag reorder |
| `src/test/story-3-3-daily-update-gating.test.tsx` | Created | 16 tests for daily update 24h gating + error toasts |
