export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'To Do' | 'In Progress' | 'Blocked' | 'Done';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
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
  description: string | null;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  assigneeName: string | null;
  gearId: string | null;
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

export interface TaskFilters {
  status?: Status;
  priority?: Priority;
  assignee?: string;
  search?: string;
  sort?: 'updated' | 'priority' | 'status';
}

export interface ConnectionSettings {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}
