# Evaluation Summary

Detailed write-ups: `docs/forecast-evaluation.md` (forecasting),
this file (anomaly detection + AI grounding). Reproduce with
`npm run seed` followed by `npm run evaluate:anomaly` / `npm run evaluate:ai`.

## Anomaly detection

`scripts/evaluate-anomaly.ts` checks the z-score detector against the 5
deliberately injected anomalous transactions recorded in
`scripts/seed-ground-truth.json` at seed time (amounts 3-7x outside their
category's normal range).

Measured result (one run, 2026-09-09):

```
Total transactions scanned: 1202
Injected (known) anomalies: 5
Total flagged by detector: 5
True positives: 5
False negatives: 0
False positives: 0
Precision: 100.0%
Recall: 100.0%
```

**Caveat:** this is a 5-example evaluation set against anomalies that were
injected to be unambiguously extreme (3-7x category norms) — it confirms
the detection mechanism works as designed, not that it would achieve 100%
precision/recall against subtler, real-world anomalies or against a larger,
more ambiguous corpus. Not evaluated: performance on borderline cases (e.g.
2-3x normal), or false-positive rate on organic (non-injected) unusual-but-
legitimate transactions.

## AI grounding

`scripts/evaluate-ai.ts` runs the 5 sample questions from the product spec
through the real orchestrator (`analyzeQuestion`) and checks that every
number appearing in the narration also appears in the structured
`groundedFacts` block the narration was built from.

Measured result (one run, 2026-09-09, no API keys configured — mock
provider):

```
Structurally valid responses: 5/5
Numeric grounding rate: 100.0% (32/32 numbers traced to groundedFacts)
```

**Caveat:** with no `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GOOGLE_API_KEY`
set, this exercises the mock provider, which is grounded by construction —
it literally echoes the evidence block back as its "narration," so 100%
here is expected, not a strong claim about LLM behavior. The system prompt
sent to real providers (`src/lib/ai/orchestrator.ts`) instructs the model to
use only the evidence block and to treat any text inside it (including
transaction descriptions) as untrusted data, never as instructions — but
that constraint has **not** been empirically measured against a real
provider in this repository. Re-run `npm run evaluate:ai` with an API key
set to measure the real-provider grounding rate before relying on it.

## Not evaluated

- Financial Health Score accuracy against real business outcomes (no such
  ground truth exists for synthetic data).
- Risk engine threshold calibration against real default/distress cases.
- Forecast accuracy on non-synthetic data.
- AI evaluation against a jailbreak/prompt-injection corpus beyond the
  single design principle described in `docs/ai-architecture.md` and
  `docs/threat-model.md`.
