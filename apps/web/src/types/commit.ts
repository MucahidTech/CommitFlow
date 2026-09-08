/**
 * Commit status types for the frontend.
 * Mirrors the statuses from @commitflow/shared.
 */
export type CommitStatus = "pending" | "in_progress" | "completed" | "failed";

/** A single commit item in the roadmap */
export interface RoadmapCommit {
  id: string;
  phase: number;
  order: number;
  type: string;
  scope?: string;
  subject: string;
  status: CommitStatus;
  error?: string;
}

/** Color mappings for each status */
export const STATUS_COLORS: Record<CommitStatus, string> = {
  pending: "bg-slate-700/50 text-slate-300 border border-slate-600",
  in_progress: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  failed: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
};

/** Label mappings for each status */
export const STATUS_LABELS: Record<CommitStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  failed: "Failed",
};
