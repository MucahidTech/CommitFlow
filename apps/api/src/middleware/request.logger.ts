import type { NextFunction, Request, Response } from "express";

/**
 * Logs each request with method, path, and duration.
 * Uses console for simplicity in development.
 * In production, replace with structured logging (e.g., pino).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();

  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(2);
    const { method, path } = req;
    const { statusCode } = res;

    console.log(`[${new Date().toISOString()}] ${method} ${path} ${statusCode} ${duration}ms`);
  });

  next();
}
