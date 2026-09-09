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
});
