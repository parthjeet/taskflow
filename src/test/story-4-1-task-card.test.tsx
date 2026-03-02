/**
 * Story 4.1 — TaskCard quick actions tests (AC 8–12)
 *
 * Covers:
 * - Mark as Done: optimistic success + rollback on failure
 * - Edit navigates to /tasks/:id
 * - Delete: confirmation dialog + cancel path
 * - Quick action clicks do NOT trigger card navigation
 * - In-flight guards preventing duplicate calls
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { TaskCard } from '@/components/TaskCard';
import { apiClient } from '@/lib/api';
import type { Task, Status } from '@/types';
import { Deferred, deferred } from '@/test/test-utils';

// ---------------------------------------------------------------------------
// Mock navigation
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Mock toast
// ---------------------------------------------------------------------------
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: null,
    status: 'In Progress' as Status,
    priority: 'Medium',
    assigneeId: null,
    assigneeName: null,
    gearId: '1234',
    blockingReason: '',
    subTasks: [],
    dailyUpdates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderCard(task: Task, onUpdated = vi.fn(), onDeleted = vi.fn()) {
  return render(
    <MemoryRouter>
      <TaskCard task={task} onTaskUpdated={onUpdated} onTaskDeleted={onDeleted} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// AC 8: Mark as Done — optimistic success + rollback
// ---------------------------------------------------------------------------
describe('TaskCard — Mark as Done', () => {
  it('optimistic success: calls updateTask and shows success toast', async () => {
    const task = makeTask();
    const doneTask = { ...task, status: 'Done' as Status, blockingReason: '' };
    vi.spyOn(apiClient, 'updateTask').mockResolvedValue(doneTask);
    const onUpdated = vi.fn();

    renderCard(task, onUpdated);

    fireEvent.click(screen.getByTitle('Mark as Done'));

    // Optimistic: first call sets Done immediately
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Done', blockingReason: '' }),
    );

    await waitFor(() => {
      expect(apiClient.updateTask).toHaveBeenCalledWith('task-1', { status: 'Done', blockingReason: '' });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Task marked as Done' }));
    });
  });

  it('rollback on failure: reverts to previous state + destructive toast', async () => {
    const task = makeTask();
    vi.spyOn(apiClient, 'updateTask').mockRejectedValue(new Error('Server error'));
    const onUpdated = vi.fn();

    renderCard(task, onUpdated);

    fireEvent.click(screen.getByTitle('Mark as Done'));

    // First call: optimistic Done
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Done' }),
    );

    await waitFor(() => {
      // Second call: rollback to original
      const calls = onUpdated.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.status).toBe('In Progress');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to mark as Done', variant: 'destructive' }),
      );
    });
  });

  it('Mark as Done button is disabled when task is already Done', () => {
    const task = makeTask({ status: 'Done' });
    renderCard(task);

    const btn = screen.getByTitle('Mark as Done');
    expect(btn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// AC 10: Edit navigates to /tasks/:id
// ---------------------------------------------------------------------------
describe('TaskCard — Edit quick action', () => {
  it('navigates to /tasks/:id without triggering card onClick', () => {
    const task = makeTask();
    renderCard(task);

    mockNavigate.mockClear();
    fireEvent.click(screen.getByTitle('Edit'));

    // Edit navigates to task detail
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/task-1');
    // Should only be called once (Edit), not twice (Edit + card click)
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// AC 11: Delete confirmation + cancel path
// ---------------------------------------------------------------------------
describe('TaskCard — Delete', () => {
  it('clicking delete trigger opens confirmation dialog', () => {
    const task = makeTask();
    renderCard(task);

    fireEvent.click(screen.getByTitle('Delete'));

    expect(screen.getByText('Delete task?')).toBeInTheDocument();
    expect(screen.getByText(/will be permanently deleted/)).toBeInTheDocument();
  });

  it('clicking Cancel in dialog does NOT call deleteTask', () => {
    const task = makeTask();
    const deleteSpy = vi.spyOn(apiClient, 'deleteTask');
    renderCard(task);

    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('confirming delete calls deleteTask and triggers onTaskDeleted', async () => {
    const task = makeTask();
    vi.spyOn(apiClient, 'deleteTask').mockResolvedValue(undefined);
    const onDeleted = vi.fn();

    renderCard(task, vi.fn(), onDeleted);

    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByText('Delete', { selector: '[role="alertdialog"] button' }));

    await waitFor(() => {
      expect(apiClient.deleteTask).toHaveBeenCalledWith('task-1');
    });

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith('task-1');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Task deleted' }));
    });
  });

  it('delete failure shows destructive toast', async () => {
    const task = makeTask();
    vi.spyOn(apiClient, 'deleteTask').mockRejectedValue(new Error('Forbidden'));
    const onDeleted = vi.fn();

    renderCard(task, vi.fn(), onDeleted);

    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByText('Delete', { selector: '[role="alertdialog"] button' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to delete task', variant: 'destructive' }),
      );
    });

    expect(onDeleted).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Quick action clicks do NOT trigger card navigation
// ---------------------------------------------------------------------------
describe('TaskCard — click propagation safety', () => {
  it('Mark as Done does not navigate', () => {
    const task = makeTask();
    vi.spyOn(apiClient, 'updateTask').mockResolvedValue({ ...task, status: 'Done' as Status });
    renderCard(task);

    mockNavigate.mockClear();
    fireEvent.click(screen.getByTitle('Mark as Done'));

    // Navigate should NOT have been called (stopPropagation)
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Delete trigger does not navigate', () => {
    const task = makeTask();
    renderCard(task);

    mockNavigate.mockClear();
    fireEvent.click(screen.getByTitle('Delete'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// In-flight guards — prevent duplicate calls (R-002)
// ---------------------------------------------------------------------------
describe('TaskCard — in-flight guards', () => {
  it('Mark as Done: double-click results in exactly one API call', async () => {
    const task = makeTask();
    const d = deferred<Task>();
    const spy = vi.spyOn(apiClient, 'updateTask').mockReturnValue(d.promise);

    renderCard(task);

    const btn = screen.getByTitle('Mark as Done');
    fireEvent.click(btn);
    fireEvent.click(btn); // second click while in-flight

    // Only one API call
    expect(spy).toHaveBeenCalledTimes(1);

    // Resolve to clean up
    d.resolve({ ...task, status: 'Done' as Status, blockingReason: '' });
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
  });

  it('Delete: double-confirm results in exactly one API call', async () => {
    const task = makeTask();
    const d = deferred<void>();
    const spy = vi.spyOn(apiClient, 'deleteTask').mockReturnValue(d.promise);

    renderCard(task);

    // Open dialog and click Delete
    fireEvent.click(screen.getByTitle('Delete'));
    const confirmBtn = screen.getByText('Delete', { selector: '[role="alertdialog"] button' });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn); // second click while in-flight

    expect(spy).toHaveBeenCalledTimes(1);

    d.resolve();
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
  });
});
