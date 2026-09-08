/**
 * Types for Server-Sent Events from the API.
 */

export type ConnectionStatus = "idle" | "connecting" | "open" | "closed" | "error";

export type SseEventType =
  | "connected"
  | "heartbeat"
  | "plan_started"
  | "commit_started"
  | "status"
  | "commit_result"
  | "done";

export interface SseEvent {
  type: SseEventType;
  [key: string]: unknown;
}

export interface StatusEvent extends SseEvent {
  type: "status";
  commitId: string;
  status: string;
  attempt: number;
  message?: string;
}

export interface CommitResultEvent extends SseEvent {
  type: "commit_result";
  commitId: string;
  status: string;
  filesWritten: string[];
  attempts: number;
  error?: string;
}

export interface DoneEvent extends SseEvent {
  type: "done";
  totalCommits: number;
  successCount: number;
  failedCount: number;
}
