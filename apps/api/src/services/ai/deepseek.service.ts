import { z } from "zod";
import type { ProjectSnapshot } from "@commitflow/shared";
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
    let prompt = "";

    // Project snapshot — sent only at the first attempt
    if (request.snapshot) {
      prompt += `${this.buildSnapshotSection(request.snapshot)}\n\n`;
    }

    // Commit details
    prompt += `═══ COMMIT TO IMPLEMENT ═══
Commit ID: ${request.commitId}
Commit Message: ${request.commitMessage}

Project: ${request.projectContext.projectName}
Path: ${request.projectContext.projectPath}
Description: ${request.projectContext.description ?? "N/A"}
Tech Stack: ${request.projectContext.techStack.join(", ") || "N/A"}
`;

    // File contexts
    const filesContext =
      request.files.length > 0
        ? request.files
            .map((file) => {
              const status = file.exists ? "EXISTS" : "NEW";
              return `--- FILE: ${file.path} (${status}) ---\n${file.content || "(empty)"}`;
            })
            .join("\n\n")
        : "No file context provided.";

    prompt += `\n═══ CURRENT FILE CONTEXTS ═══\n${filesContext}\n`;

    if (request.previousIssues && request.previousIssues.length > 0) {
      prompt += `\n═══ CODE REVIEW ISSUES TO FIX ═══\n`;
      for (const issue of request.previousIssues) {
        prompt += `- ${issue}\n`;
      }
    }

    // Refinement feedback
    if (request.previousFeedback) {
      prompt += `\n═══ QUALITY GATE FAILURE - FIX REQUIRED ═══
Your previous attempt FAILED compilation/quality checks:

${request.previousFeedback}

CRITICAL FIX INSTRUCTIONS:
1. Fix EVERY listed TypeScript/formatting error above.
2. Return the COMPLETE contents for modified files (do not omit parts or use placeholders).
3. Preserve all valid logic and existing correct code.
4. Verify import paths, exported types, and function signatures.`;
    }

    prompt += `\n\nGenerate the exact file changes needed to implement this commit.`;
    return prompt;
  }

  /**
   * Build the snapshot section of the prompt.
   * Sends the complete project context once at the start.
   */
  private buildSnapshotSection(snapshot: ProjectSnapshot): string {
    const parts: string[] = [];

    parts.push(`═══ PROJECT SNAPSHOT ═══`);
    parts.push(`Project: ${snapshot.projectName}`);
    parts.push(`Tech Stack: ${snapshot.techStack.join(", ") || "unknown"}`);

    if (snapshot.git) {
      parts.push(`\nGit:`);
      parts.push(`  Branch: ${snapshot.git.currentBranch}`);
      parts.push(`  Total Commits: ${snapshot.git.totalCommits}`);
      if (snapshot.git.remoteUrl) {
        parts.push(`  Remote: ${snapshot.git.remoteUrl}`);
      }
      if (snapshot.git.recentCommits.length > 0) {
        parts.push(`  Recent commits:`);
        for (const msg of snapshot.git.recentCommits.slice(0, 5)) {
          parts.push(`    - ${msg}`);
        }
      }
    } else {
      parts.push(`\nGit: not a repository (empty or new project)`);
    }

    // File structure — summarized
    if (snapshot.structure.length > 0) {
      const totalFiles = snapshot.structure.length;
      parts.push(`\nFile Structure (${totalFiles} files, showing top-level):`);

      // Group by top-level directory
      const groups = new Map<string, number>();
      for (const file of snapshot.structure) {
        const topLevel = file.path.split("/")[0] ?? file.path;
        groups.set(topLevel, (groups.get(topLevel) ?? 0) + 1);
      }

      for (const [dir, count] of Array.from(groups.entries()).slice(0, 15)) {
        parts.push(`  ${dir}/ (${count} files)`);
      }
    } else {
      parts.push(`\nFile Structure: empty (new project)`);
    }

    // Key files content
    if (snapshot.keyFiles.length > 0) {
      parts.push(`\nKey Files:`);
      for (const file of snapshot.keyFiles) {
        parts.push(`\n--- ${file.path} (${file.reason}) ---`);
        // Limit each key file to avoid prompt bloat
        const truncated = file.content.slice(0, 3000);
        parts.push(truncated);
        if (file.content.length > 3000) {
          parts.push(`... (truncated, ${file.content.length - 3000} more chars)`);
        }
      }
    }

    return parts.join("\n");
  }
}
