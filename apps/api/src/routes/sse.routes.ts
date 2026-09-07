import { Router, type Router as RouterType } from "express";
import { SseController } from "../controllers/sse.controller";

export const sseRouter: RouterType = Router();
const sseController = new SseController();

/**
 * Open SSE connection for streaming execution progress.
 * GET /stream/:streamId
 */
sseRouter.get("/stream/:streamId", (req, res) => {
  sseController.openStream(req, res);
});
