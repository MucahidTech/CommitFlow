"use client";

import { useCallback, useState } from "react";
import { useSse } from "./use-sse";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ExecutePlanState {
  isExecuting: boolean;
  error: string | null;
  currentSessionId: string | null;
  result: {
    success: boolean;
    totalCommits: number;
    successCount: number;
    failedCount: number;
  } | null;
}

export function useExecutePlan() {
  const { status, lastEvent, events, connect, disconnect, clearEvents } = useSse();

  const [state, setState] = useState<ExecutePlanState>({
    isExecuting: false,
    error: null,
    currentSessionId: null,
    result: null,
  });

  const executePlan = useCallback(
    async (
      projectContext: Record<string, unknown>,
      commitPlan: Record<string, unknown>,
      streamId: string,
      selectedModel?: string,
    ): Promise<void> => {
      setState({
        isExecuting: true,
        error: null,
        currentSessionId: streamId,
        result: null,
      });
      clearEvents();
      connect(streamId);

      try {
        const response = await fetch(`${API_BASE_URL}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectContext, commitPlan, streamId, selectedModel }),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error ?? "Execution failed");
        }

        const result = (await response.json()) as {
          success: boolean;
          totalCommits: number;
          successCount: number;
          failedCount: number;
        };

        setState((prev) => ({
          ...prev,
          isExecuting: false,
          currentSessionId: null,
          result,
        }));
      } catch (error) {
        disconnect();
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          currentSessionId: null,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    },
    [clearEvents, connect, disconnect],
  );

  const pause = useCallback(async (): Promise<boolean> => {
    if (!state.currentSessionId) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/pause/${state.currentSessionId}`, {
        method: "POST",
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [state.currentSessionId]);

  return {
    ...state,
    connectionStatus: status,
    lastEvent,
    events,
    executePlan,
    pause,
  };
}
