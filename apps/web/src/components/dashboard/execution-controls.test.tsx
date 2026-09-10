import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExecutionControls } from "./execution-controls";
import type { SavedExecutionProgress } from "@/types/execution";

const mockPausedProgress: SavedExecutionProgress = {
  id: "session-1",
  status: "paused",
  nextCommitIndex: 5,
  results: [
    { commitId: "001", status: "completed", attempts: 1, filesWritten: [] },
    { commitId: "002", status: "completed", attempts: 1, filesWritten: [] },
    { commitId: "003", status: "completed", attempts: 1, filesWritten: [] },
  ],
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
  projectContext: {
    projectPath: "/tmp/test",
    projectName: "test-project",
    techStack: ["typescript"],
    existingFiles: [],
    safeMode: true,
  },
  commitPlan: {
    projectPath: "/tmp/test",
    projectName: "test-project",
    completedCommitIds: ["001", "002", "003"],
    commits: [],
  },
  snapshot: {
    projectPath: "/tmp/test",
    projectName: "test-project",
    techStack: ["typescript"],
    structure: [],
    git: null,
    config: { otherConfigs: {} },
    keyFiles: [],
    createdAt: new Date().toISOString(),
    version: 1,
  },
};

describe("ExecutionControls", () => {
  describe("when isExecuting is true", () => {
    it("shows Pause and Executing buttons", () => {
      render(
        <ExecutionControls
          isExecuting={true}
          savedProgress={null}
          canExecute={false}
          onExecute={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /Pause Execution/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Executing.../i })).toBeDisabled();
    });

    it("calls onPause when Pause clicked", async () => {
      const onPause = vi.fn();
      render(
        <ExecutionControls
          isExecuting={true}
          savedProgress={null}
          canExecute={false}
          onExecute={vi.fn()}
          onPause={onPause}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Pause Execution/i }));
      expect(onPause).toHaveBeenCalledTimes(1);
    });
  });

  describe("when paused progress exists", () => {
    it("shows paused banner with completed count", () => {
      render(
        <ExecutionControls
          isExecuting={false}
          savedProgress={mockPausedProgress}
          canExecute={true}
          onExecute={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      expect(screen.getByText("Paused session found")).toBeInTheDocument();
      expect(screen.getByText(/3 commits completed/)).toBeInTheDocument();
    });

    it("shows Resume and Clear buttons", () => {
      render(
        <ExecutionControls
          isExecuting={false}
          savedProgress={mockPausedProgress}
          canExecute={true}
          onExecute={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /Resume Execution/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Clear/i })).toBeInTheDocument();
    });

    it("disables Resume when canExecute is false", () => {
      render(
        <ExecutionControls
          isExecuting={false}
          savedProgress={mockPausedProgress}
          canExecute={false}
          onExecute={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /Resume Execution/i })).toBeDisabled();
    });
  });

  describe("default state", () => {
    it("shows Execute Plan button", () => {
      render(
        <ExecutionControls
          isExecuting={false}
          savedProgress={null}
          canExecute={true}
          onExecute={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /Execute Plan/i })).toBeInTheDocument();
    });

    it("calls onExecute when clicked", async () => {
      const onExecute = vi.fn();
      render(
        <ExecutionControls
          isExecuting={false}
          savedProgress={null}
          canExecute={true}
          onExecute={onExecute}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Execute Plan/i }));
      expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it("disables Execute when canExecute is false", () => {
      render(
        <ExecutionControls
          isExecuting={false}
          savedProgress={null}
          canExecute={false}
          onExecute={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClearSession={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /Execute Plan/i })).toBeDisabled();
    });
  });
});
