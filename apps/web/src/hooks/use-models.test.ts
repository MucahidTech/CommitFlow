import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModels } from "./use-models";

describe("useModels", () => {
  const mockModels = [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      pricing: { prompt: "0", completion: "0" },
      context_length: 128000,
    },
    {
      id: "claude-3-5",
      name: "Claude 3.5",
      pricing: { prompt: "0", completion: "0" },
      context_length: 200000,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches models on mount when localStorage is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, models: mockModels }),
    } as Response);

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.models).toEqual(mockModels);
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/models"));
    expect(localStorage.getItem("commitflow:free-models")).toBe(JSON.stringify(mockModels));
  });

  it("loads models from localStorage on mount without fetching", async () => {
    localStorage.setItem("commitflow:free-models", JSON.stringify(mockModels));

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.models).toEqual(mockModels);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("persists selected model to localStorage", () => {
    const { result } = renderHook(() => useModels());

    act(() => {
      result.current.selectModel("gpt-4o");
    });

    expect(result.current.selectedModel).toBe("gpt-4o");
    expect(localStorage.getItem("commitflow:review-model")).toBe("gpt-4o");

    act(() => {
      result.current.selectModel(null);
    });

    expect(result.current.selectedModel).toBeNull();
    expect(localStorage.getItem("commitflow:review-model")).toBeNull();
  });

  it("handles fetch error gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch models");
    });

    expect(result.current.models).toEqual([]);
  });

  it("refreshes models via manual trigger", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, models: mockModels }),
    } as Response);

    const { result } = renderHook(() => useModels());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.models).toEqual(mockModels);
  });
});
