import type { ExpenseRecord } from "./types";

export interface UpcomingObligation {
  name: string;
  category: string;
  amount: number;
  dueDate: string;
}

export interface PayablesResult {
  totalOutstanding: number;
  overdue: number;
  upcoming7d: UpcomingObligation[];
  upcoming7dTotal: number;
}

export function computePayables(expenses: ExpenseRecord[], asOf: Date): PayablesResult {
  let totalOutstanding = 0;
  let overdue = 0;
  const upcoming7d: UpcomingObligation[] = [];
  const sevenDaysOut = new Date(asOf);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  for (const exp of expenses) {
    if (exp.paid || !exp.dueDate) continue;
    totalOutstanding += exp.amount;
    if (exp.dueDate < asOf) overdue += exp.amount;
    if (exp.dueDate >= asOf && exp.dueDate <= sevenDaysOut) {
      upcoming7d.push({
        name: exp.supplierName ?? exp.category,
        category: exp.category,
        amount: exp.amount,
        dueDate: exp.dueDate.toISOString().slice(0, 10),
      });
    }
  }

  upcoming7d.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    totalOutstanding,
    overdue,
    upcoming7d,
    upcoming7dTotal: upcoming7d.reduce((s, o) => s + o.amount, 0),
  };
}
