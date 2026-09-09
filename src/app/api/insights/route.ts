import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const insights = await prisma.aIInsight.findMany({
    where: { organizationId: session.organizationId },
    include: { evidenceLinks: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ insights });
}
