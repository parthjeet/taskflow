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

export function InlineStatusSelect({ task, onStatusChange }: Readonly<InlineStatusSelectProps>) {
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
      setTimeout(() => reasonInputRef.current?.focus(), 50);
    } else {
      commitChange(status, '');
    }
  };

  const commitChange = async (status: Status, reason: string) => {
    if (isLoading) return;
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
      setReasonError('Blocking reason is required.');
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
      <Select value={task.status} onValueChange={handleStatusSelect} disabled={isLoading}>
        <SelectTrigger aria-label="Change Status" onClick={e => e.stopPropagation()} className="h-7 text-xs w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent onClick={e => e.stopPropagation()}>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {pendingStatus === 'Blocked' && (
        <div onClick={e => e.stopPropagation()} className="space-y-1">
          <Input
            ref={reasonInputRef}
            placeholder="Blocking reason…"
            value={reasonInput}
            onChange={e => { setReasonInput(e.target.value); setReasonError(''); }}
            className={cn('h-7 text-xs', reasonError && 'border-red-500')}
            onKeyDown={e => { if (e.key === 'Enter') handleReasonSubmit(); if (e.key === 'Escape') handleCancel(); }}
            disabled={isLoading}
          />
          {reasonError && <p className="text-xs text-red-600">{reasonError}</p>}
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-xs" disabled={isLoading} onClick={handleReasonSubmit}>
              {isLoading ? '…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" disabled={isLoading} onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
