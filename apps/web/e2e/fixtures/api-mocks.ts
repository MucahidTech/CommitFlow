import type { Page } from "@playwright/test";

/**
 * Route interception fixtures for Playwright E2E tests.
 *
 * The web dashboard makes several HTTP calls. We mock them
 * to make tests fast, deterministic, and independent of AI APIs.
 */

export interface MockOptions {
  /** Whether /analyze should succeed */
  analyzeSuccess?: boolean;
  /** Whether /execute should succeed */
  executeSuccess?: boolean;
  /** Simulated SSE event delay (ms) */
  sseDelay?: number;
}

const DEFAULT_OPTIONS: Required<MockOptions> = {
  analyzeSuccess: true,
  executeSuccess: true,
  sseDelay: 50,
};

/**
 * Set up all API mocks on the given page.
 * Call this BEFORE navigating to the page.
 */
export async function setupApiMocks(page: Page, options: MockOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // POST /analyze
  await page.route("**/analyze", async (route) => {
    if (!opts.analyzeSuccess) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Analysis failed" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        snapshot: {
          projectPath: "/tmp/test-project",
          projectName: "test-project",
          techStack: ["typescript", "node"],
          structure: [{ path: "src/index.ts", size: 100, extension: ".ts" }],
          git: {
            currentBranch: "main",
            totalCommits: 5,
            recentCommits: ["initial", "feat: add"],
          },
          config: { otherConfigs: {} },
          keyFiles: [],
          createdAt: new Date().toISOString(),
          version: 1,
        },
      }),
    });
  });

  // GET /execution/status
  await page.route("**/execution/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, hasState: false, progress: null }),
    });
  });

  // POST /execute — mock returns final summary (SSE mocks handle events)
  await page.route("**/execute", async (route) => {
    await new Promise((r) => setTimeout(r, opts.sseDelay * 3));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: opts.executeSuccess,
        paused: false,
        totalCommits: 2,
        successCount: opts.executeSuccess ? 2 : 0,
        failedCount: opts.executeSuccess ? 0 : 2,
        results: [],
      }),
    });
  });

  // SSE /stream/:id — stream a scripted sequence
  await page.route("**/stream/**", async (route) => {
    const events = opts.executeSuccess
      ? [
          { type: "connected", timestamp: new Date().toISOString() },
          { type: "plan_started", totalCommits: 2, skippedCommits: 0 },
          { type: "commit_started", commitId: "001", message: "feat: alpha" },
          {
            type: "status",
            commitId: "001",
            status: "generating_code",
            attempt: 1,
          },
          {
            type: "commit_result",
            commitId: "001",
            status: "completed",
            filesWritten: ["src/index.ts"],
            attempts: 1,
          },
          { type: "commit_started", commitId: "002", message: "feat: beta" },
          {
            type: "commit_result",
            commitId: "002",
            status: "completed",
            filesWritten: ["src/utils.ts"],
            attempts: 1,
          },
          {
            type: "done",
            totalCommits: 2,
            successCount: 2,
            failedCount: 0,
          },
        ]
      : [
          { type: "connected" },
          { type: "plan_started", totalCommits: 1 },
          { type: "commit_started", commitId: "001", message: "feat: alpha" },
          {
            type: "commit_result",
            commitId: "001",
            status: "failed",
            filesWritten: [],
            attempts: 3,
            error: "AI model rejected the code",
          },
          { type: "done", totalCommits: 1, successCount: 0, failedCount: 1 },
        ];

    const sseBody = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: sseBody,
    });
  });

  // POST /pause/:id
  await page.route("**/pause/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "Pause signal sent" }),
    });
  });

  // DELETE /execution/state
  await page.route("**/execution/state**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "State cleared" }),
    });
  });
}

/**
 * Pre-seed localStorage with default provider config.
 * Must be called before page.goto().
 */
export async function seedProviderConfig(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      "commitflow:providers",
      JSON.stringify({
        generator: { provider: "deepseek", apiKey: "sk-test-generator" },
        reviewer: { provider: "groq", apiKey: "gsk-test-reviewer" },
      }),
    );
  });
}
