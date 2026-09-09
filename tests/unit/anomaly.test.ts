import { describe, it, expect } from "vitest";
import { detectAnomalies } from "@/lib/analytics/anomaly";
import type { TxRecord } from "@/lib/analytics/types";

function tx(id: string, amount: number, category = "Operations"): TxRecord {
  return {
    id,
    date: new Date("2026-01-01"),
    amount,
    type: "OUTFLOW",
    cashFlowClass: "OPERATING",
    category,
    counterpartyType: "SUPPLIER",
    counterpartyId: null,
    description: "test",
  };
}

describe("detectAnomalies", () => {
  it("flags an injected extreme value against a stable historical pattern", () => {
    // 12 normal transactions in a tight band, then one wildly out of range
    const normals = Array.from({ length: 12 }, (_, i) => tx(`n${i}`, 20000 + (i % 3) * 500));
    const injected = tx("anomaly-1", 150000);
    const anomalies = detectAnomalies([...normals, injected]);

    const found = anomalies.find((a) => a.transactionId === "anomaly-1");
    expect(found).toBeDefined();
    expect(found!.zScore).toBeGreaterThan(3);
  });

  it("does not flag anything within a low-variance category with too few samples", () => {
    const few = [tx("a", 1000), tx("b", 50000)];
    expect(detectAnomalies(few)).toHaveLength(0);
  });

  it("does not flag normal transactions within the historical band", () => {
    const normals = Array.from({ length: 15 }, (_, i) => tx(`n${i}`, 20000 + (i % 5) * 300));
    const anomalies = detectAnomalies(normals);
    expect(anomalies).toHaveLength(0);
  });
});
