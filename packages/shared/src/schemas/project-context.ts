import { z } from "zod";

/**
 * Schema for project execution context.
 * Provides AI agents with essential project information.
 */
export const projectContextSchema = z
  .object({
    /** Absolute or relative path to the target project */
    projectPath: z.string().min(1),

    /** Project name for identification */
    projectName: z.string().min(1).max(100),

    /** Optional project description */
    description: z.string().max(2000).optional(),

    /** List of technologies or frameworks in use */
    techStack: z.array(z.string().min(1).max(50)).max(20).default([]),

    /** Existing files in the project (relative paths) */
    existingFiles: z.array(z.string().min(1)).max(1000).default([]),

    /** Whether to run in safe mode (preview only, no commit) */
    safeMode: z.boolean().default(true),
  })
  .strict();

/** Inferred TypeScript type for project context */
export type ProjectContext = z.infer<typeof projectContextSchema>;
