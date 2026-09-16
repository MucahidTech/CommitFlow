import { test, expect } from "@playwright/test";
import { setupApiMocks, seedProviderConfig } from "./fixtures/api-mocks";

test.describe("Pause and Resume", () => {
  test.beforeEach(async ({ page }) => {
    await seedProviderConfig(page);
  });

  test("Pause button appears during execution", async ({ page }) => {
    await setupApiMocks(page, { sse: "success" });
    await page.goto("/");

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: alpha\n002 - feat: beta");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    await expect(page.getByRole("button", { name: /Pause Execution/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("Pause click sends API call and logs confirmation", async ({ page }) => {
    await setupApiMocks(page, { sse: "pause-requested", execute: "paused" });
    await page.goto("/");

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page
      .getByPlaceholder(/001 - feat/)
      .fill("001 - feat: alpha\n002 - feat: beta\n003 - feat: gamma");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    // Wait for Pause button to appear (isExecuting = true)
    const pauseBtn = page.getByRole("button", { name: /Pause Execution/i });
    await expect(pauseBtn).toBeVisible({ timeout: 5_000 });

    // Intercept the /pause request to verify it's called
    const pauseRequest = page.waitForRequest(
      (req) => req.url().includes("/pause/") && req.method() === "POST",
    );

    await pauseBtn.click();
    await pauseRequest;

    await expect(page.getByText(/Pause signal sent/)).toBeVisible({ timeout: 5_000 });
  });

  test("Paused session banner appears on reload", async ({ page }) => {
    await setupApiMocks(page, { savedState: "paused" });
    await page.goto("/");

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");

    await expect(page.getByText(/Paused session found/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /Resume Execution/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clear/i })).toBeVisible();
  });

  test("Clear session button removes paused banner", async ({ page }) => {
    await setupApiMocks(page, { savedState: "paused" });
    await page.goto("/");

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");

    await expect(page.getByText(/Paused session found/)).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /Clear/i }).click();

    await expect(page.getByText(/Paused session found/)).not.toBeVisible({ timeout: 5_000 });
  });

  test("Pause 404 error is shown in console", async ({ page }) => {
    await setupApiMocks(page, { sse: "success", pause: "not-found" });
    await page.goto("/");

    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: alpha\n002 - feat: beta");

    await page.getByRole("button", { name: "Execute Plan" }).click();

    // Wait for Pause button to appear
    const pauseBtn = page.getByRole("button", { name: /Pause Execution/i });
    await expect(pauseBtn).toBeVisible({ timeout: 5_000 });

    await pauseBtn.click();

    await expect(page.getByText(/Pause failed/)).toBeVisible({ timeout: 5_000 });
  });
});
