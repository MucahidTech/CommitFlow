"use client";

import { useCallback, useEffect, useState } from "react";
import { ProjectForm } from "@/components/dashboard/project-form";
import type { ProjectFormData } from "@/components/dashboard/project-form";
import { CommitPlanForm } from "@/components/dashboard/commit-plan-form";
import { CommitRoadmap } from "@/components/dashboard/commit-roadmap";
import { ConsoleLog } from "@/components/dashboard/console-log";
import { Button } from "@/components/ui/button";
import { useExecutePlan } from "@/hooks/use-execute-plan";
import type { RoadmapCommit } from "@/types/commit";
import type { CommitResultEvent, StatusEvent } from "@/types/sse";

function generateStreamId(): string {
  return `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapApiStatus(apiStatus: string): RoadmapCommit["status"] {
  const mapping: Record<string, RoadmapCommit["status"]> = {
    pending: "pending",
    in_progress: "in_progress",
    completed: "completed",
    failed: "failed",
    reading_files: "in_progress",
    generating_code: "in_progress",
    reviewing_code: "in_progress",
    refining_code: "in_progress",
    writing_files: "in_progress",
    running_quality_gate: "in_progress",
    committing: "in_progress",
  };
  return mapping[apiStatus] ?? "pending";
}

function isSameCommit(commitIdA: string, commitIdB: string): boolean {
  if (commitIdA === commitIdB) return true;
  const numA = parseInt(commitIdA, 10);
  const numB = parseInt(commitIdB, 10);
  return !isNaN(numA) && !isNaN(numB) && numA === numB;
}

export default function HomePage() {
  const [projectSetup, setProjectSetup] = useState<ProjectFormData>({
    projectName: "",
    projectPath: "",
    safeMode: true,
  });

  const [planText, setPlanText] = useState<string>("");
  const [commits, setCommits] = useState<RoadmapCommit[]>([]);
  const [, setStreamId] = useState<string | null>(null);

  const { isExecuting, events, lastEvent, executePlan, connectionStatus } = useExecutePlan();

  const handlePlanChange = useCallback((text: string) => {
    setPlanText(text);
    const lines = text.split("\n").filter((line) => line.trim());
    const parsed: RoadmapCommit[] = lines.map((line, index) => {
      const trimmed = line.trim();
      const match = trimmed.match(/^(?:(\d+)\s*-\s*)?(?:(\w+)(?:\(([^)]+)\))?:\s*)?(.+)$/);
      const type = match?.[2] || "feat";
      const scope = match?.[3];
      const subject = match?.[4] || trimmed;

      return {
        id: String(index + 1).padStart(3, "0"),
        phase: 1,
        order: index + 1,
        type,
        scope,
        subject,
        status: "pending" as const,
      };
    });

    setCommits(parsed);
  }, []);

  const handleExecute = useCallback(async () => {
    if (
      !projectSetup.projectPath ||
      !projectSetup.projectName ||
      commits.length === 0 ||
      isExecuting
    ) {
      return;
    }

    setCommits((prev) => prev.map((c) => ({ ...c, status: "pending", error: undefined })));

    const newStreamId = generateStreamId();
    setStreamId(newStreamId);

    const commitPlan = {
      projectPath: projectSetup.projectPath,
      projectName: projectSetup.projectName,
      commits: commits.map((c) => ({
        id: c.id,
        phase: c.phase,
        order: c.order,
        type: c.type,
        scope: c.scope,
        subject: c.subject,
      })),
    };

    const planContext = {
      projectPath: projectSetup.projectPath,
      projectName: projectSetup.projectName,
      safeMode: projectSetup.safeMode,
    };

    await executePlan(planContext, commitPlan, newStreamId);
  }, [projectSetup, commits, isExecuting, executePlan]);

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === "status") {
      const statusEvent = lastEvent as StatusEvent;
      setCommits((prev) =>
        prev.map((c) =>
          isSameCommit(c.id, statusEvent.commitId)
            ? { ...c, status: mapApiStatus(statusEvent.status) }
            : c,
        ),
      );
    }

    if (lastEvent.type === "commit_result") {
      const resultEvent = lastEvent as CommitResultEvent;
      setCommits((prev) =>
        prev.map((c) =>
          isSameCommit(c.id, resultEvent.commitId)
            ? {
                ...c,
                status: resultEvent.status === "completed" ? "completed" : "failed",
                error: resultEvent.error,
              }
            : c,
        ),
      );
    }
  }, [lastEvent]);

  const canExecute = Boolean(
    projectSetup.projectPath && projectSetup.projectName && commits.length > 0 && !isExecuting,
  );

  return (
    <main className="h-screen w-screen bg-background text-text flex flex-col overflow-hidden p-3 gap-3 font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-border pb-2 shrink-0">
        <div>
          <h1 className="font-bold text-sm tracking-wide text-primary">CommitFlow Control Panel</h1>
        </div>

        <div className="flex items-center gap-3">
          {connectionStatus !== "idle" && (
            <span className="text-[11px] px-2 py-0.5 rounded border border-border bg-surface text-text-muted font-mono">
              SSE: <strong className="text-text capitalize">{connectionStatus}</strong>
            </span>
          )}

          {projectSetup.projectName && (
            <div className="text-right text-xs text-text-muted">
              <span className="text-text font-medium">{projectSetup.projectName}</span>
              <span className="mx-1.5">•</span>
              <span className="font-mono text-[11px]">{projectSetup.projectPath}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid View (Viewport Constrained) */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Left Column: Input Panels */}
        <div className="col-span-5 flex flex-col gap-3 h-full min-h-0">
          <ProjectForm values={projectSetup} onChange={setProjectSetup} disabled={isExecuting} />

          <div className="flex-1 min-h-0 flex flex-col">
            <CommitPlanForm value={planText} onChange={handlePlanChange} disabled={isExecuting} />
          </div>

          <Button
            onClick={handleExecute}
            disabled={!canExecute}
            variant="primary"
            size="md"
            className="w-full shrink-0 font-semibold"
          >
            {isExecuting ? "Executing Plan..." : "Execute Plan"}
          </Button>
        </div>

        {/* Right Column: Execution Panels */}
        <div className="col-span-7 flex flex-col gap-3 h-full min-h-0">
          {/* Top Half: Commit Roadmap */}
          <div className="h-1/2 min-h-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
            <CommitRoadmap commits={commits} />
          </div>

          {/* Bottom Half: Console Execution Log */}
          <div className="h-1/2 min-h-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
            <ConsoleLog events={events} isExecuting={isExecuting} />
          </div>
        </div>
      </div>
    </main>
  );
}
