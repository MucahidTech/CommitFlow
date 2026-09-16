import type { Page } from "@playwright/test";

/**
 * Route interception fixtures for Playwright E2E tests.
 * Provides configurable mock responses for all API endpoints.
 */

export interface MockOptions {
  /** /analyze behavior */
  analyze?: "success" | "error" | "empty";
  /** /execute final response */
  execute?: "success" | "failed" | "paused";
  /** /execution/status saved state */
  savedState?: "none" | "paused" | "completed";
  /** /pause/:id response */
  pause?: "success" | "not-found";
  /** SSE stream mode */
  sse?: "success" | "failed" | "pause-requested" | "multi-commit";
}

const DEFAULT_OPTIONS: Required<MockOptions> = {
  analyze: "success",
  execute: "success",
  savedState: "none",
  pause: "success",
  sse: "success",
};

/**
 * Set up all API mocks on the given page.
 * Must be called before page.goto().
 */
export async function setupApiMocks(page: Page, options: MockOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // ─── POST /analyze ────────────────────────────────────────
  await page.route("**/analyze", async (route) => {
    if (opts.analyze === "error") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Analysis failed" }),
      });
      return;
    }

    const techStack = opts.analyze === "empty" ? [] : ["typescript", "node"];
    const structure =
      opts.analyze === "empty"
        ? []
        : [
            { path: "src/index.ts", size: 100, extension: ".ts" },
            { path: "package.json", size: 200, extension: ".json" },
          ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        snapshot: {
          projectPath: "/tmp/test-project",
          projectName: "test-project",
          techStack,
          structure,
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

  // ─── GET /execution/status ────────────────────────────────
  await page.route("**/execution/status**", async (route) => {
    if (opts.savedState === "none") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, hasState: false, progress: null }),
      });
      return;
    }

    const progress = {
      id: "session-test",
      status: opts.savedState,
      nextCommitIndex: 1,
      results: [
        {
          commitId: "001",
          status: "completed",
          attempts: 1,
          filesWritten: ["src/index.ts"],
        },
      ],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      ...(opts.savedState === "paused"
        ? { pausedAt: new Date().toISOString(), pauseReason: "manual" }
        : {}),
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, hasState: true, progress }),
    });
  });

  // ─── POST /execute ────────────────────────────────────────
  await page.route("**/execute", async (route) => {
    // Long delay so the UI stays in "isExecuting" state long enough
    // to test Pause button interactions
    await new Promise((r) => setTimeout(r, 5000));

    const responses = {
      success: {
        success: true,
        paused: false,
        totalCommits: 2,
        successCount: 2,
        failedCount: 0,
      },
      failed: {
        success: false,
        paused: false,
        totalCommits: 1,
        successCount: 0,
        failedCount: 1,
      },
      paused: {
        success: true,
        paused: true,
        totalCommits: 3,
        successCount: 1,
        failedCount: 0,
      },
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responses[opts.execute]),
    });
  });

  // ─── SSE /stream/:id ──────────────────────────────────────
  await page.route("**/stream/**", async (route) => {
    const events = buildSseEvents(opts.sse);
    const sseBody = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: sseBody,
    });
  });

  // ─── POST /pause/:id ──────────────────────────────────────
  await page.route("**/pause/**", async (route) => {
    if (opts.pause === "not-found") {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Session not found" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "Pause signal sent" }),
    });
  });

  // ─── DELETE /execution/state ──────────────────────────────
  await page.route("**/execution/state**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "State cleared" }),
    });
  });
}

/**
 * Build the SSE event sequence based on the requested mode.
 */
function buildSseEvents(mode: Required<MockOptions>["sse"]): Record<string, unknown>[] {
  const now = new Date().toISOString();

  switch (mode) {
    case "failed":
      return [
        { type: "connected", timestamp: now },
        { type: "plan_started", totalCommits: 1, skippedCommits: 0 },
        { type: "commit_started", commitId: "001", message: "feat: alpha" },
        {
          type: "status",
          commitId: "001",
          status: "generating_code",
          attempt: 1,
          message: "Generating code (attempt 1)",
        },
        {
          type: "commit_result",
          commitId: "001",
          status: "failed",
          filesWritten: [],
          attempts: 3,
          error: "AI model rejected the code after 3 attempts",
        },
        { type: "done", totalCommits: 1, successCount: 0, failedCount: 1 },
      ];

    case "pause-requested":
      return [
        { type: "connected", timestamp: now },
        { type: "plan_started", totalCommits: 3, skippedCommits: 0 },
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
        {
          type: "status",
          commitId: "002",
          status: "paused",
          attempt: 0,
          message: "Execution paused by user",
        },
        { type: "done", totalCommits: 3, successCount: 1, failedCount: 0 },
      ];

    case "multi-commit":
      return [
        { type: "connected", timestamp: now },
        { type: "plan_started", totalCommits: 3, skippedCommits: 0 },
        ...buildCommitEvents("001", "feat: alpha"),
        ...buildCommitEvents("002", "fix: beta"),
        ...buildCommitEvents("003", "docs: gamma"),
        { type: "done", totalCommits: 3, successCount: 3, failedCount: 0 },
      ];

    case "success":
    default:
      return [
        { type: "connected", timestamp: now },
        { type: "plan_started", totalCommits: 2, skippedCommits: 0 },
        ...buildCommitEvents("001", "feat: alpha"),
        ...buildCommitEvents("002", "feat: beta"),
        { type: "done", totalCommits: 2, successCount: 2, failedCount: 0 },
      ];
  }
}

function buildCommitEvents(commitId: string, message: string): Record<string, unknown>[] {
  return [
    { type: "commit_started", commitId, message },
    {
      type: "status",
      commitId,
      status: "generating_code",
      attempt: 1,
      message: `Generating code (attempt 1)`,
    },
    {
      type: "commit_result",
      commitId,
      status: "completed",
      filesWritten: ["src/index.ts"],
      attempts: 1,
    },
  ];
}

/**
 * Pre-seed localStorage with default provider config.
 * Must be called before page.goto().
 */
export async function seedProviderConfig(
  page: Page,
  config: { provider: string; apiKey: string } = { provider: "deepseek", apiKey: "sk-test" },
): Promise<void> {
  await page.addInitScript((cfg) => {
    localStorage.setItem(
      "commitflow:providers",
      JSON.stringify({
        generator: { provider: cfg.provider, apiKey: cfg.apiKey },
        reviewer: { provider: "groq", apiKey: "gsk-test" },
      }),
    );
  }, config);
}
