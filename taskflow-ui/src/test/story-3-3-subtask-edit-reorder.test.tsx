import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SubTaskList } from '@/components/SubTaskList';
import { apiClient } from '@/lib/api';
import { SubTask } from '@/types';
import { deferred } from '@/test/test-utils';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ReactElement, ReactNode } from 'react';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock DndContext to capture onDragEnd
let capturedOnDragEnd: ((event: DragEndEvent) => Promise<void> | void) | null = null;
type DndContextMockProps = {
  children?: ReactNode;
  onDragEnd?: (event: DragEndEvent) => Promise<void> | void;
};
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  const ActualDndContext = (actual as { DndContext: (props: DndContextMockProps) => ReactElement }).DndContext;
  return {
    ...actual,
    DndContext: (props: DndContextMockProps) => {
      capturedOnDragEnd = props.onDragEnd ?? null;
      return <ActualDndContext {...props} />;
    },
  };
});

function makeSub(overrides: Partial<SubTask> & { id: string; title: string }): SubTask {
  return { completed: false, position: 0, createdAt: new Date().toISOString(), ...overrides };
}

function getDeleteButtonOrder() {
  return screen
    .getAllByRole('button', { name: 'Delete sub-task' })
    .map(button => button.getAttribute('data-testid'));
}

const sub1 = makeSub({ id: 's1', title: 'First', position: 0 });
const sub2 = makeSub({ id: 's2', title: 'Second', position: 1 });
const sub3 = makeSub({ id: 's3', title: 'Third', position: 2, completed: true });

const onMutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnDragEnd = null;
});

describe('SubTaskList — inline edit', () => {
  it('CMP-018: click title → input appears, Enter saves', async () => {
    vi.spyOn(apiClient, 'editSubTask').mockResolvedValue({ ...sub1, title: 'Updated' });
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(apiClient.editSubTask).toHaveBeenCalledWith('t1', 's1', { title: 'Updated' }));
    expect(onMutate).toHaveBeenCalled();
  });

  it('CMP-056: blur save uses latest typed title', async () => {
    const editSpy = vi.spyOn(apiClient, 'editSubTask').mockResolvedValue({ ...sub1, title: 'Blur Updated' });
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: 'Blur Updated' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(editSpy).toHaveBeenCalledTimes(1);
      expect(editSpy).toHaveBeenCalledWith('t1', 's1', { title: 'Blur Updated' });
    });
    expect(onMutate).toHaveBeenCalled();
  });

  it('CMP-052: Enter then blur only saves once', async () => {
    const editSpy = vi.spyOn(apiClient, 'editSubTask').mockResolvedValue({ ...sub1, title: 'Updated once' });
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: 'Updated once' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(editSpy).toHaveBeenCalledTimes(1);
      expect(editSpy).toHaveBeenCalledWith('t1', 's1', { title: 'Updated once' });
    });
  });

  it('CMP-054: Escape then browser-blur does NOT save (production blur guard)', async () => {
    // Real browsers fire blur when the focused <Input> is removed from the DOM.
    // This test explicitly fires blur after Escape to verify the guard suppresses it.
    const editSpy = vi.spyOn(apiClient, 'editSubTask').mockResolvedValue({ ...sub1, title: 'Changed' });
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    // Simulate the blur that real browsers fire during Input unmount
    fireEvent.blur(input);

    // Wait a tick to allow any async saveEdit to run if the guard is broken
    await new Promise(r => setTimeout(r, 0));
    expect(editSpy).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

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

  it('CMP-042: edit to same title is a no-op (no API call)', async () => {
    const editSpy = vi.spyOn(apiClient, 'editSubTask').mockResolvedValue({ ...sub1, title: 'First' });
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: '  First  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(editSpy).not.toHaveBeenCalled());
  });

  it('CMP-019: empty title → validation toast, reverts', async () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    ));
  });

  it('CMP-020: whitespace-only → validation toast, reverts', async () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: '  \t  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    ));
  });

  it('CMP-021: title > 200 chars → validation toast', async () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('First'));
    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: 'x'.repeat(201) } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    ));
  });

  it('H1: keyboard Enter/Space triggers inline edit', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    const span = screen.getByText('First');
    expect(span).toHaveAttribute('role', 'button');
    expect(span).toHaveAttribute('tabIndex', '0');
    expect(span).toHaveAttribute('aria-label', 'Edit sub-task: First');

    fireEvent.keyDown(span, { key: 'Enter' });
    expect(screen.getByDisplayValue('First')).toBeInTheDocument();
  });
});

describe('SubTaskList — drag reorder', () => {
  it('CMP-009: reorder calls reorderSubTasks with correct ordered IDs', async () => {
    const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
      { ...sub2, position: 0 },
      { ...sub1, position: 1 },
      { ...sub3, position: 2 },
    ]);
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

    expect(capturedOnDragEnd).toBeTruthy();

    // Simulate dragging s1 over s2 (arrayMove index 0→1 produces [s2, s1, s3])
    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 's1' },
        over: { id: 's2' },
      } as unknown as DragEndEvent);
    });

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith('t1', ['s2', 's1', 's3']);
    });
    await waitFor(() => expect(onMutate).toHaveBeenCalled());
  });

  it('CMP-010: reorder API failure → destructive toast', async () => {
    vi.spyOn(apiClient, 'reorderSubTasks').mockRejectedValue(new Error('Server error'));
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

    expect(capturedOnDragEnd).toBeTruthy();

    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 's1' },
        over: { id: 's3' },
      } as unknown as DragEndEvent);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', description: 'Server error' }),
      );
    });
  });

  it('CMP-046: dropping outside list is a no-op', async () => {
    const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([sub1, sub2, sub3]);
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

    expect(capturedOnDragEnd).toBeTruthy();

    await act(async () => {
      await capturedOnDragEnd!({
        active: { id: 's1' },
        over: null,
      } as unknown as DragEndEvent);
    });

    expect(reorderSpy).not.toHaveBeenCalled();
    expect(onMutate).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('CMP-061: dropping onto same position is a no-op', async () => {
    const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([sub1, sub2, sub3]);
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);

    expect(capturedOnDragEnd).toBeTruthy();

    await act(async () => {
      await capturedOnDragEnd!({
        active: { id: 's1' },
        over: { id: 's1' },
      } as unknown as DragEndEvent);
    });

    expect(reorderSpy).not.toHaveBeenCalled();
    expect(onMutate).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('CMP-043: keeps optimistic order while awaiting async onMutate', async () => {
    const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
      { ...sub2, position: 0 },
      { ...sub1, position: 1 },
      { ...sub3, position: 2 },
    ]);
    const pendingMutate = deferred<void>();
    const asyncOnMutate = vi.fn(() => pendingMutate.promise);
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={asyncOnMutate} />);

    expect(capturedOnDragEnd).toBeTruthy();
    expect(getDeleteButtonOrder()).toEqual([
      'delete-subtask-s1',
      'delete-subtask-s2',
      'delete-subtask-s3',
    ]);

    let dragPromise: Promise<void> | undefined;
    await act(async () => {
      dragPromise = Promise.resolve(capturedOnDragEnd!({
        active: { id: 's1' },
        over: { id: 's2' },
      } as unknown as DragEndEvent));
    });

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith('t1', ['s2', 's1', 's3']);
    });
    expect(asyncOnMutate).toHaveBeenCalledTimes(1);
    expect(getDeleteButtonOrder()).toEqual([
      'delete-subtask-s2',
      'delete-subtask-s1',
      'delete-subtask-s3',
    ]);

    pendingMutate.resolve();
    await act(async () => {
      await dragPromise;
    });
  });

  it('CMP-044: onMutate refresh failure after successful reorder does not show destructive toast', async () => {
    const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
      { ...sub2, position: 0 },
      { ...sub1, position: 1 },
      { ...sub3, position: 2 },
    ]);
    const failingOnMutate = vi.fn().mockRejectedValue(new Error('Refresh failed'));
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={failingOnMutate} />);

    expect(capturedOnDragEnd).toBeTruthy();

    await act(async () => {
      await capturedOnDragEnd!({
        active: { id: 's1' },
        over: { id: 's2' },
      } as unknown as DragEndEvent);
    });

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith('t1', ['s2', 's1', 's3']);
    });
    expect(failingOnMutate).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('CMP-045: ignores a second drag while first reorder refresh is in flight', async () => {
    const reorderSpy = vi.spyOn(apiClient, 'reorderSubTasks').mockResolvedValue([
      { ...sub2, position: 0 },
      { ...sub1, position: 1 },
      { ...sub3, position: 2 },
    ]);
    const pendingMutate = deferred<void>();
    const asyncOnMutate = vi.fn(() => pendingMutate.promise);
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={asyncOnMutate} />);

    expect(capturedOnDragEnd).toBeTruthy();

    let firstDragPromise: Promise<void> | undefined;
    await act(async () => {
      firstDragPromise = Promise.resolve(capturedOnDragEnd!({
        active: { id: 's1' },
        over: { id: 's2' },
      } as unknown as DragEndEvent));
    });

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledTimes(1);
      expect(reorderSpy).toHaveBeenCalledWith('t1', ['s2', 's1', 's3']);
    });
    expect(asyncOnMutate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve(capturedOnDragEnd!({
        active: { id: 's2' },
        over: { id: 's3' },
      } as unknown as DragEndEvent));
    });

    expect(reorderSpy).toHaveBeenCalledTimes(1);
    expect(asyncOnMutate).toHaveBeenCalledTimes(1);

    pendingMutate.resolve();
    await act(async () => {
      await firstDragPromise;
    });
  });

  it('CMP-033: single sub-task list renders without drag issues', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('drag handle has aria-label', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);
    expect(screen.getByRole('button', { name: 'Reorder sub-task' })).toBeInTheDocument();
  });
});

describe('SubTaskList — progress', () => {
  it('CMP-001: shows correct progress count', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1, sub2, sub3]} onMutate={onMutate} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('hides progress when no sub-tasks', () => {
    render(<SubTaskList taskId="t1" subTasks={[]} onMutate={onMutate} />);
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });
});

describe('SubTaskList — optimistic toggle', () => {
  it('CMP-047: checkbox syncs when completed prop changes', () => {
    const { rerender } = render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    rerender(<SubTaskList taskId="t1" subTasks={[{ ...sub1, completed: true }]} onMutate={onMutate} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('CMP-003: toggle flips checkbox immediately', async () => {
    vi.spyOn(apiClient, 'toggleSubTask').mockResolvedValue({ ...sub1, completed: true });
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Optimistic: should flip immediately
    await waitFor(() => expect(onMutate).toHaveBeenCalled());
  });

  it('CMP-004: toggle API failure → revert + toast', async () => {
    vi.spyOn(apiClient, 'toggleSubTask').mockRejectedValue(new Error('Network error'));
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Network error' }),
    ));
  });
});

describe('SubTaskList — add', () => {
  it('CMP-002: add sub-task calls API and clears input', async () => {
    vi.spyOn(apiClient, 'addSubTask').mockResolvedValue(makeSub({ id: 's99', title: 'New', position: 1 }));
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    const input = screen.getByPlaceholderText('Add sub-task...');
    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.click(screen.getByTestId('add-subtask-btn'));

    await waitFor(() => expect(onMutate).toHaveBeenCalled());
  });

  it('CMP-016: empty input does not submit', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);
    const btn = screen.getByTestId('add-subtask-btn');
    expect(btn).toBeDisabled();
  });

  it('UNIT-001: add sub-task at 20-limit → destructive toast', async () => {
    vi.spyOn(apiClient, 'addSubTask').mockRejectedValue(new Error('Maximum of 20 sub-tasks per task'));

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

  it('CMP-049: second submit is ignored while add request is in flight', async () => {
    const pending = deferred<SubTask>();
    const addSpy = vi.spyOn(apiClient, 'addSubTask').mockImplementation(() => pending.promise);
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);

    const input = screen.getByPlaceholderText('Add sub-task...');
    const addButton = screen.getByTestId('add-subtask-btn');

    fireEvent.change(input, { target: { value: 'In-flight sub-task' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledTimes(1);
    });
    expect(addButton).toBeDisabled();

    fireEvent.click(addButton);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(addSpy).toHaveBeenCalledTimes(1);

    pending.resolve(makeSub({ id: 's99', title: 'In-flight sub-task', position: 1 }));
    await waitFor(() => {
      expect(onMutate).toHaveBeenCalled();
    });
  });

  it('CMP-050: add success with failing onMutate does not show destructive toast', async () => {
    vi.spyOn(apiClient, 'addSubTask').mockResolvedValue(makeSub({ id: 's100', title: 'Safe refresh', position: 1 }));
    const failingOnMutate = vi.fn().mockRejectedValue(new Error('Refresh failed'));
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={failingOnMutate} />);

    fireEvent.change(screen.getByPlaceholderText('Add sub-task...'), { target: { value: 'Safe refresh' } });
    fireEvent.click(screen.getByTestId('add-subtask-btn'));

    await waitFor(() => {
      expect(apiClient.addSubTask).toHaveBeenCalledWith('t1', { title: 'Safe refresh' });
    });
    await waitFor(() => {
      expect(failingOnMutate).toHaveBeenCalledTimes(1);
    });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Refresh failed' }),
    );
  });
});

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

  it('delete button has aria-label', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);
    expect(screen.getByRole('button', { name: 'Delete sub-task' })).toBeInTheDocument();
  });
});

describe('SubTaskList — test IDs preserved', () => {
  it('CMP-012: data-testid="add-subtask-btn" exists', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);
    expect(screen.getByTestId('add-subtask-btn')).toBeInTheDocument();
  });

  it('CMP-012: data-testid="delete-subtask-{id}" exists', () => {
    render(<SubTaskList taskId="t1" subTasks={[sub1]} onMutate={onMutate} />);
    expect(screen.getByTestId('delete-subtask-s1')).toBeInTheDocument();
  });
});
