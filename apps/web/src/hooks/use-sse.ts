"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionStatus, SseEvent } from "@/types/sse";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface UseSseOptions {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

interface UseSseReturn {
  status: ConnectionStatus;
  lastEvent: SseEvent | null;
  events: SseEvent[];
  connect: (streamId: string) => void;
  disconnect: () => void;
  clearEvents: () => void;
}

export function useSse(options: UseSseOptions = {}): UseSseReturn {
  const { autoReconnect = false, reconnectDelay = 3000 } = options;

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [lastEvent, setLastEvent] = useState<SseEvent | null>(null);
  const [events, setEvents] = useState<SseEvent[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef<boolean>(false);

  const clearTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearTimer();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    streamIdRef.current = null;
    setStatus("closed");
  }, [clearTimer]);

  const connect = useCallback(
    (streamId: string) => {
      // إغلاق أي اتصال سلب
      clearTimer();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      isManuallyClosedRef.current = false;
      streamIdRef.current = streamId;
      setStatus("connecting");

      const url = `${API_BASE_URL}/stream/${streamId}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setStatus("open");
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as SseEvent;
          setLastEvent(parsed);
          setEvents((prev) => [...prev, parsed]);

          // الإغلاق التلقائي عند انتهاء التنفيذ
          if (parsed.type === "done") {
            disconnect();
          }
        } catch {
          // Ignore malformed events
        }
      };

      eventSource.onerror = () => {
        if (isManuallyClosedRef.current) return;

        setStatus("error");
        eventSource.close();
        eventSourceRef.current = null;

        if (autoReconnect && streamIdRef.current) {
          clearTimer();
          reconnectTimerRef.current = setTimeout(() => {
            if (streamIdRef.current && !isManuallyClosedRef.current) {
              connect(streamIdRef.current);
            }
          }, reconnectDelay);
        }
      };

      eventSourceRef.current = eventSource;
    },
    [autoReconnect, reconnectDelay, clearTimer, disconnect],
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Cleanup عند الخروج من الصفحة
  useEffect(() => {
    return () => {
      isManuallyClosedRef.current = true;
      clearTimer();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [clearTimer]);

  return {
    status,
    lastEvent,
    events,
    connect,
    disconnect,
    clearEvents,
  };
}
