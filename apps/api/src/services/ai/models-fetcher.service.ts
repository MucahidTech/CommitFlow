import type { OpenRouterModel } from "@commitflow/shared";
import { env } from "../../config/env";

interface RawOpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  supported_parameters?: string[];
}

interface RawModelsResponse {
  data: RawOpenRouterModel[];
}

export class ModelsFetcherService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeout = 15000;

  constructor() {
    this.baseUrl = env.OPENROUTER_BASE_URL;
    this.apiKey = env.OPENROUTER_API_KEY;
  }

  /**
   * Fetch all models directly from OpenRouter.
   */
  async fetchFreeModels(options?: { requireTools?: boolean }): Promise<OpenRouterModel[]> {
    const requireTools = options?.requireTools ?? true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenRouter models API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as RawModelsResponse;

      if (!Array.isArray(data.data)) {
        throw new Error("Invalid response from OpenRouter models API");
      }

      const freeModels = data.data
        .map((raw) => this.normalize(raw))
        .filter((model): model is OpenRouterModel => model !== null)
        .filter((model) => model.isFree)
        .filter((model) => (requireTools ? model.supportedParameters.includes("tools") : true));

      freeModels.sort((a, b) => a.name.localeCompare(b.name));

      return freeModels;
    } finally {
      clearTimeout(timer);
    }
  }

  private normalize(raw: RawOpenRouterModel): OpenRouterModel | null {
    if (!raw.id || !raw.name || typeof raw.context_length !== "number") {
      return null;
    }

    const promptPrice = raw.pricing?.prompt ?? "1";
    const completionPrice = raw.pricing?.completion ?? "1";
    const isFree = promptPrice === "0" && completionPrice === "0";

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      contextLength: raw.context_length,
      isFree,
      inputModalities: raw.architecture?.input_modalities ?? [],
      outputModalities: raw.architecture?.output_modalities ?? [],
      supportedParameters: raw.supported_parameters ?? [],
    };
  }
}
