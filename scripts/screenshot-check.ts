import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:3210/login");
  await page.fill('input[value="owner@novaretail.demo"]', "owner@novaretail.demo");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("http://localhost:3210/");
  await page.waitForSelector("text=Business Health");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scripts/screenshot-dashboard.png", fullPage: true });

  await page.goto("http://localhost:3210/financial-graph");
  await page.waitForSelector("text=Financial Graph");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/screenshot-graph.png", fullPage: true });

  await page.goto("http://localhost:3210/risk");
  await page.waitForSelector("text=Risk Center");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scripts/screenshot-risk.png", fullPage: true });

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  console.log("Console errors captured:", errors);
  await browser.close();
}

main();
