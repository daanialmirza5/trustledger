export interface RunwayResult {
  currentRunwayMonths: number | null; // null = burn is non-positive, i.e. not burning cash
  projectedRunwayMonths: number | null;
  worstCaseRunwayMonths: number | null;
}

// A runway figure above this is reported as capped rather than an
// enormous or effectively-infinite number — "1200 months" is not a
// meaningful distinction from "600 months" to a business owner, and an
// extremely small positive burn (near-zero) can otherwise produce a
// division result close to Infinity.
const MAX_REPORTABLE_MONTHS = 600; // 50 years

/**
 * Runway = available cash / average net monthly burn. "Projected" refines
 * this using the forecast's expected 90-day trajectory instead of trailing
 * average burn; "worst case" uses the forecast's lower band.
 *
 * Edge cases handled explicitly (never NaN/Infinity/undefined to the UI):
 * - non-finite or missing inputs -> null (treated as "not burning cash")
 * - negative available cash with positive burn -> 0 months (already out of
 *   runway, not a negative number of months)
 * - burn near zero -> capped at MAX_REPORTABLE_MONTHS, not left unbounded
 */
export function computeRunway(
  availableCash: number,
  avgMonthlyBurn: number,
  forecast90dExpectedDelta: number,
  forecast90dLowerDelta: number
): RunwayResult {
  return {
    currentRunwayMonths: runwayFor(availableCash, avgMonthlyBurn),
    projectedRunwayMonths: runwayFor(availableCash, -(forecast90dExpectedDelta / 3)),
    worstCaseRunwayMonths: runwayFor(availableCash, -(forecast90dLowerDelta / 3)),
  };
}

function runwayFor(availableCash: number, monthlyBurn: number): number | null {
  if (!Number.isFinite(availableCash) || !Number.isFinite(monthlyBurn)) return null;
  if (monthlyBurn <= 0) return null; // flat or net-positive cash flow — not burning
  const months = Math.max(0, availableCash) / monthlyBurn;
  return round1(Math.min(months, MAX_REPORTABLE_MONTHS));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
