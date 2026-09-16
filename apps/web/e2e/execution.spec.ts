import { test, expect } from "@playwright/test";
import { setupApiMocks, seedProviderConfig } from "./fixtures/api-mocks";

test.describe("Execution Flow", () => {
  test.beforeEach(async ({ page }) => {
    await seedProviderConfig(page);
    await page.goto("/");
  });

  test("successful execution updates roadmap and console", async ({ page }) => {
    await setupApiMocks(page, { sse: "success", execute: "success" });

    // Setup
    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: alpha\n002 - feat: beta");

    // Execute
    await page.getByRole("button", { name: "Execute Plan" }).click();

    // Wait for console to show plan start
    await expect(page.getByText(/Plan started/)).toBeVisible({ timeout: 5_000 });

    // Wait for completion
    await expect(page.getByText(/Execution complete.*2\/2/)).toBeVisible({ timeout: 10_000 });
  });

  test("failed execution shows error in console", async ({ page }) => {
    await setupApiMocks(page, { sse: "failed", execute: "failed" });

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: alpha");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    // Console should show the failure
    await expect(page.getByText(/AI model rejected/)).toBeVisible({ timeout: 10_000 });
  });
});
