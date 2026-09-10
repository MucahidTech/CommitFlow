"use client";

import type { ProjectSnapshot } from "@commitflow/shared";
import { useCallback, useState } from "react";
import type { AnalyzeState } from "@/types/snapshot";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Hook for analyzing a project and building its snapshot.
 */
export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ status: "idle" });

  const analyze = useCallback(async (projectPath: string): Promise<ProjectSnapshot | null> => {
    setState({ status: "analyzing" });

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? "Analysis failed");
      }

      const data = (await response.json()) as {
        success: boolean;
        snapshot: ProjectSnapshot;
      };

      setState({ status: "success", snapshot: data.snapshot });
      return data.snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({
        status: "error",
        message,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    state,
    analyze,
    reset,
  };
}
