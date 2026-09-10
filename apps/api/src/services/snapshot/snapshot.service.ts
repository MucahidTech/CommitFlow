import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  ConfigSnapshot,
  GitSnapshot,
  KeyFile,
  ProjectSnapshot,
  FileInfo,
} from "@commitflow/shared";
import { GitService } from "../git/git.service";

/** Directories to skip during scanning */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
  ".vscode",
  ".idea",
  "out",
  "target",
]);

/** Maximum number of files in the structure */
const MAX_STRUCTURE_FILES = 500;

/** Maximum number of key files with content */
const MAX_KEY_FILES = 10;

/** Maximum size for a single key file (100 KB) */
const MAX_KEY_FILE_SIZE = 100 * 1024;

/** Config files to read and parse */
const CONFIG_FILES = [
  "package.json",
  "tsconfig.json",
  "go.mod",
  "requirements.txt",
  "Cargo.toml",
  "pyproject.toml",
] as const;

/** Priority patterns for key file selection */
const KEY_FILE_PATTERNS: { pattern: RegExp; reason: KeyFile["reason"]; priority: number }[] = [
  {
    pattern: /^(package\.json|tsconfig\.json|go\.mod|Cargo\.toml)$/,
    reason: "config",
    priority: 1,
  },
  { pattern: /^README\.md$/i, reason: "readme", priority: 2 },
  { pattern: /^(src\/)?(index|main|app)\.(ts|tsx|js|jsx)$/, reason: "entry_point", priority: 3 },
  { pattern: /^src\/index\.(ts|tsx|js|jsx)$/, reason: "main_module", priority: 4 },
];

/**
 * Service that builds a ProjectSnapshot from a target directory.
 * Provides one-shot deep scanning of existing projects for AI context.
 */
export class SnapshotService {
  private readonly projectRoot: string;
  private readonly gitService: GitService;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.gitService = new GitService(projectRoot);
  }

  /**
   * Build a complete snapshot of the target project.
   * Works on both empty and existing projects.
   */
  async buildSnapshot(): Promise<ProjectSnapshot> {
    const projectName = await this.detectProjectName();
    const structure = await this.scanStructure();
    const config = await this.readConfigs();
    const git = await this.readGitInfo();
    const techStack = this.detectTechStack(config);
    const keyFiles = await this.selectKeyFiles(structure);

    return {
      projectPath: this.projectRoot,
      projectName,
      techStack,
      structure,
      git,
      config,
      keyFiles,
      createdAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Detect project name from package.json or folder name.
   */
  private async detectProjectName(): Promise<string> {
    const packageJsonPath = path.join(this.projectRoot, "package.json");

    try {
      const content = await fs.readFile(packageJsonPath, "utf-8");
      const parsed = JSON.parse(content) as { name?: string };
      if (parsed.name && parsed.name.trim().length > 0) {
        return parsed.name;
      }
    } catch {
      // ignore — fall through to folder name
    }

    return path.basename(this.projectRoot);
  }

  /**
   * Scan the file system and return file structure.
   * Skips SKIP_DIRECTORIES and limits to MAX_STRUCTURE_FILES.
   */
  private async scanStructure(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    const walk = async (dir: string): Promise<void> => {
      if (files.length >= MAX_STRUCTURE_FILES) {
        return;
      }

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= MAX_STRUCTURE_FILES) {
          return;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (SKIP_DIRECTORIES.has(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (entry.name === ".DS_Store" || entry.name.endsWith(".tmp")) {
            continue;
          }

          try {
            const stats = await fs.stat(fullPath);
            const relativePath = path.relative(this.projectRoot, fullPath);

            files.push({
              path: relativePath,
              size: stats.size,
              extension: path.extname(entry.name),
            });
          } catch {
            // Skip files we can't stat
          }
        }
      }
    };

    try {
      await walk(this.projectRoot);
    } catch {
      // Empty or inaccessible directory — return empty list
    }

    return files;
  }

  /**
   * Read and parse config files.
   */
  private async readConfigs(): Promise<ConfigSnapshot> {
    const result: ConfigSnapshot = { otherConfigs: {} };

    for (const configFile of CONFIG_FILES) {
      const fullPath = path.join(this.projectRoot, configFile);

      try {
        const content = await fs.readFile(fullPath, "utf-8");

        // JSON files — parse
        if (configFile.endsWith(".json")) {
          const parsed = JSON.parse(content) as Record<string, unknown>;
          if (configFile === "package.json") {
            result.packageJson = parsed;
          } else if (configFile === "tsconfig.json") {
            result.tsconfig = parsed;
          } else {
            result.otherConfigs[configFile] = parsed;
          }
        } else {
          // Text configs — store as string
          result.otherConfigs[configFile] = content;
        }
      } catch {
        // File doesn't exist or can't be read — skip
      }
    }

    return result;
  }

  /**
   * Extract git information from the target project.
   * Returns null if not a git repository or upon error.
   */
  private async readGitInfo(): Promise<GitSnapshot | null> {
    const isGit = await this.gitService.isGitRepository();
    if (!isGit) {
      return null;
    }

    try {
      const [currentBranch, recentCommits, totalCommits, remoteUrl] = await Promise.all([
        this.gitService.getCurrentBranch(),
        this.gitService.getRecentCommits(10),
        this.gitService.getTotalCommitCount(),
        this.gitService.getRemoteUrl(),
      ]);

      return {
        currentBranch,
        remoteUrl,
        recentCommits,
        totalCommits,
      };
    } catch {
      return null;
    }
  }

  /**
   * Detect tech stack from config files.
   */
  private detectTechStack(config: ConfigSnapshot): string[] {
    const stack = new Set<string>();

    if (config.packageJson) {
      stack.add("node");

      const pkg = config.packageJson as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      const allDeps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };

      if (allDeps["typescript"]) stack.add("typescript");
      if (allDeps["next"]) stack.add("nextjs");
      if (allDeps["react"]) stack.add("react");
      if (allDeps["vue"]) stack.add("vue");
      if (allDeps["express"]) stack.add("express");
      if (allDeps["fastify"]) stack.add("fastify");
      if (allDeps["tailwindcss"]) stack.add("tailwind");
      if (allDeps["vitest"]) stack.add("vitest");
      if (allDeps["jest"]) stack.add("jest");
    }

    if (config.tsconfig) {
      stack.add("typescript");
    }

    if (config.otherConfigs["go.mod"]) {
      stack.add("go");
    }

    if (config.otherConfigs["requirements.txt"] || config.otherConfigs["pyproject.toml"]) {
      stack.add("python");
    }

    if (config.otherConfigs["Cargo.toml"]) {
      stack.add("rust");
    }

    return Array.from(stack).slice(0, 20);
  }

  /**
   * Select and read the most important files.
   * Returns up to MAX_KEY_FILES files with their content.
   */
  private async selectKeyFiles(structure: FileInfo[]): Promise<KeyFile[]> {
    const candidates: { file: FileInfo; reason: KeyFile["reason"]; priority: number }[] = [];

    for (const file of structure) {
      if (file.size > MAX_KEY_FILE_SIZE) {
        continue;
      }

      for (const { pattern, reason, priority } of KEY_FILE_PATTERNS) {
        if (pattern.test(file.path)) {
          candidates.push({ file, reason, priority });
          break;
        }
      }
    }

    // Sort by priority (lower = more important)
    candidates.sort((a, b) => a.priority - b.priority);

    // Take top MAX_KEY_FILES
    const selected = candidates.slice(0, MAX_KEY_FILES);

    const keyFiles: KeyFile[] = [];

    for (const { file, reason } of selected) {
      try {
        const fullPath = path.join(this.projectRoot, file.path);
        const content = await fs.readFile(fullPath, "utf-8");

        keyFiles.push({
          path: file.path,
          content,
          reason,
        });
      } catch {
        // Skip files we can't read
      }
    }

    return keyFiles;
  }
}
