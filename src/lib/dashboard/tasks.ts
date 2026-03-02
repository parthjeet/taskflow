import type { Task, TeamMember } from '@/types';

export type DashboardSort = 'updated' | 'created' | 'priority';

export interface DashboardQuery {
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  gearIdFilter: string;
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
