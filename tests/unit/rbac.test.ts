import { describe, it, expect } from "vitest";
import { hasPermission, type Permission } from "@/lib/auth/rbac";
import type { SessionPayload } from "@/lib/auth/session";

const ROLES: SessionPayload["role"][] = ["OWNER", "ACCOUNTANT", "ANALYST", "ADMIN"];
const PERMISSIONS: Permission[] = [
  "view_dashboard", "categorize_transactions", "approve_recommendations", "run_scenarios", "view_audit", "manage_organization",
];

describe("hasPermission", () => {
  it("every role can view the dashboard", () => {
    for (const role of ROLES) expect(hasPermission(role, "view_dashboard")).toBe(true);
  });

  it("only ADMIN can manage the organization", () => {
    expect(hasPermission("ADMIN", "manage_organization")).toBe(true);
    for (const role of ROLES.filter((r) => r !== "ADMIN")) {
      expect(hasPermission(role, "manage_organization")).toBe(false);
    }
  });

  it("ANALYST cannot categorize transactions, approve recommendations, or view the audit trail", () => {
    expect(hasPermission("ANALYST", "categorize_transactions")).toBe(false);
    expect(hasPermission("ANALYST", "approve_recommendations")).toBe(false);
    expect(hasPermission("ANALYST", "view_audit")).toBe(false);
  });

  it("ACCOUNTANT can categorize transactions and approve recommendations, but not manage the org", () => {
    expect(hasPermission("ACCOUNTANT", "categorize_transactions")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "approve_recommendations")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "manage_organization")).toBe(false);
  });

  it("OWNER can run scenarios and approve recommendations, but not categorize transactions", () => {
    expect(hasPermission("OWNER", "run_scenarios")).toBe(true);
    expect(hasPermission("OWNER", "approve_recommendations")).toBe(true);
    expect(hasPermission("OWNER", "categorize_transactions")).toBe(false);
  });

  it("never throws for any role/permission combination and always returns a boolean", () => {
    for (const role of ROLES) {
      for (const permission of PERMISSIONS) {
        expect(typeof hasPermission(role, permission)).toBe("boolean");
      }
    }
  });

  it("is deny-by-default for an unrecognized role", () => {
    expect(hasPermission("SOMETHING_ELSE" as SessionPayload["role"], "view_dashboard")).toBe(false);
  });
});
