# Anomaly Detection

Implementation: `src/lib/analytics/anomaly.ts`. Measured results:
`docs/evaluation.md`.

## Method

Per-category z-score. For each transaction category with at least
`minSamples` (default 8) historical transactions, compute the mean and
standard deviation of amounts in that category, then flag any transaction
whose `|z| >= zThreshold` (default 3). Categories with fewer than
`minSamples` transactions are skipped entirely rather than flagged on noise
— a category that's only been used twice has no meaningful "normal range"
yet.

`computeSnapshot` runs detection against the *full* transaction history for
each organization (not just a recent window) before filtering results down
to a recent display window, specifically so low-frequency categories (rent,
insurance — roughly monthly) still accumulate enough samples for a
statistically meaningful mean/stddev. Running detection only against a
90-day window was tried first and under-flagged monthly-cadence categories
for exactly this reason.

## Why z-score and not an ML anomaly detector

Small businesses generate far too little per-category data for a trained
model to be reliable, and a z-score threshold is directly explainable to a
non-technical business owner ("this is 4 standard deviations above what
we've historically spent on Utilities"), which the product's evidence-first
principle requires.

## Output framing

Detected transactions are labeled "potential anomaly requiring review," per
the product's fintech safety boundary — never "fraud" or "error." A
statistical outlier is not evidence of wrongdoing; it's evidence that a
human should look at it.
