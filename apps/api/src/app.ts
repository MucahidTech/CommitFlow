import express, { type Express } from "express";
import cors from "cors";
import { requestLogger } from "./middleware/request.logger";
import { errorHandler } from "./middleware/error.handler";
import { routes } from "./routes";

/**
 * Create and configure the Express application.
 * Separated from the server entry point for testability.
 */
export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.use("/", routes);

  app.use(errorHandler);

  return app;
}
