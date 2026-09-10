import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalyze } from "./use-analyze";

describe("useAnalyze", () => {
  const mockSnapshot = {
    projectName: "my-app",
    projectPath: "/tmp/my-app",
    techStack: ["Next.js", "TypeScript"],
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with idle status", () => {
    const { result } = renderHook(() => useAnalyze());

    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("analyzes project successfully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, snapshot: mockSnapshot }),
    } as Response);

    const { result } = renderHook(() => useAnalyze());

    let snapshot;
    await act(async () => {
      snapshot = await result.current.analyze("/tmp/my-app");
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/analyze"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ projectPath: "/tmp/my-app" }),
      }),
    );
    expect(snapshot).toEqual(mockSnapshot);
    expect(result.current.state).toEqual({
      status: "success",
      snapshot: mockSnapshot,
    });
  });

  it("handles analysis error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Directory not found" }),
    } as Response);

    const { result } = renderHook(() => useAnalyze());

    let snapshot;
    await act(async () => {
      snapshot = await result.current.analyze("/invalid/path");
    });

    expect(snapshot).toBeNull();
    expect(result.current.state).toEqual({
      status: "error",
      message: "Directory not found",
    });
  });

  it("resets state to idle", () => {
    const { result } = renderHook(() => useAnalyze());

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({ status: "idle" });
  });
});
