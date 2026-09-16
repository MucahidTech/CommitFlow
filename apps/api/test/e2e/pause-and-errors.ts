/**
 * E2E tests for pause, filter logic, and error scenarios.
 *
 * Sections:
 *   1-5: Fast tests (no AI calls)
 *   6:   Pause scenario with real execution (3 commits)
 *
 * Usage:
 *     pnpm --filter @commitflow/api e2e:edge
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

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Expectation failed: ${message}`);
}

function buildProviders(): ProvidersConfig {
  const generator = env.DEEPSEEK_API_KEY
    ? { provider: "deepseek" as const, apiKey: env.DEEPSEEK_API_KEY }
    : env.GROQ_API_KEY
      ? { provider: "groq" as const, apiKey: env.GROQ_API_KEY }
      : null;

  const reviewer = env.GROQ_API_KEY
    ? { provider: "groq" as const, apiKey: env.GROQ_API_KEY }
    : env.DEEPSEEK_API_KEY
      ? { provider: "deepseek" as const, apiKey: env.DEEPSEEK_API_KEY }
      : null;

  if (!generator || !reviewer) {
    throw new Error("No API keys configured");
  }
  return { generator, reviewer };
}

function preparePlayground(): void {
  fs.mkdirSync(path.join(PLAYGROUND_PATH, "src"), { recursive: true });
  fs.writeFileSync(path.join(PLAYGROUND_PATH, "src", "index.ts"), FIXTURE_INDEX_CONTENT, "utf-8");

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
  } else {
    // Reset git state
    execSync("git reset --hard HEAD", { cwd: PLAYGROUND_PATH, stdio: "ignore" });
    execSync("git clean -fd", { cwd: PLAYGROUND_PATH, stdio: "ignore" });
  }
}

const baseProjectContext = {
  projectPath: PLAYGROUND_PATH,
  projectName: "commitflow-playground",
  safeMode: false,
  techStack: ["typescript", "node"],
  existingFiles: [],
};

async function run(): Promise<void> {
  console.log("═══ CommitFlow E2E: Pause & Error Scenarios ═══\n");

  const providers = buildProviders();
  preparePlayground();

  let server: TestServer | null = null;

  try {
    server = await startTestServer();
    console.log(`API server running at ${server.url}\n`);

    // ─── Section 1: Validation errors ────────────────────────────
    console.log("▶ Validation errors:");

    await test("rejects missing providers", async () => {
      const res = await fetch(`${server!.url}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectContext: baseProjectContext,
          commitPlan: {
            projectPath: PLAYGROUND_PATH,
            projectName: "playground",
            completedCommitIds: [],
            commits: [{ id: "001", phase: 0, order: 1, type: "feat", subject: "test" }],
          },
        }),
      });
      expect(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test("rejects empty commit plan", async () => {
      const res = await fetch(`${server!.url}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectContext: baseProjectContext,
          commitPlan: {
            projectPath: PLAYGROUND_PATH,
            projectName: "playground",
            completedCommitIds: [],
            commits: [],
          },
          providers,
        }),
      });
      expect(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test("rejects missing projectContext", async () => {
      const res = await fetch(`${server!.url}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitPlan: {
            projectPath: PLAYGROUND_PATH,
            projectName: "playground",
            completedCommitIds: [],
            commits: [{ id: "001", phase: 0, order: 1, type: "feat", subject: "test" }],
          },
          providers,
        }),
      });
      expect(res.status === 400, `Expected 400, got ${res.status}`);
    });

    // ─── Section 2: Filter logic ────────────────────────────────
    console.log("\n▶ Filter logic:");

    await test("completedCommitIds filtering: all commits completed → 0 execute", async () => {
      const res = await fetch(`${server!.url}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectContext: baseProjectContext,
          commitPlan: {
            projectPath: PLAYGROUND_PATH,
            projectName: "playground",
            completedCommitIds: ["001", "002"],
            commits: [
              { id: "001", phase: 0, order: 1, type: "feat", subject: "test1" },
              { id: "002", phase: 0, order: 2, type: "feat", subject: "test2" },
            ],
          },
          providers,
        }),
      });
      expect(res.ok, `Expected 2xx, got ${res.status}`);
      const body = (await res.json()) as { success: boolean; totalCommits: number };
      expect(body.totalCommits === 0, `Expected 0 commits, got ${body.totalCommits}`);
      expect(body.success === true, "Expected success");
    });

    await test("startFromCommitId not in plan → falls back to index 0 (then filtered)", async () => {
      // Documents fallback: unknown startFrom → effectiveStartIndex = 0
      // But completedCommitIds still filters
      const res = await fetch(`${server!.url}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectContext: baseProjectContext,
          commitPlan: {
            projectPath: PLAYGROUND_PATH,
            projectName: "playground",
            startFromCommitId: "999",
            completedCommitIds: ["001"],
            commits: [{ id: "001", phase: 0, order: 1, type: "feat", subject: "test1" }],
          },
          providers,
        }),
      });
      expect(res.ok, `Expected 2xx, got ${res.status}`);
      const body = (await res.json()) as { totalCommits: number };
      expect(body.totalCommits === 0, `Expected 0, got ${body.totalCommits}`);
    });

    // ─── Section 3: Analyze errors ──────────────────────────────
    console.log("\n▶ Analyze errors:");

    await test("POST /analyze rejects missing projectPath", async () => {
      const res = await fetch(`${server!.url}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test("POST /analyze on nonexistent path returns empty snapshot or error", async () => {
      const res = await fetch(`${server!.url}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: "/nonexistent/xyz-test" }),
      });
      expect(res.status === 200 || res.status === 500, `Unexpected status: ${res.status}`);
    });

    // ─── Section 4: Execution state ─────────────────────────────
    console.log("\n▶ Execution state:");

    await test("GET /execution/status hasState=false when no state", async () => {
      const res = await fetch(
        `${server!.url}/execution/status?projectPath=${encodeURIComponent("/nonexistent/state-test")}`,
      );
      expect(res.ok, `Expected 2xx, got ${res.status}`);
      const body = (await res.json()) as { hasState: boolean };
      expect(body.hasState === false, "Expected hasState=false");
    });

    await test("GET /execution/status requires projectPath", async () => {
      const res = await fetch(`${server!.url}/execution/status`);
      expect(res.status === 400, `Expected 400, got ${res.status}`);
    });

    // ─── Section 5: Health ──────────────────────────────────────
    console.log("\n▶ Health:");

    await test("GET /health returns ok", async () => {
      const res = await fetch(`${server!.url}/health`);
      expect(res.ok, `Expected 2xx, got ${res.status}`);
      const body = (await res.json()) as { status: string };
      expect(body.status === "ok", `Expected status=ok, got ${body.status}`);
    });

    // ─── Section 6: Pause with real execution ───────────────────
    console.log("\n▶ Pause with real execution (3 commits):");
    console.log("   Plan: 001 completed | 002 startFrom | 003 will be skipped");
    console.log("   Expected: execute 002 only, then pause signal aborts before 003");
    console.log("   Note: 001 and 002 have real AI calls, 003 should NEVER run\n");

    await test("Pause aborts execution after current commit", async () => {
      // Fresh git state for this scenario
      preparePlayground();

      const streamId = `pause-test-${Date.now()}`;
      let sse: SseClient | null = null;

      try {
        sse = await connectSse(`${server!.url}/stream/${streamId}`);

        // Start execute (3 commits, but 001 is completed → skip, 002 is startFrom)
        // Actual execution: 002 then 003 (unless paused)
        const executePromise = fetch(`${server!.url}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectContext: baseProjectContext,
            commitPlan: {
              projectPath: PLAYGROUND_PATH,
              projectName: "playground",
              startFromCommitId: "002",
              completedCommitIds: ["001"],
              commits: [
                { id: "001", phase: 0, order: 1, type: "feat", subject: "add-alpha" },
                { id: "002", phase: 0, order: 2, type: "feat", subject: "add-beta" },
                { id: "003", phase: 0, order: 3, type: "feat", subject: "add-gamma" },
              ],
            },
            streamId,
            providers,
          }),
        });

        // Wait for 002 to START
        console.log("   ⏳ Waiting for commit 002 to start...");
        await sse.waitForEvent("commit_started", 60_000);

        // Send Pause while 002 is running
        console.log("   ⏸  Sending pause signal...");
        const pauseRes = await fetch(`${server!.url}/pause/${streamId}`, {
          method: "POST",
        });
        expect(pauseRes.ok, `Pause failed: ${pauseRes.status}`);
        console.log("   ✅ Pause signal sent");

        // Wait for the pipeline to finish
        await sse.waitForDone(180_000);
        const executeRes = await executePromise;
        expect(executeRes.ok, `Execute failed: ${executeRes.status}`);

        const result = (await executeRes.json()) as {
          success: boolean;
          paused: boolean;
          totalCommits: number;
          successCount: number;
          failedCount: number;
        };

        console.log(
          `   📊 Result: paused=${result.paused}, total=${result.totalCommits}, success=${result.successCount}`,
        );

        // Verify: pipeline stopped after 002
        // totalCommits = 2 (002 and 003 were candidates) but only 002 executed
        expect(result.paused === true, `Expected paused=true, got ${result.paused}`);
        expect(
          result.successCount === 1,
          `Expected 1 success (commit 002), got ${result.successCount}`,
        );

        // Verify commit 003 was NOT executed (no commit_started event for 003)
        const commit003Started = sse.events.some(
          (e) => e.type === "commit_started" && e.commitId === "003",
        );
        expect(!commit003Started, "Commit 003 should NOT have started (paused)");

        console.log("   ✅ Pause correctly aborted after commit 002");
      } finally {
        sse?.close();
      }
    });

    console.log(`\n═══ Results ═══`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log("\n❌ E2E Edge tests FAILED\n");
      process.exitCode = 1;
    } else {
      console.log("\n✅ All E2E Edge tests PASSED\n");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exitCode = 1;
  } finally {
    await server?.close();

    // Reset fixture
    fs.writeFileSync(path.join(PLAYGROUND_PATH, "src", "index.ts"), FIXTURE_INDEX_CONTENT, "utf-8");
  }
}

run();
