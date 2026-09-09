import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  const { id } = await params;

  const scenario = await prisma.scenario.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { results: { orderBy: { computedAt: "desc" } } },
  });
  if (!scenario) return apiError("NOT_FOUND", "Scenario not found.", 404);
  return ok({ scenario });
}
