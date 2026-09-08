import { z } from "zod";
import { env } from "../../config/env";
import type { GenerateCodeRequest, GenerateCodeResponse } from "../../types/ai";

const generatedFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  operation: z.enum(["create", "modify", "delete"]),
});

const generateCodeResponseSchema = z.object({
  files: z.array(generatedFileSchema),
  summary: z.string(),
});

/**
 * DeepSeek API client for code generation.
 * Acts as the primary AI agent that generates code changes.
 */
export class DeepSeekService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model = "deepseek-chat";

  constructor() {
    this.apiKey = env.DEEPSEEK_API_KEY;
    this.baseUrl = env.DEEPSEEK_BASE_URL;
  }

  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    if (!this.apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured. Add it to your .env file.");
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };

      const content = data.choices[0]?.message.content ?? "{}";
      const parsedJson = this.cleanAndParseJson(content);

      return generateCodeResponseSchema.parse(parsedJson);
    } finally {
      clearTimeout(timeout);
    }
  }

  private cleanAndParseJson(content: string): unknown {
    const sanitized = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    return JSON.parse(sanitized);
  }

  private buildSystemPrompt(): string {
    return `You are an expert software engineer implementing atomic commits.
Your task is to generate file changes for a specific commit.

Rules:
1. Return ONLY valid JSON (no markdown wrapping, no conversational explanation)
2. Response structure MUST match: { "files": [{ "path": string, "content": string, "operation": "create" | "modify" | "delete" }], "summary": string }
3. Read current file content carefully before modifying
4. Preserve existing code unless the commit requires changing it
5. Follow the project's conventions (TypeScript strict, ESLint, Prettier)
6. Never include secrets or API keys in generated code`;
  }

  private buildUserPrompt(request: GenerateCodeRequest): string {
    let prompt = `Project: ${request.projectContext.projectName}\nCommit Message: ${request.commitMessage}`;

    if (request.projectContext.description) {
      prompt += `\nDescription: ${request.projectContext.description}`;
    }

    if (request.projectContext.techStack.length > 0) {
      prompt += `\nTech Stack: ${request.projectContext.techStack.join(", ")}`;
    }

    if (request.files && request.files.length > 0) {
      prompt += `\n\n═══ EXISTING FILES CONTEXT ═══\n`;
      for (const file of request.files) {
        prompt += `\nFile: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n`;
      }
    }

    if (request.previousIssues && request.previousIssues.length > 0) {
      prompt += `\n\n═══ CODE REVIEW ISSUES TO FIX ═══\n`;
      for (const issue of request.previousIssues) {
        prompt += `- ${issue}\n`;
      }
    }

    if (request.previousFeedback) {
      prompt += `\n\n═══ QUALITY GATE FAILURE - FIX REQUIRED ═══

Your previous attempt FAILED compilation/quality checks:

${request.previousFeedback}

CRITICAL FIX INSTRUCTIONS:
1. Fix EVERY listed TypeScript/formatting error above.
2. Return the COMPLETE contents for modified files (do not omit parts or use placeholders).
3. Preserve all valid logic and existing correct code.
4. Verify import paths, exported types, and function signatures.`;
    }

    return prompt;
  }
}
