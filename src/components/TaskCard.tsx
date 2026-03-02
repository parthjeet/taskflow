import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { InlineStatusSelect } from '@/components/InlineStatusSelect';
import { apiClient } from '@/lib/api';
import { STATUS_STYLES, PRIORITY_STYLES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/date-utils';
import { AlertTriangle, CheckCircle2, Pencil, Trash2, User } from 'lucide-react';
import type { Task, Status } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface TaskCardProps {
  task: Task;
  onTaskUpdated: (updated: Task) => void;
  onTaskDeleted: (id: string) => void;
}

export function TaskCard({ task, onTaskUpdated, onTaskDeleted }: Readonly<TaskCardProps>) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [markDoneLoading, setMarkDoneLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isBlocked = task.status === 'Blocked';
  const isDone = task.status === 'Done';
  const completedSubs = task.subTasks.filter(s => s.completed).length;
  const totalSubs = task.subTasks.length;

  const handleStatusChange = useCallback(async (id: string, status: Status, blockingReason = '') => {
    const previous = task;
    onTaskUpdated({ ...task, status, blockingReason });
    try {
      const updated = await apiClient.updateTask(id, { status, blockingReason });
      onTaskUpdated(updated);
    } catch {
      onTaskUpdated(previous);
      toast({ title: 'Status update failed', description: 'Changes were reverted.', variant: 'destructive' });
    }
  }, [task, onTaskUpdated, toast]);

  const handleMarkDone = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDone || markDoneLoading) return;
    setMarkDoneLoading(true);
    const previous = task;
    onTaskUpdated({ ...task, status: 'Done' as Status, blockingReason: '' });
    try {
      const updated = await apiClient.updateTask(task.id, { status: 'Done' as Status, blockingReason: '' });
      onTaskUpdated(updated);
      toast({ title: 'Task marked as Done' });
    } catch {
      onTaskUpdated(previous);
      toast({ title: 'Failed to mark as Done', description: 'Changes were reverted.', variant: 'destructive' });
    } finally {
      setMarkDoneLoading(false);
    }
  }, [task, isDone, markDoneLoading, onTaskUpdated, toast]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/tasks/${task.id}`);
  }, [navigate, task.id]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      await apiClient.deleteTask(task.id);
      onTaskDeleted(task.id);
      toast({ title: 'Task deleted' });
    } catch {
      toast({ title: 'Failed to delete task', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  }, [task.id, deleteLoading, onTaskDeleted, toast]);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        isBlocked && 'border-[3px] border-red-500 shadow-red-100 shadow-md'
      )}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{task.title}</h3>
          <Badge className={cn('shrink-0 text-[10px]', PRIORITY_STYLES[task.priority])} variant="outline">
            {task.priority}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge className={cn('text-[10px]', STATUS_STYLES[task.status])} variant="outline">
            {task.status}
          </Badge>
          {task.gearId && (
            <Badge variant="outline" className="text-[10px] font-mono">
              #{task.gearId}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {isBlocked && task.blockingReason && (
          <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-md p-2" title={task.blockingReason}>
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">
              {task.blockingReason.length > 50 ? task.blockingReason.slice(0, 50) + '...' : task.blockingReason}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{task.assigneeName || 'Unassigned'}</span>
        </div>
        {totalSubs > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sub-tasks</span>
              <span>{completedSubs}/{totalSubs}</span>
            </div>
            <Progress value={totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0} className="h-1.5" />
          </div>
        )}

        {/* Inline status change */}
        <InlineStatusSelect task={task} onStatusChange={handleStatusChange} />

        {/* Quick actions */}
        <div className="flex items-center gap-1 pt-1" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={isDone || markDoneLoading}
            onClick={handleMarkDone}
            title="Mark as Done"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={handleEdit}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={e => e.stopPropagation()}
                disabled={deleteLoading}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete task?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{task.title}&quot; will be permanently deleted. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={e => e.stopPropagation()}>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={deleteLoading} onClick={handleDelete}>
                  {deleteLoading ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-[11px] text-muted-foreground">{formatRelativeDate(task.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}
