import type { SessionPayload } from "./session";

export type Permission =
  | "view_dashboard"
  | "categorize_transactions"
  | "approve_recommendations"
  | "run_scenarios"
  | "view_audit"
  | "manage_organization";

const ROLE_PERMISSIONS: Record<SessionPayload["role"], Permission[]> = {
  OWNER: ["view_dashboard", "run_scenarios", "approve_recommendations", "view_audit"],
  ACCOUNTANT: ["view_dashboard", "categorize_transactions", "approve_recommendations", "view_audit"],
  ANALYST: ["view_dashboard", "run_scenarios"],
  ADMIN: ["view_dashboard", "view_audit", "manage_organization", "approve_recommendations", "run_scenarios", "categorize_transactions"],
};

export function hasPermission(role: SessionPayload["role"], permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
