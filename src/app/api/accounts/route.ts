import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  const accounts = await prisma.account.findMany({ where: { organizationId: session.organizationId } });
  return ok({ accounts });
}
