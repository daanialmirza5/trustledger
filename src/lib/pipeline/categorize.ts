// Rule-based transaction categorization. Deterministic rules run first;
// nothing here calls an LLM or silently rewrites a financial record — see
// section 11 of the product spec ("hybrid approach") and docs/architecture.md.
// A human (accountant role) can always override via categorySource="HUMAN".

export interface CategoryGuess {
  category: string;
  confidence: number; // 0..1
  cashFlowClass: "OPERATING" | "INVESTING" | "FINANCING";
}

const RULES: { pattern: RegExp; category: string; cashFlowClass: CategoryGuess["cashFlowClass"] }[] = [
  { pattern: /payroll|salary|wages/i, category: "Payroll", cashFlowClass: "OPERATING" },
  { pattern: /rent|lease/i, category: "Rent", cashFlowClass: "OPERATING" },
  { pattern: /utilit|electric|internet|water bill/i, category: "Utilities", cashFlowClass: "OPERATING" },
  { pattern: /insurance|premium/i, category: "Insurance", cashFlowClass: "OPERATING" },
  { pattern: /saas|subscription|software|aws|azure|hosting/i, category: "Software & Operations", cashFlowClass: "OPERATING" },
  { pattern: /supplier|vendor|procurement|raw material|wholesale/i, category: "Procurement", cashFlowClass: "OPERATING" },
  { pattern: /equipment|machinery|vehicle|computer purchase/i, category: "Equipment", cashFlowClass: "INVESTING" },
  { pattern: /loan|financing|repayment|capital injection/i, category: "Financing", cashFlowClass: "FINANCING" },
  { pattern: /invoice payment|customer payment|sales|revenue/i, category: "Product Sales", cashFlowClass: "OPERATING" },
];

export function categorizeTransaction(description: string): CategoryGuess {
  for (const rule of RULES) {
    if (rule.pattern.test(description)) {
      return { category: rule.category, confidence: 0.9, cashFlowClass: rule.cashFlowClass };
    }
  }
  return { category: "Uncategorized", confidence: 0.3, cashFlowClass: "OPERATING" };
}
