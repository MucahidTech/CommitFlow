import { Router, type Router as RouterType } from "express";
import { ExecutionController } from "../controllers/execution.controller";

export const executionRouter: RouterType = Router();
const controller = new ExecutionController();

/**
 * Pause a running execution.
 * POST /pause/:sessionId
 */
executionRouter.post("/pause/:sessionId", (req, res) => {
  void controller.pause(req, res);
});

/**
 * Get saved execution status for a project.
 * GET /execution/status?projectPath=...
 */
executionRouter.get("/execution/status", (req, res) => {
  void controller.getStatus(req, res);
});

/**
 * Clear saved execution state.
 * DELETE /execution/state?projectPath=...
 */
executionRouter.delete("/execution/state", (req, res) => {
  void controller.clear(req, res);
});
