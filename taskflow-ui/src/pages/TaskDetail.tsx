import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TaskFormDialog } from '@/components/TaskFormDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiClient } from '@/lib/api';
import { Task, TeamMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeDate, isWithin24Hours } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { ArrowLeft, Pencil, Trash2, Plus, Loader2, AlertTriangle, User, X } from 'lucide-react';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [updateAuthor, setUpdateAuthor] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteUpdateId, setDeleteUpdateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [t, m] = await Promise.all([apiClient.getTask(id), apiClient.getMembers()]);
      if (!t) { navigate('/'); return; }
      setTask(t);
      setMembers(m);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  if (loading || !task) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  const completedSubs = task.subTasks.filter(s => s.completed).length;
  const totalSubs = task.subTasks.length;
  const progress = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;
  const isBlocked = task.status === 'Blocked';
  const activeMembers = members.filter(m => m.active);

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
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sub-tasks</h2>
          {totalSubs > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{completedSubs}/{totalSubs}</span></div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          <div className="space-y-2">
            {task.subTasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 group">
                <Checkbox
                  checked={sub.completed}
                  onCheckedChange={async () => {
                    await apiClient.toggleSubTask(task.id, sub.id);
                    load();
                  }}
                />
                <span className={cn('text-sm flex-1', sub.completed && 'line-through text-muted-foreground')}>{sub.title}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={async () => { await apiClient.deleteSubTask(task.id, sub.id); toast({ title: 'Sub-task removed' }); load(); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add sub-task..." value={newSub} onChange={e => setNewSub(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter' && newSub.trim()) {
                  await apiClient.addSubTask(task.id, { title: newSub.trim() });
                  setNewSub('');
                  load();
                }
              }}
              className="text-sm" />
            <Button size="sm" variant="outline" disabled={!newSub.trim()} onClick={async () => {
              await apiClient.addSubTask(task.id, { title: newSub.trim() });
              setNewSub('');
              load();
            }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Daily Updates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Daily Updates</h2>
            <Button size="sm" onClick={() => { setAddingUpdate(true); setUpdateAuthor(activeMembers[0]?.id || ''); setUpdateContent(''); }}>
              <Plus className="h-4 w-4" /> Add Update
            </Button>
          </div>
          {task.dailyUpdates.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No updates yet.</p>
          )}
          <div className="space-y-3">
            {task.dailyUpdates.map(upd => (
              <div key={upd.id} className="rounded-md border p-3 space-y-1">
                {editingUpdateId === upd.id ? (
                  <div className="space-y-2">
                    <Textarea value={editingContent} onChange={e => setEditingContent(e.target.value)} rows={2} />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditingUpdateId(null)}>Cancel</Button>
                      <Button size="sm" onClick={async () => {
                        try {
                          await apiClient.editDailyUpdate(task.id, upd.id, { content: editingContent });
                          toast({ title: 'Update edited' });
                          setEditingUpdateId(null);
                          load();
                      } catch (err) { toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' }); }
                      }}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{upd.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(upd.createdAt)}
                        {upd.edited && <span className="italic ml-1">(edited)</span>}
                      </span>
                    </div>
                    <p className="text-sm">{upd.content}</p>
                    {isWithin24Hours(upd.createdAt) && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-6 text-xs"
                          onClick={() => { setEditingUpdateId(upd.id); setEditingContent(upd.content); }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteUpdateId(upd.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add Update Dialog */}
      <Dialog open={addingUpdate} onOpenChange={setAddingUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Daily Update</DialogTitle>
            <DialogDescription>Select an author and enter your update.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Author</Label>
              <Select value={updateAuthor} onValueChange={setUpdateAuthor}>
                <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
                <SelectContent>
                  {activeMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Update</Label>
              <Textarea value={updateContent} onChange={e => setUpdateContent(e.target.value)} placeholder="What's the latest?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingUpdate(false)}>Cancel</Button>
            <Button disabled={!updateContent.trim() || !updateAuthor || updateLoading} onClick={async () => {
              setUpdateLoading(true);
              try {
                await apiClient.addDailyUpdate(task.id, { authorId: updateAuthor, content: updateContent.trim() });
                toast({ title: 'Update added' });
                setAddingUpdate(false);
                load();
              } catch (err) { toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' }); }
              finally { setUpdateLoading(false); }
            }}>
              {updateLoading && <Loader2 className="h-4 w-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} members={members} task={task}
        onSubmit={async data => { await apiClient.updateTask(task.id, data); toast({ title: 'Task updated' }); load(); }} />

      {/* Delete Task Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await apiClient.deleteTask(task.id);
              toast({ title: 'Task deleted' });
              navigate('/');
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Update Confirm */}
      <AlertDialog open={!!deleteUpdateId} onOpenChange={open => !open && setDeleteUpdateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this update?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await apiClient.deleteDailyUpdate(task.id, deleteUpdateId!);
                toast({ title: 'Update deleted' });
                setDeleteUpdateId(null);
                load();
              } catch (err) { toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' }); }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
