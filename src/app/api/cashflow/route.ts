import { getSessionUser } from "@/lib/auth/server";
import { computeSnapshot } from "@/lib/analytics/snapshot";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const snapshot = await computeSnapshot(session.organizationId);
  return ok({
    cashFlow30d: snapshot.cashFlow30d,
    receivables: snapshot.receivables,
    payables: snapshot.payables,
    customerConcentration: snapshot.customerConcentration,
    supplierConcentration: snapshot.supplierConcentration,
  });
}
