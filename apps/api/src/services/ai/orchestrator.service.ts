import type { CommitItem, ProjectContext } from "@commitflow/shared";
import type { FileContext, GenerateCodeResponse } from "../../types/ai";
import { FileService } from "../filesystem/file.service";
import { GitService } from "../git/git.service";
import { QualityGateService } from "../quality/quality-gate.service";
import { DeepSeekService } from "./deepseek.service";
import { OpenRouterService } from "./openrouter.service";
import { parseTsErrors, parseFormatErrors, formatErrorsForAi } from "../quality/error-parser";

export type CommitExecutionStatus =
  | "reading_files"
  | "generating_code"
  | "reviewing_code"
  | "refining_code"
  | "writing_files"
  | "running_quality_gate"
  | "committing"
  | "completed"
  | "failed";

export interface CommitExecutionResult {
  commitId: string;
  status: CommitExecutionStatus;
  filesWritten: string[];
  commitHash?: string;
  error?: string;
  attempts: number;
}

export type StatusCallback = (
  status: CommitExecutionStatus,
  attempt: number,
  message?: string,
) => void;

const MAX_ATTEMPTS = 3;

export class OrchestratorService {
  private readonly deepseek: DeepSeekService;
  private readonly openrouter: OpenRouterService;
  private readonly fileService: FileService;
  private readonly gitService: GitService;
  private readonly qualityGate: QualityGateService;

  constructor(projectRoot: string) {
    this.deepseek = new DeepSeekService();
    this.openrouter = new OpenRouterService();
    this.fileService = new FileService(projectRoot);
    this.gitService = new GitService(projectRoot);
    this.qualityGate = new QualityGateService(projectRoot);
  }

  async executeCommit(
    commit: CommitItem,
    projectContext: ProjectContext,
    onStatusChange?: StatusCallback,
  ): Promise<CommitExecutionResult> {
    const isGit = await this.gitService.isGitRepository();
    if (!isGit) {
      onStatusChange?.("reading_files", 0, "Initializing git repository...");
      await this.gitService.initializeRepository();
      onStatusChange?.("reading_files", 0, "Git repository initialized");
    }

    let attempts = 0;
    let lastReviewFeedback: string | undefined;
    let lastReviewIssues: string[] | undefined;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;

      onStatusChange?.("reading_files", attempts);
      const fileContexts = await this.readProjectFiles();

      onStatusChange?.(attempts === 1 ? "generating_code" : "refining_code", attempts);
      const generated = await this.deepseek.generateCode({
        commitId: commit.id,
        commitMessage: this.formatCommitMessage(commit),
        projectContext: {
          projectPath: projectContext.projectPath,
          projectName: projectContext.projectName,
          description: projectContext.description,
          techStack: projectContext.techStack ?? [],
        },
        files: fileContexts,
        previousFeedback: lastReviewFeedback,
        previousIssues: lastReviewIssues,
      });

      onStatusChange?.("reviewing_code", attempts);
      const review = await this.openrouter.reviewCode({
        commitId: commit.id,
        commitMessage: this.formatCommitMessage(commit),
        projectContext: {
          projectPath: projectContext.projectPath,
          projectName: projectContext.projectName,
          description: projectContext.description,
          techStack: projectContext.techStack ?? [],
        },
        files: generated.files,
        generationSummary: generated.summary,
      });

      if (!review.approved) {
        lastReviewFeedback = review.feedback;
        lastReviewIssues = review.issues;

        if (attempts >= MAX_ATTEMPTS) {
          return {
            commitId: commit.id,
            status: "failed",
            filesWritten: [],
            error: `Review rejected after ${attempts} attempts: ${review.feedback}`,
            attempts,
          };
        }
        continue;
      }

      onStatusChange?.("writing_files", attempts);
      const { paths: writtenPaths, backups } = await this.writeFiles(generated);

      onStatusChange?.("running_quality_gate", attempts);
      const qualityResult = await this.qualityGate.run();

      if (!qualityResult.passed) {
        const tsErrors = parseTsErrors(qualityResult.typecheck.output, projectContext.projectPath);
        const formatErrors = parseFormatErrors(qualityResult.format.output);
        const formattedFeedback = formatErrorsForAi(tsErrors, formatErrors);

        console.warn(
          `Quality gate failed for commit ${commit.id} (attempt ${attempts}):\n${formattedFeedback}`,
        );

        lastReviewFeedback = formattedFeedback;
        lastReviewIssues = undefined;

        onStatusChange?.(
          "refining_code",
          attempts,
          `Quality gate failed (${tsErrors.length} TS errors). Retrying with feedback...`,
        );

        await this.rollbackFiles(backups);

        if (attempts >= MAX_ATTEMPTS) {
          return {
            commitId: commit.id,
            status: "failed",
            filesWritten: [],
            error: `Quality gate failed after ${attempts} attempts:\n${formattedFeedback}`,
            attempts,
          };
        }

        continue;
      }

      onStatusChange?.("committing", attempts);
      const commitResult = await this.commitFiles(
        writtenPaths,
        this.formatCommitMessage(commit),
        projectContext.safeMode,
      );

      onStatusChange?.("completed", attempts);
      return {
        commitId: commit.id,
        status: "completed",
        filesWritten: writtenPaths,
        commitHash: commitResult.hash,
        attempts,
      };
    }

    return {
      commitId: commit.id,
      status: "failed",
      filesWritten: [],
      error: "Maximum attempts reached",
      attempts,
    };
  }

  private async readProjectFiles(): Promise<FileContext[]> {
    const filePaths = await this.fileService.listFiles();
    return this.fileService.readFiles(filePaths);
  }

  private async writeFiles(generated: GenerateCodeResponse): Promise<{
    paths: string[];
    backups: Map<string, string | null>;
  }> {
    const paths: string[] = [];
    const backups = new Map<string, string | null>();

    for (const file of generated.files) {
      const original = await this.fileService.readFile(file.path);
      backups.set(file.path, original.exists ? original.content : null);

      if (file.operation === "delete") {
        await this.fileService.deleteFile(file.path);
      } else {
        await this.fileService.writeFile(file.path, file.content);
      }
      paths.push(file.path);
    }

    return { paths, backups };
  }

  private async rollbackFiles(backups: Map<string, string | null>): Promise<void> {
    for (const [path, content] of backups) {
      if (content === null) {
        await this.fileService.deleteFile(path);
      } else {
        await this.fileService.writeFile(path, content);
      }
    }
  }

  private async commitFiles(
    filePaths: string[],
    message: string,
    safeMode: boolean,
  ): Promise<{ executed: boolean; hash?: string }> {
    if (filePaths.length === 0) {
      return { executed: false };
    }

    await this.gitService.stageFiles(filePaths);
    const result = await this.gitService.commit(message, safeMode);

    return {
      executed: result.executed,
      hash: result.hash,
    };
  }

  private formatCommitMessage(commit: CommitItem): string {
    const scope = commit.scope ? `(${commit.scope})` : "";
    return `${commit.type}${scope}: ${commit.subject}`;
  }
}
