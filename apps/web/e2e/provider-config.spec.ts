import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./fixtures/api-mocks";

test.describe("Provider Configuration", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto("/");
  });

  test("opens modal when badge clicked", async ({ page }) => {
    await page.getByTestId("provider-badge").click();

    await expect(page.getByRole("heading", { name: "AI Provider Configuration" })).toBeVisible();
  });

  test("saves provider config to localStorage", async ({ page }) => {
    await page.getByTestId("provider-badge").click();

    const generatorSelect = page.locator("select").first();
    await generatorSelect.selectOption("deepseek");

    const apiKeyInput = page.locator('input[type="password"]').first();
    await apiKeyInput.fill("sk-test-key");

    const reviewerSelect = page.locator("select").nth(1);
    await reviewerSelect.selectOption("groq");

    const reviewerKeyInput = page.locator('input[type="password"]').nth(1);
    await reviewerKeyInput.fill("gsk-test");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByRole("heading", { name: "AI Provider Configuration" }),
    ).not.toBeVisible();

    await expect(page.getByTestId("provider-badge")).toContainText("✓");
  });

  test("same-as-generator copies config", async ({ page }) => {
    await page.getByTestId("provider-badge").click();

    await page.locator("select").first().selectOption("deepseek");
    await page.locator('input[type="password"]').first().fill("sk-gen");

    // Scope to the same-as-provider checkbox by its label
    await page.getByRole("checkbox", { name: /use the same provider/i }).check();

    await expect(page.getByText("Reviewer (Review)")).not.toBeVisible();

    await page.getByRole("button", { name: "Save" }).click();

    const stored = await page.evaluate(() => localStorage.getItem("commitflow:providers"));
    const parsed = JSON.parse(stored as string);
    expect(parsed.reviewer.provider).toBe("deepseek");
    expect(parsed.reviewer.apiKey).toBe("sk-gen");
  });

  test("advanced fields toggle", async ({ page }) => {
    await page.getByTestId("provider-badge").click();

    await expect(page.getByText(/Base URL \(default/)).not.toBeVisible();

    await page
      .getByRole("button", { name: /Show advanced options/i })
      .first()
      .click();

    await expect(page.getByText(/Base URL \(default/).first()).toBeVisible();
    await expect(page.getByText(/Model \(default/).first()).toBeVisible();
  });
});
