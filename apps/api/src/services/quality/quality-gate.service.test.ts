import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
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

  it("skips format and typecheck when no package.json", async () => {
    const result = await service.run();
    expect(result.passed).toBe(true); // Both skipped = passed
    expect(result.format.success).toBe(true);
    expect(result.typecheck.success).toBe(true);
  });

  it("skips typecheck when no tsconfig.json but has package.json", async () => {
    await writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "test", scripts: {} }),
    );
    await mkdir(path.join(tempDir, "node_modules"));

    const result = await service.run();
    expect(result.typecheck.success).toBe(true);
  });
});
