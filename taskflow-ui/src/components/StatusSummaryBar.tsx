import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from '@/lib/constants';
import type { Task } from '@/types';

interface StatusSummaryBarProps {
  tasks: Task[];
  activeStatus: string;
  onStatusClick: (status: string) => void;
}

const STATUSES = ['To Do', 'In Progress', 'Blocked', 'Done'] as const;

export function StatusSummaryBar({ tasks, activeStatus, onStatusClick }: Readonly<StatusSummaryBarProps>) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { 'To Do': 0, 'In Progress': 0, Blocked: 0, Done: 0 };
    tasks.forEach(t => { if (map[t.status] !== undefined) map[t.status]++; });
    return map;
  }, [tasks]);

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map(status => {
        const isActive = activeStatus === status;
        return (
          <Badge
            key={status}
            role="button"
            tabIndex={0}
            onClick={() => onStatusClick(isActive ? 'all' : status)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStatusClick(isActive ? 'all' : status); } }}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              STATUS_STYLES[status],
              isActive ? 'ring-2 ring-offset-1 ring-current opacity-100' : 'opacity-70 hover:opacity-100'
            )}
          >
            {status}: {counts[status]}
          </Badge>
        );
      })}
    </div>
  );
}
