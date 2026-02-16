import type { ApiClient, CreateTaskData, UpdateTaskData } from '../client';
import type { Task, SubTask, DailyUpdate, TeamMember, TaskFilters, ConnectionSettings, ConnectionTestResult } from '../types';

const TASKS_KEY = 'taskflow_tasks';
const MEMBERS_KEY = 'taskflow_members';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function delay(): Promise<void> {
  return new Promise(res => setTimeout(res, 300 + Math.random() * 200));
}

function seedData() {
  if (localStorage.getItem(MEMBERS_KEY)) return;

  const members: TeamMember[] = [
    { id: 'm1', name: 'Alice Chen', email: 'alice@devops.io', active: true },
    { id: 'm2', name: 'Bob Martinez', email: 'bob@devops.io', active: true },
    { id: 'm3', name: 'Carol Kim', email: 'carol@devops.io', active: true },
    { id: 'm4', name: 'Dan Wilson', email: 'dan@devops.io', active: true },
    { id: 'm5', name: 'Eve Johnson', email: 'eve@devops.io', active: false },
    { id: 'm6', name: 'Frank Lee', email: 'frank@devops.io', active: true },
  ];

  const now = new Date();
  const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();

  const tasks: Task[] = [
    {
      id: 't1', title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment to staging.',
      status: 'In Progress', priority: 'High', assigneeId: 'm1', assigneeName: 'Alice Chen', gearId: '1024',
      blockingReason: '', subTasks: [
        { id: 's1', title: 'Create workflow YAML', completed: true, createdAt: h(72) },
        { id: 's2', title: 'Add test stage', completed: true, createdAt: h(72) },
        { id: 's3', title: 'Add deploy stage', completed: false, createdAt: h(72) },
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
        { id: 's4', title: 'Identify failing migration', completed: true, createdAt: h(120) },
        { id: 's5', title: 'Request timeout increase', completed: true, createdAt: h(120) },
        { id: 's6', title: 'Re-run migration', completed: false, createdAt: h(120) },
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
        { id: 's7', title: 'Define alert thresholds', completed: false, createdAt: h(48) },
        { id: 's8', title: 'Configure Grafana panels', completed: false, createdAt: h(48) },
      ],
      dailyUpdates: [],
      createdAt: h(48), updatedAt: h(48),
    },
    {
      id: 't4', title: 'Container image optimization', description: 'Reduce Docker image sizes for all microservices by switching to Alpine base.',
      status: 'Done', priority: 'Low', assigneeId: 'm4', assigneeName: 'Dan Wilson', gearId: '4096',
      blockingReason: '', subTasks: [
        { id: 's9', title: 'Audit current image sizes', completed: true, createdAt: h(336) },
        { id: 's10', title: 'Switch to Alpine', completed: true, createdAt: h(336) },
        { id: 's11', title: 'Verify all tests pass', completed: true, createdAt: h(336) },
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
        { id: 's12', title: 'Submit renewal request', completed: true, createdAt: h(168) },
        { id: 's13', title: 'Complete domain verification', completed: false, createdAt: h(168) },
        { id: 's14', title: 'Install new certificate', completed: false, createdAt: h(168) },
      ],
      dailyUpdates: [
        { id: 'u4', taskId: 't5', authorId: 'm6', authorName: 'Frank Lee', content: 'Contacted registrar support, ETA 2 business days.', createdAt: h(6), updatedAt: h(3), edited: true },
      ],
      createdAt: h(168), updatedAt: h(3),
    },
    {
      id: 't6', title: 'Log aggregation setup', description: 'Deploy ELK stack for centralized logging across all services.',
      status: 'In Progress', priority: 'Low', assigneeId: null, assigneeName: null, gearId: '',
      blockingReason: '', subTasks: [
        { id: 's15', title: 'Deploy Elasticsearch', completed: true, createdAt: h(96) },
        { id: 's16', title: 'Configure Logstash', completed: false, createdAt: h(96) },
        { id: 's17', title: 'Set up Kibana dashboards', completed: false, createdAt: h(96) },
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

export class MockApiClient implements ApiClient {
  // ---- Tasks ----

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    await delay();
    let list = getTasks();
    if (filters?.status) list = list.filter(t => t.status === filters.status);
    if (filters?.priority) list = list.filter(t => t.priority === filters.priority);
    if (filters?.assignee === 'unassigned') list = list.filter(t => !t.assigneeId);
    else if (filters?.assignee) list = list.filter(t => t.assigneeId === filters.assignee);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.gearId.includes(q)
      );
    }
    const sort = filters?.sort || 'updated';
    if (sort === 'updated') list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    else if (sort === 'priority') {
      const order = { High: 0, Medium: 1, Low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sort === 'status') {
      const order = { 'Blocked': 0, 'In Progress': 1, 'To Do': 2, 'Done': 3 };
      list.sort((a, b) => order[a.status] - order[b.status]);
    }
    return list;
  }

  async getTask(id: string): Promise<Task | undefined> {
    await delay();
    return getTasks().find(t => t.id === id);
  }

  async createTask(data: CreateTaskData): Promise<Task> {
    await delay();
    if (data.status === 'Blocked' && !data.blockingReason.trim()) {
      throw new Error('Blocking reason is required for blocked tasks.');
    }
    const now = new Date().toISOString();
    const task: Task = { ...data, id: generateId(), subTasks: [], dailyUpdates: [], createdAt: now, updatedAt: now };
    const tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);
    return task;
  }

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    await delay();
    const tasks = getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const merged = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
    if (merged.status === 'Blocked' && !merged.blockingReason.trim()) {
      throw new Error('Blocking reason is required for blocked tasks.');
    }
    if (merged.status !== 'Blocked') merged.blockingReason = '';
    tasks[idx] = merged;
    saveTasks(tasks);
    return merged;
  }

  async deleteTask(id: string): Promise<void> {
    await delay();
    saveTasks(getTasks().filter(t => t.id !== id));
  }

  // ---- Sub-tasks ----

  async addSubTask(taskId: string, data: { title: string }): Promise<SubTask> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const sub: SubTask = { id: generateId(), title: data.title, completed: false, createdAt: new Date().toISOString() };
    task.subTasks.push(sub);
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
    return sub;
  }

  async toggleSubTask(taskId: string, subTaskId: string): Promise<void> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const sub = task.subTasks.find(s => s.id === subTaskId);
    if (!sub) throw new Error('Sub-task not found');
    sub.completed = !sub.completed;
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
  }

  async deleteSubTask(taskId: string, subTaskId: string): Promise<void> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    task.subTasks = task.subTasks.filter(s => s.id !== subTaskId);
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
  }

  // ---- Daily Updates ----

  async addDailyUpdate(taskId: string, data: { authorId: string; content: string }): Promise<DailyUpdate> {
    await delay();
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const members = getMembers();
    const author = members.find(m => m.id === data.authorId);
    if (!author) throw new Error('Author not found');
    const now = new Date().toISOString();
    const update: DailyUpdate = { id: generateId(), taskId, authorId: data.authorId, authorName: author.name, content: data.content, createdAt: now, updatedAt: now, edited: false };
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
    if (age > 24 * 3600000) throw new Error('Updates can only be edited within 24 hours.');
    upd.content = data.content;
    upd.updatedAt = new Date().toISOString();
    upd.edited = true;
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
    if (age > 24 * 3600000) throw new Error('Updates can only be deleted within 24 hours.');
    task.dailyUpdates = task.dailyUpdates.filter(u => u.id !== updateId);
    saveTasks(tasks);
  }

  // ---- Team Members ----

  async getMembers(): Promise<TeamMember[]> {
    await delay();
    return getMembers();
  }

  async createMember(data: Omit<TeamMember, 'id'>): Promise<TeamMember> {
    await delay();
    const member: TeamMember = { ...data, id: generateId() };
    const members = getMembers();
    members.push(member);
    saveMembers(members);
    return member;
  }

  async updateMember(id: string, data: Partial<Omit<TeamMember, 'id'>>): Promise<TeamMember> {
    await delay();
    const members = getMembers();
    const idx = members.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    members[idx] = { ...members[idx], ...data };
    saveMembers(members);
    return members[idx];
  }

  async deleteMember(id: string): Promise<void> {
    await delay();
    const tasks = getTasks();
    const assigned = tasks.filter(t => t.assigneeId === id);
    if (assigned.length > 0) {
      throw new Error(`Cannot delete member with ${assigned.length} assigned task(s). Reassign or complete them first.`);
    }
    saveMembers(getMembers().filter(m => m.id !== id));
  }

  // ---- Settings ----

  async testConnection(data: ConnectionSettings): Promise<ConnectionTestResult> {
    await delay();
    // Mock: always succeeds
    return { success: true, message: `Successfully connected to ${data.host}:${data.port}/${data.database}` };
  }

  async saveConnection(data: ConnectionSettings): Promise<void> {
    await delay();
    localStorage.setItem('taskflow_connection', JSON.stringify(data));
  }
}
