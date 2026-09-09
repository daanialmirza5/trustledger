# Financial Domain Model

See `prisma/schema.prisma` for the authoritative field list. This document
explains the relationships and the modeling decisions that aren't obvious
from the schema alone.

## Entities

```
Organization ─┬─ User (role: OWNER | ACCOUNTANT | ANALYST | ADMIN)
              ├─ Account (CHECKING | SAVINGS | CASH, openingBalance)
              ├─ Customer ─── Invoice ─── InvoicePayment
              ├─ Supplier ─── Expense
              ├─ Transaction  (the ledger)
              ├─ RecurringExpense (template only — materialized into
              │                    Transaction rows at seed time, not
              │                    projected forward at query time)
              ├─ FinancialMetric / Forecast / RiskAssessment / Anomaly
              ├─ Scenario ─── ScenarioResult
              ├─ AIInsight ─── EvidenceLink
              ├─ Approval
              └─ AuditEvent
```

## Transaction: the one row every screen ultimately reads

A `Transaction` carries both the *raw fact* (date, amount, description) and
the system's *classification* of it (`category`, `cashFlowClass`,
`categorySource`, `categoryConfidence`) on one row. That's a deliberate
simplification for this prototype's scale — a production ledger would
likely split "what a bank statement says" from "how we've categorized it"
into separate tables so re-categorization never touches the raw import. The
distinction is preserved *logically* here (never overwrite `description`;
only `category`/`cashFlowClass`/`categorySource` change on correction) even
though it isn't a separate table.

`counterpartyId` is a polymorphic reference (a `Customer.id` or
`Supplier.id` depending on `counterpartyType`) with no database-level
foreign key, because SQLite/Postgres foreign keys can't point at "whichever
table `counterpartyType` says." Integrity is enforced in application code
(`src/lib/analytics/snapshot.ts` only ever looks up the counterparty type it
already knows to expect).

## Invoice vs. Transaction

An `Invoice` represents the AR side (what a customer owes, and by when); a
`Transaction` with `counterpartyType: CUSTOMER` and `type: INFLOW` is
recorded when that invoice is actually paid. The seed script links them
(`InvoicePayment.paidAt` lines up with the corresponding `Transaction.date`)
but the schema does not enforce a hard 1:1 link — reconciling the two is
exactly the kind of thing the accountant role's "reconcile records"
permission covers, not something assumed to already be perfectly true.

## Why RecurringExpense isn't projected at query time

`RecurringExpense` exists as a template (name, category, amount, frequency)
for the settings/reference surface, but every actual occurrence (rent,
payroll, SaaS, insurance, utilities) is materialized as its own
`Transaction` row at seed time. Projecting recurring templates forward at
query time would duplicate logic already covered by the forecasting engine
and risked double-counting recurring obligations inside `computePayables`.
