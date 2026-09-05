import { z } from "zod";

/**
 * Schema for project execution context.
 * This will be expanded in the next commit (006).
 */
export const projectContextSchema = z.object({
  projectPath: z.string(),
});

/** Inferred TypeScript type for project context */
export type ProjectContext = z.infer<typeof projectContextSchema>;
