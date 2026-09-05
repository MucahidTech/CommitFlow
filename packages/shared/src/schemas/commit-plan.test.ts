import { describe, it, expect } from "vitest";
import {
  commitItemSchema,
  commitPlanSchema,
  commitItemInputSchema,
  commitTypeEnum,
  commitStatusEnum,
} from "./commit-plan";

describe("commitTypeEnum", () => {
  it("accepts valid conventional commit types", () => {
    expect(commitTypeEnum.parse("feat")).toBe("feat");
    expect(commitTypeEnum.parse("fix")).toBe("fix");
    expect(commitTypeEnum.parse("docs")).toBe("docs");
  });

  it("rejects invalid commit types", () => {
    expect(() => commitTypeEnum.parse("invalid")).toThrow();
    expect(() => commitTypeEnum.parse("FEAT")).toThrow();
  });
});

describe("commitStatusEnum", () => {
  it("accepts all valid statuses", () => {
    expect(commitStatusEnum.parse("pending")).toBe("pending");
    expect(commitStatusEnum.parse("in_progress")).toBe("in_progress");
    expect(commitStatusEnum.parse("completed")).toBe("completed");
    expect(commitStatusEnum.parse("failed")).toBe("failed");
  });

  it("rejects invalid statuses", () => {
    expect(() => commitStatusEnum.parse("done")).toThrow();
    expect(() => commitStatusEnum.parse("")).toThrow();
  });
});

describe("commitItemSchema", () => {
  const validItem = {
    id: "001",
    phase: 0,
    order: 1,
    type: "feat" as const,
    scope: "shared",
    subject: "define zod schemas",
  };

  it("accepts a valid commit item", () => {
    const result = commitItemSchema.parse(validItem);
    expect(result.id).toBe("001");
    expect(result.status).toBe("pending"); // default applied
  });

  it("accepts item without optional scope", () => {
    const { scope: _scope, ...withoutScope } = validItem;
    const result = commitItemSchema.parse(withoutScope);
    expect(result.scope).toBeUndefined();
  });

  it("rejects missing required fields", () => {
    const { subject: _subject, ...withoutSubject } = validItem;
    expect(() => commitItemSchema.parse(withoutSubject)).toThrow();
  });

  it("rejects invalid phase (negative)", () => {
    expect(() => commitItemSchema.parse({ ...validItem, phase: -1 })).toThrow();
  });

  it("rejects invalid order (zero)", () => {
    expect(() => commitItemSchema.parse({ ...validItem, order: 0 })).toThrow();
  });

  it("rejects unknown fields due to strict mode", () => {
    expect(() => commitItemSchema.parse({ ...validItem, extra: "field" })).toThrow();
  });
});

describe("commitItemInputSchema", () => {
  it("validates input payload without status and error", () => {
    const validInput = {
      id: "001",
      phase: 0,
      order: 1,
      type: "feat" as const,
      scope: "shared",
      subject: "define zod schemas",
    };

    const result = commitItemInputSchema.parse(validInput);
    expect(result.id).toBe("001");
    expect(result).not.toHaveProperty("status");
  });

  it("rejects status field when provided in input due to omit and strict", () => {
    const invalidInput = {
      id: "001",
      phase: 0,
      order: 1,
      type: "feat" as const,
      subject: "define zod schemas",
      status: "completed",
    };

    expect(() => commitItemInputSchema.parse(invalidInput)).toThrow();
  });
});

describe("commitPlanSchema", () => {
  const validPlan = {
    projectPath: "/tmp/test-project",
    projectName: "test-project",
    commits: [
      {
        id: "001",
        phase: 0,
        order: 1,
        type: "feat" as const,
        scope: "shared",
        subject: "define zod schemas",
      },
    ],
  };

  it("accepts a valid commit plan", () => {
    const result = commitPlanSchema.parse(validPlan);
    expect(result.commits).toHaveLength(1);
  });

  it("rejects empty commits array", () => {
    expect(() => commitPlanSchema.parse({ ...validPlan, commits: [] })).toThrow();
  });

  it("rejects missing projectPath", () => {
    const { projectPath: _projectPath, ...withoutPath } = validPlan;
    expect(() => commitPlanSchema.parse(withoutPath)).toThrow();
  });
});
