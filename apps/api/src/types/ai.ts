/**
 * Types for AI service interactions.
 * These are internal to the API and not shared with the frontend.
 */

/** A file's current content and metadata */
export interface FileContext {
  /** Relative path from project root */
  path: string;
  /** Current file content (empty for new files) */
  content: string;
  /** Whether the file exists in the project */
  exists: boolean;
}

/** Request to generate code for a single commit */
export interface GenerateCodeRequest {
  /** Unique commit identifier (e.g. "001") */
  commitId: string;
  /** Full commit message */
  commitMessage: string;
  /** Project context */
  projectContext: {
    projectPath: string;
    projectName: string;
    description?: string;
    techStack: string[];
  };
  /** Files relevant to this commit */
  files: FileContext[];
}

/** A single file operation */
export interface GeneratedFile {
  /** Relative path from project root */
  path: string;
  /** New file content */
  content: string;
  /** Operation type */
  operation: "create" | "modify" | "delete";
}

/** Response from the AI code generator */
export interface GenerateCodeResponse {
  /** Files to create or modify */
  files: GeneratedFile[];
  /** Human-readable summary of changes */
  summary: string;
}
