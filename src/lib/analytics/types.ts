// Plain, Prisma-free shapes so analytics functions are pure and unit-testable
// in isolation (see tests/unit/analytics). API routes map Prisma rows into these.

export interface TxRecord {
  id: string;
  date: Date;
  amount: number;
  type: "INFLOW" | "OUTFLOW";
  cashFlowClass: "OPERATING" | "INVESTING" | "FINANCING";
  category: string;
  counterpartyType: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | "OTHER";
  counterpartyId: string | null;
  description: string;
}

export interface InvoiceRecord {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  paidAmount: number;
}

export interface ExpenseRecord {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  category: string;
  date: Date;
  amount: number;
  dueDate: Date | null;
  paid: boolean;
}

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RiskFactor {
  factor: string;
  impact: number;
}

export interface RiskResult {
  riskType: string;
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

export interface ForecastPoint {
  date: string;
  expected: number;
  lower: number;
  upper: number;
}
