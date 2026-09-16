import { test, expect } from "@playwright/test";
import { setupApiMocks, seedProviderConfig } from "./fixtures/api-mocks";

test.describe("Console Log", () => {
  test.beforeEach(async ({ page }) => {
    await seedProviderConfig(page);
    await page.goto("/");
  });

  test("shows Idle state initially", async ({ page }) => {
    await setupApiMocks(page);
    await expect(page.getByText("Idle")).toBeVisible();
    await expect(page.getByText(/Waiting for execution logs/)).toBeVisible();
  });

  test("displays plan_started, commit_started and commit_result", async ({ page }) => {
    await setupApiMocks(page, { sse: "success" });

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: alpha\n002 - feat: beta");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    // Plan started
    await expect(page.getByText(/Plan started: 2 commits/)).toBeVisible({ timeout: 5_000 });

    // Commit started
    await expect(page.getByText(/→ Commit 001: feat: alpha/)).toBeVisible();
    await expect(page.getByText(/→ Commit 002: feat: beta/)).toBeVisible();

    // Commit results
    await expect(page.getByText(/Result: Completed/).first()).toBeVisible();
  });

  test("displays all 3 commits in multi-commit mode", async ({ page }) => {
    await setupApiMocks(page, { sse: "multi-commit", execute: "success" });

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page
      .getByPlaceholder(/001 - feat/)
      .fill("001 - feat: alpha\n002 - fix: beta\n003 - docs: gamma");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    await expect(page.getByText(/→ Commit 001/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/→ Commit 002/)).toBeVisible();
    await expect(page.getByText(/→ Commit 003/)).toBeVisible();
  });

  test("shows failure message in console on failed execution", async ({ page }) => {
    await setupApiMocks(page, { sse: "failed", execute: "failed" });

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: alpha");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    // Scope to the Execution Log section to avoid matching the roadmap error
    const consoleSection = page.getByTestId("console-log-container");
    await expect(consoleSection.getByText(/AI model rejected/)).toBeVisible({ timeout: 5_000 });
    await expect(consoleSection.getByText(/Execution complete: 0\/1 succeeded/)).toBeVisible();
  });

  test("shows Running status during execution", async ({ page }) => {
    await setupApiMocks(page);

    // Slow SSE response
    await page.route("**/stream/**", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: 'data: {"type":"connected"}\n\ndata: {"type":"done","totalCommits":1,"successCount":1,"failedCount":0}\n\n',
      });
    });

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: alpha");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    await expect(page.getByText("Running")).toBeVisible({ timeout: 3_000 });
  });
});
