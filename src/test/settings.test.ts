import { describe, expect, it, vi, beforeEach } from "vitest";

async function createClient() {
  localStorage.clear();
  vi.resetModules();
  const module = await import("../lib/api/adapters/mock");
  return new module.MockApiClient();
}

describe("Settings methods", () => {
  let client: Awaited<ReturnType<typeof createClient>>;

  beforeEach(async () => {
    client = await createClient();
  });

  it("testConnection returns success payload", async () => {
    const result = await client.testConnection({
      host: "db.example.com",
      port: 5432,
      database: "mydb",
      username: "user",
      password: "pass",
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain("db.example.com");
    expect(result.message).toContain("5432");
    expect(result.message).toContain("mydb");
  });

  it("saveConnection persists to localStorage", async () => {
    const settings = {
      host: "prod-db",
      port: 3306,
      database: "taskflow",
      username: "admin",
      password: "secret",
    };
    await client.saveConnection(settings);
    const stored = JSON.parse(localStorage.getItem("taskflow_connection") || "{}");
    expect(stored.host).toBe("prod-db");
    expect(stored.port).toBe(3306);
    expect(stored.database).toBe("taskflow");
  });
});
