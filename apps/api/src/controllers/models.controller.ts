import type { Request, Response } from "express";
import { ModelsFetcherService } from "../services/ai/models-fetcher.service";

export class ModelsController {
  private readonly fetcher = new ModelsFetcherService();

  /**
   * GET /models
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const requireTools = req.query.requireTools !== "false";
      const models = await this.fetcher.fetchFreeModels({ requireTools });

      res.json({
        success: true,
        models,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch models";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
}
