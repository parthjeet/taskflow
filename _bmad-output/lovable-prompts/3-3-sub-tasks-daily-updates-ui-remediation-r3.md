# Lovable AI Prompt — Story 3.3: Sub-Tasks & Daily Updates UI (Remediation Round 3)

**Generated:** 2026-02-28
**Mode:** Remediation (Round 3)
**Story:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`
**Source:** Code review follow-ups Round 3 + `_bmad-output/test-artifacts/test-design-epic-3-story-3.3.md`

---

## Objective

Fix **6 review follow-ups** from the Story 3.3 Round 3 code review. Two issues are **HIGH** (mock adapter data corruption, no-op drag reorder test), two are **MEDIUM** (missing aria-label, stale File Map entry), two are **LOW** (no-active-members fallback, redundant setState). All changes are in `taskflow-ui/` only — four files touched.

---

## Issues

### HIGH — Must fix

#### H1: Fix mock adapter `reorderSubTasks` accepting duplicate IDs

**File:** `src/lib/api/adapters/mock.ts`, the `reorderSubTasks` method (~line 393)
**Problem:** The current validation checks `subTaskIds.length !== existingIds.size` and `subTaskIds.every(id => existingIds.has(id))`. This passes when duplicate IDs are supplied because:
- Input `['s1', 's1', 's3']` has length 3, which matches `existingIds.size` (3 existing sub-tasks)
- Every ID in the array exists in the set
- But `s2` is silently dropped and `s1` gets assigned two positions — data corruption

Per `API_CONTRACT.md`, the backend returns `400 Bad Request` with `"sub_task_ids: must not contain duplicates"` for duplicate IDs.

**Current code:**
```typescript
const existingIds = new Set(task.subTasks.map(s => s.id));
if (subTaskIds.length !== existingIds.size || !subTaskIds.every(id => existingIds.has(id))) {
  throw new Error('Reorder list must include each existing sub-task exactly once');
}
```

**Fix:** Add a duplicate check **before** the existing validation:
```typescript
const existingIds = new Set(task.subTasks.map(s => s.id));
if (new Set(subTaskIds).size !== subTaskIds.length) {
  throw new Error('sub_task_ids: must not contain duplicates');
}
if (subTaskIds.length !== existingIds.size || !subTaskIds.every(id => existingIds.has(id))) {
  throw new Error('Reorder list must include each existing sub-task exactly once');
}
```

**Test design reference:** Risk R-001 (DnD reorder integration). The duplicate check prevents silent data corruption when the UI accidentally sends malformed reorder requests.

---

#### H2: Fix no-op drag reorder test CMP-009

**File:** `src/test/story-3-3-subtask-edit-reorder.test.tsx`, the test `CMP-009: reorder calls reorderSubTasks with correct IDs` (~line 108)
**Problem:** The test renders the component, queries checkboxes, then asserts `reorderSpy` was *not* called. This provides zero behavioral coverage for AC #5 (drag reorder persistence). The test needs to simulate the `onDragEnd` callback with an actual drag event and verify `reorderSubTasks` is called with the expected reordered ID array.

Since `@dnd-kit` drag simulation is unreliable in jsdom (no pointer events or bounding rects), the most robust approach is to **directly invoke the `handleDragEnd` callback** by extracting the `DndContext`'s `onDragEnd` handler. In `@dnd-kit`, you can fire a synthetic `DragEndEvent` through the component.

**Current (no-op test):**
```typescript
it('CMP-009: reorder calls reorderSubTasks with correct IDs', async () => {
  const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
    { ...sub2, position: 0 },
    { ...sub1, position: 1 },
    { ...sub3, position: 2 },
  ]);
  const { container } = render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

  const checkboxes = container.querySelectorAll('[role="checkbox"]');
  expect(checkboxes).toHaveLength(3);

  // Since we can't easily simulate DnD in jsdom, verify the component renders correctly
  expect(reorderSpy).not.toHaveBeenCalled();
});
```

**Fix — callback-level approach:** Create a test helper that extracts and invokes the `SubTaskList` component's `handleDragEnd`. The simplest way is to expose the handler indirectly by finding the `DndContext` callback. A more practical alternative: refactor the test to directly test the reorder logic by importing `arrayMove` from `@dnd-kit/sortable` and verifying the expected behavior:

```typescript
it('CMP-009: reorder calls reorderSubTasks with correct IDs', async () => {
  const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
    { ...sub2, position: 0 },
    { ...sub1, position: 1 },
    { ...sub3, position: 2 },
  ]);
  render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

  // Simulate DndContext onDragEnd by dispatching pointer events on the drag handle
  // @dnd-kit in jsdom requires manual DragEndEvent simulation
  const handles = screen.getAllByRole('button', { name: /reorder/i });
  expect(handles).toHaveLength(3);

  // Simulate drag of first item (s1) over second item (s2)
  // Since jsdom lacks full pointer event support, we fire the DndContext's onDragEnd
  // by using the keyboard sensor: focus handle → Space to pick up → ArrowDown → Space to drop
  const firstHandle = handles[0];
  firstHandle.focus();
  fireEvent.keyDown(firstHandle, { key: ' ', code: 'Space' });
  fireEvent.keyDown(firstHandle, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.keyDown(firstHandle, { key: ' ', code: 'Space' });

  await waitFor(() => {
    expect(reorderSpy).toHaveBeenCalledWith('t1', ['s2', 's1', 's3']);
  });
  await waitFor(() => expect(onMutate).toHaveBeenCalled());
});
```

**Important:** This test depends on H1's `aria-label="Reorder sub-task"` fix (issue M1 below) to query handles by accessible name. Implement M1 first.

**If keyboard DnD still doesn't fire in jsdom** (some `@dnd-kit` versions need `getBoundingClientRect` mocks), fall back to extracting `handleDragEnd` by wrapping the component:

```typescript
it('CMP-009: reorder calls reorderSubTasks with correct IDs', async () => {
  const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
    { ...sub2, position: 0 },
    { ...sub1, position: 1 },
    { ...sub3, position: 2 },
  ]);
  render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

  // Verify initial render order
  const titles = screen.getAllByRole('button', { name: /reorder/i });
  expect(titles).toHaveLength(3);

  // If keyboard simulation doesn't fire onDragEnd in jsdom, this is acceptable:
  // At minimum, verify the spy setup is correct and the component renders drag handles
  // The full DnD interaction is covered by E2E tests (Playwright) in a later automation pass

  // Alternative: Mock the DndContext to capture onDragEnd and call it directly
  // This requires wrapping DndContext — add if keyboard approach fails
});
```

**Preferred approach:** Try the keyboard simulation first. If it works, keep it. If jsdom limitations prevent `@dnd-kit` keyboard events from triggering `onDragEnd`, document the limitation and add a TODO for E2E coverage.

**Test design reference:** CMP-009 (P0), AC #5 (drag reorder persistence). Risk R-001 (DnD reorder).

---

### MEDIUM — Should fix

#### M1: Add `aria-label` to drag handle button in SubTaskList.tsx

**File:** `src/components/SubTaskList.tsx`, the drag handle `<button>` inside `SortableSubTaskItem` (~line 117)
**Problem:** The drag handle `<button>` has no `aria-label`. Screen readers announce it as an unlabeled button, failing accessibility requirements.

**Current:**
```tsx
<button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
  <GripVertical className="h-4 w-4" />
</button>
```

**Fix:**
```tsx
<button type="button" aria-label="Reorder sub-task" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
  <GripVertical className="h-4 w-4" />
</button>
```

**Test design reference:** CMP-043 (P3) — screen reader announces drag-and-drop instructions. Also enables H2's keyboard DnD test to query handles by accessible name.

---

#### M2: Remove spurious File Map entry for `task-detail-author-persistence.test.tsx`

**File:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`, the **File Map** section and the **File List** section
**Problem:** The File Map lists `src/test/task-detail-author-persistence.test.tsx` as "Modified" but no changes exist for this file in the git diff (`5819aac..HEAD`). This is misleading for future developers and reviewers.

**Fix:** Remove the row from the **File Map** table:
```markdown
| `src/test/task-detail-author-persistence.test.tsx` | Modify | Keep author persistence and extraction regressions covered |
```

Also update the **File List** section if it contains a corresponding entry. This is a documentation-only change — no code changes.

> **Note to Lovable:** This is a markdown documentation fix in the story file. If you cannot edit files outside `src/`, skip this item and flag it for the developer to handle manually.

---

### LOW — Nice to fix

#### L1: Add "No active members" fallback in DailyUpdateFeed.tsx

**File:** `src/components/DailyUpdateFeed.tsx`, the `openAddDialog` callback (~line 52) and the Author `<Select>` (~line 196)
**Problem:** When all team members are inactive, `activeMembers` is empty. `updateAuthor` is set to `''`, and the `<Select>` renders empty with no guidance. The user sees a blank dropdown with no explanation.

**Fix in `openAddDialog`:** Already handles this correctly (falls back to `''`). No change needed there.

**Fix in the `<Select>` dropdown (around line 196):** Add a disabled placeholder when no active members exist:
```tsx
<Select value={updateAuthor} onValueChange={setUpdateAuthor}>
  <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
  <SelectContent>
    {activeMembers.length === 0 ? (
      <SelectItem value="_none" disabled>No active members</SelectItem>
    ) : (
      activeMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)
    )}
  </SelectContent>
</Select>
```

Also disable the "Add" button when `updateAuthor` is falsy (already the case — `!updateAuthor` is in the disabled condition).

**Test design reference:** CMP-038 (P2) — stale/invalid localStorage author ID falls back to first active member. This extends coverage to the zero-members edge case.

---

#### L2: Remove redundant `setDeleteUpdateId(null)` in `handleDelete`

**File:** `src/components/DailyUpdateFeed.tsx`, the `handleDelete` callback (~line 99)
**Problem:** On successful delete, the code sets `setDeleteUpdateId(null)` in the try block. Then the `AlertDialog`'s `onOpenChange` callback also sets `setDeleteUpdateId(null)` when the dialog closes. The first set is redundant because closing the dialog (which happens when the action completes) already triggers the cleanup.

**Current:**
```typescript
const handleDelete = useCallback(async () => {
  if (deletingUpdate || !deleteUpdateId) return;
  setDeletingUpdate(true);
  try {
    await apiClient.deleteDailyUpdate(taskId, deleteUpdateId);
    toast({ title: 'Update deleted' });
    setDeleteUpdateId(null);  // ← redundant — AlertDialog onOpenChange does this
    onMutate();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'An error occurred';
    toast({ variant: 'destructive', title: 'Error', description: msg });
  } finally {
    setDeletingUpdate(false);
  }
}, [deletingUpdate, deleteUpdateId, taskId, onMutate, toast]);
```

**Fix:** Remove the `setDeleteUpdateId(null)` from the try block. The `AlertDialog` `onOpenChange` handler already handles cleanup:
```typescript
try {
  await apiClient.deleteDailyUpdate(taskId, deleteUpdateId);
  toast({ title: 'Update deleted' });
  onMutate();
} catch (err) {
```

This is a minor cleanup — functionally harmless but removes dead code and clarifies the state management flow.

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
- `"Reorder list must include each existing sub-task exactly once"` — existing error message (keep it, add new duplicate check before it)
- `"sub_task_ids: must not contain duplicates"` — new error message for H1 (matches `API_CONTRACT.md`)
- `data-testid="add-subtask-btn"` — add sub-task button
- `data-testid="delete-subtask-{id}"` — per-sub-task delete button
- `data-testid="confirm-delete-update"` — daily update delete confirm
- `data-testid="confirm-delete-task"` — task delete confirm

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

### New/Modified Tests in This Remediation

**H1 (duplicate ID validation) — add unit test in `mock.smoke.test.ts`:**
```typescript
it('reorderSubTasks rejects duplicate IDs', async () => {
  // Setup: task with 3 sub-tasks (s1, s2, s3)
  await expect(
    adapter.reorderSubTasks(taskId, ['s1', 's1', 's3'])
  ).rejects.toThrow('must not contain duplicates');
});
```

**H2 (CMP-009 drag reorder test) — rewrite in `story-3-3-subtask-edit-reorder.test.tsx`:**
- Must call `reorderSubTasks` spy with expected ID array after simulating drag
- Verify `onMutate` is called on success
- Test design reference: CMP-009 (P0), CMP-010 (P0 — error rollback), CMP-031 (P1 — keyboard DnD)

**M1 (aria-label) — verify in existing CMP-012 regression or add assertion:**
```typescript
it('drag handle has aria-label', () => {
  render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);
  expect(screen.getByRole('button', { name: 'Reorder sub-task' })).toBeInTheDocument();
});
```

### Regression Requirements

After ALL changes, these existing test suites **MUST** still pass:
- `src/test/story-2-2-comprehensive.test.tsx`
- `src/test/task-detail-author-persistence.test.tsx`
- `src/lib/api/adapters/mock.smoke.test.ts`
- `src/test/story-3-3-subtask-edit-reorder.test.tsx` (16 tests + H2 fix)
- `src/test/story-3-3-daily-update-gating.test.tsx` (all 16 tests)

### Quality Gate

- All existing tests pass (100%)
- CMP-009 test now actually exercises the drag reorder path (spy-based assertion)
- Mock adapter rejects duplicate IDs in `reorderSubTasks`
- `tsc --noEmit` passes with zero errors

---

## Verification Checklist

Before marking complete:

**Duplicate ID Validation (H1):**
- [ ] `reorderSubTasks` in `mock.ts` checks `new Set(subTaskIds).size !== subTaskIds.length`
- [ ] Throws `"sub_task_ids: must not contain duplicates"` before the existing validation
- [ ] Unit test in `mock.smoke.test.ts` verifies the rejection
- [ ] Existing reorder smoke tests still pass

**Drag Reorder Test (H2):**
- [ ] CMP-009 test simulates a drag operation (keyboard or callback-level)
- [ ] `reorderSubTasks` spy is called with the expected reordered ID array
- [ ] `onMutate` is called after successful reorder
- [ ] If keyboard simulation doesn't work in jsdom, document the limitation with a TODO

**Drag Handle Aria-Label (M1):**
- [ ] `<button>` wrapping `GripVertical` has `aria-label="Reorder sub-task"`
- [ ] Test verifies `screen.getByRole('button', { name: 'Reorder sub-task' })` exists

**File Map Cleanup (M2):**
- [ ] `task-detail-author-persistence.test.tsx` row removed from story File Map
- [ ] (Skip if Lovable cannot edit markdown outside `src/`)

**No Active Members Fallback (L1):**
- [ ] `<Select>` shows "No active members" disabled item when `activeMembers` is empty
- [ ] "Add" button remains disabled when no author is selected

**Redundant setState Cleanup (L2):**
- [ ] `setDeleteUpdateId(null)` removed from `handleDelete` try block
- [ ] `AlertDialog onOpenChange` still handles cleanup

**Regression:**
- [ ] All existing test suites pass unchanged
- [ ] `tsc --noEmit` passes with zero errors

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/api/adapters/mock.ts` | Modify | Add duplicate ID check in `reorderSubTasks` (H1) |
| `src/components/SubTaskList.tsx` | Modify | Add `aria-label="Reorder sub-task"` to drag handle (M1) |
| `src/components/DailyUpdateFeed.tsx` | Modify | Add "No active members" fallback (L1), remove redundant `setDeleteUpdateId(null)` (L2) |
| `src/test/story-3-3-subtask-edit-reorder.test.tsx` | Modify | Rewrite CMP-009 to actually test drag reorder (H2), add aria-label assertion |
| `src/lib/api/adapters/mock.smoke.test.ts` | Modify | Add duplicate ID rejection test for `reorderSubTasks` (H1) |
