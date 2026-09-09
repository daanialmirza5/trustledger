import { describe, it, expect } from "vitest";
import { computeCashFlow, dailyNetSeries } from "@/lib/analytics/cashflow";
import type { TxRecord } from "@/lib/analytics/types";

function tx(overrides: Partial<TxRecord>): TxRecord {
  return {
    id: "t1",
    date: new Date("2026-01-05"),
    amount: 1000,
    type: "INFLOW",
    cashFlowClass: "OPERATING",
    category: "Sales",
    counterpartyType: "CUSTOMER",
    counterpartyId: null,
    description: "test",
    ...overrides,
  };
}

describe("computeCashFlow", () => {
  it("adds inflows and subtracts outflows within the window, by class", () => {
    const txs: TxRecord[] = [
      tx({ id: "1", amount: 5000, type: "INFLOW", cashFlowClass: "OPERATING" }),
      tx({ id: "2", amount: 2000, type: "OUTFLOW", cashFlowClass: "OPERATING" }),
      tx({ id: "3", amount: 1000, type: "OUTFLOW", cashFlowClass: "INVESTING" }),
      tx({ id: "4", amount: 3000, type: "INFLOW", cashFlowClass: "FINANCING" }),
      // outside window — must be excluded
      tx({ id: "5", amount: 999999, date: new Date("2026-03-01") }),
    ];

    const result = computeCashFlow(txs, 10000, new Date("2026-01-01"), new Date("2026-01-31"));

    expect(result.opening).toBe(10000);
    expect(result.inflows.operating).toBe(5000);
    expect(result.inflows.financing).toBe(3000);
    expect(result.outflows.operating).toBe(2000);
    expect(result.outflows.investing).toBe(1000);
    expect(result.netChange).toBe(5000);
    expect(result.closing).toBe(15000);
  });

  it("excludes transactions outside the date window entirely", () => {
    const txs = [tx({ amount: 100000, date: new Date("2025-01-01") })];
    const result = computeCashFlow(txs, 0, new Date("2026-01-01"), new Date("2026-01-31"));
    expect(result.closing).toBe(0);
  });
});

describe("dailyNetSeries", () => {
  it("nets inflows and outflows per calendar day", () => {
    const txs: TxRecord[] = [
      tx({ id: "1", date: new Date("2026-01-05T00:00:00Z"), amount: 500, type: "INFLOW" }),
      tx({ id: "2", date: new Date("2026-01-05T12:00:00Z"), amount: 200, type: "OUTFLOW" }),
    ];
    const series = dailyNetSeries(txs);
    expect(series.get("2026-01-05")).toBe(300);
  });
});
