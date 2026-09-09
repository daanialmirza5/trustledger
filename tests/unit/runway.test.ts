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
});
