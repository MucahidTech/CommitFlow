import { z } from "zod";

/**
 * Commit type follows Conventional Commits specification.
 * @see https://www.conventionalcommits.org/en/v1.0.0/
 */
export const commitTypeEnum = z.enum([
  "feat",
  "fix",
  "docs",
  "chore",
  "refactor",
  "test",
  "ci",
  "build",
  "perf",
  "style",
]);

/**
 * A single commit item in the execution plan.
 */
export const commitItemSchema = z
  .object({
    id: z.string().min(1).max(10),
    phase: z.number().int().nonnegative(),
    order: z.number().int().positive(),
    type: commitTypeEnum,
    scope: z.string().min(1).max(50).optional(), // تجعله اختارياً لأن بعض الكوميتات لا تحتاج Scope
    subject: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
    files: z.array(z.string().min(1)).optional(), // قائمة الملفات المستهدفة بالتغيير
    status: z.enum(["pending", "in_progress", "completed", "failed"]).default("pending"),
    error: z.string().max(1000).optional(),
  })
  .strict();

/**
 * The complete commit execution plan.
 */
export const commitPlanSchema = z
  .object({
    /** Target project path where commits will be applied */
    projectPath: z.string().min(1),

    /** Human-readable project name */
    projectName: z.string().min(1).max(100),

    /** List of commits to execute in order */
    commits: z.array(commitItemSchema).min(1),
  })
  .strict();

/** Inferred TypeScript type for a single commit item */
export type CommitItem = z.infer<typeof commitItemSchema>;

/** Inferred TypeScript type for the complete commit plan */
export type CommitPlan = z.infer<typeof commitPlanSchema>;
