import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyUpdateFeed } from '@/components/DailyUpdateFeed';
import { apiClient } from '@/lib/api';
import { DailyUpdate, TeamMember } from '@/types';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const members: TeamMember[] = [
  { id: 'm1', name: 'Alice', email: 'a@b.com', active: true },
  { id: 'm2', name: 'Bob', email: 'b@b.com', active: true },
  { id: 'm3', name: 'Eve', email: 'e@b.com', active: false },
];

const now = Date.now();
const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
const twentyFiveHoursAgo = new Date(now - 25 * 60 * 60 * 1000).toISOString();
const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

function makeUpdate(overrides: Partial<DailyUpdate> & { id: string }): DailyUpdate {
  return {
    taskId: 't1',
    authorId: 'm1',
    authorName: 'Alice',
    content: 'Test update',
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
    edited: false,
    ...overrides,
  };
}

const recentUpdate = makeUpdate({ id: 'u1', content: 'Recent update', createdAt: oneHourAgo, updatedAt: oneHourAgo });
const oldUpdate = makeUpdate({ id: 'u2', content: 'Old update', createdAt: twentyFiveHoursAgo, updatedAt: twentyFiveHoursAgo, authorId: 'm2', authorName: 'Bob' });
const editedUpdate = makeUpdate({ id: 'u3', content: 'Edited update', createdAt: twoHoursAgo, updatedAt: twoHoursAgo, edited: true });

const onMutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('DailyUpdateFeed — rendering order', () => {
  it('CMP-005: renders newest-first with author, timestamp, content, "(edited)"', () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[oldUpdate, recentUpdate, editedUpdate]} members={members} onMutate={onMutate} />);

    const items = screen.getAllByText(/update/i);
    // Recent update should appear before old
    const recentIdx = items.findIndex(el => el.textContent?.includes('Recent'));
    const oldIdx = items.findIndex(el => el.textContent?.includes('Old'));
    expect(recentIdx).toBeLessThan(oldIdx);

    // "(edited)" indicator
    expect(screen.getByText('(edited)')).toBeInTheDocument();

    // Author names
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('CMP-034: zero updates shows "No updates yet."', () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[]} members={members} onMutate={onMutate} />);
    expect(screen.getByText('No updates yet.')).toBeInTheDocument();
  });
});

describe('DailyUpdateFeed — 24h gating', () => {
  it('CMP-006: Edit button visible for updates < 24h', () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[recentUpdate]} members={members} onMutate={onMutate} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('CMP-007: Edit/Delete hidden for > 24h, "Past edit window" shown', () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[oldUpdate]} members={members} onMutate={onMutate} />);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Past edit window')).toBeInTheDocument();
  });

  it('CMP-023: Delete button hidden for updates > 24h', () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[oldUpdate]} members={members} onMutate={onMutate} />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('CMP-024: "Past edit window" has italic class', () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[oldUpdate]} members={members} onMutate={onMutate} />);
    const indicator = screen.getByText('Past edit window');
    expect(indicator.className).toContain('italic');
  });
});

describe('DailyUpdateFeed — edit flow', () => {
  it('CMP-022: edit flow with textarea, save, calls editDailyUpdate', async () => {
    vi.spyOn(apiClient, 'editDailyUpdate').mockResolvedValue(undefined);
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[recentUpdate]} members={members} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('Edit'));
    const textarea = screen.getByDisplayValue('Recent update');
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(apiClient.editDailyUpdate).toHaveBeenCalledWith('t1', 'u1', { content: 'Updated content' }));
    expect(onMutate).toHaveBeenCalled();
  });

  it('CMP-013: edit save error → destructive toast', async () => {
    vi.spyOn(apiClient, 'editDailyUpdate').mockRejectedValue(new Error('Updates can only be edited within 24 hours.'));
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[recentUpdate]} members={members} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByDisplayValue('Recent update'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Updates can only be edited within 24 hours.' }),
    ));
  });

  it('CMP-037: "(edited)" badge appears after edit', async () => {
    const updatedList = [{ ...recentUpdate, edited: true, content: 'Changed' }];
    vi.spyOn(apiClient, 'editDailyUpdate').mockResolvedValue(undefined);
    const { rerender } = render(<DailyUpdateFeed taskId="t1" dailyUpdates={[recentUpdate]} members={members} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByDisplayValue('Recent update'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onMutate).toHaveBeenCalled());

    // Simulate parent re-render with updated data
    rerender(<DailyUpdateFeed taskId="t1" dailyUpdates={updatedList} members={members} onMutate={onMutate} />);
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });
});

describe('DailyUpdateFeed — delete flow', () => {
  it('CMP-025: delete confirmation dialog calls deleteDailyUpdate', async () => {
    vi.spyOn(apiClient, 'deleteDailyUpdate').mockResolvedValue(undefined);
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[recentUpdate]} members={members} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('Delete'));

    // AlertDialog should appear
    expect(screen.getByText('Delete Update')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-delete-update'));

    await waitFor(() => expect(apiClient.deleteDailyUpdate).toHaveBeenCalledWith('t1', 'u1'));
    expect(onMutate).toHaveBeenCalled();
  });

  it('CMP-026: delete error → destructive toast', async () => {
    vi.spyOn(apiClient, 'deleteDailyUpdate').mockRejectedValue(new Error('Updates can only be deleted within 24 hours.'));
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[recentUpdate]} members={members} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByTestId('confirm-delete-update'));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Updates can only be deleted within 24 hours.' }),
    ));
  });
});

describe('DailyUpdateFeed — add update', () => {
  it('CMP-008: new update calls addDailyUpdate + saves author to localStorage', async () => {
    vi.spyOn(apiClient, 'addDailyUpdate').mockResolvedValue(makeUpdate({ id: 'u99', content: 'New' }));
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[]} members={members} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('Add Update'));

    // Dialog opens
    const textarea = screen.getByPlaceholderText("What's the latest?");
    fireEvent.change(textarea, { target: { value: 'New update content' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => expect(apiClient.addDailyUpdate).toHaveBeenCalled());
    expect(localStorage.getItem('taskflow-last-author')).toBeTruthy();
    expect(onMutate).toHaveBeenCalled();
  });

  it('CMP-027: empty content → submit disabled', () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[]} members={members} onMutate={onMutate} />);
    fireEvent.click(screen.getByText('Add Update'));
    const addBtn = screen.getAllByText('Add').find(el => el.tagName === 'BUTTON' && el.closest('[role="dialog"]'));
    expect(addBtn).toBeDisabled();
  });

  it('CMP-011: author dropdown pre-selects from localStorage', () => {
    localStorage.setItem('taskflow-last-author', 'm2');
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[]} members={members} onMutate={onMutate} />);
    fireEvent.click(screen.getByText('Add Update'));
    // The select should show Bob
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('CMP-029: author saved to localStorage on submit', async () => {
    vi.spyOn(apiClient, 'addDailyUpdate').mockResolvedValue(makeUpdate({ id: 'u99' }));
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[]} members={members} onMutate={onMutate} />);

    fireEvent.click(screen.getByText('Add Update'));
    fireEvent.change(screen.getByPlaceholderText("What's the latest?"), { target: { value: 'Something' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => expect(localStorage.getItem('taskflow-last-author')).toBeTruthy());
  });
});

describe('DailyUpdateFeed — test IDs preserved', () => {
  it('CMP-012: data-testid="confirm-delete-update" exists', async () => {
    render(<DailyUpdateFeed taskId="t1" dailyUpdates={[recentUpdate]} members={members} onMutate={onMutate} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('confirm-delete-update')).toBeInTheDocument();
  });
});
