import { z } from "zod";

/**
 * Environment variable schema.
 * Validates all required environment variables at startup.
 * Fails fast if any required variable is missing or invalid.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  HOST: z.string().min(1).default("0.0.0.0"),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),

  // DeepSeek (Primary Agent)
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),

  // OpenRouter (Reviewer Agent)
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_REVIEW_MODEL: z.string().default("qwen/qwen-2.5-coder-32b-instruct:free"),
});

/**
 * Parse and validate environment variables.
 * Throws a detailed Zod error if validation fails.
 */
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(
      parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    );
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
