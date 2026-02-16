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
      assigneeName: null,
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

  it("handles subtask add, toggle, and delete", async () => {
    const tasks = await client.getTasks();
    const taskId = tasks[0].id;

    const subTask = await client.addSubTask(taskId, { title: "Smoke subtask" });
    expect(subTask.completed).toBe(false);

    await client.toggleSubTask(taskId, subTask.id);
    const taskAfterToggle = await client.getTask(taskId);
    const toggled = taskAfterToggle?.subTasks.find((item) => item.id === subTask.id);
    expect(toggled?.completed).toBe(true);

    await client.deleteSubTask(taskId, subTask.id);
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
      assigneeName: updatedMember.name,
      gearId: "777",
      blockingReason: "",
    });

    await expect(client.deleteMember(member.id)).rejects.toThrow(
      "Cannot delete member with 1 assigned task(s). Reassign or complete them first.",
    );

    await client.updateTask(assignedTask.id, {
      assigneeId: null,
      assigneeName: null,
    });
    await expect(client.deleteMember(member.id)).resolves.toBeUndefined();
  });
});