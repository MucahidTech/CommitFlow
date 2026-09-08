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
    <div className="flex flex-col gap-4">
      {/* Summary header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-lg font-semibold text-text">Commit Roadmap</h3>
        <div className="flex gap-3 text-sm text-text-muted">
          <span>{totalCount} total</span>
          <span className="text-green-400">{completedCount} completed</span>
          <span className="text-blue-400">{inProgressCount} in progress</span>
          <span className="text-red-400">{failedCount} failed</span>
        </div>
      </div>

      {/* Commits list */}
      {commits.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No commits yet. Paste your commit plan to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {commits.map((commit) => (
            <CommitItem key={commit.id} commit={commit} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommitItem({ commit }: { commit: RoadmapCommit }) {
  const fullMessage = `${commit.type}${commit.scope ? `(${commit.scope})` : ""}: ${commit.subject}`;

  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-muted">{commit.id}</span>
          <span className="text-sm text-text truncate">{fullMessage}</span>
        </div>

        {commit.error && <p className="text-xs text-red-400 mt-1 break-words">{commit.error}</p>}
      </div>

      <Badge color={STATUS_COLORS[commit.status]}>{STATUS_LABELS[commit.status]}</Badge>
    </div>
  );
}
