import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api';
import { MAX_SUBTASK_TITLE_LENGTH } from '@/lib/api/constants';
import { SubTask } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, X, Loader2 } from 'lucide-react';

interface SubTaskListProps {
  taskId: string;
  subTasks: SubTask[];
  onMutate: () => void;
}

const SortableSubTaskItem = memo(function SortableSubTaskItem({
  sub,
  taskId,
  onMutate,
}: Readonly<{
  sub: SubTask;
  taskId: string;
  onMutate: () => void;
}>) {
  const { toast } = useToast();
  const [completed, setCompleted] = useState(sub.completed);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(sub.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sub.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Sync optimistic state with prop
  if (!toggling && completed !== sub.completed) {
    setCompleted(sub.completed);
  }

  const handleToggle = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    const prev = completed;
    setCompleted(!prev);
    try {
      await apiClient.toggleSubTask(taskId, sub.id);
      onMutate();
    } catch (err) {
      setCompleted(prev);
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setToggling(false);
    }
  }, [toggling, completed, taskId, sub.id, onMutate, toast]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiClient.deleteSubTask(taskId, sub.id);
      toast({ title: 'Sub-task removed' });
      onMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setDeleting(false);
    }
  }, [deleting, taskId, sub.id, onMutate, toast]);

  const saveEdit = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const trimmed = editTitle.trim();
      if (!trimmed) {
        toast({ variant: 'destructive', title: 'Error', description: 'Sub-task title is required' });
        setEditTitle(sub.title);
        setEditing(false);
        return;
      }
      if (trimmed.length > MAX_SUBTASK_TITLE_LENGTH) {
        toast({ variant: 'destructive', title: 'Error', description: `Sub-task title must be ${MAX_SUBTASK_TITLE_LENGTH} characters or fewer` });
        setEditTitle(sub.title);
        setEditing(false);
        return;
      }
      if (trimmed === sub.title) {
        setEditing(false);
        return;
      }
      try {
        await apiClient.editSubTask(taskId, sub.id, { title: trimmed });
        onMutate();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        toast({ variant: 'destructive', title: 'Error', description: msg });
      }
      setEditing(false);
    } finally {
      savingRef.current = false;
    }
  }, [editTitle, sub.title, sub.id, taskId, onMutate, toast]);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <button type="button" aria-label="Reorder sub-task" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox checked={completed} disabled={toggling} onCheckedChange={handleToggle} />
      {editing ? (
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          maxLength={MAX_SUBTASK_TITLE_LENGTH}
          className="text-sm h-7 flex-1"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
            if (e.key === 'Escape') { setEditTitle(sub.title); setEditing(false); }
          }}
          onBlur={saveEdit}
        />
      ) : (
      <span
          className={cn('text-sm flex-1 cursor-pointer hover:underline', completed && 'line-through text-muted-foreground')}
          onClick={() => { setEditing(true); setEditTitle(sub.title); }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setEditing(true);
              setEditTitle(sub.title);
            }
          }}
        >
          {sub.title}
        </span>
      )}
      <Button
        variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
        data-testid={`delete-subtask-${sub.id}`}
        disabled={deleting}
        onClick={handleDelete}
      >
        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      </Button>
    </div>
  );
});

export function SubTaskList({ taskId, subTasks, onMutate }: Readonly<SubTaskListProps>) {
  const { toast } = useToast();
  const [newSub, setNewSub] = useState('');
  const [adding, setAdding] = useState(false);
  const [items, setItems] = useState<SubTask[]>([]);
  const [reordering, setReordering] = useState(false);

  // Keep local items in sync with prop (unless actively reordering)
  const sorted = useMemo(
    () => [...subTasks].sort((a, b) => a.position - b.position),
    [subTasks],
  );
  const displayItems = reordering ? items : sorted;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const completedCount = displayItems.filter(s => s.completed).length;
  const totalCount = displayItems.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAdd = useCallback(async () => {
    const title = newSub.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await apiClient.addSubTask(taskId, { title });
      setNewSub('');
      onMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setAdding(false);
    }
  }, [newSub, adding, taskId, onMutate, toast]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex(s => s.id === active.id);
    const newIndex = sorted.findIndex(s => s.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    const orderedIds = reordered.map(s => s.id);

    setItems(reordered);
    setReordering(true);

    try {
      await apiClient.reorderSubTasks(taskId, orderedIds);
      onMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setReordering(false);
    }
  }, [sorted, taskId, onMutate, toast]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Sub-tasks</h2>
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{completedCount}/{totalCount}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayItems.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {displayItems.map(sub => (
              <SortableSubTaskItem key={sub.id} sub={sub} taskId={taskId} onMutate={onMutate} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <Input
          placeholder="Add sub-task..."
          value={newSub}
          onChange={e => setNewSub(e.target.value)}
          maxLength={MAX_SUBTASK_TITLE_LENGTH}
          onKeyDown={async e => {
            if (e.key === 'Enter' && newSub.trim() && !adding) {
              await handleAdd();
            }
          }}
          className="text-sm"
        />
        <Button size="sm" variant="outline" disabled={!newSub.trim() || adding} data-testid="add-subtask-btn" onClick={handleAdd}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
