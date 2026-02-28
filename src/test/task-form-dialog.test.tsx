import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import type { Task, TeamMember } from "@/types";

const members: TeamMember[] = [
  { id: "m1", name: "Alice Chen", email: "alice@example.com", active: true },
];

describe("TaskFormDialog", () => {
  it("submits gearId as null when the GEAR ID field is empty", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={members}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title *"), {
      target: { value: "Create task without gear id" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Create task without gear id",
          description: null,
          gearId: null,
        }),
      );
    });
  });

  it("handles null task description in edit mode without crashing", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const task: Task = {
      id: "t-null-desc",
      title: "Task with null description",
      description: null,
      status: "To Do",
      priority: "Medium",
      assigneeId: null,
      assigneeName: null,
      gearId: null,
      blockingReason: "",
      subTasks: [],
      dailyUpdates: [],
      createdAt: "2026-02-21T00:00:00.000Z",
      updatedAt: "2026-02-21T00:00:00.000Z",
    };

    render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={members}
        task={task}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Task with null description",
          description: null,
        }),
      );
    });
  });

  it("falls back to unassigned in edit mode when task assignee is inactive", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const editMembers: TeamMember[] = [
      { id: "m1", name: "Alice Chen", email: "alice@example.com", active: true },
      { id: "m2", name: "Inactive User", email: "inactive@example.com", active: false },
    ];
    const task: Task = {
      id: "t-inactive-assignee",
      title: "Task with inactive assignee",
      description: null,
      status: "To Do",
      priority: "Medium",
      assigneeId: "m2",
      assigneeName: "Inactive User",
      gearId: null,
      blockingReason: "",
      subTasks: [],
      dailyUpdates: [],
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    };

    render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={editMembers}
        task={task}
      />,
    );

    const assigneeSelect = screen
      .getAllByRole("combobox")
      .find((combobox) => combobox.textContent?.includes("Unassigned"));
    expect(assigneeSelect).toBeDefined();
    expect(assigneeSelect).toHaveTextContent("Unassigned");

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: null,
        }),
      );
    });
  });

  it("preserves in-progress edits when members prop changes while dialog remains open", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const task: Task = {
      id: "t-members-refresh",
      title: "Original title",
      description: "Original description",
      status: "To Do",
      priority: "Medium",
      assigneeId: "m1",
      assigneeName: "Alice Chen",
      gearId: "1234",
      blockingReason: "",
      subTasks: [],
      dailyUpdates: [],
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    };

    const { rerender } = render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={members}
        task={task}
      />,
    );

    expect(screen.getByLabelText("Title *")).toHaveValue("Original title");

    fireEvent.change(screen.getByLabelText("Title *"), {
      target: { value: "Draft title" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Draft description" },
    });

    const refreshedMembers: TeamMember[] = [
      { id: "m1", name: "Alice Chen", email: "alice@example.com", active: true },
      { id: "m2", name: "Bob Martinez", email: "bob@example.com", active: true },
    ];

    rerender(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={refreshedMembers}
        task={task}
      />,
    );

    expect(screen.getByLabelText("Title *")).toHaveValue("Draft title");
    expect(screen.getByLabelText("Description")).toHaveValue("Draft description");
  });

  it("applies maxLength constraints for title and description fields", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={members}
      />,
    );

    expect(screen.getByLabelText("Title *")).toHaveAttribute("maxLength", "200");
    expect(screen.getByLabelText("Description")).toHaveAttribute("maxLength", "2000");
  });

  it("applies maxLength constraint for blocking reason when status is Blocked", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const blockedTask: Task = {
      id: "t-blocked",
      title: "Blocked task",
      description: null,
      status: "Blocked",
      priority: "High",
      assigneeId: null,
      assigneeName: null,
      gearId: null,
      blockingReason: "Waiting on infra",
      subTasks: [],
      dailyUpdates: [],
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    };

    render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={members}
        task={blockedTask}
      />,
    );

    expect(screen.getByLabelText("Blocking Reason *")).toHaveAttribute("maxLength", "1000");
  });

  it("blocks submit when title exceeds 200 chars", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={members}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title *"), {
      target: { value: "x".repeat(201) },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(() => {
      expect(screen.getByText("Title must be 200 characters or fewer")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit when blocking reason exceeds 1000 chars", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const blockedTask: Task = {
      id: "t-blocked-2",
      title: "Blocked task 2",
      description: null,
      status: "Blocked",
      priority: "High",
      assigneeId: null,
      assigneeName: null,
      gearId: null,
      blockingReason: "Current reason",
      subTasks: [],
      dailyUpdates: [],
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    };

    render(
      <TaskFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        members={members}
        task={blockedTask}
      />,
    );

    fireEvent.change(screen.getByLabelText("Blocking Reason *"), {
      target: { value: "b".repeat(1001) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Blocking reason must be 1000 characters or fewer")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
