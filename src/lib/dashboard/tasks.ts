import type { Task, TeamMember } from '@/types';

export type DashboardSort = 'updated' | 'priority' | 'status';

interface DashboardQuery {
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  search: string;
  sort: DashboardSort;
}

const PRIORITY_ORDER: Record<Task['priority'], number> = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER: Record<Task['status'], number> = { 'To Do': 1, 'In Progress': 2, Blocked: 3, Done: 4 };

function byUpdatedAtDesc(a: Task, b: Task): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export function filterAndSortDashboardTasks(tasks: Task[], query: DashboardQuery): Task[] {
  const { statusFilter, priorityFilter, assigneeFilter, search, sort } = query;
  let list = [...tasks];

  if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
  if (priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
  if (assigneeFilter === 'unassigned') list = list.filter(t => !t.assigneeId);
  else if (assigneeFilter !== 'all') list = list.filter(t => t.assigneeId === assigneeFilter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q) ||
      (t.gearId ?? '').includes(q)
    );
  }

  if (sort === 'updated') list.sort(byUpdatedAtDesc);
  else if (sort === 'priority') {
    list.sort((a, b) => {
      const delta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (delta !== 0) return delta;
      return byUpdatedAtDesc(a, b);
    });
  } else if (sort === 'status') {
    list.sort((a, b) => {
      const delta = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (delta !== 0) return delta;
      return byUpdatedAtDesc(a, b);
    });
  }

  return list;
}

export function getActiveAssigneeMembers(members: TeamMember[]): TeamMember[] {
  return members.filter(member => member.active);
}
