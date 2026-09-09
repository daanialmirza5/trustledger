import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/server";
import { ok, apiError } from "@/lib/api/respond";
import { categorizeTransaction } from "@/lib/pipeline/categorize";
import { findDuplicate } from "@/lib/pipeline/duplicates";
import { recordAudit } from "@/lib/audit";

const rowSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amount: z.coerce.number(),
  type: z.enum(["INFLOW", "OUTFLOW"]),
  category: z.string().optional(),
  counterpartyType: z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "OTHER"]).optional(),
});

const bodySchema = z.object({
  accountId: z.string(),
  rows: z.array(rowSchema).optional(),
  csv: z.string().optional(),
});

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return apiError("UNAUTHENTICATED", "Not logged in.", 401);

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return apiError("INVALID_IMPORT", "Provide an accountId and either rows or csv.", 400);

  const account = await prisma.account.findFirst({ where: { id: body.data.accountId, organizationId: session.organizationId } });
  if (!account) return apiError("INVALID_ACCOUNT", "Account not found for this organization.", 400);

  let rawRows: Record<string, unknown>[] = [];
  if (body.data.csv) {
    rawRows = parseCsv(body.data.csv);
  } else if (body.data.rows) {
    rawRows = body.data.rows;
  }
  if (rawRows.length === 0) return apiError("INVALID_IMPORT", "No rows to import.", 400);

  const imported: string[] = [];
  const flaggedDuplicates: { row: number; existingTransactionId: string; reason: string }[] = [];
  const rejected: { row: number; reason: string }[] = [];
  const categorized: { row: number; category: string; confidence: number }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const parsedRow = rowSchema.safeParse(rawRows[i]);
    if (!parsedRow.success) {
      rejected.push({ row: i, reason: parsedRow.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const row = parsedRow.data;
    if (!(row.amount > 0)) {
      rejected.push({ row: i, reason: "Transaction amount must be greater than zero." });
      continue;
    }
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) {
      rejected.push({ row: i, reason: "Unparseable date." });
      continue;
    }

    // Categorization: use the provided category if present, otherwise the
    // rule engine's best guess (never an unvalidated LLM rewrite — see spec §11).
    const guess = categorizeTransaction(row.description);
    const category = row.category?.trim() || guess.category;
    const categorySource = row.category?.trim() ? "HUMAN" : "RULE";
    categorized.push({ row: i, category, confidence: row.category?.trim() ? 1 : guess.confidence });

    const duplicate = await findDuplicate(session.organizationId, { amount: row.amount, date, description: row.description });
    if (duplicate) {
      flaggedDuplicates.push({ row: i, existingTransactionId: duplicate.existingTransactionId, reason: duplicate.reason });
    }

    const tx = await prisma.transaction.create({
      data: {
        organizationId: session.organizationId,
        accountId: account.id,
        date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        cashFlowClass: guess.cashFlowClass,
        category,
        categorySource,
        categoryConfidence: row.category?.trim() ? 1 : guess.confidence,
        counterpartyType: row.counterpartyType ?? "OTHER",
        isDuplicateOf: duplicate?.existingTransactionId,
      },
    });
    imported.push(tx.id);
  }

  await recordAudit({
    organizationId: session.organizationId,
    actor: session.email,
    userId: session.userId,
    action: "IMPORT_TRANSACTIONS",
    entity: "Transaction",
    entityId: account.id,
    newValue: { importedCount: imported.length, rejectedCount: rejected.length, duplicateCount: flaggedDuplicates.length },
  });

  return ok({
    importedCount: imported.length,
    rejected,
    flaggedDuplicates,
    categorized,
  });
}
