/**
 * Minimal SSE client for E2E tests.
 * Parses `data: {...}\n\n` frames from an HTTP event stream.
 */

export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

export interface SseClient {
  events: SseEvent[];
  waitForEvent: (type: string, timeoutMs?: number) => Promise<SseEvent>;
  waitForDone: (timeoutMs?: number) => Promise<SseEvent>;
  close: () => void;
}

/**
 * Connect to an SSE endpoint and collect events in the background.
 * Provides promises to wait for specific event types.
 */
export async function connectSse(url: string): Promise<SseClient> {
  const controller = new AbortController();
  const events: SseEvent[] = [];
  const waiters = new Map<string, ((e: SseEvent) => void)[]>();

  // Background: read and parse the stream
  void (async () => {
    try {
      const response = await fetch(url, {
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are terminated by a blank line
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          // Extract data line(s)
          const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));

          if (!dataLine) continue;

          try {
            const parsed = JSON.parse(dataLine.slice(6)) as SseEvent;
            events.push(parsed);

            // Notify waiters
            const list = waiters.get(parsed.type);
            if (list) {
              for (const resolve of list) resolve(parsed);
              waiters.delete(parsed.type);
            }
          } catch {
            // Ignore malformed frames
          }
        }
      }
    } catch {
      // Aborted or network error — ignore, the client is closed
    }
  })();

  const waitForEvent = (type: string, timeoutMs = 30_000): Promise<SseEvent> => {
    // If already received, resolve immediately
    const existing = events.find((e) => e.type === type);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `Timeout (${timeoutMs}ms) waiting for SSE event: "${type}". ` +
              `Received types: ${events.map((e) => e.type).join(", ") || "none"}`,
          ),
        );
      }, timeoutMs);

      const wrapped = (event: SseEvent) => {
        clearTimeout(timer);
        resolve(event);
      };

      const list = waiters.get(type) ?? [];
      list.push(wrapped);
      waiters.set(type, list);
    });
  };

  return {
    events,
    waitForEvent,
    waitForDone: (timeoutMs?: number) => waitForEvent("done", timeoutMs),
    close: () => controller.abort(),
  };
}
