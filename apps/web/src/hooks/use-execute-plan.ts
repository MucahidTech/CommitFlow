"use client";

import { useState } from "react";
import { useSse } from "./use-sse";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ExecutePlanState {
  isExecuting: boolean;
  error: string | null;
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
    result: null,
  });

  const executePlan = async (
    projectContext: Record<string, unknown>,
    commitPlan: Record<string, unknown>,
    streamId: string,
  ): Promise<void> => {
    setState({ isExecuting: true, error: null, result: null });
    clearEvents();
    connect(streamId);

    try {
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectContext,
          commitPlan,
          streamId,
        }),
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

      setState({
        isExecuting: false,
        error: null,
        result,
      });
    } catch (error) {
      disconnect();
      setState({
        isExecuting: false,
        error: error instanceof Error ? error.message : "Unknown error",
        result: null,
      });
    }
  };

  return {
    ...state,
    connectionStatus: status,
    lastEvent,
    events,
    executePlan,
  };
}
