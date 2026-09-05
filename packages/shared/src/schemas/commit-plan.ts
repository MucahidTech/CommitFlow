import { z } from "zod";

/**
 * Schema for a single commit item in the execution plan.
 * This will be expanded in the next commit (006).
 */
export const commitItemSchema = z.object({
  id: z.string(),
  message: z.string(),
});

/**
 * Schema for the complete commit execution plan.
 * This will be expanded in the next commit (006).
 */
export const commitPlanSchema = z.object({
  commits: z.array(commitItemSchema),
});

/** Inferred TypeScript type for a single commit item */
export type CommitItem = z.infer<typeof commitItemSchema>;

/** Inferred TypeScript type for the complete commit plan */
export type CommitPlan = z.infer<typeof commitPlanSchema>;
