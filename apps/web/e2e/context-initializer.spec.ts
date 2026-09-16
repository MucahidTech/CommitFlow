import { test, expect } from "@playwright/test";
import { setupApiMocks, seedProviderConfig } from "./fixtures/api-mocks";

test.describe("Context Initializer", () => {
  test.beforeEach(async ({ page }) => {
    await seedProviderConfig(page);
    await page.goto("/");
  });

  test("shows prompt when no project path is set", async ({ page }) => {
    await setupApiMocks(page);
    await expect(page.getByText(/Set and submit the project path/i)).toBeVisible();
  });

  test("shows Analyze button when project path is set", async ({ page }) => {
    await setupApiMocks(page);

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");

    await expect(page.getByRole("button", { name: /Analyze Project/i })).toBeVisible();
  });

  test("shows analyzing state while request in flight", async ({ page }) => {
    await setupApiMocks(page);

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");

    // Slow down /analyze
    await page.route("**/analyze", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          snapshot: {
            projectPath: "/tmp/test",
            projectName: "test-project",
            techStack: ["typescript"],
            structure: [],
            git: null,
            config: { otherConfigs: {} },
            keyFiles: [],
            createdAt: new Date().toISOString(),
            version: 1,
          },
        }),
      });
    });

    await page.getByRole("button", { name: /Analyze Project/i }).click();

    await expect(page.getByText(/Analyzing/)).toBeVisible();
  });

  test("shows success details after analysis", async ({ page }) => {
    await setupApiMocks(page, { analyze: "success" });

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByRole("button", { name: /Analyze Project/i }).click();

    await expect(page.getByText("Analyzed")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("test-project")).toBeVisible();
    await expect(page.getByText("2")).toBeVisible(); // file count
    await expect(page.getByText("typescript")).toBeVisible();
    await expect(page.getByText("main")).toBeVisible(); // branch
  });

  test("shows error state on analyze failure", async ({ page }) => {
    await setupApiMocks(page, { analyze: "error" });

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByRole("button", { name: /Analyze Project/i }).click();

    await expect(page.getByText(/Analysis failed/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /Retry Analysis/i })).toBeVisible();
  });

  test("Re-scan button triggers new analysis", async ({ page }) => {
    await setupApiMocks(page);

    let analyzeCalls = 0;
    await page.route("**/analyze", async (route) => {
      analyzeCalls++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          snapshot: {
            projectPath: "/tmp/test",
            projectName: "test-project",
            techStack: ["typescript"],
            structure: [],
            git: null,
            config: { otherConfigs: {} },
            keyFiles: [],
            createdAt: new Date().toISOString(),
            version: 1,
          },
        }),
      });
    });

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByRole("button", { name: /Analyze Project/i }).click();

    await expect(page.getByText("Analyzed")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /Re-scan/i }).click();

    await expect.poll(() => analyzeCalls, { timeout: 5_000 }).toBeGreaterThanOrEqual(2);
  });

  test("Clear Context button resets to idle", async ({ page }) => {
    await setupApiMocks(page);

    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByRole("button", { name: /Analyze Project/i }).click();

    await expect(page.getByText("Analyzed")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /Clear Context/i }).click();

    await expect(page.getByRole("button", { name: /Analyze Project/i })).toBeVisible();
  });
});
