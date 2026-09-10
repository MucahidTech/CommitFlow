import { z } from "zod";

/**
 * Information about a single file in the project structure.
 */
export const fileInfoSchema = z
  .object({
    /** Relative path from project root */
    path: z.string().min(1),
    /** File size in bytes */
    size: z.number().int().nonnegative(),
    /** File extension (e.g. ".ts", ".json") */
    extension: z.string(),
  })
  .strict();

/**
 * Git metadata extracted from the target project.
 */
export const gitSnapshotSchema = z
  .object({
    /** Current branch name */
    currentBranch: z.string(),
    /** Remote origin URL (if any) */
    remoteUrl: z.string().optional(),
    /** Recent commit messages (last 10) */
    recentCommits: z.array(z.string()).max(10).default([]),
    /** Total commit count */
    totalCommits: z.number().int().nonnegative().default(0),
  })
  .strict();

/**
 * Configuration files content extracted from the project.
 */
export const configSnapshotSchema = z
  .object({
    /** package.json content (parsed) */
    packageJson: z.record(z.string(), z.unknown()).optional(),
    /** tsconfig.json content (parsed) */
    tsconfig: z.record(z.string(), z.unknown()).optional(),
    /** Other config files by name */
    otherConfigs: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

/**
 * Key file with its content for AI context.
 */
export const keyFileSchema = z
  .object({
    /** Relative path */
    path: z.string().min(1),
    /** File content (full text) */
    content: z.string(),
    /** Why this file was selected */
    reason: z.enum(["entry_point", "config", "readme", "main_module", "other"]),
  })
  .strict();

/**
 * Complete project snapshot schema (Runtime & Output).
 */
export const projectSnapshotSchema = z
  .object({
    /** Project root path (absolute) */
    projectPath: z.string().min(1),
    /** Project name from package.json or folder name */
    projectName: z.string().min(1).max(200),
    /** Tech stack detected from config files */
    techStack: z.array(z.string()).max(20).default([]),
    /** File structure (limited to 500 files) */
    structure: z.array(fileInfoSchema).max(500).default([]),
    /** Git information (nullable/optional if not a git repo) */
    git: gitSnapshotSchema.nullable().optional(),
    /** Configuration files content */
    config: configSnapshotSchema.default({ otherConfigs: {} }),
    /** Key files content for AI */
    keyFiles: z.array(keyFileSchema).max(10).default([]),
    /** When the snapshot was created */
    createdAt: z.string().datetime(),
    /** Snapshot format version */
    version: z.literal(1).default(1),
  })
  .strict();

/**
 * Input Schema for creation (auto-generates defaults & createdAt)
 */
export const projectSnapshotInputSchema = projectSnapshotSchema.extend({
  createdAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

/** Inferred TypeScript types */
export type FileInfo = z.infer<typeof fileInfoSchema>;
export type GitSnapshot = z.infer<typeof gitSnapshotSchema>;
export type ConfigSnapshot = z.infer<typeof configSnapshotSchema>;
export type KeyFile = z.infer<typeof keyFileSchema>;
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;
export type ProjectSnapshotInput = z.infer<typeof projectSnapshotInputSchema>;
