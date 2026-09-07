import { promises as fs } from "node:fs";
import path from "node:path";
import type { FileContext } from "../../types/ai";

/**
 * File system service for reading and writing project files.
 * Provides safe access to files within a project directory.
 */
export class FileService {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Read a single file's content.
   * Returns exists: false if the file doesn't exist.
   */
  async readFile(relativePath: string): Promise<FileContext> {
    const absolutePath = this.resolveSafePath(relativePath);
    try {
      const content = await fs.readFile(absolutePath, "utf-8");
      return {
        path: relativePath,
        content,
        exists: true,
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return {
          path: relativePath,
          content: "",
          exists: false,
        };
      }
      throw error;
    }
  }

  /**
   * Read multiple files.
   */
  async readFiles(relativePaths: string[]): Promise<FileContext[]> {
    return Promise.all(relativePaths.map((p) => this.readFile(p)));
  }

  /**
   * Write a file (create or modify).
   * Uses atomic write (write to temp then rename).
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const absolutePath = this.resolveSafePath(relativePath);

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    // Atomic write to prevent file corruption on failure
    const tempPath = `${absolutePath}.tmp`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, absolutePath);
  }

  /**
   * Delete a file.
   * Silently succeeds if file doesn't exist.
   */
  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = this.resolveSafePath(relativePath);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if (!this.isNotFoundError(error)) {
        throw error;
      }
    }
  }

  /**
   * List all files in the project (recursive).
   * Useful for providing context to AI agents.
   */
  async listFiles(): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (entry.name === ".DS_Store" || entry.name.endsWith(".tmp")) {
            continue;
          }
          const relativePath = path.relative(this.projectRoot, fullPath);
          files.push(relativePath);
        }
      }
    };

    await walk(this.projectRoot);
    return files;
  }

  /**
   * Resolve a relative path safely within the project root.
   * Prevents path traversal attacks.
   */
  private resolveSafePath(relativePath: string): string {
    const absolutePath = path.resolve(this.projectRoot, relativePath);
    const relative = path.relative(this.projectRoot, absolutePath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Path traversal detected: "${relativePath}" is outside project root`);
    }

    return absolutePath;
  }

  /**
   * Check if an error is a "file not found" error.
   */
  private isNotFoundError(error: unknown): boolean {
    return (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    );
  }

  /**
   * Directories to skip when listing files.
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      ".turbo",
      "coverage",
      ".cache",
    ]);

    return skipDirs.has(dirName);
  }
}
