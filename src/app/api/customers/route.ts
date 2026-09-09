import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { computeReceivables } from "@/lib/analytics/receivables";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const customers = await prisma.customer.findMany({ where: { organizationId: session.organizationId } });
  const invoices = await prisma.invoice.findMany({ where: { organizationId: session.organizationId }, include: { customer: true } });
  const receivables = computeReceivables(
    invoices.map((i) => ({
      id: i.id, customerId: i.customerId, customerName: i.customer.name, invoiceNumber: i.invoiceNumber,
      issueDate: i.issueDate, dueDate: i.dueDate, amount: i.amount, paidAmount: i.paidAmount,
    })),
    new Date()
  );

  const byId = new Map(receivables.byCustomer.map((c) => [c.customerId, c]));
  const rows = customers.map((c) => ({
    ...c,
    outstanding: byId.get(c.id)?.outstanding ?? 0,
    daysOverdue: byId.get(c.id)?.daysOverdue ?? 0,
    risk: byId.get(c.id)?.risk ?? "LOW",
  }));

  return ok({ customers: rows });
}
