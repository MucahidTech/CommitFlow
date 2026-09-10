import { promises as fs } from "node:fs";
import path from "node:path";
import {
  executionProgressSchema,
  type ExecutionProgress,
  type ExecutionStatus,
} from "@commitflow/shared";

/** Subdirectory inside the target project for state files */
const STATE_DIR = ".commitflow";

/** Filename for the current state */
const STATE_FILE = "state.json";

/**
 * Service for persisting execution progress to disk.
 * Uses atomic writes to prevent corruption.
 */
export class ExecutionStateService {
  private readonly projectRoot: string;
  private readonly stateDir: string;
  private readonly stateFilePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.stateDir = path.join(this.projectRoot, STATE_DIR);
    this.stateFilePath = path.join(this.stateDir, STATE_FILE);
  }

  /**
   * Check if a saved execution exists.
   */
  async hasSavedState(): Promise<boolean> {
    try {
      await fs.access(this.stateFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load the saved execution state.
   * Returns null if no state exists.
   */
  async loadState(): Promise<ExecutionProgress | null> {
    try {
      const content = await fs.readFile(this.stateFilePath, "utf-8");
      const parsed = JSON.parse(content);
      const result = executionProgressSchema.safeParse(parsed);

      if (!result.success) {
        return null;
      }

      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Save the execution state.
   * Uses atomic write (temp + rename) to prevent corruption.
   */
  async saveState(progress: ExecutionProgress): Promise<void> {
    // Ensure state directory exists
    await fs.mkdir(this.stateDir, { recursive: true });

    // Update lastUpdatedAt
    const updated: ExecutionProgress = {
      ...progress,
      lastUpdatedAt: new Date().toISOString(),
    };

    // Atomic write
    const tempPath = `${this.stateFilePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(updated, null, 2), "utf-8");
    await fs.rename(tempPath, this.stateFilePath);

    // Ensure .commitflow/ is gitignored
    await this.ensureGitignored();
  }

  /**
   * Clear the saved state.
   */
  async clearState(): Promise<void> {
    try {
      await fs.unlink(this.stateFilePath);
    } catch {
      // Ignore — file might not exist
    }
  }

  /**
   * Update only the status of the saved execution.
   */
  async updateStatus(
    status: ExecutionStatus,
    extras?: {
      pausedAt?: string;
      pauseReason?: string;
    },
  ): Promise<void> {
    const current = await this.loadState();
    if (!current) {
      return;
    }

    const isPaused = status === "paused";

    await this.saveState({
      ...current,
      status,
      pausedAt: isPaused ? (extras?.pausedAt ?? new Date().toISOString()) : undefined,
      pauseReason: isPaused ? (extras?.pauseReason ?? current.pauseReason) : undefined,
    });
  }

  /**
   * Ensure .commitflow/ is listed in .gitignore.
   * Adds the entry if not present.
   */
  private async ensureGitignored(): Promise<void> {
    const gitignorePath = path.join(this.projectRoot, ".gitignore");
    const entry = `${STATE_DIR}/`;

    try {
      let content = "";
      try {
        content = await fs.readFile(gitignorePath, "utf-8");
      } catch {
        // No .gitignore exists — will create one
      }

      // Check if entry already exists (line-aware)
      const lines = content.split("\n").map((l) => l.trim());
      if (lines.includes(entry) || lines.includes(STATE_DIR)) {
        return;
      }

      // Append entry
      const newContent = content
        ? `${content.trimEnd()}\n\n# CommitFlow state\n${entry}\n`
        : `# CommitFlow state\n${entry}\n`;

      await fs.writeFile(gitignorePath, newContent, "utf-8");
    } catch {
      // Ignore — .gitignore creation is best-effort
    }
  }
}
