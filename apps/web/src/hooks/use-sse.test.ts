import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSse } from "./use-sse";

// Mock EventSource Implementation
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close = vi.fn(() => {
    this.readyState = 2;
  });

  simulateOpen() {
    this.readyState = 1;
    if (this.onopen) this.onopen();
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) this.onerror();
  }
}

// Helper to get guaranteed MockEventSource instance
function getLatestInstance(): MockEventSource {
  const instance = MockEventSource.instances[MockEventSource.instances.length - 1];
  if (!instance) {
    throw new Error("No MockEventSource instance found");
  }
  return instance;
}

describe("useSse", () => {
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.stubGlobal("EventSource", originalEventSource);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initializes with default idle state", () => {
    const { result } = renderHook(() => useSse());

    expect(result.current.status).toBe("idle");
    expect(result.current.lastEvent).toBeNull();
    expect(result.current.events).toEqual([]);
  });

  it("connects to stream and updates status to open", () => {
    const { result } = renderHook(() => useSse());

    act(() => {
      result.current.connect("stream-123");
    });

    expect(result.current.status).toBe("connecting");
    expect(MockEventSource.instances.length).toBe(1);

    const mockEs = getLatestInstance();
    expect(mockEs.url).toContain("/stream/stream-123");

    act(() => {
      mockEs.simulateOpen();
    });

    expect(result.current.status).toBe("open");
  });

  it("receives SSE message and appends to events", () => {
    const { result } = renderHook(() => useSse());

    act(() => {
      result.current.connect("stream-123");
    });

    const mockEs = getLatestInstance();
    const eventData = { type: "connected", streamId: "stream-123" };

    act(() => {
      mockEs.simulateMessage(eventData);
    });

    expect(result.current.lastEvent).toEqual(eventData);
    expect(result.current.events).toEqual([eventData]);
  });

  it("automatically disconnects when 'done' event is received", () => {
    const { result } = renderHook(() => useSse());

    act(() => {
      result.current.connect("stream-123");
    });

    const mockEs = getLatestInstance();

    act(() => {
      mockEs.simulateMessage({ type: "done", successCount: 5, totalCommits: 5 });
    });

    expect(mockEs.close).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("closed");
  });

  it("handles disconnect call explicitly", () => {
    const { result } = renderHook(() => useSse());

    act(() => {
      result.current.connect("stream-123");
    });

    const mockEs = getLatestInstance();

    act(() => {
      result.current.disconnect();
    });

    expect(mockEs.close).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("closed");
  });

  it("clears events using clearEvents", () => {
    const { result } = renderHook(() => useSse());

    act(() => {
      result.current.connect("stream-123");
    });

    const mockEs = getLatestInstance();
    act(() => {
      mockEs.simulateMessage({ type: "connected" });
    });

    expect(result.current.events.length).toBe(1);

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.lastEvent).toBeNull();
  });
});
