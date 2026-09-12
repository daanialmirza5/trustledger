# TrustLedger — Interview Guide & Technical Defense

## 1. Pitches
- **30-Second Pitch**: "TrustLedger is a financial decision-support intelligence platform for small businesses. It enforces double-entry ledger integrity, simulates cash runway across operational scenarios, detects transaction anomalies, and provides grounded financial advisory with zero AI hallucination."
- **2-Minute Pitch**: "Small businesses often struggle with cash flow visibility and financial forecasting. TrustLedger provides a mathematically rigorous financial management engine built on Next.js and Prisma. We enforce strict double-entry bookkeeping where debits and credits must balance to the penny. Our cash flow simulation engine projects 30-, 60-, and 90-day runway trajectories under custom business scenarios like hiring expansion or delayed receivables. We use statistical median absolute deviation to catch duplicate billings and vendor price anomalies, while our AI advisor delivers actionable financial commentary grounded strictly in verified ledger state."

## 2. Key Technical Q&A
- **Q: Why use Median Absolute Deviation (MAD) instead of standard deviation for financial anomaly detection?**
  - **A**: Financial transaction data is heavily skewed and contains legitimate large outliers. Standard deviation is highly sensitive to outliers, skewing the mean and inflating the threshold. MAD provides a robust measure of statistical dispersion that accurately flags anomalous transactions without false positives.
- **Q: How do you prevent floating-point inaccuracies in currency calculations?**
  - **A**: We store all currency values as integer cents or Prisma Decimal types and perform financial aggregation using exact decimal math, preventing IEEE 754 floating point drift.
