import { test, expect } from "@playwright/test";
import { setupApiMocks, seedProviderConfig } from "./fixtures/api-mocks";

test.describe("Validation", () => {
  test.beforeEach(async ({ page }) => {
    await seedProviderConfig(page);
    await setupApiMocks(page);
    await page.goto("/");
  });

  test("project name is required", async ({ page }) => {
    // Only set path — name empty
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");

    // Blur to trigger validation
    await page.getByPlaceholder("/absolute/path/to/project").blur();

    // Execute should be disabled
    const executeBtn = page.getByRole("button", { name: "Execute Plan" });
    await expect(executeBtn).toBeDisabled();
  });

  test("empty commit plan disables execute", async ({ page }) => {
    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    // Leave plan empty

    const executeBtn = page.getByRole("button", { name: "Execute Plan" });
    await expect(executeBtn).toBeDisabled();
  });

  test("provider modal opens with unconfigured state", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("commitflow:providers"));
    await page.reload();

    const badge = page.getByTestId("provider-badge");
    await expect(badge).toContainText("!");
  });
});
