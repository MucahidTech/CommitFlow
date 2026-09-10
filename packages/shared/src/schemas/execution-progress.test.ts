import { describe, it, expect } from "vitest";
import {
  commitResultSchema,
  executionStatusSchema,
  executionProgressSchema,
} from "./execution-progress";

describe("commitResultSchema", () => {
  it("accepts a valid commit result", () => {
    const result = commitResultSchema.parse({
      commitId: "001",
      status: "completed",
      attempts: 1,
      filesWritten: ["src/index.ts"],
      commitHash: "abc123",
    });

    expect(result.commitId).toBe("001");
    expect(result.status).toBe("completed");
  });

  it("applies defaults for attempts and filesWritten", () => {
    const result = commitResultSchema.parse({
      commitId: "001",
      status: "pending",
    });

    expect(result.attempts).toBe(0);
    expect(result.filesWritten).toEqual([]);
  });

  it("rejects invalid status", () => {
    expect(() =>
      commitResultSchema.parse({
        commitId: "001",
        status: "unknown",
      }),
    ).toThrow();
  });

  it("rejects error longer than 5000 chars", () => {
    expect(() =>
      commitResultSchema.parse({
        commitId: "001",
        status: "failed",
        error: "a".repeat(5001),
      }),
    ).toThrow();
  });

  it("rejects unknown fields due to strict mode", () => {
    expect(() =>
      commitResultSchema.parse({
        commitId: "001",
        status: "completed",
        extra: "field",
      }),
    ).toThrow();
  });
});

describe("executionStatusSchema", () => {
  it("accepts all valid statuses", () => {
    expect(executionStatusSchema.parse("running")).toBe("running");
    expect(executionStatusSchema.parse("paused")).toBe("paused");
    expect(executionStatusSchema.parse("completed")).toBe("completed");
    expect(executionStatusSchema.parse("failed")).toBe("failed");
    expect(executionStatusSchema.parse("cancelled")).toBe("cancelled");
  });

  it("rejects invalid status", () => {
    expect(() => executionStatusSchema.parse("stopped")).toThrow();
  });
});

describe("executionProgressSchema", () => {
  const validProgress = {
    id: "session-123",
    status: "running" as const,
    projectContext: {
      projectPath: "/tmp/test",
      projectName: "test",
    },
    commitPlan: {
      projectPath: "/tmp/test",
      projectName: "test",
      commits: [
        {
          id: "001",
          phase: 0,
          order: 1,
          type: "feat" as const,
          subject: "add feature",
        },
      ],
    },
    snapshot: null,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };

  it("accepts a minimal valid progress", () => {
    const result = executionProgressSchema.parse(validProgress);
    expect(result.id).toBe("session-123");
    expect(result.results).toEqual([]);
    expect(result.nextCommitIndex).toBe(0);
  });

  it("accepts pause fields when provided", () => {
    const result = executionProgressSchema.parse({
      ...validProgress,
      status: "paused",
      pausedAt: new Date().toISOString(),
      pauseReason: "manual",
    });

    expect(result.status).toBe("paused");
    expect(result.pauseReason).toBe("manual");
  });

  it("accepts results array", () => {
    const result = executionProgressSchema.parse({
      ...validProgress,
      results: [
        {
          commitId: "001",
          status: "completed",
          attempts: 1,
          filesWritten: ["src/index.ts"],
        },
      ],
      nextCommitIndex: 1,
    });

    expect(result.results).toHaveLength(1);
    expect(result.nextCommitIndex).toBe(1);
  });

  it("rejects negative nextCommitIndex", () => {
    expect(() =>
      executionProgressSchema.parse({
        ...validProgress,
        nextCommitIndex: -1,
      }),
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() =>
      executionProgressSchema.parse({
        id: "session-123",
        status: "running",
      }),
    ).toThrow();
  });

  it("rejects unknown fields due to strict mode", () => {
    expect(() =>
      executionProgressSchema.parse({
        ...validProgress,
        extra: "field",
      }),
    ).toThrow();
  });
});
