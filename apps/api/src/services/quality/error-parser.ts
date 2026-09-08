/** A parsed TypeScript compilation error */
export interface TsError {
  /** File path relative to project root */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
  /** Error code (e.g. TS2304) */
  code: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Parse TypeScript compiler output into structured errors.
 * Handles format: file(line,column): error TSxxxx: message
 * Supports both POSIX and Windows relative/absolute pathing.
 */
export function parseTsErrors(output: string, projectPath?: string): TsError[] {
  const errors: TsError[] = [];
  // Regex supporting optionally drive letter C: and capturing line, col, TS code, message
  const regex = /^(?:[a-zA-Z]:)?([^(]+)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/gm;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(output)) !== null) {
    let filePath = match[1]?.trim() ?? "";

    // Normalize path to relative if projectPath is supplied
    if (projectPath && filePath.startsWith(projectPath)) {
      filePath = filePath.replace(projectPath, "").replace(/^[/\\]+/, "");
    }

    errors.push({
      file: filePath,
      line: parseInt(match[2] ?? "0", 10),
      column: parseInt(match[3] ?? "0", 10),
      code: match[4] ?? "",
      message: match[5] ?? "",
    });
  }

  return errors;
}

/**
 * Parse Prettier or Linter formatting errors.
 */
export function parseFormatErrors(output: string): string[] {
  const errors: string[] = [];
  const lines = output.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    if (
      line.includes("Error") ||
      line.includes("error") ||
      line.includes("[warn]") ||
      line.includes("[error]")
    ) {
      errors.push(line.trim());
    }
  }

  return errors;
}

/**
 * Convert parsed errors to a compact string for AI prompts.
 */
export function formatErrorsForAi(tsErrors: TsError[], formatErrors: string[]): string {
  const parts: string[] = [];

  if (tsErrors.length > 0) {
    parts.push("TypeScript errors:");
    for (const err of tsErrors.slice(0, 20)) {
      parts.push(`  ${err.file}:${err.line} - ${err.message} (${err.code})`);
    }
    if (tsErrors.length > 20) {
      parts.push(`  ... and ${tsErrors.length - 20} more errors`);
    }
  }

  if (formatErrors.length > 0) {
    parts.push("Format errors:");
    for (const err of formatErrors.slice(0, 10)) {
      parts.push(`  ${err}`);
    }
  }

  return parts.join("\n");
}
