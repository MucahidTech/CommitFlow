import path from "node:path";
import simpleGit, { type SimpleGit, type StatusResult } from "simple-git";

export interface CommitResult {
  executed: boolean;
  hash?: string;
  message: string;
}

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
   * Initialize a git repository if none exists.
   * Also creates an initial commit if the repo is empty.
   */
  async initializeRepository(): Promise<void> {
    const isRepo = await this.isGitRepository();
    if (!isRepo) {
      await this.git.init();
    }

    // Create initial commit if repo has no commits yet
    const hasCommits = await this.hasAnyCommits();
    if (!hasCommits) {
      await this.git.add(".");
      await this.git.commit("chore: initial commit");
    }
  }

  /**
   * Check if the repository has any commits.
   */
  private async hasAnyCommits(): Promise<boolean> {
    try {
      const result = await this.git.revparse(["HEAD"]);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  // ... باقي الدوال بدون تغيير
  async getStatus(): Promise<StatusResult> {
    return this.git.status();
  }

  async stageFiles(files: string[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    await this.git.add(files);
  }

  async stageAll(): Promise<void> {
    await this.git.add(".");
  }

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

  async getDiff(): Promise<string> {
    return this.git.diff();
  }

  async getStagedDiff(): Promise<string> {
    return this.git.diff(["--cached"]);
  }

  async hasChanges(): Promise<boolean> {
    const status = await this.git.status();
    return status.files.length > 0 || status.staged.length > 0 || status.not_added.length > 0;
  }

  async getCurrentBranch(): Promise<string> {
    return this.git.revparse(["--abbrev-ref", "HEAD"]);
  }

  async getLastCommitHash(): Promise<string> {
    return this.git.revparse(["HEAD"]);
  }
}
