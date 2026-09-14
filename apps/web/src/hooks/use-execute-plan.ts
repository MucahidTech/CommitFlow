"use client";

import { useCallback, useState } from "react";
import { useSse } from "./use-sse";
import type { SseEvent } from "@/types/sse";
import type { ProvidersConfig } from "@commitflow/shared";

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

  const [localEvents, setLocalEvents] = useState<SseEvent[]>([]);

  const appendLocalEvent = useCallback(
    (type: "local_error" | "local_warning" | "local_info", message: string) => {
      const event: SseEvent = {
        type,
        message,
        timestamp: new Date().toISOString(),
      };
      setLocalEvents((prev) => [...prev, event]);
    },
    [],
  );

  const clearLocalEvents = useCallback(() => {
    setLocalEvents([]);
  }, []);

  const executePlan = useCallback(
    async (
      projectContext: Record<string, unknown>,
      commitPlan: Record<string, unknown>,
      streamId: string,
      providers: ProvidersConfig,
    ): Promise<void> => {
      setState({
        isExecuting: true,
        error: null,
        currentSessionId: streamId,
        result: null,
      });
      clearEvents();
      clearLocalEvents();
      connect(streamId);

      try {
        const response = await fetch(`${API_BASE_URL}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectContext, commitPlan, streamId, providers }),
        });

        if (!response.ok) {
          let errorMessage = `Server responded with ${response.status} ${response.statusText}`;
          try {
            const errorData = (await response.json()) as { error?: string; details?: unknown };
            if (errorData.error) {
              errorMessage = errorData.error;
            }
            if (errorData.details) {
              errorMessage += `\n${JSON.stringify(errorData.details, null, 2)}`;
            }
          } catch {
            // Response body is not JSON — keep the status message
          }
          throw new Error(errorMessage);
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
        const message = error instanceof Error ? error.message : "Unknown execution error";

        appendLocalEvent("local_error", message);

        disconnect();
        setState((prev) => ({
          ...prev,
          isExecuting: false,
          currentSessionId: null,
          error: message,
        }));
      }
    },
    [clearEvents, clearLocalEvents, connect, disconnect, appendLocalEvent],
  );

  const pause = useCallback(async (): Promise<boolean> => {
    if (!state.currentSessionId) {
      appendLocalEvent("local_warning", "No active session to pause.");
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pause/${state.currentSessionId}`, {
        method: "POST",
      });

      if (response.status === 404) {
        appendLocalEvent(
          "local_error",
          `Pause failed: session "${state.currentSessionId}" not found on server. ` +
            "The execution may have already finished or the session was not registered.",
        );
        return false;
      }

      if (!response.ok) {
        appendLocalEvent(
          "local_error",
          `Pause request failed: ${response.status} ${response.statusText}`,
        );
        return false;
      }

      appendLocalEvent("local_info", "Pause signal sent. Waiting for current commit to finish...");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown pause error";
      appendLocalEvent("local_error", `Failed to send pause: ${message}`);
      return false;
    }
  }, [state.currentSessionId, appendLocalEvent]);

  return {
    ...state,
    connectionStatus: status,
    lastEvent,
    events,
    localEvents,
    executePlan,
    pause,
  };
}
