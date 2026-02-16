import type {
  Task, SubTask, DailyUpdate, TeamMember,
  TaskFilters, ConnectionSettings, ConnectionTestResult,
  Status, Priority,
} from './types';

export interface CreateTaskData {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  assigneeName: string | null;
  gearId: string;
  blockingReason: string;
}

export type UpdateTaskData = Partial<Omit<Task, 'id' | 'createdAt' | 'subTasks' | 'dailyUpdates'>>;

export interface ApiClient {
  // Tasks
  getTasks(filters?: TaskFilters): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(data: CreateTaskData): Promise<Task>;
  updateTask(id: string, data: UpdateTaskData): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Sub-tasks
  addSubTask(taskId: string, data: { title: string }): Promise<SubTask>;
  toggleSubTask(taskId: string, subTaskId: string): Promise<void>;
  deleteSubTask(taskId: string, subTaskId: string): Promise<void>;

  // Daily Updates
  addDailyUpdate(taskId: string, data: { authorId: string; content: string }): Promise<DailyUpdate>;
  editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<void>;
  deleteDailyUpdate(taskId: string, updateId: string): Promise<void>;

  // Team Members
  getMembers(): Promise<TeamMember[]>;
  createMember(data: Omit<TeamMember, 'id'>): Promise<TeamMember>;
  updateMember(id: string, data: Partial<Omit<TeamMember, 'id'>>): Promise<TeamMember>;
  deleteMember(id: string): Promise<void>;

  // Settings
  testConnection(data: ConnectionSettings): Promise<ConnectionTestResult>;
  saveConnection(data: ConnectionSettings): Promise<void>;
}
