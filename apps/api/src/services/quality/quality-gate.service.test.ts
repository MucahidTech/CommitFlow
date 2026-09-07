import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { QualityGateService } from "./quality-gate.service";

describe("QualityGateService", () => {
  let tempDir: string;
  let service: QualityGateService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "commitflow-qg-"));
    service = new QualityGateService(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns passed: false when commands fail (no package.json)", async () => {
    const result = await service.run();
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("has correct structure in result", async () => {
    const result = await service.run();
    expect(result).toHaveProperty("format");
    expect(result).toHaveProperty("typecheck");
    expect(result).toHaveProperty("errors");
    expect(result.format.success).toBe(false);
    expect(result.typecheck.success).toBe(false);
  });
});
