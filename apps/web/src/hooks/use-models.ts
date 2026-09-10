"use client";

import { useCallback, useEffect, useState } from "react";
import type { OpenRouterModel, ModelsListResponse } from "@commitflow/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const MODELS_CACHE_KEY = "commitflow:free-models";
const SELECTED_MODEL_KEY = "commitflow:review-model";

interface UseModelsReturn {
  models: OpenRouterModel[];
  selectedModel: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectModel: (modelId: string | null) => void;
}

/**
 * Hook for managing OpenRouter model list and user selection.
 *
 * Caching strategy:
 * - Model list: cached in localStorage, refreshed only on mount (if missing) or explicit refresh
 * - Selected model: persisted in localStorage, independent of list cache
 */
export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Read models from localStorage if available */
  const readCachedModels = useCallback((): OpenRouterModel[] | null => {
    try {
      const cached = localStorage.getItem(MODELS_CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached) as OpenRouterModel[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, []);

  /** Save models to localStorage */
  const writeCachedModels = useCallback((items: OpenRouterModel[]): void => {
    try {
      localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, []);

  /** Read selected model from localStorage */
  const readSelectedModel = useCallback((): string | null => {
    try {
      return localStorage.getItem(SELECTED_MODEL_KEY);
    } catch {
      return null;
    }
  }, []);

  /** Write selected model to localStorage */
  const writeSelectedModel = useCallback((modelId: string | null): void => {
    try {
      if (modelId === null) {
        localStorage.removeItem(SELECTED_MODEL_KEY);
      } else {
        localStorage.setItem(SELECTED_MODEL_KEY, modelId);
      }
    } catch {
      // Ignore quota errors
    }
  }, []);

  /** Fetch models from API and cache them */
  const fetchModels = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/models`);
      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      const data = (await response.json()) as ModelsListResponse;

      if (!data.success || !Array.isArray(data.models)) {
        throw new Error("Invalid response from /models endpoint");
      }

      setModels(data.models);
      writeCachedModels(data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [writeCachedModels]);

  /** Manual refresh — always calls the API */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchModels();
  }, [fetchModels]);

  /** Select a model (persist in localStorage) */
  const selectModel = useCallback(
    (modelId: string | null): void => {
      setSelectedModel(modelId);
      writeSelectedModel(modelId);
    },
    [writeSelectedModel],
  );

  // Initialize on mount
  useEffect(() => {
    const cached = readCachedModels();
    if (cached && cached.length > 0) {
      setModels(cached);
    } else {
      void fetchModels();
    }

    const saved = readSelectedModel();
    if (saved) {
      setSelectedModel(saved);
    }
  }, [readCachedModels, readSelectedModel, fetchModels]);

  return {
    models,
    selectedModel,
    isLoading,
    error,
    refresh,
    selectModel,
  };
}
