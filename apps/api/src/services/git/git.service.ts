import path from "node:path";
import simpleGit, { type SimpleGit, type StatusResult } from "simple-git";

/** Result of a commit operation */
export interface CommitResult {
  /** Whether the commit was actually executed */
  executed: boolean;
  /** The commit hash (if executed) */
  hash?: string;
  /** Human-readable status message */
  message: string;
}

/**
 * Git service for executing git operations on the target project.
 * Uses simple-git for safe and structured git interactions.
 */
export class GitService {
  private readonly git: SimpleGit;
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.git = simpleGit(this.projectRoot);
  }

  /**
   * Check if the project root is a git repository.
   */
  async isGitRepository(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch {
      return false;
    }
  }

  /**
   * Get the current git status.
   */
  async getStatus(): Promise<StatusResult> {
    return this.git.status();
  }

  /**
   * Stage specific files for commit.
   */
  async stageFiles(files: string[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    await this.git.add(files);
  }

  /**
   * Stage all changes.
   */
  async stageAll(): Promise<void> {
    await this.git.add(".");
  }

  /**
   * Execute a commit.
   * If safeMode is true, returns without executing.
   */
  async commit(message: string, safeMode: boolean): Promise<CommitResult> {
    if (safeMode) {
      return {
        executed: false,
        message: `Safe mode: commit skipped for "${message}"`,
      };
    }

    const result = await this.git.commit(message);
    return {
      executed: true,
      hash: result.commit,
      message: `Commit created: ${result.commit}`,
    };
  }

  /**
   * Get the diff of current changes.
   * Useful for review before committing.
   */
  async getDiff(): Promise<string> {
    return this.git.diff();
  }

  /**
   * Get the diff of staged changes.
   */
  async getStagedDiff(): Promise<string> {
    return this.git.diff(["--cached"]);
  }

  /**
   * Check if there are any changes to commit.
   */
  async hasChanges(): Promise<boolean> {
    const status = await this.git.status();
    return status.files.length > 0 || status.staged.length > 0 || status.not_added.length > 0;
  }

  /**
   * Get the current branch name.
   */
  async getCurrentBranch(): Promise<string> {
    return this.git.revparse(["--abbrev-ref", "HEAD"]);
  }

  /**
   * Get the last commit hash (for reference).
   */
  async getLastCommitHash(): Promise<string> {
    return this.git.revparse(["HEAD"]);
  }
}
