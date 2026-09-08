import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env
vi.mock("../../config/env", () => ({
  env: {
    DEEPSEEK_API_KEY: undefined,
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    OPENROUTER_API_KEY: undefined,
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    OPENROUTER_REVIEW_MODEL: "qwen/qwen-2.5-coder-32b-instruct:free",
  },
}));

import { DeepSeekService } from "./deepseek.service";

describe("DeepSeekService", () => {
  let service: DeepSeekService;

  beforeEach(() => {
    service = new DeepSeekService();
  });

  it("throws when API key is not configured", async () => {
    await expect(
      service.generateCode({
        commitId: "001",
        commitMessage: "test",
        projectContext: {
          projectPath: "/tmp/test",
          projectName: "test",
          techStack: [],
        },
        files: [],
      }),
    ).rejects.toThrow("DEEPSEEK_API_KEY is not configured");
  });
});
