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
 * Execution status for a commit item.
 */
export const commitStatusEnum = z.enum(["pending", "in_progress", "completed", "failed"]);

/**
 * A single commit item in the execution plan.
 */
export const commitItemSchema = z
  .object({
    /** Unique identifier, e.g. "001" */
    id: z.string().min(1).max(10),

    /** Phase number (0-indexed for grouping related commits) */
    phase: z.number().int().nonnegative(),

    /** Order within the phase (1-indexed) */
    order: z.number().int().positive(),

    /** Conventional commit type */
    type: commitTypeEnum,

    /** Scope of the change (package or domain) */
    scope: z.string().min(1).max(50).optional(),

    /** Commit message subject without type and scope */
    subject: z.string().min(3).max(200),

    /** Optional detailed description */
    description: z.string().max(2000).optional(),

    /** Current execution status */
    status: commitStatusEnum.default("pending"),

    /** Error message if status is failed */
    error: z.string().max(1000).optional(),
  })
  .strict();

/**
 * Input schema for creating a commit item (without status).
 * The status is automatically set to "pending" by the system.
 */
export const commitItemInputSchema = commitItemSchema.omit({
  status: true,
  error: true,
});

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

/**
 * Input schema for creating a commit plan (commits without status).
 */
export const commitPlanInputSchema = commitPlanSchema.extend({
  commits: z.array(commitItemInputSchema).min(1),
});

/** Inferred TypeScript type for a single commit item */
export type CommitItem = z.infer<typeof commitItemSchema>;

/** Inferred TypeScript type for a commit item input (without status) */
export type CommitItemInput = z.infer<typeof commitItemInputSchema>;

/** Inferred TypeScript type for the complete commit plan */
export type CommitPlan = z.infer<typeof commitPlanSchema>;

/** Inferred TypeScript type for commit plan input */
export type CommitPlanInput = z.infer<typeof commitPlanInputSchema>;

/** Inferred TypeScript type for commit status */
export type CommitStatus = z.infer<typeof commitStatusEnum>;

/** Inferred TypeScript type for commit type */
export type CommitType = z.infer<typeof commitTypeEnum>;
