"use client";

import { Button } from "../ui/button";
import type { SavedExecutionProgress } from "@/types/execution";

interface ExecutionControlsProps {
  isExecuting: boolean;
  savedProgress: SavedExecutionProgress | null;
  canExecute: boolean;
  onExecute: () => void;
  onPause: () => void;
  onResume: () => void;
  onClearSession: () => void;
}

export function ExecutionControls({
  isExecuting,
  savedProgress,
  canExecute,
  onExecute,
  onPause,
  onResume,
  onClearSession,
}: ExecutionControlsProps) {
  // حالة التشغيل الحالية
  if (isExecuting) {
    return (
      <div className="flex gap-2">
        <Button onClick={onPause} variant="danger" size="md" className="flex-1">
          Pause Execution
        </Button>
        <Button disabled variant="secondary" size="md" className="flex-1">
          Executing...
        </Button>
      </div>
    );
  }

  // وجود جلسة متوقفة مؤقتاً
  if (savedProgress?.status === "paused") {
    const completedCount = savedProgress.results.length;
    const remainingText =
      completedCount > 0
        ? `${completedCount} commit${completedCount > 1 ? "s" : ""} completed`
        : "no commits completed";

    return (
      <div className="flex flex-col gap-2">
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-400">
          <div className="font-medium">Paused session found</div>
          <div className="mt-0.5 text-amber-300/80">{remainingText}</div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onResume}
            variant="primary"
            size="md"
            className="flex-1"
            disabled={!canExecute}
          >
            Resume Execution
          </Button>
          <Button onClick={onClearSession} variant="secondary" size="md">
            Clear
          </Button>
        </div>
      </div>
    );
  }

  // الوضع الافتراضي
  return (
    <Button
      onClick={onExecute}
      disabled={!canExecute}
      variant="primary"
      size="md"
      className="w-full font-semibold"
    >
      Execute Plan
    </Button>
  );
}
