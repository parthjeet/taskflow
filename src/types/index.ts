export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'To Do' | 'In Progress' | 'Blocked' | 'Done';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface DailyUpdate {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  assigneeName: string | null;
  gearId: string;
  blockingReason: string;
  subTasks: SubTask[];
  dailyUpdates: DailyUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
}
