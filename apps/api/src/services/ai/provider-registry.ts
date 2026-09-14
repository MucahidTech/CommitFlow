import type { AiProvider } from "@commitflow/shared";

/**
 * Static configuration for each supported AI provider.
 * All three providers implement the OpenAI-compatible chat completions API.
 */
export interface ProviderDefaults {
  /** Default base URL for the API */
  baseUrl: string;

  /** Default model used when no override is provided */
  defaultModel: string;

  /** Extra headers required by the provider */
  extraHeaders?: Record<string, string>;
}

/**
 * Registry of supported AI providers.
 * Used by AiProviderService to build requests.
 */
export const PROVIDER_REGISTRY: Record<AiProvider, ProviderDefaults> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "qwen/qwen-2.5-coder-32b-instruct:free",
    extraHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "CommitFlow",
    },
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
  },
};
