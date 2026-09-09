import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  return ok({ user });
}
