import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { hasPermission } from "@/lib/auth/rbac";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  if (!hasPermission(session.role, "view_audit")) return apiError("FORBIDDEN", "This role cannot view the audit trail.", 403);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));

  const [total, events] = await Promise.all([
    prisma.auditEvent.count({ where: { organizationId: session.organizationId } }),
    prisma.auditEvent.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return ok({ total, page, pageSize, events });
}
