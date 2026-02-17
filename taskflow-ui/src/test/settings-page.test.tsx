import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SettingsPage from "@/pages/SettingsPage";

const testConnectionMock = vi.fn();
const saveConnectionMock = vi.fn();
const getConnectionSettingsMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiClient: {
    getConnectionSettings: (...args: unknown[]) => getConnectionSettingsMock(...args),
    testConnection: (...args: unknown[]) => testConnectionMock(...args),
    saveConnection: (...args: unknown[]) => saveConnectionMock(...args),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe("SettingsPage UI", () => {
  beforeEach(() => {
    localStorage.clear();
    getConnectionSettingsMock.mockReset();
    testConnectionMock.mockReset();
    saveConnectionMock.mockReset();
    toastMock.mockReset();
    getConnectionSettingsMock.mockResolvedValue(null);
  });

  it("renders all fields and version text", () => {
    renderSettingsPage();

    expect(screen.getByLabelText("Host")).toBeInTheDocument();
    expect(screen.getByLabelText("Port")).toBeInTheDocument();
    expect(screen.getByLabelText("Database Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    renderSettingsPage();

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput.type).toBe("password");
  });

  it("loads saved settings from api client on mount", async () => {
    getConnectionSettingsMock.mockResolvedValue({
      host: "persisted-host",
      port: 3306,
      database: "persisted_db",
      username: "persisted_user",
      password: "persisted_password",
    });

    renderSettingsPage();

    await waitFor(() => expect(getConnectionSettingsMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByLabelText("Host")).toHaveValue("persisted-host"),
    );
    expect(screen.getByLabelText("Port")).toHaveValue(3306);
    expect(screen.getByLabelText("Database Name")).toHaveValue("persisted_db");
    expect(screen.getByLabelText("Username")).toHaveValue("persisted_user");
    expect(screen.getByLabelText("Password")).toHaveValue("persisted_password");
  });

  it("calls testConnection and shows success feedback", async () => {
    testConnectionMock.mockResolvedValue({
      success: true,
      message: "Successfully connected",
    });

    renderSettingsPage();
    fireEvent.change(screen.getByLabelText("Port"), { target: { value: "5433" } });
    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    expect(screen.getByRole("button", { name: /testing/i })).toBeDisabled();

    await waitFor(() =>
      expect(testConnectionMock).toHaveBeenCalledWith({
        host: "localhost",
        port: 5433,
        database: "taskflow_db",
        username: "admin",
        password: "",
      }),
    );
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Connection successful",
          description: "Successfully connected",
        }),
      ),
    );
  });

  it("calls saveConnection and shows success feedback", async () => {
    renderSettingsPage();
    
    // Fill form
    fireEvent.change(screen.getByLabelText("Host"), { target: { value: "prod-db" } });
    fireEvent.change(screen.getByLabelText("Port"), { target: { value: "5432" } });
    fireEvent.change(screen.getByLabelText("Database Name"), { target: { value: "prod" } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();

    await waitFor(() =>
      expect(saveConnectionMock).toHaveBeenCalledWith({
        host: "prod-db",
        port: 5432,
        database: "prod",
        username: "admin",
        password: "secret",
      }),
    );
    
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Settings saved",
        }),
      ),
    );
  });

  it("handles test connection failure", async () => {
    testConnectionMock.mockRejectedValue(new Error("Network error"));
    renderSettingsPage();
    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Connection failed",
          description: "Network error",
          variant: "destructive",
        }),
      ),
    );
  });

  it("handles save failure", async () => {
    saveConnectionMock.mockRejectedValue(new Error("Persistence failed"));
    renderSettingsPage();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Save failed",
          description: "Persistence failed",
          variant: "destructive",
        }),
      ),
    );
  });

  it("validates required fields", async () => {
    renderSettingsPage();
    // Clear host
    fireEvent.change(screen.getByLabelText("Host"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(saveConnectionMock).not.toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing required fields",
        variant: "destructive",
      }),
    );
  });

  it("blocks save when port is invalid", async () => {
    renderSettingsPage();
    fireEvent.change(screen.getByLabelText("Port"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(saveConnectionMock).not.toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid port",
        variant: "destructive",
      }),
    );
  });
});
