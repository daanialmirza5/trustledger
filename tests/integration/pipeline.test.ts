import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Full chain: import -> normalize -> categorize -> ledger -> metrics ->
// risk -> AI insight -> audit event. Runs against a disposable SQLite file
// so it never touches the demo seed database.

const TEST_DB_PATH = path.join(process.cwd(), "prisma", "test-integration.db");
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
process.env.AUTH_SECRET = "test-secret";

let prisma: (typeof import("@/lib/db/client"))["prisma"];
let categorizeTransaction: (typeof import("@/lib/pipeline/categorize"))["categorizeTransaction"];
let findDuplicate: (typeof import("@/lib/pipeline/duplicates"))["findDuplicate"];
let computeSnapshot: (typeof import("@/lib/analytics/snapshot"))["computeSnapshot"];
let analyzeQuestion: (typeof import("@/lib/ai/orchestrator"))["analyzeQuestion"];
let recordAudit: (typeof import("@/lib/audit"))["recordAudit"];

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.rmSync(TEST_DB_PATH);
  execSync(`npx prisma db push --skip-generate --accept-data-loss`, {
    env: { ...process.env },
    stdio: "pipe",
  });

  ({ prisma } = await import("@/lib/db/client"));
  ({ categorizeTransaction } = await import("@/lib/pipeline/categorize"));
  ({ findDuplicate } = await import("@/lib/pipeline/duplicates"));
  ({ computeSnapshot } = await import("@/lib/analytics/snapshot"));
  ({ analyzeQuestion } = await import("@/lib/ai/orchestrator"));
  ({ recordAudit } = await import("@/lib/audit"));
}, 60000);

afterAll(async () => {
  await prisma.$disconnect();
  if (fs.existsSync(TEST_DB_PATH)) fs.rmSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + "-journal")) fs.rmSync(TEST_DB_PATH + "-journal");
});

describe("transaction -> ledger -> metrics -> risk -> insight -> audit pipeline", () => {
  it("carries a raw transaction all the way through to a grounded AI insight and an audit trail", async () => {
    const org = await prisma.organization.create({ data: { name: "Pipeline Test Co", currency: "INR" } });
    const account = await prisma.account.create({
      data: { organizationId: org.id, name: "Checking", type: "CHECKING", openingBalance: 100000 },
    });
    const customer = await prisma.customer.create({ data: { organizationId: org.id, name: "Test Customer" } });

    // Seed enough transaction history for computeSnapshot's forecaster to run (>=14 days).
    for (let i = 0; i < 20; i++) {
      const date = new Date(Date.now() - (30 - i) * 86400000);
      await prisma.transaction.create({
        data: {
          organizationId: org.id, accountId: account.id, date,
          description: "Payment received - Test Customer", amount: 20000, type: "INFLOW",
          cashFlowClass: "OPERATING", category: "Product Sales", counterpartyType: "CUSTOMER", counterpartyId: customer.id,
        },
      });
    }

    // 1. Raw fact -> normalization+categorization (rule engine, no category supplied).
    const rawDescription = "Invoice payment - Test Customer";
    const guess = categorizeTransaction(rawDescription);
    expect(guess.category).toBe("Product Sales");
    expect(guess.confidence).toBeGreaterThan(0);

    // 2. Duplicate detection — nothing matching this exact amount/description yet.
    const duplicate = await findDuplicate(org.id, { amount: 55555, date: new Date(), description: rawDescription });
    expect(duplicate).toBeNull();

    // 3. Ledger write.
    const tx = await prisma.transaction.create({
      data: {
        organizationId: org.id, accountId: account.id, date: new Date(),
        description: rawDescription, amount: 55555, type: "INFLOW", cashFlowClass: "OPERATING",
        category: guess.category, categorySource: "RULE", categoryConfidence: guess.confidence,
        counterpartyType: "CUSTOMER", counterpartyId: customer.id,
      },
    });
    expect(tx.id).toBeTruthy();

    // A second, identical transaction should now be flagged as a likely duplicate.
    const dup2 = await findDuplicate(org.id, { amount: 55555, date: new Date(), description: rawDescription });
    expect(dup2?.existingTransactionId).toBe(tx.id);

    // 4. Metrics + risk recalculation reflects the new transaction.
    const snapshot = await computeSnapshot(org.id);
    expect(snapshot.currentCash).toBeGreaterThan(100000);
    expect(snapshot.risks.length).toBeGreaterThan(0);

    // 5. AI insight generation, grounded in the snapshot facts, with evidence links persisted.
    const analysis = await analyzeQuestion(org.id, "Why did cash decline?");
    expect(analysis.provider).toBe("mock");
    expect(analysis.evidence.length).toBeGreaterThan(0);
    const insightRows = await prisma.aIInsight.findMany({ where: { organizationId: org.id } });
    expect(insightRows).toHaveLength(1);
    const evidenceRows = await prisma.evidenceLink.findMany({ where: { insightId: insightRows[0].id } });
    expect(evidenceRows.length).toBeGreaterThan(0);

    // 6. Audit event recorded for the ledger write.
    await recordAudit({
      organizationId: org.id, actor: "test@pipeline", action: "CREATE_TRANSACTION",
      entity: "Transaction", entityId: tx.id, newValue: tx,
    });
    const auditRows = await prisma.auditEvent.findMany({ where: { organizationId: org.id } });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].entityId).toBe(tx.id);
  });
});
