/**
 * E2E Integration Test Script
 *
 * Tests the full CommitFlow pipeline:
 * AI generation → AI review → File writing → Quality gate → Git commit
 *
 * Usage:
 *     pnpm --filter @commitflow/api e2e
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import type { CommitItem, ProjectContext, ProvidersConfig } from "@commitflow/shared";
import { OrchestratorService } from "../../src/services/ai/orchestrator.service";
import { SnapshotService } from "../../src/services/snapshot/snapshot.service";
import { FileService } from "../../src/services/filesystem/file.service";
import { env } from "../../src/config/env";
import type { StatusCallback } from "../../src/services/ai/orchestrator.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLAYGROUND_PATH = path.resolve(__dirname, "../../test-workspace/playground");

const TEST_COMMIT: CommitItem = {
  id: "001",
  phase: 0,
  order: 1,
  type: "feat",
  scope: "playground",
  subject: "add farewell function",
  description: "Add a farewell function to the playground project",
  status: "pending",
};

const TEST_CONTEXT: ProjectContext = {
  projectPath: PLAYGROUND_PATH,
  projectName: "commitflow-playground",
  description: "Dummy project for E2E testing",
  techStack: ["typescript", "node"],
  existingFiles: [],
  safeMode: false,
};

/**
 * Canonical fixture content for src/index.ts.
 * E2E tests may modify this file — reset restores this exact content.
 */
const FIXTURE_INDEX_CONTENT = `/**
 * Dummy project file for E2E testing.
 * The AI will modify this file during test execution.
 */

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export function add(a: number, b: number): number {
  return a + b;
}

console.log(greet("CommitFlow"));
console.log(\`2 + 3 = \${add(2, 3)}\`);
`;

/**
 * Build providers config from env variables.
 * Uses the same fallback mechanism as the API.
 */
function buildProvidersFromEnv(): ProvidersConfig {
  const generator = env.DEEPSEEK_API_KEY
    ? { provider: "deepseek" as const, apiKey: env.DEEPSEEK_API_KEY }
    : env.GROQ_API_KEY
      ? { provider: "groq" as const, apiKey: env.GROQ_API_KEY }
      : env.OPENROUTER_API_KEY
        ? { provider: "openrouter" as const, apiKey: env.OPENROUTER_API_KEY }
        : null;

  const reviewer = env.GROQ_API_KEY
    ? { provider: "groq" as const, apiKey: env.GROQ_API_KEY }
    : env.OPENROUTER_API_KEY
      ? { provider: "openrouter" as const, apiKey: env.OPENROUTER_API_KEY }
      : env.DEEPSEEK_API_KEY
        ? { provider: "deepseek" as const, apiKey: env.DEEPSEEK_API_KEY }
        : null;

  if (!generator || !reviewer) {
    throw new Error(
      "No AI provider API key is configured. " +
        "Add at least one of DEEPSEEK_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY to apps/api/.env",
    );
  }

  return { generator, reviewer };
}

function logStatus(message: string, level: "info" | "success" | "error" | "warn" = "info"): void {
  const icons = {
    info: "ℹ",
    success: "✅",
    error: "❌",
    warn: "⚠️",
  };
  console.log(`${icons[level]} ${message}`);
}

const onStatusChange: StatusCallback = (status, attempt, message) => {
  const attemptText = attempt > 1 ? ` (attempt ${attempt})` : "";
  const messageText = message ? ` - ${message}` : "";
  console.log(`    → [${status}]${attemptText}${messageText}`);
};

/**
 * Ensure the playground directory has a git repository ready for the Orchestrator.
 * The Orchestrator auto-initializes git if missing, but we need user config
 * to be set up so commits don't fail.
 */
function ensurePlaygroundGit(): void {
  const gitDir = path.join(PLAYGROUND_PATH, ".git");

  if (!fs.existsSync(gitDir)) {
    execSync("git init", {
      cwd: PLAYGROUND_PATH,
      stdio: "ignore",
    });
  }

  execSync('git config user.name "CommitFlow E2E"', {
    cwd: PLAYGROUND_PATH,
    stdio: "ignore",
  });
  execSync('git config user.email "e2e@commitflow.local"', {
    cwd: PLAYGROUND_PATH,
    stdio: "ignore",
  });

  // Stage and commit the current fixture state as the initial baseline
  // (only if there's nothing committed yet)
  try {
    execSync("git rev-parse HEAD", { cwd: PLAYGROUND_PATH, stdio: "ignore" });
  } catch {
    // No commits yet — create initial commit
    execSync("git add .", { cwd: PLAYGROUND_PATH, stdio: "ignore" });
    execSync('git commit -m "chore: initial playground commit"', {
      cwd: PLAYGROUND_PATH,
      stdio: "ignore",
    });
    logStatus("Playground git initialized with initial commit", "success");
  }
}

/**
 * Reset the playground fixture to its canonical state.
 *
 * E2E tests modify src/index.ts (the only fixture file the AI changes).
 * We restore its content so the parent repository sees no unexpected changes.
 */
function resetPlayground(): void {
  const fixturePath = path.join(PLAYGROUND_PATH, "src", "index.ts");
  fs.writeFileSync(fixturePath, FIXTURE_INDEX_CONTENT, "utf-8");
  logStatus("Playground fixture reset to canonical content", "info");
}

async function runE2eTest(): Promise<void> {
  console.log("═══ CommitFlow E2E Integration Test ═══\n");
  console.log(`Playground Path: ${PLAYGROUND_PATH}`);

  // 0. Build providers config from env
  let providers: ProvidersConfig;
  try {
    providers = buildProvidersFromEnv();
  } catch (error) {
    logStatus(error instanceof Error ? error.message : "Provider setup failed", "error");
    process.exit(1);
  }

  logStatus(
    `Using providers: generator=${providers.generator.provider}, reviewer=${providers.reviewer.provider}`,
    "info",
  );

  // 1. Ensure git repo is ready
  ensurePlaygroundGit();

  // 2. Reset fixture content (in case a previous run left changes)
  resetPlayground();

  // 3. Check File Workspace
  const fileService = new FileService(PLAYGROUND_PATH);
  const files = await fileService.listFiles();
  logStatus(`Found ${files.length} project files: ${files.join(", ")}`, "info");

  // 4. Build Project Snapshot & Initialize Orchestrator
  logStatus("Building project snapshot...", "info");
  const snapshotService = new SnapshotService(PLAYGROUND_PATH);
  const snapshot = await snapshotService.buildSnapshot();

  logStatus("Initializing OrchestratorService...", "info");
  const orchestrator = new OrchestratorService(PLAYGROUND_PATH);

  // 5. Execute Commit Pipeline
  logStatus(
    `Executing Commit: ${TEST_COMMIT.type}(${TEST_COMMIT.scope}): ${TEST_COMMIT.subject}`,
    "info",
  );
  console.log("--------------------------------------------------");

  const startTime = Date.now();
  const result = await orchestrator.executeCommit(
    TEST_COMMIT,
    TEST_CONTEXT,
    snapshot,
    providers,
    onStatusChange,
  );
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("--------------------------------------------------");
  logStatus(`Execution finished in ${duration}s`, "info");

  console.log(`
═══ Execution Results ═══
Status:        ${result.status}
Attempts:      ${result.attempts}
Files Written: ${result.filesWritten.join(", ") || "none"}
Commit Hash:   ${result.commitHash ?? "N/A"}
Error:         ${result.error ?? "none"}
`);

  // 6. Reset fixture content so parent repo sees no changes
  resetPlayground();

  if (result.status === "completed") {
    logStatus("E2E Integration Test PASSED", "success");
    process.exit(0);
  } else {
    logStatus("E2E Integration Test FAILED", "error");
    process.exit(1);
  }
}

runE2eTest().catch((error) => {
  logStatus(
    `Unexpected System Error: ${error instanceof Error ? error.message : String(error)}`,
    "error",
  );
  console.error(error);
  process.exit(1);
});
