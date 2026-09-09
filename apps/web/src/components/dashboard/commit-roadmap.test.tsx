import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

describe("CommitRoadmap", () => {
  it("renders empty state when no commits", () => {
    render(<CommitRoadmap commits={[]} />);
    expect(screen.getByText(/No commits parsed yet/i)).toBeInTheDocument();
  });

  it("renders commit items with messages", () => {
    render(<CommitRoadmap commits={sampleCommits} />);

    expect(screen.getByText(/add schemas/i)).toBeInTheDocument();
    expect(screen.getByText(/resolve bug/i)).toBeInTheDocument();
  });

  it("renders status labels", () => {
    render(<CommitRoadmap commits={sampleCommits} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders summary counts", () => {
    render(<CommitRoadmap commits={sampleCommits} />);

    expect(screen.getByText(/2 total/i)).toBeInTheDocument();
    expect(screen.getByText(/1 completed/i)).toBeInTheDocument();
  });
});
