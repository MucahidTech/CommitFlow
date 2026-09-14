import { z } from "zod";

/**
 * Supported AI providers.
 */
export const aiProviderSchema = z.enum(["deepseek", "openrouter", "groq"]);

/**
 * Configuration for a single AI provider (generator or reviewer).
 */
export const providerConfigSchema = z
  .object({
    /** Provider identifier */
    provider: aiProviderSchema,

    /** API key (required to use the provider) */
    apiKey: z.string().min(1).optional(),

    /** Optional base URL override */
    baseUrl: z.string().url().optional(),

    /** Optional model override */
    model: z.string().min(1).optional(),
  })
  .strict();

/**
 * Complete AI provider configuration sent from the UI with each execute request.
 * Both roles can share the same provider or use different ones.
 */
export const providersConfigSchema = z
  .object({
    /** Agent responsible for generating code */
    generator: providerConfigSchema,

    /** Agent responsible for reviewing code */
    reviewer: providerConfigSchema,
  })
  .strict();

/** Inferred types */
export type AiProvider = z.infer<typeof aiProviderSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ProvidersConfig = z.infer<typeof providersConfigSchema>;
