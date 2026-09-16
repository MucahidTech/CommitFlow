import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for CommitFlow Web dashboard E2E tests.
 *
 * Tests run against a locally started Next.js dev server.
 * API endpoints are mocked via route interception (see `e2e/fixtures`).
 */
export default defineConfig({
  testDir: "./e2e",

  // Run tests in parallel
  fullyParallel: true,

  // Fail on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Single worker locally, parallel on CI
  workers: process.env.CI ? 1 : undefined,

  // Multiple reporters
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  // Shared settings
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // Single browser project for now
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start dev server automatically
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
