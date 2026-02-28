import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient, CreateTaskData } from "../client";

async function createClient(): Promise<ApiClient> {
  localStorage.clear();
  vi.resetModules();
  const module = await import("./mock");
  return new module.MockApiClient();
}

describe("MockApiClient smoke", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("handles task create, update, and delete", async () => {
    const createData: CreateTaskData = {
      title: "Smoke task",
      description: "Verify task CRUD flow",
      status: "To Do",
      priority: "Medium",
      assigneeId: null,
      gearId: "9001",
      blockingReason: "",
    };

    const created = await client.createTask(createData);
    expect(created.id).toBeTruthy();
    expect(created.title).toBe("Smoke task");

    const updated = await client.updateTask(created.id, {
      status: "Blocked",
      blockingReason: "Waiting for dependency",
    });
    expect(updated.status).toBe("Blocked");
    expect(updated.blockingReason).toBe("Waiting for dependency");

    await client.deleteTask(created.id);
    const deleted = await client.getTask(created.id);
    expect(deleted).toBeUndefined();
  });

  it("handles subtask add, toggle, edit, reorder, and delete", async () => {
    const tasks = await client.getTasks();
    const taskId = tasks[0].id;

    const subTask = await client.addSubTask(taskId, { title: "Smoke subtask" });
    expect(subTask.completed).toBe(false);
    expect(subTask.position).toBeGreaterThanOrEqual(0);

    const toggled = await client.toggleSubTask(taskId, subTask.id);
    expect(toggled.completed).toBe(true);

    const edited = await client.editSubTask(taskId, subTask.id, { title: "Edited subtask" });
    expect(edited.title).toBe("Edited subtask");

    // Add another subtask and reorder
    const sub2 = await client.addSubTask(taskId, { title: "Second subtask" });
    const taskAfterAdd = await client.getTask(taskId);
    const allIds = taskAfterAdd!.subTasks.map(s => s.id);
    const reversed = [...allIds].reverse();
    const reordered = await client.reorderSubTasks(taskId, reversed);
    expect(reordered[0].id).toBe(reversed[0]);
    expect(reordered[0].position).toBe(0);

    await client.deleteSubTask(taskId, subTask.id);
    await client.deleteSubTask(taskId, sub2.id);
    const taskAfterDelete = await client.getTask(taskId);
    const removed = taskAfterDelete?.subTasks.find((item) => item.id === subTask.id);
    expect(removed).toBeUndefined();
  });

  it("enforces the daily update 24-hour edit/delete window", async () => {
    const recentTaskId = "t1";
    const recent = await client.addDailyUpdate(recentTaskId, {
      authorId: "m1",
      content: "Recent smoke update",
    });

    await expect(
      client.editDailyUpdate(recentTaskId, recent.id, { content: "Edited within 24h" }),
    ).resolves.toBeUndefined();
    await expect(client.deleteDailyUpdate(recentTaskId, recent.id)).resolves.toBeUndefined();

    await expect(
      client.editDailyUpdate("t2", "u2", { content: "Should fail" }),
    ).rejects.toThrow("Updates can only be edited within 24 hours.");
    await expect(client.deleteDailyUpdate("t2", "u2")).rejects.toThrow(
      "Updates can only be deleted within 24 hours.",
    );
  });

  it("applies member create/update/delete guard behavior", async () => {
    const member = await client.createMember({
      name: "Smoke Member",
      email: "smoke.member@example.com",
      active: true,
    });

    const updatedMember = await client.updateMember(member.id, { name: "Smoke Member Updated" });
    expect(updatedMember.name).toBe("Smoke Member Updated");

    const assignedTask = await client.createTask({
      title: "Guard task",
      description: "Task assigned to member",
      status: "In Progress",
      priority: "Low",
      assigneeId: member.id,
      gearId: "7770",
      blockingReason: "",
    });

    await expect(client.deleteMember(member.id)).rejects.toThrow(
      "Cannot delete member with 1 assigned task(s). Reassign or complete them first.",
    );

    await client.updateTask(assignedTask.id, {
      assigneeId: null,
    });
    await expect(client.deleteMember(member.id)).resolves.toBeUndefined();
  });

  it("rejects invalid gearId values outside 4-digit format", async () => {
    await expect(
      client.createTask({
        title: "Invalid gear id",
        description: null,
        status: "To Do",
        priority: "Low",
        assigneeId: null,
        gearId: "777",
        blockingReason: "",
      }),
    ).rejects.toThrow("GEAR ID must be 4 digits");
  });

  it("handles connection settings test and save", async () => {
    const settings = {
      host: "smoke-db",
      port: 5432,
      database: "smoke_db",
      username: "smoke_user",
      password: "smoke_password",
    };

    const testResult = await client.testConnection(settings);
    expect(testResult.success).toBe(true);
    expect(testResult.message).toContain("smoke-db");

    await expect(client.saveConnection(settings)).resolves.toBeUndefined();
    
    // Verify persistence (mock adapter uses localStorage)
    const stored = localStorage.getItem("taskflow_connection");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored || "{}");
    expect(parsed.host).toBe("smoke-db");

    const loaded = await client.getConnectionSettings();
    expect(loaded).toEqual(settings);
  });

  it("returns null when no saved connection settings exist", async () => {
    const loaded = await client.getConnectionSettings();
    expect(loaded).toBeNull();
  });
});
