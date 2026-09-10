import { z } from "zod";

/**
 * Schema for project execution context.
 * Provides AI agents with essential project information.
 */
export const projectContextSchema = z
  .object({
    projectPath: z.string().min(1),
    projectName: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    userContext: z.string().max(10000).optional(),
    techStack: z.array(z.string().min(1).max(50)).max(20).default([]),
    existingFiles: z.array(z.string().min(1)).max(1000).default([]),
    safeMode: z.boolean().default(true),
  })
  .strict();

/**
 * Input schema for project context.
 * All fields except projectPath are optional.
 */
export const projectContextInputSchema = projectContextSchema.partial({
  projectName: true,
  description: true,
  userContext: true,
  techStack: true,
  existingFiles: true,
  safeMode: true,
});

/** Inferred TypeScript type for project context */
export type ProjectContext = z.infer<typeof projectContextSchema>;

/** Inferred TypeScript type for project context input */
export type ProjectContextInput = z.infer<typeof projectContextInputSchema>;
