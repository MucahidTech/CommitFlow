"use client";

import { useCallback, useState } from "react";
import type { ExecutionStatusResponse, SavedExecutionProgress } from "@/types/execution";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface UseExecutionStateReturn {
  savedProgress: SavedExecutionProgress | null;
  isLoading: boolean;
  error: string | null;
  fetchState: (projectPath: string) => Promise<SavedExecutionProgress | null>;
  clearState: (projectPath: string) => Promise<void>;
  resetState: () => void;
}

/**
 * Hook for fetching and managing saved execution state.
 */
export function useExecutionState(): UseExecutionStateReturn {
  const [savedProgress, setSavedProgress] = useState<SavedExecutionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(
    async (projectPath: string): Promise<SavedExecutionProgress | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/execution/status?projectPath=${encodeURIComponent(projectPath)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch execution status");
        }

        const data = (await response.json()) as ExecutionStatusResponse;

        if (!data.hasState || !data.progress) {
          setSavedProgress(null);
          setIsLoading(false);
          return null;
        }

        setSavedProgress(data.progress);
        setIsLoading(false);
        return data.progress;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setSavedProgress(null);
        setIsLoading(false);
        return null;
      }
    },
    [],
  );

  const clearState = useCallback(async (projectPath: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/execution/state?projectPath=${encodeURIComponent(projectPath)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to clear execution state");
      }

      setSavedProgress(null);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setIsLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setSavedProgress(null);
    setError(null);
  }, []);

  return {
    savedProgress,
    isLoading,
    error,
    fetchState,
    clearState,
    resetState,
  };
}
