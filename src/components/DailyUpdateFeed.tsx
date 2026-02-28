import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiClient } from '@/lib/api';
import { MAX_DAILY_UPDATE_CONTENT_LENGTH } from '@/lib/api/constants';
import { DailyUpdate, TeamMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeDate, isWithin24Hours } from '@/lib/date-utils';
import { Plus, Loader2 } from 'lucide-react';

const LAST_AUTHOR_KEY = 'taskflow-last-author';

interface DailyUpdateFeedProps {
  taskId: string;
  dailyUpdates: DailyUpdate[];
  members: TeamMember[];
  onMutate: () => void;
}

export function DailyUpdateFeed({ taskId, dailyUpdates, members, onMutate }: Readonly<DailyUpdateFeedProps>) {
  const { toast } = useToast();
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [updateAuthor, setUpdateAuthor] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editUpdateLoading, setEditUpdateLoading] = useState(false);
  const [deleteUpdateId, setDeleteUpdateId] = useState<string | null>(null);
  const [deletingUpdate, setDeletingUpdate] = useState(false);

  const activeMembers = useMemo(() => members.filter(m => m.active), [members]);
  const sortedUpdates = useMemo(
    () => [...dailyUpdates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [dailyUpdates],
  );

  const openAddDialog = useCallback(() => {
    setAddingUpdate(true);
    const stored = localStorage.getItem(LAST_AUTHOR_KEY);
    const validId = stored && activeMembers.some(m => m.id === stored) ? stored : (activeMembers[0]?.id || '');
    setUpdateAuthor(validId);
    setUpdateContent('');
  }, [activeMembers]);

  const handleAddUpdate = useCallback(async () => {
    setUpdateLoading(true);
    try {
      await apiClient.addDailyUpdate(taskId, { authorId: updateAuthor, content: updateContent.trim() });
      localStorage.setItem(LAST_AUTHOR_KEY, updateAuthor);
      toast({ title: 'Update added' });
      setAddingUpdate(false);
      onMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setUpdateLoading(false);
    }
  }, [taskId, updateAuthor, updateContent, onMutate, toast]);

  const handleEditSave = useCallback(async (updateId: string) => {
    const normalizedContent = editingContent.trim();
    if (!normalizedContent) return;
    setEditUpdateLoading(true);
    try {
      await apiClient.editDailyUpdate(taskId, updateId, { content: normalizedContent });
      toast({ title: 'Update edited' });
      setEditingUpdateId(null);
      onMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setEditUpdateLoading(false);
    }
  }, [taskId, editingContent, onMutate, toast]);

  const handleDelete = useCallback(async () => {
    if (deletingUpdate || !deleteUpdateId) return;
    setDeletingUpdate(true);
    try {
      await apiClient.deleteDailyUpdate(taskId, deleteUpdateId);
      toast({ title: 'Update deleted' });
      onMutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setDeletingUpdate(false);
    }
  }, [deletingUpdate, deleteUpdateId, taskId, onMutate, toast]);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Daily Updates</h2>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4" /> Add Update
          </Button>
        </div>

        {sortedUpdates.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No updates yet.</p>
        )}

        <div className="space-y-3">
          {sortedUpdates.map(upd => {
            const editable = isWithin24Hours(upd.createdAt);
            return (
              <div key={upd.id} className="rounded-md border p-3 space-y-1 group">
                {editingUpdateId === upd.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      rows={2}
                      maxLength={MAX_DAILY_UPDATE_CONTENT_LENGTH}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" disabled={editUpdateLoading} onClick={() => setEditingUpdateId(null)}>Cancel</Button>
                      <Button size="sm" disabled={!editingContent.trim() || editUpdateLoading} onClick={() => handleEditSave(upd.id)}>
                        {editUpdateLoading && <Loader2 className="h-4 w-4 animate-spin" />} Save
                      </Button>
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
                    {editable ? (
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-6 text-xs"
                          onClick={() => { setEditingUpdateId(upd.id); setEditingContent(upd.content); }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteUpdateId(upd.id)}>
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground italic cursor-default">Past edit window</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Updates can only be edited within 24 hours</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
                  {activeMembers.length === 0 ? (
                    <SelectItem value="_none" disabled>No active members</SelectItem>
                  ) : (
                    activeMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Update</Label>
              <Textarea
                value={updateContent}
                onChange={e => setUpdateContent(e.target.value)}
                placeholder="What's the latest?"
                rows={3}
                maxLength={MAX_DAILY_UPDATE_CONTENT_LENGTH}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingUpdate(false)}>Cancel</Button>
            <Button disabled={!updateContent.trim() || !updateAuthor || updateLoading} onClick={handleAddUpdate}>
              {updateLoading && <Loader2 className="h-4 w-4 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Update Confirm */}
      <AlertDialog open={!!deleteUpdateId} onOpenChange={open => { if (!open) setDeleteUpdateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this update?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-update"
              disabled={deletingUpdate}
              onClick={handleDelete}
            >
              {deletingUpdate && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
