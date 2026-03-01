import { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
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
import { useSafeMutate } from '@/hooks/useSafeMutate';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, X, Loader2 } from 'lucide-react';

interface SubTaskListProps {
  taskId: string;
  subTasks: SubTask[];
  onMutate: () => void | Promise<void>;
}

const SortableSubTaskItem = memo(function SortableSubTaskItem({
  sub,
  taskId,
  onMutate,
}: Readonly<{
  sub: SubTask;
  taskId: string;
  onMutate: () => void | Promise<void>;
}>) {
  const { toast } = useToast();
  const [completed, setCompleted] = useState(sub.completed);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(sub.title);
  const editTitleRef = useRef(sub.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const skipBlurAfterEnterRef = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sub.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const triggerMutate = useSafeMutate(onMutate);

  // Sync completed state when prop changes (e.g. parent refresh between toggles).
  useEffect(() => {
    if (!toggling && completed !== sub.completed) {
      setCompleted(sub.completed);
    }
  }, [sub.completed, toggling, completed]);

  // Sync editTitle/ref when sub.title prop changes while not in editing mode
  // (e.g. parent refresh after another mutation). Prevents stale pre-population
  // on the next click-to-edit.
  useEffect(() => {
    if (!editing) {
      setEditTitle(sub.title);
      editTitleRef.current = sub.title;
    }
  }, [sub.title, editing]);

  const handleToggle = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    const prev = completed;
    setCompleted(!prev);
    try {
      await apiClient.toggleSubTask(taskId, sub.id);
      triggerMutate();
    } catch (err) {
      setCompleted(prev);
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setToggling(false);
    }
  }, [toggling, completed, taskId, sub.id, triggerMutate, toast]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiClient.deleteSubTask(taskId, sub.id);
      toast({ title: 'Sub-task removed' });
      triggerMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setDeleting(false);
    }
  }, [deleting, taskId, sub.id, triggerMutate, toast]);

  const saveEdit = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const trimmed = editTitleRef.current.trim();
      if (!trimmed) {
        toast({ variant: 'destructive', title: 'Error', description: 'Sub-task title is required' });
        editTitleRef.current = sub.title;
        setEditTitle(sub.title);
        setEditing(false);
        return;
      }
      if (trimmed.length > MAX_SUBTASK_TITLE_LENGTH) {
        toast({ variant: 'destructive', title: 'Error', description: `Sub-task title must be ${MAX_SUBTASK_TITLE_LENGTH} characters or fewer` });
        editTitleRef.current = sub.title;
        setEditTitle(sub.title);
        setEditing(false);
        return;
      }
      if (trimmed === sub.title) {
        editTitleRef.current = sub.title;
        setEditing(false);
        return;
      }
      try {
        await apiClient.editSubTask(taskId, sub.id, { title: trimmed });
        triggerMutate();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        toast({ variant: 'destructive', title: 'Error', description: msg });
      }
      setEditing(false);
    } finally {
      savingRef.current = false;
    }
  }, [sub.title, sub.id, taskId, triggerMutate, toast]);

  const handleEditKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      skipBlurAfterEnterRef.current = true;
      void saveEdit();
      return;
    }
    if (e.key === 'Escape') {
      // Also suppress the browser blur that fires when Input unmounts while focused.
      // Without this, real browsers would call saveEdit() with the stale user-typed value.
      skipBlurAfterEnterRef.current = true;
      editTitleRef.current = sub.title;
      setEditTitle(sub.title);
      setEditing(false);
    }
  }, [saveEdit, sub.title]);

  const handleEditBlur = useCallback((_e: FocusEvent<HTMLInputElement>) => {
    if (skipBlurAfterEnterRef.current) {
      return;
    }
    void saveEdit();
  }, [saveEdit]);

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
          onChange={e => {
            editTitleRef.current = e.target.value;
            setEditTitle(e.target.value);
          }}
          maxLength={MAX_SUBTASK_TITLE_LENGTH}
          className="text-sm h-7 flex-1"
          autoFocus
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditBlur}
        />
      ) : (
      <span
          className={cn('text-sm flex-1 cursor-pointer hover:underline', completed && 'line-through text-muted-foreground')}
          onClick={() => {
            skipBlurAfterEnterRef.current = false;
            editTitleRef.current = sub.title;
            setEditing(true);
            setEditTitle(sub.title);
          }}
          role="button"
          aria-label={`Edit sub-task: ${sub.title}`}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              skipBlurAfterEnterRef.current = false;
              editTitleRef.current = sub.title;
              setEditing(true);
              setEditTitle(sub.title);
            }
          }}
        >
          {sub.title}
        </span>
      )}
      <Button
        variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        data-testid={`delete-subtask-${sub.id}`}
        aria-label="Delete sub-task"
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
  const newSubRef = useRef('');
  const [adding, setAdding] = useState(false);
  const [items, setItems] = useState<SubTask[]>([]);
  const [reordering, setReordering] = useState(false);
  const isDraggingRef = useRef(false);
  const triggerMutate = useSafeMutate(onMutate);
  const awaitableTriggerMutate = useCallback(async () => {
    try {
      await onMutate();
    } catch {
      // Keep UX stable when background refresh fails after successful reorder.
    }
  }, [onMutate]);

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
    const title = newSubRef.current.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await apiClient.addSubTask(taskId, { title });
      setNewSub('');
      newSubRef.current = '';
      triggerMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setAdding(false);
    }
  }, [adding, taskId, triggerMutate, toast]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || isDraggingRef.current) return;

    const oldIndex = sorted.findIndex(s => s.id === active.id);
    const newIndex = sorted.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    isDraggingRef.current = true;
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    const orderedIds = reordered.map(s => s.id);

    setItems(reordered);
    setReordering(true);

    try {
      try {
        await apiClient.reorderSubTasks(taskId, orderedIds);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        toast({ variant: 'destructive', title: 'Error', description: msg });
        setReordering(false);
        return;
      }

      await awaitableTriggerMutate();

      setReordering(false);
    } finally {
      isDraggingRef.current = false;
      // Safety net: ensures reordering clears even if an unexpected throw
      // occurs between setReordering(true) and the normal setReordering(false) paths.
      setReordering(false);
    }
  }, [sorted, taskId, awaitableTriggerMutate, toast]);

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
              <SortableSubTaskItem key={sub.id} sub={sub} taskId={taskId} onMutate={triggerMutate} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <Input
          placeholder="Add sub-task..."
          value={newSub}
          onChange={e => { newSubRef.current = e.target.value; setNewSub(e.target.value); }}
          maxLength={MAX_SUBTASK_TITLE_LENGTH}
          onKeyDown={async e => {
            if (e.key === 'Enter' && newSubRef.current.trim() && !adding) {
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
