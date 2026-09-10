import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextInitializer } from "./context-initializer";
import type { AnalyzeState } from "@/types/snapshot";

const mockSnapshot = {
  projectPath: "/tmp/test",
  projectName: "test-project",
  techStack: ["typescript", "node"],
  structure: [
    { path: "src/index.ts", size: 100, extension: ".ts" },
    { path: "package.json", size: 200, extension: ".json" },
  ],
  git: {
    currentBranch: "main",
    totalCommits: 42,
    recentCommits: [],
  },
  config: { otherConfigs: {} },
  keyFiles: [],
  createdAt: new Date().toISOString(),
  version: 1 as const,
};

describe("ContextInitializer", () => {
  describe("when projectPath is null", () => {
    it("shows prompt to set project path", () => {
      const state: AnalyzeState = { status: "idle" };
      render(
        <ContextInitializer
          projectPath={null}
          state={state}
          onAnalyze={vi.fn()}
          onReset={vi.fn()}
        />,
      );

      expect(screen.getByText(/Set and submit the project path/i)).toBeInTheDocument();
    });
  });

  describe("when status is idle", () => {
    it("shows Analyze button", async () => {
      const onAnalyze = vi.fn();
      render(
        <ContextInitializer
          projectPath="/tmp/test"
          state={{ status: "idle" }}
          onAnalyze={onAnalyze}
          onReset={vi.fn()}
        />,
      );

      const button = screen.getByRole("button", { name: /Analyze Project/i });
      expect(button).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(button);
      expect(onAnalyze).toHaveBeenCalledTimes(1);
    });
  });

  describe("when status is analyzing", () => {
    it("shows analyzing indicator", () => {
      render(
        <ContextInitializer
          projectPath="/tmp/test"
          state={{ status: "analyzing" }}
          onAnalyze={vi.fn()}
          onReset={vi.fn()}
        />,
      );

      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
      expect(screen.getByText(/Scanning file structure/i)).toBeInTheDocument();
    });
  });

  describe("when status is success", () => {
    it("shows snapshot details", () => {
      const state: AnalyzeState = {
        status: "success",
        snapshot: mockSnapshot,
      };
      render(
        <ContextInitializer
          projectPath="/tmp/test"
          state={state}
          onAnalyze={vi.fn()}
          onReset={vi.fn()}
        />,
      );

      expect(screen.getByText("test-project")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // files count
      expect(screen.getByText("typescript")).toBeInTheDocument();
      expect(screen.getByText("node")).toBeInTheDocument();
      expect(screen.getByText("main")).toBeInTheDocument();
    });

    it("shows Re-scan and Clear buttons", () => {
      const onAnalyze = vi.fn();
      const onReset = vi.fn();
      const state: AnalyzeState = {
        status: "success",
        snapshot: mockSnapshot,
      };

      render(
        <ContextInitializer
          projectPath="/tmp/test"
          state={state}
          onAnalyze={onAnalyze}
          onReset={onReset}
        />,
      );

      expect(screen.getByRole("button", { name: /Re-scan/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Clear Context/i })).toBeInTheDocument();
    });

    it("shows 'No' for Git when snapshot.git is null", () => {
      const state: AnalyzeState = {
        status: "success",
        snapshot: { ...mockSnapshot, git: null },
      };
      render(
        <ContextInitializer
          projectPath="/tmp/test"
          state={state}
          onAnalyze={vi.fn()}
          onReset={vi.fn()}
        />,
      );

      // Git Enabled: No
      expect(screen.getByText("No")).toBeInTheDocument();
    });
  });

  describe("when status is error", () => {
    it("shows error message and Retry button", async () => {
      const onAnalyze = vi.fn();
      const state: AnalyzeState = {
        status: "error",
        message: "Network failed",
      };
      render(
        <ContextInitializer
          projectPath="/tmp/test"
          state={state}
          onAnalyze={onAnalyze}
          onReset={vi.fn()}
        />,
      );

      expect(screen.getByText("Network failed")).toBeInTheDocument();

      const retry = screen.getByRole("button", { name: /Retry Analysis/i });
      const user = userEvent.setup();
      await user.click(retry);
      expect(onAnalyze).toHaveBeenCalledTimes(1);
    });
  });
});
