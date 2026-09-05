import { Router } from "express";

export const healthRouter: Router = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "commitflow-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});
