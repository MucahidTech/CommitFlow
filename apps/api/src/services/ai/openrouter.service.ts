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

/** Internal shape of OpenRouter chat completion response */
interface OpenRouterResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
    code?: string;
  };
}

/**
 * OpenRouter API client for code review (Reviewer Agent).
 *
 * Uses a retry cascade to handle models that do not support JSON mode:
 * 1. Try with response_format: { type: "json_object" }
 * 2. Fallback: retry with explicit JSON instructions in prompt
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

    // Attempt 1: Native JSON mode
    try {
      const text = await this.callModel(selectedModel, prompt, true);
      return this.parseResponse(text);
    } catch (error) {
      if (!this.isJsonModeError(error)) {
        // Not a JSON-mode issue — rethrow
        throw error;
      }
      // Fall through to fallback
      console.warn(
        `[OpenRouter] Model "${selectedModel}" does not support JSON mode. Retrying with prompt-only JSON.`,
      );
    }

    // Attempt 2: Prompt-only JSON
    try {
      const text = await this.callModel(selectedModel, prompt, false);
      return this.parseResponse(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `OpenRouter review failed after 2 attempts (model: ${selectedModel}): ${message}`,
      );
    }
  }

  /**
   * Perform the actual API call.
   */
  private async callModel(model: string, prompt: string, useJsonMode: boolean): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const body: Record<string, unknown> = {
        model,
        messages: [
          {
            role: "user",
            content: useJsonMode
              ? prompt
              : `${prompt}\n\nYou MUST respond with a single valid JSON object only. No markdown, no explanation. Start with { and end with }.`,
          },
        ],
        temperature: 0.2,
      };

      if (useJsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "CommitFlow Reviewer Agent",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const text = data.choices?.[0]?.message?.content ?? "";
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Parse the model's response into a validated CodeReviewResponse.
   */
  private parseResponse(text: string): CodeReviewResponse {
    const parsedJson = this.extractJson(text);
    return codeReviewResponseSchema.parse(parsedJson);
  }

  /**
   * Detect whether an error is caused by JSON mode incompatibility.
   */
  private isJsonModeError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes("json_validate_failed") ||
      msg.includes("failed to validate json") ||
      msg.includes("json mode") ||
      msg.includes("response_format") ||
      msg.includes("structured-outputs") ||
      msg.includes("structured_outputs") ||
      msg.includes("structured outputs")
    );
  }

  /**
   * Extract JSON from a text response using multiple strategies.
   */
  private extractJson(text: string): unknown {
    const trimmed = text.trim();

    // 1. Direct parse
    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue
    }

    // 2. Extract from markdown code fence
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // Continue
      }
    }

    // 3. Extract first {...} block
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Continue
      }
    }

    throw new Error(
      `Failed to extract JSON from model response. Response preview: ${trimmed.slice(0, 200)}`,
    );
  }

  /**
   * Build the review prompt.
   */
  private buildReviewPrompt(request: CodeReviewRequest): string {
    const filesForReview = request.files
      .map((file) => `--- FILE: ${file.path} (${file.operation}) ---\n${file.content}`)
      .join("\n\n");

    return `You are a senior code reviewer evaluating generated code for an atomic commit.

═══ COMMIT CONTEXT ═══
Commit ID: ${request.commitId}
Commit Message: ${request.commitMessage}
Project: ${request.projectContext.projectName}
Generation Summary: ${request.generationSummary}

═══ GENERATED FILES ═══
${filesForReview}

═══ REVIEW GUIDELINES ═══

Classify every finding into ONE of two categories:

** BLOCKERS ** (require approved=false):
- Syntax errors or code that will not run
- Clear type errors that break compilation
- Security vulnerabilities (secrets, injection, XSS)
- Code that does NOT implement the commit message at all
- Data loss or file corruption risks

** SUGGESTIONS ** (do NOT block approval):
- Architectural improvements
- Missing optional peer dependencies or dev conveniences
- Style preferences (naming, structure)
- Edge cases that are not core to the commit
- Documentation additions
- Performance optimizations

═══ DECISION RULES ═══

1. approved = true IF:
   - No blockers found
   - Code implements the commit message reasonably
   - Even if there are suggestions

2. approved = false IF:
   - At least one blocker found

3. Be pragmatic:
   - This is ONE commit in a multi-commit plan, not a final review
   - Future commits can improve things
   - Do NOT reject for "nice to have" issues
   - Do NOT reject for issues outside the commit's scope

4. If uncertain, prefer APPROVE with suggestions over REJECT.

═══ RESPONSE FORMAT ═══

Return a single valid JSON object with this EXACT structure:
{
  "approved": boolean,
  "feedback": "Concise explanation of the decision (1-3 sentences)",
  "issues": ["blocker1", "blocker2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Rules:
- "issues" contains ONLY blockers (empty array if approved)
- "suggestions" contains non-blocking improvements (always allowed)
- feedback must be concise and actionable
- Return ONLY the JSON object, no markdown, no explanation`;
  }
}
