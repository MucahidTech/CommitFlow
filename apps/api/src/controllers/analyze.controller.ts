import type { Request, Response } from "express";
import { z } from "zod";
import { SnapshotService } from "../services/snapshot/snapshot.service";

const analyzeRequestSchema = z.object({
  projectPath: z.string().min(1, "Project path is required"),
});

/**
 * Analyze Controller.
 * Handles POST /analyze — builds a project snapshot for a given path.
 */
export class AnalyzeController {
  async analyze(req: Request, res: Response): Promise<void> {
    try {
      const parsed = analyzeRequestSchema.safeParse(req.body);

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

      const { projectPath } = parsed.data;

      const snapshotService = new SnapshotService(projectPath);
      const snapshot = await snapshotService.buildSnapshot();

      res.json({
        success: true,
        snapshot,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({
        success: false,
        error: message,
      });
      return;
    }
  }
}
