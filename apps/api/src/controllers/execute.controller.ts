import { commitPlanSchema, projectContextSchema, providersConfigSchema } from "@commitflow/shared";

import type { Request, Response } from "express";
import { z } from "zod";
import type { CommitExecutionStatus } from "../services/ai/orchestrator.service";
import { OrchestratorService } from "../services/ai/orchestrator.service";
import { ExecutionRegistry } from "../services/execution/registry.service";
import { SnapshotService } from "../services/snapshot/snapshot.service";
import { SseService } from "../services/sse/sse.service";

/** Validation schema for execute request body */
const executeRequestSchema = z.object({
  projectContext: projectContextSchema,
  commitPlan: commitPlanSchema,
  streamId: z.string().min(1).optional(),
  providers: providersConfigSchema,
});

/**
 * Execute Controller.
 * Handles POST /execute — the main endpoint for running commit plans.
 */
export class ExecuteController {
  private readonly registry = ExecutionRegistry.getInstance();

  /**
   * Execute a commit plan.
   * Runs commits sequentially and streams progress via SSE.
   */
  async execute(req: Request, res: Response): Promise<void> {
    const parsed = executeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parsed.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const { projectContext, commitPlan, streamId, providers } = parsed.data;
    const sseService = SseService.getInstance();

    // Build snapshot ONCE for the entire plan
    if (streamId) {
      sseService.broadcast(streamId, {
        type: "snapshot_started",
        timestamp: new Date().toISOString(),
      });
    }

    const snapshotService = new SnapshotService(projectContext.projectPath);
    const snapshot = await snapshotService.buildSnapshot();

    if (streamId) {
      sseService.broadcast(streamId, {
        type: "snapshot_completed",
        projectName: snapshot.projectName,
        techStack: snapshot.techStack,
        fileCount: snapshot.structure.length,
        keyFileCount: snapshot.keyFiles.length,
        hasGit: snapshot.git !== null,
        timestamp: new Date().toISOString(),
      });
    }

    const orchestrator = new OrchestratorService(projectContext.projectPath);

    // Filter commits to execute (skip completed + before startFrom)
    const completedSet = new Set(commitPlan.completedCommitIds ?? []);
    const startIndex = commitPlan.startFromCommitId
      ? commitPlan.commits.findIndex((c) => c.id === commitPlan.startFromCommitId)
      : 0;
    const effectiveStartIndex = startIndex >= 0 ? startIndex : 0;

    const commitsToExecute = commitPlan.commits.filter((commit, index) => {
      if (completedSet.has(commit.id)) return false;
      if (index < effectiveStartIndex) return false;
      return true;
    });

    if (streamId) {
      sseService.broadcast(streamId, {
        type: "plan_started",
        totalCommits: commitsToExecute.length,
        skippedCommits: commitPlan.commits.length - commitsToExecute.length,
        projectName: projectContext.projectName,
        timestamp: new Date().toISOString(),
      });
    }

    // Register session for cooperative cancellation (pause)
    const sessionId = streamId ?? `session-${Date.now()}`;
    const controller = this.registry.register(sessionId);

    const results: {
      commitId: string;
      status: CommitExecutionStatus;
      error?: string;
    }[] = [];

    try {
      for (const commit of commitsToExecute) {
        // Check pause signal before starting next commit
        if (controller.signal.aborted) {
          if (streamId) {
            sseService.broadcast(streamId, {
              type: "status",
              commitId: commit.id,
              status: "paused",
              attempt: 0,
              message: "Execution paused by user",
              timestamp: new Date().toISOString(),
            });
          }
          break;
        }

        if (streamId) {
          sseService.broadcast(streamId, {
            type: "commit_started",
            commitId: commit.id,
            message: `${commit.type}${commit.scope ? `(${commit.scope})` : ""}: ${commit.subject}`,
            timestamp: new Date().toISOString(),
          });
        }

        const result = await orchestrator.executeCommit(
          commit,
          projectContext,
          snapshot,
          providers,
          (status, attempt, message) => {
            if (streamId) {
              sseService.broadcast(streamId, {
                type: "status",
                commitId: commit.id,
                status,
                attempt,
                message,
                timestamp: new Date().toISOString(),
              });
            }
          },
        );

        results.push({
          commitId: result.commitId,
          status: result.status,
          error: result.error,
        });

        if (streamId) {
          sseService.broadcast(streamId, {
            type: "commit_result",
            commitId: result.commitId,
            status: result.status,
            filesWritten: result.filesWritten,
            attempts: result.attempts,
            error: result.error,
            timestamp: new Date().toISOString(),
          });
        }

        if (result.status === "failed") {
          break;
        }
      }
    } finally {
      // Always unregister the session, even on error
      this.registry.unregister(sessionId);
    }

    const successCount = results.filter((r) => r.status === "completed").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    const wasPaused = controller.signal.aborted;

    if (streamId) {
      sseService.broadcast(streamId, {
        type: "done",
        totalCommits: commitsToExecute.length,
        successCount,
        failedCount,
        paused: wasPaused,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: failedCount === 0,
      paused: wasPaused,
      totalCommits: commitsToExecute.length,
      successCount,
      failedCount,
      results,
    });
    return;
  }
}
