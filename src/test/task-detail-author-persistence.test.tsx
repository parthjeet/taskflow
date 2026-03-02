import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TaskDetail from "@/pages/TaskDetail";
import type { Task, TeamMember } from "@/types";

const { mockToast, mockApiClient } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockApiClient: {
    getTask: vi.fn(),
    getMembers: vi.fn(),
    addDailyUpdate: vi.fn(),
    addSubTask: vi.fn(),
    toggleSubTask: vi.fn(),
    deleteSubTask: vi.fn(),
    editDailyUpdate: vi.fn(),
    deleteDailyUpdate: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  apiClient: mockApiClient,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const baseTask: Task = {
  id: "t1",
  title: "Task detail test",
  description: "Task detail test description",
  status: "In Progress",
  priority: "High",
  assigneeId: "m1",
  assigneeName: "Alice Chen",
  gearId: "1234",
  blockingReason: "",
  subTasks: [],
  dailyUpdates: [],
  createdAt: "2026-02-17T00:00:00.000Z",
  updatedAt: "2026-02-17T01:00:00.000Z",
};

const members: TeamMember[] = [
  { id: "m1", name: "Alice Chen", email: "alice@example.com", active: true },
  { id: "m3", name: "Carol Kim", email: "carol@example.com", active: true },
];

function renderTaskDetail() {
  return render(
    <MemoryRouter initialEntries={["/tasks/t1"]}>
      <Routes>
        <Route path="/tasks/:id" element={<TaskDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderTaskDetailWithHomeRoute() {
  return render(
    <MemoryRouter initialEntries={["/tasks/t1"]}>
      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("TaskDetail author persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApiClient.getTask.mockResolvedValue(baseTask);
    mockApiClient.getMembers.mockResolvedValue(members);
    mockApiClient.addDailyUpdate.mockImplementation(async (_taskId: string, payload: { authorId: string; content: string }) => ({
      id: "u-new",
      taskId: "t1",
      authorId: payload.authorId,
      authorName: payload.authorId === "m3" ? "Carol Kim" : "Alice Chen",
      content: payload.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false,
    }));
    mockApiClient.addSubTask.mockResolvedValue({
      id: "s-new",
      title: "New sub-task",
      completed: false,
      createdAt: new Date().toISOString(),
    });
    mockApiClient.toggleSubTask.mockResolvedValue(undefined);
    mockApiClient.deleteSubTask.mockResolvedValue(undefined);
  });

  it("uses stored last author id when opening Add Update dialog", async () => {
    localStorage.setItem("taskflow-last-author", "m3");

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /add update/i }));
    fireEvent.change(screen.getByPlaceholderText("What's the latest?"), {
      target: { value: "Stored author should be used" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));

    await waitFor(() => {
      expect(mockApiClient.addDailyUpdate).toHaveBeenCalledWith("t1", {
        authorId: "m3",
        content: "Stored author should be used",
      });
    });
  });

  it("persists selected author id after successful Add Update", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    localStorage.setItem("taskflow-last-author", "m3");
    setItemSpy.mockClear();

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /add update/i }));
    fireEvent.change(screen.getByPlaceholderText("What's the latest?"), {
      target: { value: "Persist author" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith("taskflow-last-author", "m3");
    });
  });

  it("falls back to first active member when stored author is inactive", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    localStorage.setItem("taskflow-last-author", "m3");
    setItemSpy.mockClear();
    mockApiClient.getMembers.mockResolvedValue([
      { id: "m1", name: "Alice Chen", email: "alice@example.com", active: true },
      { id: "m3", name: "Carol Kim", email: "carol@example.com", active: false },
    ]);

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /add update/i }));
    fireEvent.change(screen.getByPlaceholderText("What's the latest?"), {
      target: { value: "Fallback to first active member" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));

    await waitFor(() => {
      expect(mockApiClient.addDailyUpdate).toHaveBeenCalledWith("t1", {
        authorId: "m1",
        content: "Fallback to first active member",
      });
    });

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith("taskflow-last-author", "m1");
    });
  });

  it("falls back to first active member when no stored author exists", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    setItemSpy.mockClear();

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /add update/i }));
    fireEvent.change(screen.getByPlaceholderText("What's the latest?"), {
      target: { value: "No stored author fallback" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));

    await waitFor(() => {
      expect(mockApiClient.addDailyUpdate).toHaveBeenCalledWith("t1", {
        authorId: "m1",
        content: "No stored author fallback",
      });
    });

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith("taskflow-last-author", "m1");
    });
  });

  it("sets maxLength on Add Update textarea", async () => {
    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /add update/i }));

    const addUpdateTextarea = screen.getByPlaceholderText("What's the latest?");
    expect(addUpdateTextarea).toHaveAttribute("maxLength", "1000");
  });
});

describe("TaskDetail sub-task error handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApiClient.getTask.mockResolvedValue({
      ...baseTask,
      subTasks: [{ id: "s1", title: "Sub-task A", completed: false, createdAt: "2026-02-17T00:00:00.000Z" }],
    });
    mockApiClient.getMembers.mockResolvedValue(members);
    mockApiClient.addDailyUpdate.mockResolvedValue({
      id: "u-new",
      taskId: "t1",
      authorId: "m1",
      authorName: "Alice Chen",
      content: "content",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false,
    });
    mockApiClient.addSubTask.mockResolvedValue({
      id: "s2",
      title: "Another sub-task",
      completed: false,
      createdAt: new Date().toISOString(),
    });
  });

  it("shows a destructive toast when addSubTask fails from Enter key", async () => {
    mockApiClient.addSubTask.mockRejectedValue(new Error("Maximum of 20 sub-tasks per task"));

    renderTaskDetail();
    await screen.findByText("Task detail test");

    const input = screen.getByPlaceholderText("Add sub-task...");
    fireEvent.change(input, { target: { value: "Will fail" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Maximum of 20 sub-tasks per task",
        variant: "destructive",
      });
    });
  });

  it("shows a destructive toast when addSubTask fails from + button click", async () => {
    mockApiClient.addSubTask.mockRejectedValue(new Error("Maximum of 20 sub-tasks per task"));

    renderTaskDetail();
    await screen.findByText("Task detail test");

    const input = screen.getByPlaceholderText("Add sub-task...");
    fireEvent.change(input, { target: { value: "Will fail via button" } });
    fireEvent.click(screen.getByTestId("add-subtask-btn"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Maximum of 20 sub-tasks per task",
        variant: "destructive",
      });
    });
  });

  it("disables add-subtask actions while request is pending and prevents duplicate submits", async () => {
    const addDeferred = deferred<{
      id: string;
      title: string;
      completed: boolean;
      createdAt: string;
    }>();
    mockApiClient.addSubTask.mockReturnValue(addDeferred.promise);

    renderTaskDetail();
    await screen.findByText("Task detail test");

    const input = screen.getByPlaceholderText("Add sub-task...");
    fireEvent.change(input, { target: { value: "Pending add request" } });
    const addButton = screen.getByTestId("add-subtask-btn");

    fireEvent.click(addButton);
    fireEvent.click(addButton);
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(mockApiClient.addSubTask).toHaveBeenCalledTimes(1);
    expect(addButton).toBeDisabled();

    addDeferred.resolve({
      id: "s2",
      title: "Pending add request",
      completed: false,
      createdAt: new Date().toISOString(),
    });
    await waitFor(() => {
      expect(mockApiClient.addSubTask).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a destructive toast when toggleSubTask fails", async () => {
    mockApiClient.toggleSubTask.mockRejectedValue(new Error("Toggle failed"));

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Toggle failed",
        variant: "destructive",
      });
    });
  });

  it("shows a destructive toast when deleteSubTask fails", async () => {
    mockApiClient.deleteSubTask.mockRejectedValue(new Error("Delete failed"));

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByTestId("delete-subtask-s1"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Delete failed",
        variant: "destructive",
      });
    });
  });

  it("disables delete-subtask button while request is pending and prevents double click", async () => {
    const deleteDeferred = deferred<void>();
    mockApiClient.deleteSubTask.mockReturnValue(deleteDeferred.promise);

    renderTaskDetail();
    await screen.findByText("Task detail test");

    const deleteButton = screen.getByTestId("delete-subtask-s1");
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    expect(mockApiClient.deleteSubTask).toHaveBeenCalledTimes(1);
    expect(deleteButton).toBeDisabled();

    deleteDeferred.resolve();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Sub-task removed" });
    });
  });

  it("sets maxLength on add-subtask input", async () => {
    renderTaskDetail();
    await screen.findByText("Task detail test");

    expect(screen.getByPlaceholderText("Add sub-task...")).toHaveAttribute("maxLength", "200");
  });
});

describe("TaskDetail daily update edit loading", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApiClient.getTask.mockResolvedValue({
      ...baseTask,
      dailyUpdates: [
        {
          id: "u1",
          taskId: "t1",
          authorId: "m1",
          authorName: "Alice Chen",
          content: "Initial update",
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          edited: false,
        },
      ],
    });
    mockApiClient.getMembers.mockResolvedValue(members);
  });

  it("disables inline edit Save while request is pending to avoid double submits", async () => {
    const editDeferred = deferred<void>();
    mockApiClient.editDailyUpdate.mockReturnValue(editDeferred.promise);

    renderTaskDetail();
    await screen.findByText("Task detail test");

    const editButtons = screen.getAllByRole("button", { name: /^Edit$/ });
    fireEvent.click(editButtons[editButtons.length - 1]);

    const editBox = screen.getByDisplayValue("Initial update");
    fireEvent.change(editBox, { target: { value: "Edited content" } });

    const saveButton = screen.getByRole("button", { name: /^Save$/ });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(mockApiClient.editDailyUpdate).toHaveBeenCalledTimes(1);
    expect(saveButton).toBeDisabled();

    editDeferred.resolve();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Update edited" });
    });
  });

  it("sets maxLength on inline edit textarea", async () => {
    renderTaskDetail();
    await screen.findByText("Task detail test");

    const editButtons = screen.getAllByRole("button", { name: /^Edit$/ });
    fireEvent.click(editButtons[editButtons.length - 1]);

    const inlineEditTextarea = screen.getByDisplayValue("Initial update");
    expect(inlineEditTextarea).toHaveAttribute("maxLength", "1000");
  });
});

describe("TaskDetail load error handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApiClient.getTask.mockRejectedValue(new Error("Load failed"));
    mockApiClient.getMembers.mockResolvedValue(members);
  });

  it("shows error toast and navigates back home when initial load fails", async () => {
    renderTaskDetailWithHomeRoute();

    await screen.findByText("Home Page");

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Load failed",
        variant: "destructive",
      });
    });
  });

  it("does not toast or navigate when load rejects after component unmount", async () => {
    const taskDeferred = deferred<Task>();
    const membersDeferred = deferred<TeamMember[]>();
    mockApiClient.getTask.mockReturnValue(taskDeferred.promise);
    mockApiClient.getMembers.mockReturnValue(membersDeferred.promise);

    const { unmount } = renderTaskDetailWithHomeRoute();
    unmount();

    taskDeferred.reject(new Error("Load failed after unmount"));
    membersDeferred.resolve(members);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });
});

describe("TaskDetail delete task error handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApiClient.getTask.mockResolvedValue(baseTask);
    mockApiClient.getMembers.mockResolvedValue(members);
  });

  it("shows a destructive toast when deleteTask fails", async () => {
    mockApiClient.deleteTask.mockRejectedValue(new Error("Delete task failed"));

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));

    await screen.findByText("Delete Task");
    fireEvent.click(screen.getByTestId("confirm-delete-task"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Delete task failed",
        variant: "destructive",
      });
    });
  });

  it("disables confirm delete while request is pending and prevents double submit", async () => {
    const deleteDeferred = deferred<void>();
    mockApiClient.deleteTask.mockReturnValue(deleteDeferred.promise);

    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
    const confirmDeleteButton = await screen.findByTestId("confirm-delete-task");

    fireEvent.click(confirmDeleteButton);
    fireEvent.click(confirmDeleteButton);

    expect(mockApiClient.deleteTask).toHaveBeenCalledTimes(1);
    expect(confirmDeleteButton).toBeDisabled();

    deleteDeferred.resolve();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Task deleted" });
    });
  });
});

describe("TaskDetail update payload hygiene", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApiClient.getTask.mockResolvedValue(baseTask);
    mockApiClient.getMembers.mockResolvedValue(members);
    mockApiClient.updateTask.mockResolvedValue(baseTask);
  });

  it("strips assigneeName before calling updateTask from edit dialog", async () => {
    renderTaskDetail();
    await screen.findByText("Task detail test");

    fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockApiClient.updateTask).toHaveBeenCalledTimes(1);
    });

    const payload = mockApiClient.updateTask.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("assigneeName");
  });
});

describe("TaskDetail delete daily update loading", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApiClient.getTask.mockResolvedValue({
      ...baseTask,
      dailyUpdates: [
        {
          id: "u1",
          taskId: "t1",
          authorId: "m1",
          authorName: "Alice Chen",
          content: "Initial update",
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          edited: false,
        },
      ],
    });
    mockApiClient.getMembers.mockResolvedValue(members);
  });

  it("disables delete update confirm while request is pending to avoid double submits", async () => {
    const deleteDeferred = deferred<void>();
    mockApiClient.deleteDailyUpdate.mockReturnValue(deleteDeferred.promise);

    renderTaskDetail();
    await screen.findByText("Task detail test");
    await screen.findByText("Initial update");

    const deleteButtons = screen.getAllByRole("button", { name: /^Delete$/ });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    const confirmDeleteButton = await screen.findByTestId("confirm-delete-update");

    fireEvent.click(confirmDeleteButton);
    fireEvent.click(confirmDeleteButton);

    expect(mockApiClient.deleteDailyUpdate).toHaveBeenCalledTimes(1);
    expect(confirmDeleteButton).toBeDisabled();

    deleteDeferred.resolve();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Update deleted" });
    });
  });
});
