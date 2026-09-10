import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../config/env", () => ({
  env: {
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    OPENROUTER_REVIEW_MODEL: "default/model",
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

  it("uses modelOverride when provided in reviewCode", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                approved: true,
                feedback: "Looks good!",
                issues: [],
                suggestions: [],
              }),
            },
          },
        ],
      }),
    });

    await service.reviewCode(
      {
        commitId: "c1",
        commitMessage: "feat: test",
        projectContext: {
          projectPath: "/path",
          projectName: "test",
          techStack: [],
        },
        files: [],
        generationSummary: "summary",
      },
      "custom/model-override",
    );

    expect(fetchMock).toHaveBeenCalled();
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.model).toBe("custom/model-override");
  });
});
