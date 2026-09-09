/**
 * E2E Integration Test Script
 *
 * Tests the full CommitFlow pipeline:
 * AI generation → OpenRouter review → File writing → Quality gate → Git commit
 *
 * Usage:
 *     pnpm --filter @commitflow/api e2e
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { OrchestratorService } from "../services/ai/orchestrator.service";
import { FileService } from "../services/filesystem/file.service";
import { env } from "../config/env";
import type { CommitItem, ProjectContext } from "@commitflow/shared";
import type { StatusCallback } from "../services/ai/orchestrator.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLAYGROUND_PATH = path.resolve(__dirname, "../../test-workspace/playground");
const PLAYGROUND_GIT_DIR = path.join(PLAYGROUND_PATH, ".git");

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

/** Executes Git command strictly scoped to the playground repository */
function execPlaygroundGit(command: string): void {
  execSync(command, {
    cwd: PLAYGROUND_PATH,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_DIR: PLAYGROUND_GIT_DIR,
      GIT_WORK_TREE: PLAYGROUND_PATH,
    },
  });
}

/** Ensure the playground directory exists with dummy files and its own isolated git repo */
function prepareIsolatedPlayground(): void {
  if (!fs.existsSync(PLAYGROUND_PATH)) {
    fs.mkdirSync(PLAYGROUND_PATH, { recursive: true });
  }

  // Create an isolated .git inside playground if missing
  if (!fs.existsSync(PLAYGROUND_GIT_DIR)) {
    logStatus("Initializing isolated Git repository inside playground...", "info");
    execPlaygroundGit("git init");
    execPlaygroundGit('git config user.name "CommitFlow E2E"');
    execPlaygroundGit('git config user.email "e2e@commitflow.local"');
  }

  // Commit initial state inside playground git
  try {
    execPlaygroundGit("git add .");
    execPlaygroundGit('git commit -m "chore: initial playground commit"');
    logStatus("Playground isolated Git initialized with initial commit", "success");
  } catch {
    // Already committed or no changes
  }
}

/** Reset ONLY the playground workspace without affecting the root project */
function resetPlayground(): void {
  try {
    execPlaygroundGit("git reset --hard HEAD");
    execPlaygroundGit("git clean -fd");
    logStatus("Playground reset strictly to its isolated clean state", "info");
  } catch {
    logStatus("Could not reset playground workspace", "warn");
  }
}

async function runE2eTest(): Promise<void> {
  console.log("═══ CommitFlow E2E Integration Test ═══\n");
  console.log(`Playground Path: ${PLAYGROUND_PATH}`);

  // 0. Verify Environment Variables
  if (!env.DEEPSEEK_API_KEY || !env.OPENROUTER_API_KEY) {
    logStatus("DEEPSEEK_API_KEY or OPENROUTER_API_KEY is missing in apps/api/.env", "error");
    logStatus("Please provide valid API keys to run the E2E integration test.", "warn");
    process.exit(1);
  }

  // 1. Prepare Workspace & Isolated Git
  prepareIsolatedPlayground();
  resetPlayground();

  // 2. Check File Workspace
  const fileService = new FileService(PLAYGROUND_PATH);
  const files = await fileService.listFiles();
  logStatus(`Found ${files.length} project files: ${files.join(", ")}`, "info");

  // 3. Initialize Orchestrator
  logStatus("Initializing OrchestratorService...", "info");
  const orchestrator = new OrchestratorService(PLAYGROUND_PATH);

  // 4. Execute Commit Pipeline
  logStatus(
    `Executing Commit: ${TEST_COMMIT.type}(${TEST_COMMIT.scope}): ${TEST_COMMIT.subject}`,
    "info",
  );
  console.log("--------------------------------------------------");

  const startTime = Date.now();
  const result = await orchestrator.executeCommit(TEST_COMMIT, TEST_CONTEXT, onStatusChange);
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
