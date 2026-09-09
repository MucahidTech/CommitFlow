"use client";

import { Badge } from "../ui/badge";
import { STATUS_COLORS, STATUS_LABELS, type RoadmapCommit } from "@/types/commit";

interface CommitRoadmapProps {
  commits: RoadmapCommit[];
}

export function CommitRoadmap({ commits }: CommitRoadmapProps) {
  const totalCount = commits.length;
  const completedCount = commits.filter((c) => c.status === "completed").length;
  const failedCount = commits.filter((c) => c.status === "failed").length;
  const inProgressCount = commits.filter((c) => c.status === "in_progress").length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3 shrink-0">
        <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Commit Roadmap</h3>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{totalCount} total</span>
          <span className="text-emerald-400">{completedCount} completed</span>
          <span className="text-blue-400">{inProgressCount} in progress</span>
          <span className="text-red-400">{failedCount} failed</span>
        </div>
      </div>

      {/* List container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {commits.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-muted italic">
            No commits parsed yet. Enter a commit plan to start.
          </div>
        ) : (
          commits.map((commit) => <CommitItem key={commit.id} commit={commit} />)
        )}
      </div>
    </div>
  );
}

function CommitItem({ commit }: { commit: RoadmapCommit }) {
  const fullMessage = `${commit.type}${commit.scope ? `(${commit.scope})` : ""}: ${commit.subject}`;

  return (
    <div className="bg-background border border-border rounded p-2.5 flex items-start justify-between gap-2 text-xs">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-text-muted text-[11px] shrink-0">{commit.id}</span>
          <span className="text-text font-medium truncate">{fullMessage}</span>
        </div>
        {commit.error && (
          <p className="text-[11px] text-red-400 mt-1 break-words font-mono">{commit.error}</p>
        )}
      </div>

      <Badge color={STATUS_COLORS[commit.status]}>{STATUS_LABELS[commit.status]}</Badge>
    </div>
  );
}
