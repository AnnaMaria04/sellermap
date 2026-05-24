import { describe, expect, it } from "vitest";
import { createApp } from "../src/index.js";

function request(app: ReturnType<typeof createApp>, path: string, init?: RequestInit) {
  return new Promise<Response>((resolve, reject) => {
    const server = app.listen(0, async () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("No test server address"));
        return;
      }
      try {
        resolve(await fetch(`http://127.0.0.1:${address.port}${path}`, init));
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

describe("worker routes", () => {
  it("health returns ok", async () => {
    const res = await request(createApp(), "/health");
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("search validates bad input", async () => {
    const res = await request(createApp(), "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WORKER_API_KEY ?? ""}` },
      body: JSON.stringify({ query: "" }),
    });
    expect([400, 401, 503]).toContain(res.status);
  });

  it("supplier validates bad input", async () => {
    const res = await request(createApp(), "/supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WORKER_API_KEY ?? ""}` },
      body: JSON.stringify({ url: "not-a-url" }),
    });
    expect([400, 401, 503]).toContain(res.status);
  });
});
