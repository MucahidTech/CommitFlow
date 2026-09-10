import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExecutionState } from "./use-execution-state";

describe("useExecutionState", () => {
  const mockProgress = {
    id: "session-1",
    status: "paused" as const,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    nextCommitIndex: 2,
    results: [],
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useExecutionState());

    expect(result.current.savedProgress).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches saved execution state successfully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasState: true, progress: mockProgress }),
    } as Response);

    const { result } = renderHook(() => useExecutionState());

    let state;
    await act(async () => {
      state = await result.current.fetchState("/tmp/project");
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/execution/status?projectPath=%2Ftmp%2Fproject"),
    );
    expect(state).toEqual(mockProgress);
    expect(result.current.savedProgress).toEqual(mockProgress);
  });

  it("returns null if no state exists", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasState: false, progress: null }),
    } as Response);

    const { result } = renderHook(() => useExecutionState());

    let state;
    await act(async () => {
      state = await result.current.fetchState("/tmp/project");
    });

    expect(state).toBeNull();
    expect(result.current.savedProgress).toBeNull();
  });

  it("clears execution state via DELETE request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    const { result } = renderHook(() => useExecutionState());

    await act(async () => {
      await result.current.clearState("/tmp/project");
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/execution/state?projectPath=%2Ftmp%2Fproject"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.current.savedProgress).toBeNull();
  });

  it("resets local state", () => {
    const { result } = renderHook(() => useExecutionState());

    act(() => {
      result.current.resetState();
    });

    expect(result.current.savedProgress).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
