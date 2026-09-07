import { Router, type Router as RouterType } from "express";
import { healthRouter } from "./health.routes";
import { sseRouter } from "./sse.routes";

export const routes: RouterType = Router();

routes.use(healthRouter);
routes.use(sseRouter);
