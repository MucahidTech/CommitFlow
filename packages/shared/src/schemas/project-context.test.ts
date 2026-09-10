import { describe, it, expect } from "vitest";
import { projectContextSchema, projectContextInputSchema } from "./project-context";

describe("projectContextSchema", () => {
  const validContext = {
    projectPath: "/tmp/test-project",
    projectName: "test-project",
  };

  it("accepts a valid project context and applies defaults", () => {
    const result = projectContextSchema.parse(validContext);
    expect(result.projectPath).toBe("/tmp/test-project");
    expect(result.safeMode).toBe(true);
    expect(result.techStack).toEqual([]);
    expect(result.existingFiles).toEqual([]);
  });

  it("accepts optional fields when provided", () => {
    const context = {
      ...validContext,
      description: "Test description",
      techStack: ["typescript", "node"],
      existingFiles: ["package.json"],
      safeMode: false,
    };
    const result = projectContextSchema.parse(context);
    expect(result.description).toBe("Test description");
    expect(result.techStack).toHaveLength(2);
    expect(result.existingFiles).toHaveLength(1);
    expect(result.safeMode).toBe(false);
  });

  it("accepts userContext field", () => {
    const result = projectContextSchema.parse({
      ...validContext,
      userContext:
        "This is a SaaS platform for X. Use TypeScript strict, prefer functional style, avoid classes.",
    });
    expect(result.userContext).toBeDefined();
    expect(result.userContext).toContain("SaaS");
  });

  it("accepts long userContext up to 10000 characters", () => {
    const longContext = "a".repeat(10000);
    const result = projectContextSchema.parse({
      ...validContext,
      userContext: longContext,
    });
    expect(result.userContext).toHaveLength(10000);
  });

  it("rejects userContext longer than 10000 chars", () => {
    expect(() =>
      projectContextSchema.parse({
        ...validContext,
        userContext: "a".repeat(10001),
      }),
    ).toThrow();
  });

  it("rejects empty projectPath", () => {
    expect(() => projectContextSchema.parse({ ...validContext, projectPath: "" })).toThrow();
  });

  it("rejects missing projectName", () => {
    const { projectName: _projectName, ...withoutName } = validContext;
    expect(() => projectContextSchema.parse(withoutName)).toThrow();
  });

  it("rejects unknown fields due to strict mode", () => {
    expect(() => projectContextSchema.parse({ ...validContext, extra: "field" })).toThrow();
  });
});

describe("projectContextInputSchema", () => {
  it("accepts only projectPath for input payload", () => {
    const result = projectContextInputSchema.parse({
      projectPath: "/tmp/test-project",
    });
    expect(result.projectPath).toBe("/tmp/test-project");
    expect(result.projectName).toBeUndefined();
  });

  it("accepts partial fields correctly", () => {
    const result = projectContextInputSchema.parse({
      projectPath: "/tmp/test-project",
      projectName: "my-project",
    });
    expect(result.projectName).toBe("my-project");
    expect(result.description).toBeUndefined();
  });

  it("accepts userContext in input schema", () => {
    const result = projectContextInputSchema.parse({
      projectPath: "/tmp/test-project",
      userContext: "Build a REST API",
    });
    expect(result.userContext).toBe("Build a REST API");
  });
});
