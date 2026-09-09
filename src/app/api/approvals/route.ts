import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { hasPermission } from "@/lib/auth/rbac";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  const approvals = await prisma.approval.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return ok({ approvals });
}

const schema = z.object({ action: z.string().min(1), insightId: z.string().optional(), reason: z.string().optional() });

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  if (!hasPermission(session.role, "approve_recommendations")) {
    return apiError("FORBIDDEN", "This role cannot create approval requests.", 403);
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_INPUT", "An action is required.", 400);

  const approval = await prisma.approval.create({
    data: { organizationId: session.organizationId, userId: session.userId, ...parsed.data, status: "SUGGESTED" },
  });
  return ok({ approval }, 201);
}
