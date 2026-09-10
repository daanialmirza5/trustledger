import { test, expect } from "@playwright/test";

// Exercises real HTTP-level authorization on protected routes: no session
// -> 401, wrong role -> 403, correct role -> 200. Runs against the actual
// running server (see playwright.config.ts) rather than importing route
// handlers directly, since they depend on Next's request-scoped cookies().

test.describe("API authorization", () => {
  test("unauthenticated request to a protected route is rejected with 401", async ({ request }) => {
    const res = await request.get("/api/audit");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  test("unauthenticated request to the dashboard is rejected with 401", async ({ request }) => {
    const res = await request.get("/api/dashboard");
    expect(res.status()).toBe(401);
  });

  test("a role without view_audit permission is rejected with 403", async ({ request }) => {
    const login = await request.post("/api/auth/login", {
      data: { email: "analyst@novaretail.demo", password: "demo1234" },
    });
    expect(login.status()).toBe(200);

    const res = await request.get("/api/audit");
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  test("an authorized role can access the audit trail", async ({ request }) => {
    const login = await request.post("/api/auth/login", {
      data: { email: "owner@novaretail.demo", password: "demo1234" },
    });
    expect(login.status()).toBe(200);

    const res = await request.get("/api/audit");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
  });

  test("wrong password is rejected with 401, not 500", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "owner@novaretail.demo", password: "wrong-password" },
    });
    expect(res.status()).toBe(401);
  });
});
