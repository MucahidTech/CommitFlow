import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConsoleLog } from "./console-log";
import type { SseEvent } from "@/types/sse";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ConsoleLog", () => {
  describe("empty state", () => {
    it("shows waiting message when no events", () => {
      render(<ConsoleLog events={[]} isExecuting={false} />);
      expect(screen.getByText(/Waiting for execution logs/i)).toBeInTheDocument();
    });

    it("shows Idle status when not executing and no events", () => {
      render(<ConsoleLog events={[]} isExecuting={false} />);
      expect(screen.getByText("Idle")).toBeInTheDocument();
    });
  });

  describe("execution state indicators", () => {
    it("shows Running when isExecuting", () => {
      render(<ConsoleLog events={[]} isExecuting={true} />);
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    it("shows Completed when has events and not executing", () => {
      const events: SseEvent[] = [{ type: "connected", streamId: "test" }];
      render(<ConsoleLog events={events} isExecuting={false} />);
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  describe("event formatting", () => {
    it("formats 'connected' event", () => {
      const events: SseEvent[] = [{ type: "connected", streamId: "stream-123" }];
      render(<ConsoleLog events={events} isExecuting={true} />);
      expect(screen.getByText(/Connected to stream: stream-123/)).toBeInTheDocument();
    });

    it("formats 'plan_started' event", () => {
      const events: SseEvent[] = [{ type: "plan_started", totalCommits: 5 }];
      render(<ConsoleLog events={events} isExecuting={true} />);
      expect(screen.getByText(/Plan started: 5 commits/)).toBeInTheDocument();
    });

    it("formats 'commit_started' event with arrow", () => {
      const events: SseEvent[] = [
        {
          type: "commit_started",
          commitId: "001",
          message: "feat: add feature",
        },
      ];
      render(<ConsoleLog events={events} isExecuting={true} />);
      expect(screen.getByText(/→ Commit 001: feat: add feature/)).toBeInTheDocument();
    });

    it("formats 'status' event with label", () => {
      const events: SseEvent[] = [
        {
          type: "status",
          commitId: "001",
          status: "generating_code",
          attempt: 1,
        },
      ];
      render(<ConsoleLog events={events} isExecuting={true} />);
      expect(screen.getByText(/Generating code/)).toBeInTheDocument();
    });

    it("formats 'commit_result' event with file count", () => {
      const events: SseEvent[] = [
        {
          type: "commit_result",
          commitId: "001",
          status: "completed",
          filesWritten: ["a.ts", "b.ts"],
          attempts: 1,
        },
      ];
      render(<ConsoleLog events={events} isExecuting={true} />);
      expect(screen.getByText(/Result: Completed ✓ \(2 files written\)/)).toBeInTheDocument();
    });

    it("formats 'done' event with success count", () => {
      const events: SseEvent[] = [
        {
          type: "done",
          successCount: 3,
          totalCommits: 5,
        },
      ];
      render(<ConsoleLog events={events} isExecuting={false} />);
      expect(screen.getByText(/Execution complete: 3\/5 succeeded/)).toBeInTheDocument();
    });
  });

  describe("multiple events", () => {
    it("renders all events in order", () => {
      const events: SseEvent[] = [
        { type: "connected", streamId: "s1" },
        { type: "plan_started", totalCommits: 2 },
        { type: "commit_started", commitId: "001", message: "first" },
      ];
      render(<ConsoleLog events={events} isExecuting={true} />);

      expect(screen.getByText(/Connected to stream/)).toBeInTheDocument();
      expect(screen.getByText(/Plan started/)).toBeInTheDocument();
      expect(screen.getByText(/→ Commit 001/)).toBeInTheDocument();
    });
  });

  describe("unknown event types", () => {
    it("renders unknown event type as-is", () => {
      const events: SseEvent[] = [
        { type: "connected", streamId: "test" },
        { type: "custom_unknown_event" as unknown as SseEvent["type"] },
      ];
      render(<ConsoleLog events={events} isExecuting={true} />);
      expect(screen.getByText(/custom_unknown_event/)).toBeInTheDocument();
    });
  });
});
