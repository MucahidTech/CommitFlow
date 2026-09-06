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
    const filesContext =
      request.files.length > 0
        ? request.files
            .map((file) => {
              const status = file.exists ? "EXISTS" : "NEW";
              return `--- FILE: ${file.path} (${status}) ---\n${file.content || "(empty)"}`;
            })
            .join("\n\n")
        : "No file context provided.";

    return `Implement the following commit:
Commit ID: ${request.commitId}
Commit Message: ${request.commitMessage}
Project: ${request.projectContext.projectName}
Path: ${request.projectContext.projectPath}
Description: ${request.projectContext.description ?? "N/A"}
Tech Stack: ${request.projectContext.techStack.join(", ") || "N/A"}

Current file contexts:
${filesContext}

Generate the exact file changes needed to implement this commit.`;
  }
}
