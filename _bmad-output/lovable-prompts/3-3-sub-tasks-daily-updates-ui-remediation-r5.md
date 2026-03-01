# Lovable AI Prompt — Story 3.3: Sub-Tasks & Daily Updates UI (Remediation Round 5)

**Generated:** 2026-03-01
**Mode:** Remediation (Round 5)
**Story:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`
**Source:** Code review follow-ups Round 5 + `_bmad-output/test-artifacts/test-design-epic-3-story-3.3.md`

---

## Objective

Fix **3 review follow-ups** from the Story 3.3 Round 5 code review. Two issues are **MEDIUM** (missing aria-label on delete button, missing component-level delete flow tests), one is **LOW** (no confirmation dialog for sub-task deletion — UX inconsistency). All changes are in `taskflow-ui/` only — two files touched.

---

## Issues

### MEDIUM — Must fix

#### M1: Sub-task delete button missing `aria-label`

**File:** `src/components/SubTaskList.tsx`, the `<Button>` in `SortableSubTaskItem` (~line 148)
**Problem:** The icon-only delete button renders an `<X>` icon with no accessible name. Screen readers announce it as an unlabeled button. The drag handle already has `aria-label="Reorder sub-task"` but the delete button was overlooked.

**Current code:**
```tsx
<Button
  variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
  data-testid={`delete-subtask-${sub.id}`}
  disabled={deleting}
  onClick={handleDelete}
>
  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
</Button>
```

**Fix:** Add `aria-label="Delete sub-task"` to the `<Button>`:
```tsx
<Button
  variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
  data-testid={`delete-subtask-${sub.id}`}
  aria-label="Delete sub-task"
  disabled={deleting}
  onClick={handleDelete}
>
  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
</Button>
```

---

#### M2: Missing component-level test for sub-task delete flow

**File:** `src/test/story-3-3-subtask-edit-reorder.test.tsx`
**Problem:** The existing `CMP-012` tests only verify that `data-testid="delete-subtask-{id}"` exists in the DOM. There is no test that actually clicks the delete button and asserts:
1. `apiClient.deleteSubTask` is called with the correct `taskId` and `subTaskId`
2. `onMutate` fires on success
3. A destructive toast is shown on API failure

**Fix:** Add a new `describe('SubTaskList — delete')` block with two tests. Place it **before** the existing `describe('SubTaskList — test IDs preserved')` block in `src/test/story-3-3-subtask-edit-reorder.test.tsx`.

Add these tests:

```tsx
describe('SubTaskList — delete', () => {
  it('CMP-DEL-001: clicking delete calls deleteSubTask and triggers onMutate', async () => {
    vi.spyOn(apiClient, 'deleteSubTask').mockResolvedValue(undefined);
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2]} onMutate={onMutate} />);

    fireEvent.click(screen.getByTestId('delete-subtask-s1'));

    await waitFor(() => expect(apiClient.deleteSubTask).toHaveBeenCalledWith('t1', 's1'));
    await waitFor(() => expect(onMutate).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sub-task removed' }),
    );
  });

  it('CMP-DEL-002: delete API failure shows destructive toast', async () => {
    vi.spyOn(apiClient, 'deleteSubTask').mockRejectedValue(new Error('Sub-task not found'));
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByTestId('delete-subtask-s1'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Sub-task not found' }),
    ));
  });
});
```

**Imports:** No new imports needed — `apiClient`, `vi`, `render`, `screen`, `fireEvent`, `waitFor`, `mockToast`, `onMutate`, `sub1`, `sub2` are all already in scope.

---

### LOW — Nice to fix

#### L1: Sub-task delete has no confirmation dialog (UX inconsistency)

**File:** `src/components/SubTaskList.tsx`
**Problem:** `DailyUpdateFeed.tsx` uses an `<AlertDialog>` to confirm before deleting a daily update, but `SubTaskList.tsx` deletes sub-tasks immediately on click with no confirmation. This inconsistency means accidental sub-task deletion has no recovery path.

**Note:** The story spec does NOT require a confirmation dialog for sub-task deletion, so this is a **nice-to-have** UX improvement. If you choose to implement it, follow the exact same `AlertDialog` pattern used in `DailyUpdateFeed.tsx`:

```tsx
// In SubTaskList component (not SortableSubTaskItem):
const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

// In SortableSubTaskItem: change onClick={handleDelete} to onClick={() => onRequestDelete(sub.id)}
// Add onRequestDelete prop to SortableSubTaskItem

// At bottom of SubTaskList return, before closing </div>:
<AlertDialog open={!!deleteSubId} onOpenChange={open => { if (!open) setDeleteSubId(null); }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Sub-task</AlertDialogTitle>
      <AlertDialogDescription>Are you sure you want to delete this sub-task?</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction data-testid="confirm-delete-subtask" onClick={handleConfirmDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**If you implement this, also update the delete tests (CMP-DEL-001, CMP-DEL-002 above) to click the confirmation button before asserting the API call.**

**If you skip this, that is acceptable — document it as a future improvement.**

---

## Constraints

### Architecture

- All changes inside `taskflow-ui/` only. No backend changes.
- Use `apiClient` from `@/lib/api` for all API calls — no direct `fetch()` or `axios`.
- Do NOT create or modify a real adapter (`src/lib/api/adapters/real.ts`).
- Do NOT migrate to TanStack Query. Continue using `apiClient` + `useEffect` + `load()`.
- Components import types from `@/types` (re-exports from `@/lib/api/types`).

### Existing Contracts — DO NOT break

- Preserve existing `data-testid` attributes: `add-subtask-btn`, `delete-subtask-{id}`, `confirm-delete-update`, `confirm-delete-task`.
- Preserve existing user-visible strings: `"No updates yet."`, `"Maximum of 20 sub-tasks per task"`, `"(edited)"`, `"Past edit window"`, `"Sub-task removed"`.
- Preserve `localStorage` key: `taskflow-last-author`.
- Preserve `Readonly<>` on all component props interfaces.
- Preserve `React.memo` on `SortableSubTaskItem`.
- Preserve `useMemo` on `sorted` array in `SubTaskList` and `sortedUpdates` in `DailyUpdateFeed`.
- Preserve `savingRef` guard in `SortableSubTaskItem.saveEdit`.
- Preserve `group-focus-within:opacity-100` on DailyUpdateFeed action buttons and `focus:opacity-100` on SubTaskList delete button.

### Code Style

- TypeScript strict mode, no `any` types.
- `PascalCase` for components, `camelCase` for functions/variables.
- Use shadcn/ui components (AlertDialog, Button, etc.).
- Error handling: `const msg = err instanceof Error ? err.message : 'An error occurred'` + `toast({ variant: 'destructive', title: 'Error', description: msg })`.

---

## Testing Requirements

### From Test Design (`test-design-epic-3-story-3.3.md`)

The test design identifies that **sub-task delete flow** is currently a gap. Specifically:

| Test ID | Priority | Description |
|---|---|---|
| (new) CMP-DEL-001 | P0 | Delete button click → `apiClient.deleteSubTask` called with correct args → `onMutate` fires |
| (new) CMP-DEL-002 | P0 | Delete API failure → destructive toast with error message |

### Negative Scenarios to Cover

| # | Scenario | Expected Behavior |
|---|---|---|
| N1 | Click delete, API returns error | Destructive toast shown, sub-task remains in list |
| N2 | Click delete while already deleting (double-click) | Second click is no-op (guard via `deleting` state) |

### Regression

After changes, all **170 existing tests** must still pass. Run:
```bash
cd taskflow-ui && npx vitest run
```

Also verify TypeScript compiles cleanly:
```bash
cd taskflow-ui && npx tsc --noEmit -p tsconfig.app.json
```

---

## Verification

After implementing all fixes, confirm:

1. `npx tsc --noEmit -p tsconfig.app.json` — zero errors
2. `npx vitest run` — all tests pass (existing 170 + new tests)
3. Sub-task delete button has `aria-label="Delete sub-task"` (inspect DOM or test with `screen.getByRole('button', { name: 'Delete sub-task' })`)
4. New delete flow tests assert correct API call arguments and toast behavior
5. No existing `data-testid` attributes broken

---

## Files to Touch

| File | Action | Changes |
|---|---|---|
| `src/components/SubTaskList.tsx` | Modify | Add `aria-label="Delete sub-task"` to delete `<Button>` (M1). Optionally add `AlertDialog` confirmation (L1). |
| `src/test/story-3-3-subtask-edit-reorder.test.tsx` | Modify | Add `describe('SubTaskList — delete')` with CMP-DEL-001 and CMP-DEL-002 tests (M2). |
