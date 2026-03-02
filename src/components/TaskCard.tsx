import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Task } from '@/types';
import { formatRelativeDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { AlertTriangle, User } from 'lucide-react';

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

export function TaskCard({ task }: { task: Task }) {
  const navigate = useNavigate();
  const isBlocked = task.status === 'Blocked';
  const completedSubs = task.subTasks.filter(s => s.completed).length;
  const totalSubs = task.subTasks.length;
  const progress = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;

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
          <Badge className={cn('shrink-0 text-[10px]', priorityStyles[task.priority])} variant="outline">
            {task.priority}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge className={cn('text-[10px]', statusStyles[task.status])} variant="outline">
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
          <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-md p-2">
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
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">{formatRelativeDate(task.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}
