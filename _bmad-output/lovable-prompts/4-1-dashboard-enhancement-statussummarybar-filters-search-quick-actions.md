# Lovable AI Prompt — Story 4.1: Dashboard Enhancement — StatusSummaryBar, Filters, Search & Quick Actions

**Generated:** 2026-03-02
**Mode:** Initial
**Story:** `_bmad-output/implementation-artifacts/4-1-dashboard-enhancement-statussummarybar-filters-search-quick-actions.md`
**Test Design:** `_bmad-output/test-artifacts/test-design-epic-4.md`

---

## Objective

Enhance the task dashboard in `taskflow-ui/` with a **StatusSummaryBar**, extended filter/sort controls, debounced search, a GEAR ID prefix filter, `InlineStatusSelect` for quick status changes, **quick action buttons** (Mark as Done, Edit, Delete), **filter persistence** via localStorage, and a bounded **codebase cleanup** — all while keeping filtering/sorting client-side and all mutations going through `apiClient`.

---

## Context

### Current State

- `taskflow-ui/src/pages/Index.tsx` (153 lines) renders the task grid with Status, Priority, Assignee dropdowns and a search input. Filtering is client-side via `filterAndSortDashboardTasks`. No StatusSummaryBar. No GEAR ID filter. No quick actions on cards. No localStorage persistence.
- `taskflow-ui/src/components/TaskCard.tsx` renders task cards with navigate-on-click. It has local `priorityStyles` and `statusStyles` maps. **Low priority** is color-coded as blue (`bg-blue-100`) — this must be corrected to green (`bg-green-100 text-green-700 border-green-200`). No quick actions. No InlineStatusSelect.
- `taskflow-ui/src/lib/dashboard/tasks.ts` exports `DashboardSort` type (`'updated' | 'priority' | 'status'`) and `filterAndSortDashboardTasks()`. The `'status'` sort option is present — it must be **removed** and replaced with `'created'` (Recently Created). The `DashboardQuery` interface has no `gearIdFilter` field. Search uses `.includes()`, not `.startsWith()` for GEAR ID.
- `taskflow-ui/src/lib/api/client.ts` defines `ApiClient` with `updateTask(id, data)` and `deleteTask(id)`. These are called by components via `apiClient` from `@/lib/api`.
- `taskflow-ui/src/lib/api/types.ts` defines `Task` with `createdAt: string`, `status: Status`, `blockingReason: string`, `gearId: string | null`, `assigneeId: string | null`.
- `taskflow-ui/src/App.tsx` imports **both** `@/components/ui/toaster` (Radix) and `@/components/ui/sonner` (Sonner). Both `<Toaster />` and `<Sonner />` are mounted — Sonner must be removed.
- `taskflow-ui/src/App.css` — a Vite scaffold file (sets `#root` max-width etc.) that is **not** imported by App.tsx. Unused — remove it.
- `taskflow-ui/src/components/NavLink.tsx` — a custom nav link component. Check if any imports remain. If unused, remove it.
- `taskflow-ui/src/index.css` — has a `.dark { ... }` block (lines ~58–94) with sidebar CSS variables. Remove the `.dark` block entirely. Remove sidebar-only CSS variables (`--sidebar-*`) as the sidebar component is not used in the app.
- `taskflow-ui/tailwind.config.ts` — has `darkMode: ["class"]`. Remove this setting.
- `@tanstack/react-query` is installed (used in `App.tsx` as `QueryClientProvider`), but **no component uses TanStack Query hooks** — do NOT migrate to TanStack Query. Continue using `useEffect` + `useState` + `load()` pattern throughout.
- `taskflow-ui/` has no `src/lib/constants.ts` file yet — it must be created.
- No `StatusSummaryBar` or `InlineStatusSelect` components exist yet.

### What Needs to Change

1. **Create `taskflow-ui/src/lib/constants.ts`** — shared color style maps
2. **Codebase cleanup** — remove App.css, NavLink.tsx (if unused), `.dark` block, sidebar CSS vars, Sonner
3. **Update `DashboardSort` and `filterAndSortDashboardTasks`** — add `'created'` sort, remove `'status'` sort, add `gearIdFilter` with startsWith logic
4. **Create `StatusSummaryBar`** — above the task grid, derives counts from in-memory tasks, click-to-toggle-filter
5. **Enhance `Index.tsx`** — add GEAR ID filter input, swap sort options, connect StatusSummaryBar, add localStorage persistence/restore
6. **Refactor `TaskCard`** — consume shared constants, add quick actions (Mark as Done, Edit, Delete), add `InlineStatusSelect`
7. **Create `InlineStatusSelect`** — inline dropdown with blocking reason gate
8. **Refactor `TaskDetail.tsx`** — consume shared constants (remove duplicate local maps)

---

## Implementation

### Step 1: Create `taskflow-ui/src/lib/constants.ts`

```typescript
// Shared style maps for status and priority badges.
// Used by TaskCard, StatusSummaryBar, InlineStatusSelect, and TaskDetail.

export const STATUS_STYLES: Record<string, string> = {
  'To Do':      'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress':'bg-blue-100 text-blue-700 border-blue-200',
  'Blocked':    'bg-red-100 text-red-700 border-red-200',
  'Done':       'bg-green-100 text-green-700 border-green-200',
};

export const PRIORITY_STYLES: Record<string, string> = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-green-100 text-green-700 border-green-200',   // ← green (not blue)
};
```

---

### Step 2: Codebase Cleanup

Perform these **exact, bounded** cleanup actions — do not delete any other files or shadcn primitives.

#### 2a. Remove `taskflow-ui/src/App.css`
Confirm no `import './App.css'` statement exists in any file. If none found, delete the file. If an import exists, remove the import statement first.

#### 2b. Remove `taskflow-ui/src/components/NavLink.tsx` (if unused)
Search for `import.*NavLink` across the codebase. If no imports remain, delete the file.

#### 2c. Remove Sonner from `taskflow-ui/src/App.tsx`
Remove the import:
```typescript
// DELETE:
import { Toaster as Sonner } from "@/components/ui/sonner";
```
Remove the JSX element `<Sonner />` from the component tree. Keep `<Toaster />` from `@/components/ui/toaster`.

#### 2d. Remove `.dark` block from `taskflow-ui/src/index.css`
Delete the entire `.dark { ... }` block (the block that mirrors light-mode CSS variables into a dark context). Also remove all `--sidebar-*` CSS variable declarations from both the `:root` block and the `.dark` block.

#### 2e. Remove `darkMode` from `taskflow-ui/tailwind.config.ts`
Remove the `darkMode: ["class"]` line.

---

### Step 3: Update `taskflow-ui/src/lib/dashboard/tasks.ts`

Replace the module completely:

```typescript
import type { Task, TeamMember } from '@/types';

// Sort key: 'updated' | 'created' | 'priority'
// NOTE: 'status' sort has been removed per Story 4.1 spec.
export type DashboardSort = 'updated' | 'created' | 'priority';

export interface DashboardQuery {
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  gearIdFilter: string;   // starts-with match on task.gearId
  search: string;
  sort: DashboardSort;
}

const PRIORITY_ORDER: Record<Task['priority'], number> = { High: 0, Medium: 1, Low: 2 };

function byUpdatedAtDesc(a: Task, b: Task): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function byCreatedAtDesc(a: Task, b: Task): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function filterAndSortDashboardTasks(tasks: Task[], query: DashboardQuery): Task[] {
  const { statusFilter, priorityFilter, assigneeFilter, gearIdFilter, search, sort } = query;
  let list = [...tasks];

  if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
  if (priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
  if (assigneeFilter === 'unassigned') list = list.filter(t => !t.assigneeId);
  else if (assigneeFilter !== 'all') list = list.filter(t => t.assigneeId === assigneeFilter);

  // GEAR ID: starts-with match (NOT substring). Null/undefined gearId tasks are excluded.
  if (gearIdFilter.trim()) {
    const prefix = gearIdFilter.trim().toLowerCase();
    list = list.filter(t => t.gearId != null && t.gearId.toLowerCase().startsWith(prefix));
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q) ||
      (t.gearId ?? '').toLowerCase().includes(q)
    );
  }

  if (sort === 'updated') list.sort(byUpdatedAtDesc);
  else if (sort === 'created') list.sort(byCreatedAtDesc);
  else if (sort === 'priority') {
    list.sort((a, b) => {
      const delta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return delta !== 0 ? delta : byUpdatedAtDesc(a, b);
    });
  }

  return list;
}

export function getActiveAssigneeMembers(members: TeamMember[]): TeamMember[] {
  return members.filter(m => m.active);
}
```

---

### Step 4: Create `taskflow-ui/src/components/StatusSummaryBar.tsx`

```typescript
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from '@/lib/constants';
import type { Task } from '@/types';

interface StatusSummaryBarProps {
  tasks: Task[];
  activeStatus: string;           // 'all' or a Status value
  onStatusClick: (status: string) => void;
}

const STATUSES = ['To Do', 'In Progress', 'Blocked', 'Done'] as const;

export function StatusSummaryBar({ tasks, activeStatus, onStatusClick }: StatusSummaryBarProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { 'To Do': 0, 'In Progress': 0, Blocked: 0, Done: 0 };
    tasks.forEach(t => { if (map[t.status] !== undefined) map[t.status]++; });
    return map;
  }, [tasks]);

  return (
    <div className="flex flex-wrap gap-2 items-center" aria-label="Task status summary">
      {STATUSES.map(status => {
        const isActive = activeStatus === status;
        return (
          <button
            key={status}
            aria-label={`Filter by ${status} (${counts[status]} tasks)`}
            aria-pressed={isActive}
            onClick={() => onStatusClick(isActive ? 'all' : status)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              STATUS_STYLES[status],
              isActive ? 'ring-2 ring-offset-1 ring-current opacity-100' : 'opacity-70 hover:opacity-100'
            )}
          >
            {status}: {counts[status]}
          </button>
        );
      })}
    </div>
  );
}
```

**Key rules:**
- Counts derive from the **full unfiltered task list** passed via props (not the filtered list) so the bar always shows totals.
- Toggle behavior: clicking the currently active status calls `onStatusClick('all')` to clear. This is handled via `isActive ? 'all' : status` in the click handler. Do NOT implement separate clear logic.
- The `activeStatus` prop comes from `Index.tsx` and stays in sync with the `statusFilter` state.

---

### Step 5: Create `taskflow-ui/src/components/InlineStatusSelect.tsx`

```typescript
import { useState, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Task, Status } from '@/types';

interface InlineStatusSelectProps {
  task: Task;
  onStatusChange: (id: string, status: Status, blockingReason?: string) => Promise<void>;
}

const STATUSES: Status[] = ['To Do', 'In Progress', 'Blocked', 'Done'];

export function InlineStatusSelect({ task, onStatusChange }: InlineStatusSelectProps) {
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const reasonInputRef = useRef<HTMLInputElement>(null);

  const handleStatusSelect = (value: string) => {
    const status = value as Status;
    if (status === task.status) return;
    if (status === 'Blocked') {
      setPendingStatus(status);
      setReasonInput('');
      setReasonError('');
      // Focus the reason input after render
      setTimeout(() => reasonInputRef.current?.focus(), 50);
    } else {
      // Non-blocked transition: submit immediately
      commitChange(status, '');
    }
  };

  const commitChange = async (status: Status, reason: string) => {
    if (isLoading) return;                                  // in-flight guard
    setIsLoading(true);
    try {
      await onStatusChange(task.id, status, reason);
      setPendingStatus(null);
      setReasonInput('');
      setReasonError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReasonSubmit = () => {
    const trimmed = reasonInput.trim();
    if (!trimmed) {
      setReasonError('Blocking reason is required.');                 // R-003: reject empty
      return;
    }
    if (!pendingStatus) return;
    commitChange(pendingStatus, trimmed);
  };

  const handleCancel = () => {
    setPendingStatus(null);
    setReasonInput('');
    setReasonError('');
  };

  return (
    <div onClick={e => e.stopPropagation()} className="space-y-1.5">
      <Select
        value={task.status}
        onValueChange={handleStatusSelect}
        disabled={isLoading}
      >
        <SelectTrigger className="h-7 text-xs w-full" onClick={e => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent onClick={e => e.stopPropagation()}>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Inline blocking reason gate — only shown when transitioning to Blocked */}
      {pendingStatus === 'Blocked' && (
        <div className="space-y-1" onClick={e => e.stopPropagation()}>
          <Input
            ref={reasonInputRef}
            placeholder="Enter blocking reason…"
            value={reasonInput}
            onChange={e => { setReasonInput(e.target.value); setReasonError(''); }}
            className={cn('h-7 text-xs', reasonError && 'border-red-500')}
            onKeyDown={e => { if (e.key === 'Enter') handleReasonSubmit(); if (e.key === 'Escape') handleCancel(); }}
            disabled={isLoading}
          />
          {reasonError && <p className="text-[10px] text-red-600">{reasonError}</p>}
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-xs px-2" onClick={handleReasonSubmit} disabled={isLoading}>
              {isLoading ? '…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Behavioral contracts (critical — do not deviate):**
- Selecting `Blocked` → shows inline reason input; does NOT call the API yet.
- Submitting with empty or whitespace-only reason → shows inline error message, does NOT call API.
- Submitting with a valid (non-empty, trimmed) reason → calls `onStatusChange`, then clears the pending UI.
- Selecting any non-Blocked status → calls `onStatusChange` immediately with `blockingReason = ''`.
- While `isLoading` is true → the Select and all buttons are `disabled`; duplicate calls are blocked.
- All click events on this component must call `e.stopPropagation()` to prevent card navigation.

---

### Step 6: Refactor `taskflow-ui/src/components/TaskCard.tsx`

Replace the current component entirely with an enhanced version that:

1. **Consumes shared constants** — import `STATUS_STYLES` and `PRIORITY_STYLES` from `@/lib/constants`. Remove local `priorityStyles` and `statusStyles` maps.
2. **Mounts `InlineStatusSelect`** — renders it above quick action row.
3. **Adds quick actions** — three buttons: Mark as Done, Edit, Delete.
4. **Prevents click-through** — all quick action and InlineStatusSelect click handlers must call `e.stopPropagation()`.
5. **Implements optimistic updates with rollback** — see Behavioral Contracts below.
6. **In-flight guards** — all mutation buttons disable during pending requests.

```typescript
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { InlineStatusSelect } from '@/components/InlineStatusSelect';
import { apiClient } from '@/lib/api';
import { STATUS_STYLES, PRIORITY_STYLES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/date-utils';
import { AlertTriangle, CheckCircle2, Pencil, Trash2, User } from 'lucide-react';
import type { Task, Status } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface TaskCardProps {
  task: Task;
  onTaskUpdated: (updated: Task) => void;
  onTaskDeleted: (id: string) => void;
}

export function TaskCard({ task, onTaskUpdated, onTaskDeleted }: TaskCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [markDoneLoading, setMarkDoneLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isBlocked = task.status === 'Blocked';
  const isDone = task.status === 'Done';
  const completedSubs = task.subTasks.filter(s => s.completed).length;
  const totalSubs = task.subTasks.length;

  // Optimistic status change with rollback on failure
  const handleStatusChange = useCallback(async (id: string, status: Status, blockingReason = '') => {
    const previous = task;
    // Optimistic update: notify parent immediately
    onTaskUpdated({ ...task, status, blockingReason });
    try {
      const updated = await apiClient.updateTask(id, { status, blockingReason });
      onTaskUpdated(updated);
    } catch {
      // Rollback on failure
      onTaskUpdated(previous);
      toast({ title: 'Status update failed', description: 'Changes were reverted.', variant: 'destructive' });
    }
  }, [task, onTaskUpdated, toast]);

  // Mark as Done — optimistic
  const handleMarkDone = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDone || markDoneLoading) return;              // guard: already Done or in-flight
    setMarkDoneLoading(true);
    const previous = task;
    onTaskUpdated({ ...task, status: 'Done', blockingReason: '' });
    try {
      const updated = await apiClient.updateTask(task.id, { status: 'Done', blockingReason: '' });
      onTaskUpdated(updated);
      toast({ title: 'Task marked as Done' });
    } catch {
      onTaskUpdated(previous);
      toast({ title: 'Failed to mark as Done', description: 'Changes were reverted.', variant: 'destructive' });
    } finally {
      setMarkDoneLoading(false);
    }
  }, [task, isDone, markDoneLoading, onTaskUpdated, toast]);

  // Edit — navigate to TaskDetail (existing edit dialog)
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/tasks/${task.id}`);
  }, [navigate, task.id]);

  // Delete — after AlertDialog confirmation
  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteLoading) return;                          // guard: in-flight
    setDeleteLoading(true);
    try {
      await apiClient.deleteTask(task.id);
      onTaskDeleted(task.id);
      toast({ title: 'Task deleted' });
    } catch {
      toast({ title: 'Failed to delete task', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  }, [task.id, deleteLoading, onTaskDeleted, toast]);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md select-none',
        isBlocked && 'border-[3px] border-red-500 shadow-red-100 shadow-md'
      )}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{task.title}</h3>
          <Badge className={cn('shrink-0 text-[10px]', PRIORITY_STYLES[task.priority])} variant="outline">
            {task.priority}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge className={cn('text-[10px]', STATUS_STYLES[task.status])} variant="outline">
            {task.status}
          </Badge>
          {task.gearId && (
            <Badge variant="outline" className="text-[10px] font-mono">
              #{task.gearId}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {isBlocked && task.blockingReason && (
          <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-md p-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2" title={task.blockingReason}>{task.blockingReason}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{task.assigneeName || 'Unassigned'}</span>
        </div>
        {totalSubs > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sub-tasks</span>
              <span>{completedSubs}/{totalSubs}</span>
            </div>
            <Progress value={totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0} className="h-1.5" />
          </div>
        )}

        {/* Inline status change */}
        <InlineStatusSelect task={task} onStatusChange={handleStatusChange} />

        {/* Quick actions */}
        <div className="flex items-center gap-1 pt-0.5" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2 text-green-700 hover:text-green-900 hover:bg-green-50"
            onClick={handleMarkDone}
            disabled={isDone || markDoneLoading}
            title="Mark as Done"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
            onClick={handleEdit}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                onClick={e => e.stopPropagation()}
                disabled={deleteLoading}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete task?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{task.title}" will be permanently deleted. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={e => e.stopPropagation()}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-[11px] text-muted-foreground">{formatRelativeDate(task.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}
```

**Behavioral contracts (critical):**
- **Optimistic Mark as Done:** update task in parent state immediately (no spinner wait), revert + destructive toast on error.
- **Optimistic InlineStatusSelect:** same pattern — mutate locally first, revert on error.
- **In-flight Mark as Done guard:** `markDoneLoading` is `true` during the API call. Button is `disabled`. A second click while loading is a no-op.
- **In-flight Delete guard:** `deleteLoading` is `true` during the API call. AlertDialog action is `disabled`. No duplicate call possible.
- **Click propagation:** every quick action button and InlineStatusSelect wrapper must call `e.stopPropagation()`. The card's `onClick` navigates to detail — action buttons must NOT trigger this.
- **Edit navigates:** `handleEdit` calls `navigate('/tasks/${id}')` only. It does NOT open any new dialog or route.
- **Delete requires confirmation:** `AlertDialog` must appear with Cancel and Confirm (Delete) options. Clicking Cancel does NOT call `deleteTask`. Only clicking Confirm (Delete) calls `deleteTask`.

---

### Step 7: Update `taskflow-ui/src/pages/Index.tsx`

Replace with an enhanced version incorporating:

1. **StatusSummaryBar** above the filter row
2. **GEAR ID filter** input
3. **Updated sort options** (Recently Updated, Recently Created, Priority — NO Status option)
4. **localStorage persistence** with defensive restore
5. **Debounced search** (300ms)
6. **Clear Filters** button
7. **Propagate task mutations** to `TaskCard` via `onTaskUpdated` and `onTaskDeleted` callbacks

```typescript
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { TaskCard } from '@/components/TaskCard';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { ConnectionErrorBanner } from '@/components/ConnectionErrorBanner';
import { StatusSummaryBar } from '@/components/StatusSummaryBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { Task, TeamMember } from '@/types';
import { DashboardSort, filterAndSortDashboardTasks, getActiveAssigneeMembers } from '@/lib/dashboard/tasks';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2, X } from 'lucide-react';

const PERSIST_KEY = 'taskflow-dashboard-filters';

interface PersistedFilters {
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  gearIdFilter: string;
  sort: DashboardSort;
}

const DEFAULTS: PersistedFilters = {
  statusFilter: 'all',
  priorityFilter: 'all',
  assigneeFilter: 'all',
  gearIdFilter: '',
  sort: 'updated',
};

function loadPersistedFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    // Validate shape — if any key is unexpected type, fall back to defaults
    if (typeof parsed !== 'object' || parsed === null) throw new Error('invalid');
    return {
      statusFilter:   typeof parsed.statusFilter === 'string'   ? parsed.statusFilter   : DEFAULTS.statusFilter,
      priorityFilter: typeof parsed.priorityFilter === 'string' ? parsed.priorityFilter : DEFAULTS.priorityFilter,
      assigneeFilter: typeof parsed.assigneeFilter === 'string' ? parsed.assigneeFilter : DEFAULTS.assigneeFilter,
      gearIdFilter:   typeof parsed.gearIdFilter === 'string'   ? parsed.gearIdFilter   : DEFAULTS.gearIdFilter,
      sort:           ['updated','created','priority'].includes(parsed.sort) ? parsed.sort : DEFAULTS.sort,
    };
  } catch {
    // Malformed JSON or missing fields → clear and return defaults
    localStorage.removeItem(PERSIST_KEY);
    return DEFAULTS;
  }
}

export default function Dashboard() {
  const initial = useMemo(() => loadPersistedFilters(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initial.statusFilter);
  const [priorityFilter, setPriorityFilter] = useState(initial.priorityFilter);
  const [assigneeFilter, setAssigneeFilter] = useState(initial.assigneeFilter);
  const [gearIdFilter, setGearIdFilter] = useState(initial.gearIdFilter);
  const [sort, setSort] = useState<DashboardSort>(initial.sort);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { toast } = useToast();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Debounce search: wait 300ms after last keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Persist filters to localStorage whenever they change (excluding search — not persisted)
  useEffect(() => {
    const filters: PersistedFilters = { statusFilter, priorityFilter, assigneeFilter, gearIdFilter, sort };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(filters));
  }, [statusFilter, priorityFilter, assigneeFilter, gearIdFilter, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([apiClient.getTasks(), apiClient.getMembers()]);
      if (!mountedRef.current) return;
      setTasks(t);
      setMembers(m);
      setConnectionError(false);
    } catch {
      if (mountedRef.current) setConnectionError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeMembers = useMemo(() => getActiveAssigneeMembers(members), [members]);

  const filtered = useMemo(() => {
    return filterAndSortDashboardTasks(tasks, {
      statusFilter,
      priorityFilter,
      assigneeFilter,
      gearIdFilter,
      search: debouncedSearch,
      sort,
    });
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, gearIdFilter, debouncedSearch, sort]);

  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || gearIdFilter.trim() !== '' || search.trim() !== '';

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setGearIdFilter('');
    setSearch('');
    setDebouncedSearch('');
    setSort('updated');
    localStorage.removeItem(PERSIST_KEY);
  }, []);

  // Callbacks for TaskCard mutations — update local state without re-fetching
  const handleTaskUpdated = useCallback((updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  }, []);

  const handleTaskDeleted = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 space-y-6">
        <ConnectionErrorBanner visible={connectionError} />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        </div>

        {/* Status Summary Bar — derives from full unfiltered task list */}
        <StatusSummaryBar
          tasks={tasks}
          activeStatus={statusFilter}
          onStatusClick={setStatusFilter}
        />

        {/* Filter row */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            placeholder="GEAR ID prefix…"
            value={gearIdFilter}
            onChange={e => setGearIdFilter(e.target.value)}
            className="w-[130px] font-mono text-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="To Do">To Do</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assigned To" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {activeMembers.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as DashboardSort)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="created">Recently Created</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}
        </div>

        {/* Task Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">
              {hasFilters ? 'No tasks match your filters' : 'No tasks yet — create your first task!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
              />
            ))}
          </div>
        )}
      </main>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        onSubmit={async data => {
          await apiClient.createTask(data);
          toast({ title: 'Task created' });
          load();
        }}
      />
    </div>
  );
}
```

**Persistence behavioral contracts (critical):**
- **Key:** Use exactly `taskflow-dashboard-filters` (constant `PERSIST_KEY`). Never a different key name.
- **Persisted fields:** `statusFilter`, `priorityFilter`, `assigneeFilter`, `gearIdFilter`, `sort`. Search is **not** persisted.
- **Restore on mount:** `loadPersistedFilters()` runs once via `useMemo` before state initialization.
- **Malformed JSON:** Wrap `JSON.parse` in try/catch. On any error, call `localStorage.removeItem(PERSIST_KEY)` and return defaults. This prevents the dashboard from crashing on corrupted storage.
- **Stale assignee ID:** If the persisted `assigneeFilter` UUID no longer exists in the loaded `activeMembers`, the Select renders the raw UUID without crashing. The filter continues to apply (returning zero matches). This is acceptable behavior in this story — no forced fall-back to 'all' needed at runtime for stale IDs.
- **Clear Filters:** Resets all state to defaults and calls `localStorage.removeItem(PERSIST_KEY)`.

---

### Step 8: Refactor `taskflow-ui/src/pages/TaskDetail.tsx`

Find and replace the local `priorityStyles` and `statusStyles` maps in `TaskDetail.tsx`:
- Remove the local declarations.
- Add import: `import { STATUS_STYLES, PRIORITY_STYLES } from '@/lib/constants';`
- Replace all usages of the local maps with the imported constants.

Do NOT make any other changes to TaskDetail.tsx in this story.

---

## Behavioral Requirements (from Test Design — enforce in implementation)

These requirements come from `test-design-epic-4.md` and represent the mitigations for the three highest-risk scenarios. The implementation MUST satisfy all of them — they are not optional.

### R-001: Optimistic Update Rollback (Critical — Score 6)

When `apiClient.updateTask()` throws for any reason (network error, server error):

- **TaskCard Mark as Done:** The task in state must revert to its pre-mutation value exactly. A destructive toast must appear: "Failed to mark as Done".
- **InlineStatusSelect status change:** The task in state must revert to its pre-mutation value exactly. A destructive toast must appear: "Status update failed".
- There must be **no** permanent UI divergence from server state after a failed mutation.

### R-002: In-Flight Guards — Prevent Double Submit (Critical — Score 6)

- **Mark as Done button:** Set `markDoneLoading = true` on first click before the API call. Return early if `markDoneLoading` is already true. Reset to `false` in `finally`.
- **Delete button (AlertDialog Confirm):** Set `deleteLoading = true` on first confirmation click. Return early if `deleteLoading` is already true. Reset in `finally`.
- **InlineStatusSelect Save button:** Set `isLoading = true` on first click. The Select and Save/Cancel buttons become `disabled`. Return early if already loading.
- A rapid double-click must result in exactly **one** API call, not two.

### R-003: Blocking Reason Validation (Critical — Score 6)

InlineStatusSelect must enforce:
- Empty string `""` → reject with inline error "Blocking reason is required."
- Whitespace-only `"   "` → trim, reject as empty with same message.
- At least one non-whitespace character → accept, proceed to API call.
- The API is NEVER called with an empty or whitespace-only `blockingReason` when transitioning to `Blocked`.

### R-006: localStorage Corruption Handling (High — Score 4)

- Wrap `localStorage.getItem` + `JSON.parse` in try/catch.
- Any exception → call `localStorage.removeItem(PERSIST_KEY)` + return `DEFAULTS`.
- The dashboard must render successfully with default filters, never crash due to bad storage.

### Click Propagation Safety

Every quick action control (Mark as Done, Edit, Delete trigger, AlertDialog content) and the entire `InlineStatusSelect` must call `event.stopPropagation()`. The card's root `onClick` (navigates to detail) must NOT fire when:
- Any quick action button is clicked.
- The InlineStatusSelect Select trigger is clicked.
- The blocking reason Input is clicked.
- The Save/Cancel buttons inside InlineStatusSelect are clicked.
- The AlertDialog and its buttons are clicked.

---

## Constraints

### Architectural Guardrails — Do Not Violate

1. **Adapter boundary:** Components and pages call `apiClient` only (imported from `@/lib/api`). No direct calls to mock adapter internals.
2. **No TanStack Query hooks in this story.** `@tanstack/react-query`'s `QueryClientProvider` wrapper in `App.tsx` is fine to keep, but do NOT introduce `useQuery` or `useMutation` hooks anywhere. Keep `useEffect` + `useState` + `load()` pattern.
3. **No backend file changes.** All changes are under `taskflow-ui/` only.
4. **Import paths:** Always `@/components/...`, `@/lib/...`, `@/types`, `@/hooks/...`. Never relative paths from pages to components.
5. **shadcn composition:** Use `Badge`, `Button`, `Select`, `Input`, `AlertDialog`, `Progress` from `@/components/ui/`. Do not create custom primitive replacements.
6. **New components:** `StatusSummaryBar.tsx` → `taskflow-ui/src/components/`. `InlineStatusSelect.tsx` → `taskflow-ui/src/components/`. No new sub-folders.
7. **Constants file:** `taskflow-ui/src/lib/constants.ts` — only `STATUS_STYLES` and `PRIORITY_STYLES` exports. No other constants needed in this story.
8. **Types re-export:** Components import types from `@/types` (which re-exports from `src/lib/api/types.ts`). Never import directly from `@/lib/api/types`.
9. **Sort contract:** `DashboardSort` type must be `'updated' | 'created' | 'priority'` after this story. The `'status'` value is removed. The sort dropdown must show exactly: "Recently Updated", "Recently Created", "Priority".
10. **GEAR ID filter semantics:** `.startsWith()` match, not `.includes()`. A task with `gearId = null` is excluded when any gearIdFilter value is set.
11. **Cleanup boundaries:** Restrict cleanup to App.css, NavLink.tsx (if unused), `.dark` CSS block, sidebar CSS vars, Sonner. Do NOT delete any shadcn primitive files (`src/components/ui/*.tsx`) or other components.
12. **Do NOT introduce `/tasks/:id/edit` route.** Edit quick action navigates to the existing `/tasks/:id` route — no new routes.
13. **camelCase everywhere in frontend.** No snake_case in TypeScript types, state, or component props.

---

## Verification

Run these commands after implementation. All must succeed:

```bash
cd taskflow-ui && npm test
cd taskflow-ui && npm run build
```

Expected: 0 test failures, 0 build errors.

**Manual verification checklist:**
- [ ] StatusSummaryBar shows counts for all 4 statuses; clicking a status filters; clicking the active status clears.
- [ ] GEAR ID filter uses starts-with (type "10" — task with gearId "1023" matches, "2310" does not).
- [ ] Sort options: "Recently Updated", "Recently Created", "Priority" — no "Status" option visible.
- [ ] Search debounce: type in search, task list updates ~300ms after last keystroke.
- [ ] Refresh page → filters are restored from localStorage.
- [ ] Mark as Done on a non-Done task → card status changes to "Done" immediately.
- [ ] Mark as Done button disabled while request is loading.
- [ ] InlineStatusSelect → Blocked → reason input appears → empty submission → error shown → no API call made.
- [ ] Delete → AlertDialog → Cancel → task remains → Confirm (Delete) → task removed.
- [ ] Clicking any quick action button does NOT navigate to task detail.
- [ ] Edit button navigates to `/tasks/:id`.
- [ ] Low priority badge is green (not blue).
- [ ] No `<Sonner />` in App.tsx; only `<Toaster />`.
- [ ] `darkMode: ["class"]` removed from tailwind.config.ts.
- [ ] `.dark` CSS block removed from index.css; sidebar CSS vars removed.
