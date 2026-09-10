import { describe, it, expect } from "vitest";
import { computeRunway } from "@/lib/analytics/runway";

describe("computeRunway", () => {
  it("divides available cash by average monthly burn", () => {
    const r = computeRunway(100000, 20000, -20000, -30000);
    expect(r.currentRunwayMonths).toBe(5);
  });

  it("returns null runway when not burning cash", () => {
    const r = computeRunway(100000, 0, 5000, 1000);
    expect(r.currentRunwayMonths).toBeNull();
    expect(r.projectedRunwayMonths).toBeNull();
  });

  it("computes projected and worst-case runway from forecast deltas", () => {
    // 90-day expected delta of -30000 => monthly burn 10000 => runway 10
    const r = computeRunway(100000, 20000, -30000, -90000);
    expect(r.projectedRunwayMonths).toBe(10);
    // worst-case monthly burn 30000 => runway ~3.3
    expect(r.worstCaseRunwayMonths).toBeCloseTo(3.3, 1);
  });

  it("never returns a negative runway when cash is already negative", () => {
    const r = computeRunway(-50000, 10000, -10000, -10000);
    expect(r.currentRunwayMonths).toBe(0);
    expect(r.currentRunwayMonths).not.toBeLessThan(0);
  });

  it("treats zero cash the same as any other non-negative balance", () => {
    const r = computeRunway(0, 10000, -10000, -10000);
    expect(r.currentRunwayMonths).toBe(0);
  });

  it("caps an extremely long runway instead of returning an unbounded number", () => {
    const r = computeRunway(1_000_000, 1, -1, -1); // burn of ₹1/month
    expect(r.currentRunwayMonths).toBeLessThanOrEqual(600);
    expect(Number.isFinite(r.currentRunwayMonths)).toBe(true);
  });

  it("never returns NaN or Infinity for non-finite inputs", () => {
    const r = computeRunway(NaN, 10000, Infinity, -Infinity);
    expect(r.currentRunwayMonths).toBeNull();
    expect(r.projectedRunwayMonths).toBeNull();
    expect(r.worstCaseRunwayMonths).toBeNull();
  });

  it("treats net-positive cash flow (negative burn) as no runway limit, not a negative one", () => {
    const r = computeRunway(50000, -20000, 20000, 20000);
    expect(r.currentRunwayMonths).toBeNull();
    expect(r.projectedRunwayMonths).toBeNull();
    expect(r.worstCaseRunwayMonths).toBeNull();
  });
});
