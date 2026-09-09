# Cash-Flow Forecasting

Implementation: `src/lib/analytics/forecast.ts`. Measured accuracy:
`docs/forecast-evaluation.md` (don't take the method description below as a
claim of accuracy — read that file for the actual numbers).

## Method

1. **Daily net cash series.** Every transaction's signed amount is bucketed
   by calendar day (`dailyNetSeries` in `cashflow.ts`).
2. **Day-of-week seasonality.** A small business's cash movement has a
   weekly rhythm (e.g. more supplier payments issued early in the week). A
   seasonal index per weekday is computed as that weekday's mean net flow
   divided by the overall mean, normalized so the seven indices average to 1.
3. **7-day trailing smoothing.** Raw daily deltas are lumpy — one big
   invoice payment can dominate a day — so trend/level fitting runs on a
   7-day trailing average of the deseasonalized series, not the raw values.
   Skipping this step made the forecast's confidence band (see below) blow
   up to unrealistic magnitudes in testing against the seeded dataset.
4. **Damped Holt's linear method** fits level + trend on the smoothed
   series. The trend's contribution to any future day decays by a factor of
   0.95 per day out (`dampingPhi`), rather than growing linearly with the
   horizon. Undamped linear extrapolation is a known failure mode over
   multi-month horizons — if the last few days of history happen to be
   sloped, projecting that slope 90 days out compounds into an absurd
   number. This was observed directly during development (see the commit
   history / evaluation numbers) before damping was added.
5. **Confidence bands** are `expected ± rmse * sqrt(h)`, where `rmse` is the
   *actual* one-step-ahead residual measured while fitting the smoothed
   training series (a real random-walk-style growing band, not an invented
   percentage).

## Why not ARIMA / Prophet / an ML model

Chosen requirements were: (a) fully explainable to a non-technical business
owner, (b) zero external dependency, (c) works with 12+ months of daily
transaction data without a training pipeline. Holt's method with a
seasonal adjustment satisfies all three. It is not claimed to be more
accurate than a proper time-series library — `docs/forecast-evaluation.md`
reports where it does and doesn't hold up.

## Known limitation: no visibility into pending AR/AP

The forecast extrapolates from *historical realized cash movement* alone.
It does not know that an invoice issued last week, not yet paid, will
likely convert to cash in ~30 days — that knowledge lives in
`computeReceivables`/`computePayables`, not in the forecaster. Near the end
of the observed history this makes the forecast look more pessimistic than
a business with a healthy receivables pipeline actually is. Combining the
two (a forecast that also ages in known open AR/AP) is a natural next step,
not implemented here.
