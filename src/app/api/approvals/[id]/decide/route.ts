import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { hasPermission } from "@/lib/auth/rbac";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ status: z.enum(["APPROVED", "EDITED", "REJECTED", "EXECUTED"]), reason: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  if (!hasPermission(session.role, "approve_recommendations")) {
    return apiError("FORBIDDEN", "This role cannot decide on approval requests.", 403);
  }
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_INPUT", "A valid status is required.", 400);

  const existing = await prisma.approval.findFirst({ where: { id, organizationId: session.organizationId } });
  if (!existing) return apiError("NOT_FOUND", "Approval not found.", 404);

  const approval = await prisma.approval.update({
    where: { id },
    data: { status: parsed.data.status, reason: parsed.data.reason, decidedAt: new Date() },
  });

  await recordAudit({
    organizationId: session.organizationId,
    actor: session.email,
    userId: session.userId,
    action: "DECIDE_APPROVAL",
    entity: "Approval",
    entityId: id,
    previousValue: { status: existing.status },
    newValue: { status: approval.status },
    reason: parsed.data.reason,
  });

  return ok({ approval });
}
