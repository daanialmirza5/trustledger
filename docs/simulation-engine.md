# What-If Simulation & Stress Testing

Implementation: `src/lib/analytics/simulation.ts` (what-if scenarios),
`src/lib/analytics/stress.ts` (stress test presets, built on the same
engine).

## Never mutates the ledger

```
Production Ledger (read-only) --> computeSnapshot --> BaselineSnapshot
                                                             |
                                                        runScenario(baseline, type, assumptions)
                                                             |
                                                      ScenarioProjection (pure function output)
```

`runScenario` takes a `BaselineSnapshot` (four numbers: monthly revenue,
monthly expenses, current cash, average monthly burn) and returns a
projection — it never writes to the database itself. The API route
(`POST /api/scenarios/[id]/run`) persists the *result* of that pure
function call as a `ScenarioResult` row for later comparison, but the
computation itself has no side effects and can be called as many times as
needed without any risk to the underlying ledger.

## Scenario types and their formulas

Each scenario type has a documented default assumption set
(`DEFAULTS` in `simulation.ts`) and a plain-language explanation returned in
`notes`, e.g. hiring two employees:

```
monthlyExpenseDelta = count * monthlyCostPerEmployee
monthlyRevenueDelta = baseline.monthlyRevenue * expectedRevenueUpliftPct
```

All eleven scenario types (`HIRE_EMPLOYEE`, `INCREASE_MARKETING`,
`PURCHASE_EQUIPMENT`, `TAKE_LOAN`, `INCREASE_PRICES`, `LOSE_TOP_CUSTOMER`,
`NEW_SUPPLIER_COST`, `EXTEND_CUSTOMER_TERMS`, `ACCELERATE_COLLECTIONS`,
`REDUCE_DISCRETIONARY_EXPENSES`, `DO_NOTHING`) follow the same shape: a
monthly revenue delta, a monthly expense delta, and/or a one-time cash
delta, all derived from the baseline with an explicit, visible assumption —
never a black-box adjustment.

**These are illustrative, not empirically calibrated assumptions** (e.g. "a
5% price increase costs you 2% of volume" is a plausible default, not a
measured elasticity for this business). The UI surfaces every assumption
used so it can be visually inspected and, in a future iteration, edited by
the user before running.

## Stress Lab

`stress.ts` reuses the same `runScenario` function for its six presets
(revenue -10%/-25%, lose top customer, supplier costs +20%, 30-day payment
delay, an unexpected one-time expense), then classifies the outcome's
liquidity impact (`LOW`/`MODERATE`/`HIGH`/`SEVERE`) purely from the
resulting projected runway relative to the baseline runway — no separate
scoring logic to keep in sync with the risk engine's thresholds.
