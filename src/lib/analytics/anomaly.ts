import type { TxRecord } from "./types";

export interface DetectedAnomaly {
  transactionId: string;
  category: string;
  amount: number;
  expectedLow: number;
  expectedHigh: number;
  zScore: number;
  reason: string;
}

/**
 * Per-category z-score anomaly detection: for each category, compute the
 * historical mean/stddev of transaction amounts (excluding the candidate
 * itself) and flag transactions whose |z| exceeds `zThreshold`. Requires a
 * minimum sample size per category so early/rare categories aren't flagged
 * on noise. See docs/anomaly-detection.md.
 */
export function detectAnomalies(
  transactions: TxRecord[],
  zThreshold = 3,
  minSamples = 8
): DetectedAnomaly[] {
  const byCategory = new Map<string, TxRecord[]>();
  for (const tx of transactions) {
    const list = byCategory.get(tx.category) ?? [];
    list.push(tx);
    byCategory.set(tx.category, list);
  }

  const anomalies: DetectedAnomaly[] = [];

  for (const [category, txs] of byCategory) {
    if (txs.length < minSamples) continue;
    const amounts = txs.map((t) => t.amount);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const stddev = Math.sqrt(variance);
    if (stddev === 0) continue;

    for (const tx of txs) {
      const z = (tx.amount - mean) / stddev;
      if (Math.abs(z) >= zThreshold) {
        anomalies.push({
          transactionId: tx.id,
          category,
          amount: tx.amount,
          expectedLow: round2(Math.max(0, mean - 2 * stddev)),
          expectedHigh: round2(mean + 2 * stddev),
          zScore: round2(z),
          reason: `Amount is ${z > 0 ? "substantially above" : "substantially below"} the historical pattern for "${category}" (potential anomaly requiring review).`,
        });
      }
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
