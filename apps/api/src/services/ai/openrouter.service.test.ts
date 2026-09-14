import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../config/env", () => ({
  env: {
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    OPENROUTER_REVIEW_MODEL: "test/model:free",
  },
}));

import { OpenRouterService } from "./openrouter.service";

describe("OpenRouterService", () => {
  let service: OpenRouterService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new OpenRouterService();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validRequest = {
    commitId: "001",
    commitMessage: "feat: test",
    projectContext: {
      projectPath: "/tmp/test",
      projectName: "test",
      techStack: [],
    },
    files: [],
    generationSummary: "test",
  };

  describe("reviewCode — happy path", () => {
    it("returns parsed response when JSON mode works", async () => {
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

      const result = await service.reviewCode(validRequest);
      expect(result.approved).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("reviewCode — fallback to prompt-only JSON", () => {
    it("retries without response_format when JSON mode fails", async () => {
      // First call: fails with json_validate_failed
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: {
              code: "json_validate_failed",
              message: "Failed to validate JSON",
            },
          }),
      });

      // Second call: succeeds without JSON mode
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
                  suggestions: [],
                }),
              },
            },
          ],
        }),
      });

      const result = await service.reviewCode(validRequest);
      expect(result.approved).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Verify first call had response_format, second did not
      const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
      expect(firstBody.response_format).toEqual({ type: "json_object" });
      expect(secondBody.response_format).toBeUndefined();
    });

    it("extracts JSON from markdown-wrapped response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "json_validate_failed",
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  "```json\n" +
                  JSON.stringify({
                    approved: false,
                    feedback: "Bad",
                    issues: ["Missing import"],
                    suggestions: [],
                  }) +
                  "\n```",
              },
            },
          ],
        }),
      });

      const result = await service.reviewCode(validRequest);
      expect(result.approved).toBe(false);
      expect(result.issues).toContain("Missing import");
    });
  });

  describe("reviewCode — unrecoverable errors", () => {
    it("does not retry on 401 unauthorized", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(service.reviewCode(validRequest)).rejects.toThrow("401");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws clear error after 2 failed attempts", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "json_validate_failed",
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not-json-at-all" } }],
        }),
      });

      await expect(service.reviewCode(validRequest)).rejects.toThrow(/failed after 2 attempts/);
    });
  });
});
