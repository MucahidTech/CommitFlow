"use client";

import type { AnalyzeState } from "@/types/snapshot";
import { Button } from "../ui/button";

interface ContextInitializerProps {
  projectPath: string | null;
  state: AnalyzeState;
  onAnalyze: () => void;
  onReset: () => void;
}

/**
 * Component that shows the project snapshot analysis state.
 * Displays: idle, analyzing, success (with details), error.
 */
export function ContextInitializer({
  projectPath,
  state,
  onAnalyze,
  onReset,
}: ContextInitializerProps) {
  if (!projectPath) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-text">Project Context</h3>
        <div className="text-sm italic text-text-muted">
          Set and submit the project path above to enable analysis.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-lg font-semibold text-text">Project Context</h3>
        {state.status === "success" && (
          <span className="text-xs font-medium text-emerald-400">Analyzed</span>
        )}
        {state.status === "analyzing" && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            Analyzing...
          </span>
        )}
      </div>

      {state.status === "idle" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Analyze the target project to build a snapshot of its structure, dependencies, and git
            history for AI context.
          </p>
          <div>
            <Button onClick={onAnalyze} variant="secondary" size="sm">
              Analyze Project
            </Button>
          </div>
        </div>
      )}

      {state.status === "analyzing" && (
        <div className="text-sm italic text-text-muted">
          Scanning file structure, key files, and git repository status...
        </div>
      )}

      {state.status === "success" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem label="Project Name" value={state.snapshot.projectName} />
            <InfoItem label="Files Found" value={String(state.snapshot.structure.length)} />
            <InfoItem label="Key Files" value={String(state.snapshot.keyFiles.length)} />
            <InfoItem label="Git Enabled" value={state.snapshot.git ? "Yes" : "No"} />
          </div>

          {state.snapshot.techStack.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs text-text-muted">Tech Stack</div>
              <div className="flex flex-wrap gap-1.5">
                {state.snapshot.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-slate-600 bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {state.snapshot.git && (
            <div className="text-xs text-text-muted">
              Branch:{" "}
              <span className="font-mono text-text">{state.snapshot.git.currentBranch}</span>
              {" · "}
              Commits: <span className="text-text">{state.snapshot.git.totalCommits}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-border/50">
            <Button onClick={onAnalyze} variant="secondary" size="sm">
              Re-scan
            </Button>
            <Button onClick={onReset} variant="secondary" size="sm">
              Clear Context
            </Button>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-red-400">{state.message}</div>
          <div>
            <Button onClick={onAnalyze} variant="secondary" size="sm">
              Retry Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="truncate font-medium text-text">{value}</div>
    </div>
  );
}
