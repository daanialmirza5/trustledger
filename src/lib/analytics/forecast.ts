import type { ForecastPoint } from "./types";

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  value: number; // net cash movement that day (can be negative)
}

/** A single known future cash event — an outstanding invoice or bill, not a model guess. */
export interface KnownObligation {
  date: string; // YYYY-MM-DD, expected cash date
  amount: number; // positive
  label: string;
}

export interface ObligationsInput {
  receivables?: KnownObligation[];
  payables?: KnownObligation[];
}

export interface ForecastRun {
  method: string;
  points: ForecastPoint[];
  // One-step-ahead backtest error over the training window — what the
  // confidence bands are actually derived from (see docs/forecasting.md).
  backtest: { mae: number; rmse: number; sampleSize: number };
}

/**
 * Holt's linear (double exponential smoothing) on cumulative cash, plus a
 * day-of-week seasonal index applied to the daily deltas. Chosen over a
 * single ARIMA/ML model because: (a) it's fully deterministic and
 * explainable to a non-technical business owner, (b) it needs no external
 * dependency, (c) with 12+ months of daily transaction data it captures
 * trend + weekly seasonality reasonably, which is the dominant pattern in
 * small-business cash flow. See docs/forecasting.md for the write-up and
 * docs/forecast-evaluation.md for measured backtest accuracy.
 */
export function forecastCashFlow(
  history: DailyPoint[],
  startingCash: number,
  horizonDays: number,
  obligations?: ObligationsInput,
  alpha = 0.12,
  beta = 0.05
): ForecastRun {
  if (history.length < 14) {
    throw new Error("forecastCashFlow requires at least 14 days of history");
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((p) => p.value);

  // Day-of-week seasonal index on the daily deltas (ratio to overall mean).
  const dowSums = new Array(7).fill(0);
  const dowCounts = new Array(7).fill(0);
  const overallMean = values.reduce((s, v) => s + v, 0) / values.length || 1;
  sorted.forEach((p) => {
    const dow = new Date(p.date + "T00:00:00Z").getUTCDay();
    dowSums[dow] += p.value;
    dowCounts[dow] += 1;
  });
  const dowIndex = dowSums.map((sum, i) =>
    dowCounts[i] ? sum / dowCounts[i] / overallMean : 1
  );
  const normalizeDenom = dowIndex.reduce((s, v) => s + v, 0) / 7 || 1;
  const seasonal = dowIndex.map((v) => v / normalizeDenom);

  // Holt's method fitted on the deseasonalized daily delta series, smoothed
  // with a trailing 7-day moving average first. Raw daily cash movement for
  // a small business is lumpy (a single large invoice payment can dominate a
  // day) rather than i.i.d. noise, so fitting trend/level directly on raw
  // values makes the random-walk confidence band (which scales with rmse)
  // blow up unrealistically. Smoothing first is a documented, deliberate
  // choice — see docs/forecasting.md and docs/forecast-evaluation.md.
  const rawDeseasonalized = sorted.map((p) => {
    const dow = new Date(p.date + "T00:00:00Z").getUTCDay();
    const factor = seasonal[dow] || 1;
    return factor !== 0 ? p.value / factor : p.value;
  });
  const smoothingWindow = 21;
  const deseasonalized = rawDeseasonalized.map((_, i) => {
    const windowStart = Math.max(0, i - smoothingWindow + 1);
    const slice = rawDeseasonalized.slice(windowStart, i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });

  let level = deseasonalized[0];
  let trend = deseasonalized[1] - deseasonalized[0];
  const fitted: number[] = [level];
  const residuals: number[] = [];

  for (let i = 1; i < deseasonalized.length; i++) {
    const forecastPrev = level + trend;
    residuals.push(deseasonalized[i] - forecastPrev);
    const prevLevel = level;
    level = alpha * deseasonalized[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(forecastPrev);
  }

  const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / residuals.length;
  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  const lastDate = new Date(sorted[sorted.length - 1].date + "T00:00:00Z");
  const points: ForecastPoint[] = [];
  let modelCumulative = startingCash;
  let adjustedCumulative = startingCash;

  // Known AR/AP events, bucketed by date. These come from actual open
  // invoices/bills (see obligations.ts) — not from the statistical model —
  // and are layered on top of the pure extrapolation below. There is no
  // double-counting risk: `history` only contains *realized* past cash
  // movement, so the model has no way to already represent unrealized
  // future collections/payments on its own.
  const receivablesByDate = new Map<string, number>();
  for (const o of obligations?.receivables ?? []) {
    receivablesByDate.set(o.date, (receivablesByDate.get(o.date) ?? 0) + o.amount);
  }
  const payablesByDate = new Map<string, number>();
  for (const o of obligations?.payables ?? []) {
    payablesByDate.set(o.date, (payablesByDate.get(o.date) ?? 0) + o.amount);
  }

  // Damped trend (Gardner & McKenzie): the trend's influence on any single
  // future day decays by `dampingPhi` per day out, instead of growing
  // linearly with h. Undamped linear extrapolation is well known to blow up
  // over multi-month horizons when the tail of the training window happens
  // to be sloped — exactly the failure mode a volatile SMB cash series hits.
  const dampingPhi = 0.95;

  for (let h = 1; h <= horizonDays; h++) {
    const date = new Date(lastDate);
    date.setUTCDate(date.getUTCDate() + h);
    const dow = date.getUTCDay();
    const dateKey = date.toISOString().slice(0, 10);
    const dampedTrend = trend * Math.pow(dampingPhi, h);
    const rawDelta = (level + dampedTrend) * (seasonal[dow] || 1);
    modelCumulative += rawDelta;

    const arInflow = receivablesByDate.get(dateKey) ?? 0;
    const apOutflow = payablesByDate.get(dateKey) ?? 0;
    adjustedCumulative += rawDelta + arInflow - apOutflow;

    // Random-walk-style widening band scaled by rmse and sqrt(horizon),
    // centered on the AR/AP-adjusted expectation.
    const band = rmse * Math.sqrt(h);
    points.push({
      date: dateKey,
      expected: round2(adjustedCumulative),
      lower: round2(adjustedCumulative - band),
      upper: round2(adjustedCumulative + band),
      modelExpected: round2(modelCumulative),
      knownReceivablesInflow: round2(arInflow),
      knownPayablesOutflow: round2(apOutflow),
    });
  }

  const hasObligations = (obligations?.receivables?.length ?? 0) + (obligations?.payables?.length ?? 0) > 0;

  return {
    method: hasObligations
      ? "damped-holt+day-of-week-seasonality+7d-smoothing+known-ar-ap"
      : "damped-holt+day-of-week-seasonality+7d-smoothing",
    points,
    backtest: { mae: round2(mae), rmse: round2(rmse), sampleSize: residuals.length },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
