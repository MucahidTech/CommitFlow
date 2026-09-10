import { z } from "zod";
import { commitPlanSchema } from "./commit-plan";
import { projectContextSchema } from "./project-context";
import { projectSnapshotSchema } from "./project-snapshot";

/**
 * Result of executing a single commit.
 * Separate from CommitItem (definition) — this is the outcome.
 */
export const commitResultSchema = z
  .object({
    /** Commit ID matching the plan */
    commitId: z.string().min(1).max(10),

    /** Execution outcome */
    status: z.enum(["pending", "completed", "failed", "skipped"]),

    /** Number of attempts made */
    attempts: z.number().int().nonnegative().default(0),

    /** Files written during this commit */
    filesWritten: z.array(z.string()).default([]),

    /** Git commit hash (if successfully committed) */
    commitHash: z.string().optional(),

    /** Error message if failed */
    error: z.string().max(5000).optional(),

    /** ISO timestamp when execution started */
    startedAt: z.string().datetime().optional(),

    /** ISO timestamp when execution completed */
    completedAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * Overall status of an execution session.
 */
export const executionStatusSchema = z.enum([
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
]);

/**
 * Complete execution progress — everything needed to resume.
 */
export const executionProgressSchema = z
  .object({
    /** Unique session ID */
    id: z.string().min(1),

    /** Current status */
    status: executionStatusSchema,

    /** Original project context */
    projectContext: projectContextSchema,

    /** Original commit plan */
    commitPlan: commitPlanSchema,

    /** Project snapshot (nullable — may not exist for empty dirs) */
    snapshot: projectSnapshotSchema.nullable(),

    /** Results of each commit (in order) */
    results: z.array(commitResultSchema).default([]),

    /** Index of the next commit to execute */
    nextCommitIndex: z.number().int().nonnegative().default(0),

    /** SSE stream ID (for resuming broadcast) */
    streamId: z.string().optional(),

    /** Session start time */
    startedAt: z.string().datetime(),

    /** Last update time */
    lastUpdatedAt: z.string().datetime(),

    /** When paused (if applicable) */
    pausedAt: z.string().datetime().optional(),

    /** Reason for pause (e.g., "token_limit", "manual", "error") */
    pauseReason: z.string().max(500).optional(),
  })
  .strict();

/**
 * Input schema for creating a new execution progress.
 */
export const executionProgressInputSchema = executionProgressSchema.partial({
  id: true,
  status: true,
  results: true,
  nextCommitIndex: true,
  startedAt: true,
  lastUpdatedAt: true,
});

/** Inferred TypeScript types */
export type CommitResult = z.infer<typeof commitResultSchema>;
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
export type ExecutionProgress = z.infer<typeof executionProgressSchema>;
export type ExecutionProgressInput = z.infer<typeof executionProgressInputSchema>;
