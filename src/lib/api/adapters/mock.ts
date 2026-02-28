import type { ApiClient, CreateTaskData, UpdateTaskData } from '../client';
import type { Task, SubTask, DailyUpdate, TeamMember, TaskFilters, ConnectionSettings, ConnectionTestResult } from '../types';
import {
  MAX_BLOCKING_REASON_LENGTH,
  MAX_DAILY_UPDATE_CONTENT_LENGTH,
  MAX_SUBTASK_TITLE_LENGTH,
  MAX_TASK_DESCRIPTION_LENGTH,
  MAX_TASK_TITLE_LENGTH,
} from '../constants';

const TASKS_KEY = 'taskflow_tasks';
const MEMBERS_KEY = 'taskflow_members';
const CONNECTION_KEY = 'taskflow_connection';
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function delay(): Promise<void> {
  return new Promise(res => setTimeout(res, 300 + Math.random() * 200));
}

function seedData() {
  if (localStorage.getItem(MEMBERS_KEY) && localStorage.getItem(TASKS_KEY)) return;

  const members: TeamMember[] = [
    { id: 'm1', name: 'Alice Chen', email: 'alice@devops.io', active: true },
    { id: 'm2', name: 'Bob Martinez', email: 'bob@devops.io', active: true },
    { id: 'm3', name: 'Carol Kim', email: 'carol@devops.io', active: true },
    { id: 'm4', name: 'Dan Wilson', email: 'dan@devops.io', active: true },
    { id: 'm5', name: 'Eve Johnson', email: 'eve@devops.io', active: false },
    { id: 'm6', name: 'Frank Lee', email: 'frank@devops.io', active: true },
  ];

  const now = new Date();
  const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * ONE_HOUR_MS).toISOString();

  const tasks = [
    {
      id: 't1', title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment to staging.',
      status: 'In Progress', priority: 'High', assigneeId: 'm1', assigneeName: 'Alice Chen', gearId: '1024',
      blockingReason: '', subTasks: [
        { id: 's1', title: 'Create workflow YAML', completed: true, position: 0, createdAt: h(72) },
        { id: 's2', title: 'Add test stage', completed: true, position: 1, createdAt: h(72) },
        { id: 's3', title: 'Add deploy stage', completed: false, position: 2, createdAt: h(72) },
      ],
      dailyUpdates: [
        { id: 'u1', taskId: 't1', authorId: 'm1', authorName: 'Alice Chen', content: 'Workflow YAML created, test stage passing.', createdAt: h(4), updatedAt: h(4), edited: false },
      ],
      createdAt: h(72), updatedAt: h(4),
    },
    {
      id: 't2', title: 'Database migration stuck', description: 'Production DB migration failing on step 3 due to timeout.',
      status: 'Blocked', priority: 'High', assigneeId: 'm2', assigneeName: 'Bob Martinez', gearId: '2048',
      blockingReason: 'Waiting for DBA approval to increase migration timeout from 30s to 120s. Ticket submitted to infrastructure team.',
      subTasks: [
        { id: 's4', title: 'Identify failing migration', completed: true, position: 0, createdAt: h(120) },
        { id: 's5', title: 'Request timeout increase', completed: true, position: 1, createdAt: h(120) },
        { id: 's6', title: 'Re-run migration', completed: false, position: 2, createdAt: h(120) },
      ],
      dailyUpdates: [
        { id: 'u2', taskId: 't2', authorId: 'm2', authorName: 'Bob Martinez', content: 'Submitted ticket to infra team for timeout change.', createdAt: h(26), updatedAt: h(26), edited: false },
      ],
      createdAt: h(120), updatedAt: h(2),
    },
    {
      id: 't3', title: 'Monitoring dashboard alerts', description: 'Set up Grafana alerts for CPU, memory, and disk usage on all prod nodes.',
      status: 'To Do', priority: 'Medium', assigneeId: 'm3', assigneeName: 'Carol Kim', gearId: '3072',
      blockingReason: '', subTasks: [
        { id: 's7', title: 'Define alert thresholds', completed: false, position: 0, createdAt: h(48) },
        { id: 's8', title: 'Configure Grafana panels', completed: false, position: 1, createdAt: h(48) },
      ],
      dailyUpdates: [],
      createdAt: h(48), updatedAt: h(48),
    },
    {
      id: 't4', title: 'Container image optimization', description: 'Reduce Docker image sizes for all microservices by switching to Alpine base.',
      status: 'Done', priority: 'Low', assigneeId: 'm4', assigneeName: 'Dan Wilson', gearId: '4096',
      blockingReason: '', subTasks: [
        { id: 's9', title: 'Audit current image sizes', completed: true, position: 0, createdAt: h(336) },
        { id: 's10', title: 'Switch to Alpine', completed: true, position: 1, createdAt: h(336) },
        { id: 's11', title: 'Verify all tests pass', completed: true, position: 2, createdAt: h(336) },
      ],
      dailyUpdates: [
        { id: 'u3', taskId: 't4', authorId: 'm4', authorName: 'Dan Wilson', content: 'All images reduced by ~60%. Tests passing.', createdAt: h(200), updatedAt: h(200), edited: false },
      ],
      createdAt: h(336), updatedAt: h(200),
    },
    {
      id: 't5', title: 'SSL certificate renewal', description: 'Renew wildcard SSL certificates before expiry on March 15.',
      status: 'Blocked', priority: 'Medium', assigneeId: 'm6', assigneeName: 'Frank Lee', gearId: '5120',
      blockingReason: 'Certificate authority requires domain ownership re-verification. Waiting on DNS TXT record update from domain registrar support.',
      subTasks: [
        { id: 's12', title: 'Submit renewal request', completed: true, position: 0, createdAt: h(168) },
        { id: 's13', title: 'Complete domain verification', completed: false, position: 1, createdAt: h(168) },
        { id: 's14', title: 'Install new certificate', completed: false, position: 2, createdAt: h(168) },
      ],
      dailyUpdates: [
        { id: 'u4', taskId: 't5', authorId: 'm6', authorName: 'Frank Lee', content: 'Contacted registrar support, ETA 2 business days.', createdAt: h(6), updatedAt: h(3), edited: true },
      ],
      createdAt: h(168), updatedAt: h(3),
    },
    {
      id: 't6', title: 'Log aggregation setup', description: 'Deploy ELK stack for centralized logging across all services.',
      status: 'In Progress', priority: 'Low', assigneeId: null, assigneeName: null, gearId: null,
      blockingReason: '', subTasks: [
        { id: 's15', title: 'Deploy Elasticsearch', completed: true, position: 0, createdAt: h(96) },
        { id: 's16', title: 'Configure Logstash', completed: false, position: 1, createdAt: h(96) },
        { id: 's17', title: 'Set up Kibana dashboards', completed: false, position: 2, createdAt: h(96) },
      ],
      dailyUpdates: [],
      createdAt: h(96), updatedAt: h(24),
    },
  ];

  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

seedData();

function getTasks(): Task[] {
  return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
}
function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
function getMembers(): TeamMember[] {
  return JSON.parse(localStorage.getItem(MEMBERS_KEY) || '[]');
}
function saveMembers(members: TeamMember[]) {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

function parseConnectionSettings(raw: string): ConnectionSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;
    const port = typeof parsed.port === 'number' ? parsed.port : Number(parsed.port);

    if (
      typeof parsed.host !== 'string' ||
      !Number.isInteger(port) ||
      typeof parsed.database !== 'string' ||
      typeof parsed.username !== 'string' ||
      typeof parsed.password !== 'string'
    ) {
      return null;
    }

    return {
      host: parsed.host,
      port,
      database: parsed.database,
      username: parsed.username,
      password: parsed.password,
    };
  } catch {
    return null;
  }
}

function assertValidGearId(gearId: string | null | undefined) {
  if (gearId !== null && gearId !== undefined && !/^\d{4}$/.test(gearId)) {
    throw new Error('GEAR ID must be 4 digits');
  }
}

function assertTaskFieldLengths(title: string, description: string | null, blockingReason: string) {
  const normalizedTitle = title.trim();
  const normalizedDescription = description?.trim() ?? '';
  if (!normalizedTitle) {
    throw new Error('Task title is required');
  }
  if (normalizedTitle.length > MAX_TASK_TITLE_LENGTH) {
    throw new Error(`Task title must be ${MAX_TASK_TITLE_LENGTH} characters or fewer`);
  }
  if (normalizedDescription.length > MAX_TASK_DESCRIPTION_LENGTH) {
    throw new Error(`Task description must be ${MAX_TASK_DESCRIPTION_LENGTH} characters or fewer`);
  }
  if (blockingReason.length > MAX_BLOCKING_REASON_LENGTH) {
    throw new Error(`Blocking reason must be ${MAX_BLOCKING_REASON_LENGTH} characters or fewer`);
  }
}

function assertSubTaskTitleLength(title: string) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    throw new Error('Sub-task title is required');
  }
  if (normalizedTitle.length > MAX_SUBTASK_TITLE_LENGTH) {
    throw new Error(`Sub-task title must be ${MAX_SUBTASK_TITLE_LENGTH} characters or fewer`);
  }
}

function normalizeDailyUpdateContent(content: string): string {
  const normalized = content.trim();
  if (normalized.length < 1 || normalized.length > MAX_DAILY_UPDATE_CONTENT_LENGTH) {
    throw new Error(`Update content must be between 1 and ${MAX_DAILY_UPDATE_CONTENT_LENGTH} characters`);
  }
  return normalized;
}

export class MockApiClient implements ApiClient {
  // ---- Tasks ----

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    await delay();
    let list = getTasks();
    if (filters?.status) list = list.filter(t => t.status === filters.status);
    if (filters?.priority) list = list.filter(t => t.priority === filters.priority);
    if (filters?.assignee === 'unassigned') list = list.filter(t => !t.assigneeId);
    else if (filters?.assignee) list = list.filter(t => t.assigneeId === filters.assignee);
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.gearId ?? '').includes(q)
      );
    }
    const sort = filters?.sort || 'updated';
    if (sort === 'updated') list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    else if (sort === 'priority') {
      const order = { High: 0, Medium: 1, Low: 2 };
      list.sort((a, b) => {
        const byPriority = order[a.priority] - order[b.priority];
        if (byPriority !== 0) return byPriority;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    } else if (sort === 'status') {
      const order = { 'To Do': 1, 'In Progress': 2, 'Blocked': 3, 'Done': 4 };
      list.sort((a, b) => {
        const byStatus = order[a.status] - order[b.status];
        if (byStatus !== 0) return byStatus;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }
    return list;
  }

  async getTask(id: string): Promise<Task | undefined> {
    await delay();
    return getTasks().find(t => t.id === id);
  }

  async createTask(data: CreateTaskData): Promise<Task> {
    await delay();
    assertValidGearId(data.gearId);
    const title = data.title.trim();
    const description = data.description?.trim() || null;
    const normalizedBlockingReason = data.status === 'Blocked' ? data.blockingReason.trim() : '';
    assertTaskFieldLengths(title, description, normalizedBlockingReason);
    if (data.status === 'Blocked' && !normalizedBlockingReason) {
      throw new Error('Blocking reason is required for blocked tasks.');
    }
    let assigneeName: string | null;
    if (data.assigneeId === null) {
      assigneeName = null;
    } else {
      const member = getMembers().find(m => m.id === data.assigneeId);
      if (!member?.active) throw new Error('Assignee not found');
      assigneeName = member.name;
    }
    const now = new Date().toISOString();
    const task: Task = {
      title,
      description,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId,
      gearId: data.gearId,
      assigneeName,
      blockingReason: normalizedBlockingReason,
      id: generateId(),
      subTasks: [],
      dailyUpdates: [],
      createdAt: now,
      updatedAt: now,
    };
    const tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);
    return task;
  }

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    await delay();
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as UpdateTaskData;
    assertValidGearId(safeData.gearId);
    const tasks = getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const merged = { ...tasks[idx], ...safeData, updatedAt: new Date().toISOString() };
    merged.title = merged.title.trim();
    merged.description = merged.description?.trim() || null;
    const normalizedBlockingReason = merged.blockingReason.trim();
    if (merged.status === 'Blocked' && !normalizedBlockingReason) {
      throw new Error('Blocking reason is required for blocked tasks.');
    }
    merged.blockingReason = merged.status === 'Blocked' ? normalizedBlockingReason : '';
    assertTaskFieldLengths(merged.title, merged.description, merged.blockingReason);
    if ('assigneeId' in safeData) {
      if (merged.assigneeId === null) {
        merged.assigneeName = null;
      } else {
        const members = getMembers();
        const member = members.find(m => m.id === merged.assigneeId);
        if (!member?.active) throw new Error('Assignee not found');
        merged.assigneeName = member.name;
      }
    }
    tasks[idx] = merged;
    saveTasks(tasks);
    return merged;
  }

  async deleteTask(id: string): Promise<void> {
    await delay();
    const tasks = getTasks();
    const remaining = tasks.filter(t => t.id !== id);
    if (remaining.length === tasks.length) throw new Error('Task not found');
    saveTasks(remaining);
  }

  // ---- Sub-tasks ----

  async addSubTask(taskId: string, data: { title: string }): Promise<SubTask> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    assertSubTaskTitleLength(data.title);
    if (task.subTasks.length >= 20) throw new Error('Maximum of 20 sub-tasks per task');
    const sub: SubTask = {
      id: generateId(),
      title: data.title.trim(),
      completed: false,
      position: task.subTasks.length,
      createdAt: new Date().toISOString(),
    };
    task.subTasks.push(sub);
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
    return sub;
  }

  async toggleSubTask(taskId: string, subTaskId: string): Promise<SubTask> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const sub = task.subTasks.find(s => s.id === subTaskId);
    if (!sub) throw new Error('Sub-task not found');
    sub.completed = !sub.completed;
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
    return { ...sub };
  }

  async deleteSubTask(taskId: string, subTaskId: string): Promise<void> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const remaining = task.subTasks.filter(s => s.id !== subTaskId);
    if (remaining.length === task.subTasks.length) throw new Error('Sub-task not found');
    // Re-assign positions
    remaining.forEach((s, i) => { s.position = i; });
    task.subTasks = remaining;
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
  }

  async editSubTask(taskId: string, subTaskId: string, data: { title: string }): Promise<SubTask> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const sub = task.subTasks.find(s => s.id === subTaskId);
    if (!sub) throw new Error('Sub-task not found');
    assertSubTaskTitleLength(data.title);
    sub.title = data.title.trim();
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
    return { ...sub };
  }

  async reorderSubTasks(taskId: string, subTaskIds: string[]): Promise<SubTask[]> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const existingIds = new Set(task.subTasks.map(s => s.id));
    if (new Set(subTaskIds).size !== subTaskIds.length) {
      throw new Error('sub_task_ids: must not contain duplicates');
    }
    if (subTaskIds.length !== existingIds.size || !subTaskIds.every(id => existingIds.has(id))) {
      throw new Error('Reorder list must include each existing sub-task exactly once');
    }
    const reordered = subTaskIds.map((id, index) => {
      const sub = task.subTasks.find(s => s.id === id)!;
      sub.position = index;
      return sub;
    });
    task.subTasks = reordered;
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
    return reordered.map(s => ({ ...s }));
  }

  // ---- Daily Updates ----

  async addDailyUpdate(taskId: string, data: { authorId: string; content: string }): Promise<DailyUpdate> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const members = getMembers();
    const author = members.find(m => m.id === data.authorId);
    if (!author?.active) throw new Error('Author not found');
    const content = normalizeDailyUpdateContent(data.content);
    const now = new Date().toISOString();
    const update: DailyUpdate = { id: generateId(), taskId, authorId: data.authorId, authorName: author.name, content, createdAt: now, updatedAt: now, edited: false };
    task.dailyUpdates.unshift(update);
    task.updatedAt = now;
    saveTasks(tasks);
    return update;
  }

  async editDailyUpdate(taskId: string, updateId: string, data: { content: string }): Promise<void> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const upd = task.dailyUpdates.find(u => u.id === updateId);
    if (!upd) throw new Error('Update not found');
    const age = Date.now() - new Date(upd.createdAt).getTime();
    if (age > ONE_DAY_MS) throw new Error('Updates can only be edited within 24 hours.');
    upd.content = normalizeDailyUpdateContent(data.content);
    upd.updatedAt = new Date().toISOString();
    upd.edited = true;
    task.updatedAt = upd.updatedAt;
    saveTasks(tasks);
  }

  async deleteDailyUpdate(taskId: string, updateId: string): Promise<void> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const upd = task.dailyUpdates.find(u => u.id === updateId);
    if (!upd) throw new Error('Update not found');
    const age = Date.now() - new Date(upd.createdAt).getTime();
    if (age > ONE_DAY_MS) throw new Error('Updates can only be deleted within 24 hours.');
    task.dailyUpdates = task.dailyUpdates.filter(u => u.id !== updateId);
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
  }

  // ---- Team Members ----

  async getMembers(): Promise<TeamMember[]> {
    await delay();
    return getMembers();
  }

  async createMember(data: Omit<TeamMember, 'id'>): Promise<TeamMember> {
    await delay();
    const members = getMembers();
    if (members.some(m => m.email === data.email)) {
      throw new Error('A member with this email already exists');
    }
    const member: TeamMember = { ...data, id: generateId() };
    members.push(member);
    saveMembers(members);
    return member;
  }

  async updateMember(id: string, data: Partial<Omit<TeamMember, 'id'>>): Promise<TeamMember> {
    await delay();
    const members = getMembers();
    const idx = members.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    if (data.email !== undefined && members.some(m => m.id !== id && m.email === data.email)) {
      throw new Error('A member with this email already exists');
    }
    members[idx] = { ...members[idx], ...data };
    saveMembers(members);
    return members[idx];
  }

  async deleteMember(id: string): Promise<void> {
    await delay();
    const members = getMembers();
    const memberIndex = members.findIndex(m => m.id === id);
    if (memberIndex === -1) {
      throw new Error('Member not found');
    }
    const tasks = getTasks();
    const assigned = tasks.filter(t => t.assigneeId === id);
    if (assigned.length > 0) {
      throw new Error(`Cannot delete member with ${assigned.length} assigned task(s). Reassign or complete them first.`);
    }
    const authoredUpdates = tasks.reduce((count, task) => (
      count + task.dailyUpdates.filter(update => update.authorId === id).length
    ), 0);
    if (authoredUpdates > 0) {
      throw new Error(`Cannot delete member with ${authoredUpdates} authored daily update(s). Reassign or remove them first.`);
    }
    members.splice(memberIndex, 1);
    saveMembers(members);
  }

  // ---- Settings ----

  async getConnectionSettings(): Promise<ConnectionSettings | null> {
    await delay();
    const raw = localStorage.getItem(CONNECTION_KEY);
    if (!raw) return null;
    return parseConnectionSettings(raw);
  }

  async testConnection(data: ConnectionSettings): Promise<ConnectionTestResult> {
    await delay();
    return { success: true, message: `Successfully connected to ${data.host}:${data.port}/${data.database}` };
  }

  async saveConnection(data: ConnectionSettings): Promise<void> {
    await delay();
    localStorage.setItem(CONNECTION_KEY, JSON.stringify(data));
  }
}
