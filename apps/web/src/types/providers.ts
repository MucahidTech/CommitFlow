import type { AiProvider, ProviderConfig, ProvidersConfig } from "@commitflow/shared";

export type { AiProvider, ProviderConfig, ProvidersConfig };

/** Provider display names for the UI */
export const PROVIDER_LABELS: Record<AiProvider, string> = {
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
  groq: "Groq",
};

/** Default base URLs for each provider */
export const PROVIDER_BASE_URLS: Record<AiProvider, string> = {
  deepseek: "https://api.deepseek.com",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
};

/** Default models for each provider */
export const PROVIDER_DEFAULT_MODELS: Record<AiProvider, string> = {
  deepseek: "deepseek-chat",
  groq: "openai/gpt-oss-120b",
  openrouter: "cohere/north-mini-code:free",
};

/** Help text for API key fields */
export const PROVIDER_KEY_HELP: Record<AiProvider, string> = {
  deepseek: "Get your key at platform.deepseek.com",
  openrouter: "Get your key at openrouter.ai/keys",
  groq: "Get your key at console.groq.com/keys",
};
