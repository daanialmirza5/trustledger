import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  const { id } = await params;

  const customer = await prisma.customer.findFirst({ where: { id, organizationId: session.organizationId } });
  if (!customer) return apiError("NOT_FOUND", "Customer not found.", 404);

  const invoices = await prisma.invoice.findMany({ where: { customerId: id }, orderBy: { issueDate: "desc" } });
  const transactions = await prisma.transaction.findMany({
    where: { organizationId: session.organizationId, counterpartyType: "CUSTOMER", counterpartyId: id },
    orderBy: { date: "desc" },
    take: 50,
  });

  return ok({ customer, invoices, transactions });
}
