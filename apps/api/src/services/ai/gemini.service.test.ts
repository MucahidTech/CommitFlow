import { describe, it, expect, vi } from "vitest";

vi.mock("../../config/env", () => ({
  env: {
    DEEPSEEK_API_KEY: undefined,
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    GEMINI_API_KEY: undefined,
    GEMINI_BASE_URL: "https://generativelanguage.googleapis.com",
  },
}));

import { GeminiService } from "./gemini.service";

describe("GeminiService", () => {
  const service = new GeminiService();

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
    ).rejects.toThrow("GEMINI_API_KEY is not configured");
  });
});
