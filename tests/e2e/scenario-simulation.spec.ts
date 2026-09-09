import { test, expect } from "@playwright/test";

test("what-if simulator: run a scenario and see it compared against baseline", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Owner/i }).click();
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL("**/", { timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Business Health" })).toBeVisible({ timeout: 15000 });

  await page.getByRole("link", { name: "What-If Simulator" }).click();
  await expect(page.getByRole("heading", { name: "What-If Simulator" })).toBeVisible();

  await page.getByRole("combobox").selectOption("LOSE_TOP_CUSTOMER");
  await page.getByRole("button", { name: "Run scenario" }).click();

  await expect(page.getByRole("heading", { name: "Lose top customer" }).first()).toBeVisible();
  await expect(page.getByText("Monthly revenue Δ").first()).toBeVisible();
  await expect(page.getByText("90-day cash").first()).toBeVisible();
  await expect(page.getByText("Projected runway").first()).toBeVisible();
});
