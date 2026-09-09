-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "cashFlowClass" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "counterpartyType" TEXT NOT NULL,
    "counterpartyId" TEXT,
    "reference" TEXT,
    "isDuplicateOf" TEXT,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "categorySource" TEXT NOT NULL DEFAULT 'RULE',
    "categoryConfidence" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "cashFlowClass", "category", "categoryConfidence", "categorySource", "counterpartyId", "counterpartyType", "createdAt", "date", "description", "id", "isAnomaly", "isDuplicateOf", "organizationId", "reference", "type") SELECT "accountId", "amount", "cashFlowClass", "category", "categoryConfidence", "categorySource", "counterpartyId", "counterpartyType", "createdAt", "date", "description", "id", "isAnomaly", "isDuplicateOf", "organizationId", "reference", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_organizationId_date_idx" ON "Transaction"("organizationId", "date");
CREATE INDEX "Transaction_organizationId_category_idx" ON "Transaction"("organizationId", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
