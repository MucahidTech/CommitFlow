"use client";

import { useState } from "react";
import { ProjectForm } from "@/components/dashboard/project-form";
import { CommitPlanForm } from "@/components/dashboard/commit-plan-form";
import { CommitRoadmap } from "@/components/dashboard/commit-roadmap";
import { ConsoleLog } from "@/components/dashboard/console-log";
import { useExecutePlan } from "@/hooks/use-execute-plan";
import type { RoadmapCommit } from "@/types/commit";

export default function HomePage() {
  const [commits, setCommits] = useState<RoadmapCommit[]>([]);
  const { isExecuting, events } = useExecutePlan();

  const handlePlanSubmit = (planText: string) => {
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
        status: "pending",
      };
    });

    setCommits(parsed);
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <header className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-primary">CommitFlow</h1>
        <p className="text-text-muted mt-1">Configure project context and commit plan execution.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-surface p-6 rounded-xl border border-border">
          <h2 className="text-xl font-semibold mb-4 text-text">Project Setup</h2>
          <ProjectForm onSubmit={(data) => console.log("Project Data:", data)} />
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
    </main>
  );
}
