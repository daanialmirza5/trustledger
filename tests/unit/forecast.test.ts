import { describe, it, expect } from "vitest";
import { forecastCashFlow, type DailyPoint } from "@/lib/analytics/forecast";

function buildHistory(days: number, dailyValue: (i: number) => number): DailyPoint[] {
  const start = new Date("2026-01-01T00:00:00Z");
  const points: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    points.push({ date: d.toISOString().slice(0, 10), value: dailyValue(i) });
  }
  return points;
}

describe("forecastCashFlow", () => {
  it("throws with insufficient history", () => {
    expect(() => forecastCashFlow(buildHistory(5, () => 100), 1000, 30)).toThrow();
  });

  it("projects a flat series forward near the same level", () => {
    const history = buildHistory(60, () => 1000); // constant +1000/day
    const result = forecastCashFlow(history, 0, 30);
    expect(result.points).toHaveLength(30);
    // starting cash 0 + roughly 1000/day * 30 days
    expect(result.points[29].expected).toBeGreaterThan(20000);
    expect(result.points[29].expected).toBeLessThan(40000);
  });

  it("produces widening confidence bands over the horizon", () => {
    const history = buildHistory(60, (i) => 1000 + (i % 7 === 0 ? 500 : -100));
    const result = forecastCashFlow(history, 0, 30);
    const band5 = result.points[4].upper - result.points[4].lower;
    const band29 = result.points[29].upper - result.points[29].lower;
    expect(band29).toBeGreaterThanOrEqual(band5);
  });

  it("reports a non-negative backtest error", () => {
    const history = buildHistory(30, (i) => 500 + i * 10);
    const result = forecastCashFlow(history, 0, 14);
    expect(result.backtest.mae).toBeGreaterThanOrEqual(0);
    expect(result.backtest.rmse).toBeGreaterThanOrEqual(0);
    expect(result.backtest.sampleSize).toBe(29);
  });

  it("with no obligations, expected equals modelExpected on every point", () => {
    const history = buildHistory(30, () => 1000);
    const result = forecastCashFlow(history, 0, 10);
    for (const p of result.points) {
      expect(p.expected).toBe(p.modelExpected);
      expect(p.knownReceivablesInflow).toBe(0);
      expect(p.knownPayablesOutflow).toBe(0);
    }
    expect(result.method).not.toContain("known-ar-ap");
  });

  it("layers a known receivable on top of the model extrapolation on its expected date, without altering other days", () => {
    const history = buildHistory(30, () => 1000);
    const target = buildHistory(31, () => 1000)[30].date; // day 1 of the forecast horizon
    const result = forecastCashFlow(history, 0, 10, { receivables: [{ date: target, amount: 50000, label: "test invoice" }] });

    const day1 = result.points[0];
    expect(day1.date).toBe(target);
    expect(day1.knownReceivablesInflow).toBe(50000);
    expect(day1.expected).toBeCloseTo(day1.modelExpected + 50000, 0);

    // The 50000 bump is a one-time inflow but it stays in the cumulative cash
    // balance going forward — day 2's expected should still be ~50000 above
    // its own model-only baseline, with no *new* inflow that day.
    const day2 = result.points[1];
    expect(day2.knownReceivablesInflow).toBe(0);
    expect(day2.expected).toBeCloseTo(day2.modelExpected + 50000, 0);
    expect(result.method).toContain("known-ar-ap");
  });

  it("layers a known payable as a reduction on its expected date", () => {
    const history = buildHistory(30, () => 1000);
    const target = buildHistory(31, () => 1000)[30].date;
    const result = forecastCashFlow(history, 0, 10, { payables: [{ date: target, amount: 20000, label: "test bill" }] });

    const day1 = result.points[0];
    expect(day1.knownPayablesOutflow).toBe(20000);
    expect(day1.expected).toBeCloseTo(day1.modelExpected - 20000, 0);
  });
});
