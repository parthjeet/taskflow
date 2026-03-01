# Lovable AI Prompt — Story 3.3: Sub-Tasks & Daily Updates UI

**Generated:** 2026-02-28
**Mode:** Initial
**Story:** `_bmad-output/implementation-artifacts/3-3-sub-tasks-daily-updates-ui.md`

---

## Objective

Update the task detail page in `taskflow-ui/` to fully support **sub-task management** (inline editing, drag-and-drop reorder, optimistic toggle) and **daily update management** (24-hour edit window gating, "Past edit window" indicator) through extracted components and the existing adapter pattern. Install `@dnd-kit` for drag-and-drop. All operations go through `apiClient` from `@/lib/api`.

---

## Context

### Current State

- `src/pages/TaskDetail.tsx` (428 lines) renders sub-tasks as a simple checklist and daily updates as a reverse-chronological feed. It uses `apiClient` + `useEffect` + manual `load()` for data fetching — **do NOT migrate to TanStack Query**.
- `src/lib/api/client.ts` defines the `ApiClient` interface. It currently has `addSubTask`, `toggleSubTask` (returns `Promise<void>`), `deleteSubTask`, `addDailyUpdate`, `editDailyUpdate`, `deleteDailyUpdate`.
- `src/lib/api/adapters/mock.ts` implements these methods against localStorage. Sub-tasks do NOT have a `position` field yet. `toggleSubTask` returns `void`.
- `src/lib/api/types.ts` defines `SubTask` without `position`. Note: types are re-exported via `src/types/index.ts` — components import from `@/types`.
- `src/lib/api/constants.ts` exports `MAX_SUBTASK_TITLE_LENGTH` (200) and `MAX_DAILY_UPDATE_CONTENT_LENGTH` (1000).
- `src/lib/date-utils.ts` exports `formatRelativeDate(dateStr)` and `isWithin24Hours(dateStr)`.
- The daily updates section currently shows Edit/Delete buttons only when `isWithin24Hours(createdAt)` is true, but does NOT show a "Past edit window" indicator for older updates.
- The sub-task section has no inline title editing, no drag-and-drop reorder, and no optimistic toggle.
- Existing `data-testid` attributes: `add-subtask-btn`, `delete-subtask-{id}`, `confirm-delete-update`, `confirm-delete-task`.
- LocalStorage key for author persistence: `taskflow-last-author` (set on add-update submit, read on dialog open).

### What Needs to Change

1. **Type update:** Add `position: number` to `SubTask` in `src/lib/api/types.ts`
2. **Interface update:** Add `editSubTask` and `reorderSubTasks` to `ApiClient`; change `toggleSubTask` return to `Promise<SubTask>`
3. **Mock adapter update:** Implement `editSubTask`, `reorderSubTasks`; update `toggleSubTask` to return the updated `SubTask`; ensure all sub-task methods include `position` in returned objects
4. **Dependency install:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
5. **Component extraction:** Extract `SubTaskList` and `DailyUpdateFeed` from `TaskDetail.tsx`
6. **New sub-task features:** Inline title editing, drag-and-drop reorder, optimistic toggle with rollback
7. **New daily update features:** "Past edit window" tooltip indicator for updates > 24h old; graceful 403 error handling on edit/delete

---

## Implementation

### Step 1: Update Types (`src/lib/api/types.ts`)

Add `position: number` to the `SubTask` interface:

```typescript
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  position: number;    // ← ADD: zero-based order within parent task
  createdAt: string;
}
```

No other type changes needed. `DailyUpdate`, `Task`, `TeamMember` unchanged.

---

### Step 2: Update ApiClient Interface (`src/lib/api/client.ts`)

Update existing methods and add new ones:

```typescript
// Sub-tasks — UPDATED signatures
addSubTask(taskId: string, data: { title: string }): Promise<SubTask>;
toggleSubTask(taskId: string, subTaskId: string): Promise<SubTask>;  // ← changed from Promise<void>
deleteSubTask(taskId: string, subTaskId: string): Promise<void>;     // unchanged (204 semantics)

// Sub-tasks — NEW methods
editSubTask(taskId: string, subTaskId: string, data: { title: string }): Promise<SubTask>;
reorderSubTasks(taskId: string, subTaskIds: string[]): Promise<SubTask[]>;
```

Daily update methods remain unchanged:
```typescript
addDailyUpdate(taskId: string, data: { authorId: string; content: string }): Promise<DailyUpdate>;
editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<void>;
deleteDailyUpdate(taskId: string, updateId: string): Promise<void>;
```

---

### Step 3: Update Mock Adapter (`src/lib/api/adapters/mock.ts`)

#### 3a. All sub-task objects must include `position`

Update seed data — add `position` to every existing sub-task:
```typescript
subTasks: [
  { id: 's1', title: 'Create workflow YAML', completed: true, position: 0, createdAt: h(72) },
  { id: 's2', title: 'Add test stage', completed: true, position: 1, createdAt: h(72) },
  { id: 's3', title: 'Add deploy stage', completed: false, position: 2, createdAt: h(72) },
],
```

Do this for ALL seeded tasks (t1 through t6). Position is zero-indexed per task.

#### 3b. Update `addSubTask` — include `position` in returned object

```typescript
const sub: SubTask = {
  id: generateId(),
  title: data.title.trim(),
  completed: false,
  position: task.subTasks.length,  // ← append at end
  createdAt: new Date().toISOString(),
};
```

#### 3c. Update `toggleSubTask` — return `SubTask` instead of `void`

```typescript
async toggleSubTask(taskId: string, subTaskId: string): Promise<SubTask> {
  await delay();
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  const sub = task.subTasks.find(s => s.id === subTaskId);
  if (!sub) throw new Error('Sub-task not found');
  sub.completed = !sub.completed;
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return sub;
}
```

#### 3d. Implement `editSubTask`

```typescript
async editSubTask(taskId: string, subTaskId: string, data: { title: string }): Promise<SubTask> {
  await delay();
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  const sub = task.subTasks.find(s => s.id === subTaskId);
  if (!sub) throw new Error('Sub-task not found');
  assertSubTaskTitleLength(data.title);
  sub.title = data.title.trim();
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return sub;
}
```

#### 3e. Implement `reorderSubTasks`

```typescript
async reorderSubTasks(taskId: string, subTaskIds: string[]): Promise<SubTask[]> {
  await delay();
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  // Validate: subTaskIds must contain exactly the existing sub-task IDs
  const existingIds = new Set(task.subTasks.map(s => s.id));
  if (subTaskIds.length !== existingIds.size || !subTaskIds.every(id => existingIds.has(id))) {
    throw new Error('Reorder list must include each existing sub-task exactly once');
  }
  const reordered = subTaskIds.map((id, index) => {
    const sub = task.subTasks.find(s => s.id === id)!;
    sub.position = index;
    return sub;
  });
  task.subTasks = reordered;
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return reordered;
}
```

#### 3f. Verify existing daily update methods

Existing `addDailyUpdate`, `editDailyUpdate`, `deleteDailyUpdate` are correct. `editDailyUpdate` enforces `ONE_DAY_MS` window and throws `Error('Updates can only be edited within 24 hours.')`. `deleteDailyUpdate` enforces the same with `Error('Updates can only be deleted within 24 hours.')`. Both set `task.updatedAt`. No changes needed.

---

### Step 4: Install Dependencies

Run in `taskflow-ui/` (project uses **npm**):
```
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

### Step 5: Create `SubTaskList` Component (`src/components/SubTaskList.tsx`)

**Props:**
```typescript
interface SubTaskListProps {
  taskId: string;
  subTasks: SubTask[];
  onMutate: () => void;  // calls parent load()
}
```

**Requirements:**

1. **Progress display:** Show `{completedSubs}/{totalSubs} completed` text with `<Progress>` bar (percentage = completedSubs/totalSubs × 100) **only when there is at least one sub-task** (`totalSubs > 0`). When zero sub-tasks exist, hide the entire progress section (matching current behavior).

2. **Sub-task rendering order:** Always render sub-tasks **sorted by `position` ascending**. This ensures correct display order after drag-and-drop reorder operations.

3. **Sub-task list:** Each row contains:
   - Drag handle: `<GripVertical>` icon from `lucide-react` (uses `useSortable` from `@dnd-kit/sortable`)
   - `<Checkbox>` for completion toggle
   - Title: clickable `<span>` that converts to `<Input>` for inline editing
   - Delete button: hover-to-reveal (`opacity-0 group-hover:opacity-100`), uses `<X>` icon (`h-3 w-3`, matching current behavior), `data-testid={`delete-subtask-${sub.id}`}`

4. **Drag-and-drop reorder:**
   - Wrap list in `<DndContext>` + `<SortableContext>` with `verticalListSortingStrategy`
   - Each row is a sortable item using `useSortable({ id: subTask.id })`
   - `onDragEnd`: compute new ordered array of sub-task IDs, optimistically reorder local state, call `apiClient.reorderSubTasks(taskId, orderedIds)`. On error: revert to pre-drag state, show destructive toast.
   - Single-item list: drag is a no-op (no API call)
   - Keyboard-accessible by default (`@dnd-kit` provides Arrow keys + Space)

5. **Optimistic checkbox toggle:**
   - On checkbox click: immediately flip `completed` in local state AND update progress count
   - Call `apiClient.toggleSubTask(taskId, subTaskId)`
   - On error: revert checkbox state and progress count, show destructive toast
   - On success: call `onMutate()` to refresh parent

6. **Inline title editing:**
   - Click title text → replace `<span>` with `<Input>` pre-filled with current title
   - **Enter** or **blur** → save: trim whitespace, validate 1–200 chars (`MAX_SUBTASK_TITLE_LENGTH`), call `apiClient.editSubTask(taskId, subTaskId, { title })`. On validation failure: show destructive toast, revert to original title. On API error: show destructive toast.
   - **Escape** → cancel: revert to original title, no API call
   - Empty or whitespace-only title → validation toast, revert to original

7. **Add sub-task input** at bottom:
   - `<Input>` with placeholder "Add sub-task..."
   - `maxLength={MAX_SUBTASK_TITLE_LENGTH}`
   - Submit on Enter key or button click (button uses `data-testid="add-subtask-btn"`)
   - On success: clear input, call `onMutate()`
   - On error (including max 20 limit): show destructive toast with message `"Maximum of 20 sub-tasks per task"`

8. **Error handling pattern** (all API calls):
   ```typescript
   try { /* API call */ } catch (err) {
     const msg = err instanceof Error ? err.message : 'An error occurred';
     toast({ variant: 'destructive', title: 'Error', description: msg });
   }
   ```

---

### Step 6: Create `DailyUpdateFeed` Component (`src/components/DailyUpdateFeed.tsx`)

**Props:**
```typescript
interface DailyUpdateFeedProps {
  taskId: string;
  dailyUpdates: DailyUpdate[];
  members: TeamMember[];
  onMutate: () => void;  // calls parent load()
}
```

**Requirements:**

1. **Feed display:** **Sort daily updates by `createdAt` descending (newest first) within this component.** The parent passes `task.dailyUpdates` unsorted — DailyUpdateFeed owns the sort. Each update shows:
   - Author name (text-xs font-medium)
   - Timestamp via `formatRelativeDate(createdAt)` (text-xs text-muted-foreground)
   - `"(edited)"` badge when `edited === true` (italic, after timestamp)
   - Content text (text-sm)

2. **Empty state:** When zero updates, show `"No updates yet."` (text-sm text-muted-foreground, centered)

3. **24-hour gating for Edit/Delete:**
   - For updates where `isWithin24Hours(createdAt)` is **true**: show Edit and Delete buttons on hover (`opacity-0 group-hover:opacity-100`)
   - For updates where `isWithin24Hours(createdAt)` is **false**: hide Edit/Delete buttons entirely. Show a shadcn/ui Tooltip with the full component structure:
     ```tsx
     import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
     // Wrap the indicator in TooltipProvider (can wrap the whole feed once):
     <TooltipProvider>
       <Tooltip>
         <TooltipTrigger asChild>
           <span className="text-xs text-muted-foreground italic">Past edit window</span>
         </TooltipTrigger>
         <TooltipContent>
           <p>Updates can only be edited within 24 hours</p>
         </TooltipContent>
       </Tooltip>
     </TooltipProvider>
     ```

4. **Edit flow:**
   - Click Edit → inline `<Textarea>` replaces content text, pre-filled with current content
   - `maxLength={MAX_DAILY_UPDATE_CONTENT_LENGTH}` (1000)
   - Save button calls `apiClient.editDailyUpdate(taskId, updateId, { content: trimmedContent })`
   - On success: `"(edited)"` indicator appears, call `onMutate()`
   - On 403/error: show destructive toast with error message (e.g., `"Updates can only be edited within 24 hours."`)
   - Cancel button returns to read mode

5. **Delete flow:**
   - Click Delete → `<AlertDialog>` confirmation dialog
   - Confirm button has `data-testid="confirm-delete-update"`
   - Calls `apiClient.deleteDailyUpdate(taskId, updateId)`
   - On success: call `onMutate()`
   - On 403/error: show destructive toast with error message

6. **"Add Update" button + dialog** (all dialog state — `addingUpdate`, `updateAuthor`, `updateContent`, `updateLoading` — lives in this component):
   - Button in header area: `<Plus>` icon + "Add Update"
   - Dialog contains:
     - Author `<Select>` dropdown: populated from `members` prop (active members only: `members.filter(m => m.active)`)
     - Pre-select author from `localStorage.getItem('taskflow-last-author')`. If stored ID is invalid (not in active members), fall back to first active member.
     - Content `<Textarea>`: placeholder "What's the latest?", `maxLength={MAX_DAILY_UPDATE_CONTENT_LENGTH}`, required (submit disabled when empty)
   - On submit: call `apiClient.addDailyUpdate(taskId, { authorId, content: trimmedContent })`, save author to `localStorage.setItem('taskflow-last-author', authorId)`, call `onMutate()`
   - New update appears at top of list

7. **Error handling pattern:** Same try/catch toast pattern as SubTaskList.

---

### Step 7: Wire Up in `TaskDetail.tsx`

Replace the inline sub-task and daily update sections with the extracted components:

```tsx
import { SubTaskList } from '@/components/SubTaskList';
import { DailyUpdateFeed } from '@/components/DailyUpdateFeed';

// In the render, replace the sub-tasks section:
<SubTaskList taskId={task.id} subTasks={task.subTasks} onMutate={load} />

// Replace the daily updates section:
<DailyUpdateFeed taskId={task.id} dailyUpdates={task.dailyUpdates} members={members} onMutate={load} />
```

**Keep in TaskDetail.tsx:**
- The `load()` function and all its state management
- The task info header, badges, blocking reason banner
- The Edit Task dialog (`TaskFormDialog`)
- The Delete Task `AlertDialog` (with `data-testid="confirm-delete-task"`)
- The top bar with Back/Edit/Delete buttons

**Move to extracted components (including all associated state):**
- All sub-task rendering, add/toggle/delete logic, and state (`newSub`, `addingSubTask`, `deletingSubTaskId`, `togglingSubTaskId`) → `SubTaskList`
- All daily update rendering, add/edit/delete logic, delete-update AlertDialog, Add Update Dialog, and state (`addingUpdate`, `updateAuthor`, `updateContent`, `updateLoading`, `editingUpdateId`, `editingContent`, `editUpdateLoading`, `deleteUpdateId`, `deletingUpdate`) → `DailyUpdateFeed`
- Daily update sorting logic (`sortedDailyUpdates`) → `DailyUpdateFeed`

**Critical:** Ensure all `data-testid` values are preserved exactly:
- `add-subtask-btn` → in SubTaskList
- `delete-subtask-{id}` → in SubTaskList
- `confirm-delete-update` → in DailyUpdateFeed
- `confirm-delete-task` → stays in TaskDetail.tsx

All mutations in child components MUST call `onMutate()` after success to trigger parent `load()` — this refreshes the entire task object including `updatedAt`.

---

## Constraints

### Architectural Rules

- **All changes inside `taskflow-ui/` only.** No backend changes.
- **Use `apiClient` from `@/lib/api` exclusively** — no direct `fetch()` or `axios` calls.
- **Do NOT create or modify `src/lib/api/adapters/real.ts`** — mock adapter only.
- **Do NOT migrate to TanStack Query.** Continue using `apiClient` + `useEffect` + manual `load()` pattern.
- **Use `PATCH` for partial updates, `PUT` only for reorder** (matches `API_CONTRACT.md`).
- **camelCase in TypeScript.** Snake_case conversion only happens in the real adapter (not yet built).
- **Import paths:** Use `@/` alias. Import types from `@/types` (not `@/lib/api/types` directly) to match codebase convention. Import apiClient from `@/lib/api`. Import constants from `@/lib/api/constants`. Import components from `@/components/...`.

### UI / UX Rules

- Use only existing `shadcn/ui` components: `Dialog`, `Input`, `Checkbox`, `Tooltip`, `AlertDialog`, `Select`, `Textarea`, `Progress`, `Badge`, `Button`, `Label`.
- Icons from `lucide-react` only: `GripVertical`, `Plus`, `Pencil`, `Trash2`, `X`, `Loader2`, etc.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Existing date utilities from `@/lib/date-utils.ts` — `formatRelativeDate()` and `isWithin24Hours()`.
- Use constants from `@/lib/api/constants.ts` — `MAX_SUBTASK_TITLE_LENGTH`, `MAX_DAILY_UPDATE_CONTENT_LENGTH`.
- All interactions must respond within 200ms — use optimistic updates for toggle and reorder.

### Library Rules

- **Use `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`** for drag-and-drop. Do NOT use `react-beautiful-dnd` (deprecated).
- `@dnd-kit` CSS transform utility: `import { CSS } from '@dnd-kit/utilities'`

### Strings & Test IDs (DO NOT RENAME)

Preserve these exact strings — existing tests depend on them:
- `"No updates yet."` — empty daily updates state
- `"Maximum of 20 sub-tasks per task"` — mock adapter error message
- `"(edited)"` — edited indicator on daily updates
- `"Past edit window"` — tooltip text for old updates
- `data-testid="add-subtask-btn"` — add sub-task button
- `data-testid="delete-subtask-{id}"` — per-sub-task delete button
- `data-testid="confirm-delete-update"` — confirm delete update button in AlertDialog
- `data-testid="confirm-delete-task"` — confirm delete task button in AlertDialog
- `localStorage` key: `taskflow-last-author` — do NOT rename

---

## Testing Requirements

Source: `_bmad-output/test-artifacts/test-design-epic-3-story-3.3.md`

> All tests are Vitest component/unit tests (`@testing-library/react` + `vitest` + `jsdom`). No E2E/Playwright at this stage.

### Critical (P0) — Must Pass (100% pass rate, no exceptions)

| ID | Scenario | Expected |
|---|---|---|
| CMP-001 | Sub-tasks render as checklist with "X/Y completed" after extraction | Progress text + Progress bar correct |
| CMP-002 | Add sub-task appends to bottom with unchecked checkbox | New item at end of list |
| CMP-003 | Toggle checkbox optimistically flips state & updates progress | Immediate visual update |
| CMP-004 | **NEG:** Toggle API failure → revert checkbox + progress | State rolls back, destructive toast |
| CMP-005 | Daily updates render newest-first with author, timestamp, content, "(edited)" | Correct order + indicators |
| CMP-006 | Edit button visible and functional for updates < 24h | Edit flow works |
| CMP-007 | **NEG:** Edit/delete hidden for updates > 24h; "Past edit window" shown | Tooltip with indicator text |
| CMP-008 | New daily update appears at top after save | Newest-first ordering |
| CMP-009 | Drag-and-drop reorder calls `reorderSubTasks` with correct IDs | API receives new order |
| CMP-010 | **NEG:** Reorder API failure → revert to pre-drag order | Optimistic rollback |
| UNIT-001 | **NEG:** `addSubTask` at 20-limit → destructive toast "Maximum of 20 sub-tasks per task" | Error message shown |
| CMP-011 | Author dropdown shows active members, pre-selects from localStorage | Correct pre-selection |
| CMP-012 | Existing test IDs preserved after extraction | All testids findable in DOM |
| CMP-013 | **NEG:** Edit save returns 403 → destructive toast | Error message, no crash |

### High (P1) — Should Pass (≥95% pass rate)

| ID | Scenario | Expected |
|---|---|---|
| CMP-014 | Each sub-task row has drag handle, checkbox, title, delete button | Correct layout |
| CMP-015 | Progress bar renders correct percentage | Math matches |
| CMP-016 | **NEG:** Add sub-task empty/whitespace → toast, not submitted | Validation blocks |
| CMP-017 | **NEG:** Add sub-task > 200 chars → validation error | Length enforced |
| CMP-018 | Inline edit: click → input, Enter/blur saves, Escape cancels | UX flows work |
| CMP-019 | **NEG:** Inline edit empty title → toast, reverts | Validation + rollback |
| CMP-020 | **NEG:** Inline edit whitespace-only → toast, reverts | Validation + rollback |
| CMP-021 | **NEG:** Inline edit > 200 chars → toast | Length enforced |
| CMP-022 | Edit daily update: textarea, save, "(edited)" appears | Edit flow complete |
| CMP-023 | **NEG:** Delete button hidden for updates > 24h | Gating works |
| CMP-024 | "Past edit window" tooltip on old updates | Tooltip renders |
| CMP-025 | Delete daily update: AlertDialog confirms, then deletes | Confirmation flow |
| CMP-026 | **NEG:** Delete returns 403 → destructive toast | Error handled |
| CMP-027 | **NEG:** Add Update empty content → submit disabled | Button disabled |
| CMP-028 | **NEG:** Add Update > 1000 chars → maxLength enforced | Textarea limit |
| CMP-029 | Author saved to `localStorage('taskflow-last-author')` on submit | Persistence works |
| CMP-030 | All mutations call `load()` to refresh parent data | `onMutate` invoked |
| CMP-031 | Keyboard drag-and-drop (Arrow + Space) triggers reorder | A11y works |

### Medium (P2) — Edge Cases & Boundary Conditions

| ID | Scenario | Expected |
|---|---|---|
| CMP-032 | Zero sub-tasks: progress shows "0/0 completed", no drag handles | Empty state renders cleanly |
| CMP-033 | Single sub-task: drag is no-op (no `reorderSubTasks` API call) | No unnecessary API call |
| CMP-034 | Zero daily updates: shows "No updates yet." | Empty state text visible |
| CMP-035 | Multiple rapid toggles on different sub-tasks do not interfere | Independent optimistic states |
| CMP-036 | **NEG:** Drag operation API error → toast with error message | Error surfaced to user |
| CMP-037 | After successful edit, "(edited)" badge appears without page reload | Badge renders reactively |
| CMP-038 | **NEG:** localStorage has stale/invalid author ID → fallback to first active member | Graceful degradation |
| CMP-039 | `editSubTask` mock: title trimmed, whitespace normalized | Mock contract correct |
| CMP-040 | `reorderSubTasks` mock: reassigns 0-indexed positions | Position values correct |
| CMP-041 | Inline edit: Escape cancels without API call, restores original | No side effects |
| UNIT-002 | `toggleSubTask` returns updated `SubTask` (API contract alignment) | Return type matches interface |
| UNIT-003 | `deleteSubTask` remains `Promise<void>` (204 semantics) | No breaking change |

### Low (P3) — Nice-to-Have / Exploratory

| ID | Scenario | Expected |
|---|---|---|
| CMP-042 | Sub-task toggle responds within 200ms (optimistic timing) | Perceived instant response |
| CMP-043 | Screen reader announces drag-and-drop instructions | A11y narration works |
| CMP-044 | Add sub-task via Enter key (not just button click) | Keyboard UX supported |
| CMP-045 | `formatRelativeDate` renders human-readable timestamps | Utility output correct |

### Negative Scenario Consolidated Matrix

All 20 negative/error paths that MUST have corresponding test implementations:

**Sub-Task Negatives:**

| # | Scenario | Expected | Test ID |
|---|---|---|---|
| N1 | Toggle checkbox, API fails | Checkbox + progress revert, destructive toast | CMP-004 |
| N2 | Add 21st sub-task (at max 20) | Toast: "Maximum of 20 sub-tasks per task", no add | UNIT-001 |
| N3 | Add sub-task with empty title | Validation toast, input not cleared, no API call | CMP-016 |
| N4 | Add sub-task with whitespace-only title | Validation toast, no API call | CMP-016 |
| N5 | Add sub-task with title > 200 chars | Validation error at `MAX_SUBTASK_TITLE_LENGTH` | CMP-017 |
| N6 | Inline edit: save empty title | Validation toast, revert to original, no `editSubTask` call | CMP-019 |
| N7 | Inline edit: save whitespace-only title | Validation toast, revert to original | CMP-020 |
| N8 | Inline edit: save title > 200 chars | Validation toast | CMP-021 |
| N9 | Inline edit: Escape during edit | Cancel, restore original, no API call | CMP-041 |
| N10 | Drag reorder, `reorderSubTasks` API fails | List reverts to pre-drag order, destructive toast | CMP-010 |
| N11 | Drag reorder on single-item list | No `reorderSubTasks` API call (no-op) | CMP-033 |
| N12 | Drag error produces toast | `toast({ variant: "destructive" })` with message | CMP-036 |

**Daily Update Negatives:**

| # | Scenario | Expected | Test ID |
|---|---|---|---|
| N13 | View update > 24h old | Edit/delete hidden; "Past edit window" Tooltip shown | CMP-007 |
| N14 | Edit update, API returns 403 | Destructive toast with error message, content unchanged | CMP-013 |
| N15 | Delete update, API returns 403 | Destructive toast with error message, update not removed | CMP-026 |
| N16 | Add Update with empty content | Submit button disabled, no API call | CMP-027 |
| N17 | Add Update > 1000 chars | `maxLength` on textarea prevents entry | CMP-028 |
| N18 | Stale/invalid localStorage author ID | Falls back to first active member | CMP-038 |

**Regression Negatives:**

| # | Scenario | Expected | Test ID |
|---|---|---|---|
| N19 | After extraction, existing `data-testid` selectors still work | `add-subtask-btn`, `delete-subtask-{id}`, `confirm-delete-update`, `confirm-delete-task` findable | CMP-012 |
| N20 | After extraction, `load()` refetch propagates through props | Mutations in child components trigger parent data refresh via `onMutate` | CMP-030 |

### Error Handling Pattern (Mandatory)

All error paths must use this pattern:
```typescript
try { /* mutation */ } catch (err) {
  const msg = err instanceof Error ? err.message : 'An error occurred';
  toast({ variant: 'destructive', title: 'Error', description: msg });
}
```

Optimistic update rollbacks (toggle, reorder) must restore the **exact pre-mutation state** — including progress count for toggles and item order for reorders.

### Test Data / Fixture Requirements

Tests require these mock data configurations:
- Mock tasks with **0, 1, 3+, and 20 sub-tasks** (for boundary testing of empty state, single-item no-op, normal flow, and max-limit rejection)
- Mock daily updates with timestamps: **< 24h ago** (editable), **> 24h ago** (locked), **exactly 24h** boundary
- Active and inactive team members for author dropdown testing (verify only active members appear in Select)
- Use `vi.useFakeTimers()` for all 24-hour window boundary tests — do not rely on real clock

### DnD Testing Guidance

`@dnd-kit` drag simulation in Vitest/jsdom can be non-trivial. Two acceptable approaches:
1. **Pointer event simulation:** Use `fireEvent.dragStart`/`dragEnd` or `@dnd-kit`'s documented test patterns
2. **Callback-level testing:** Mock the `onDragEnd` handler directly — pass a synthetic `DragEndEvent` with `active.id` and `over.id`, then assert the state update and `reorderSubTasks` API call

Either approach is acceptable. The callback-level approach is more reliable in jsdom.

### Regression Requirements

These existing test suites **MUST** continue passing after all changes:
- `story-2-2-comprehensive.test.tsx` — comprehensive TaskDetail tests from Story 2.2
- `task-detail-author-persistence.test.tsx` — localStorage author persistence tests

Run the full existing suite after component extraction to verify no breakage.

### Quality Gate

- **P0**: 100% pass rate (no exceptions)
- **P1**: ≥95% pass rate (waivers require triage documentation)
- **P2/P3**: ≥90% (informational)
- **All 20 negative scenarios (N1–N20)**: Must have corresponding test implementations
- **R-005 regression** (component extraction): Existing test suite 100% green

---

## Verification Checklist

Before marking complete, verify:

- [ ] `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` succeeded
- [ ] `SubTask` type has `position: number` field
- [ ] `ApiClient` interface has `editSubTask` and `reorderSubTasks`
- [ ] `toggleSubTask` returns `Promise<SubTask>` (not `void`)
- [ ] Mock adapter implements all new methods with correct validation
- [ ] All seed data sub-tasks include `position` values
- [ ] `SubTaskList.tsx` renders under 200 lines
- [ ] `DailyUpdateFeed.tsx` renders under 200 lines
- [ ] Drag-and-drop works with mouse AND keyboard
- [ ] Optimistic toggle reverts on error
- [ ] Optimistic reorder reverts on error
- [ ] Inline title edit: Enter saves, Escape cancels, empty rejects
- [ ] "Past edit window" `<Tooltip>` visible for updates > 24h old
- [ ] Edit/delete 403 errors show destructive toast (no crash)
- [ ] All 4 `data-testid` values preserved in correct components
- [ ] `taskflow-last-author` localStorage key unchanged
- [ ] No `react-beautiful-dnd` imported
- [ ] No TanStack Query hooks introduced
- [ ] No direct fetch/axios calls
- [ ] App renders without console errors

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/api/types.ts` | Modify | Add `position: number` to `SubTask` |
| `src/lib/api/client.ts` | Modify | Add `editSubTask`, `reorderSubTasks`; change `toggleSubTask` return |
| `src/lib/api/adapters/mock.ts` | Modify | Implement new methods, add position to seed data and returns |
| `src/components/SubTaskList.tsx` | Create | Extracted sub-task UI with DnD, inline edit, optimistic toggle |
| `src/components/DailyUpdateFeed.tsx` | Create | Extracted daily update feed with 24h gating, Tooltip |
| `src/pages/TaskDetail.tsx` | Modify | Replace inline sections with extracted components |
| `package.json` | Modify | Add @dnd-kit dependencies (via `npm install`) |
