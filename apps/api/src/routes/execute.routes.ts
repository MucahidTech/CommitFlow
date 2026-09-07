import { Router, type Router as RouterType } from "express";
import { ExecuteController } from "../controllers/execute.controller";

export const executeRouter: RouterType = Router();
const executeController = new ExecuteController();

/**
 * Execute a commit plan.
 * POST /execute
 * Body: { projectContext, commitPlan, streamId? }
 */
executeRouter.post("/execute", (req, res) => {
  void executeController.execute(req, res);
});
