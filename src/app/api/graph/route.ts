import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";

export interface GraphNode {
  id: string;
  type: "BUSINESS" | "ACCOUNT" | "CUSTOMER" | "SUPPLIER";
  label: string;
  detail?: string;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);
  const orgId = session.organizationId;

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const accounts = await prisma.account.findMany({ where: { organizationId: orgId } });
  const transactions = await prisma.transaction.findMany({ where: { organizationId: orgId } });

  const customerTotals = new Map<string, number>();
  const supplierTotals = new Map<string, number>();
  for (const t of transactions) {
    if (!t.counterpartyId) continue;
    if (t.counterpartyType === "CUSTOMER") customerTotals.set(t.counterpartyId, (customerTotals.get(t.counterpartyId) ?? 0) + t.amount);
    if (t.counterpartyType === "SUPPLIER") supplierTotals.set(t.counterpartyId, (supplierTotals.get(t.counterpartyId) ?? 0) + t.amount);
  }

  const topCustomerIds = [...customerTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
  const topSupplierIds = [...supplierTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);

  const customers = await prisma.customer.findMany({ where: { id: { in: topCustomerIds } } });
  const suppliers = await prisma.supplier.findMany({ where: { id: { in: topSupplierIds } } });

  const nodes: GraphNode[] = [{ id: `org:${org.id}`, type: "BUSINESS", label: org.name }];
  const edges: GraphEdge[] = [];

  for (const a of accounts) {
    nodes.push({ id: `account:${a.id}`, type: "ACCOUNT", label: a.name, detail: `₹${a.openingBalance.toLocaleString("en-IN")} opening` });
    edges.push({ id: `e-org-${a.id}`, source: `org:${org.id}`, target: `account:${a.id}`, label: "OWNS" });
  }

  for (const c of customers) {
    const total = customerTotals.get(c.id) ?? 0;
    nodes.push({ id: `customer:${c.id}`, type: "CUSTOMER", label: c.name, detail: `₹${total.toLocaleString("en-IN")} paid` });
    edges.push({ id: `e-cust-${c.id}`, source: `customer:${c.id}`, target: `account:${accounts[0]?.id}`, label: "PAYS" });
  }

  for (const s of suppliers) {
    const total = supplierTotals.get(s.id) ?? 0;
    nodes.push({ id: `supplier:${s.id}`, type: "SUPPLIER", label: s.name, detail: `₹${total.toLocaleString("en-IN")} paid` });
    edges.push({ id: `e-sup-${s.id}`, source: `account:${accounts[0]?.id}`, target: `supplier:${s.id}`, label: "PAYS" });
  }

  return ok({ nodes, edges });
}
