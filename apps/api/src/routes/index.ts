import { Router, type Router as RouterType } from "express";
import { healthRouter } from "./health.routes";

export const routes: RouterType = Router();

routes.use(healthRouter);
