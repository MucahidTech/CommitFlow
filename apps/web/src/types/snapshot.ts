import type { ProjectSnapshot } from "@commitflow/shared";

export type { ProjectSnapshot };

/** Analyze states in the UI */
export type AnalyzeState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "success"; snapshot: ProjectSnapshot }
  | { status: "error"; message: string };
