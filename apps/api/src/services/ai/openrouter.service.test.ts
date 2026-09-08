import { describe, it, expect, vi } from "vitest";

vi.mock("../../config/env", () => ({
  env: {
    DEEPSEEK_API_KEY: undefined,
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    OPENROUTER_API_KEY: undefined,
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    OPENROUTER_REVIEW_MODEL: "qwen/qwen-2.5-coder-32b-instruct:free",
  },
}));

import { OpenRouterService } from "./openrouter.service";

describe("OpenRouterService", () => {
  const service = new OpenRouterService();

  it("throws when API key is not configured", async () => {
    await expect(
      service.reviewCode({
        commitId: "001",
        commitMessage: "test",
        projectContext: {
          projectPath: "/tmp/test",
          projectName: "test",
          techStack: [],
        },
        files: [],
        generationSummary: "test",
      }),
    ).rejects.toThrow("OPENROUTER_API_KEY is not configured");
  });
});
