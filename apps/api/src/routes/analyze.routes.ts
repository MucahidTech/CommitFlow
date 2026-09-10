import { Router, type Router as RouterType } from "express";
import { AnalyzeController } from "../controllers/analyze.controller";

export const analyzeRouter: RouterType = Router();
const analyzeController = new AnalyzeController();

/**
 * Analyze a project directory to build a snapshot.
 * POST /analyze
 * Body: { projectPath: string }
 */
analyzeRouter.post("/analyze", (req, res) => {
  void analyzeController.analyze(req, res);
});
