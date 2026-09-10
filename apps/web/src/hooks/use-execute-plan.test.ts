import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExecutePlan } from "./use-execute-plan";

// Mock implementation for useSse
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockClearEvents = vi.fn();

vi.mock("./use-sse", () => ({
  useSse: () => ({
    status: "idle",
    lastEvent: null,
    events: [],
    connect: mockConnect,
    disconnect: mockDisconnect,
    clearEvents: mockClearEvents,
  }),
}));

describe("useExecutePlan", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with idle state", () => {
    const { result } = renderHook(() => useExecutePlan());

    expect(result.current.isExecuting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.currentSessionId).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("executes plan successfully", async () => {
    const executionResult = {
      success: true,
      totalCommits: 3,
      successCount: 3,
      failedCount: 0,
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => executionResult,
    } as Response);

    const { result } = renderHook(() => useExecutePlan());

    await act(async () => {
      await result.current.executePlan({ path: "/test" }, { commits: [] }, "stream-001", "gpt-4o");
    });

    expect(mockClearEvents).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith("stream-001");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/execute"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          projectContext: { path: "/test" },
          commitPlan: { commits: [] },
          streamId: "stream-001",
          selectedModel: "gpt-4o",
        }),
      }),
    );
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.result).toEqual(executionResult);
  });

  it("handles execution failure and disconnects SSE", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server Error" }),
    } as Response);

    const { result } = renderHook(() => useExecutePlan());

    await act(async () => {
      await result.current.executePlan({ path: "/test" }, { commits: [] }, "stream-001");
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.error).toBe("Server Error");
  });

  it("pauses running execution via API call", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Setup active session state
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, totalCommits: 1, successCount: 1, failedCount: 0 }),
    } as Response);

    const { result } = renderHook(() => useExecutePlan());

    // Trigger execution to set currentSessionId
    act(() => {
      void result.current.executePlan({ path: "/test" }, {}, "stream-999");
    });

    let pauseSuccess;
    await act(async () => {
      pauseSuccess = await result.current.pause();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/pause/stream-999"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(pauseSuccess).toBe(true);
  });
});
