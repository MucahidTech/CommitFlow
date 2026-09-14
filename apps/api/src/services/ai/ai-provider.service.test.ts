import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../config/env", () => ({
  env: {
    DEEPSEEK_API_KEY: undefined,
    OPENROUTER_API_KEY: "env-openrouter-key",
    GROQ_API_KEY: undefined,
  },
}));

import { AiProviderService } from "./ai-provider.service";
import type { ProviderConfig } from "@commitflow/shared";

describe("AiProviderService", () => {
  let service: AiProviderService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new AiProviderService();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const generateRequest = {
    commitId: "001",
    commitMessage: "feat: add something",
    projectContext: {
      projectPath: "/tmp/test",
      projectName: "test",
      techStack: ["typescript"],
    },
    files: [],
  };

  const reviewRequest = {
    commitId: "001",
    commitMessage: "feat: add something",
    projectContext: {
      projectPath: "/tmp/test",
      projectName: "test",
      techStack: ["typescript"],
    },
    files: [],
    generationSummary: "Added file",
  };

  const config: ProviderConfig = {
    provider: "deepseek",
    apiKey: "test-key",
  };

  describe("callChat — request construction", () => {
    it("sends request to DeepSeek's default endpoint", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      await service.generateCode(config, generateRequest);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.deepseek.com/chat/completions");
      expect(options.method).toBe("POST");
    });

    it("sends request to Groq's default endpoint when configured", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      const groqConfig: ProviderConfig = {
        provider: "groq",
        apiKey: "gsk-test",
      };
      await service.generateCode(groqConfig, generateRequest);

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    });

    it("uses provided baseUrl override", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      const customConfig: ProviderConfig = {
        provider: "deepseek",
        apiKey: "test-key",
        baseUrl: "https://custom.api.com/v1",
      };
      await service.generateCode(customConfig, generateRequest);

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://custom.api.com/v1/chat/completions");
    });

    it("uses default model from registry when no model specified", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      await service.generateCode(config, generateRequest);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.model).toBe("deepseek-chat");
    });

    it("uses model override when provided", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      const customConfig: ProviderConfig = {
        provider: "deepseek",
        apiKey: "test-key",
        model: "deepseek-reasoner",
      };
      await service.generateCode(customConfig, generateRequest);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.model).toBe("deepseek-reasoner");
    });

    it("adds OpenRouter extra headers", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      const orConfig: ProviderConfig = {
        provider: "openrouter",
        apiKey: "or-key",
      };
      await service.generateCode(orConfig, generateRequest);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers["HTTP-Referer"]).toBeDefined();
      expect(headers["X-Title"]).toBeDefined();
    });

    it("sets Authorization header with Bearer prefix", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      await service.generateCode(config, generateRequest);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe("Bearer test-key");
    });
  });

  describe("API key resolution", () => {
    it("uses config.apiKey when provided", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      await service.generateCode({ provider: "deepseek", apiKey: "explicit-key" }, generateRequest);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe("Bearer explicit-key");
    });

    it("falls back to env key when config.apiKey is missing", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"files":[],"summary":""}' } }],
        }),
      });

      await service.generateCode({ provider: "openrouter" }, generateRequest);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe("Bearer env-openrouter-key");
    });

    it("throws when no apiKey available (config + env empty)", async () => {
      await expect(service.generateCode({ provider: "deepseek" }, generateRequest)).rejects.toThrow(
        "DEEPSEEK API key is not configured",
      );
    });
  });

  describe("error handling", () => {
    it("throws with provider name and status on HTTP error", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(
        service.generateCode({ provider: "groq", apiKey: "bad" }, generateRequest),
      ).rejects.toThrow(/groq API error \(401\)/);
    });

    it("throws timeout error on AbortError", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      fetchMock.mockRejectedValueOnce(abortError);

      await expect(service.generateCode(config, generateRequest)).rejects.toThrow(
        /request timed out/,
      );
    });
  });

  describe("generateCode", () => {
    it("parses valid JSON response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  files: [{ path: "a.ts", content: "x", operation: "create" }],
                  summary: "Created",
                }),
              },
            },
          ],
        }),
      });

      const result = await service.generateCode(config, generateRequest);
      expect(result.files).toHaveLength(1);
      expect(result.summary).toBe("Created");
    });

    it("rejects invalid response shape via Zod", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ files: "not-an-array", summary: "x" }),
              },
            },
          ],
        }),
      });

      await expect(service.generateCode(config, generateRequest)).rejects.toThrow();
    });
  });

  describe("reviewCode", () => {
    it("parses valid review response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  approved: true,
                  feedback: "Looks good",
                  issues: [],
                  suggestions: [],
                }),
              },
            },
          ],
        }),
      });

      const result = await service.reviewCode(config, reviewRequest);
      expect(result.approved).toBe(true);
    });

    it("returns suggestions when provided", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  approved: true,
                  feedback: "OK",
                  issues: [],
                  suggestions: ["Consider using const"],
                }),
              },
            },
          ],
        }),
      });

      const result = await service.reviewCode(config, reviewRequest);
      expect(result.suggestions).toContain("Consider using const");
    });
  });

  describe("JSON extraction", () => {
    it("extracts JSON from markdown code fence", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  "Here is the result:\n```json\n" +
                  JSON.stringify({ approved: true, feedback: "OK" }) +
                  "\n```",
              },
            },
          ],
        }),
      });

      const result = await service.reviewCode(config, reviewRequest);
      expect(result.approved).toBe(true);
    });

    it("extracts first JSON block from mixed text", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  "Some explanation\n" +
                  JSON.stringify({ approved: false, feedback: "Bad" }) +
                  "\nMore text",
              },
            },
          ],
        }),
      });

      const result = await service.reviewCode(config, reviewRequest);
      expect(result.approved).toBe(false);
    });
  });
});
