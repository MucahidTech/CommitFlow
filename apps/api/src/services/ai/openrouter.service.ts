import { z } from "zod";
import { env } from "../../config/env";
import type { CodeReviewRequest, CodeReviewResponse } from "../../types/ai";

/**
 * Zod schema for validating review responses.
 */
const codeReviewResponseSchema = z.object({
  approved: z.boolean(),
  feedback: z.string(),
  issues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

/**
 * OpenRouter API client for code review (Reviewer Agent).
 */
export class OpenRouterService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
    this.baseUrl = env.OPENROUTER_BASE_URL;
    this.defaultModel = env.OPENROUTER_REVIEW_MODEL;
  }

  /**
   * Review generated code using OpenRouter.
   * @param request The code review payload
   * @param modelOverride Optional model ID to override the default environment model
   */
  async reviewCode(
    request: CodeReviewRequest,
    modelOverride?: string,
  ): Promise<CodeReviewResponse> {
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured. Add it to your .env file.");
    }

    const selectedModel = modelOverride || this.defaultModel;
    const prompt = this.buildReviewPrompt(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "CommitFlow Reviewer Agent",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        choices?: {
          message?: {
            content?: string;
          };
        }[];
      };

      const text = data.choices?.[0]?.message?.content ?? "{}";
      const parsedJson = this.cleanAndParseJson(text);

      return codeReviewResponseSchema.parse(parsedJson);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Build the review prompt.
   */
  private buildReviewPrompt(request: CodeReviewRequest): string {
    const filesForReview = request.files
      .map((file) => `--- FILE: ${file.path} (${file.operation}) ---\n${file.content}`)
      .join("\n\n");

    return `You are a strict senior code reviewer.

Review the following generated code for this commit:

Commit ID: ${request.commitId}
Commit Message: ${request.commitMessage}

Project: ${request.projectContext.projectName}
Generation Summary: ${request.generationSummary}

Generated files:
${filesForReview}

Review criteria:
1. Does the code correctly implement the commit message?
2. Are there any syntax errors or type errors?
3. Is the code secure (no secrets, no vulnerabilities)?
4. Does it follow best practices?
5. Is the code maintainable and readable?

Return JSON with this EXACT structure:
{
  "approved": boolean,
  "feedback": "string explaining your decision",
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1"]
}

Rules:
- approved=true ONLY if code is correct and safe to apply
- approved=false if there are ANY blockers
- Be strict but fair
- Return ONLY valid JSON`;
  }

  /**
   * Clean and parse JSON from model response.
   */
  private cleanAndParseJson(content: string): unknown {
    const sanitized = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    return JSON.parse(sanitized);
  }
}
