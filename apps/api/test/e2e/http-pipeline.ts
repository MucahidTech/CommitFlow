/**
 * Full-stack E2E test: HTTP + SSE + Git.
 *
 * Tests the same flow as the web dashboard:
 *   POST /analyze  →  SSE connect  →  POST /execute  →  SSE done  →  verify git
 *
 * Usage:
 *     pnpm --filter @commitflow/api e2e:http
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import type { ProvidersConfig } from "@commitflow/shared";
import { env } from "../../src/config/env";
import { startTestServer, type TestServer } from "./helpers/server";
import { connectSse, type SseClient } from "./helpers/sse-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLAYGROUND_PATH = path.resolve(__dirname, "../../test-workspace/playground");

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

function log(message: string, level: "info" | "success" | "error" = "info"): void {
  const icons = { info: "ℹ", success: "✅", error: "❌" };
  console.log(`${icons[level]} ${message}`);
}

/** Build providers config from env with fallback chain. */
function buildProviders(): ProvidersConfig {
  const generator = env.DEEPSEEK_API_KEY
    ? { provider: "deepseek" as const, apiKey: env.DEEPSEEK_API_KEY }
    : env.GROQ_API_KEY
      ? { provider: "groq" as const, apiKey: env.GROQ_API_KEY }
      : env.OPENROUTER_API_KEY
        ? { provider: "openrouter" as const, apiKey: env.OPENROUTER_API_KEY }
        : null;

  const reviewer = env.GROQ_API_KEY
    ? { provider: "groq" as const, apiKey: env.GROQ_API_KEY }
    : env.DEEPSEEK_API_KEY
      ? { provider: "deepseek" as const, apiKey: env.DEEPSEEK_API_KEY }
      : env.OPENROUTER_API_KEY
        ? { provider: "openrouter" as const, apiKey: env.OPENROUTER_API_KEY }
        : null;

  if (!generator || !reviewer) {
    throw new Error("No API keys configured for E2E test");
  }
  return { generator, reviewer };
}

/** Ensure the playground has git + fixture file in canonical state. */
function preparePlayground(): void {
  // Ensure directories exist
  fs.mkdirSync(path.join(PLAYGROUND_PATH, "src"), { recursive: true });

  // Rewrite fixture file
  fs.writeFileSync(path.join(PLAYGROUND_PATH, "src", "index.ts"), FIXTURE_INDEX_CONTENT, "utf-8");

  // Ensure git repo exists with user config
  const gitDir = path.join(PLAYGROUND_PATH, ".git");
  if (!fs.existsSync(gitDir)) {
    execSync("git init", { cwd: PLAYGROUND_PATH, stdio: "ignore" });
    execSync('git config user.name "CommitFlow E2E"', {
      cwd: PLAYGROUND_PATH,
      stdio: "ignore",
    });
    execSync('git config user.email "e2e@commitflow.local"', {
      cwd: PLAYGROUND_PATH,
      stdio: "ignore",
    });
    execSync("git add .", { cwd: PLAYGROUND_PATH, stdio: "ignore" });
    execSync('git commit -m "chore: initial playground commit"', {
      cwd: PLAYGROUND_PATH,
      stdio: "ignore",
    });
  }
}

async function run(): Promise<void> {
  console.log("═══ CommitFlow Full-Stack E2E (HTTP + SSE) ═══\n");

  const providers = buildProviders();
  log(`Providers: gen=${providers.generator.provider}, rev=${providers.reviewer.provider}`);

  preparePlayground();

  let server: TestServer | null = null;
  let sse: SseClient | null = null;

  try {
    // 1. Start server
    server = await startTestServer();
    log(`API server running at ${server.url}`, "success");

    // 2. Analyze (HTTP)
    const analyzeRes = await fetch(`${server.url}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath: PLAYGROUND_PATH }),
    });
    if (!analyzeRes.ok) {
      throw new Error(`POST /analyze failed: ${analyzeRes.status} ${analyzeRes.statusText}`);
    }
    const analyzeData = (await analyzeRes.json()) as {
      success: boolean;
      snapshot: { projectName: string };
    };
    if (!analyzeData.success) throw new Error("Analyze returned success=false");
    log(`POST /analyze OK — project: ${analyzeData.snapshot.projectName}`, "success");

    // 3. Connect SSE
    const streamId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sse = await connectSse(`${server.url}/stream/${streamId}`);
    log(`SSE connected: ${streamId}`, "success");

    // 4. Execute (HTTP — starts the pipeline, runs in background)
    const executePromise = fetch(`${server.url}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectContext: {
          projectPath: PLAYGROUND_PATH,
          projectName: "commitflow-playground",
          safeMode: false,
          techStack: ["typescript", "node"],
          existingFiles: [],
        },
        commitPlan: {
          projectPath: PLAYGROUND_PATH,
          projectName: "commitflow-playground",
          completedCommitIds: [],
          commits: [
            {
              id: "001",
              phase: 0,
              order: 1,
              type: "feat",
              scope: "playground",
              subject: "add farewell function",
            },
          ],
        },
        streamId,
        providers,
      }),
    });

    log("POST /execute sent — waiting for pipeline to complete...");

    // 5. Wait for SSE "done" event
    await sse.waitForDone(180_000);
    log("SSE 'done' received", "success");

    // 6. Read final HTTP response
    const executeRes = await executePromise;
    if (!executeRes.ok) {
      const body = await executeRes.text();
      throw new Error(`POST /execute failed: ${executeRes.status} — ${body}`);
    }
    const result = (await executeRes.json()) as {
      success: boolean;
      successCount: number;
      failedCount: number;
      paused: boolean;
    };

    if (!result.success || result.failedCount > 0) {
      throw new Error(`Execution failed: ${JSON.stringify(result)}`);
    }
    log(
      `POST /execute OK — success: ${result.successCount}, failed: ${result.failedCount}`,
      "success",
    );

    // 7. Verify SSE events coverage
    const eventTypes = new Set(sse.events.map((e) => e.type));
    const required = [
      "connected",
      "snapshot_started",
      "snapshot_completed",
      "plan_started",
      "commit_started",
      "status",
      "commit_result",
      "done",
    ];
    const missing = required.filter((t) => !eventTypes.has(t));
    if (missing.length > 0) {
      throw new Error(`Missing SSE events: ${missing.join(", ")}`);
    }
    log(`All ${required.length} required SSE event types received`, "success");

    // 8. Verify git commit in playground
    const gitLog = execSync("git log --oneline -1", {
      cwd: PLAYGROUND_PATH,
      encoding: "utf-8",
    });
    log(`Playground commit created: ${gitLog.trim()}`, "success");

    console.log("\n✅ Full-Stack E2E PASSED\n");
  } catch (error) {
    log(`FAILED: ${error instanceof Error ? error.message : String(error)}`, "error");
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    sse?.close();
    await server?.close();

    // Reset fixture so parent repo sees no changes
    fs.writeFileSync(path.join(PLAYGROUND_PATH, "src", "index.ts"), FIXTURE_INDEX_CONTENT, "utf-8");
  }
}

run();
