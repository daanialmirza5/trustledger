import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));
  const category = searchParams.get("category") ?? undefined;
  const anomaliesOnly = searchParams.get("anomaliesOnly") === "true";

  const where = {
    organizationId: session.organizationId,
    ...(category ? { category } : {}),
    ...(anomaliesOnly ? { isAnomaly: true } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return ok({ total, page, pageSize, transactions: rows });
}

const createSchema = z.object({
  accountId: z.string(),
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INFLOW", "OUTFLOW"]),
  cashFlowClass: z.enum(["OPERATING", "INVESTING", "FINANCING"]),
  category: z.string().min(1),
  counterpartyType: z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "OTHER"]),
  counterpartyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_TRANSACTION", parsed.error.issues[0]?.message ?? "Invalid transaction.", 400);
  if (parsed.data.amount <= 0) return apiError("INVALID_TRANSACTION", "Transaction amount must be greater than zero.", 400);

  const tx = await prisma.transaction.create({
    data: { ...parsed.data, date: new Date(parsed.data.date), organizationId: session.organizationId },
  });

  await recordAudit({
    organizationId: session.organizationId,
    actor: session.email,
    userId: session.userId,
    action: "CREATE_TRANSACTION",
    entity: "Transaction",
    entityId: tx.id,
    newValue: tx,
  });

  return ok({ transaction: tx }, 201);
}
