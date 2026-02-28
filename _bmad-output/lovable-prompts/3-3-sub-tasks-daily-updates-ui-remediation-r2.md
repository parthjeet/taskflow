# Lovable AI Prompt — Story 3.3: Sub-Tasks & Daily Updates UI (Remediation Round 2)

**Generated:** 2026-02-28
**Mode:** Remediation (Round 2)
**Story:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`
**Source:** Code review follow-ups Round 2 + `_bmad-output/test-artifacts/test-design-epic-3-story-3.3.md`

---

## Objective

Fix **4 review follow-ups** from the Story 3.3 Round 2 code review. One issue is **HIGH** (dead test assertion that silently passes), three are **MEDIUM** (double-save race condition, missing `useMemo`, broken `useCallback` memoization). All changes are in `taskflow-ui/` only — two files touched.

---

## Issues

### HIGH — Must fix (test correctness)

#### H1: Fix dead assertion in test CMP-041

**File:** `src/test/story-3-3-subtask-edit-reorder.test.tsx`, line 52
**Problem:** The assertion `.not.toBeDefined` without `()` is a property access, not a method call. It always evaluates to `true` — the test never actually verifies that `editSubTask` was not called. This means the Escape-cancel test (CMP-041 from test design) provides zero coverage.

**Current (broken):**
```typescript
expect(apiClient.editSubTask).not.toBeDefined; // ← property access, always passes
```

**Fix:** Set up a spy before the test and assert it was not called:
```typescript
it('CMP-041: Escape cancels without API call', () => {
  const editSpy = vi.spyOn(apiClient, 'editSubTask').mockResolvedValue({ ...sub1, title: 'Changed' });
  render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

  fireEvent.click(screen.getByText('First'));
  const input = screen.getByDisplayValue('First');
  fireEvent.change(input, { target: { value: 'Changed' } });
  fireEvent.keyDown(input, { key: 'Escape' });

  expect(screen.getByText('First')).toBeInTheDocument();
  expect(editSpy).not.toHaveBeenCalled();
});
```

**Why this matters:** Test design scenario CMP-041 (P2) requires: "Escape key cancels without API call, restores original title." The current test gives false confidence — it passes even if `editSubTask` is actually called on Escape.

**Test design reference:** CMP-041 (Negative scenario N9 in test design)

---

### MEDIUM — Should fix (runtime correctness + performance)

#### M1: Guard against double `saveEdit` call in SubTaskList.tsx

**File:** `src/components/SubTaskList.tsx`, lines 119–125 (the `<Input>` element inside `SortableSubTaskItem`)
**Problem:** When a user presses Enter to save an inline edit:
1. `onKeyDown` fires → calls `saveEdit()`
2. `saveEdit()` sets `setEditing(false)` → input unmounts → `onBlur` fires → calls `saveEdit()` again

This causes `apiClient.editSubTask` to be called **twice** for the same edit. The second call is redundant (title matches after first save) but still fires a network request and toast if the first hasn't resolved yet.

**Fix:** Add a `useRef` guard to prevent re-entrant `saveEdit` calls:

```tsx
// Inside SortableSubTaskItem, add after existing refs:
const savingRef = useRef(false);

// Update saveEdit to guard:
const saveEdit = useCallback(async () => {
  if (savingRef.current) return;
  savingRef.current = true;
  try {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      toast({ variant: 'destructive', title: 'Error', description: 'Sub-task title is required' });
      setEditTitle(sub.title);
      setEditing(false);
      return;
    }
    if (trimmed.length > MAX_SUBTASK_TITLE_LENGTH) {
      toast({ variant: 'destructive', title: 'Error', description: `Sub-task title must be ${MAX_SUBTASK_TITLE_LENGTH} characters or fewer` });
      setEditTitle(sub.title);
      setEditing(false);
      return;
    }
    if (trimmed === sub.title) {
      setEditing(false);
      return;
    }
    try {
      await apiClient.editSubTask(taskId, sub.id, { title: trimmed });
      onMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    }
    setEditing(false);
  } finally {
    savingRef.current = false;
  }
}, [editTitle, sub.title, sub.id, taskId, onMutate, toast]);
```

**Risk link:** This relates to test design risk R-003 (inline title editing validation edge cases). Without this fix, rapid Enter-then-blur sequences may produce duplicate API calls or double toasts.

---

#### M2: Memoize `sorted` array in SubTaskList.tsx

**File:** `src/components/SubTaskList.tsx`, line 164
**Problem:** `const sorted = [...subTasks].sort(...)` creates a new array reference on every render. This:
- Causes `displayItems` to change identity every render even when `subTasks` hasn't changed
- Defeats `useCallback` memoization on `handleDragEnd` (which depends on `sorted` — see M3)
- Is inconsistent with `DailyUpdateFeed.tsx` which correctly uses `useMemo` for its `sortedUpdates`

**Current:**
```typescript
const sorted = [...subTasks].sort((a, b) => a.position - b.position);
```

**Fix:** Add `useMemo` import (already has `useState, useRef, useCallback` — add `useMemo` to the import) and wrap:
```typescript
const sorted = useMemo(
  () => [...subTasks].sort((a, b) => a.position - b.position),
  [subTasks],
);
```

This matches the pattern already established in `DailyUpdateFeed.tsx:41-43`:
```typescript
const sortedUpdates = useMemo(
  () => [...dailyUpdates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [dailyUpdates],
);
```

---

#### M3: Fix `handleDragEnd` broken memoization in SubTaskList.tsx

**File:** `src/components/SubTaskList.tsx`, line 192
**Problem:** `handleDragEnd` is wrapped in `useCallback` but depends on `sorted` in its dependency array. Since `sorted` is an unmemoized array that gets a new reference every render, `useCallback` recreates `handleDragEnd` on every render, defeating its purpose.

**Fix:** This is **automatically resolved** when M2 is applied. Once `sorted` is memoized via `useMemo`, `handleDragEnd`'s `useCallback` will only recreate when `subTasks` actually changes.

No additional code change needed — just verify that `sorted` is in the dependency array of `handleDragEnd` (it already is) and that M2's `useMemo` fix is in place.

---

## Constraints

### Architectural Rules

- **All changes inside `taskflow-ui/` only.** No backend changes.
- **Use `apiClient` from `@/lib/api` exclusively** — no direct `fetch()` or `axios` calls.
- **Do NOT create or modify `src/lib/api/adapters/real.ts`** — mock adapter only.
- **Do NOT migrate to TanStack Query.** Continue using `apiClient` + `useEffect` + manual `load()` pattern.
- **camelCase in TypeScript.** Snake_case conversion only happens in the real adapter (not yet built).
- **Import paths:** Use `@/` alias. Import types from `@/types`. Import apiClient from `@/lib/api`. Import constants from `@/lib/api/constants`.

### Strings & Test IDs (DO NOT RENAME)

Preserve these exact strings — existing tests depend on them:
- `"Sub-task title is required"` — validation error toast
- `"Sub-task title must be 200 characters or fewer"` — validation error toast
- `data-testid="add-subtask-btn"` — add sub-task button
- `data-testid="delete-subtask-{id}"` — per-sub-task delete button

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

### Tests Modified by This Remediation

**H1 fixes test CMP-041 (P2 — Escape cancels inline edit):**
- Set up `vi.spyOn(apiClient, 'editSubTask')` before the test
- After Escape keydown, assert `editSpy.not.toHaveBeenCalled()` (method call, not property access)
- Assert original title "First" is restored in the DOM

**Test design reference for CMP-041:**
| # | Scenario | Expected Behavior | Test ID |
|---|---|---|---|
| N9 | Inline edit: Escape key pressed during edit | Cancels edit, restores original title, no API call | 3.3-CMP-041 |

### Regression Requirement

After ALL changes, these existing test suites **MUST** still pass:
- `src/test/story-2-2-comprehensive.test.tsx`
- `src/test/task-detail-author-persistence.test.tsx`
- `src/lib/api/adapters/mock.smoke.test.ts`
- `src/test/story-3-3-subtask-edit-reorder.test.tsx` (all 16 tests)
- `src/test/story-3-3-daily-update-gating.test.tsx` (all 16 tests)

### Quality Gate

- All existing tests pass (100%)
- CMP-041 test now properly asserts `editSubTask` was not called (spy-based assertion)
- `tsc --noEmit` passes with zero errors

---

## Verification Checklist

Before marking complete:

**Test Fix (H1):**
- [ ] `story-3-3-subtask-edit-reorder.test.tsx` CMP-041 test uses `vi.spyOn(apiClient, 'editSubTask')` and asserts `.not.toHaveBeenCalled()`
- [ ] The dead `.not.toBeDefined` property access is gone
- [ ] CMP-041 test still passes

**Double-Save Guard (M1):**
- [ ] `SortableSubTaskItem` has a `savingRef = useRef(false)` guard
- [ ] `saveEdit` returns early if `savingRef.current` is true
- [ ] `savingRef.current` is reset to `false` in a `finally` block
- [ ] Enter-then-blur sequence only calls `apiClient.editSubTask` once

**Memoization (M2 + M3):**
- [ ] `useMemo` is imported in `SubTaskList.tsx`
- [ ] `sorted` is wrapped in `useMemo(() => [...subTasks].sort(...), [subTasks])`
- [ ] `handleDragEnd` `useCallback` dependency on `sorted` now has stable identity

**Regression:**
- [ ] All existing test suites pass unchanged
- [ ] `tsc --noEmit` passes with zero errors

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/SubTaskList.tsx` | Modify | Add `savingRef` guard to `saveEdit` (M1), memoize `sorted` array with `useMemo` (M2, resolves M3) |
| `src/test/story-3-3-subtask-edit-reorder.test.tsx` | Modify | Fix dead assertion in CMP-041 test — replace `.not.toBeDefined` with `vi.spyOn` + `.not.toHaveBeenCalled()` (H1) |
