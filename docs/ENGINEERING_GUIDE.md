# TrustLedger — Engineering Guide & Mastery Document

## 1. What Is TrustLedger?
TrustLedger is a **decision-support financial intelligence and cash flow simulation platform** built for small and medium businesses (SMBs). It enforces strict double-entry bookkeeping invariants, models future cash runway trajectories under custom operational scenarios, detects transaction anomalies and revenue leakage, and provides grounded AI financial analysis.

*Disclaimer: TrustLedger is a decision-support prototype operating on synthetic data.*

## 2. Real-World Problem Solved
1. **Cash Flow Blindspots**: SMBs frequently fail not from lack of profitability, but from unpredicted working capital and cash runway exhaustion.
2. **Double-Entry Errors**: Basic invoicing apps allow unbacked ledger mutations, violating fundamental accounting balance equations.
3. **Hidden Revenue Anomalies**: Duplicate billings, unexpected supplier price surges, and recurring subscription leakage go unnoticed.
4. **Hallucinated Financial AI**: Generic LLMs make mathematically unsound financial projections unless constrained by strict transactional ledger data.

## 3. High-Level Architecture
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts for financial waterfall charts and cash runway curves.
- **Backend & Data**: Prisma ORM with SQLite (local) / PostgreSQL (production), Next.js Server Actions and API Route handlers.
- **Core Financial Engines**:
  - `src/domain/ledger-engine.ts`: Double-entry accounting validator enforcing debits equal credits across all journal entries.
  - `src/domain/cashflow-simulator.ts`: Rolling cash projection model with scenario toggles.
  - `src/domain/anomaly-detector.ts`: Statistical anomaly detection for transaction outliers and margin contractions.
  - `src/domain/risk-engine.ts`: Altman Z-score and working capital liquidity health scoring.
- **AI Financial Advisor**: Context-injected financial commentary grounded in deterministic ledger balances.
- **Testing**: Vitest unit/integration suite + Playwright E2E tests.

## 4. Algorithmic Complexity & Financial Formulations
- **Double-Entry Balance Verification**: O(E) validation checking zero-sum invariant per transaction block.
- **Cash Runway Forecast**: Discrete daily simulation over 30, 90, 180 day horizons.
- **Anomaly Scoring**: Modified Z-score using Median Absolute Deviation (MAD) to detect transaction anomalies robust to extreme outliers.

## 5. Security & Financial Integrity
- Immutable journal entry ledger: Transactions cannot be edited in place; corrections require compensating reversal entries.
- Decimal precision arithmetic (avoiding floating point roundoff errors in currency math).
- Scoped multi-tenant company isolation.

## 6. Testing Strategy
- Vitest tests asserting double-entry ledger balance conservation, cash runway simulation curves, anomaly alert triggers, and risk score boundaries.
