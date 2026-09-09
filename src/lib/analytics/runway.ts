export interface RunwayResult {
  currentRunwayMonths: number | null; // null = burn is non-positive, i.e. not burning cash
  projectedRunwayMonths: number | null;
  worstCaseRunwayMonths: number | null;
}

/**
 * Runway = available cash / average net monthly burn. "Projected" refines
 * this using the forecast's expected 90-day trajectory instead of trailing
 * average burn; "worst case" uses the forecast's lower band.
 */
export function computeRunway(
  availableCash: number,
  avgMonthlyBurn: number,
  forecast90dExpectedDelta: number,
  forecast90dLowerDelta: number
): RunwayResult {
  const currentRunwayMonths = avgMonthlyBurn > 0 ? round1(availableCash / avgMonthlyBurn) : null;

  const projectedMonthlyBurn = -(forecast90dExpectedDelta / 3);
  const projectedRunwayMonths =
    projectedMonthlyBurn > 0 ? round1(availableCash / projectedMonthlyBurn) : null;

  const worstCaseMonthlyBurn = -(forecast90dLowerDelta / 3);
  const worstCaseRunwayMonths =
    worstCaseMonthlyBurn > 0 ? round1(availableCash / worstCaseMonthlyBurn) : null;

  return { currentRunwayMonths, projectedRunwayMonths, worstCaseRunwayMonths };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
