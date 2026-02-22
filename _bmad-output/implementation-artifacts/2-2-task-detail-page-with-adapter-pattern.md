# Story 2.2: Task Detail Page with Adapter Pattern

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the task detail page and task creation/edit forms to work correctly through the new adapter pattern,
so that all task management features function properly with the refactored API layer.

## Acceptance Criteria

1. **Given** the adapter pattern from Story 1.4 is in place
   **When** a user creates, views, edits, or deletes tasks
   **Then** all operations go through `apiClient` methods from the adapter layer
   **And** no component directly imports from the old `mock-api.ts`

2. **Given** a user creates a task with status "Blocked"
   **When** they leave the blocking reason empty
   **Then** validation prevents submission and shows an error

3. **Given** a user edits a task and changes status away from "Blocked"
   **When** the update is saved
   **Then** the blocking reason is automatically cleared

4. **Given** a user is filling out a task form
   **When** an API error occurs during save
   **Then** the form retains all entered data (no form clearing on error)

5. **Given** the mock adapter handles task operations
   **When** filtering, sorting, or searching is applied
   **Then** all query parameters work correctly matching the API_CONTRACT.md specification

6. **Given** a user updates a task and changes the assignee
   **When** the update is saved
   **Then** the `assigneeName` is automatically resolved from the members list
   **And** if `assigneeId` is set to null, `assigneeName` is also set to null

7. **Given** a task already has 20 sub-tasks
   **When** a user attempts to add another sub-task
   **Then** an error is thrown with message "Maximum of 20 sub-tasks per task"
   **And** no sub-task is added

8. **Given** a user opens the "Add Update" dialog
   **When** the author dropdown loads
   **Then** the last-selected author ID is restored from `localStorage` key `taskflow-last-author`
   **And** after saving an update, the selected author ID is persisted to `localStorage`

## Tasks / Subtasks

- [x] Fix `updateTask` in mock adapter to re-resolve `assigneeName` (AC: 6)
  - [x] When `data.assigneeId` is explicitly set (including to `null`), look up the member by ID from `getMembers()`
  - [x] If `assigneeId` is a valid member ID → set `assigneeName = member.name`
  - [x] If `assigneeId` is `null` → set `assigneeName = null`
  - [x] If `assigneeId` is not present in `data` (not being changed) → keep existing `assigneeName`

- [x] Fix `addSubTask` in mock adapter to enforce max 20 limit (AC: 7)
  - [x] Before adding, check `task.subTasks.length >= 20`
  - [x] If exceeded, throw `new Error('Maximum of 20 sub-tasks per task')`

- [x] Add localStorage author persistence in `TaskDetail.tsx` "Add Update" dialog (AC: 8)
  - [x] On dialog open, read `localStorage.getItem('taskflow-last-author')` and set `updateAuthor` to that value if it exists and is a valid active member ID
  - [x] On successful "Add Update" submission, call `localStorage.setItem('taskflow-last-author', updateAuthor)` before closing dialog
  - [x] Fall back to `activeMembers[0]?.id || ''` if no stored value or stored ID is no longer in active members

- [x] Verify all existing imports and adapter usage (AC: 1)
  - [x] Confirm `TaskDetail.tsx` imports from `@/lib/api` — already done, no change needed
  - [x] Confirm `Index.tsx` imports from `@/lib/api` — already done, no change needed
  - [x] Confirm `TaskCard.tsx` uses `@/types` (which re-exports from `@/lib/api/types`) — already done
  - [x] Confirm `TaskFormDialog.tsx` uses `@/types` — already done
  - [x] Confirm old `mock-api.ts` is absent from codebase — already done

- [x] Verify `TaskFormDialog.tsx` preserves form state on error (AC: 4)
  - [x] On API error in `handleSubmit`, form state is retained (not cleared) — already works, no change needed

- [x] Run smoke test / verify existing mock behaviors (AC: 2, 3, 5)
  - [x] Create a Blocked task with no blocking reason → confirm error shown
  - [x] Update a Blocked task to In Progress → confirm blockingReason clears
  - [x] Filter tasks by status, priority, assignee, search, sort → confirm all work
- [x] Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Fix status sort order in `getTasks` — mock sorts `Blocked=0, In Progress=1, To Do=2, Done=3` but spec/backend requires `To Do=1, In Progress=2, Blocked=3, Done=4`; results diverge from real adapter [taskflow-ui/src/lib/api/adapters/mock.ts:181]
  - [x] [AI-Review][HIGH] Add try/catch error handling around both `addSubTask` calls in TaskDetail.tsx — unhandled promise rejection means the "Maximum of 20 sub-tasks" error is silently swallowed with no user feedback; wrap in try/catch and show destructive toast matching the pattern used for addDailyUpdate/editDailyUpdate [taskflow-ui/src/pages/TaskDetail.tsx:156-168]
  - [x] [AI-Review][MEDIUM] Add `mock-task-filters.test.ts` and `mock-task-gaps.test.ts` to story File List — both files were created but omitted from Dev Agent Record → File List [taskflow-ui/src/test/mock-task-filters.test.ts, taskflow-ui/src/test/mock-task-gaps.test.ts]
  - [x] [AI-Review][MEDIUM] Guard against null `description`/`gearId` in `getTasks` search — `t.description.toLowerCase()` and `t.gearId.includes(q)` throw TypeError when either field is null; both are typed as `string | null` in the API contract [taskflow-ui/src/lib/api/adapters/mock.ts:170-173]
  - [x] [AI-Review][MEDIUM] Add try/catch around `toggleSubTask` in TaskDetail.tsx — errors silently ignored; add destructive toast matching other error handlers [taskflow-ui/src/pages/TaskDetail.tsx:141-144]
  - [x] [AI-Review][MEDIUM] Add tests for AC8 fallback paths — no tests cover (a) stored author ID belonging to a deactivated member and (b) no stored author at all; both are explicit AC8 requirements [taskflow-ui/src/test/task-detail-author-persistence.test.tsx]
  - [x] [AI-Review][MEDIUM] Add `sort=status` test to `mock-task-filters.test.ts` — status sort is entirely untested, which is why the sort order bug (H1) was not caught [taskflow-ui/src/test/mock-task-filters.test.ts]
  - [x] [AI-Review][LOW] Add try/catch around `deleteSubTask` onClick in TaskDetail.tsx — success toast fires even when the API throws; wrap in try/catch [taskflow-ui/src/pages/TaskDetail.tsx:148]
  - [x] [AI-Review][LOW] Add automated lint rule or import-restriction test to prevent regressions on AC1 (no direct mock-api.ts imports) — currently verified manually only
  - [x] [AI-Review][MEDIUM] Add try/catch around `deleteTask` AlertDialogAction — unhandled promise rejection if deletion fails (network error, future real-adapter 404); show destructive toast matching the deleteSubTask and deleteDailyUpdate patterns [taskflow-ui/src/pages/TaskDetail.tsx:307-311]
  - [x] [AI-Review][MEDIUM] Mock `updateTask` silently sets `assigneeName = null` for non-existent `assigneeId` instead of throwing — diverges from backend 400 "Assignee not found"; add a throw and a test covering this path so UI error handling is exercised before the real adapter ships [taskflow-ui/src/lib/api/adapters/mock.ts:219-222]
  - [x] [AI-Review][LOW] Add secondary `updatedAt` tiebreaker to priority sort — mock sorts by priority only; backend uses `priority_order ASC, updated_at DESC`; same-priority tasks have non-deterministic order in mock [taskflow-ui/src/lib/api/adapters/mock.ts:177-180]
  - [x] [AI-Review][LOW] Add secondary `updatedAt` tiebreaker to status sort — same issue as priority sort; backend uses `status_order ASC, updated_at DESC` [taskflow-ui/src/lib/api/adapters/mock.ts:180-183]
  - [x] [AI-Review][LOW] Fix null-guard inconsistency in search test assertions — `mock-task-filters.test.ts` calls `t.description.toLowerCase()` and `t.gearId.includes()` directly without null guards, inconsistent with the null-safe fix applied in mock.ts; wrap in `(t.description ?? '')` and `(t.gearId ?? '')` [taskflow-ui/src/test/mock-task-filters.test.ts:165-168]
  - [x] [AI-Review][LOW] Use `vi.useFakeTimers()` in sub-task limit tests — real `setTimeout` delays (300–500ms × 17+ calls per test) cause 3 tests to take 7+ seconds each; fake timers reduce suite runtime from ~25s to <1s with no behavior change [taskflow-ui/src/test/mock-task-gaps.test.ts:70-118]
- [x] Review Follow-ups (AI) — Round 3
  - [x] [AI-Review][MEDIUM] Add `assigneeId` validation to `createTask` in mock — mock silently accepts any `assigneeId` without checking members list; real backend returns 400 "Assignee not found" for invalid IDs; add `getMembers().find(m => m.id === data.assigneeId)` guard to match `updateTask` behavior [taskflow-ui/src/lib/api/adapters/mock.ts:200-211]
  - [x] [AI-Review][MEDIUM] Fix `deleteTask` to throw for non-existent task IDs — currently a silent no-op (`filter` on unknown id saves unchanged list); real backend returns 404; add a length check before/after filter and throw `'Task not found'` to enable UI error handling coverage [taskflow-ui/src/lib/api/adapters/mock.ts:238-241]
  - [x] [AI-Review][LOW] Replace `gearId: ''` with `gearId: null` in seed data — empty string contradicts API contract where null represents no gear ID; real adapter will return null, causing shape mismatch with cached mock data [taskflow-ui/src/lib/api/adapters/mock.ts:100]
  - [x] [AI-Review][LOW] Strengthen fallback author test to assert `localStorage.setItem` after successful submission — "falls back to inactive member" test verifies the API call author but not that the correct ID is persisted to localStorage post-save [taskflow-ui/src/test/task-detail-author-persistence.test.tsx:127-148]
  - [x] [AI-Review][LOW] Refactor `resolveWithMockDelay` helper to a clearer pattern — helper takes an already-started promise then advances timers; non-standard idiom risks subtle ordering bugs if copied; prefer `await vi.runAllTimersAsync(); return await op` or restructure callers to use `vi.runAllTimersAsync()` inline [taskflow-ui/src/test/mock-task-gaps.test.ts:72-75]
  - [x] [AI-Review][LOW] Add test for `deleteTask` on non-existent ID — no coverage for the not-found path; becomes necessary once MEDIUM fix (deleteTask throws) is applied [taskflow-ui/src/test/mock-task-gaps.test.ts or mock-task-filters.test.ts]
- [x] Review Follow-ups (AI) — Round 4
  - [x] [AI-Review][MEDIUM] Add catch block to `load()` in TaskDetail.tsx — API failure sets loading=false but task stays null, causing the `if (loading || !task)` guard to show an infinite spinner with no error message or recovery path; add a catch block, show a destructive toast, and navigate back to `/` [taskflow-ui/src/pages/TaskDetail.tsx:45-56]
  - [x] [AI-Review][MEDIUM] `deleteSubTask` in mock adapter silently ignores unknown sub-task IDs — `filter` is a no-op for missing IDs and still writes a new `updatedAt`; add a pre/post length check and throw `'Sub-task not found'` to match backend 404 behavior and make UI error handling testable (compare: `toggleSubTask` already throws correctly for this case) [taskflow-ui/src/lib/api/adapters/mock.ts:289-296]
  - [x] [AI-Review][LOW] Remove dead `data.assigneeName` initialization in `createTask` — `let assigneeName = data.assigneeName` is always overwritten by both branches of the if/else; change to `let assigneeName: string | null` to avoid the misleading implication that the caller's provided name is used [taskflow-ui/src/lib/api/adapters/mock.ts:205]
  - [x] [AI-Review][LOW] Replace fragile positional button selector in deleteSubTask test — `buttons?.[1]` relies on shadcn Checkbox rendering as a `<button>` element (making delete the second button); if Checkbox rendering changes the test could silently click the wrong element; add a `data-testid` to the delete icon button and query by it [taskflow-ui/src/test/task-detail-author-persistence.test.tsx:247-249]
  - [x] [AI-Review][LOW] Change `gearId: ""` to `gearId: null` in `makeTask` test helper — API contract defines `gearId: string | null`; empty string diverges from the contracted null shape and is inconsistent with the Round 3 seed data fix [taskflow-ui/src/test/mock-task-filters.test.ts:29]
- [x] Review Follow-ups (AI) — Round 5
  - [x] [AI-Review][MEDIUM] Fix `TaskFormDialog` to submit `gearId: null` instead of `""` when GEAR ID is empty — `handleSubmit` sends `gearId: gearId.trim()` which is `""` when no GEAR ID is entered; API contract requires `string | null` where absence is `null`; user-created tasks end up with `gearId: ""` in storage, diverging from the `null` shape fixed in seed data (Round 3) and `makeTask` helper (Round 4); convert empty string to null before calling `onSubmit` [taskflow-ui/src/components/TaskFormDialog.tsx:80]
  - [x] [AI-Review][MEDIUM] Add active-member guard to `createTask` and `updateTask` in mock adapter — both methods validate that the `assigneeId` exists in members but do not check `member.active`; inactive members can be assigned to tasks via direct API calls; the real backend will enforce active-only assignment; add `if (!member.active) throw new Error('Assignee not found')` (or a dedicated message) after the existing member lookup in both methods, and add tests covering the inactive-assignee path [taskflow-ui/src/lib/api/adapters/mock.ts:206-212, 239-247]
  - [x] [AI-Review][LOW] Fix inline `createTask` call in "createTask assignee validation" test to use `gearId: null` — still passes `gearId: ""` which is inconsistent with the API contract fix applied to `makeTask` helper in Round 4 [taskflow-ui/src/test/mock-task-gaps.test.ts:164]
  - [x] [AI-Review][LOW] Add active-member guard to `addDailyUpdate` in mock adapter — validates author exists but not `author.active`; inactive members can be submitted as daily update authors via direct API calls; add `if (!author.active) throw new Error('Author not found')` after the existing author lookup [taskflow-ui/src/lib/api/adapters/mock.ts:309-310]
  - [x] [AI-Review][LOW] Add test for `addSubTask` error via + button click — Enter key path is covered; the `<Button onClick={handleAddSubTask}>` path calls the same function but has no test; add a test that fires `fireEvent.click` on the + button and verifies the destructive toast on mock rejection [taskflow-ui/src/test/task-detail-author-persistence.test.tsx]
  - [x] [AI-Review][LOW] Add unmount cleanup to `load()` in TaskDetail.tsx — no mounted-flag or AbortController; if the component unmounts while `Promise.all([getTask, getMembers])` is pending, state setters and `navigate` fire on the unmounted component; add a `let mounted = true` flag and guard all state updates and navigation behind `if (mounted)`, returning a cleanup function [taskflow-ui/src/pages/TaskDetail.tsx:45-58]
- [x] Review Follow-ups (AI) — Round 6
  - [x] [AI-Review][MEDIUM] Fix `gearId` type in `Task` interface and `CreateTaskData` to `string | null` — Round 3 seed and Round 5 form fixes both store/send `null` for missing gearId but the types still declare `gearId: string`; `UpdateTaskData` (derived via `Partial<Omit<Task,...>>`) therefore types gearId as `string | undefined` instead of the correct `string | null | undefined`; real-adapter developers will read these types and incorrectly assume gearId is always non-null [taskflow-ui/src/lib/api/types.ts:30, taskflow-ui/src/lib/api/client.ts:14]
  - [x] [AI-Review][MEDIUM] Add loading/disabled state to inline daily-update edit Save button — no `disabled` prop or loading indicator during the `editDailyUpdate` API call; a double-click fires concurrent requests overwriting each other silently; add an `editUpdateLoading` state (boolean) mirroring the `updateLoading` pattern used by the Add Update dialog's Add button [taskflow-ui/src/pages/TaskDetail.tsx:227]
  - [x] [AI-Review][LOW] Update `editDailyUpdate` and `deleteDailyUpdate` in mock to set `task.updatedAt` — both leave the parent task timestamp stale; `addDailyUpdate` (line 314), `toggleSubTask`, and `deleteSubTask` all call `task.updatedAt = new Date().toISOString()` but the edit and delete update paths do not; tasks with recently edited/deleted updates will not surface in sort-by-updated queries [taskflow-ui/src/lib/api/adapters/mock.ts:330, mock.ts:343]
  - [x] [AI-Review][LOW] Add `data-testid="add-subtask-btn"` to the + sub-task Button and update test selector — Round 4 added `data-testid` to the delete icon button; the add + button has no testid; current test uses the fragile `input.parentElement?.querySelector("button")` traversal which would silently target the wrong element if shadcn Input grows an internal button or JSX structure changes [taskflow-ui/src/pages/TaskDetail.tsx:196, taskflow-ui/src/test/task-detail-author-persistence.test.tsx:251]
  - [x] [AI-Review][LOW] Replace silent early return in assignee filter test with `expect` assertion — `if (!assignedTask?.assigneeId) return;` passes vacuously if no assigned tasks exist in seed data; change to `expect(assignedTask?.assigneeId).toBeTruthy()` so regressions in seed data cause a visible test failure [taskflow-ui/src/test/mock-task-filters.test.ts:157]
  - [x] [AI-Review][LOW] Strengthen gear ID search test to use a gearId that cannot appear in any title or description — searching "1024" satisfies the title/description/gearId OR condition; if gearId search broke entirely, a task matching "1024" in its title would still pass the test; create or mutate a task with a unique gearId (e.g. "7777") absent from all titles/descriptions and assert it is returned only via gearId match [taskflow-ui/src/test/mock-task-filters.test.ts:176]
- [x] Review Follow-ups (AI) — Round 7
  - [x] [AI-Review][HIGH] Fix status sort order in `Index.tsx` client-side sort — `useMemo` sort uses `Blocked=0, In Progress=1, To Do=2, Done=3` (Blocked sorts FIRST) but spec and mock.ts require `To Do=1, In Progress=2, Blocked=3, Done=4` (To Do sorts first); the Round 1 fix was applied to mock.ts but never propagated to the client-side sort; since `Index.tsx` always calls `apiClient.getTasks()` with no sort parameter, the dashboard's status sort is entirely client-side and this divergence is fully visible to users [taskflow-ui/src/pages/Index.tsx:62-63]
  - [x] [AI-Review][MEDIUM] Add null guard to `description` in client-side search in `Index.tsx` — `t.description.toLowerCase().includes(q)` has no null guard while mock.ts uses `(t.description ?? '').toLowerCase()` suggesting description can be null in practice; when the real adapter ships and returns `null` for an optional description, the dashboard search filter will throw `TypeError: Cannot read properties of null`; change to `(t.description ?? '').toLowerCase().includes(q)` [taskflow-ui/src/pages/Index.tsx:52]
  - [x] [AI-Review][MEDIUM] Add `updatedAt` desc tiebreaker to client-side priority sort in `Index.tsx` — the `useMemo` priority sort has no tiebreaker so same-priority tasks sort non-deterministically; mock.ts and the backend contract both use `updatedAt DESC` as a secondary sort; add `return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()` when priority values are equal, and add a focused test to `mock-task-filters.test.ts` that verifies client-side sort parity [taskflow-ui/src/pages/Index.tsx:59-60]
  - [x] [AI-Review][MEDIUM] Filter inactive members out of the assignee dropdown in `Index.tsx` — `members.map(...)` lists ALL members including inactive ones; filtering by an inactive member always returns zero results with no explanation; `TaskFormDialog.tsx` correctly guards with `activeMembers.filter(m => m.active)` — apply the same guard to the assignee `Select` in the dashboard filter bar [taskflow-ui/src/pages/Index.tsx:112]
  - [x] [AI-Review][MEDIUM] Exclude `assigneeName` from `UpdateTaskData` — `UpdateTaskData = Partial<Omit<Task, 'id' | 'createdAt' | 'subTasks' | 'dailyUpdates'>>` leaves `assigneeName` as a settable field; a caller passing only `{ assigneeName: 'Alice' }` (without `assigneeId`) would silently store an inconsistent name since the `'assigneeId' in data` guard does not fire; `assigneeName` is always derived from `assigneeId` and should be excluded: `Omit<Task, 'id' | 'createdAt' | 'subTasks' | 'dailyUpdates' | 'assigneeName'>` [taskflow-ui/src/lib/api/client.ts:18]
  - [x] [AI-Review][LOW] Remove stale comment in `mock-task-gaps.test.ts` — line 2 says "These tests WILL FAIL until Story 2.2 is implemented"; Story 2.2 is complete and all tests pass; the comment is misleading to future developers [taskflow-ui/src/test/mock-task-gaps.test.ts:2]
  - [x] [AI-Review][LOW] Change `description` type to `string | null` in `Task` interface — currently typed as non-nullable `string` but mock.ts defends against null with `(t.description ?? '')`; the `gearId` type was correctly fixed to `string | null` in Round 6 and `description` needs the same treatment so the type accurately reflects the API contract and `Index.tsx`'s client-side search null guard (M2 above) has type-level backing [taskflow-ui/src/lib/api/types.ts:25]
- [x] Review Follow-ups (AI) — Round 12
  - [x] [AI-Review][MEDIUM] Strengthen AC6 edge case assertion to match specific error message — `rejects.toThrow()` with no argument accepts any thrown value; a different code path throwing an unrelated error would silently satisfy the test; `mock-task-gaps.test.ts:56` correctly uses `.rejects.toThrow('Assignee not found')` for the same behavior — apply the same specificity here [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:81-82]
  - [x] [AI-Review][LOW] Remove stale "currently fails in the mock" comment — Round 1 fixed `updateTask` assigneeName re-resolution; the comment has been factually wrong for 11 review rounds and misleads developers into thinking the assertion documents a known failure when the test fully passes [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:61]
  - [x] [AI-Review][LOW] Restore `window.HTMLElement.prototype` mutations after each test in `story-2-2-comprehensive.test.tsx` — `beforeEach` replaces `scrollIntoView`, `hasPointerCapture`, and `releasePointerCapture` with `vi.fn()` stubs but no `afterEach` restores them; they persist for the lifetime of the Vitest worker; replace with `vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(vi.fn())` (and likewise for the others) so `vi.restoreAllMocks()` or `vi.clearAllMocks()` can clean them up automatically [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:37-39]
  - [x] [AI-Review][LOW] Fix misleading "race-prone paths" comment in AC7 sub-task test — the localStorage-backed mock cannot have a true race condition; JS single-threaded event loop guarantees each `setTimeout` callback runs to completion before the next, and there is no `await` between `getTasks()` read and `saveTasks()` write inside `addSubTask`; change to an accurate description such as "Add 20 sub-tasks via Promise.all to verify the 20-limit check holds regardless of call ordering" [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:96]
- [x] Review Follow-ups (AI) — Round 13
  - [x] [AI-Review][MEDIUM] Add gearId format validation to `createTask` and `updateTask` in mock adapter — both methods accept any string including invalid lengths (e.g. `"777"`, `"12345"`); the backend will enforce `/^\d{4}$/`; the smoke test at line 99 even passes `gearId: "777"` without failure; add `if (data.gearId !== null && !/^\d{4}$/.test(data.gearId)) throw new Error('GEAR ID must be 4 digits')` before the task is stored in both methods; update smoke test to use a valid 4-digit gearId (e.g. `"7770"`); add a test for the invalid-gearId rejection path [taskflow-ui/src/lib/api/adapters/mock.ts (createTask ~line 200, updateTask ~line 231), taskflow-ui/src/lib/api/adapters/mock.smoke.test.ts:99]
  - [x] [AI-Review][MEDIUM] Fix `TaskFormDialog` edit mode to detect and clear inactive assignee — line 45 sets `assigneeId = task.assigneeId || 'unassigned'` without checking whether that member is still active; `activeMembers` (line 94) filters out inactive members, so if a task's assignee was deactivated after assignment the Select shows no selected value (empty trigger, no explanation), and saving without explicitly clearing the field throws "Assignee not found" from `updateTask` as a generic form error; fix: in the `useEffect`, check if `task.assigneeId` exists in the current active members list and fall back to `'unassigned'` if not: `const isActive = members.some(m => m.id === task.assigneeId && m.active); setAssigneeId(isActive ? task.assigneeId! : 'unassigned');`; add a test in `task-form-dialog.test.tsx` for this scenario [taskflow-ui/src/components/TaskFormDialog.tsx:45]
  - [x] [AI-Review][LOW] Add dashboard `updated` sort parity test — sorting parity tests (lines 298-338 in mock-task-filters.test.ts) cover `status` and `priority` but not `updated`; the `filterAndSortDashboardTasks` updated sort path (dashboard/tasks.ts:37) could regress silently; add a "keeps dashboard client-side updated sort in parity with adapter updated sort" test alongside the existing two parity tests [taskflow-ui/src/test/mock-task-filters.test.ts (after line 338)]
  - [x] [AI-Review][LOW] Fix File List documentation: 4 test files labeled `(modified)` should be `(added)` — `task-detail-author-persistence.test.tsx`, `mock-task-filters.test.ts`, `mock-task-gaps.test.ts`, and `story-2-2-comprehensive.test.tsx` are new untracked files (`??` in git status), not modifications of pre-existing files; correct their label in Dev Agent Record → File List [story file]
  - [x] [AI-Review][LOW] Add fake-timer support to AC7 test in `story-2-2-comprehensive.test.tsx` — the `Promise.all`-adds-20-subtasks test uses real `delay()` timers (300–500ms range) while `mock-task-gaps.test.ts` uses `vi.useFakeTimers()` for the same behavior; add `beforeEach(() => vi.useFakeTimers())` / `afterEach(() => vi.useRealTimers())` to the AC7 test (or wrap `Promise.all` with `vi.runAllTimersAsync()`) to eliminate the real-time wait and align with the established fake-timer pattern [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:132-157]
  - [x] [AI-Review][LOW] AC1 import restriction is ESLint-only and can be silently bypassed — the no-direct-mock-adapter import rule in `eslint.config.js` lines 37-54 is the sole enforcement mechanism for AC1; a `// eslint-disable-next-line no-restricted-imports` comment bypasses it with no other safeguard; consider adding a lightweight Vitest test that reads the file list of src/ application files and asserts none import from `@/lib/api/adapters/mock` directly [taskflow-ui/eslint.config.js:37-54]
- [x] Review Follow-ups (AI) — Round 11
  - [x] [AI-Review][MEDIUM] Add `expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))` assertion to the `deleteSubTask` race condition test — the test comment claims "NOT crash/toast error" but only asserts the UI element disappears; if the `deletingSubTaskId` guard were accidentally removed the test would still pass, giving false confidence [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:205-207]
  - [x] [AI-Review][MEDIUM] Commit Story 2.1 backend files separately before marking Story 2.2 done — 10 backend files (`backend/app/api/v1/tasks.py`, `backend/app/crud/task.py`, `backend/app/models/task.py`, `backend/app/schemas/task.py`, `backend/alembic/versions/20260217_0002_add_tasks_table.py`, `backend/tests/test_tasks.py`, plus 4 modified backend files) are untracked/uncommitted in the workspace; they belong to Story 2.1 scope ("Do NOT touch backend/") but are floating without attribution, making it impossible to correctly scope either story's code review
  - [x] [AI-Review][LOW] Remove unused `act` import from `story-2-2-comprehensive.test.tsx` — `act` is imported on line 1 but never referenced in any of the 5 tests; `noUnusedLocals: false` in tsconfig means the compiler won't catch this dead import [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:1]
  - [x] [AI-Review][LOW] Remove dead `afterEach(() => vi.useRealTimers())` from `story-2-2-comprehensive.test.tsx` — `vi.useFakeTimers()` is never called in this suite so the `afterEach` is a vestigial no-op copied from `mock-task-gaps.test.ts`; it misleads readers into thinking fake timers are active [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:43-45]
  - [x] [AI-Review][LOW] Replace relative path imports with `@/` aliases in `story-2-2-comprehensive.test.tsx` — lines 4-7 use `'../lib/api'`, `'../pages/TaskDetail'`, `'../lib/api/types'`, `'../components/ui/toaster'` while every other test file in this story uses `@/` aliases; relative paths are fragile on directory moves and inconsistent with the established pattern [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:4-7]
  - [x] [AI-Review][LOW] Remove `<Toaster />` from renders in `story-2-2-comprehensive.test.tsx` — `useToast` is mocked to return `mockToast: vi.fn()` so the `Toaster` component renders nothing visible; including it creates the false impression that toast DOM output is tested when it isn't; `task-detail-author-persistence.test.tsx` correctly omits `Toaster` while also mocking `useToast` [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:131, 192]
  - [x] [AI-Review][LOW] Enable `noUnusedLocals: true` in `tsconfig.app.json` — currently `false`, allowing dead imports like the unused `act` (L1 above) to accumulate silently; Rounds 8–9 enabled `strict: true` and `noImplicitAny: true` but skipped unused-variable enforcement; enabling it would have caught the `act` import at compile time and prevent future dead-code accumulation [taskflow-ui/tsconfig.app.json:20]
- [x] Review Follow-ups (AI) — Round 10
  - [x] [AI-Review][MEDIUM] Add `addingSubTask` loading/disabled state to `handleAddSubTask` in TaskDetail.tsx — the + button and Enter path have no in-flight guard; rapid Enter or double-click fires concurrent `addSubTask` requests, each reading the same localStorage snapshot before either writes back, creating duplicate sub-tasks; all comparable mutating operations (deleteTask Round 8, editDailyUpdate Round 6, deleteDailyUpdate Round 9) were hardened with loading states but `addSubTask` was missed; add `const [addingSubTask, setAddingSubTask] = useState(false)`, set it true before the await and false in finally, and add `|| addingSubTask` to both the button's `disabled` prop and the Enter handler's early-return guard [taskflow-ui/src/pages/TaskDetail.tsx:103-113, 199]
  - [x] [AI-Review][MEDIUM] Add in-flight guard to inline `deleteSubTask` button in TaskDetail.tsx — the delete icon button has no disabled state during the API call; a double-click fires two concurrent `deleteSubTask` calls; the first succeeds, the second throws `'Sub-task not found'` (introduced in Round 3) producing a destructive error toast for a successful operation; the race-condition test in `story-2-2-comprehensive.test.tsx:196` claims "NOT crash/toast error" but the error toast WILL appear; track a `deletingSubTaskId: string | null` state (mirroring the `deleteUpdateId` pattern) and disable the button while its ID matches [taskflow-ui/src/pages/TaskDetail.tsx:179-187, taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:196]
  - [x] [AI-Review][LOW] Fix wrong toast mock path in `story-2-2-comprehensive.test.tsx` — `vi.mock('../components/ui/use-toast')` resolves to `src/components/ui/use-toast` but `TaskDetail.tsx` imports from `@/hooks/use-toast` (= `src/hooks/use-toast`); the mock is silently dead; any future toast assertion in this suite would pass vacuously; change to `vi.mock('@/hooks/use-toast', ...)` to match the actual import path [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:9-13]
  - [x] [AI-Review][LOW] Change `description: ""` to `description: null` in `makeTask` test helper — Round 4 fixed `gearId: ""` → `gearId: null` in this same helper; Round 9 changed `CreateTaskData.description` to `string | null`; but `description: ""` was never updated; tasks created by the helper have a non-null empty-string description, diverging from the API contract and inconsistent with the gearId fix applied in Round 4 [taskflow-ui/src/test/mock-task-filters.test.ts:25]
  - [x] [AI-Review][LOW] Fix misleading "run sequentially" comment in `story-2-2-comprehensive.test.tsx` — the comment on line 95 says "We run this sequentially to respect the mock's async delay" but the code immediately below uses `Promise.all` (concurrent); the comment is factually wrong and misleads readers into thinking concurrent addSubTask calls are intentionally designed to be safe [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx:95-96]
  - [x] [AI-Review][LOW] Remove dead `assigneeName` stripping cast in TaskDetail.tsx edit onSubmit — `const { assigneeName: _ignoredAssigneeName, ...updateData } = data as typeof data & { assigneeName?: string | null }` is dead code; the `TaskFormDialog.onSubmit` prop type does not include `assigneeName`, so `data` never contains the field; the type cast widens to add a field that never exists and the destructure silently strips `undefined`; remove the cast and destructure and pass `data` directly to `updateTask` [taskflow-ui/src/pages/TaskDetail.tsx:319]
- [x] Review Follow-ups (AI) — Round 9
  - [x] [AI-Review][MEDIUM] Add loading/disabled state to `deleteDailyUpdate` AlertDialogAction in `TaskDetail.tsx` — no `disabled` prop or loading indicator during the `deleteDailyUpdate` API call; double-click fires two concurrent deletes, second one throws "Update not found" and shows a destructive error toast; add a `deletingUpdate` boolean state mirroring the `deletingTask` pattern added in Round 8 [taskflow-ui/src/pages/TaskDetail.tsx:360-367]
  - [x] [AI-Review][MEDIUM] Remove or set `noImplicitAny: false` to `true` in `tsconfig.app.json` — `"noImplicitAny": false` explicitly overrides the `noImplicitAny` sub-flag of `"strict": true`; per TypeScript docs individual flags override the umbrella `strict` flag; this means function parameters and variables can silently be typed as `any`, undermining the Round 8 strict-mode goal; remove the line or change to `"noImplicitAny": true` [taskflow-ui/tsconfig.app.json:22]
  - [x] [AI-Review][MEDIUM] Change `CreateTaskData.description` to `string | null` — currently typed as `string` while `Task.description` is `string | null`; creating a task with empty description stores `""` but the real backend will return `null` for absent descriptions; all null-safe guards downstream (`(t.description ?? '')`) handle null but `createTask` never produces it, creating a contract inconsistency; also update `TaskFormDialog.onSubmit` prop type accordingly [taskflow-ui/src/lib/api/client.ts:9]
  - [x] [AI-Review][LOW] Add `localStorage.setItem` assertion to "no stored author fallback" test — the test (line 178) verifies `addDailyUpdate` is called with `m1` but unlike the inactive-member sibling test (line 148, Round 4 fix) does not assert `localStorage.setItem('taskflow-last-author', 'm1')` after submission; a regression in the persistence call would pass this test silently [taskflow-ui/src/test/task-detail-author-persistence.test.tsx:178-194]
  - [x] [AI-Review][LOW] Extend ESLint import restriction to block direct `@/lib/api/adapters/mock` imports in application code — `eslint.config.js` only restricts the old `mock-api` path; app code could `import { MockApiClient } from '@/lib/api/adapters/mock'` bypassing the `apiClient` singleton with no lint error; add an overrides-aware pattern for `**/adapters/mock` restricted to non-test files [taskflow-ui/eslint.config.js:24-44]
  - [x] [AI-Review][LOW] Remove `assigneeName` from `CreateTaskData` — the field is always ignored by the mock which re-derives it from `getMembers()`; a real adapter developer reading `CreateTaskData` will incorrectly assume the client controls `assigneeName`; remove from the interface and from `TaskFormDialog.onSubmit` prop type (the mock's `createTask` already derives it independently) [taskflow-ui/src/lib/api/client.ts:13]
  - [x] [AI-Review][LOW] Wrap `load` in `useCallback` in `Index.tsx` — `load` is a plain `async function` inside the component body (not memoized), while `TaskDetail.tsx` correctly uses `useCallback` for the same pattern; `useEffect(() => { load(); }, [])` is missing `load` in deps, triggering a `react-hooks/exhaustive-deps` lint warning; adding `useCallback` with deps `[toast]` and listing `load` in the effect deps array aligns with `TaskDetail.tsx` and prevents infinite-loop risk if future code reuses the ref [taskflow-ui/src/pages/Index.tsx:36-52]
  - [x] [AI-Review][LOW] Strip `assigneeName` before calling `updateTask` in `TaskDetail.tsx` edit submit — `onSubmit` passes the full `TaskFormDialog` data object (which includes `assigneeName`) to `updateTask` despite `UpdateTaskData` explicitly excluding it; TypeScript allows this (non-literal excess property), but at runtime `assigneeName` from the form is spread into `merged` before re-derivation; a real REST adapter would send `assigneeName` in the PATCH body; explicitly destructure it out before calling `updateTask` [taskflow-ui/src/pages/TaskDetail.tsx:317]
- [x] Review Follow-ups (AI) — Round 8
  - [x] [AI-Review][HIGH] Enable `strict: true` in `tsconfig.app.json` — currently `"strict": false` which disables `strictNullChecks`; all nullable type fixes across Rounds 1–7 (`gearId: string | null`, `description: string | null`, `UpdateTaskData` `assigneeName` exclusion) are unenforced at compile time; null is assignable to string so TypeScript cannot catch null-dereference bugs like `null.trim()`; enabling strict mode is a project-wide change that may surface latent type errors requiring resolution [taskflow-ui/tsconfig.app.json:19]
  - [x] [AI-Review][MEDIUM] Fix `setDescription(task.description)` null crash in `TaskFormDialog` — `Task.description` is `string | null` (Round 7 fix) but the edit-mode `useEffect` sets form state directly without nullish coalescing; when the real backend returns a task with null description and a user opens the edit dialog, `description.trim()` in `handleSubmit` throws `TypeError: Cannot read properties of null`; fix: `setDescription(task.description ?? '')` [taskflow-ui/src/components/TaskFormDialog.tsx:42]
  - [x] [AI-Review][MEDIUM] Add loading/disabled state to `deleteTask` AlertDialogAction in `TaskDetail.tsx` — the confirm-delete button has no `disabled` prop or loading indicator during the `deleteTask` API call; rapid double-click fires two concurrent delete requests; the first succeeds and calls `navigate('/')`, the second throws "Task not found" and fires a destructive toast on the now-unmounted component; add a `deletingTask` boolean state mirroring the `editUpdateLoading` pattern added in Round 6 [taskflow-ui/src/pages/TaskDetail.tsx:327-334]
  - [x] [AI-Review][MEDIUM] Add unmount guard to `load()` in `Index.tsx` — `TaskDetail.tsx` received `mountedRef` cleanup in Round 5 but `Index.tsx` was modified in this story without the same guard; `setTasks`, `setMembers`, `setConnectionError`, and `setLoading` all fire after unmount when navigating away mid-load; add a `mountedRef` pattern matching `TaskDetail.tsx:45-51` [taskflow-ui/src/pages/Index.tsx:28-40]
  - [x] [AI-Review][LOW] Add daily-update authorship guard to `deleteMember` in mock adapter — only assigned-task ownership is checked; members who have authored daily updates can be deleted, leaving `authorId` as a dangling reference in stored updates; add a check across all tasks' `dailyUpdates` arrays similar to the existing `assigneeId` check [taskflow-ui/src/lib/api/adapters/mock.ts:375-383]
  - [x] [AI-Review][LOW] Clear `blockingReason` in `createTask` for non-Blocked statuses — `updateTask` enforces `if (merged.status !== 'Blocked') merged.blockingReason = ''` but `createTask` has no equivalent; a direct API call with `status: "In Progress"` and a non-empty `blockingReason` creates an inconsistent task; add the same guard before storing the new task [taskflow-ui/src/lib/api/adapters/mock.ts:200-227]
  - [x] [AI-Review][LOW] Replace positional button selector in `deleteTask` test with `data-testid` — `deleteButtons[deleteButtons.length - 1]` is fragile; Round 4 applied `data-testid` to the deleteSubTask button for the same reason; add `data-testid="confirm-delete-task"` to the `AlertDialogAction` in `TaskDetail.tsx` and update the test selector [taskflow-ui/src/test/task-detail-author-persistence.test.tsx:400-407, taskflow-ui/src/pages/TaskDetail.tsx:327]

- [x] Review Follow-ups (AI) — Round 15
  - [x] [AI-Review][MEDIUM] Add `mountedRef.current` guard to `updateLoading` and `editUpdateLoading` `finally` blocks in TaskDetail.tsx — every other loading state reset in the component (`setDeletingTask`, `setAddingSubTask`, `setDeletingSubTaskId`, `setDeletingUpdate`) already guards with `if (mountedRef.current)` before setting state in `finally`, but the Add Update dialog's `setUpdateLoading(false)` and the inline edit's `setEditUpdateLoading(false)` both fire unconditionally; if the user navigates away while either request is in flight, these mutate state on the unmounted component [taskflow-ui/src/pages/TaskDetail.tsx:313, taskflow-ui/src/pages/TaskDetail.tsx:255]
  - [x] [AI-Review][MEDIUM] Add minimum-length (non-empty) validation to `assertTaskFieldLengths` and `assertSubTaskTitleLength` in mock adapter — `normalizeDailyUpdateContent` enforces `normalized.length < 1` for blank content, but `assertTaskFieldLengths` only checks the upper-bound (`> MAX_TASK_TITLE_LENGTH`) and `assertSubTaskTitleLength` only checks `> MAX_SUBTASK_TITLE_LENGTH`; a direct API call with `createTask({ title: '', ... })` or `addSubTask(id, { title: '' })` bypasses client-side validation and is stored by the mock while the real backend returns 422; add `if (!title.trim()) throw new Error('Task title is required')` and `if (!title.trim()) throw new Error('Sub-task title is required')` at the top of each helper respectively [taskflow-ui/src/lib/api/adapters/mock.ts:157-169]
  - [x] [AI-Review][LOW] Trim `data.title` before storing in `addSubTask` — `normalizeDailyUpdateContent` trims and validates content before storage; `addSubTask` constructs `{ title: data.title, ... }` using the raw (possibly padded) string; direct API calls with leading/trailing whitespace in sub-task titles produce inconsistent data shapes not possible through the real backend; change to `title: data.title.trim()` after the existing `assertSubTaskTitleLength` check [taskflow-ui/src/lib/api/adapters/mock.ts:288]
  - [x] [AI-Review][LOW] Add email uniqueness validation to `createMember` and `updateMember` in mock adapter — the real backend will enforce unique email per member (standard DB constraint); the mock silently accepts duplicate emails in both methods; when the real adapter ships, the Team page's error-handling for duplicate-email submissions will be completely untested; add `if (getMembers().some(m => m.email === data.email)) throw new Error('A member with this email already exists')` in `createMember`, and `if (getMembers().some(m => m.id !== id && m.email === data.email)) throw new Error('A member with this email already exists')` in `updateMember` [taskflow-ui/src/lib/api/adapters/mock.ts:356-371]
- [x] Review Follow-ups (AI) — Round 18
  - [x] [AI-Review][MEDIUM] Add existence check to `deleteMember` in mock adapter — currently calls `getMembers().filter(m => m.id !== id)` without verifying the member exists; a call with a non-existent ID silently returns void; every other delete operation throws on not-found (`deleteTask` → `'Task not found'`, `deleteSubTask` → `'Sub-task not found'`, `deleteDailyUpdate`/`editDailyUpdate` → `'Update not found'`); the real backend will return 404; add a `findIndex` pre-check and `throw new Error('Member not found')`, and add a regression test for the not-found path [taskflow-ui/src/lib/api/adapters/mock.ts:439]
  - [x] [AI-Review][MEDIUM] Fix `TaskFormDialog.tsx` useEffect to not reset form on `members` prop changes while dialog is open — `useEffect([open, task, members])` resets ALL form state whenever `members` reference changes; `TaskDetail.tsx` calls `setMembers(m)` inside `load()` which is triggered programmatically after every mutation (sub-task toggle, delete, update edit, etc.); if `load()` completes while the edit dialog is open, the form silently discards the user's in-progress edits; fix: only reset fields when `open` transitions `false → true`; use a `prevOpenRef` or split into two effects: one on `[open]` for field reset, one on `[task, members]` for assignee-validity-only updates; add a test simulating a `members` prop change while the form is open and asserting field values are preserved [taskflow-ui/src/components/TaskFormDialog.tsx:42]
  - [x] [AI-Review][LOW] Remove dead `required` attributes from controlled Textarea elements in `TaskDetail.tsx` — both the Add Update dialog textarea and the inline edit textarea carry `required` but neither is inside a `<form>` element; they are wired to `onClick` handlers so HTML5 constraint validation never fires; the effective guard is already the `disabled={!updateContent.trim() || ...}` on the submit button; `required` misleads developers into thinking browser-native validation is active; remove both occurrences [taskflow-ui/src/pages/TaskDetail.tsx:320, taskflow-ui/src/pages/TaskDetail.tsx:273]
  - [x] [AI-Review][LOW] Trim search query `q` before matching in `filterAndSortDashboardTasks` and `mock.ts getTasks` — both check for non-empty search using `.trim()` but then compute `q = search.toLowerCase()` (raw, with whitespace); if the user pastes `"pipeline "` (trailing space) the truthy guard is satisfied but every `.includes("pipeline ")` returns 0 results silently; fix: `const q = search.trim().toLowerCase()` in both `filterAndSortDashboardTasks` and `mock.ts getTasks`; add a test in `mock-task-filters.test.ts` asserting padded search `"  CI/CD  "` returns the same results as `"CI/CD"` [taskflow-ui/src/lib/dashboard/tasks.ts:29, taskflow-ui/src/lib/api/adapters/mock.ts:215]
  - [x] [AI-Review][LOW] Fix `createTask` empty blocking-reason guard to use computed `blockingReason` local variable instead of `data.blockingReason.trim()` — `updateTask` correctly uses `normalizedBlockingReason` (the pre-computed local var) in its equivalent empty check; `createTask` computes `const blockingReason = data.blockingReason.trim()` then checks `!data.blockingReason.trim()` (re-evaluates from source); if future normalization is added to `blockingReason` the `createTask` guard will silently diverge from `updateTask`; change to `if (data.status === 'Blocked' && !blockingReason)` for consistency [taskflow-ui/src/lib/api/adapters/mock.ts:251]

- [x] Review Follow-ups (AI) — Round 17
  - [x] [AI-Review][MEDIUM] Fix `assertSubTaskTitleLength` to use `title.trim().length` for max-length check — empty-title uses `title.trim()` correctly but the max-length guard uses raw `title.length`; a direct API call with `addSubTask(id, { title: 'X' + ' '.repeat(200) })` (201 raw chars, 1 visible char) is incorrectly rejected even though the stored trimmed value `'X'` is compliant; apply the same Round 16 fix pattern used for `assertTaskFieldLengths`: `const normalizedTitle = title.trim(); if (normalizedTitle.length > MAX_SUBTASK_TITLE_LENGTH) throw ...`; add a regression test in `mock-task-gaps.test.ts` mirroring the existing "parity — allows padded titles when trimmed length is within 200 chars" test [taskflow-ui/src/lib/api/adapters/mock.ts:180-185]
  - [x] [AI-Review][MEDIUM] Trim `blockingReason` before storage in `createTask` and `updateTask` — title, description, sub-task title, and daily update content are all explicitly trimmed before storage but `blockingReason` is stored raw; in `createTask` change `const blockingReason = data.status === 'Blocked' ? data.blockingReason : ''` to `const blockingReason = data.status === 'Blocked' ? data.blockingReason.trim() : ''`; in `updateTask` trim `merged.blockingReason` after the status-Blocked checks (similar to how `merged.title` and `merged.description` are trimmed after the spread); add a test that submits a blocking reason with leading/trailing whitespace via direct API call and asserts the stored value is trimmed [taskflow-ui/src/lib/api/adapters/mock.ts:249, 293]
  - [x] [AI-Review][LOW] Add `maxLength` attribute to blocking reason Textarea in `TaskFormDialog` — every other string input in the form enforces a character limit via HTML `maxLength` (title: 200, description: 2000) and the update textareas (1000); the blocking reason textarea has no `maxLength`, allowing the user to type an unbounded string with no UI feedback; define a `MAX_BLOCKING_REASON_LENGTH` constant in `mock.ts` and apply `maxLength={MAX_BLOCKING_REASON_LENGTH}` to the Textarea, adding a corresponding length check to `assertTaskFieldLengths` (or a new helper) and to `TaskFormDialog.validate()` [taskflow-ui/src/components/TaskFormDialog.tsx:163, taskflow-ui/src/lib/api/adapters/mock.ts]
  - [x] [AI-Review][LOW] Guard `updateTask` spread against explicit `undefined` for Partial fields — JavaScript's spread operator (`{ ...tasks[idx], ...data }`) copies properties whose value is `undefined`, overriding the source value; since `UpdateTaskData` is `Partial<Omit<Task,...>>`, a caller can legally pass `{ gearId: undefined }` (TypeScript allows it for optional fields), causing `merged.gearId = undefined` despite the type contract requiring `string | null`; `assertValidGearId(undefined)` silently passes and the broken-shape task is stored; strip explicit-undefined entries before spreading: `const safeData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as UpdateTaskData` and use `{ ...tasks[idx], ...safeData, updatedAt: ... }` for the merge; add a targeted test asserting that `updateTask(id, { gearId: undefined })` leaves the existing gearId unchanged [taskflow-ui/src/lib/api/adapters/mock.ts:283]
- [x] Review Follow-ups (AI) — Round 16
  - [x] [AI-Review][MEDIUM] Add `togglingSubTaskId` in-flight guard to `toggleSubTask` Checkbox in TaskDetail.tsx — the Checkbox `onCheckedChange` fires `apiClient.toggleSubTask` with no `disabled` prop or in-flight tracking; two rapid clicks on the same sub-task send concurrent requests that both read the pre-write localStorage snapshot, so the second undoes the first with no user feedback; add a `togglingSubTaskId: string | null` state (matching the `deletingSubTaskId` pattern), set it before the `await`, disable the Checkbox while its `sub.id === togglingSubTaskId`, clear in `finally` if `mountedRef.current`; add a test mirroring the `deleteSubTask` race test in `story-2-2-comprehensive.test.tsx` [taskflow-ui/src/pages/TaskDetail.tsx:174-181]
  - [x] [AI-Review][MEDIUM] Trim `title` and `description` before storing in `createTask` and `updateTask` in mock adapter — `addSubTask` explicitly stores `data.title.trim()` (Round 15); `normalizeDailyUpdateContent` trims; but `createTask` spreads raw `data` and `updateTask` merges raw `data`, storing whatever whitespace the caller passes; change `createTask` to use `title: data.title.trim()` and `description: data.description?.trim() ?? null`, and change `updateTask` to trim `merged.title` and `merged.description` before the `assertTaskFieldLengths` call and before saving; add tests for leading/trailing whitespace inputs in relevant test files [taskflow-ui/src/lib/api/adapters/mock.ts:257 (createTask), mock.ts:268 (updateTask)]
  - [x] [AI-Review][LOW] Fix `assertTaskFieldLengths` to use trimmed length for the 200-char max check — empty-title check correctly uses `title.trim()` but the length check uses `title.length` (raw); a call with `title: 'A' + ' '.repeat(200)` (201 chars) is incorrectly rejected even though the visible value is 1 char; change to `if (title.trim().length > MAX_TASK_TITLE_LENGTH)` so both the empty check and the max-length check operate on the same trimmed value and are consistent with `addSubTask`'s `assertSubTaskTitleLength` [taskflow-ui/src/lib/api/adapters/mock.ts:171]
  - [x] [AI-Review][LOW] Fix `seedData()` guard to check both `MEMBERS_KEY` and `TASKS_KEY` — `if (localStorage.getItem(MEMBERS_KEY)) return` exits early even when `taskflow_tasks` is absent (e.g., manually cleared via DevTools); the app opens with members but no tasks and no re-seeding; change to `if (localStorage.getItem(MEMBERS_KEY) && localStorage.getItem(TASKS_KEY)) return` [taskflow-ui/src/lib/api/adapters/mock.ts:23]
  - [x] [AI-Review][LOW] Add `toggleSubTask` race-condition test to `story-2-2-comprehensive.test.tsx` once M1 guard is applied — mirroring the `deleteSubTask` race test, verify that a second Checkbox click while the first `toggleSubTask` is pending is ignored and does not fire a second API call [taskflow-ui/src/test/story-2-2-comprehensive.test.tsx]
- [x] Review Follow-ups (AI) — Round 14
  - [x] [AI-Review][MEDIUM] Add content-length validation (1–1000 chars) to `addDailyUpdate` and `editDailyUpdate` in mock adapter — both methods accept any string including empty (`""`) and unlimited-length content; the API contract requires content to be 1–1000 characters; the UI `<Textarea>` elements for add and edit have no `maxLength` attribute enforcing this at the input level; add a length check in both methods and add a `maxLength={1000}` (plus required/non-empty guard) to the TextAreas in `TaskDetail.tsx` [taskflow-ui/src/lib/api/adapters/mock.ts:313-343, taskflow-ui/src/pages/TaskDetail.tsx:239,305-307]
  - [x] [AI-Review][MEDIUM] Add field-length validation to `createTask`, `updateTask`, and `addSubTask` in mock adapter — none of the three methods validate that `title` is ≤ 200 chars, `description` is ≤ 2000 chars, or sub-task `title` is ≤ 200 chars; the real backend will enforce these limits and return 422/400 errors; the `<Input>` and `<Textarea>` fields in `TaskFormDialog.tsx` have no `maxLength` attributes; add length guards in mock adapter methods and `maxLength` attributes on the corresponding inputs [taskflow-ui/src/lib/api/adapters/mock.ts:206-285, taskflow-ui/src/components/TaskFormDialog.tsx:113,118,149]
  - [x] [AI-Review][LOW] Add `'updatedAt'` to the `Omit` list in `UpdateTaskData` — `UpdateTaskData = Partial<Omit<Task, 'id' | 'createdAt' | 'subTasks' | 'dailyUpdates' | 'assigneeName'>>` allows a caller to pass `updatedAt` as a settable field; `updatedAt` is server-managed and should never be accepted from callers; add `'updatedAt'` to the exclusion list [taskflow-ui/src/lib/api/client.ts:17]
  - [x] [AI-Review][LOW] Fix AC1 import-restriction test regex to detect multi-line imports — `DISALLOWED_IMPORT` is tested against each specifier returned by `extractImportSpecifiers` which uses `[^'"]*?` in the static-import pattern; the character class `[^'"]` does not match newlines so a formatted import spanning multiple lines (e.g. `import {\n  MockApiClient\n} from '@/lib/api/adapters/mock'`) is silently accepted; add the `s` (dotAll) flag or replace `[^'"]*?` with `[\s\S]*?` in the regex [taskflow-ui/src/test/no-direct-mock-adapter-imports.test.ts:38]
  - [x] [AI-Review][LOW] Remove dead early-return guard at the top of `load()` in `Index.tsx` — `if (!mountedRef.current) return` (line 37) fires before any async work; `mountedRef.current` is always `true` at this point because `load()` is only ever called from the `useEffect` while the component is mounted; the meaningful mounted checks are the ones guarding state updates after the `await`; remove the dead guard to reduce confusion [taskflow-ui/src/pages/Index.tsx:37]
- [x] Review Follow-ups (AI) — Round 19
  - [x] [AI-Review][MEDIUM] Fix `getTasks` whitespace-only search guard in mock adapter — `if (filters?.search)` evaluates the raw string, so a search value of `"   "` (whitespace only) is truthy; execution enters the filter block, `q = ""`, and `"".includes("")` returns `true` for every string, causing ALL tasks to be returned instead of an empty/no-op result; `filterAndSortDashboardTasks` in `tasks.ts` correctly gates with `if (search.trim())`; the Round 18 commit trimmed `q` but left the outer guard unaligned; fix: change `if (filters?.search)` to `if (filters?.search?.trim())`; add a test in `mock-task-filters.test.ts` asserting that `getTasks({ search: "   " })` returns the same result as `getTasks()` with no search filter (or returns all tasks, not fewer) while also verifying it does NOT act as a filter on zero-length `q` [taskflow-ui/src/lib/api/adapters/mock.ts:212]
  - [x] [AI-Review][LOW] Padded search parity test lacks non-empty result guard — `expect(padded.map(t => t.id)).toEqual(trimmed.map(t => t.id))` is vacuously satisfied when both arrays are empty (i.e., if seed data loses "CI/CD" coverage); add `expect(trimmed.length).toBeGreaterThan(0)` before the equality assertion — same structural weakness as the assignee-filter test fixed in Round 6 [taskflow-ui/src/test/mock-task-filters.test.ts:178]
  - [x] [AI-Review][LOW] Members-refresh preservation test missing initial-state assertion before user edits — `fireEvent.change` sets DOM input values directly regardless of React state, so a broken open-transition `useEffect` init (failing to seed `task.title` into state) would not be caught; the test currently only verifies that typed values survive rerender, not that the form was correctly populated from the task on open; add `expect(screen.getByLabelText("Title *")).toHaveValue("Original title")` before the first `fireEvent.change` to anchor the test to the initialization behavior [taskflow-ui/src/test/task-form-dialog.test.tsx:131]
  - [x] [AI-Review][LOW] Inconsistent naming for trimmed blocking-reason variable between `createTask` and `updateTask` — `createTask` uses `const blockingReason` (which shadows the property name and doubles as the stored value) while `updateTask` uses `const normalizedBlockingReason`; a developer auditing parity between the two methods must mentally map different local variable names to the same concept; align by renaming `createTask`'s local to `normalizedBlockingReason` (or vice-versa) for symmetry with the established `title`/`description` normalization pattern in both methods [taskflow-ui/src/lib/api/adapters/mock.ts (createTask ~line 248, updateTask ~line 296)]
- [x] Review Follow-ups (AI) — Round 20
  - [x] [AI-Review][MEDIUM] Fix `createTask` to normalize empty-string `description` to `null` — `data.description?.trim() ?? null` uses `??` which does NOT coerce `''` to `null`; a direct API call with `description: ''` silently stores `''`, violating `Task.description: string | null` where `null` means absence; the form avoids this by normalizing before calling, but direct API calls and future real-adapter integration tests will hit this path; fix: `const description = (data.description?.trim()) || null` [taskflow-ui/src/lib/api/adapters/mock.ts:249]
  - [x] [AI-Review][MEDIUM] Fix `updateTask` to normalize empty-string `description` to `null` — same `?? null` flaw as M1 above but in `updateTask`; `merged.description = merged.description?.trim() ?? null` still stores `''` if the merged result is an empty string; fix: `merged.description = merged.description?.trim() || null` [taskflow-ui/src/lib/api/adapters/mock.ts:296]
  - [x] [AI-Review][MEDIUM] Extract shared validation constants to `src/lib/api/constants.ts` — `MAX_TASK_TITLE_LENGTH`, `MAX_TASK_DESCRIPTION_LENGTH`, `MAX_BLOCKING_REASON_LENGTH`, `MAX_DAILY_UPDATE_CONTENT_LENGTH`, `MAX_SUBTASK_TITLE_LENGTH` are independently declared in `mock.ts`, `TaskFormDialog.tsx`, and `TaskDetail.tsx`; when the real adapter ships with different server-enforced limits, all three files must be updated separately; create a shared `@/lib/api/constants.ts` file and import from it in all three consumers to prevent drift [taskflow-ui/src/lib/api/adapters/mock.ts:9-13, taskflow-ui/src/components/TaskFormDialog.tsx:25-27, taskflow-ui/src/pages/TaskDetail.tsx:26-27]
  - [x] [AI-Review][LOW] Fix `assertTaskFieldLengths` to use trimmed `description.length` for max-length check — title correctly uses `normalizedTitle.length` (after `.trim()`) but description uses raw `description.length`; while description is always pre-trimmed before calling this function, the inconsistency is a future maintenance trap — any new call path that omits pre-trimming would silently over-reject padded inputs; apply the same `const normalizedDescription = description.trim()` pattern and use `normalizedDescription.length` [taskflow-ui/src/lib/api/adapters/mock.ts:176]
  - [x] [AI-Review][LOW] Add explicit client-side sort for `dailyUpdates` display or document ordering in API contract — mock always `unshift`s updates so newest appears first, but the API contract does not specify that updates are returned newest-first; if a real adapter returns oldest-first, `TaskDetail.tsx` reverses the display order with no code change and no visible error; either add an explicit `slice().sort((a, b) => new Date(b.createdAt).getTime() - ...)` in the render loop, or add a `sort: 'desc'` note to the daily updates `GET /tasks/:id` response schema in `API_CONTRACT.md`
  - [x] [AI-Review][LOW] Add regression test for `createTask` with `description: ''` — no existing test covers a direct API call with `description: ''`; once M1 is fixed, add a test asserting `createTask({ ..., description: '' })` → `created.description === null`, preventing silent regression if the `|| null` normalization is ever replaced with `?? null` again [taskflow-ui/src/test/mock-task-gaps.test.ts]

## Dev Notes

### Developer Context

- **Track:** UI - Lovable. Do NOT touch `backend/`.
- **Dependency:** Story 1.4 (adapter pattern) is COMPLETE. The refactored `src/lib/api/` layer is fully in place.
- **Dependency:** Story 2.1 (Task Management API CRUD) is `ready-for-dev` — backend not yet running. All work in this story uses the mock adapter.
- **Key finding from code audit:** Most of Story 2.2 is ALREADY DONE. Only 3 specific gaps need implementation:
  1. `updateTask` in mock: missing `assigneeName` re-resolution
  2. `addSubTask` in mock: missing max 20 limit
  3. `TaskDetail.tsx`: missing localStorage author persistence for daily updates
- **Do NOT rewrite or restructure** existing working code. Only patch the three identified gaps.

### Technical Requirements

**Gap 1 — `updateTask` assigneeName re-resolution** (`taskflow-ui/src/lib/api/adapters/mock.ts`):

Current behavior (lines ~205–218):
```typescript
async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
  await delay();
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Task not found');
  const merged = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
  // ... blockingReason logic
  tasks[idx] = merged;
  saveTasks(tasks);
  return merged;
}
```

Required fix — add assigneeName resolution after merge:
```typescript
async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
  await delay();
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Task not found');
  const merged = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
  if (merged.status === 'Blocked' && !merged.blockingReason.trim()) {
    throw new Error('Blocking reason is required for blocked tasks.');
  }
  if (merged.status !== 'Blocked') merged.blockingReason = '';
  // Re-resolve assigneeName when assigneeId is explicitly included in the update
  if ('assigneeId' in data) {
    if (merged.assigneeId === null) {
      merged.assigneeName = null;
    } else {
      const members = getMembers();
      const member = members.find(m => m.id === merged.assigneeId);
      merged.assigneeName = member ? member.name : null;
    }
  }
  tasks[idx] = merged;
  saveTasks(tasks);
  return merged;
}
```

**Gap 2 — `addSubTask` max 20 enforcement** (`taskflow-ui/src/lib/api/adapters/mock.ts`):

Current behavior (line ~227):
```typescript
async addSubTask(taskId: string, data: { title: string }): Promise<SubTask> {
  await delay();
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  // MISSING: max 20 check
  const sub: SubTask = { ... };
```

Required fix — add limit check before creating sub-task:
```typescript
async addSubTask(taskId: string, data: { title: string }): Promise<SubTask> {
  await delay();
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  if (task.subTasks.length >= 20) throw new Error('Maximum of 20 sub-tasks per task');
  const sub: SubTask = { id: generateId(), title: data.title, completed: false, createdAt: new Date().toISOString() };
  task.subTasks.push(sub);
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return sub;
}
```

**Gap 3 — localStorage author persistence** (`taskflow-ui/src/pages/TaskDetail.tsx`):

Current behavior (line ~176):
```typescript
<Button size="sm" onClick={() => {
  setAddingUpdate(true);
  setUpdateAuthor(activeMembers[0]?.id || '');  // <-- always picks first member
  setUpdateContent('');
}}>
```

Required change — restore from localStorage on open:
```typescript
const LAST_AUTHOR_KEY = 'taskflow-last-author';

// When opening the dialog:
<Button size="sm" onClick={() => {
  setAddingUpdate(true);
  const stored = localStorage.getItem(LAST_AUTHOR_KEY);
  const validId = stored && activeMembers.some(m => m.id === stored) ? stored : (activeMembers[0]?.id || '');
  setUpdateAuthor(validId);
  setUpdateContent('');
}}>
```

And on successful submission (line ~258):
```typescript
await apiClient.addDailyUpdate(task.id, { authorId: updateAuthor, content: updateContent.trim() });
localStorage.setItem(LAST_AUTHOR_KEY, updateAuthor);  // <-- persist author
toast({ title: 'Update added' });
setAddingUpdate(false);
load();
```

The constant `LAST_AUTHOR_KEY = 'taskflow-last-author'` should be defined at the top of the component file (or as a module-level constant).

### Architecture Compliance

- **Do NOT modify** `src/lib/api/types.ts`, `src/lib/api/client.ts`, or `src/lib/api/index.ts` — these are finalized by Story 1.4.
- **Only touch** `src/lib/api/adapters/mock.ts` and `src/pages/TaskDetail.tsx`.
- **Error format:** Mock adapter throws `new Error('message')` — components catch with `err instanceof Error ? err.message : 'Unknown error'`.
- **`@/types`** re-exports everything from `@/lib/api/types` — components importing from `@/types` are already using the adapter types.
- **`@/lib/api`** exports `apiClient` as the singleton — all components use this.
- **No new components** needed for this story. All required UI is already built.

### Library / Framework Requirements

- **React** 18.3.1 — existing hooks pattern, no new dependencies
- **TypeScript** 5.8 — `'assigneeId' in data` is the correct check to detect if a field was explicitly included in a partial update
- **localStorage** — standard browser API, no new utilities needed
- **shadcn/ui** — all needed components already imported in `TaskDetail.tsx`
- Do **NOT** add any new npm packages.

### File Structure Requirements

**Files to modify (3 files only):**
```
taskflow-ui/src/lib/api/adapters/mock.ts
  - updateTask: add assigneeName re-resolution when assigneeId in data
  - addSubTask: add max 20 sub-tasks guard

taskflow-ui/src/pages/TaskDetail.tsx
  - Add LAST_AUTHOR_KEY constant
  - Restore author from localStorage on "Add Update" button click
  - Persist author to localStorage on successful addDailyUpdate
```

**Files NOT to touch:**
- `taskflow-ui/src/lib/api/types.ts` — already correct
- `taskflow-ui/src/lib/api/client.ts` — already correct
- `taskflow-ui/src/lib/api/index.ts` — already correct
- `taskflow-ui/src/lib/api/adapters/mock.smoke.test.ts` — do not break existing tests
- `taskflow-ui/src/components/TaskCard.tsx` — already using correct imports
- `taskflow-ui/src/components/TaskFormDialog.tsx` — already correct (preserves form on error)
- `taskflow-ui/src/pages/Index.tsx` — already correct
- Anything under `backend/` — backend story (2.1) is separate

### Testing Requirements

Since this is a Lovable AI (UI) story, backend tests don't apply. Verify the following manually via browser:

**Assignee name resolution (Gap 1):**
1. Create a task with assignee "Alice Chen"
2. Edit the task, change assignee to "Bob Martinez"
3. Save — confirm card/detail shows "Bob Martinez" (not "Alice Chen")
4. Edit again, clear assignee (set to Unassigned)
5. Save — confirm card/detail shows "Unassigned" (assigneeName is null)

**Max 20 sub-tasks (Gap 2):**
1. Open a task detail page
2. Add 20 sub-tasks (use the input + Enter or the + button)
3. Attempt to add a 21st sub-task
4. Confirm error toast appears: "Maximum of 20 sub-tasks per task"
5. Confirm the task still shows exactly 20 sub-tasks

**Author persistence (Gap 3):**
1. Open any task detail page
2. Click "Add Update"
3. Select "Carol Kim" as the author, enter content, submit
4. Confirm update appears with "Carol Kim"
5. Click "Add Update" again
6. Confirm the author dropdown defaults to "Carol Kim" (restored from localStorage)
7. Refresh the page, open the same task detail
8. Click "Add Update" — confirm "Carol Kim" is still pre-selected

**Regression checks (existing behavior):**
1. Create a Blocked task without a blocking reason → form error shown, task not created ✓
2. Edit a Blocked task → change status to "In Progress" → save → confirm blockingReason is empty ✓
3. Filter dashboard by status, priority, assignee → confirm results correct ✓
4. Search tasks by title/description → confirm results correct ✓
5. On any API error in TaskFormDialog, confirm form fields retain their values ✓
6. Existing `mock.smoke.test.ts` passes (run `npm test` in `taskflow-ui/`)

### Previous Story Intelligence

#### From Story 1.4 (Frontend Adapter Pattern) — COMPLETED

- **Adapter pattern is fully in place.** `src/lib/api/` structure is: `types.ts`, `client.ts`, `adapters/mock.ts`, `index.ts`.
- **All component imports are already updated.** `TaskDetail.tsx`, `Index.tsx`, `Team.tsx`, `SettingsPage.tsx` all import from `@/lib/api` or `@/types`.
- **`@/types/index.ts`** is a thin re-export: `export { ... } from '@/lib/api/types'` — so components using `@/types` are already using the adapter types correctly.
- **`mock-api.ts` has been deleted.** Do not reference or try to restore it.
- **Mock adapter smoke tests exist** at `src/lib/api/adapters/mock.smoke.test.ts` — do not break them.

#### From Story 2.1 (Task Management API) — READY-FOR-DEV (backend)

- The real backend is NOT yet running — this story is purely frontend/mock changes.
- The backend task model uses `assignee_name` as a denormalized column (snake_case). Frontend uses `assigneeName` (camelCase). Transformation happens in `adapters/real.ts` when that's built later.
- For now, the mock adapter stores and resolves `assigneeName` internally in camelCase.

### Git Intelligence Summary

Recent commits (as of 2026-02-17):
- `acd0f3c feat(lpe)`: add Lovable Prompt Engineer — new tooling, no frontend impact
- `9ad7872 Squashed 'taskflow-ui/'`: most recent frontend changes incorporated (post Story 1.4 + 1.5)
- `1d45589 feat(api): implement adapter pattern for story 1.4` — confirms adapter pattern is complete
- `f82460a Harden API Adapter` — mock adapter already has robust error handling

**Takeaway:** The taskflow-ui subtree has recent updates that incorporated Stories 1.4 and 1.5. The adapter pattern is stable. Only the 3 specific gaps (updateTask assigneeName, addSubTask limit, author persistence) need addressing.

### Project Structure Notes

- `taskflow-ui/src/lib/api/adapters/mock.ts` — the ONLY backend logic for this story (two method patches)
- `taskflow-ui/src/pages/TaskDetail.tsx` — the ONLY UI change (localStorage author persistence)
- `taskflow-ui/src/pages/Index.tsx` — no changes needed (filters/sort/search already work)
- `taskflow-ui/src/components/TaskFormDialog.tsx` — no changes needed (form preservation already works)
- Frontend structure is a git subtree (`taskflow-ui/`) — do NOT push to git subtree, just modify files in the working directory

### References

- `taskflow-ui/API_CONTRACT.md` — canonical field names, endpoints, business rules
- `taskflow-ui/src/lib/api/adapters/mock.ts` — file to patch (assigneeName + max 20 limit)
- `taskflow-ui/src/pages/TaskDetail.tsx` — file to patch (localStorage author)
- `taskflow-ui/src/lib/api/client.ts` — `UpdateTaskData` type definition (Partial<Omit<Task, ...>>)
- `taskflow-ui/src/lib/api/types.ts` — Task, SubTask, DailyUpdate, TeamMember types
- `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.2 requirements
- `_bmad-output/planning-artifacts/architecture.md` — Frontend API client organization, naming conventions
- `_bmad-output/implementation-artifacts/2-1-task-management-api-crud-business-logic.md` — backend story context (max 20 sub-tasks, assigneeName resolution rules)

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Debug Log References

- `npm test -- src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts src/test/task-detail-author-persistence.test.tsx` (red phase: status sort + sub-task error handling failures)
- `npm test -- src/test/mock-task-gaps.test.ts` (red phase: null-safe search failure)
- `npm test -- src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts src/test/task-detail-author-persistence.test.tsx` (green phase)
- `npm test` (full regression suite)
- `npm run lint` (passes with existing UI warnings only)
- `npm test -- src/test/task-detail-author-persistence.test.tsx` (red phase: deleteTask error handling missing try/catch)
- `npm test -- src/test/task-detail-author-persistence.test.tsx` (green phase: deleteTask error handling added)
- `npm test -- src/test/mock-task-gaps.test.ts` (red phase: invalid assignee ID did not throw)
- `npm test -- src/test/mock-task-gaps.test.ts` (green phase: invalid assignee ID now throws)
- `npm test -- src/test/mock-task-filters.test.ts` (red phase: priority tie lacked updatedAt tiebreaker)
- `npm test -- src/test/mock-task-filters.test.ts` (green phase: priority tiebreaker implemented)
- `npm test -- src/test/mock-task-filters.test.ts` (red phase: status tie lacked updatedAt tiebreaker)
- `npm test -- src/test/mock-task-filters.test.ts` (green phase: status tiebreaker implemented)
- `npm test -- src/test/mock-task-gaps.test.ts` (fake-timer conversion introduced async rejection warnings)
- `npm test -- src/test/mock-task-gaps.test.ts` (green phase: fake-timer tests stable with handled rejections)
- `npm test` (full regression suite: 57/57 passing)
- `npm run lint` (initial run failed with transient ENOENT on generated vitest timestamp file)
- `npm run lint` (green phase: passes with existing pre-existing warnings only)
- `npm test -- src/test/mock-task-gaps.test.ts -t "createTask assignee validation"` (red phase: createTask accepted invalid assigneeId)
- `npm test -- src/test/mock-task-gaps.test.ts -t "createTask assignee validation"` (green phase: createTask now throws "Assignee not found")
- `npm test -- src/test/mock-task-gaps.test.ts -t "seed data contract parity"` (red phase: seed task used empty string gearId)
- `npm test -- src/test/mock-task-gaps.test.ts -t "seed data contract parity"` (green phase: seed task now stores null gearId)
- `npm test -- src/test/task-detail-author-persistence.test.tsx -t "falls back to first active member when stored author is inactive"` (green phase: fallback flow now asserts persisted localStorage author)
- `npm test -- src/test/mock-task-gaps.test.ts` (green phase: fake-timer helper refactor remains stable)
- `npm test -- src/test/mock-task-filters.test.ts -t "deleting a non-existent task id"` (green phase: deleteTask not-found path covered)
- `npm test -- src/test/mock-task-gaps.test.ts src/test/mock-task-filters.test.ts src/test/task-detail-author-persistence.test.tsx` (green phase: 42/42 focused tests passing)
- `npm run lint` (initial run failed with transient ENOENT on generated vitest timestamp file)
- `npm run lint` (green phase: passes with pre-existing warnings only)
- `npm test` (full regression suite: 60/60 passing)
- `npm test -- src/test/task-detail-author-persistence.test.tsx src/test/mock-task-gaps.test.ts` (red phase: expected failures for Round 4 load error handling and delete-subtask selector/not-found gaps)
- `npm test -- src/test/task-detail-author-persistence.test.tsx src/test/mock-task-gaps.test.ts src/test/mock-task-filters.test.ts` (green phase: Round 4 follow-ups resolved, 44/44 focused tests passing)
- `npm test` (full regression suite: 62/62 passing)
- `npm run lint` (passes with pre-existing react-refresh warnings only)
- `npm test -- src/test/task-form-dialog.test.tsx src/test/mock-task-gaps.test.ts src/test/task-detail-author-persistence.test.tsx` (red phase: Round 5 failures reproduced for `gearId` null normalization, active-member guards, and unmount safety)
- `npm test -- src/test/task-form-dialog.test.tsx src/test/mock-task-gaps.test.ts src/test/task-detail-author-persistence.test.tsx` (green phase: Round 5 focused tests passing, 27/27)
- `npm run lint` (red phase: caught `no-unsafe-finally` regression in `TaskDetail.tsx`)
- `npm run lint && npm test -- src/test/task-detail-author-persistence.test.tsx src/test/task-form-dialog.test.tsx src/test/mock-task-gaps.test.ts` (green phase: lint clean with existing warnings only, focused tests 27/27 passing)
- `npm test` (full regression suite: 68/68 passing)
- `npm test -- src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts src/test/task-detail-author-persistence.test.tsx` (red phase: Round 6 failures reproduced for add-subtask selector, inline edit loading state, and daily-update updatedAt parity)
- `npm test -- src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts src/test/task-detail-author-persistence.test.tsx` (green phase: Round 6 focused tests passing, 52/52)
- `npm test` (full regression suite: 71/71 passing)
- `npm run lint` (passes with pre-existing react-refresh warnings only)
- `npx tsc --noEmit` (type-check passes)
- `npm test -- src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts` (green phase: Round 7 focused tests passing, 44/44)
- `npm test -- src/test/mock-task-filters.test.ts` (green phase: post-refactor parity helper import remains stable, 27/27)
- `npm test` (full regression suite: 75/75 passing)
- `npm run lint` (passes with pre-existing react-refresh warnings only)
- `npx tsc --noEmit` (type-check passes)
- `npm test -- src/test/task-form-dialog.test.tsx src/test/task-detail-author-persistence.test.tsx src/test/mock-task-gaps.test.ts` (red phase: Round 8 failures reproduced for null description submit crash, delete confirmation selector/loading, blocking reason normalization, and deleteMember daily-update authorship guard)
- `npx tsc --noEmit -p tsconfig.app.json --strict true` (red phase: strict mode surfaced TaskFormDialog null assignment and smoke test payload type mismatch)
- `npm test -- src/test/task-form-dialog.test.tsx src/test/task-detail-author-persistence.test.tsx src/test/mock-task-gaps.test.ts` (green phase: Round 8 focused tests passing, 34/34)
- `npx tsc --noEmit` (green phase: strict mode type-check passes)
- `npm test` (full regression suite: 79/79 passing)
- `npm run lint` (passes with existing react-refresh warnings only)
- `npx tsc --noEmit` (green phase: noImplicitAny enforcement and CreateTaskData contract updates type-check cleanly)
- `npm test -- src/test/task-detail-author-persistence.test.tsx src/test/task-form-dialog.test.tsx src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts src/lib/api/adapters/mock.smoke.test.ts` (green phase: Round 9 focused suites passing, 69/69)
- `npm run lint` (green phase: import restriction extension and useCallback updates pass with existing UI warnings only)
- `npm test` (full regression suite: 86/86 passing)
- `npm test -- src/test/task-detail-author-persistence.test.tsx -t "disables add-subtask actions while request is pending and prevents duplicate submits|disables delete-subtask button while request is pending and prevents double click"` (red phase: Round 10 race-condition failures reproduced)
- `npm test -- src/test/task-detail-author-persistence.test.tsx -t "disables add-subtask actions while request is pending and prevents duplicate submits|disables delete-subtask button while request is pending and prevents double click"` (green phase: in-flight guards pass)
- `npm test -- src/test/story-2-2-comprehensive.test.tsx` (green phase: toast mock path fixed and comprehensive suite passing)
- `npm test -- src/test/task-detail-author-persistence.test.tsx src/test/story-2-2-comprehensive.test.tsx src/test/mock-task-filters.test.ts` (green phase: Round 10 focused regression checks passing, 49/49)
- `npm test` (full regression suite: 88/88 passing)
- `npm run lint` (passes with existing react-refresh warnings only)
- `npm test -- src/test/story-2-2-comprehensive.test.tsx` (green phase: Round 11 test cleanup + destructive-toast race assertion coverage)
- `npx tsc --noEmit` (green phase: `noUnusedLocals: true` validation passes)
- `npm test` (full regression suite: 88/88 passing after Round 11 updates)
- `npm run lint` (passes with existing react-refresh warnings only after Round 11 updates)
- `git commit -m "feat(backend): implement story 2.1 task CRUD"` (green phase: backend Story 2.1 files committed separately for scope isolation)
- `npm test -- src/test/story-2-2-comprehensive.test.tsx` (red phase: Round 12 prototype-spy migration initially failed because jsdom lacked `scrollIntoView`)
- `npm test -- src/test/story-2-2-comprehensive.test.tsx` (green phase: Round 12 fixes applied; 5/5 passing)
- `npm test` (full regression suite: 88/88 passing after Round 12 updates)
- `npm run lint` (passes with existing react-refresh warnings only after Round 12 updates)
- `npx tsc --noEmit` (green phase: type-check passes after Round 12 updates)
- `npm test -- src/lib/api/adapters/mock.smoke.test.ts src/test/mock-task-gaps.test.ts src/test/mock-task-filters.test.ts src/test/task-form-dialog.test.tsx src/test/story-2-2-comprehensive.test.tsx src/test/no-direct-mock-adapter-imports.test.ts` (green phase: Round 13 focused regression checks passing, 65/65)
- `npm run lint` (green phase: passes with existing react-refresh warnings only after Round 13 updates)
- `npx tsc --noEmit` (green phase: type-check passes after Round 13 updates)
- `npm test -- src/test/mock-task-gaps.test.ts` (green phase: Round 15 mock adapter follow-ups passing, 35/35)
- `npm test -- src/test/task-detail-author-persistence.test.tsx` (green phase: TaskDetail regression suite passing after mountedRef finally-guard update, 20/20)
- `npm test` (full regression suite: 114/114 passing after Round 15 updates)
- `npm run lint` (passes with existing react-refresh warnings only after Round 15 updates)
- `npm test -- src/test/story-2-2-comprehensive.test.tsx src/test/mock-task-gaps.test.ts` (red phase: Round 16 toggle race test initially asserted a stale checkbox node after re-render)
- `npm test -- src/test/story-2-2-comprehensive.test.tsx src/test/mock-task-gaps.test.ts` (green phase: Round 16 focused suites passing, 45/45)
- `npm run lint` (passes with existing react-refresh warnings only after Round 16 updates)
- `npm test` (full regression suite: 119/119 passing after Round 16 updates)
- `npx tsc --noEmit` (green phase: type-check passes after Round 16 updates)
- `npm test -- src/test/mock-task-gaps.test.ts src/test/task-form-dialog.test.tsx` (green phase: Round 17 focused suites passing, 52/52)
- `npm run lint` (passes with existing react-refresh warnings only after Round 17 updates)
- `npm test -- src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts src/test/task-form-dialog.test.tsx` (green phase: Round 18 focused suites passing, 83/83)
- `npm run lint` (passes with existing react-refresh warnings only after Round 18 updates)
- `npm test -- src/test/task-detail-author-persistence.test.tsx` (red phase: removed `required` attribute assertions failed after Round 18 textarea cleanup)
- `npm test -- src/test/mock-task-filters.test.ts src/test/mock-task-gaps.test.ts src/test/task-form-dialog.test.tsx src/test/task-detail-author-persistence.test.tsx` (green phase: Round 18 focused suites passing, 103/103)
- `npm run lint` (passes with existing react-refresh warnings only after final Round 18 test updates)
- `npm test -- src/test/mock-task-filters.test.ts src/test/task-form-dialog.test.tsx` (green phase: Round 19 focused suites passing, 38/38)
- `npm run lint` (passes with existing react-refresh warnings only after Round 19 updates)
- `npm test -- src/test/mock-task-gaps.test.ts src/test/task-form-dialog.test.tsx src/test/task-detail-author-persistence.test.tsx` (green phase: Round 20 focused suites passing, 76/76)
- `npm test` (full regression suite: 133/133 passing after Round 20 updates)
- `npm run lint` (passes with existing react-refresh warnings only after Round 20 updates)
- `npx tsc --noEmit` (green phase: type-check passes after Round 20 updates)

### Completion Notes List

- ✅ Resolved review finding [HIGH]: corrected `sort=status` order in mock task adapter to `To Do → In Progress → Blocked → Done`.
- ✅ Resolved review finding [HIGH]: added error handling around both sub-task add paths in `TaskDetail.tsx` with destructive toast feedback.
- ✅ Resolved review finding [MEDIUM]: guarded null `description` and `gearId` in task search filtering logic.
- ✅ Resolved review finding [MEDIUM]: added error handling around `toggleSubTask` with destructive toast feedback.
- ✅ Resolved review finding [MEDIUM]: added AC8 fallback tests for inactive stored author and no stored author cases.
- ✅ Resolved review finding [MEDIUM]: added dedicated `sort=status` test coverage in `mock-task-filters.test.ts`.
- ✅ Resolved review finding [LOW]: added error handling around `deleteSubTask` with destructive toast feedback.
- ✅ Resolved review finding [LOW]: added lint import restriction to block direct `mock-api` imports.
- ✅ Resolved review finding [MEDIUM]: added try/catch around `deleteTask` confirm action with destructive toast feedback on failures.
- ✅ Resolved review finding [MEDIUM]: mock `updateTask` now throws `Assignee not found` for invalid assignee IDs, with regression test coverage.
- ✅ Resolved review finding [LOW]: priority sorting now uses `updatedAt` descending as deterministic secondary order.
- ✅ Resolved review finding [LOW]: status sorting now uses `updatedAt` descending as deterministic secondary order.
- ✅ Resolved review finding [LOW]: null-safe assertions added in filter tests for `description` and `gearId`.
- ✅ Resolved review finding [LOW]: sub-task limit tests now use `vi.useFakeTimers()` and complete in seconds without behavior changes.
- ✅ Resolved review finding [MEDIUM]: `createTask` now validates `assigneeId` against members and throws `Assignee not found` when invalid, with targeted test coverage.
- ✅ Resolved review finding [MEDIUM]: `deleteTask` now throws `Task not found` for unknown IDs to match backend semantics.
- ✅ Resolved review finding [LOW]: seed mock task data now stores missing `gearId` as `null` to align with API contract semantics.
- ✅ Resolved review finding [LOW]: strengthened inactive-author fallback test to also assert `taskflow-last-author` persistence.
- ✅ Resolved review finding [LOW]: refactored `resolveWithMockDelay` to a callback-based timer pattern for clearer fake-timer sequencing.
- ✅ Resolved review finding [LOW]: added explicit test coverage for deleting non-existent task IDs.
- ✅ Resolved review finding [MEDIUM]: added `load()` catch handling in `TaskDetail.tsx` to toast and navigate home on API failure, eliminating infinite spinner lock.
- ✅ Resolved review finding [MEDIUM]: mock `deleteSubTask` now throws `Sub-task not found` when the target ID is missing, matching backend-like not-found behavior.
- ✅ Resolved review finding [LOW]: removed dead `data.assigneeName` initialization in `createTask` by explicitly declaring `let assigneeName: string | null`.
- ✅ Resolved review finding [LOW]: replaced fragile positional delete-subtask selector with stable `data-testid` wiring in UI and test.
- ✅ Resolved review finding [LOW]: updated `makeTask` test helper to use `gearId: null` for API contract parity.
- Verified full frontend regression suite (`npm test`) passes and lint passes with existing pre-existing warnings only.
- ✅ Resolved review finding [MEDIUM]: `TaskFormDialog` now normalizes empty `gearId` input to `null` before submit, with focused regression test coverage.
- ✅ Resolved review finding [MEDIUM]: `createTask` and `updateTask` now reject inactive assignees (`Assignee not found`) to match active-member assignment rules, with targeted tests.
- ✅ Resolved review finding [LOW]: inline `createTask` validation test payload now uses `gearId: null` for contract consistency.
- ✅ Resolved review finding [LOW]: `addDailyUpdate` now rejects inactive authors (`Author not found`) with dedicated test coverage.
- ✅ Resolved review finding [LOW]: added explicit `+` button error-path test for `addSubTask` destructive toast handling.
- ✅ Resolved review finding [LOW]: added unmount-safety guard for `TaskDetail.load()` so pending requests do not trigger state updates/toasts/navigation after unmount.
- ✅ Resolved review finding [MEDIUM]: updated `Task` and `CreateTaskData` gearId typing to `string | null` so `UpdateTaskData` correctly permits nullable gear IDs.
- ✅ Resolved review finding [MEDIUM]: added `editUpdateLoading` state to inline daily-update edits, disabling Save during in-flight requests to prevent double-submit races.
- ✅ Resolved review finding [LOW]: `editDailyUpdate` and `deleteDailyUpdate` now bump parent `task.updatedAt`, restoring parity with other task mutations.
- ✅ Resolved review finding [LOW]: added `data-testid="add-subtask-btn"` and updated tests to use stable selector instead of DOM traversal.
- ✅ Resolved review finding [LOW]: strengthened assignee filter test by replacing silent early return with explicit `toBeTruthy()` assertion.
- ✅ Resolved review finding [LOW]: strengthened gear-ID search coverage with a unique gear ID that can only match via `gearId`.
- ✅ Resolved review finding [HIGH]: fixed dashboard client-side status sort order to `To Do → In Progress → Blocked → Done` and aligned with adapter semantics.
- ✅ Resolved review finding [MEDIUM]: added null-safe dashboard search handling for nullable task descriptions.
- ✅ Resolved review finding [MEDIUM]: added `updatedAt` descending tiebreaker for dashboard priority sort and added parity regression coverage.
- ✅ Resolved review finding [MEDIUM]: filtered inactive members out of dashboard assignee filter options.
- ✅ Resolved review finding [MEDIUM]: excluded `assigneeName` from `UpdateTaskData` so callers cannot set denormalized assignee names directly.
- ✅ Resolved review finding [LOW]: removed stale Story 2.2 “WILL FAIL” comment from mock gap tests.
- ✅ Resolved review finding [LOW]: updated `Task.description` typing to `string | null` for API contract parity and safer UI filtering.
- ✅ Resolved review finding [HIGH]: enabled strict TypeScript mode in `tsconfig.app.json` and addressed surfaced type issues.
- ✅ Resolved review finding [MEDIUM]: fixed `TaskFormDialog` edit-mode null-description crash with nullish coalescing (`task.description ?? ''`) and regression coverage.
- ✅ Resolved review finding [MEDIUM]: added `deletingTask` loading/disabled state for delete confirmation to prevent double-submit races and post-navigation error toasts.
- ✅ Resolved review finding [MEDIUM]: added unmount guard to `Index.tsx` load flow so async fetch completion cannot update state after unmount.
- ✅ Resolved review finding [LOW]: added `deleteMember` authored-daily-update guard to prevent dangling `authorId` references.
- ✅ Resolved review finding [LOW]: normalized `createTask` to clear `blockingReason` for non-Blocked statuses.
- ✅ Resolved review finding [LOW]: replaced positional delete confirmation test selector with `data-testid="confirm-delete-task"` and updated tests.
- ✅ Resolved review finding [MEDIUM]: added `deletingUpdate` loading/disabled state for delete-update confirmation to prevent double-submit races.
- ✅ Resolved review finding [MEDIUM]: enabled `noImplicitAny: true` to enforce strict typing consistently.
- ✅ Resolved review finding [MEDIUM]: updated `CreateTaskData.description` and `TaskFormDialog` submit contract to `string | null`, normalizing empty descriptions to `null`.
- ✅ Resolved review finding [LOW]: strengthened no-stored-author fallback test with explicit `localStorage.setItem('taskflow-last-author', 'm1')` assertion.
- ✅ Resolved review finding [LOW]: extended ESLint import restrictions to block direct mock-adapter imports in app code while allowing test-only exceptions.
- ✅ Resolved review finding [LOW]: removed `assigneeName` from `CreateTaskData` and from task-form submit payloads.
- ✅ Resolved review finding [LOW]: wrapped dashboard `load` in `useCallback` and added effect dependency wiring.
- ✅ Resolved review finding [LOW]: stripped `assigneeName` from edit submit payload before calling `updateTask`, with regression test coverage.
- ✅ Resolved review finding [MEDIUM]: added `addingSubTask` state and in-flight guards to prevent duplicate sub-task creation via Enter and + button paths.
- ✅ Resolved review finding [MEDIUM]: added `deletingSubTaskId` guard to prevent double-delete races and spurious error toasts on sub-task removal.
- ✅ Resolved review finding [LOW]: corrected `story-2-2-comprehensive` toast mock to `@/hooks/use-toast` and stabilized the mocked hook return shape.
- ✅ Resolved review finding [LOW]: normalized `makeTask` helper to use `description: null` for API contract parity.
- ✅ Resolved review finding [LOW]: fixed misleading concurrent-subtask test comment to match actual `Promise.all` behavior.
- ✅ Resolved review finding [LOW]: removed dead `assigneeName` cast/strip logic from TaskDetail edit submit and passed typed payload directly.
- ✅ Resolved review finding [MEDIUM]: strengthened `deleteSubTask` race test with an explicit "no destructive toast" assertion to verify the in-flight guard behavior.
- ✅ Resolved review finding [MEDIUM]: committed Story 2.1 backend task CRUD files separately in commit `c07ae3e` to keep Story 2.2 review scope clean.
- ✅ Resolved review finding [LOW]: removed unused `act` import from `story-2-2-comprehensive.test.tsx`.
- ✅ Resolved review finding [LOW]: removed dead `afterEach(() => vi.useRealTimers())` from `story-2-2-comprehensive.test.tsx`.
- ✅ Resolved review finding [LOW]: migrated `story-2-2-comprehensive.test.tsx` imports to `@/` aliases for consistency and path robustness.
- ✅ Resolved review finding [LOW]: removed unnecessary `<Toaster />` renders in `story-2-2-comprehensive.test.tsx` because toast DOM is mocked.
- ✅ Resolved review finding [LOW]: enabled `noUnusedLocals: true` in `tsconfig.app.json` and validated with `npx tsc --noEmit`.
- ✅ Resolved review finding [MEDIUM]: strengthened AC6 invalid-assignee assertion to `.rejects.toThrow('Assignee not found')` in `story-2-2-comprehensive.test.tsx`.
- ✅ Resolved review finding [LOW]: removed stale "currently fails in the mock" comment from AC6 reassignment assertion.
- ✅ Resolved review finding [LOW]: replaced direct `HTMLElement.prototype` mutation stubs with restorable spy setup and explicit descriptor restoration in `afterEach`.
- ✅ Resolved review finding [LOW]: corrected AC7 test commentary to accurately describe Promise.all ordering validation instead of a race-condition claim.
- ✅ Resolved review finding [MEDIUM]: added backend-parity gearId validation (`/^\d{4}$/`) to mock `createTask` and `updateTask`, updated smoke payload to a valid 4-digit gearId, and added invalid-gearId rejection coverage.
- ✅ Resolved review finding [MEDIUM]: fixed `TaskFormDialog` edit initialization to clear inactive assignees to `Unassigned`, with regression coverage in `task-form-dialog.test.tsx`.
- ✅ Resolved review finding [LOW]: added dashboard `sort=updated` parity coverage between `filterAndSortDashboardTasks` and adapter sorting.
- ✅ Resolved review finding [LOW]: corrected File List labels for newly added test files (`task-detail-author-persistence`, `mock-task-filters`, `mock-task-gaps`, `story-2-2-comprehensive`).
- ✅ Resolved review finding [LOW]: converted AC7 comprehensive test path to fake timers with `vi.runAllTimersAsync()` to remove real-time waits.
- ✅ Resolved review finding [LOW]: added a Vitest AC1 guard that scans app source files and blocks direct imports of `@/lib/api/adapters/mock` outside allowed API-layer files/tests.
- ✅ Resolved review finding [MEDIUM]: added 1–1000 content validation and trimming in mock `addDailyUpdate`/`editDailyUpdate`, plus `maxLength={1000}` + `required` on add/edit update textareas in `TaskDetail.tsx`.
- ✅ Resolved review finding [MEDIUM]: added backend-parity length guards for task title/description and sub-task title in mock `createTask`/`updateTask`/`addSubTask`, and added `maxLength` + client-side validation in `TaskFormDialog`.
- ✅ Resolved review finding [LOW]: excluded `updatedAt` from `UpdateTaskData` to keep server-managed fields non-settable from callers.
- ✅ Resolved review finding [LOW]: hardened AC1 guardrail import parsing by switching static import regex to `[\s\S]*?` and added a multi-line import regression test.
- ✅ Resolved review finding [LOW]: removed dead early mounted guard at the top of dashboard `load()` in `Index.tsx`.
- ✅ Resolved review finding [MEDIUM]: added `mountedRef.current` guards to Add Update and inline edit loading-state resets in `TaskDetail.tsx` finally blocks.
- ✅ Resolved review finding [MEDIUM]: enforced non-empty task and sub-task titles in mock adapter with backend-parity errors (`Task title is required`, `Sub-task title is required`) and added regression coverage.
- ✅ Resolved review finding [LOW]: normalized `addSubTask` storage to persist trimmed sub-task titles.
- ✅ Resolved review finding [LOW]: added unique-email validation to `createMember`/`updateMember` in mock adapter with duplicate-email tests.
- ✅ Resolved review finding [MEDIUM]: added `togglingSubTaskId` in-flight guard to sub-task Checkbox toggles in `TaskDetail.tsx`, disabling the active checkbox while toggle is pending to prevent duplicate requests.
- ✅ Resolved review finding [MEDIUM]: normalized `createTask`/`updateTask` storage by trimming task `title` and `description` before validation and persistence, with regression coverage for create and update paths.
- ✅ Resolved review finding [LOW]: updated `assertTaskFieldLengths` to validate title max-length using trimmed length, including a regression test for long raw-but-short-trimmed titles.
- ✅ Resolved review finding [LOW]: fixed `seedData()` bootstrap guard to require both members and tasks keys before skipping seed, with a regression test for members-present/tasks-missing re-seed behavior.
- ✅ Resolved review finding [LOW]: added comprehensive toggle-subtask race-condition coverage verifying a second click is ignored while the first toggle is in flight.
- ✅ Resolved review finding [MEDIUM]: updated `assertSubTaskTitleLength` to enforce the 200-char limit on trimmed title length and added padded-title regression coverage.
- ✅ Resolved review finding [MEDIUM]: normalized blocked-task `blockingReason` persistence by trimming in both `createTask` and `updateTask`, with direct API regression tests.
- ✅ Resolved review finding [LOW]: added blocking-reason max-length parity (`1000`) across mock validation and `TaskFormDialog` UI (`maxLength` + client-side validation).
- ✅ Resolved review finding [LOW]: hardened `updateTask` merge logic to ignore explicit `undefined` partial fields and preserve existing stored values.
- ✅ Resolved review finding [MEDIUM]: mock `deleteMember` now throws `Member not found` for unknown IDs using an existence pre-check, with regression coverage in `mock-task-gaps.test.ts`.
- ✅ Resolved review finding [MEDIUM]: `TaskFormDialog` now initializes fields only when the dialog opens (false → true), preserving in-progress edits across `members` prop refreshes; added rerender regression coverage.
- ✅ Resolved review finding [LOW]: removed dead `required` attributes from TaskDetail daily-update textareas where native form validation is not active.
- ✅ Resolved review finding [LOW]: normalized search query handling to use `search.trim().toLowerCase()` in both mock adapter and dashboard filtering, with padded-query parity test coverage.
- ✅ Resolved review finding [LOW]: aligned `createTask` blocked-validation guard to use the precomputed normalized `blockingReason` variable for consistency with update flow.
- ✅ Resolved review finding [MEDIUM]: fixed mock `getTasks` search guard to skip whitespace-only queries (`filters?.search?.trim()`), plus regression test coverage for parity with no-search behavior.
- ✅ Resolved review finding [LOW]: strengthened padded-search parity test with a non-empty baseline assertion to avoid vacuous pass conditions.
- ✅ Resolved review finding [LOW]: anchored members-refresh preservation test with initial title state assertion before user edits.
- ✅ Resolved review finding [LOW]: aligned create/update blocking-reason normalization variable naming to `normalizedBlockingReason` for parity and readability.
- ✅ Resolved review finding [MEDIUM]: normalized empty-string `description` to `null` in mock `createTask` for direct API-call parity.
- ✅ Resolved review finding [MEDIUM]: normalized empty-string `description` to `null` in mock `updateTask` for partial-update parity.
- ✅ Resolved review finding [MEDIUM]: extracted shared API validation limits into `src/lib/api/constants.ts` and consumed them from `mock.ts`, `TaskFormDialog.tsx`, and `TaskDetail.tsx`.
- ✅ Resolved review finding [LOW]: updated `assertTaskFieldLengths` to validate max description length against trimmed content.
- ✅ Resolved review finding [LOW]: made Task Detail daily-updates rendering order explicit via client-side `createdAt DESC` sorting.
- ✅ Resolved review finding [LOW]: added regression coverage ensuring `createTask({ description: '' })` stores `description: null`.

### File List

- `taskflow-ui/src/lib/api/adapters/mock.ts` (modified)
- `taskflow-ui/src/lib/api/constants.ts` (added)
- `taskflow-ui/src/pages/TaskDetail.tsx` (modified)
- `taskflow-ui/src/components/TaskFormDialog.tsx` (modified)
- `taskflow-ui/src/lib/api/client.ts` (modified)
- `taskflow-ui/src/lib/api/types.ts` (modified)
- `taskflow-ui/src/test/task-detail-author-persistence.test.tsx` (added)
- `taskflow-ui/src/test/mock-task-filters.test.ts` (added)
- `taskflow-ui/src/test/mock-task-gaps.test.ts` (added)
- `taskflow-ui/src/test/task-form-dialog.test.tsx` (added)
- `taskflow-ui/eslint.config.js` (modified)
- `taskflow-ui/src/pages/Index.tsx` (modified)
- `taskflow-ui/src/lib/dashboard/tasks.ts` (added)
- `taskflow-ui/src/lib/api/adapters/mock.smoke.test.ts` (modified)
- `taskflow-ui/tsconfig.app.json` (modified)
- `taskflow-ui/src/test/story-2-2-comprehensive.test.tsx` (added)
- `taskflow-ui/src/test/no-direct-mock-adapter-imports.test.ts` (added)

### Change Log

- 2026-02-18: Completed Story 2.2 implementation for AC6-AC8 with regression-safe updates and added targeted UI test coverage for author persistence.
- 2026-02-18: Addressed code review findings - 9 items resolved (HIGH: 2, MEDIUM: 5, LOW: 2); story is now ready for review.
- 2026-02-18: Second code review pass — 6 new action items added (2 Medium, 4 Low); story returned to in-progress.
- 2026-02-18: Addressed second code review pass - 6 items resolved (MEDIUM: 2, LOW: 4); story returned to review.
- 2026-02-18: Third code review pass — 6 new action items added (2 Medium, 4 Low); story remains in `review`.
- 2026-02-18: Addressed third code review pass - 6 items resolved (MEDIUM: 2, LOW: 4); story returned to review.
- 2026-02-19: Addressed fourth code review pass - 5 items resolved (MEDIUM: 2, LOW: 3); story returned to review.
- 2026-02-20: Fifth code review pass — 6 new action items added (MEDIUM: 2, LOW: 4); story returned to in-progress.
- 2026-02-20: Addressed fifth code review pass - 6 items resolved (MEDIUM: 2, LOW: 4); story returned to review.
- 2026-02-20: Sixth code review pass — 6 new action items added (MEDIUM: 2, LOW: 4); story returned to in-progress.
- 2026-02-20: Addressed sixth code review pass - 6 items resolved (MEDIUM: 2, LOW: 4); story returned to review.
- 2026-02-20: Seventh code review pass — 7 new action items added (HIGH: 1, MEDIUM: 4, LOW: 2); story returned to in-progress.
- 2026-02-20: Addressed seventh code review pass - 7 items resolved (HIGH: 1, MEDIUM: 4, LOW: 2); story returned to review.
- 2026-02-21: Eighth code review pass — 7 new action items added (HIGH: 1, MEDIUM: 3, LOW: 3); story returned to in-progress.
- 2026-02-21: Addressed eighth code review pass - 7 items resolved (HIGH: 1, MEDIUM: 3, LOW: 3); story returned to review.
- 2026-02-21: Ninth code review pass — 8 new action items added (MEDIUM: 3, LOW: 5); story returned to in-progress.
- 2026-02-21: Addressed ninth code review pass - 8 items resolved (MEDIUM: 3, LOW: 5); story returned to review.
- 2026-02-21: Tenth code review pass — 7 new action items added (MEDIUM: 2, LOW: 5); story returned to in-progress.
- 2026-02-21: Addressed tenth code review pass - 7 items resolved (MEDIUM: 2, LOW: 5); story returned to review.
- 2026-02-22: Eleventh code review pass — 7 new action items added (MEDIUM: 2, LOW: 5); story returned to in-progress.
- 2026-02-22: Twelfth code review pass — 4 new action items added (MEDIUM: 1, LOW: 3); story returned to in-progress.
- 2026-02-22: Addressed eleventh code review pass - 7 items resolved (MEDIUM: 2, LOW: 5); story returned to review.
- 2026-02-22: Addressed twelfth code review pass - 4 items resolved (MEDIUM: 1, LOW: 3); story returned to review.
- 2026-02-22: Thirteenth code review pass — 6 new action items added (MEDIUM: 2, LOW: 4); story returned to in-progress.
- 2026-02-22: Addressed thirteenth code review pass - 6 items resolved (MEDIUM: 2, LOW: 4); story returned to review.
- 2026-02-22: Fourteenth code review pass — 5 new action items added (MEDIUM: 2, LOW: 3); story returned to in-progress.
- 2026-02-22: Addressed fourteenth code review pass - 5 items resolved (MEDIUM: 2, LOW: 3); story returned to review.
- 2026-02-22: Fifteenth code review pass — 4 new action items added (MEDIUM: 2, LOW: 2); story returned to in-progress.
- 2026-02-22: Addressed fifteenth code review pass - 4 items resolved (MEDIUM: 2, LOW: 2); story returned to review.
- 2026-02-22: Sixteenth code review pass — 5 new action items added (MEDIUM: 2, LOW: 3); story returned to in-progress.
- 2026-02-22: Addressed sixteenth code review pass - 5 items resolved (MEDIUM: 2, LOW: 3); story returned to review.
- 2026-02-22: Seventeenth code review pass — 4 new action items added (MEDIUM: 2, LOW: 2); story returned to in-progress.
- 2026-02-22: Addressed seventeenth code review pass - 4 items resolved (MEDIUM: 2, LOW: 2); story returned to review.
- 2026-02-22: Eighteenth code review pass — 5 new action items added (MEDIUM: 2, LOW: 3); story returned to in-progress.
- 2026-02-22: Addressed eighteenth code review pass - 5 items resolved (MEDIUM: 2, LOW: 3); story returned to review.
- 2026-02-22: Nineteenth code review pass — 4 new action items added (MEDIUM: 1, LOW: 3); story returned to in-progress.
- 2026-02-22: Addressed nineteenth code review pass - 4 items resolved (MEDIUM: 1, LOW: 3); story returned to review.
- 2026-02-22: Twentieth code review pass — 6 new action items added (MEDIUM: 3, LOW: 3); story returned to in-progress.
- 2026-02-22: Addressed twentieth code review pass - 6 items resolved (MEDIUM: 3, LOW: 3); story returned to review.
