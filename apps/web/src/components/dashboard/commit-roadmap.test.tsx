import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RoadmapCommit } from "@/types/commit";
import { CommitRoadmap } from "./commit-roadmap";

const sampleCommits: RoadmapCommit[] = [
  {
    id: "001",
    phase: 1,
    order: 1,
    type: "feat",
    scope: "shared",
    subject: "add schemas",
    status: "completed",
  },
  {
    id: "002",
    phase: 1,
    order: 2,
    type: "fix",
    subject: "resolve bug",
    status: "pending",
  },
];

const defaultProps = {
  commits: sampleCommits,
  targetCommitId: null,
  completedCommitIds: new Set<string>(),
  onToggleCompleted: vi.fn(),
  onSelectTarget: vi.fn(),
};

describe("CommitRoadmap", () => {
  it("renders empty state when no commits", () => {
    render(<CommitRoadmap {...defaultProps} commits={[]} />);
    expect(screen.getByText(/No commits parsed yet/i)).toBeInTheDocument();
  });

  it("renders commit items with messages", () => {
    render(<CommitRoadmap {...defaultProps} />);

    expect(screen.getByText(/add schemas/i)).toBeInTheDocument();
    expect(screen.getByText(/resolve bug/i)).toBeInTheDocument();
  });

  it("renders status labels", () => {
    render(<CommitRoadmap {...defaultProps} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders summary counts", () => {
    render(<CommitRoadmap {...defaultProps} />);

    expect(screen.getByText(/2 total/i)).toBeInTheDocument();
    expect(screen.getByText(/1 completed/i)).toBeInTheDocument();
  });

  it("triggers onSelectTarget when star button is clicked", async () => {
    const user = userEvent.setup();
    const handleSelectTarget = vi.fn();

    render(<CommitRoadmap {...defaultProps} onSelectTarget={handleSelectTarget} />);

    const starButton = screen.getByRole("button", {
      name: "Set commit 001 as execution target",
    });
    await user.click(starButton);

    expect(handleSelectTarget).toHaveBeenCalledWith("001");
  });
});
