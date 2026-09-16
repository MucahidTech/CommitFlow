/**
 * Run all E2E tests in sequence.
 * Automatically skips tests that require AI API keys if none are configured.
 *
 * Usage:
 *     pnpm --filter @commitflow/api e2e:all
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, "../..");

const API_KEYS = ["DEEPSEEK_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"];

function hasAnyKey(): boolean {
  return API_KEYS.some((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function runScript(label: string, scriptPath: string): { success: boolean; skipped?: boolean } {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`▶ ${label}`);
  console.log("═".repeat(60));

  const result = spawnSync("tsx", ["--env-file=.env", scriptPath], {
    cwd: APP_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  return { success: result.status === 0 };
}

function main(): void {
  console.log("═══ CommitFlow E2E Test Suite ═══");

  if (!hasAnyKey()) {
    console.log("\n⚠️  No AI provider API keys detected in environment.");
    console.log("   The following variables are checked:");
    for (const key of API_KEYS) {
      console.log(`     - ${key}`);
    }
    console.log("\n   To run E2E tests, add at least one to apps/api/.env");
    console.log("\n   SKIPPING all E2E API tests.");
    console.log("   This is expected in CI environments without secrets.\n");
    process.exit(0);
  }

  console.log("\n✅ AI provider key detected — running all E2E tests\n");

  const scripts = [
    { label: "Full Pipeline (direct orchestrator)", path: "test/e2e/full-pipeline.ts" },
    { label: "HTTP + SSE Full Stack", path: "test/e2e/http-pipeline.ts" },
    { label: "Pause and Error Scenarios", path: "test/e2e/pause-and-errors.ts" },
  ];

  const results: { label: string; success: boolean }[] = [];

  for (const script of scripts) {
    const result = runScript(script.label, script.path);
    results.push({ label: script.label, success: result.success });

    if (!result.success) {
      console.log(`\n❌ Failed at: ${script.label}\n`);
      break;
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("═══ E2E Test Summary ═══");
  console.log("═".repeat(60));

  let failed = 0;
  for (const result of results) {
    const icon = result.success ? "✅" : "❌";
    console.log(`  ${icon} ${result.label}`);
    if (!result.success) failed++;
  }

  if (failed > 0) {
    console.log(`\n❌ ${failed} E2E suite(s) failed\n`);
    process.exit(1);
  }

  console.log(`\n✅ All E2E suites passed\n`);
  process.exit(0);
}

main();
