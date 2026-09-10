import { z } from "zod";

/**
 * OpenRouter model summary — the fields we care about.
 * Full model has ~30 fields; we keep only what's needed.
 */
export const openRouterModelSchema = z.object({
  /** Model ID used in API requests (e.g., "cohere/north-mini-code:free") */
  id: z.string().min(1),

  /** Human-readable name (e.g., "Cohere: North Mini Code") */
  name: z.string().min(1),

  /** Short description */
  description: z.string().optional(),

  /** Maximum context window in tokens */
  contextLength: z.number().int().positive(),

  /** Whether the model is free (both prompt and completion price = 0) */
  isFree: z.boolean(),

  /** Supported input modalities (text, image, audio, file) */
  inputModalities: z.array(z.string()).default([]),

  /** Supported output modalities (text, image) */
  outputModalities: z.array(z.string()).default([]),

  /** Supported parameters (tools, temperature, response_format, ...) */
  supportedParameters: z.array(z.string()).default([]),
});

/**
 * Response from the /models endpoint.
 */
export const modelsListResponseSchema = z.object({
  success: z.boolean(),
  models: z.array(openRouterModelSchema),
  fetchedAt: z.string().datetime(),
});

/** Inferred TypeScript types */
export type OpenRouterModel = z.infer<typeof openRouterModelSchema>;
export type ModelsListResponse = z.infer<typeof modelsListResponseSchema>;
