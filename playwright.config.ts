import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: { timeout: 15000 },
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3210",
    screenshot: "only-on-failure",
  },
  // No webServer block: Next.js refuses a second dev server per project
  // directory regardless of port. CI starts its own server explicitly
  // (see .github/workflows/ci.yml) and points PLAYWRIGHT_BASE_URL at it;
  // locally, run `npm run dev` yourself first.
});
