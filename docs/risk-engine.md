# Risk Engine

Implementation: `src/lib/analytics/risk.ts`. Every score is a sum of named,
fixed-point impacts — there is no learned weighting and no LLM involved in
scoring. `RISK_THRESHOLDS` at the top of the file is the single place that
controls every cutoff; changing a number there changes scoring for everyone,
transparently.

## Categories

| Risk type      | Signal |
|---|---|
| LIQUIDITY      | Current cash runway in months; upcoming 7-day obligations vs. expected 7-day inflow |
| REVENUE        | Month-over-month revenue (cash collected) change |
| EXPENSE        | Month-over-month operating expense change |
| RECEIVABLES    | Share of outstanding receivables aged past 30 days |
| CONCENTRATION  | Top customer's share of revenue; top supplier's share of procurement |
| ANOMALY        | Count of open statistically-flagged anomalies |

`DEBT` from the original spec list is folded into LIQUIDITY here — this
prototype doesn't model a distinct loan/amortization schedule outside the
what-if simulator, so a standalone debt-risk score would have nothing to
compute from beyond what LIQUIDITY already covers.

## Score -> level

```
score >= 70  CRITICAL
score >= 45  HIGH
score >= 20  MODERATE
else         LOW
```

## Example

```json
{
  "riskType": "LIQUIDITY",
  "score": 50,
  "level": "HIGH",
  "factors": [
    { "factor": "Cash runway is only 1 months", "impact": 50 }
  ]
}
```

## Financial Health Score

Implementation: `src/lib/analytics/healthScore.ts`. Starts from a 50-point
baseline; nine independent factors (runway, revenue trend, expense trend,
margin, receivables aging, payables timeliness, customer concentration,
supplier concentration, cash-flow volatility) each add or subtract a fixed
number of points, clamped to 0-100. Every point swing is attributable to a
labeled factor returned alongside the score — there is no unexplained
residual.

This is intentionally a simple additive scorecard, not a trained model.
It has not been back-tested against real business outcomes (no ground
truth for "did this business actually fail" exists in a synthetic
dataset) — treat the score as a structured summary of the same six risk
categories above, not as a validated predictor.
