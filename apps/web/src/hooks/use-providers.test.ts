import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useProviders } from "./use-providers";

const STORAGE_KEY = "commitflow:providers";

describe("useProviders", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("initializes with default providers", () => {
    const { result } = renderHook(() => useProviders());

    expect(result.current.providers.generator.provider).toBe("deepseek");
    expect(result.current.providers.reviewer.provider).toBe("groq");
  });

  it("isConfigured is false when no API keys are set", () => {
    const { result } = renderHook(() => useProviders());
    expect(result.current.isConfigured).toBe(false);
  });

  it("isConfigured is true when both providers have API keys", () => {
    const { result } = renderHook(() => useProviders());

    act(() => {
      result.current.updateProviders({
        generator: { provider: "deepseek", apiKey: "sk-test" },
        reviewer: { provider: "groq", apiKey: "gsk-test" },
      });
    });

    expect(result.current.isConfigured).toBe(true);
  });

  it("persists to localStorage when updateProviders is called", () => {
    const { result } = renderHook(() => useProviders());

    act(() => {
      result.current.updateProviders({
        generator: { provider: "openrouter", apiKey: "or-key" },
        reviewer: { provider: "groq", apiKey: "gsk-key" },
      });
    });

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string);
    expect(stored.generator.provider).toBe("openrouter");
    expect(stored.reviewer.apiKey).toBe("gsk-key");
  });

  it("loads from localStorage on mount", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        generator: { provider: "groq", apiKey: "gsk-saved" },
        reviewer: { provider: "openrouter", apiKey: "or-saved" },
      }),
    );

    const { result } = renderHook(() => useProviders());

    expect(result.current.providers.generator.provider).toBe("groq");
    expect(result.current.providers.reviewer.provider).toBe("openrouter");
    expect(result.current.isConfigured).toBe(true);
  });

  it("ignores malformed localStorage data", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json");

    const { result } = renderHook(() => useProviders());

    // Should fall back to defaults
    expect(result.current.providers.generator.provider).toBe("deepseek");
    expect(result.current.providers.reviewer.provider).toBe("groq");
  });

  it("clears providers back to defaults", () => {
    const { result } = renderHook(() => useProviders());

    act(() => {
      result.current.updateProviders({
        generator: { provider: "openrouter", apiKey: "or-key" },
        reviewer: { provider: "groq", apiKey: "gsk-key" },
      });
    });

    expect(result.current.isConfigured).toBe(true);

    act(() => {
      result.current.clearProviders();
    });

    expect(result.current.providers.generator.provider).toBe("deepseek");
    expect(result.current.providers.reviewer.provider).toBe("groq");
    expect(result.current.isConfigured).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
