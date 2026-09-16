import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createPlayground, type Playground } from "./fixtures/playground";

/**
 * Full-stack integration test with REAL backend + REAL AI + REAL git.
 *
 * Requires AI keys in apps/api/.env. Keys are read and injected into
 * localStorage so the frontend enables the Execute button.
 *
 * Skip with SKIP_INTEGRATION=true if needed.
 */

const skipIntegration = process.env.SKIP_INTEGRATION === "true";

function readApiEnv(): Record<string, string> {
  // process.env takes precedence (for CI)
  const env: Record<string, string> = {};

  for (const key of ["DEEPSEEK_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"]) {
    const value = process.env[key];
    if (value) env[key] = value;
  }

  // Fallback to .env file (for local)
  const envPath = path.resolve(__dirname, "../../api/.env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      if (env[key]) continue; // process.env takes precedence
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }

  return env;
}

test.describe("Full-Stack Integration", () => {
  test.skip(skipIntegration, "Integration tests disabled via SKIP_INTEGRATION=true");

  let playground: Playground;

  test.beforeEach(async ({ page }) => {
    playground = createPlayground();

    const apiEnv = readApiEnv();
    const deepseekKey = apiEnv.DEEPSEEK_API_KEY;
    const groqKey = apiEnv.GROQ_API_KEY;
    const openrouterKey = apiEnv.OPENROUTER_API_KEY;

    const generator = deepseekKey
      ? { provider: "deepseek" as const, apiKey: deepseekKey }
      : groqKey
        ? { provider: "groq" as const, apiKey: groqKey }
        : null;

    const reviewer = groqKey
      ? { provider: "groq" as const, apiKey: groqKey }
      : openrouterKey
        ? { provider: "openrouter" as const, apiKey: openrouterKey }
        : null;

    if (!generator || !reviewer) {
      throw new Error(
        "Missing AI keys in apps/api/.env. Set DEEPSEEK_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.",
      );
    }

    await page.addInitScript(
      ({ gen, rev }) => {
        localStorage.setItem(
          "commitflow:providers",
          JSON.stringify({ generator: gen, reviewer: rev }),
        );
      },
      { gen: generator, rev: reviewer },
    );

    await page.goto("/");
  });

  test.afterEach(() => {
    playground?.cleanup();
  });

  test("executes a real commit through the full stack", async ({ page }) => {
    await page.getByLabel("Project Name").fill("playground");
    await page.getByPlaceholder("/absolute/path/to/project").fill(playground.path);

    // Disable Safe Mode so the pipeline actually creates a git commit
    const safeModeCheckbox = page.getByRole("checkbox", { name: /safe mode/i });
    await safeModeCheckbox.uncheck();

    await expect(page.getByTestId("provider-badge")).toBeVisible();

    await page.getByPlaceholder(/001 - feat/).fill("001 - feat(playground): add farewell function");

    const executeButton = page.getByRole("button", { name: "Execute Plan" });
    await expect(executeButton).toBeEnabled();
    await executeButton.click();

    await expect(page.getByText(/Plan started/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Execution complete/)).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/1 completed/)).toBeVisible();

    // Verify git commit was created in the playground
    const gitLog = execSync("git log --oneline -1", {
      cwd: playground.path,
      encoding: "utf-8",
    });
    expect(gitLog).toContain("add farewell function");

    // Verify the AI actually modified the file
    const indexPath = path.join(playground.path, "src", "index.ts");
    const indexContent = fs.readFileSync(indexPath, "utf-8");
    expect(indexContent.toLowerCase()).toContain("farewell");
  });
});
