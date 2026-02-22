import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import TaskDetail from '@/pages/TaskDetail';
import { TeamMember } from '@/lib/api/types';

const { mockToast, mockDismiss } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockDismiss: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toasts: [],
    toast: mockToast,
    dismiss: mockDismiss,
  }),
}));

const TASKS_KEY = 'taskflow_tasks';
const MEMBERS_KEY = 'taskflow_members';
const htmlElementPrototype = window.HTMLElement.prototype;
const originalPrototypeDescriptors = {
  scrollIntoView: Object.getOwnPropertyDescriptor(htmlElementPrototype, 'scrollIntoView'),
  hasPointerCapture: Object.getOwnPropertyDescriptor(htmlElementPrototype, 'hasPointerCapture'),
  releasePointerCapture: Object.getOwnPropertyDescriptor(htmlElementPrototype, 'releasePointerCapture'),
};

describe('Story 2.2 Comprehensive Test Suite', () => {
  const memberAlice: TeamMember = { id: 'm1', name: 'Alice', email: 'alice@example.com', active: true };
  const memberBob: TeamMember = { id: 'm2', name: 'Bob', email: 'bob@example.com', active: true };
  const memberInactive: TeamMember = { id: 'm3', name: 'Inactive', email: 'inactive@example.com', active: false };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Pre-seed with valid data so we don't rely on the mock's auto-seed logic
    localStorage.setItem(MEMBERS_KEY, JSON.stringify([memberAlice, memberBob, memberInactive]));
    localStorage.setItem(TASKS_KEY, '[]');

    // Ensure methods exist before spying because jsdom may omit some pointer/scroll APIs.
    if (!('scrollIntoView' in htmlElementPrototype)) {
      Object.defineProperty(htmlElementPrototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: () => undefined,
      });
    }
    if (!('hasPointerCapture' in htmlElementPrototype)) {
      Object.defineProperty(htmlElementPrototype, 'hasPointerCapture', {
        configurable: true,
        writable: true,
        value: () => false,
      });
    }
    if (!('releasePointerCapture' in htmlElementPrototype)) {
      Object.defineProperty(htmlElementPrototype, 'releasePointerCapture', {
        configurable: true,
        writable: true,
        value: () => undefined,
      });
    }

    vi.spyOn(htmlElementPrototype, 'scrollIntoView').mockImplementation(() => undefined);
    vi.spyOn(htmlElementPrototype, 'hasPointerCapture').mockImplementation(() => false);
    vi.spyOn(htmlElementPrototype, 'releasePointerCapture').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPrototypeDescriptors.scrollIntoView) {
      Object.defineProperty(htmlElementPrototype, 'scrollIntoView', originalPrototypeDescriptors.scrollIntoView);
    } else {
      delete (htmlElementPrototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
    if (originalPrototypeDescriptors.hasPointerCapture) {
      Object.defineProperty(htmlElementPrototype, 'hasPointerCapture', originalPrototypeDescriptors.hasPointerCapture);
    } else {
      delete (htmlElementPrototype as { hasPointerCapture?: unknown }).hasPointerCapture;
    }
    if (originalPrototypeDescriptors.releasePointerCapture) {
      Object.defineProperty(htmlElementPrototype, 'releasePointerCapture', originalPrototypeDescriptors.releasePointerCapture);
    } else {
      delete (htmlElementPrototype as { releasePointerCapture?: unknown }).releasePointerCapture;
    }
  });

  it('AC 6: updateTask resolves assigneeName from assigneeId', async () => {
    // 1. Create task
    const task = await apiClient.createTask({
      title: 'Assignee Resolution Test',
      description: null,
      status: 'To Do',
      priority: 'Medium',
      assigneeId: memberAlice.id,
      gearId: null,
      blockingReason: ''
    });
    
    expect(task.assigneeName).toBe(memberAlice.name);

    // 2. Update assignee to Bob
    const updated = await apiClient.updateTask(task.id, { assigneeId: memberBob.id });
    
    // Assertions for AC 6
    expect(updated.assigneeId).toBe(memberBob.id);
    expect(updated.assigneeName).toBe(memberBob.name);

    // 3. Unassign
    const unassigned = await apiClient.updateTask(task.id, { assigneeId: null });
    expect(unassigned.assigneeId).toBeNull();
    expect(unassigned.assigneeName).toBeNull();
  });

  it('AC 6 Edge Case: updateTask throws if assignee does not exist', async () => {
    const task = await apiClient.createTask({
      title: 'Invalid Assignee Test',
      description: null,
      status: 'To Do',
      priority: 'Medium',
      assigneeId: null,
      gearId: null,
      blockingReason: ''
    });

    // Should reject
    await expect(apiClient.updateTask(task.id, { assigneeId: 'non-existent-id' }))
      .rejects.toThrow('Assignee not found');
  });

  it('AC 7: addSubTask throws error when limit of 20 is reached', async () => {
    vi.useFakeTimers();
    try {
      const createTaskPromise = apiClient.createTask({
        title: 'Subtask Limit Test',
        description: null,
        status: 'To Do',
        priority: 'Medium',
        assigneeId: null,
        gearId: null,
        blockingReason: ''
      });
      await vi.runAllTimersAsync();
      const task = await createTaskPromise;

      // Add 20 subtasks via Promise.all to verify the 20-limit check holds regardless of call ordering.
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(apiClient.addSubTask(task.id, { title: `Subtask ${i}` }));
      }
      const addSubTasksPromise = Promise.all(promises);
      await vi.runAllTimersAsync();
      await addSubTasksPromise;

      // Attempt 21st - This should fail
      const overLimitPromise = apiClient.addSubTask(task.id, { title: 'Subtask 21' });
      const rejection = expect(overLimitPromise).rejects.toThrow(/Maximum of 20 sub-tasks/);
      await vi.runAllTimersAsync();
      await rejection;
      
      // Verify count remains 20
      const refreshedPromise = apiClient.getTask(task.id);
      await vi.runAllTimersAsync();
      const refreshed = await refreshedPromise;
      expect(refreshed?.subTasks.length).toBe(20);
    } finally {
      vi.useRealTimers();
    }
  });

  it('AC 8: TaskDetail persists and restores last used author for daily updates', async () => {
    const task = await apiClient.createTask({
      title: 'Author Persistence Test',
      description: null,
      status: 'To Do',
      priority: 'Medium',
      assigneeId: null,
      gearId: null,
      blockingReason: ''
    });

    render(
      <MemoryRouter initialEntries={[`/tasks/${task.id}`]}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for task load
    await waitFor(() => expect(screen.getByText('Author Persistence Test')).toBeInTheDocument());

    // Open Add Update dialog
    fireEvent.click(screen.getByText('Add Update'));
    
    // Select Bob
    const trigger = screen.getByRole('combobox');
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    
    const bobOption = await screen.findByText('Bob');
    fireEvent.pointerDown(bobOption);
    fireEvent.click(bobOption);

    // Type content
    const textarea = screen.getByPlaceholderText("What's the latest?");
    fireEvent.change(textarea, { target: { value: 'Update from Bob' } });

    // Click Add
    const addBtn = screen.getByText('Add', { selector: 'button' });
    fireEvent.click(addBtn);

    // Wait for dialog to close (implies success)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    
    // Wait for list to reload and show new item
    await waitFor(() => expect(screen.getByText('Update from Bob')).toBeInTheDocument());

    // Check localStorage
    expect(localStorage.getItem('taskflow-last-author')).toBe(memberBob.id);

    // Re-open and check default selection
    fireEvent.click(screen.getByText('Add Update'));
    // The select value (trigger text) should be Bob
    const newTrigger = screen.getByRole('combobox');
    expect(newTrigger).toHaveTextContent('Bob'); 
  });

  it('Handles race conditions in deleteSubTask gracefully', async () => {
    const task = await apiClient.createTask({
        title: 'Race Condition Test',
        description: null,
        status: 'To Do',
        priority: 'Medium',
        assigneeId: null,
        gearId: null,
        blockingReason: ''
    });
    
    const sub = await apiClient.addSubTask(task.id, { title: 'To Delete' });
    
    render(
      <MemoryRouter initialEntries={[`/tasks/${task.id}`]}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => expect(screen.getByText('Race Condition Test')).toBeInTheDocument());
    
    // Find delete button
    const deleteBtn = screen.getByTestId(`delete-subtask-${sub.id}`);
    
    // Simulate double click
    fireEvent.click(deleteBtn);
    fireEvent.click(deleteBtn);
    
    // Should remove item and NOT crash/toast error
    await waitFor(() => expect(screen.queryByText('To Delete')).not.toBeInTheDocument());
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('Handles race conditions in toggleSubTask gracefully', async () => {
    const task = await apiClient.createTask({
      title: 'Toggle Race Condition Test',
      description: null,
      status: 'To Do',
      priority: 'Medium',
      assigneeId: null,
      gearId: null,
      blockingReason: ''
    });

    await apiClient.addSubTask(task.id, { title: 'Toggle me' });

    const originalToggleSubTask = apiClient.toggleSubTask.bind(apiClient);
    let releaseToggle: (() => void) | null = null;
    const toggleSpy = vi.spyOn(apiClient, 'toggleSubTask').mockImplementation(async (taskId, subTaskId) => {
      await new Promise<void>((resolve) => {
        releaseToggle = resolve;
      });
      return originalToggleSubTask(taskId, subTaskId);
    });

    render(
      <MemoryRouter initialEntries={[`/tasks/${task.id}`]}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Toggle Race Condition Test')).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(checkbox).toBeDisabled();

    releaseToggle?.();

    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeDisabled(), { timeout: 3000 });
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
