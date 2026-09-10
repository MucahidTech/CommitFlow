import type { Request, Response } from "express";
import { z } from "zod";
import { ExecutionRegistry } from "../services/execution/registry.service";
import { ExecutionStateService } from "../services/persistence/state.service";

const sessionIdSchema = z.string().min(1).max(200);

const statusQuerySchema = z.object({
  projectPath: z.string().min(1),
});

/**
 * Execution Control Controller.
 * Handles pause, status, and clear endpoints.
 */
export class ExecutionController {
  private readonly registry = ExecutionRegistry.getInstance();

  /**
   * Pause a running execution.
   * POST /pause/:sessionId
   */
  async pause(req: Request, res: Response): Promise<void> {
    try {
      const parsed = sessionIdSchema.safeParse(req.params.sessionId);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid session ID",
        });
        return;
      }

      const sessionId = parsed.data;

      const exists = this.registry.has(sessionId);
      if (!exists) {
        res.status(404).json({
          success: false,
          error: "Session is not active",
        });
        return;
      }

      const aborted = this.registry.abort(sessionId);

      res.json({
        success: aborted,
        message: aborted
          ? "Pause signal sent. Execution will stop after current commit."
          : "Failed to send pause signal.",
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, error: message });
      return;
    }
  }

  /**
   * Get the saved execution status for a project.
   * GET /execution/status?projectPath=...
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const parsed = statusQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "projectPath query parameter is required",
        });
        return;
      }

      const { projectPath } = parsed.data;
      const stateService = new ExecutionStateService(projectPath);

      const hasState = await stateService.hasSavedState();
      if (!hasState) {
        res.json({
          success: true,
          hasState: false,
          progress: null,
        });
        return;
      }

      const progress = await stateService.loadState();
      res.json({
        success: true,
        hasState: true,
        progress,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, error: message });
      return;
    }
  }

  /**
   * Clear a saved execution.
   * DELETE /execution/state?projectPath=...
   */
  async clear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = statusQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "projectPath query parameter is required",
        });
        return;
      }

      const { projectPath } = parsed.data;
      const stateService = new ExecutionStateService(projectPath);
      await stateService.clearState();

      res.json({ success: true, message: "Execution state cleared." });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ success: false, error: message });
      return;
    }
  }
}
