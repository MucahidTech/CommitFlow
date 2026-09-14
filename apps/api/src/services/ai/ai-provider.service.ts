import { z } from "zod";
import type { ProjectSnapshot, ProviderConfig } from "@commitflow/shared";
import { env } from "../../config/env";
import { PROVIDER_REGISTRY } from "./provider-registry";
import type {
  CodeReviewRequest,
  CodeReviewResponse,
  GenerateCodeRequest,
  GenerateCodeResponse,
} from "../../types/ai";

/** Zod schema for code generation response validation */
const generatedFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  operation: z.enum(["create", "modify", "delete"]),
});

const generateCodeResponseSchema = z.object({
  files: z.array(generatedFileSchema),
  summary: z.string(),
});

/** Zod schema for code review response validation */
const codeReviewResponseSchema = z.object({
  approved: z.boolean(),
  feedback: z.string(),
  issues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

/** Internal shape of an OpenAI-compatible chat completion response */
interface ChatCompletionResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

/**
 * Unified AI provider service.
 * Handles code generation and code review across multiple providers
 * (DeepSeek, OpenRouter, Groq) using the OpenAI-compatible API.
 */
export class AiProviderService {
  /**
   * Generate code changes for a single commit.
   */
  async generateCode(
    config: ProviderConfig,
    request: GenerateCodeRequest,
  ): Promise<GenerateCodeResponse> {
    const systemPrompt = this.buildGenerateSystemPrompt();
    const userPrompt = this.buildGenerateUserPrompt(request);

    const content = await this.callChat(config, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const parsed = this.extractJson(content);
    return generateCodeResponseSchema.parse(parsed);
  }

  /**
   * Review generated code.
   */
  async reviewCode(
    config: ProviderConfig,
    request: CodeReviewRequest,
  ): Promise<CodeReviewResponse> {
    const prompt = this.buildReviewPrompt(request);

    const content = await this.callChat(config, [{ role: "user", content: prompt }]);

    const parsed = this.extractJson(content);
    return codeReviewResponseSchema.parse(parsed);
  }

  /**
   * Core chat call — used by both generate and review.
   */
  private async callChat(
    config: ProviderConfig,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    // Resolve config against defaults
    const registryEntry = PROVIDER_REGISTRY[config.provider];
    const apiKey = config.apiKey ?? this.getEnvFallbackKey(config.provider);
    const baseUrl = config.baseUrl ?? registryEntry.baseUrl;
    const model = config.model ?? registryEntry.defaultModel;

    if (!apiKey) {
      throw new Error(
        `${config.provider.toUpperCase()} API key is not configured. ` +
          `Add it in the providers settings or in the .env file.`,
      );
    }

    const body = {
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore if already aborted
      }
    }, 90000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(registryEntry.extraHeaders ?? {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${config.provider} API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const text = data.choices?.[0]?.message?.content ?? "";
      return text;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`${config.provider} request timed out after 90s`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get env fallback key for a provider.
   * Supports both new and legacy env variable names.
   */
  private getEnvFallbackKey(provider: string): string | undefined {
    switch (provider) {
      case "deepseek":
        return env.DEEPSEEK_API_KEY;
      case "openrouter":
        return env.OPENROUTER_API_KEY;
      case "groq":
        return env.GROQ_API_KEY;
      default:
        return undefined;
    }
  }

  /**
   * Extract JSON from a text response (handles markdown fences, extra text).
   */
  private extractJson(text: string): unknown {
    const trimmed = text.trim();

    // 1. Direct parse
    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue
    }

    // 2. From markdown code fence
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // Continue
      }
    }

    // 3. First {...} block
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // Continue
      }
    }

    throw new Error(`Failed to extract JSON from response. Preview: ${trimmed.slice(0, 200)}`);
  }

  // ─── Prompt builders ─────────────────────────────────────

  private buildGenerateSystemPrompt(): string {
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

  private buildGenerateUserPrompt(request: GenerateCodeRequest): string {
    let prompt = "";

    if (request.snapshot) {
      prompt += `${this.buildSnapshotSection(request.snapshot)}\n\n`;
    }

    prompt += `═══ COMMIT TO IMPLEMENT ═══
Commit ID: ${request.commitId}
Commit Message: ${request.commitMessage}

Project: ${request.projectContext.projectName}
Path: ${request.projectContext.projectPath}
Description: ${request.projectContext.description ?? "N/A"}
Tech Stack: ${request.projectContext.techStack.join(", ") || "N/A"}
`;

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

    if (request.previousFeedback) {
      prompt += `\n═══ PREVIOUS ATTEMPT REJECTED ═══
Your previous code was rejected with this feedback:

${request.previousFeedback}

CRITICAL INSTRUCTIONS:
1. Address ONLY the specific issues mentioned above.
2. Do NOT regenerate the code from scratch — make targeted changes.
3. Preserve ALL correct code from your previous attempt.
4. If a change is described as optional or a suggestion, skip it — focus only on blockers.
5. Return the COMPLETE file contents (not diffs, not placeholders).`;
    }

    prompt += `\n\nGenerate the exact file changes needed to implement this commit.`;
    return prompt;
  }

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

    if (snapshot.structure.length > 0) {
      const totalFiles = snapshot.structure.length;
      parts.push(`\nFile Structure (${totalFiles} files, showing top-level):`);

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

    if (snapshot.keyFiles.length > 0) {
      parts.push(`\nKey Files:`);
      for (const file of snapshot.keyFiles) {
        parts.push(`\n--- ${file.path} (${file.reason}) ---`);
        const truncated = file.content.slice(0, 3000);
        parts.push(truncated);
        if (file.content.length > 3000) {
          parts.push(`... (truncated, ${file.content.length - 3000} more chars)`);
        }
      }
    }

    return parts.join("\n");
  }

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
