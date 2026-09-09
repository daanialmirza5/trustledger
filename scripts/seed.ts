// Synthetic data generator for the demo organization "Nova Retail Systems".
// Deterministic (seeded PRNG) so re-running produces the same dataset and the
// evaluation scripts (scripts/evaluate-*.ts) can rely on known ground truth.
//
// Run: npm run seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// --- seeded PRNG (mulberry32) -------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 450; // ~15 months
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const START = new Date(TODAY.getTime() - HISTORY_DAYS * DAY_MS);

const CUSTOMER_NAMES = [
  "Aravind Retail Traders", "Blue Horizon Foods", "Chandigarh Fashion Hub", "Delta Electronics",
  "Everest Hardware", "Falcon Home Decor", "Ganga Textiles", "Harbor Bay Cafe", "Indus Furniture Co",
  "Jaipur Handicrafts", "Kingfisher Grocers", "Laxmi General Store", "Metro Sports Goods",
  "Nova Wholesale Partners", "Orchid Boutique", "Prime Electronics Bazaar", "Quartz Interiors",
  "Rainbow Kids Store", "Sunrise Supermart", "Titan Auto Parts", "Urban Nest Living", "Vista Mobile Zone",
];
const FLAGSHIP_CUSTOMER = "Nova Wholesale Partners"; // deliberate customer concentration

const SUPPLIER_NAMES = [
  "Apex Packaging Ltd", "Bharat Raw Materials", "Coastal Logistics", "Delta Print Supplies",
  "Everline Distributors", "Global Textile Mills", "Highland Cold Storage", "Indo Chem Supplies",
  "Jupiter Freight", "Kaveri Fabrics", "Metro Wholesale Depot", "Northline Warehousing",
  "Om Sai Traders", "Prime Manufacturing Co",
];
const DEPENDENCY_SUPPLIER = "Om Sai Traders"; // deliberate supplier concentration, with cost inflation

async function main() {
  console.log(`Seeding Nova Retail Systems: ${START.toISOString().slice(0, 10)} -> ${TODAY.toISOString().slice(0, 10)}`);

  await clearDatabase();

  const org = await prisma.organization.create({
    data: { name: "Nova Retail Systems", currency: "INR" },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.createMany({
    data: [
      { organizationId: org.id, name: "Priya Sharma", email: "owner@novaretail.demo", role: "OWNER", passwordHash },
      { organizationId: org.id, name: "Rahul Mehta", email: "accountant@novaretail.demo", role: "ACCOUNTANT", passwordHash },
      { organizationId: org.id, name: "Ananya Rao", email: "analyst@novaretail.demo", role: "ANALYST", passwordHash },
      { organizationId: org.id, name: "System Admin", email: "admin@novaretail.demo", role: "ADMIN", passwordHash },
    ],
  });

  const checking = await prisma.account.create({
    data: { organizationId: org.id, name: "Primary Checking", type: "CHECKING", openingBalance: 250000 },
  });
  await prisma.account.create({
    data: { organizationId: org.id, name: "Reserve Savings", type: "SAVINGS", openingBalance: 120000 },
  });

  const customers = await Promise.all(
    CUSTOMER_NAMES.map((name) =>
      prisma.customer.create({ data: { organizationId: org.id, name, segment: name === FLAGSHIP_CUSTOMER ? "Flagship" : "General" } })
    )
  );
  const suppliers = await Promise.all(
    SUPPLIER_NAMES.map((name) =>
      prisma.supplier.create({ data: { organizationId: org.id, name, category: name === DEPENDENCY_SUPPLIER ? "Core Materials" : "General" } })
    )
  );

  await prisma.recurringExpense.createMany({
    data: [
      { organizationId: org.id, name: "Office Rent", category: "Rent", amount: 45000, frequency: "MONTHLY", nextDueDate: TODAY },
      { organizationId: org.id, name: "Core Payroll", category: "Payroll", amount: 185000, frequency: "MONTHLY", nextDueDate: TODAY },
      { organizationId: org.id, name: "SaaS Subscriptions", category: "Software & Operations", amount: 9000, frequency: "MONTHLY", nextDueDate: TODAY },
      { organizationId: org.id, name: "Utilities", category: "Utilities", amount: 13500, frequency: "MONTHLY", nextDueDate: TODAY },
      { organizationId: org.id, name: "Business Insurance", category: "Insurance", amount: 6200, frequency: "MONTHLY", nextDueDate: TODAY },
    ],
  });

  // --- opening financing/investing events (day 0) ---------------------------
  await prisma.transaction.create({
    data: {
      organizationId: org.id, accountId: checking.id, date: START, description: "Owner capital injection",
      amount: 50000, type: "INFLOW", cashFlowClass: "FINANCING", category: "Capital", counterpartyType: "OTHER",
    },
  });
  const equipmentDate = new Date(START.getTime() + 12 * DAY_MS);
  await prisma.transaction.create({
    data: {
      organizationId: org.id, accountId: checking.id, date: equipmentDate, description: "POS + delivery equipment purchase",
      amount: 150000, type: "OUTFLOW", cashFlowClass: "INVESTING", category: "Equipment", counterpartyType: "OTHER",
    },
  });

  const injectedAnomalyIds: string[] = [];
  let txCount = 2;
  let invoiceCount = 0;
  let expenseCount = 0;

  // --- customer revenue cycle: invoice + delayed payment per ~14-21 days ----
  for (const customer of customers) {
    const isFlagship = customer.name === FLAGSHIP_CUSTOMER;
    const baseAmount = isFlagship ? randInt(60000, 95000) : randInt(8000, 35000);
    const cycleDays = isFlagship ? 12 : randInt(10, 20);

    for (let dayOffset = randInt(0, cycleDays); dayOffset < HISTORY_DAYS; dayOffset += cycleDays) {
      const issueDate = new Date(START.getTime() + dayOffset * DAY_MS);
      const monthsFromStart = dayOffset / 30;
      const seasonal = 1 + 0.08 * Math.sin((monthsFromStart / 12) * 2 * Math.PI) + (monthsFromStart > 13 ? -0.06 : 0);
      const amount = round2(baseAmount * seasonal * (0.94 + rand() * 0.12));

      const invoice = await prisma.invoice.create({
        data: {
          organizationId: org.id, customerId: customer.id, invoiceNumber: `INV-${customer.id.slice(-4)}-${dayOffset}`,
          issueDate, dueDate: new Date(issueDate.getTime() + 30 * DAY_MS), amount, paidAmount: 0, status: "OPEN",
        },
      });
      invoiceCount++;

      // Payment delay grows in the last ~60 days, and is worse for the flagship customer —
      // this is the deliberate "receivables aging" arc the demo narrates.
      const recentWindow = HISTORY_DAYS - dayOffset;
      let delayDays = randInt(0, 10);
      if (recentWindow < 30 && chance(0.6)) delayDays += isFlagship ? randInt(5, 15) : randInt(2, 8);
      const paymentDate = new Date(issueDate.getTime() + (30 + delayDays) * DAY_MS);

      if (paymentDate <= TODAY) {
        await prisma.invoicePayment.create({ data: { invoiceId: invoice.id, amount, paidAt: paymentDate } });
        await prisma.invoice.update({ where: { id: invoice.id }, data: { paidAmount: amount, status: "PAID" } });
        const tx = await prisma.transaction.create({
          data: {
            organizationId: org.id, accountId: checking.id, date: paymentDate,
            description: `Payment received - ${customer.name}`, amount, type: "INFLOW", cashFlowClass: "OPERATING",
            category: isFlagship ? "Service Revenue" : "Product Sales", counterpartyType: "CUSTOMER", counterpartyId: customer.id,
          },
        });
        txCount++;
        if (tx) void tx;
      } else {
        await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
      }
    }
  }

  // --- supplier cost cycle: bill + payment, with cost inflation for the dependency supplier ---
  for (const supplier of suppliers) {
    const isDependency = supplier.name === DEPENDENCY_SUPPLIER;
    const baseAmount = isDependency ? randInt(30000, 48000) : randInt(4000, 22000);
    const cycleDays = isDependency ? 8 : randInt(9, 18);
    const terms = randInt(10, 30);

    for (let dayOffset = randInt(0, cycleDays); dayOffset < HISTORY_DAYS; dayOffset += cycleDays) {
      const billDate = new Date(START.getTime() + dayOffset * DAY_MS);
      // Cost inflation ramps up over the last 4 months, more severe for the dependency supplier.
      const monthsFromEnd = (HISTORY_DAYS - dayOffset) / 30;
      const inflation = monthsFromEnd < 4 ? 1 + (isDependency ? 0.14 : 0.05) * ((4 - monthsFromEnd) / 4) : 1;
      const amount = round2(baseAmount * inflation * (0.94 + rand() * 0.12));
      const dueDate = new Date(billDate.getTime() + terms * DAY_MS);
      const paid = dueDate < new Date(TODAY.getTime() - 3 * DAY_MS) || chance(0.85);

      await prisma.expense.create({
        data: {
          organizationId: org.id, supplierId: supplier.id, category: isDependency ? "Core Materials" : "Procurement",
          date: billDate, amount, dueDate, paid,
        },
      });
      expenseCount++;

      if (paid) {
        await prisma.transaction.create({
          data: {
            organizationId: org.id, accountId: checking.id, date: dueDate < TODAY ? dueDate : billDate,
            description: `Payment to ${supplier.name}`, amount, type: "OUTFLOW", cashFlowClass: "OPERATING",
            category: isDependency ? "Core Materials" : "Procurement", counterpartyType: "SUPPLIER", counterpartyId: supplier.id,
          },
        });
        txCount++;
      }
    }
  }

  // --- recurring operating expenses (rent, payroll, utilities, saas, insurance) ---
  const recurringTemplates = [
    { category: "Rent", amount: 45000, desc: "Office rent" },
    { category: "Payroll", amount: 185000, desc: "Monthly payroll run" },
    { category: "Software & Operations", amount: 9000, desc: "SaaS subscriptions" },
    { category: "Utilities", amount: 13500, desc: "Electricity & internet" },
    { category: "Insurance", amount: 6200, desc: "Business insurance premium" },
  ];
  for (let m = 0; m * 30 < HISTORY_DAYS; m++) {
    const date = new Date(START.getTime() + m * 30 * DAY_MS);
    for (const t of recurringTemplates) {
      const amount = round2(t.amount * (0.97 + rand() * 0.06));
      await prisma.transaction.create({
        data: {
          organizationId: org.id, accountId: checking.id, date, description: t.desc, amount,
          type: "OUTFLOW", cashFlowClass: "OPERATING", category: t.category, counterpartyType: "OTHER",
        },
      });
      txCount++;
    }
  }

  // --- injected anomalies: known ground truth for anomaly-detection evaluation ---
  const anomalySpecs = [
    { dayOffset: 60, category: "Software & Operations", amount: 84000, desc: "Unusual one-off tooling purchase" },
    { dayOffset: 140, category: "Utilities", amount: 61000, desc: "Unexpected utility surcharge" },
    { dayOffset: 220, category: "Procurement", amount: 175000, desc: "Emergency bulk restock" },
    { dayOffset: 300, category: "Rent", amount: 130000, desc: "One-time facility deposit" },
    { dayOffset: 400, category: "Insurance", amount: 42000, desc: "Mid-term policy adjustment" },
  ];
  for (const spec of anomalySpecs) {
    const date = new Date(START.getTime() + spec.dayOffset * DAY_MS);
    const tx = await prisma.transaction.create({
      data: {
        organizationId: org.id, accountId: checking.id, date, description: spec.desc, amount: spec.amount,
        type: "OUTFLOW", cashFlowClass: "OPERATING", category: spec.category, counterpartyType: "OTHER", isAnomaly: true,
      },
    });
    injectedAnomalyIds.push(tx.id);
    txCount++;
  }

  fs.writeFileSync(
    path.join(process.cwd(), "scripts", "seed-ground-truth.json"),
    JSON.stringify({ organizationId: org.id, injectedAnomalyTransactionIds: injectedAnomalyIds, seededAt: new Date().toISOString() }, null, 2)
  );

  console.log(`Done. Organization ${org.id}`);
  console.log(`Transactions: ${txCount}, Invoices: ${invoiceCount}, Expenses: ${expenseCount}, Injected anomalies: ${injectedAnomalyIds.length}`);
  console.log("Demo logins (password: demo1234): owner@novaretail.demo, accountant@novaretail.demo, analyst@novaretail.demo, admin@novaretail.demo");
}

async function clearDatabase() {
  await prisma.auditEvent.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.evidenceLink.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.scenarioResult.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.forecast.deleteMany();
  await prisma.financialMetric.deleteMany();
  await prisma.invoicePayment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
