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
export {
  fileInfoSchema,
  gitSnapshotSchema,
  configSnapshotSchema,
  keyFileSchema,
  projectSnapshotSchema,
  projectSnapshotInputSchema,
} from "./schemas/project-snapshot";
export { commitResultSchema, executionStatusSchema } from "./schemas/execution-progress";
export {
  executionProgressSchema,
  executionProgressInputSchema,
} from "./schemas/execution-progress";
export { openRouterModelSchema, modelsListResponseSchema } from "./schemas/openrouter-model";

// ─── Types (compile-time only) ──────────────────────────────
export type { CommitItem, CommitItemInput } from "./schemas/commit-plan";
export type { CommitPlan, CommitPlanInput } from "./schemas/commit-plan";
export type { CommitStatus, CommitType } from "./schemas/commit-plan";
export type { ProjectContext, ProjectContextInput } from "./schemas/project-context";
export type {
  FileInfo,
  GitSnapshot,
  ConfigSnapshot,
  KeyFile,
  ProjectSnapshot,
  ProjectSnapshotInput,
} from "./schemas/project-snapshot";
export type { CommitResult, ExecutionStatus } from "./schemas/execution-progress";
export type { ExecutionProgress, ExecutionProgressInput } from "./schemas/execution-progress";
export type { OpenRouterModel, ModelsListResponse } from "./schemas/openrouter-model";
