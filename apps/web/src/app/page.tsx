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

// دالة مساعدة لضمان مطابقة الـ ID سواء كان "001" أو "1"
function isSameCommit(commitIdA: string, commitIdB: string): boolean {
  if (commitIdA === commitIdB) return true;
  const numA = parseInt(commitIdA, 10);
  const numB = parseInt(commitIdB, 10);
  return !isNaN(numA) && !isNaN(numB) && numA === numB;
}

export default function HomePage() {
  const [projectContext, setProjectContext] = useState<ProjectFormData | null>(null);
  const [commits, setCommits] = useState<RoadmapCommit[]>([]);
  const [, setStreamId] = useState<string | null>(null);

  const { isExecuting, events, lastEvent, executePlan, connectionStatus } = useExecutePlan();

  const handleProjectSubmit = useCallback((data: ProjectFormData) => {
    setProjectContext(data);
  }, []);

  const handlePlanSubmit = useCallback((planText: string) => {
    const lines = planText.split("\n").filter((line) => line.trim());
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
    if (!projectContext || commits.length === 0 || isExecuting) {
      return;
    }

    // إعادة تعيين كافة الـ commits إلى pending قبل بدء التنفيذ الجديد
    setCommits((prev) => prev.map((c) => ({ ...c, status: "pending", error: undefined })));

    const newStreamId = generateStreamId();
    setStreamId(newStreamId);

    const commitPlan = {
      projectPath: projectContext.projectPath,
      projectName: projectContext.projectName,
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
      projectPath: projectContext.projectPath,
      projectName: projectContext.projectName,
      safeMode: projectContext.safeMode,
    };

    await executePlan(planContext, commitPlan, newStreamId);
  }, [projectContext, commits, isExecuting, executePlan]);

  // تحديث حالة الـ Roadmap فور وصول أحداث SSE
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

  const canExecute = projectContext !== null && commits.length > 0 && !isExecuting;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <header className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">CommitFlow</h1>
          <p className="text-text-muted mt-1">
            Configure project context and commit plan execution.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {connectionStatus !== "idle" && (
            <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-surface text-text-muted">
              SSE: <strong className="text-text capitalize">{connectionStatus}</strong>
            </span>
          )}

          {projectContext && (
            <div className="text-right text-sm text-text-muted">
              <span className="text-text font-medium">{projectContext.projectName}</span>
              <br />
              <span className="text-xs font-mono">{projectContext.projectPath}</span>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-surface p-6 rounded-xl border border-border">
          <h2 className="text-xl font-semibold mb-4 text-text">Project Setup</h2>
          <ProjectForm onSubmit={handleProjectSubmit} />
        </section>

        <section className="bg-surface p-6 rounded-xl border border-border">
          <h2 className="text-xl font-semibold mb-4 text-text">Commit Plan Input</h2>
          <CommitPlanForm onSubmit={handlePlanSubmit} />
        </section>
      </div>

      <section className="bg-surface p-6 rounded-xl border border-border">
        <CommitRoadmap commits={commits} />
      </section>

      <section className="bg-surface p-6 rounded-xl border border-border">
        <ConsoleLog events={events} isExecuting={isExecuting} />
      </section>

      <div className="flex justify-end">
        <Button onClick={handleExecute} disabled={!canExecute} variant="primary" size="lg">
          {isExecuting ? "Executing Plan..." : "Execute Plan"}
        </Button>
      </div>
    </main>
  );
}
