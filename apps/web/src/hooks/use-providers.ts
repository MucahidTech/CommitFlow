"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderConfig } from "@commitflow/shared";

const STORAGE_KEY = "commitflow:providers";

/** Shape stored in localStorage */
export interface StoredProviders {
  generator: ProviderConfig;
  reviewer: ProviderConfig;
}

const DEFAULT_CONFIG: StoredProviders = {
  generator: { provider: "deepseek" },
  reviewer: { provider: "groq" },
};

interface UseProvidersReturn {
  providers: StoredProviders;
  isConfigured: boolean;
  updateProviders: (config: StoredProviders) => void;
  clearProviders: () => void;
}

/**
 * Hook for managing AI provider configuration in localStorage.
 * The config is sent to the API with each execute request.
 */
export function useProviders(): UseProvidersReturn {
  const [providers, setProviders] = useState<StoredProviders>(DEFAULT_CONFIG);
  const [isHydrated, setIsHydrated] = useState(false);

  /** Load from localStorage on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredProviders;
        setProviders({
          generator: { ...DEFAULT_CONFIG.generator, ...parsed.generator },
          reviewer: { ...DEFAULT_CONFIG.reviewer, ...parsed.reviewer },
        });
      }
    } catch {
      // Ignore parse errors — use defaults
    }
    setIsHydrated(true);
  }, []);

  const updateProviders = useCallback((config: StoredProviders) => {
    setProviders(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore quota errors
    }
  }, []);

  const clearProviders = useCallback(() => {
    setProviders(DEFAULT_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Configuration is valid when both providers have API keys
  const isConfigured =
    isHydrated && Boolean(providers.generator.apiKey) && Boolean(providers.reviewer.apiKey);

  return {
    providers,
    isConfigured,
    updateProviders,
    clearProviders,
  };
}
