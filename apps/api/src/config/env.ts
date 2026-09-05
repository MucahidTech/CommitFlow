import { z } from "zod";

/**
 * Environment variable schema.
 * Validates all required environment variables at startup.
 * Fails fast if any required variable is missing or invalid.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    PORT: z.coerce.number().int().positive().max(65535).default(4000),

    HOST: z.string().min(1).default("0.0.0.0"),

    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),

    // Optional in dev/test to allow local application boot without API keys
    DEEPSEEK_API_KEY: z.string().optional(),

    DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),

    GEMINI_API_KEY: z.string().optional(),

    GEMINI_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com"),
  })
  .strict();

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
        .map((issue) => {
          return `  - ${issue.path.join(".")}: ${issue.message}`;
        })
        .join("\n"),
    );
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
