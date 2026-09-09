import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const suppliers = await prisma.supplier.findMany({ where: { organizationId: session.organizationId } });
  const expenses = await prisma.expense.findMany({ where: { organizationId: session.organizationId } });

  const rows = suppliers.map((s) => {
    const supplierExpenses = expenses.filter((e) => e.supplierId === s.id);
    const outstanding = supplierExpenses.filter((e) => !e.paid).reduce((sum, e) => sum + e.amount, 0);
    const overdue = supplierExpenses.filter((e) => !e.paid && e.dueDate && e.dueDate < new Date()).reduce((sum, e) => sum + e.amount, 0);
    return { ...s, outstanding, overdue, billCount: supplierExpenses.length };
  });

  return ok({ suppliers: rows });
}
