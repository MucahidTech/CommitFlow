import { Router, type Router as RouterType } from "express";
import { ModelsController } from "../controllers/models.controller";

export const modelsRouter: RouterType = Router();
const controller = new ModelsController();

modelsRouter.get("/models", (req, res) => {
  void controller.list(req, res);
});
