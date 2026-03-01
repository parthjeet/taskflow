/**
 * Regression tests for Story 2.2 gap fixes in MockApiClient.
 *
 * Gaps covered:
 *   - Gap 1: updateTask assigneeName re-resolution (AC 6)
 *   - Gap 2: addSubTask max 20 limit (AC 7)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "@/lib/api/client";

async function createClient(): Promise<ApiClient> {
  localStorage.clear();
  vi.resetModules();
  const module = await import("@/lib/api/adapters/mock");
  return new module.MockApiClient();
}

describe("Story 2.2 — Gap 1: updateTask assigneeName re-resolution", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
    // Seed data has:
    //   m1 = Alice Chen, m2 = Bob Martinez, m3 = Carol Kim
    //   t1 assigned to m1 (Alice Chen)
  });

  it("re-resolves assigneeName when reassigning to another member", async () => {
    // t1 is currently assigned to m1 (Alice Chen)
    const updated = await client.updateTask("t1", { assigneeId: "m2" });
    expect(updated.assigneeId).toBe("m2");
    expect(updated.assigneeName).toBe("Bob Martinez");
  });

  it("sets assigneeName to null when assigneeId is explicitly set to null", async () => {
    const updated = await client.updateTask("t1", { assigneeId: null });
    expect(updated.assigneeId).toBeNull();
    expect(updated.assigneeName).toBeNull();
  });

  it("preserves existing assigneeName when assigneeId is not in the update payload", async () => {
    // t1 has assigneeName 'Alice Chen' — updating only title should not touch assigneeName
    const updated = await client.updateTask("t1", { title: "Title only change" });
    expect(updated.assigneeName).toBe("Alice Chen");
    expect(updated.assigneeId).toBe("m1");
  });

  it("resolves correct name after member was updated", async () => {
    // Update member name, then re-assign task to verify name is resolved at update time
    await client.updateMember("m2", { name: "Roberto Martinez" });
    const updated = await client.updateTask("t1", { assigneeId: "m2" });
    expect(updated.assigneeName).toBe("Roberto Martinez");
  });

  it("throws when assigneeId does not match any member", async () => {
    await expect(client.updateTask("t1", { assigneeId: "missing-member-id" })).rejects.toThrow(
      "Assignee not found",
    );

    const task = await client.getTask("t1");
    expect(task?.assigneeId).toBe("m1");
    expect(task?.assigneeName).toBe("Alice Chen");
  });
});

describe("Story 2.2 — Gap 2: addSubTask max 20 limit", () => {
  let client: ApiClient;

  async function resolveWithMockDelay<T>(op: () => Promise<T>): Promise<T> {
    const pending = op();
    await vi.runAllTimersAsync();
    return await pending;
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    client = await createClient();
    // t1 starts with 3 sub-tasks from seed data
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when attempting to add a 21st sub-task", async () => {
    // t1 has 3 sub-tasks; add 17 more to reach 20
    for (let i = 0; i < 17; i++) {
      await resolveWithMockDelay(() => client.addSubTask("t1", { title: `Fill sub-task ${i + 1}` }));
    }

    // 21st should throw
    const overLimit = client.addSubTask("t1", { title: "Over the limit" });
    const rejection = expect(overLimit).rejects.toThrow("Maximum of 20 sub-tasks per task");
    await vi.runAllTimersAsync();
    await rejection;
  });

  it("allows adding exactly 20 sub-tasks", async () => {
    // t1 has 3 sub-tasks; add 17 more to exactly hit 20
    for (let i = 0; i < 17; i++) {
      await resolveWithMockDelay(() => client.addSubTask("t1", { title: `Sub-task ${i + 1}` }));
    }

    const task = await resolveWithMockDelay(() => client.getTask("t1"));
    expect(task?.subTasks.length).toBe(20);
  });

  it("error message is exactly 'Maximum of 20 sub-tasks per task'", async () => {
    // Exhaust to 20 then check the exact error message
    const task = await resolveWithMockDelay(() => client.getTask("t1"));
    const toAdd = 20 - (task?.subTasks.length ?? 0);
    for (let i = 0; i < toAdd; i++) {
      await resolveWithMockDelay(() => client.addSubTask("t1", { title: `Pad ${i}` }));
    }

    const overLimit = client.addSubTask("t1", { title: "21st" });
    const rejection = expect(overLimit).rejects.toMatchObject({ message: "Maximum of 20 sub-tasks per task" });
    await vi.runAllTimersAsync();
    await rejection;
  });
});

describe("Story 2.2 — Review follow-up: null-safe task search", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("does not throw when description and gearId are null", async () => {
    const raw = localStorage.getItem("taskflow_tasks");
    const tasks = raw ? JSON.parse(raw) : [];
    tasks[0] = {
      ...tasks[0],
      title: "Null-safe task",
      description: null,
      gearId: null,
    };
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));

    await expect(client.getTasks({ search: "needle-not-present" })).resolves.toEqual([]);
  });
});

describe("Story 2.2 — Review follow-up: createTask assignee validation", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("throws when createTask assigneeId does not match any member", async () => {
    await expect(
      client.createTask({
        title: "Bad assignee",
        description: "Should fail",
        status: "To Do",
        priority: "Low",
        assigneeId: "missing-member-id",
        gearId: null,
        blockingReason: "",
      }),
    ).rejects.toThrow("Assignee not found");
  });

  it("throws when createTask assigneeId targets an inactive member", async () => {
    await expect(
      client.createTask({
        title: "Inactive assignee",
        description: "Should fail",
        status: "To Do",
        priority: "Low",
        assigneeId: "m5",
        gearId: null,
        blockingReason: "",
      }),
    ).rejects.toThrow("Assignee not found");
  });

  it("throws when updateTask assigneeId targets an inactive member", async () => {
    await expect(client.updateTask("t1", { assigneeId: "m5" })).rejects.toThrow("Assignee not found");

    const task = await client.getTask("t1");
    expect(task?.assigneeId).toBe("m1");
    expect(task?.assigneeName).toBe("Alice Chen");
  });
});

describe("Story 2.2 — Review follow-up: seed data contract parity", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("uses null gearId in seed data when no gear id is present", async () => {
    const task = await client.getTask("t6");
    expect(task?.gearId).toBeNull();
  });

  it("re-seeds tasks when members exist but tasks key is missing", async () => {
    localStorage.clear();
    localStorage.setItem(
      "taskflow_members",
      JSON.stringify([{ id: "existing-member", name: "Existing", email: "existing@example.com", active: true }]),
    );
    localStorage.removeItem("taskflow_tasks");

    vi.resetModules();
    const module = await import("@/lib/api/adapters/mock");
    const reseededClient: ApiClient = new module.MockApiClient();

    const tasks = await reseededClient.getTasks();
    expect(tasks.length).toBeGreaterThan(0);
  });
});

describe("Story 2.2 — Review follow-up: deleteSubTask not-found handling", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("throws when deleting a sub-task id that does not exist on the task", async () => {
    await expect(client.deleteSubTask("t1", "missing-subtask-id")).rejects.toThrow("Sub-task not found");
  });
});

describe("Story 2.2 — Review follow-up: daily update task timestamp parity", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("updates task.updatedAt when editing a daily update", async () => {
    const before = await client.getTask("t1");
    expect(before).toBeTruthy();

    await client.editDailyUpdate("t1", "u1", { content: "Edited update content" });
    const after = await client.getTask("t1");

    expect(after?.updatedAt).not.toBe(before?.updatedAt);
  });

  it("updates task.updatedAt when deleting a daily update", async () => {
    const before = await client.getTask("t1");
    expect(before).toBeTruthy();

    await client.deleteDailyUpdate("t1", "u1");
    const after = await client.getTask("t1");

    expect(after?.updatedAt).not.toBe(before?.updatedAt);
  });
});

describe("Story 2.2 — Review follow-up: addDailyUpdate author validation", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("throws when adding update with an inactive member as author", async () => {
    await expect(
      client.addDailyUpdate("t1", { authorId: "m5", content: "Inactive author should fail" }),
    ).rejects.toThrow("Author not found");
  });
});

describe("Story 2.2 — Review follow-up: createTask blocking reason normalization", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("clears blockingReason when creating non-Blocked tasks", async () => {
    const created = await client.createTask({
      title: "Non-blocked task with stale reason",
      description: "Should normalize blocking reason",
      status: "In Progress",
      priority: "Medium",
      assigneeId: null,
      gearId: null,
      blockingReason: "This should be cleared",
    });

    expect(created.blockingReason).toBe("");
  });

  it("stores trimmed blockingReason when creating a Blocked task", async () => {
    const created = await client.createTask({
      title: "Blocked create trim check",
      description: null,
      status: "Blocked",
      priority: "Medium",
      assigneeId: null,
      gearId: null,
      blockingReason: "  Waiting on dependency  ",
    });

    expect(created.blockingReason).toBe("Waiting on dependency");
  });

  it("stores trimmed blockingReason when updating a Blocked task", async () => {
    const updated = await client.updateTask("t2", {
      blockingReason: "  Updated blocking reason  ",
    });

    expect(updated.blockingReason).toBe("Updated blocking reason");
  });
});

describe("Story 2.2 — Review follow-up: deleteMember daily-update authorship guard", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("throws when deleting a member who authored daily updates", async () => {
    const member = await client.createMember({
      name: "Update Author",
      email: "update.author@example.com",
      active: true,
    });

    await client.addDailyUpdate("t1", {
      authorId: member.id,
      content: "Authored update",
    });

    await expect(client.deleteMember(member.id)).rejects.toThrow(
      "Cannot delete member with 1 authored daily update(s). Reassign or remove them first.",
    );
  });

  it("throws when deleting a member id that does not exist", async () => {
    await expect(client.deleteMember("missing-member-id")).rejects.toThrow("Member not found");
  });
});

describe("Story 2.2 — Review follow-up: gearId format validation parity", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("throws when createTask receives a non-4-digit gearId", async () => {
    await expect(
      client.createTask({
        title: "Invalid create gearId",
        description: null,
        status: "To Do",
        priority: "Low",
        assigneeId: null,
        gearId: "123",
        blockingReason: "",
      }),
    ).rejects.toThrow("GEAR ID must be 4 digits");
  });

  it("throws when updateTask receives a non-4-digit gearId", async () => {
    await expect(client.updateTask("t1", { gearId: "12345" })).rejects.toThrow("GEAR ID must be 4 digits");
  });
});

describe("Story 2.2 — Review follow-up: task field length validation parity", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("rejects createTask when title exceeds 200 chars", async () => {
    await expect(
      client.createTask({
        title: "t".repeat(201),
        description: null,
        status: "To Do",
        priority: "Medium",
        assigneeId: null,
        gearId: null,
        blockingReason: "",
      }),
    ).rejects.toThrow("Task title must be 200 characters or fewer");
  });

  it("rejects createTask when title is empty after trimming", async () => {
    await expect(
      client.createTask({
        title: "   ",
        description: null,
        status: "To Do",
        priority: "Medium",
        assigneeId: null,
        gearId: null,
        blockingReason: "",
      }),
    ).rejects.toThrow("Task title is required");
  });

  it("rejects createTask when description exceeds 2000 chars", async () => {
    await expect(
      client.createTask({
        title: "Length check",
        description: "d".repeat(2001),
        status: "To Do",
        priority: "Medium",
        assigneeId: null,
        gearId: null,
        blockingReason: "",
      }),
    ).rejects.toThrow("Task description must be 2000 characters or fewer");
  });

  it("rejects updateTask when title exceeds 200 chars", async () => {
    await expect(client.updateTask("t1", { title: "t".repeat(201) })).rejects.toThrow(
      "Task title must be 200 characters or fewer",
    );
  });

  it("rejects updateTask when title is empty after trimming", async () => {
    await expect(client.updateTask("t1", { title: "   " })).rejects.toThrow("Task title is required");
  });

  it("rejects updateTask when description exceeds 2000 chars", async () => {
    await expect(client.updateTask("t1", { description: "d".repeat(2001) })).rejects.toThrow(
      "Task description must be 2000 characters or fewer",
    );
  });

  it("rejects createTask when blockingReason exceeds 1000 chars", async () => {
    await expect(
      client.createTask({
        title: "Blocking reason length create",
        description: null,
        status: "Blocked",
        priority: "Medium",
        assigneeId: null,
        gearId: null,
        blockingReason: "b".repeat(1001),
      }),
    ).rejects.toThrow("Blocking reason must be 1000 characters or fewer");
  });

  it("rejects updateTask when blockingReason exceeds 1000 chars", async () => {
    await expect(client.updateTask("t2", { blockingReason: "b".repeat(1001) })).rejects.toThrow(
      "Blocking reason must be 1000 characters or fewer",
    );
  });

  it("stores trimmed title and description when creating a task", async () => {
    const created = await client.createTask({
      title: "  Trimmed title  ",
      description: "  Trimmed description  ",
      status: "To Do",
      priority: "Medium",
      assigneeId: null,
      gearId: null,
      blockingReason: "",
    });

    expect(created.title).toBe("Trimmed title");
    expect(created.description).toBe("Trimmed description");
  });

  it("normalizes empty string description to null when creating a task", async () => {
    const created = await client.createTask({
      title: "Empty description create",
      description: "",
      status: "To Do",
      priority: "Medium",
      assigneeId: null,
      gearId: null,
      blockingReason: "",
    });

    expect(created.description).toBeNull();
  });

  it("stores trimmed title and description when updating a task", async () => {
    const updated = await client.updateTask("t1", {
      title: "  Updated title  ",
      description: "  Updated description  ",
    });

    expect(updated.title).toBe("Updated title");
    expect(updated.description).toBe("Updated description");
  });

  it("normalizes empty string description to null when updating a task", async () => {
    const updated = await client.updateTask("t1", {
      description: "",
    });

    expect(updated.description).toBeNull();
  });

  it("allows padded titles when trimmed length is within 200 chars", async () => {
    const created = await client.createTask({
      title: `A${" ".repeat(200)}`,
      description: null,
      status: "To Do",
      priority: "Medium",
      assigneeId: null,
      gearId: null,
      blockingReason: "",
    });

    expect(created.title).toBe("A");
  });
});

describe("Story 2.2 — Review follow-up: sub-task and daily-update content length validation", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("rejects addSubTask when title exceeds 200 chars", async () => {
    await expect(client.addSubTask("t1", { title: "s".repeat(201) })).rejects.toThrow(
      "Sub-task title must be 200 characters or fewer",
    );
  });

  it("rejects addSubTask when title is empty after trimming", async () => {
    await expect(client.addSubTask("t1", { title: "   " })).rejects.toThrow("Sub-task title is required");
  });

  it("stores trimmed sub-task title", async () => {
    const created = await client.addSubTask("t1", { title: "  Trim me  " });
    expect(created.title).toBe("Trim me");
  });

  it("allows padded sub-task titles when trimmed length is within 200 chars", async () => {
    const created = await client.addSubTask("t1", { title: `X${" ".repeat(200)}` });
    expect(created.title).toBe("X");
  });

  it("rejects addDailyUpdate when content is empty after trimming", async () => {
    await expect(client.addDailyUpdate("t1", { authorId: "m1", content: "   " })).rejects.toThrow(
      "Update content must be between 1 and 1000 characters",
    );
  });

  it("rejects addDailyUpdate when content exceeds 1000 chars", async () => {
    await expect(client.addDailyUpdate("t1", { authorId: "m1", content: "u".repeat(1001) })).rejects.toThrow(
      "Update content must be between 1 and 1000 characters",
    );
  });

  it("rejects editDailyUpdate when content exceeds 1000 chars", async () => {
    await expect(client.editDailyUpdate("t1", "u1", { content: "u".repeat(1001) })).rejects.toThrow(
      "Update content must be between 1 and 1000 characters",
    );
  });
});

describe("Story 2.2 — Review follow-up: member email uniqueness validation", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("rejects createMember when email already exists", async () => {
    await expect(
      client.createMember({
        name: "Duplicate Alice",
        email: "alice@devops.io",
        active: true,
      }),
    ).rejects.toThrow("A member with this email already exists");
  });

  it("rejects updateMember when email already exists on another member", async () => {
    await expect(client.updateMember("m2", { email: "alice@devops.io" })).rejects.toThrow(
      "A member with this email already exists",
    );
  });
});

describe("Story 2.2 — Review follow-up: updateTask ignores explicit undefined partial fields", () => {
  let client: ApiClient;

  beforeEach(async () => {
    client = await createClient();
  });

  it("preserves existing gearId when update payload includes gearId: undefined", async () => {
    const before = await client.getTask("t1");
    expect(before?.gearId).toBe("1024");

    const updated = await client.updateTask("t1", { gearId: undefined });
    expect(updated.gearId).toBe("1024");

    const after = await client.getTask("t1");
    expect(after?.gearId).toBe("1024");
  });
});
