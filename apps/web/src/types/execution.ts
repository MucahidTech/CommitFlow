import type { ExecutionProgress } from "@commitflow/shared";

export type { ExecutionProgress as SavedExecutionProgress };

/** Response from GET /execution/status */
export interface ExecutionStatusResponse {
  success: boolean;
  hasState: boolean;
  progress: ExecutionProgress | null;
}
