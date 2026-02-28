import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { SubTaskList } from '@/components/SubTaskList';
import { DailyUpdateFeed } from '@/components/DailyUpdateFeed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiClient } from '@/lib/api';
import { Task, TeamMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft, Pencil, Trash2, Loader2, AlertTriangle, User } from 'lucide-react';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [t, m] = await Promise.all([apiClient.getTask(id), apiClient.getMembers()]);
      if (!mountedRef.current) return;
      if (!t) { navigate('/'); return; }
      setTask(t);
      setMembers(m);
    } catch (err) {
      if (!mountedRef.current) return;
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      navigate('/');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading || !task) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  const isBlocked = task.status === 'Blocked';

  const priorityStyles: Record<string, string> = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  const statusStyles: Record<string, string> = {
    'To Do': 'bg-gray-100 text-gray-700 border-gray-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    Blocked: 'bg-red-100 text-red-700 border-red-200',
    Done: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 max-w-3xl space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Task Info */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(priorityStyles[task.priority])} variant="outline">{task.priority}</Badge>
            <Badge className={cn(statusStyles[task.status])} variant="outline">{task.status}</Badge>
            {task.gearId && <Badge variant="outline" className="font-mono">#{task.gearId}</Badge>}
          </div>
          {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-4 w-4" /> {task.assigneeName || 'Unassigned'}
          </div>
        </div>

        {isBlocked && task.blockingReason && (
          <div className="flex items-start gap-2 rounded-md border-2 border-red-300 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div><strong>Blocked:</strong> {task.blockingReason}</div>
          </div>
        )}

        {/* Sub-tasks */}
        <SubTaskList taskId={task.id} subTasks={task.subTasks} onMutate={load} />

        {/* Daily Updates */}
        <DailyUpdateFeed taskId={task.id} dailyUpdates={task.dailyUpdates} members={members} onMutate={load} />
      </main>

      {/* Edit Task Dialog */}
      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} members={members} task={task}
        onSubmit={async data => {
          await apiClient.updateTask(task.id, data);
          toast({ title: 'Task updated' });
          load();
        }} />

      {/* Delete Task Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-task"
              disabled={deletingTask}
              onClick={async () => {
                if (deletingTask) return;
                setDeletingTask(true);
                try {
                  await apiClient.deleteTask(task.id);
                  toast({ title: 'Task deleted' });
                  navigate('/');
                } catch (err) {
                  toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
                } finally {
                  if (mountedRef.current) setDeletingTask(false);
                }
              }}
            >
              {deletingTask && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
