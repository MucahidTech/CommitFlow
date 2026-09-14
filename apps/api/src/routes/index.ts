import { Router, type Router as RouterType } from "express";
import { analyzeRouter } from "./analyze.routes";
import { healthRouter } from "./health.routes";
import { sseRouter } from "./sse.routes";
import { executeRouter } from "./execute.routes";
import { executionRouter } from "./execution.routes";

export const routes: RouterType = Router();

routes.use(healthRouter);
routes.use(sseRouter);
routes.use(executeRouter);
routes.use(analyzeRouter);
routes.use(executionRouter);
