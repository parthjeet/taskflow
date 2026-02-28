import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Task, TeamMember, Status, Priority } from '@/types';
import { MAX_BLOCKING_REASON_LENGTH, MAX_TASK_DESCRIPTION_LENGTH, MAX_TASK_TITLE_LENGTH } from '@/lib/api/constants';
import { Loader2, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string; description: string | null; status: Status; priority: Priority;
    assigneeId: string | null; gearId: string | null; blockingReason: string;
  }) => Promise<void>;
  members: TeamMember[];
  task?: Task | null;
}

const statuses: Status[] = ['To Do', 'In Progress', 'Blocked', 'Done'];
const priorities: Priority[] = ['High', 'Medium', 'Low'];

export function TaskFormDialog({ open, onOpenChange, onSubmit, members, task }: Readonly<Props>) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('To Do');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');
  const [gearId, setGearId] = useState('');
  const [blockingReason, setBlockingReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description ?? '');
        setStatus(task.status);
        setPriority(task.priority);
        const hasActiveAssignee = task.assigneeId !== null && members.some(m => m.id === task.assigneeId && m.active);
        setAssigneeId(hasActiveAssignee && task.assigneeId ? task.assigneeId : 'unassigned');
        setGearId(task.gearId ?? '');
        setBlockingReason(task.blockingReason);
      } else {
        setTitle(''); setDescription(''); setStatus('To Do'); setPriority('Medium');
        setAssigneeId('unassigned'); setGearId(''); setBlockingReason('');
      }
      setErrors({}); setFormError('');
    }
    wasOpenRef.current = open;
  }, [open, task, members]);

  useEffect(() => {
    if (!open || assigneeId === 'unassigned') return;
    const hasActiveAssignee = members.some(m => m.id === assigneeId && m.active);
    if (!hasActiveAssignee) setAssigneeId('unassigned');
  }, [open, assigneeId, members]);

  useEffect(() => {
    if (status !== 'Blocked') setBlockingReason('');
  }, [status]);

  function validate() {
    const e: Record<string, string> = {};
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const normalizedBlockingReason = blockingReason.trim();

    if (!normalizedTitle) e.title = 'Title is required';
    if (normalizedTitle.length > MAX_TASK_TITLE_LENGTH) {
      e.title = `Title must be ${MAX_TASK_TITLE_LENGTH} characters or fewer`;
    }
    if (normalizedDescription.length > MAX_TASK_DESCRIPTION_LENGTH) {
      e.description = `Description must be ${MAX_TASK_DESCRIPTION_LENGTH} characters or fewer`;
    }
    if (gearId && !/^\d{4}$/.test(gearId)) e.gearId = 'GEAR ID must be exactly 4 digits';
    if (status === 'Blocked' && !normalizedBlockingReason) e.blockingReason = 'Blocking reason is required';
    if (normalizedBlockingReason.length > MAX_BLOCKING_REASON_LENGTH) {
      e.blockingReason = `Blocking reason must be ${MAX_BLOCKING_REASON_LENGTH} characters or fewer`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) { setFormError('Please fix the errors below.'); return; }
    setFormError('');
    setLoading(true);
    try {
      const normalizedGearId = gearId.trim();
      const normalizedDescription = description.trim();
      await onSubmit({
        title: title.trim(),
        description: normalizedDescription === '' ? null : normalizedDescription,
        status,
        priority,
        assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
        gearId: normalizedGearId === '' ? null : normalizedGearId,
        blockingReason: blockingReason.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const activeMembers = members.filter(m => m.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>{task ? 'Update the task details below.' : 'Fill in the details to create a new task.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" maxLength={MAX_TASK_TITLE_LENGTH} />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={3} maxLength={MAX_TASK_DESCRIPTION_LENGTH} />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {activeMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gear">GEAR ID</Label>
              <Input id="gear" value={gearId} onChange={e => setGearId(e.target.value)} placeholder="e.g. 1024" maxLength={4} className="font-mono" />
              {errors.gearId && <p className="text-xs text-destructive">{errors.gearId}</p>}
            </div>
          </div>
          {status === 'Blocked' && (
            <div className="space-y-1.5 rounded-md border-2 border-red-300 bg-red-50 p-3">
              <Label htmlFor="reason" className="text-red-700">Blocking Reason *</Label>
              <Textarea id="reason" value={blockingReason} onChange={e => setBlockingReason(e.target.value)} placeholder="Why is this task blocked?" rows={2} maxLength={MAX_BLOCKING_REASON_LENGTH} className="border-red-200" />
              {errors.blockingReason && <p className="text-xs text-destructive">{errors.blockingReason}</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {task ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
