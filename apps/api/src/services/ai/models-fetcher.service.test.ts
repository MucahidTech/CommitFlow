import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../config/env", () => ({
  env: {
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
  },
}));

import { ModelsFetcherService } from "./models-fetcher.service";

describe("ModelsFetcherService", () => {
  let service: ModelsFetcherService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new ModelsFetcherService();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchFreeModels", () => {
    it("filters to free models only", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "free-model:free",
              name: "Free Model",
              context_length: 8000,
              pricing: { prompt: "0", completion: "0" },
              supported_parameters: ["tools"],
            },
            {
              id: "paid-model",
              name: "Paid Model",
              context_length: 8000,
              pricing: { prompt: "0.001", completion: "0.002" },
              supported_parameters: ["tools"],
            },
          ],
        }),
      });

      const models = await service.fetchFreeModels();
      expect(models).toHaveLength(1);
      expect(models[0]?.id).toBe("free-model:free");
    });

    it("filters out models without tool support when requireTools is true", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "free-no-tools:free",
              name: "Free No Tools",
              context_length: 8000,
              pricing: { prompt: "0", completion: "0" },
              supported_parameters: ["temperature"],
            },
            {
              id: "free-with-tools:free",
              name: "Free With Tools",
              context_length: 8000,
              pricing: { prompt: "0", completion: "0" },
              supported_parameters: ["tools", "temperature"],
            },
          ],
        }),
      });

      const models = await service.fetchFreeModels({ requireTools: true });
      expect(models).toHaveLength(1);
      expect(models[0]?.id).toBe("free-with-tools:free");
    });

    it("keeps models without tool support when requireTools is false", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "free-no-tools:free",
              name: "Free No Tools",
              context_length: 8000,
              pricing: { prompt: "0", completion: "0" },
              supported_parameters: ["temperature"],
            },
          ],
        }),
      });

      const models = await service.fetchFreeModels({ requireTools: false });
      expect(models).toHaveLength(1);
    });

    it("throws on HTTP error", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(service.fetchFreeModels()).rejects.toThrow("OpenRouter models API error: 500");
    });

    it("throws on invalid response shape", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "not-an-array" }),
      });

      await expect(service.fetchFreeModels()).rejects.toThrow(
        "Invalid response from OpenRouter models API",
      );
    });

    it("sorts models by name", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "zeta:free",
              name: "Zeta Model",
              context_length: 8000,
              pricing: { prompt: "0", completion: "0" },
              supported_parameters: ["tools"],
            },
            {
              id: "alpha:free",
              name: "Alpha Model",
              context_length: 8000,
              pricing: { prompt: "0", completion: "0" },
              supported_parameters: ["tools"],
            },
          ],
        }),
      });

      const models = await service.fetchFreeModels();
      expect(models[0]?.name).toBe("Alpha Model");
      expect(models[1]?.name).toBe("Zeta Model");
    });
  });
});
