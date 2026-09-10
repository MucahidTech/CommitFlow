"use client";

import { Badge } from "../ui/badge";
import { STATUS_COLORS, STATUS_LABELS, type RoadmapCommit } from "@/types/commit";

interface CommitRoadmapProps {
  commits: RoadmapCommit[];
  targetCommitId: string | null;
  completedCommitIds: Set<string>;
  onToggleCompleted: (commitId: string) => void;
  onSelectTarget: (commitId: string) => void;
}

export function CommitRoadmap({
  commits,
  targetCommitId,
  completedCommitIds,
  onToggleCompleted,
  onSelectTarget,
}: CommitRoadmapProps) {
  const totalCount = commits.length;
  const completedCount = commits.filter(
    (c) => c.status === "completed" || completedCommitIds.has(c.id),
  ).length;
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
          commits.map((commit) => (
            <CommitItem
              key={commit.id}
              commit={commit}
              isTarget={targetCommitId === commit.id}
              isCompleted={completedCommitIds.has(commit.id)}
              onToggleCompleted={() => onToggleCompleted(commit.id)}
              onSelectTarget={() => onSelectTarget(commit.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CommitItemProps {
  commit: RoadmapCommit;
  isTarget: boolean;
  isCompleted: boolean;
  onToggleCompleted: () => void;
  onSelectTarget: () => void;
}

function CommitItem({
  commit,
  isTarget,
  isCompleted,
  onToggleCompleted,
  onSelectTarget,
}: CommitItemProps) {
  const fullMessage = `${commit.type}${commit.scope ? `(${commit.scope})` : ""}: ${commit.subject}`;

  return (
    <div
      className={`
        bg-background border rounded p-2.5 flex items-center justify-between gap-2 text-xs transition-colors
        ${isTarget ? "border-primary bg-primary/5" : "border-border"}
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Completed Checkbox */}
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={onToggleCompleted}
          className="w-3.5 h-3.5 rounded border-border text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0"
          aria-label={`Mark commit ${commit.id} as completed`}
        />

        {/* Target Star Button */}
        <button
          type="button"
          onClick={onSelectTarget}
          className={`
            text-sm leading-none transition-colors cursor-pointer shrink-0
            ${isTarget ? "text-yellow-400 font-bold" : "text-text-muted hover:text-yellow-400"}
          `}
          title={isTarget ? "Current Start Target" : "Set as Start Target"}
          aria-label={`Set commit ${commit.id} as execution target`}
        >
          {isTarget ? "★" : "☆"}
        </button>

        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-text-muted text-[11px] shrink-0">{commit.id}</span>
            <span
              className={`font-medium truncate ${isCompleted ? "line-through text-text-muted" : "text-text"}`}
            >
              {fullMessage}
            </span>
          </div>
          {commit.error && (
            <p className="text-[11px] text-red-400 mt-0.5 break-words font-mono">{commit.error}</p>
          )}
        </div>
      </div>

      <Badge color={STATUS_COLORS[commit.status]}>{STATUS_LABELS[commit.status]}</Badge>
    </div>
  );
}
