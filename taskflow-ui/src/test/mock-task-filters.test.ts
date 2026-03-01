/**
 * Tests for MockApiClient task CRUD, filtering, sorting, and validation.
 * These tests cover existing mock adapter behaviors — they should pass now.
 *
 * Related: Story 2.1 (backend parity), Story 2.2 (mock adapter)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient, CreateTaskData } from "@/lib/api/client";
import type { Task } from "@/lib/api/types";
import { filterAndSortDashboardTasks, getActiveAssigneeMembers } from "@/lib/dashboard/tasks";

async function createClient(): Promise<ApiClient> {
  localStorage.clear();
  vi.resetModules();
  const module = await import("@/lib/api/adapters/mock");
  return new module.MockApiClient();
}

async function makeTask(
  client: ApiClient,
  overrides: Partial<CreateTaskData> = {},
): Promise<Awaited<ReturnType<ApiClient["createTask"]>>> {
  return client.createTask({
    title: "Test task",
    description: null,
    status: "To Do",
    priority: "Medium",
    assigneeId: null,
    gearId: null,
    blockingReason: "",
    ...overrides,
  });
}

describe("MockApiClient — Task CRUD", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("creates a task and returns it with id, createdAt, updatedAt", async () => {
    const task = await makeTask(client, { title: "Brand new task" });
    expect(task.id).toBeTruthy();
    expect(task.title).toBe("Brand new task");
    expect(task.createdAt).toBeTruthy();
    expect(task.updatedAt).toBeTruthy();
  });

  it("new tasks have empty subTasks and dailyUpdates", async () => {
    const task = await makeTask(client);
    expect(task.subTasks).toEqual([]);
    expect(task.dailyUpdates).toEqual([]);
  });

  it("retrieves a task by id", async () => {
    const created = await makeTask(client, { title: "Find me" });
    const found = await client.getTask(created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.title).toBe("Find me");
  });

  it("returns undefined for unknown task id", async () => {
    const result = await client.getTask("nonexistent-id");
    expect(result).toBeUndefined();
  });

  it("updates a task title without affecting other fields", async () => {
    const created = await makeTask(client, { title: "Original", priority: "High" });
    const updated = await client.updateTask(created.id, { title: "Updated" });
    expect(updated.title).toBe("Updated");
    expect(updated.priority).toBe("High");
    expect(updated.status).toBe("To Do");
  });

  it("deletes a task so it no longer appears in getTasks", async () => {
    const created = await makeTask(client, { title: "Delete me" });
    await client.deleteTask(created.id);
    const found = await client.getTask(created.id);
    expect(found).toBeUndefined();
  });

  it("throws when deleting a non-existent task id", async () => {
    await expect(client.deleteTask("missing-task-id")).rejects.toThrow("Task not found");
  });
});

describe("MockApiClient — Task Validation", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("rejects creating a Blocked task without a blocking reason", async () => {
    await expect(
      makeTask(client, { status: "Blocked", blockingReason: "" }),
    ).rejects.toThrow("Blocking reason is required");
  });

  it("allows creating a Blocked task with a blocking reason", async () => {
    const task = await makeTask(client, {
      title: "Blocked task",
      status: "Blocked",
      blockingReason: "Waiting for approvals",
    });
    expect(task.status).toBe("Blocked");
    expect(task.blockingReason).toBe("Waiting for approvals");
  });

  it("rejects updating a task to Blocked without a blocking reason", async () => {
    const task = await makeTask(client);
    await expect(
      client.updateTask(task.id, { status: "Blocked", blockingReason: "" }),
    ).rejects.toThrow("Blocking reason is required");
  });

  it("auto-clears blockingReason when status changes away from Blocked", async () => {
    const blocked = await makeTask(client, {
      status: "Blocked",
      blockingReason: "Infra delay",
    });
    const updated = await client.updateTask(blocked.id, { status: "In Progress" });
    expect(updated.status).toBe("In Progress");
    expect(updated.blockingReason).toBe("");
  });
});

describe("MockApiClient — Task Filtering", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
    // Seed data is loaded from localStorage — fresh client has 6 seeded tasks
  });

  it("filters by status returns only matching tasks", async () => {
    const tasks = await client.getTasks({ status: "In Progress" });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.status === "In Progress")).toBe(true);
  });

  it("filters by priority returns only matching tasks", async () => {
    const tasks = await client.getTasks({ priority: "High" });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.priority === "High")).toBe(true);
  });

  it("filters unassigned tasks", async () => {
    const tasks = await client.getTasks({ assignee: "unassigned" });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.assigneeId === null)).toBe(true);
  });

  it("filters by assignee UUID", async () => {
    const all = await client.getTasks();
    const assignedTask = all.find((t) => t.assigneeId !== null);
    expect(assignedTask?.assigneeId).toBeTruthy();

    const assigneeId = assignedTask!.assigneeId!;
    const tasks = await client.getTasks({ assignee: assigneeId });
    expect(tasks.every((t) => t.assigneeId === assigneeId)).toBe(true);
  });

  it("searches by title (case-insensitive)", async () => {
    const tasks = await client.getTasks({ search: "ci/cd" });
    expect(tasks.length).toBeGreaterThan(0);
    expect(
      tasks.every(
        (t) =>
          t.title.toLowerCase().includes("ci/cd") ||
          (t.description ?? "").toLowerCase().includes("ci/cd") ||
          (t.gearId ?? "").includes("ci/cd"),
      ),
    ).toBe(true);
  });

  it("treats padded search text the same as trimmed search text", async () => {
    const trimmed = await client.getTasks({ search: "CI/CD" });
    const padded = await client.getTasks({ search: "  CI/CD  " });
    expect(trimmed.length).toBeGreaterThan(0);
    expect(padded.map((task) => task.id)).toEqual(trimmed.map((task) => task.id));

    const dashboardTasks = await client.getTasks();
    const trimmedDashboard = filterAndSortDashboardTasks(dashboardTasks, {
      statusFilter: "all",
      priorityFilter: "all",
      assigneeFilter: "all",
      search: "CI/CD",
      sort: "updated",
    });
    const paddedDashboard = filterAndSortDashboardTasks(dashboardTasks, {
      statusFilter: "all",
      priorityFilter: "all",
      assigneeFilter: "all",
      search: "  CI/CD  ",
      sort: "updated",
    });
    expect(paddedDashboard.map((task) => task.id)).toEqual(trimmedDashboard.map((task) => task.id));
  });

  it("treats whitespace-only search text the same as no search filter", async () => {
    const baseline = await client.getTasks();
    const whitespaceOnly = await client.getTasks({ search: "   " });
    expect(whitespaceOnly.map((task) => task.id)).toEqual(baseline.map((task) => task.id));
  });

  it("searches by gear ID", async () => {
    const raw = localStorage.getItem("taskflow_tasks");
    const seeded = raw ? JSON.parse(raw) : [];
    expect(seeded.length).toBeGreaterThan(0);

    seeded[0] = {
      ...seeded[0],
      title: "Unique gear id lookup",
      description: "Search should match only by gear id",
      gearId: "7777",
    };
    localStorage.setItem("taskflow_tasks", JSON.stringify(seeded));

    const tasks = await client.getTasks({ search: "7777" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(seeded[0].id);
    expect(tasks[0].gearId).toBe("7777");
  });

  it("returns empty array when no tasks match filter", async () => {
    const tasks = await client.getTasks({ search: "zzznomatch99xyz" });
    expect(tasks).toEqual([]);
  });

  it("dashboard search logic handles null descriptions without throwing", async () => {
    const tasks = await client.getTasks();
    const withNullDescription: Task[] = tasks.map((task, index) =>
      index === 0 ? { ...task, description: null } : task,
    );

    expect(() =>
      filterAndSortDashboardTasks(withNullDescription, {
        statusFilter: "all",
        priorityFilter: "all",
        assigneeFilter: "all",
        search: "ci/cd",
        sort: "updated",
      }),
    ).not.toThrow();
  });

  it("dashboard assignee filter options include only active members", async () => {
    const members = await client.getMembers();
    const activeMembers = getActiveAssigneeMembers(members);

    expect(activeMembers.every((member) => member.active)).toBe(true);
    expect(activeMembers.length).toBeLessThan(members.length);
  });
});

describe("MockApiClient — Task Sorting", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("sorts by updated (default) — most recently updated first", async () => {
    const tasks = await client.getTasks({ sort: "updated" });
    for (let i = 0; i < tasks.length - 1; i++) {
      expect(new Date(tasks[i].updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(tasks[i + 1].updatedAt).getTime(),
      );
    }
  });

  it("sorts by priority — High before Medium before Low", async () => {
    const tasks = await client.getTasks({ sort: "priority" });
    const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    for (let i = 0; i < tasks.length - 1; i++) {
      expect(order[tasks[i].priority]).toBeLessThanOrEqual(order[tasks[i + 1].priority]);
    }
  });

  it("sorts by priority and uses updatedAt desc as secondary tiebreaker", async () => {
    const raw = localStorage.getItem("taskflow_tasks");
    const tasks = raw ? JSON.parse(raw) : [];

    for (const task of tasks) {
      task.priority = "Low";
    }

    tasks[0].priority = "High";
    tasks[0].updatedAt = "2026-02-17T10:00:00.000Z";
    tasks[1].priority = "High";
    tasks[1].updatedAt = "2026-02-18T10:00:00.000Z";
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));

    const sorted = await client.getTasks({ sort: "priority" });
    expect(sorted[0].id).toBe(tasks[1].id);
    expect(sorted[1].id).toBe(tasks[0].id);
  });

  it("sorts by status — To Do before In Progress before Blocked before Done", async () => {
    const tasks = await client.getTasks({ sort: "status" });
    const order: Record<string, number> = { "To Do": 1, "In Progress": 2, Blocked: 3, Done: 4 };
    for (let i = 0; i < tasks.length - 1; i++) {
      expect(order[tasks[i].status]).toBeLessThanOrEqual(order[tasks[i + 1].status]);
    }
  });

  it("sorts by status and uses updatedAt desc as secondary tiebreaker", async () => {
    const raw = localStorage.getItem("taskflow_tasks");
    const tasks = raw ? JSON.parse(raw) : [];

    for (const task of tasks) {
      task.status = "Done";
    }

    tasks[0].status = "In Progress";
    tasks[0].updatedAt = "2026-02-17T10:00:00.000Z";
    tasks[1].status = "In Progress";
    tasks[1].updatedAt = "2026-02-18T10:00:00.000Z";
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));

    const sorted = await client.getTasks({ sort: "status" });
    expect(sorted[0].id).toBe(tasks[1].id);
    expect(sorted[1].id).toBe(tasks[0].id);
  });

  it("keeps dashboard client-side status sort in parity with adapter status sort", async () => {
    const dashboardInput = await client.getTasks();
    const dashboardSorted = filterAndSortDashboardTasks(dashboardInput, {
      statusFilter: "all",
      priorityFilter: "all",
      assigneeFilter: "all",
      search: "",
      sort: "status",
    });
    const adapterSorted = await client.getTasks({ sort: "status" });

    expect(dashboardSorted.map((task) => task.id)).toEqual(adapterSorted.map((task) => task.id));
  });

  it("keeps dashboard client-side updated sort in parity with adapter updated sort", async () => {
    const raw = localStorage.getItem("taskflow_tasks");
    const tasks = raw ? JSON.parse(raw) : [];
    expect(tasks.length).toBeGreaterThan(2);

    tasks[0].updatedAt = "2026-02-16T08:00:00.000Z";
    tasks[1].updatedAt = "2026-02-18T08:00:00.000Z";
    tasks[2].updatedAt = "2026-02-17T08:00:00.000Z";
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));

    const dashboardInput: Task[] = [tasks[2], tasks[0], tasks[1], ...tasks.slice(3)];
    const dashboardSorted = filterAndSortDashboardTasks(dashboardInput, {
      statusFilter: "all",
      priorityFilter: "all",
      assigneeFilter: "all",
      search: "",
      sort: "updated",
    });
    const adapterSorted = await client.getTasks({ sort: "updated" });

    expect(dashboardSorted.map((task) => task.id)).toEqual(adapterSorted.map((task) => task.id));
  });

  it("keeps dashboard client-side priority sort in parity with adapter priority sort including updatedAt tiebreaker", async () => {
    const raw = localStorage.getItem("taskflow_tasks");
    const tasks = raw ? JSON.parse(raw) : [];
    expect(tasks.length).toBeGreaterThan(2);

    for (const task of tasks) {
      task.priority = "Low";
    }

    tasks[0].priority = "High";
    tasks[0].updatedAt = "2026-02-17T10:00:00.000Z";
    tasks[1].priority = "High";
    tasks[1].updatedAt = "2026-02-18T10:00:00.000Z";
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));

    const dashboardInput: Task[] = [tasks[0], tasks[1], ...tasks.slice(2)];
    const dashboardSorted = filterAndSortDashboardTasks(dashboardInput, {
      statusFilter: "all",
      priorityFilter: "all",
      assigneeFilter: "all",
      search: "",
      sort: "priority",
    });
    const adapterSorted = await client.getTasks({ sort: "priority" });

    expect(dashboardSorted.map((task) => task.id)).toEqual(adapterSorted.map((task) => task.id));
  });
});
