import { test, expect } from "@playwright/test";
import { setupApiMocks, seedProviderConfig } from "./fixtures/api-mocks";

test.describe("Provider Configuration - Advanced", () => {
  test.beforeEach(async ({ page }) => {
    await seedProviderConfig(page);
    await setupApiMocks(page);
    await page.goto("/");
  });

  test("changes provider via dropdown", async ({ page }) => {
    await page.getByTestId("provider-badge").click();

    const generatorSelect = page.locator("select").first();
    await generatorSelect.selectOption("groq");

    expect(await generatorSelect.inputValue()).toBe("groq");
  });

  test("shows default base URL and model placeholders", async ({ page }) => {
    await page.getByTestId("provider-badge").click();

    await page
      .getByRole("button", { name: /Show advanced options/i })
      .first()
      .click();

    // DeepSeek defaults
    await expect(page.getByPlaceholder("https://api.deepseek.com").first()).toBeVisible();
    await expect(page.getByPlaceholder("deepseek-chat").first()).toBeVisible();
  });

  test("fills advanced base URL and model", async ({ page }) => {
    await page.getByTestId("provider-badge").click();

    await page
      .getByRole("button", { name: /Show advanced options/i })
      .first()
      .click();

    await page
      .getByPlaceholder("https://api.deepseek.com")
      .first()
      .fill("https://custom.api.com/v1");
    await page.getByPlaceholder("deepseek-chat").first().fill("custom-model");

    await page.getByRole("button", { name: "Save" }).click();

    // Verify localStorage
    const stored = await page.evaluate(() => localStorage.getItem("commitflow:providers"));
    const parsed = JSON.parse(stored as string);
    expect(parsed.generator.baseUrl).toBe("https://custom.api.com/v1");
    expect(parsed.generator.model).toBe("custom-model");
  });

  test("Reset to defaults button clears form", async ({ page }) => {
    // Seed with custom config
    await page.evaluate(() => {
      localStorage.setItem(
        "commitflow:providers",
        JSON.stringify({
          generator: { provider: "openrouter", apiKey: "or-key" },
          reviewer: { provider: "groq", apiKey: "gsk-key" },
        }),
      );
    });
    await page.reload();

    await page.getByTestId("provider-badge").click();

    // Change something
    await page.locator("select").first().selectOption("groq");

    // Reset
    await page.getByRole("button", { name: /Reset to defaults/i }).click();

    // Should show deepseek again
    expect(await page.locator("select").first().inputValue()).toBe("deepseek");
  });
});
