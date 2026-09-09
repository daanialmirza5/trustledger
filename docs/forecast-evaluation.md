# Forecast Evaluation

Measured by `scripts/evaluate-forecast.ts` against the seeded "Nova Retail
Systems" dataset. Run it yourself: `npm run seed && npm run evaluate:forecast`
(numbers vary slightly by machine only insofar as the seed's deterministic
PRNG is respected — they should reproduce close to what's below).

## Method

Train on all transaction history up to a cutoff 60 days before the end of
the seeded dataset; forecast the held-out 60 days; compare the forecast's
`expected` cash trajectory against the actual realized cash trajectory for
each of those 60 days.

## Measured result (one run, 2026-09-09)

```
Training window: 343 days with activity, up to 2026-07-10
Holdout: 60 days (2026-07-10 -> 2026-09-08)
Cash at cutoff: ₹19,98,606.01
MAE:  ₹4,42,217.35
RMSE: ₹5,69,611.28
MAPE: 18.65%

Day  7 : predicted ₹21,74,167.50  actual ₹21,55,533.93  (off by ~0.9%)
Day 30 : predicted ₹27,03,459.18  actual ₹23,44,275.15  (off by ~15.3%)
Day 60 : predicted ₹35,62,558.58  actual ₹25,02,315.08  (off by ~42.4%)
```

## Interpretation

Short-horizon accuracy (≈1 week) is good — under 1% error. Accuracy
degrades substantially by day 60, consistent with the limitation documented
in `docs/forecasting.md`: the model can't see that receivables collection
was slowing down in the holdout window (that's a real pattern deliberately
built into the seed data), so it over-projects revenue growth using
whatever momentum was visible in the training window.

**This is a real, measured limitation, not a placeholder.** A 90-day
"expected" forecast in this app should be read as directionally useful over
the first 2-3 weeks and treated with more skepticism further out —
exactly why the dashboard also surfaces the lower/upper band and the
runway's "worst case" figure alongside "expected," instead of just one
number.

Not evaluated: forecast accuracy against real (non-synthetic) small-business
data, or accuracy of the day-of-week seasonal component in isolation.
