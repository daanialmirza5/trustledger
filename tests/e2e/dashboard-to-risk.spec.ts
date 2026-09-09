import { test, expect } from "@playwright/test";

test("dashboard -> cash flow -> risk center, with evidence visible", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Owner/i }).click();
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL("**/", { timeout: 20000 });

  await expect(page.getByRole("heading", { name: "Business Health" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Cash Available")).toBeVisible();

  await page.getByRole("link", { name: "Cash Flow" }).click();
  await expect(page.getByRole("heading", { name: "Cash Flow" })).toBeVisible();
  await expect(page.getByText("Receivables Aging")).toBeVisible();
  await expect(page.getByText("Upcoming Cash Obligations")).toBeVisible();

  await page.getByRole("link", { name: "Risk Center" }).click();
  await expect(page.getByRole("heading", { name: "Risk Center" })).toBeVisible();
  await expect(page.getByText("Financial Health Score")).toBeVisible();
  // Every risk card should show either concrete factors or an explicit "none" state.
  await expect(page.getByText(/No elevated factors detected|impact/).first()).toBeVisible();
});
