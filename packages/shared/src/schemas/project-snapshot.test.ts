import { describe, it, expect } from "vitest";
import {
  fileInfoSchema,
  gitSnapshotSchema,
  keyFileSchema,
  projectSnapshotSchema,
  projectSnapshotInputSchema,
} from "./project-snapshot";

describe("fileInfoSchema", () => {
  it("accepts valid file info", () => {
    const result = fileInfoSchema.parse({
      path: "src/index.ts",
      size: 1024,
      extension: ".ts",
    });
    expect(result.path).toBe("src/index.ts");
  });

  it("rejects negative size", () => {
    expect(() => fileInfoSchema.parse({ path: "test.ts", size: -1, extension: ".ts" })).toThrow();
  });
});

describe("gitSnapshotSchema", () => {
  it("applies default values", () => {
    const result = gitSnapshotSchema.parse({
      currentBranch: "main",
    });
    expect(result.recentCommits).toEqual([]);
    expect(result.totalCommits).toBe(0);
  });

  it("limits recent commits to 10", () => {
    expect(() =>
      gitSnapshotSchema.parse({
        currentBranch: "main",
        recentCommits: Array(11).fill("commit"),
      }),
    ).toThrow();
  });
});

describe("keyFileSchema", () => {
  it("requires valid reason enum", () => {
    const result = keyFileSchema.parse({
      path: "package.json",
      content: "{}",
      reason: "config",
    });
    expect(result.reason).toBe("config");
  });

  it("rejects invalid reason", () => {
    expect(() =>
      keyFileSchema.parse({
        path: "package.json",
        content: "{}",
        reason: "invalid_reason",
      }),
    ).toThrow();
  });
});

describe("projectSnapshotSchema", () => {
  const validSnapshot = {
    projectPath: "/tmp/test",
    projectName: "test-project",
    createdAt: new Date().toISOString(),
  };

  it("accepts minimal valid snapshot", () => {
    const result = projectSnapshotSchema.parse(validSnapshot);
    expect(result.techStack).toEqual([]);
    expect(result.structure).toEqual([]);
    expect(result.keyFiles).toEqual([]);
    expect(result.version).toBe(1);
  });

  it("accepts full snapshot with all fields", () => {
    const result = projectSnapshotSchema.parse({
      ...validSnapshot,
      techStack: ["typescript", "node"],
      structure: [{ path: "src/index.ts", size: 100, extension: ".ts" }],
      git: { currentBranch: "main", totalCommits: 5 },
      config: { packageJson: { name: "test" } },
      keyFiles: [{ path: "package.json", content: "{}", reason: "config" }],
    });
    expect(result.techStack).toHaveLength(2);
    expect(result.git?.currentBranch).toBe("main");
  });

  it("rejects invalid createdAt (not ISO)", () => {
    expect(() =>
      projectSnapshotSchema.parse({
        ...validSnapshot,
        createdAt: "not-a-date",
      }),
    ).toThrow();
  });

  it("enforces version literal 1", () => {
    expect(() => projectSnapshotSchema.parse({ ...validSnapshot, version: 2 })).toThrow();
  });

  it("rejects unknown fields", () => {
    expect(() => projectSnapshotSchema.parse({ ...validSnapshot, extra: "field" })).toThrow();
  });
});

describe("projectSnapshotInputSchema", () => {
  it("auto-generates createdAt and default version", () => {
    const result = projectSnapshotInputSchema.parse({
      projectPath: "/tmp/auto-test",
      projectName: "auto-test",
    });
    expect(result.createdAt).toBeDefined();
    expect(new Date(result.createdAt).getTime()).not.toBeNaN();
    expect(result.version).toBe(1);
  });
});
