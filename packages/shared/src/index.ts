/**
 * @commitflow/shared
 * Shared zod schemas and inferred types for CommitFlow
 *
 * This package provides:
 * - Zod schemas for runtime validation
 * - Inferred TypeScript types for compile-time safety
 * - Enums for consistent values across the application
 */

// ─── Schemas (runtime values) ───────────────────────────────
export { commitTypeEnum, commitStatusEnum } from "./schemas/commit-plan";
export { commitItemSchema, commitItemInputSchema } from "./schemas/commit-plan";
export { commitPlanSchema, commitPlanInputSchema } from "./schemas/commit-plan";
export { projectContextSchema, projectContextInputSchema } from "./schemas/project-context";

// ─── Types (compile-time only) ──────────────────────────────
export type { CommitItem, CommitItemInput } from "./schemas/commit-plan";
export type { CommitPlan, CommitPlanInput } from "./schemas/commit-plan";
export type { CommitStatus, CommitType } from "./schemas/commit-plan";
export type { ProjectContext, ProjectContextInput } from "./schemas/project-context";
