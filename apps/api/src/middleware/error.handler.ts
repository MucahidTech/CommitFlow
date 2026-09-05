import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/**
 * Global error handler.
 * Catches all errors and returns a consistent JSON response.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Handle known errors
  if (err instanceof Error) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Unknown errors
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
}
