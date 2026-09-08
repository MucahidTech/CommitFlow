"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CommitResultEvent, DoneEvent, SseEvent, StatusEvent } from "@/types/sse";

interface ConsoleLogProps {
  events: SseEvent[];
  isExecuting: boolean;
}

interface FormattedLine {
  text: string;
  colorClass: string;
}

export function ConsoleLog({ events, isExecuting }: ConsoleLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const formattedLines = useMemo<FormattedLine[]>(() => {
    return events.map((event) => ({
      text: formatEvent(event),
      colorClass: getLineColor(event.type),
    }));
  }, [events]);

  // Scroll strictly on new lines
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [formattedLines.length]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <h3 className="text-lg font-semibold text-text">Execution Log</h3>
        {isExecuting ? (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Running
          </span>
        ) : events.length > 0 ? (
          <span className="text-xs text-emerald-400">Completed</span>
        ) : (
          <span className="text-xs text-text-muted">Idle</span>
        )}
      </div>

      <div className="bg-slate-950/90 border border-border rounded-lg p-4 font-mono text-xs md:text-sm overflow-y-auto max-h-96">
        {formattedLines.length === 0 ? (
          <div className="text-slate-500 italic">Waiting for execution to start...</div>
        ) : (
          formattedLines.map((line, index) => (
            <div
              key={index}
              className={`whitespace-pre-wrap break-words leading-relaxed ${line.colorClass}`}
            >
              {line.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function formatEvent(event: SseEvent): string {
  const timestamp = new Date().toLocaleTimeString();

  switch (event.type) {
    case "connected":
      return `[${timestamp}] Connected to stream: ${String(event.streamId ?? "unknown")}`;

    case "plan_started":
      return `[${timestamp}] Plan started: ${String(event.totalCommits ?? 0)} commits`;

    case "commit_started":
      return `[${timestamp}] → Commit ${String(event.commitId ?? "?")}: ${String(event.message ?? "")}`;

    case "status": {
      const statusEv = event as StatusEvent;
      const statusText = statusEv.status ?? "unknown";
      const attemptText = statusEv.attempt ? ` (attempt ${statusEv.attempt})` : "";
      const msg = statusEv.message ? ` - ${statusEv.message}` : "";
      return `[${timestamp}]   ${formatStatusLabel(statusText)}${attemptText}${msg}`;
    }

    case "commit_result": {
      const resultEv = event as CommitResultEvent;
      const resultStatus = resultEv.status ?? "unknown";
      const filesCount = resultEv.filesWritten?.length ?? 0;
      const filesText = filesCount > 0 ? ` (${filesCount} files written)` : "";
      return `[${timestamp}]   Result: ${formatStatusLabel(resultStatus)}${filesText}`;
    }

    case "done": {
      const doneEv = event as DoneEvent;
      return `[${timestamp}] ✓ Execution complete: ${doneEv.successCount ?? 0}/${doneEv.totalCommits ?? 0} succeeded`;
    }

    case "heartbeat":
      return `[${timestamp}] ♥ heartbeat`;

    default:
      return `[${timestamp}] ${event.type}`;
  }
}

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    reading_files: "Reading files",
    generating_code: "Generating code",
    reviewing_code: "Reviewing code",
    refining_code: "Refining code",
    writing_files: "Writing files",
    running_quality_gate: "Running quality gate",
    committing: "Committing",
    completed: "Completed ✓",
    failed: "Failed ✗",
  };
  return labels[status] ?? status;
}

function getLineColor(type: SseEvent["type"] | undefined): string {
  switch (type) {
    case "commit_started":
      return "text-blue-400 font-medium";
    case "commit_result":
      return "text-amber-300";
    case "done":
      return "text-emerald-400 font-bold";
    case "status":
      return "text-slate-300";
    case "heartbeat":
      return "text-slate-600 text-xs";
    default:
      return "text-slate-400";
  }
}
