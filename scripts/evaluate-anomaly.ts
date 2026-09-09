// Anomaly detection evaluation against the known-injected anomalies recorded
// by scripts/seed.ts in scripts/seed-ground-truth.json. Run `npm run seed`
// first so that file exists and matches the current database.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { detectAnomalies } from "../src/lib/analytics/anomaly";

const prisma = new PrismaClient();

async function main() {
  const groundTruthPath = path.join(process.cwd(), "scripts", "seed-ground-truth.json");
  if (!fs.existsSync(groundTruthPath)) {
    console.error("scripts/seed-ground-truth.json not found — run `npm run seed` first.");
    process.exit(1);
  }
  const groundTruth: { organizationId: string; injectedAnomalyTransactionIds: string[] } = JSON.parse(
    fs.readFileSync(groundTruthPath, "utf8")
  );

  const allTx = await prisma.transaction.findMany({ where: { organizationId: groundTruth.organizationId } });
  const detected = detectAnomalies(allTx);
  const detectedIds = new Set(detected.map((a) => a.transactionId));
  const injectedIds = new Set(groundTruth.injectedAnomalyTransactionIds);

  const truePositives = [...injectedIds].filter((id) => detectedIds.has(id));
  const falseNegatives = [...injectedIds].filter((id) => !detectedIds.has(id));
  const falsePositives = [...detectedIds].filter((id) => !injectedIds.has(id));

  const precision = detectedIds.size > 0 ? truePositives.length / detectedIds.size : 0;
  const recall = injectedIds.size > 0 ? truePositives.length / injectedIds.size : 0;

  console.log(`Total transactions scanned: ${allTx.length}`);
  console.log(`Injected (known) anomalies: ${injectedIds.size}`);
  console.log(`Total flagged by detector: ${detectedIds.size}`);
  console.log(`True positives: ${truePositives.length}`);
  console.log(`False negatives (missed injected anomalies): ${falseNegatives.length}`);
  console.log(`False positives (flagged but not injected): ${falsePositives.length}`);
  console.log(`Precision: ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall: ${(recall * 100).toFixed(1)}%`);
  if (falseNegatives.length > 0) {
    const missed = allTx.filter((t) => falseNegatives.includes(t.id));
    console.log("Missed:", missed.map((t) => ({ id: t.id, category: t.category, amount: t.amount, date: t.date.toISOString().slice(0, 10) })));
  }
}

main().finally(() => prisma.$disconnect());
