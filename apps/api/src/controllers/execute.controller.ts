import { commitPlanSchema, projectContextSchema } from "@commitflow/shared";
import type { Request, Response } from "express";
import { z } from "zod";
import type { CommitExecutionStatus } from "../services/ai/orchestrator.service";
import { OrchestratorService } from "../services/ai/orchestrator.service";
import { SnapshotService } from "../services/snapshot/snapshot.service";
import { SseService } from "../services/sse/sse.service";

/** Validation schema for execute request body */
const executeRequestSchema = z.object({
  projectContext: projectContextSchema,
  commitPlan: commitPlanSchema,
  streamId: z.string().min(1).optional(),
});

/**
 * Execute Controller.
 * Handles POST /execute — the main endpoint for running commit plans.
 */
export class ExecuteController {
  /**
   * Execute a commit plan.
   * Runs commits sequentially and streams progress via SSE.
   */
  async execute(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate request body
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

      const { projectContext, commitPlan, streamId } = parsed.data;
      const sseService = SseService.getInstance();

      // 2. Build snapshot ONCE for the entire plan
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

      // 3. Initialize orchestrator
      const orchestrator = new OrchestratorService(projectContext.projectPath);

      // 4. Broadcast plan start
      if (streamId) {
        sseService.broadcast(streamId, {
          type: "plan_started",
          totalCommits: commitPlan.commits.length,
          projectName: projectContext.projectName,
          timestamp: new Date().toISOString(),
        });
      }

      // 5. Execute commits sequentially
      const results: {
        commitId: string;
        status: CommitExecutionStatus;
        error?: string;
      }[] = [];

      for (const commit of commitPlan.commits) {
        // Broadcast commit start
        if (streamId) {
          sseService.broadcast(streamId, {
            type: "commit_started",
            commitId: commit.id,
            message: `${commit.type}${commit.scope ? `(${commit.scope})` : ""}: ${commit.subject}`,
            timestamp: new Date().toISOString(),
          });
        }

        // Execute single commit
        const result = await orchestrator.executeCommit(
          commit,
          projectContext,
          snapshot,
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

        // Broadcast commit result
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

        // If a commit fails, stop execution
        if (result.status === "failed") {
          break;
        }
      }

      // 6. Broadcast plan completion
      const successCount = results.filter((r) => r.status === "completed").length;
      const failedCount = results.filter((r) => r.status === "failed").length;

      if (streamId) {
        sseService.broadcast(streamId, {
          type: "done",
          totalCommits: commitPlan.commits.length,
          successCount,
          failedCount,
          timestamp: new Date().toISOString(),
        });
      }

      // 7. Send final response
      res.json({
        success: failedCount === 0,
        totalCommits: commitPlan.commits.length,
        successCount,
        failedCount,
        results,
      });
      return;
    } catch (error) {
      // 8. Handle unexpected errors
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({
        success: false,
        error: message,
      });
      return;
    }
  }
}
