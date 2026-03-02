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
    if (typeof parsed !== 'object' || parsed === null) throw new Error('invalid');
    return {
      statusFilter:   typeof parsed.statusFilter === 'string'   ? parsed.statusFilter   : DEFAULTS.statusFilter,
      priorityFilter: typeof parsed.priorityFilter === 'string' ? parsed.priorityFilter : DEFAULTS.priorityFilter,
      assigneeFilter: typeof parsed.assigneeFilter === 'string' ? parsed.assigneeFilter : DEFAULTS.assigneeFilter,
      gearIdFilter:   typeof parsed.gearIdFilter === 'string'   ? parsed.gearIdFilter   : DEFAULTS.gearIdFilter,
      sort:           ['updated', 'created', 'priority'].includes(parsed.sort) ? parsed.sort : DEFAULTS.sort,
    };
  } catch {
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Persist filters
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
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>

        {/* Status Summary Bar */}
        <StatusSummaryBar tasks={tasks} activeStatus={statusFilter} onStatusClick={setStatusFilter} />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Input
            placeholder="GEAR ID…"
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
              {activeMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={v => setSort(v as DashboardSort)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="created">Recently Created</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" /> Clear Filters
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
              <TaskCard key={t.id} task={t} onTaskUpdated={handleTaskUpdated} onTaskDeleted={handleTaskDeleted} />
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
