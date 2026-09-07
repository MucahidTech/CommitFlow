import { z } from "zod";
import { env } from "../../config/env";
import type { CodeReviewRequest, CodeReviewResponse } from "../../types/ai";

/**
 * Zod schema for validating Gemini's review response.
 */
const codeReviewResponseSchema = z.object({
  approved: z.boolean(),
  feedback: z.string(),
  issues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

/**
 * Gemini API client for code review.
 * Acts as the secondary AI agent that reviews generated code.
 */
export class GeminiService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model = "gemini-2.0-flash";

  constructor() {
    this.apiKey = env.GEMINI_API_KEY;
    this.baseUrl = env.GEMINI_BASE_URL;
  }

  /**
   * Review generated code for a single commit.
   * Throws if the API key is not configured or the API call fails.
   */
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Add it to your .env file.");
    }

    const prompt = this.buildReviewPrompt(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.baseUrl}/v1beta/models/${this.model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        candidates?: {
          content?: {
            parts?: { text?: string }[];
          };
        }[];
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const parsedJson = this.cleanAndParseJson(text);

      return codeReviewResponseSchema.parse(parsedJson);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Build the review prompt for Gemini.
   */
  private buildReviewPrompt(request: CodeReviewRequest): string {
    const filesForReview = request.files
      .map((file) => {
        return `--- FILE: ${file.path} (${file.operation}) ---\n${file.content}`;
      })
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
  "issues": ["issue1", "issue2"],  // empty if approved
  "suggestions": ["suggestion1"]  // empty if approved
}

Rules:
- approved=true ONLY if code is correct and safe to apply
- approved=false if there are ANY blockers
- Be strict but fair
- Return ONLY valid JSON (no markdown wrapping)`;
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
