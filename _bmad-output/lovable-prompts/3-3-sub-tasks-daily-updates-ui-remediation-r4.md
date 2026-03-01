# Lovable AI Prompt — Story 3.3: Sub-Tasks & Daily Updates UI (Remediation Round 4)

**Generated:** 2026-02-28
**Mode:** Remediation (Round 4)
**Story:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`
**Source:** Code review follow-ups Round 4 + `_bmad-output/test-artifacts/test-design-epic-3-story-3.3.md`

---

## Objective

Fix **7 review follow-ups** from the Story 3.3 Round 4 code review. Five issues are **MEDIUM** (vacuous DnD test, `editDailyUpdate` return type mismatch, missing reorder error rollback test, missing AC #3 component test, keyboard-invisible action buttons), two are **LOW** (mock reorder empty/max validation, missing `React.memo`). All changes are in `taskflow-ui/` only — seven files touched.

---

## Issues

### MEDIUM — Must fix

#### M1: Fix vacuous CMP-009 drag reorder test assertion

**File:** `src/test/story-3-3-subtask-edit-reorder.test.tsx`, the test `CMP-009: reorder calls reorderSubTasks with correct IDs` (~line 118)
**Problem:** The test wraps its assertion in `if (reorderSpy.mock.calls.length > 0)`, so it always passes in jsdom where `@dnd-kit` keyboard events don't fire `onDragEnd`. The test provides zero behavioral coverage for AC #5 (drag reorder persistence). This is a vacuous assertion — the spy is never called, the `if` block is never entered, the test always passes with no actual verification.

**Current code (vacuous):**
```typescript
it('CMP-009: reorder calls reorderSubTasks with correct IDs', async () => {
  const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
    { ...sub2, position: 0 },
    { ...sub1, position: 1 },
    { ...sub3, position: 2 },
  ]);
  render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

  const handles = screen.getAllByRole('button', { name: 'Reorder sub-task' });
  expect(handles).toHaveLength(3);

  const firstHandle = handles[0];
  firstHandle.focus();
  fireEvent.keyDown(firstHandle, { key: ' ', code: 'Space' });
  fireEvent.keyDown(firstHandle, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.keyDown(firstHandle, { key: ' ', code: 'Space' });

  // VACUOUS: this if-block is never entered in jsdom
  if (reorderSpy.mock.calls.length > 0) {
    expect(reorderSpy).toHaveBeenCalledWith('t1', expect.arrayContaining(['s1', 's2', 's3']));
    await waitFor(() => expect(onMutate).toHaveBeenCalled());
  }
});
```

**Fix:** Split into two tests:
1. A render test verifying drag handles exist (already covered by the separate `drag handle has aria-label` test — this can be kept as-is for handle rendering)
2. A behavioral test that directly invokes the component's `handleDragEnd` logic by importing `SubTaskList` and simulating the `DndContext` `onDragEnd` callback

The most reliable approach in jsdom is to **mock `DndContext`** to extract the `onDragEnd` prop and invoke it with a synthetic `DragEndEvent`:

```typescript
// At top of file, add import:
import { DndContext, DragEndEvent } from '@dnd-kit/core';

// Mock DndContext to capture onDragEnd
let capturedOnDragEnd: ((event: DragEndEvent) => void) | null = null;
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: (props: any) => {
      capturedOnDragEnd = props.onDragEnd;
      const ActualDndContext = (actual as any).DndContext;
      return <ActualDndContext {...props} />;
    },
  };
});

// Then rewrite CMP-009:
it('CMP-009: reorder calls reorderSubTasks with correct ordered IDs', async () => {
  const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
    { ...sub2, position: 0 },
    { ...sub1, position: 1 },
    { ...sub3, position: 2 },
  ]);
  render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

  // DndContext mock captured the onDragEnd handler
  expect(capturedOnDragEnd).toBeTruthy();

  // Simulate dragging s1 over s2 (moving item at index 0 to index 1)
  await act(async () => {
    capturedOnDragEnd!({
      active: { id: 's1' },
      over: { id: 's2' },
    } as unknown as DragEndEvent);
  });

  await waitFor(() => {
    // After arrayMove([s1,s2,s3], 0, 1) → [s2, s1, s3]
    expect(reorderSpy).toHaveBeenCalledWith('t1', ['s2', 's1', 's3']);
  });
  await waitFor(() => expect(onMutate).toHaveBeenCalled());
});
```

**Important:** Also import `act` from `@testing-library/react`. The key insight is that `DndContext` is rendered by `SubTaskList` — mocking it lets us extract the `onDragEnd` callback and invoke it directly with a synthetic event, bypassing jsdom's pointer event limitations.

If the `DndContext` mock approach causes issues with `SortableContext` or `useSortable`, an alternative is to export (or expose via a ref) the `handleDragEnd` function from `SubTaskList` for testing. However, the mock approach is preferred as it doesn't change production code.

**Test design reference:** CMP-009 (P0), AC #5 (drag reorder persistence). Risk R-001. The test plan requires `reorderSubTasks` to be called with the correct ordered ID array after a drag operation.

---

#### M2: Fix `editDailyUpdate` return type — `Promise<void>` mismatches API contract

**File:** `src/lib/api/client.ts` (line 38), `src/lib/api/adapters/mock.ts` (~line 434)
**Problem:** The `ApiClient` interface declares `editDailyUpdate` as returning `Promise<void>`, but `API_CONTRACT.md` specifies the endpoint returns `200 OK` with the full updated `DailyUpdate` object. This mismatch will cause a breaking change when the real adapter is implemented — it would need to discard the response body or change the interface.

**Current in `client.ts`:**
```typescript
editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<void>;
```

**Fix in `client.ts`:**
```typescript
editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<DailyUpdate>;
```

**Current in `mock.ts` (~line 434):**
```typescript
async editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<void> {
  await delay();
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  const upd = task.dailyUpdates.find(u => u.id === updateId);
  if (!upd) throw new Error('Update not found');
  const age = Date.now() - new Date(upd.createdAt).getTime();
  if (age > ONE_DAY_MS) throw new Error('Updates can only be edited within 24 hours.');
  upd.content = normalizeDailyUpdateContent(data.content);
  upd.updatedAt = new Date().toISOString();
  upd.edited = true;
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
}
```

**Fix in `mock.ts`:** Change return type and return the updated `DailyUpdate` object:
```typescript
async editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<DailyUpdate> {
  await delay();
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  const upd = task.dailyUpdates.find(u => u.id === updateId);
  if (!upd) throw new Error('Update not found');
  const age = Date.now() - new Date(upd.createdAt).getTime();
  if (age > ONE_DAY_MS) throw new Error('Updates can only be edited within 24 hours.');
  upd.content = normalizeDailyUpdateContent(data.content);
  upd.updatedAt = new Date().toISOString();
  upd.edited = true;
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return { ...upd };
}
```

**Callers:** `DailyUpdateFeed.tsx` currently ignores the return value of `editDailyUpdate` — it calls `onMutate()` to refresh. No caller changes needed. The existing tests mock `editDailyUpdate` with `.mockResolvedValue(undefined)` — update these to `.mockResolvedValue(makeUpdate({ id: 'u1', content: 'Updated', edited: true }))` or similar.

**Test updates required in `story-3-3-daily-update-gating.test.tsx`:**
- CMP-022 mock: `.mockResolvedValue(undefined)` → `.mockResolvedValue(makeUpdate({ id: 'u1', content: 'Updated content', edited: true }))`
- CMP-013 mock: stays as `.mockRejectedValue(...)` — no change needed for error path
- CMP-037 mock: `.mockResolvedValue(undefined)` → `.mockResolvedValue(makeUpdate({ id: 'u1', content: 'Changed', edited: true }))`

**Also update `mock.smoke.test.ts`** if it has any `editDailyUpdate` smoke tests that assert `void` return.

---

#### M3: Add missing test for drag reorder API failure → optimistic revert + destructive toast

**File:** `src/test/story-3-3-subtask-edit-reorder.test.tsx`
**Problem:** Task 6.2 explicitly requires "error path rollback" testing for drag reorder. The test design specifies CMP-010 (P0): "Reorder API failure reverts sub-task order to pre-drag state." No such test exists.

**Fix:** Add a new test that:
1. Mocks `reorderSubTasks` to reject
2. Invokes `handleDragEnd` (using the same `DndContext` mock approach from M1)
3. Asserts the list reverts to pre-drag order
4. Asserts a destructive toast is shown

```typescript
it('CMP-010: reorder API failure → reverts order + destructive toast', async () => {
  const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockRejectedValue(new Error('Server error'));
  render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

  expect(capturedOnDragEnd).toBeTruthy();

  // Simulate dragging s1 over s3
  await act(async () => {
    capturedOnDragEnd!({
      active: { id: 's1' },
      over: { id: 's3' },
    } as unknown as DragEndEvent);
  });

  await waitFor(() => {
    expect(reorderSpy).toHaveBeenCalled();
  });

  // After error, should show destructive toast
  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Server error' }),
    );
  });

  // Revert: order should be back to original (s1, s2, s3)
  // The component sets reordering=false which switches displayItems back to sorted prop
  // Verify original order by checking text content
  const titles = screen.getAllByRole('button', { name: 'Reorder sub-task' });
  expect(titles).toHaveLength(3);
});
```

**Test design reference:** CMP-010 (P0), Risk R-001. The test plan classifies this as P0 (critical) — blocks core user journey + medium risk + no workaround.

---

#### M4: Add missing component-level test for AC #3 — sub-task max limit toast

**File:** `src/test/story-3-3-subtask-edit-reorder.test.tsx`
**Problem:** The test design specifies UNIT-001 (P0): "addSubTask at 20-limit shows destructive toast with 'Maximum of 20 sub-tasks per task'". The mock smoke test covers the adapter rejection, but no `SubTaskList` component render test verifies the destructive toast message is displayed to the user when `addSubTask` API rejects at the limit.

**Fix:** Add a component-level test:

```typescript
it('UNIT-001: add sub-task at 20-limit → destructive toast', async () => {
  vi.spyOn(apiClient, 'addSubTask').mockRejectedValue(new Error('Maximum of 20 sub-tasks per task'));

  // Create 20 sub-tasks
  const twentySubs = Array.from({ length: 20 }, (_, i) =>
    makeSub({ id: `s${i}`, title: `Sub ${i}`, position: i }),
  );
  render(<SubTaskList taskId="t1" subTasks={twentySubs} onMutate={onMutate} />);

  const input = screen.getByPlaceholderText('Add sub-task...');
  fireEvent.change(input, { target: { value: 'One too many' } });
  fireEvent.click(screen.getByTestId('add-subtask-btn'));

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        description: 'Maximum of 20 sub-tasks per task',
      }),
    );
  });
});
```

**Test design reference:** UNIT-001 (P0), Risk R-006. The test plan classifies this as P0 — "Blocks core user journey + No workaround."

---

#### M5: Fix keyboard-invisible action buttons

**File:** `src/components/SubTaskList.tsx` (~line 148), `src/components/DailyUpdateFeed.tsx` (~line 135)
**Problem:** The delete button in `SubTaskList` and the Edit/Delete buttons in `DailyUpdateFeed` use `opacity-0 group-hover:opacity-100` for hover-to-reveal, but there is no `group-focus-within:opacity-100`. This means when a keyboard user tabs to these buttons, the buttons receive focus but remain invisible (opacity-0). Sighted keyboard users cannot see the focused button.

**Fix in `SubTaskList.tsx`** — the delete button (~line 148):

**Current:**
```tsx
<Button
  variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
  data-testid={`delete-subtask-${sub.id}`}
  disabled={deleting}
  onClick={handleDelete}
>
```

**Fix:**
```tsx
<Button
  variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
  data-testid={`delete-subtask-${sub.id}`}
  disabled={deleting}
  onClick={handleDelete}
>
```

**Fix in `DailyUpdateFeed.tsx`** — the Edit/Delete buttons row (~line 135):

**Current:**
```tsx
<div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
```

**Fix:**
```tsx
<div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
```

**Note:** For `SubTaskList`, the delete button is a direct child so `focus:opacity-100` on the button itself suffices. For `DailyUpdateFeed`, the opacity is on the parent `div` containing Edit and Delete buttons, so `group-focus-within:opacity-100` on the parent div is correct.

---

### LOW — Nice to fix

#### L1: Add empty-list and max-items validation to mock `reorderSubTasks`

**File:** `src/lib/api/adapters/mock.ts`, the `reorderSubTasks` method (~line 392)
**Problem:** Per `API_CONTRACT.md`, the backend validates `sub_task_ids` must have at least 1 item and at most 20 items. The mock adapter doesn't enforce these boundaries — it only checks that IDs match existing sub-tasks. An empty array or a 21+ item array would pass validation incorrectly.

**Current validation block:**
```typescript
const existingIds = new Set(task.subTasks.map(s => s.id));
if (new Set(subTaskIds).size !== subTaskIds.length) {
  throw new Error('sub_task_ids: must not contain duplicates');
}
if (subTaskIds.length !== existingIds.size || !subTaskIds.every(id => existingIds.has(id))) {
  throw new Error('Reorder list must include each existing sub-task exactly once');
}
```

**Fix:** Add boundary checks before the existing validation:
```typescript
const existingIds = new Set(task.subTasks.map(s => s.id));
if (subTaskIds.length === 0) {
  throw new Error('sub_task_ids: List should have at least 1 item');
}
if (subTaskIds.length > 20) {
  throw new Error('sub_task_ids: List should have at most 20 items');
}
if (new Set(subTaskIds).size !== subTaskIds.length) {
  throw new Error('sub_task_ids: must not contain duplicates');
}
if (subTaskIds.length !== existingIds.size || !subTaskIds.every(id => existingIds.has(id))) {
  throw new Error('Reorder list must include each existing sub-task exactly once');
}
```

**Note:** These boundary conditions are already caught by the existing "must include each existing sub-task exactly once" check in practice (an empty array won't match a non-empty task), but explicit validation messages are clearer and match the backend's error response format.

---

#### L2: Wrap `SortableSubTaskItem` in `React.memo`

**File:** `src/components/SubTaskList.tsx`, the `SortableSubTaskItem` function component (~line 23)
**Problem:** `SortableSubTaskItem` is a plain function component. Parent re-renders (triggered by `newSub` input changes in the add-sub-task field) cause all child `SortableSubTaskItem` components to re-render unnecessarily. With a max of 20 items this is harmless, but wrapping in `React.memo` is idiomatic for list item components.

**Current:**
```typescript
function SortableSubTaskItem({
  sub,
  taskId,
  onMutate,
}: Readonly<{
  sub: SubTask;
  taskId: string;
  onMutate: () => void;
}>) {
```

**Fix:** Wrap with `React.memo`. Import `memo` from React:
```typescript
import { useState, useRef, useCallback, useMemo, memo } from 'react';

// ... then:
const SortableSubTaskItem = memo(function SortableSubTaskItem({
  sub,
  taskId,
  onMutate,
}: Readonly<{
  sub: SubTask;
  taskId: string;
  onMutate: () => void;
}>) {
  // ...existing implementation unchanged...
});
```

Close the component's closing brace with `});` instead of just `}`.

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
- `"Maximum of 20 sub-tasks per task"` — mock adapter error message for AC #3
- `"Reorder list must include each existing sub-task exactly once"` — existing reorder validation error
- `"sub_task_ids: must not contain duplicates"` — duplicate ID rejection error
- `"Updates can only be edited within 24 hours."` — 24h window edit error
- `"Updates can only be deleted within 24 hours."` — 24h window delete error
- `"Past edit window"` — tooltip indicator text
- `"(edited)"` — edited indicator on daily updates
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

**M1 (CMP-009 rewrite) — in `story-3-3-subtask-edit-reorder.test.tsx`:**
- Mock `DndContext` to capture `onDragEnd` callback
- Invoke with synthetic `DragEndEvent` (`active: { id: 's1' }, over: { id: 's2' }`)
- Assert `reorderSubTasks` called with `['s2', 's1', 's3']` (result of `arrayMove` indices 0→1)
- Assert `onMutate` called on success
- Remove the vacuous `if (reorderSpy.mock.calls.length > 0)` conditional

**M2 (editDailyUpdate return type) — in `story-3-3-daily-update-gating.test.tsx`:**
- Update mocks for CMP-022, CMP-037: `.mockResolvedValue(undefined)` → `.mockResolvedValue(makeUpdate({ ... }))`
- Verify existing assertions still pass (they don't inspect the return value)

**M3 (CMP-010 new test) — in `story-3-3-subtask-edit-reorder.test.tsx`:**
- Mock `reorderSubTasks` to reject with error
- Invoke `capturedOnDragEnd` with a drag event
- Assert destructive toast shown with error message
- Assert the component reverts to original order (prop-based `sorted` displayed after `reordering` flag clears)

**M4 (UNIT-001 new test) — in `story-3-3-subtask-edit-reorder.test.tsx`:**
- Create 20 mock sub-tasks
- Mock `addSubTask` to reject with "Maximum of 20 sub-tasks per task"
- Type into add input, click submit
- Assert destructive toast with the exact error message

**M5 (keyboard visibility) — no new tests required** (visual/CSS change only; existing tests already verify button presence)

**L1 (mock reorder validation) — in `mock.smoke.test.ts`:**
```typescript
it('reorderSubTasks rejects empty list', async () => {
  await expect(adapter.reorderSubTasks(taskId, [])).rejects.toThrow('at least 1 item');
});
```

### Regression Requirements

After ALL changes, these existing test suites **MUST** still pass:
- `src/test/story-2-2-comprehensive.test.tsx`
- `src/test/task-detail-author-persistence.test.tsx`
- `src/lib/api/adapters/mock.smoke.test.ts`
- `src/test/story-3-3-subtask-edit-reorder.test.tsx` (existing + new tests)
- `src/test/story-3-3-daily-update-gating.test.tsx` (existing + updated mocks)

### Quality Gate

- All existing tests pass (100%)
- CMP-009 test exercises the drag reorder path via `onDragEnd` callback invocation (no vacuous conditional)
- CMP-010 test verifies reorder error rollback + destructive toast
- UNIT-001 test verifies 20-limit destructive toast at component level
- `editDailyUpdate` returns `Promise<DailyUpdate>` in interface and mock
- `tsc --noEmit` passes with zero errors

---

## Verification Checklist

Before marking complete:

**Drag Reorder Test Fix (M1):**
- [ ] `DndContext` mock captures `onDragEnd` callback in test file
- [ ] CMP-009 invokes `capturedOnDragEnd` with synthetic drag event
- [ ] `reorderSubTasks` spy called with `['s2', 's1', 's3']` (or expected reordered array)
- [ ] `onMutate` called after successful reorder
- [ ] No `if (spy.mock.calls.length > 0)` vacuous conditional remains

**editDailyUpdate Return Type (M2):**
- [ ] `client.ts` declares `editDailyUpdate` as `Promise<DailyUpdate>`
- [ ] `mock.ts` `editDailyUpdate` method returns `{ ...upd }` (the updated DailyUpdate object)
- [ ] All test mocks updated to return a `DailyUpdate` object instead of `undefined`
- [ ] `DailyUpdateFeed.tsx` doesn't break (it ignores the return value — no caller change needed)

**Reorder Error Rollback Test (M3):**
- [ ] CMP-010 test: `reorderSubTasks` rejects → destructive toast shown
- [ ] Component reverts to prop-based order after error

**Sub-task Max Limit Test (M4):**
- [ ] UNIT-001 test: `addSubTask` rejects → toast with "Maximum of 20 sub-tasks per task"
- [ ] Test uses 20 mock sub-tasks in render

**Keyboard-Visible Buttons (M5):**
- [ ] `SubTaskList.tsx` delete button: `focus:opacity-100` added to className
- [ ] `DailyUpdateFeed.tsx` Edit/Delete container div: `group-focus-within:opacity-100` added to className

**Mock Reorder Validation (L1):**
- [ ] `reorderSubTasks` in `mock.ts` checks `subTaskIds.length === 0` → throws "at least 1 item"
- [ ] `reorderSubTasks` in `mock.ts` checks `subTaskIds.length > 20` → throws "at most 20 items"
- [ ] Smoke test added for empty-list rejection

**React.memo (L2):**
- [ ] `SortableSubTaskItem` wrapped in `memo()` from React
- [ ] `memo` added to import statement
- [ ] Component function syntax unchanged (named function inside `memo()`)

**Regression:**
- [ ] All existing test suites pass unchanged
- [ ] `tsc --noEmit` passes with zero errors

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/api/client.ts` | Modify | Change `editDailyUpdate` return type to `Promise<DailyUpdate>` (M2) |
| `src/lib/api/adapters/mock.ts` | Modify | Update `editDailyUpdate` to return `DailyUpdate`; add empty/max validation to `reorderSubTasks` (M2, L1) |
| `src/components/SubTaskList.tsx` | Modify | Add `focus:opacity-100` to delete button, wrap `SortableSubTaskItem` in `React.memo` (M5, L2) |
| `src/components/DailyUpdateFeed.tsx` | Modify | Add `group-focus-within:opacity-100` to Edit/Delete container (M5) |
| `src/test/story-3-3-subtask-edit-reorder.test.tsx` | Modify | Rewrite CMP-009 with DndContext mock, add CMP-010 + UNIT-001 tests (M1, M3, M4) |
| `src/test/story-3-3-daily-update-gating.test.tsx` | Modify | Update `editDailyUpdate` mock return values to `DailyUpdate` objects (M2) |
| `src/lib/api/adapters/mock.smoke.test.ts` | Modify | Add empty-list reorder rejection test (L1) |
