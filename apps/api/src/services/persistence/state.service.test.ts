import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ExecutionStateService } from "./state.service";
import type { ExecutionProgress } from "@commitflow/shared";

describe("ExecutionStateService", () => {
  let tempDir: string;
  let service: ExecutionStateService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "commitflow-state-"));
    service = new ExecutionStateService(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const createValidProgress = (): ExecutionProgress => ({
    id: "session-test",
    status: "running",
    projectContext: {
      projectPath: tempDir,
      projectName: "test-project",
      techStack: [],
      existingFiles: [],
      safeMode: true,
    },
    commitPlan: {
      projectPath: tempDir,
      projectName: "test-project",
      completedCommitIds: [],
      commits: [
        {
          id: "001",
          phase: 0,
          order: 1,
          type: "feat",
          subject: "add feature",
          status: "pending",
        },
      ],
    },
    snapshot: null,
    results: [],
    nextCommitIndex: 0,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  });

  describe("hasSavedState", () => {
    it("returns false when no state exists", async () => {
      expect(await service.hasSavedState()).toBe(false);
    });

    it("returns true after saving state", async () => {
      await service.saveState(createValidProgress());
      expect(await service.hasSavedState()).toBe(true);
    });
  });

  describe("saveState and loadState", () => {
    it("saves and loads state correctly", async () => {
      const progress = createValidProgress();
      await service.saveState(progress);

      const loaded = await service.loadState();
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe("session-test");
      expect(loaded?.status).toBe("running");
    });

    it("updates lastUpdatedAt on save", async () => {
      const progress = createValidProgress();
      const originalUpdatedAt = progress.lastUpdatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.saveState(progress);

      const loaded = await service.loadState();
      expect(loaded?.lastUpdatedAt).not.toBe(originalUpdatedAt);
    });

    it("returns null when no state file exists", async () => {
      const loaded = await service.loadState();
      expect(loaded).toBeNull();
    });

    it("returns null when state file is corrupted", async () => {
      const stateDir = path.join(tempDir, ".commitflow");
      await writeFile(path.join(stateDir, "..", "invalid-test.txt"), "x");

      // Write invalid JSON directly
      const fs = await import("node:fs/promises");
      await fs.mkdir(stateDir, { recursive: true });
      await fs.writeFile(path.join(stateDir, "state.json"), "not-json");

      const loaded = await service.loadState();
      expect(loaded).toBeNull();
    });
  });

  describe("clearState", () => {
    it("removes saved state", async () => {
      await service.saveState(createValidProgress());
      expect(await service.hasSavedState()).toBe(true);

      await service.clearState();
      expect(await service.hasSavedState()).toBe(false);
    });

    it("does not throw when no state exists", async () => {
      await expect(service.clearState()).resolves.toBeUndefined();
    });
  });

  describe("updateStatus", () => {
    it("updates status when state exists", async () => {
      await service.saveState(createValidProgress());
      await service.updateStatus("paused", { pauseReason: "manual" });

      const loaded = await service.loadState();
      expect(loaded?.status).toBe("paused");
      expect(loaded?.pauseReason).toBe("manual");
    });

    it("does nothing when no state exists", async () => {
      await expect(service.updateStatus("paused")).resolves.toBeUndefined();
    });
  });

  describe("ensureGitignored", () => {
    it("creates .gitignore when missing", async () => {
      await service.saveState(createValidProgress());

      const fs = await import("node:fs/promises");
      const gitignore = await fs.readFile(path.join(tempDir, ".gitignore"), "utf-8");
      expect(gitignore).toContain(".commitflow/");
    });

    it("appends to existing .gitignore", async () => {
      const fs = await import("node:fs/promises");
      await fs.writeFile(path.join(tempDir, ".gitignore"), "node_modules/\ndist/\n");

      await service.saveState(createValidProgress());

      const gitignore = await fs.readFile(path.join(tempDir, ".gitignore"), "utf-8");
      expect(gitignore).toContain("node_modules/");
      expect(gitignore).toContain(".commitflow/");
    });

    it("does not duplicate .commitflow entry", async () => {
      const fs = await import("node:fs/promises");
      await fs.writeFile(path.join(tempDir, ".gitignore"), ".commitflow/\n");

      await service.saveState(createValidProgress());
      await service.saveState(createValidProgress());

      const gitignore = await fs.readFile(path.join(tempDir, ".gitignore"), "utf-8");
      const matches = gitignore.match(/\.commitflow\//g);
      expect(matches).toHaveLength(1);
    });
  });
});
