````markdown
# Lovable AI Prompt — Story 3.3: Sub-Tasks & Daily Updates UI (Remediation)

**Generated:** 2026-02-28
**Mode:** Remediation
**Story:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`
**Source:** Code review follow-ups + `_bmad-output/test-artifacts/test-design-epic-3-story-3.3.md`

---

## Objective

Fix **11 review follow-ups** and complete **5 unchecked story tasks** from the Story 3.3 initial implementation. Two issues are **CRITICAL** (compilation failures), three are **HIGH** (missing tests, accessibility), four are **MEDIUM** (UI spec deviations, lint), two are **LOW** (code quality). All changes are in `taskflow-ui/` only.

### Unchecked Story Tasks → Issue Mapping

These story tasks remain unchecked. Each maps to a review follow-up issue below. Completing the issues completes the tasks.

| Unchecked Task | Description | Resolved By |
|---|---|---|
| **Task 4.3** | Hover-to-reveal Edit/Delete buttons (`opacity-0 group-hover:opacity-100`) | Issue **M1** |
| **Task 4.4** | "Past edit window" `<Tooltip>` with `italic` span for updates > 24h | Issue **M2** (Tooltip structure exists, missing `italic` class) |
| **Task 5.1** | Replace inline sections with extracted components in TaskDetail.tsx | Issues **C1 + C2** (components already wired, but dead code from extraction blocks `tsc`) |
| **Task 6.2** | Tests for sub-task inline edit + drag reorder (optimistic + error rollback) | Issue **H2** |
| **Task 6.3** | Tests for daily update 24h gating, edit/delete 403 error toasts, newest-first | Issue **H3** |

Once all issues below are resolved, **Tasks 4, 5, and 6** (and their parent checkboxes) can be marked complete.

---

## Issues

### CRITICAL — Must fix (blocks compilation)

#### C1: Remove dead `handleAddSubTask` function from TaskDetail.tsx

**File:** `src/pages/TaskDetail.tsx`, lines 82–94
**Problem:** After component extraction, a dead `handleAddSubTask` function remains. It references undeclared variables (`newSub`, `addingSubTask`, `setAddingSubTask`, `setNewSub`) that were moved to `SubTaskList.tsx`. This causes `tsc` compilation failure.
**Fix:** Delete the entire `handleAddSubTask` function (lines 82–94):

```typescript
// DELETE THIS ENTIRE BLOCK (lines 82-94):
const handleAddSubTask = async () => {
  const title = newSub.trim();
  if (!title || addingSubTask) return;
  setAddingSubTask(true);
  try {
    await apiClient.addSubTask(task.id, { title });
    setNewSub('');
    load();
  } catch (err) {
    toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
  } finally {
    if (mountedRef.current) setAddingSubTask(false);
  }
};
```

#### C2: Remove unused imports and constants from TaskDetail.tsx

**File:** `src/pages/TaskDetail.tsx`, line 14 and line 20
**Problem:** `MAX_DAILY_UPDATE_CONTENT_LENGTH` and `MAX_SUBTASK_TITLE_LENGTH` are imported but unused (moved to child components). `LAST_AUTHOR_KEY` constant is declared but unused (moved to `DailyUpdateFeed.tsx`).
**Fix:**
1. Remove line 14 entirely:
   ```typescript
   // DELETE: import { MAX_DAILY_UPDATE_CONTENT_LENGTH, MAX_SUBTASK_TITLE_LENGTH } from '@/lib/api/constants';
   ```
2. Remove line 20 entirely:
   ```typescript
   // DELETE: const LAST_AUTHOR_KEY = 'taskflow-last-author';
   ```

---

### HIGH — Must fix (accessibility + test coverage gaps)

#### H1: Add keyboard accessibility to sub-task inline title edit

**File:** `src/components/SubTaskList.tsx`, lines 128–133
**Problem:** The `<span>` for sub-task title only responds to `onClick`. Keyboard users cannot trigger inline edit mode.
**Fix:** Add `role="button"`, `tabIndex={0}`, and `onKeyDown` handler:

```tsx
<span
  className={cn('text-sm flex-1 cursor-pointer hover:underline', completed && 'line-through text-muted-foreground')}
  onClick={() => { setEditing(true); setEditTitle(sub.title); }}
  role="button"
  tabIndex={0}
  onKeyDown={e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setEditing(true);
      setEditTitle(sub.title);
    }
  }}
>
  {sub.title}
</span>
```

#### H2: Write Story 3.3 tests — sub-task inline edit + drag reorder

**File:** Create `src/test/story-3-3-subtask-edit-reorder.test.tsx`
**Problem:** Task 6.2 is unchecked — no tests exist for sub-task inline editing or drag-and-drop reorder (optimistic + error rollback paths).
**Tests to implement** (sourced from test design):

| Test ID | Scenario | Priority |
|---|---|---|
| CMP-009 | Drag-and-drop reorder calls `reorderSubTasks` with correct ordered IDs | P0 |
| CMP-010 | **NEG:** Reorder API failure → sub-task list reverts to pre-drag order + destructive toast | P0 |
| CMP-018 | Inline edit: click title → input appears, Enter saves, blur saves, Escape cancels | P1 |
| CMP-019 | **NEG:** Inline edit empty title → validation toast, reverts to original | P1 |
| CMP-020 | **NEG:** Inline edit whitespace-only → validation toast, reverts | P1 |
| CMP-021 | **NEG:** Inline edit > 200 chars → validation toast | P1 |
| CMP-031 | Keyboard DnD: Arrow keys + Space triggers reorder | P1 |
| CMP-033 | Single sub-task drag is no-op (no API call) | P2 |
| CMP-041 | Inline edit: Escape cancels without API call, restores original title | P2 |

**Testing approach for DnD:** Mock the `onDragEnd` handler at callback level — construct a synthetic `DragEndEvent` with `active.id` and `over.id`, invoke it directly, then assert `reorderSubTasks` was called with the expected ID array. This is more reliable than pointer event simulation in jsdom.

**Testing approach for inline edit:** Use `@testing-library/react`:
1. `fireEvent.click(titleSpan)` → assert `<Input>` appears with current title
2. Change value, `fireEvent.keyDown(input, { key: 'Enter' })` → assert `editSubTask` called
3. `fireEvent.keyDown(input, { key: 'Escape' })` → assert original title restored, no API call

**Mock setup:** Mock `apiClient` methods using `vi.spyOn()` or `vi.fn()`. For error paths, make the mock reject with `new Error('test error')` and assert destructive toast appears.

#### H3: Write Story 3.3 tests — daily update 24h gating + error handling

**File:** Create `src/test/story-3-3-daily-update-gating.test.tsx`
**Problem:** Task 6.3 is unchecked — no tests for "Past edit window" indicator, 24h gating UI, edit/delete 403 error toasts, or newest-first rendering.
**Tests to implement** (sourced from test design):

| Test ID | Scenario | Priority |
|---|---|---|
| CMP-005 | Daily updates render newest-first with author, timestamp, content, "(edited)" indicator | P0 |
| CMP-006 | Edit button visible and functional for updates < 24h old | P0 |
| CMP-007 | **NEG:** Edit/delete buttons hidden for updates > 24h; "Past edit window" indicator shown | P0 |
| CMP-013 | **NEG:** Edit save returns error → destructive toast, content unchanged | P0 |
| CMP-022 | Edit flow: textarea replaces content, save calls `editDailyUpdate`, "(edited)" appears | P1 |
| CMP-023 | **NEG:** Delete button hidden for updates > 24h old | P1 |
| CMP-024 | "Past edit window" tooltip on old updates | P1 |
| CMP-025 | Delete daily update: AlertDialog confirmation, then `deleteDailyUpdate` called | P1 |
| CMP-026 | **NEG:** Delete returns error → destructive toast, update not removed | P1 |
| CMP-034 | Zero daily updates: shows "No updates yet." | P2 |
| CMP-037 | After successful edit, "(edited)" badge appears without full page reload | P2 |

**Mock setup:**
- Use `vi.useFakeTimers()` to control timestamps for 24h boundary testing
- Create mock daily updates with `createdAt` values: 1 hour ago (editable), 25 hours ago (locked), exactly 24 hours ago (boundary)
- Mock `apiClient.editDailyUpdate` to throw `new Error('Updates can only be edited within 24 hours.')` for 403 simulation
- Mock `apiClient.deleteDailyUpdate` to throw `new Error('Updates can only be deleted within 24 hours.')` for 403 simulation

---

### MEDIUM — Should fix (UI spec compliance + lint)

#### M1: Add hover-to-reveal for daily update Edit/Delete buttons

**File:** `src/components/DailyUpdateFeed.tsx`
**Problem:** Edit/Delete buttons for editable daily updates are always visible. Story Task 4.3 requires hover-to-reveal pattern (`opacity-0 group-hover:opacity-100`), matching how sub-task delete buttons work.
**Fix:** On the editable branch (where `isWithin24Hours(upd.createdAt)` is true), update the div wrapper:

```tsx
{editable ? (
  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100">
```

Also ensure the parent card div has the `group` class:
```tsx
<div key={upd.id} className="rounded-md border p-3 space-y-1 group">
```

#### M2: Add `italic` class to "Past edit window" span

**File:** `src/components/DailyUpdateFeed.tsx`, line ~158
**Problem:** The "Past edit window" `<span>` is missing the `italic` class. Story Task 4.4 explicitly requires `className="text-xs text-muted-foreground italic"`.
**Current:**
```tsx
<span className="text-xs text-muted-foreground cursor-default">Past edit window</span>
```
**Fix:**
```tsx
<span className="text-xs text-muted-foreground italic cursor-default">Past edit window</span>
```

#### M3: Fix optional chaining lint warnings in mock.ts

**File:** `src/lib/api/adapters/mock.ts`, lines 263, 312, 421
**Problem:** Lint warns on `!member || !member.active` pattern — should use optional chaining.
**Fix all 3 occurrences:**
```typescript
// Line 263: if (!member || !member.active) → 
if (!member?.active) throw new Error('Assignee not found');

// Line 312: if (!member || !member.active) → 
if (!member?.active) throw new Error('Assignee not found');

// Line 421: if (!author || !author.active) → 
if (!author?.active) throw new Error('Author not found');
```

#### M4: Update story File Map

**File:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`
**Problem:** File Map section doesn't list all changed files.
**Fix:** Add missing entries to the File Map table:
- `src/components/TaskFormDialog.tsx` | Modified | Component adjustments during extraction
- `src/lib/api/adapters/mock.smoke.test.ts` | Modified | Added subtask edit/reorder smoke tests
- `src/test/no-direct-mock-adapter-imports.test.ts` | Modified | Lint rule compliance
- `tsconfig.app.json` | Modified | Target bumped ES2020→ES2021
- `tsconfig.json` | Modified | Reformatted

---

### LOW — Nice-to-have (code quality)

#### L1: Mark component props as `Readonly<>`

**Files:** `src/components/SubTaskList.tsx`, `src/components/DailyUpdateFeed.tsx`, `src/components/TaskFormDialog.tsx`
**Problem:** ESLint rule requires component props typed as `Readonly<>`.
**Fix:** Update function signatures:
```typescript
// SubTaskList.tsx
export function SubTaskList({ taskId, subTasks, onMutate }: Readonly<SubTaskListProps>) {

// DailyUpdateFeed.tsx
export function DailyUpdateFeed({ taskId, dailyUpdates, members, onMutate }: Readonly<DailyUpdateFeedProps>) {

// SortableSubTaskItem (inner component)
function SortableSubTaskItem({ sub, taskId, onMutate }: Readonly<{ sub: SubTask; taskId: string; onMutate: () => void }>) {
```

#### L2: Restore trailing newlines in tsconfig files

**Files:** `tsconfig.json`, `tsconfig.app.json`
**Problem:** Trailing newlines were stripped during reformatting. Restore them for POSIX compliance.

---

## Constraints

### Architectural Rules

- **All changes inside `taskflow-ui/` only.** No backend changes.
- **Use `apiClient` from `@/lib/api` exclusively** — no direct `fetch()` or `axios` calls.
- **Do NOT create or modify `src/lib/api/adapters/real.ts`** — mock adapter only.
- **Do NOT migrate to TanStack Query.** Continue using `apiClient` + `useEffect` + manual `load()` pattern.
- **camelCase in TypeScript.** Snake_case conversion only happens in the real adapter (not yet built).
- **Import paths:** Use `@/` alias. Import types from `@/types`. Import apiClient from `@/lib/api`. Import constants from `@/lib/api/constants`.

### UI / UX Rules

- Use only existing `shadcn/ui` components and `lucide-react` icons.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Existing date utilities from `@/lib/date-utils.ts` — `formatRelativeDate()` and `isWithin24Hours()`.
- Constants from `@/lib/api/constants.ts` — `MAX_SUBTASK_TITLE_LENGTH` (200), `MAX_DAILY_UPDATE_CONTENT_LENGTH` (1000).

### Strings & Test IDs (DO NOT RENAME)

Preserve these exact strings — existing tests depend on them:
- `"No updates yet."` — empty daily updates state
- `"Maximum of 20 sub-tasks per task"` — mock adapter error message
- `"(edited)"` — edited indicator on daily updates
- `"Past edit window"` — tooltip trigger text
- `"Updates can only be edited within 24 hours"` — tooltip content
- `data-testid="add-subtask-btn"` — add sub-task button
- `data-testid="delete-subtask-{id}"` — per-sub-task delete button
- `data-testid="confirm-delete-update"` — confirm delete update button
- `data-testid="confirm-delete-task"` — confirm delete task button
- `localStorage` key: `taskflow-last-author`

### Error Handling Pattern (all API calls)

```typescript
try { /* mutation */ } catch (err) {
  const msg = err instanceof Error ? err.message : 'An error occurred';
  toast({ variant: 'destructive', title: 'Error', description: msg });
}
```

---

## Testing Requirements

Source: `_bmad-output/test-artifacts/test-design-epic-3-story-3.3.md`

> All tests are Vitest component/unit tests (`@testing-library/react` + `vitest` + `jsdom`). No E2E/Playwright.

### Tests Required by This Remediation

This remediation addresses **Task 6.2** (sub-task inline edit + drag reorder tests) and **Task 6.3** (daily update 24h gating tests). Combined, they cover:

**P0 (Critical — must pass 100%):**
- CMP-009: Drag reorder calls `reorderSubTasks` with correct IDs
- CMP-010: NEG: Reorder failure → revert + toast
- CMP-005: Daily updates render newest-first with indicators
- CMP-006: Edit button visible for updates < 24h
- CMP-007: NEG: Edit/delete hidden > 24h, "Past edit window" shown
- CMP-013: NEG: Edit save error → destructive toast

**P1 (High — should pass ≥95%):**
- CMP-018: Inline edit UX (click→input, Enter saves, Escape cancels)
- CMP-019: NEG: Inline edit empty → toast + revert
- CMP-020: NEG: Inline edit whitespace → toast + revert
- CMP-021: NEG: Inline edit > 200 chars → toast
- CMP-022: Edit daily update flow complete with "(edited)"
- CMP-023: NEG: Delete button hidden > 24h
- CMP-024: "Past edit window" tooltip
- CMP-025: Delete confirmation flow
- CMP-026: NEG: Delete error → toast
- CMP-031: Keyboard DnD reorder

**P2 (Medium — edge cases):**
- CMP-033: Single-item drag no-op
- CMP-034: Zero updates empty state
- CMP-037: "(edited)" badge after edit
- CMP-041: Escape cancels inline edit

### Test Data Requirements

- Mock tasks with **0, 1, 3+** sub-tasks
- Mock daily updates with timestamps: **< 24h** (editable), **> 24h** (locked), **exactly 24h** (boundary)
- Use `vi.useFakeTimers()` for 24h boundary tests
- Active and inactive team members for author dropdown

### DnD Testing Approach

Use **callback-level testing** (recommended for jsdom):
1. Import `DragEndEvent` type from `@dnd-kit/core`
2. Create a synthetic event: `{ active: { id: 'id1' }, over: { id: 'id2' } }`
3. Call the `onDragEnd` handler directly
4. Assert `apiClient.reorderSubTasks` called with expected ID order
5. For error path: mock rejection, assert list order reverts

### Regression Requirement

After ALL changes, these existing test suites **MUST** still pass:
- `src/test/story-2-2-comprehensive.test.tsx`
- `src/test/task-detail-author-persistence.test.tsx`
- `src/lib/api/adapters/mock.smoke.test.ts`

### Quality Gate

- P0: 100% pass rate
- P1: ≥95%
- All negative scenarios (N1–N20 from test design) with implementations must pass
- Existing regression suite 100% green
- `tsc --noEmit` passes with zero errors (validates C1/C2 fixes)

---

## Verification Checklist

Before marking complete:

**Compilation (C1 + C2 → completes Task 5.1):**
- [ ] `tsc --noEmit` passes (dead code removed)
- [ ] No unused imports in `TaskDetail.tsx`
- [ ] `LAST_AUTHOR_KEY` constant removed from `TaskDetail.tsx` (exists only in `DailyUpdateFeed.tsx`)

**Accessibility (H1):**
- [ ] Sub-task title `<span>` has `role="button"`, `tabIndex={0}`, Enter/Space keyboard handler

**UI Spec Compliance (M1 → completes Task 4.3, M2 → completes Task 4.4):**
- [ ] Daily update Edit/Delete buttons use `opacity-0 group-hover:opacity-100` pattern
- [ ] Parent card div has `group` class for hover-to-reveal
- [ ] "Past edit window" span has `italic` class

**Lint (M3):**
- [ ] `mock.ts` uses `!member?.active` (3 occurrences)

**Code Quality (L1, L2):**
- [ ] Component props use `Readonly<>` wrapper
- [ ] `tsconfig.json` and `tsconfig.app.json` have trailing newlines

**Tests (H2 → completes Task 6.2, H3 → completes Task 6.3):**
- [ ] New test file `story-3-3-subtask-edit-reorder.test.tsx` exists and passes
- [ ] New test file `story-3-3-daily-update-gating.test.tsx` exists and passes
- [ ] Existing tests pass: `story-2-2-comprehensive`, `task-detail-author-persistence`, `mock.smoke`

**Final:**
- [ ] App renders without console errors
- [ ] All unchecked story tasks (4.3, 4.4, 5.1, 6.2, 6.3) can now be checked off

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/pages/TaskDetail.tsx` | Modify | Remove dead `handleAddSubTask`, unused imports, unused `LAST_AUTHOR_KEY` |
| `src/components/SubTaskList.tsx` | Modify | Add keyboard accessibility to inline edit span |
| `src/components/DailyUpdateFeed.tsx` | Modify | Add hover-to-reveal on Edit/Delete, add `italic` to "Past edit window", add `group` class |
| `src/lib/api/adapters/mock.ts` | Modify | Fix optional chaining lint (3 occurrences) |
| `src/test/story-3-3-subtask-edit-reorder.test.tsx` | Create | Tests for inline edit + drag reorder (Task 6.2) |
| `src/test/story-3-3-daily-update-gating.test.tsx` | Create | Tests for 24h gating + error toasts (Task 6.3) |
| `tsconfig.json` | Modify | Restore trailing newline |
| `tsconfig.app.json` | Modify | Restore trailing newline |

````
