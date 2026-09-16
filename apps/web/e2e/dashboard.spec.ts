import { test, expect } from "@playwright/test";
import { setupApiMocks, seedProviderConfig } from "./fixtures/api-mocks";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await seedProviderConfig(page);
    await setupApiMocks(page);
    await page.goto("/");
  });

  test("renders main sections", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "CommitFlow Control Panel" })).toBeVisible();
    await expect(page.getByText("Project Setup")).toBeVisible();
    await expect(page.getByText("Commit Plan Input")).toBeVisible();
    await expect(page.getByText("Commit Roadmap")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Execution Log" })).toBeVisible();
  });

  test("provider badge shows configured providers", async ({ page }) => {
    const badge = page.getByRole("button", { name: /DeepSeek.*Groq/i });
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("✓");
  });

  test("project form accepts input and shows project in header", async ({ page }) => {
    await page.getByLabel("Project Name").fill("my-test-project");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/my-project");

    // Header should reflect project info
    await expect(page.getByText("my-test-project")).toBeVisible();
    await expect(page.getByText("/tmp/my-project")).toBeVisible();
  });

  test("parses commit plan and displays roadmap", async ({ page }) => {
    const planText = [
      "001 - feat(shared): scaffold package",
      "002 - fix(api): resolve bug",
      "003 - docs: update readme",
    ].join("\n");

    await page.getByPlaceholder(/001 - feat/).fill(planText);

    // Use exact text matching to avoid matching textarea content
    // (textarea has "001 - feat(shared): scaffold package", roadmap has "feat(shared): scaffold package")
    await expect(page.getByText("feat(shared): scaffold package", { exact: true })).toBeVisible();
    await expect(page.getByText("fix(api): resolve bug", { exact: true })).toBeVisible();
    await expect(page.getByText("docs: update readme", { exact: true })).toBeVisible();
    await expect(page.getByText("3 total", { exact: true })).toBeVisible();
  });

  test("checkbox marks commit as completed", async ({ page }) => {
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: test\n002 - feat: other");

    // Click first checkbox
    const firstCheckbox = page.getByRole("checkbox").first();
    await firstCheckbox.check();

    // Should show as completed
    await expect(firstCheckbox).toBeChecked();
  });

  test("target star toggles", async ({ page }) => {
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: test");

    const starButton = page.getByRole("button", { name: /Set.*execution target/i }).first();
    await starButton.click();

    // After click, the star becomes ★ (not ☆)
    await expect(starButton).toContainText("★");
  });

  test("Execute button disabled when no project set", async ({ page }) => {
    const executeBtn = page.getByRole("button", { name: "Execute Plan" });
    await expect(executeBtn).toBeDisabled();
  });

  test("Execute button enabled when project + plan are set", async ({ page }) => {
    await page.getByLabel("Project Name").fill("test");
    await page.getByPlaceholder("/absolute/path/to/project").fill("/tmp/test");
    await page.getByPlaceholder(/001 - feat/).fill("001 - feat: test");

    const executeBtn = page.getByRole("button", { name: "Execute Plan" });
    await expect(executeBtn).toBeEnabled();
  });
});
