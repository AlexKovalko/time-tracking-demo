import { defineConfig, devices } from "@playwright/test";
import { WEB_BASE_URL } from "../helpers/env";

/**
 * Playwright E2E for time-tracking (AC-13).
 * Expects Compose/nginx or Vite preview at WEB_BASE_URL (default http://localhost:8081).
 * Eng must make this green; do not weaken assertions.
 */
export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "../../playwright-report" }]],
  use: {
    baseURL: WEB_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "ru-RU",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
