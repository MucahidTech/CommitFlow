import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileService } from "./file.service";

describe("FileService", () => {
  let tempDir: string;
  let service: FileService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "commitflow-test-"));
    service = new FileService(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("readFile", () => {
    it("returns exists: false for non-existent file", async () => {
      const result = await service.readFile("not-exists.txt");
      expect(result.exists).toBe(false);
      expect(result.content).toBe("");
    });

    it("returns exists: true and content for existing file", async () => {
      await writeFile(path.join(tempDir, "test.txt"), "hello");
      const result = await service.readFile("test.txt");
      expect(result.exists).toBe(true);
      expect(result.content).toBe("hello");
    });
  });

  describe("writeFile", () => {
    it("creates parent directories automatically", async () => {
      await service.writeFile("nested/deep/file.txt", "content");
      const result = await service.readFile("nested/deep/file.txt");
      expect(result.exists).toBe(true);
      expect(result.content).toBe("content");
    });

    it("overwrites existing file", async () => {
      await service.writeFile("test.txt", "old");
      await service.writeFile("test.txt", "new");
      const result = await service.readFile("test.txt");
      expect(result.content).toBe("new");
    });
  });

  describe("deleteFile", () => {
    it("deletes existing file", async () => {
      await service.writeFile("test.txt", "content");
      await service.deleteFile("test.txt");
      const result = await service.readFile("test.txt");
      expect(result.exists).toBe(false);
    });

    it("silently succeeds for non-existent file", async () => {
      await expect(service.deleteFile("not-exists.txt")).resolves.toBeUndefined();
    });
  });

  describe("path traversal protection", () => {
    it("throws for paths outside project root", async () => {
      await expect(service.readFile("../outside.txt")).rejects.toThrow("Path traversal detected");
    });
  });

  describe("listFiles", () => {
    it("lists all files recursively", async () => {
      await service.writeFile("a.txt", "a");
      await service.writeFile("nested/b.txt", "b");
      const files = await service.listFiles();
      expect(files).toContain("a.txt");
      expect(files).toContain(path.join("nested", "b.txt"));
    });

    it("skips node_modules", async () => {
      await mkdir(path.join(tempDir, "node_modules"), { recursive: true });
      await writeFile(path.join(tempDir, "node_modules", "dep.js"), "x");
      await service.writeFile("src/index.ts", "y");
      const files = await service.listFiles();
      expect(files).not.toContain(path.join("node_modules", "dep.js"));
      expect(files).toContain(path.join("src", "index.ts"));
    });
  });
});
