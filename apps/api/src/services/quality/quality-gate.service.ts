import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/** Result of running a single quality check */
export interface CheckResult {
  success: boolean;
  output: string;
}

/** Result of the complete quality gate */
export interface QualityGateResult {
  passed: boolean;
  format: CheckResult;
  typecheck: CheckResult;
  errors: string[];
}

export class QualityGateService {
  private readonly projectRoot: string;
  private readonly execOptions: { cwd: string; maxBuffer: number; timeout: number };

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.execOptions = {
      cwd: this.projectRoot,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000,
    };
  }

  async run(): Promise<QualityGateResult> {
    // Ensure dependencies are installed first
    await this.ensureDependenciesInstalled();

    const format = await this.runFormat();
    const typecheck = await this.runTypecheck();
    const errors: string[] = [];

    if (!format.success) {
      errors.push(`Format failed: ${format.output.slice(0, 1000)}`);
    }

    if (!typecheck.success) {
      errors.push(`Typecheck failed: ${typecheck.output.slice(0, 1000)}`);
    }

    return {
      passed: format.success && typecheck.success,
      format,
      typecheck,
      errors,
    };
  }

  /**
   * Install dependencies if node_modules is missing.
   * This is critical for the first commit on an empty directory.
   */
  private async ensureDependenciesInstalled(): Promise<void> {
    const nodeModulesPath = path.join(this.projectRoot, "node_modules");
    const packageJsonPath = path.join(this.projectRoot, "package.json");

    try {
      await fs.access(nodeModulesPath);
      // node_modules exists
      return;
    } catch {
      // node_modules missing
    }

    try {
      await fs.access(packageJsonPath);
      // package.json exists but no node_modules — install
      await execAsync("pnpm install --no-frozen-lockfile", this.execOptions);
    } catch {
      // No package.json — skip install (nothing to install)
    }
  }

  /**
   * Run prettier formatting.
   */
  private async runFormat(): Promise<CheckResult> {
    const hasPackageJson = await this.fileExists("package.json");
    const hasNodeModules = await this.fileExists("node_modules");

    if (!hasPackageJson) {
      return { success: true, output: "Skipped: no package.json" };
    }

    if (!hasNodeModules) {
      return { success: true, output: "Skipped: no node_modules (nothing to format)" };
    }

    try {
      const { stdout, stderr } = await execAsync(
        "pnpm format || npx prettier --write .",
        this.execOptions,
      );
      return {
        success: true,
        output: stdout || stderr || "Format completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        output: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Run TypeScript type checking.
   * Skips if no tsconfig.json exists (common in early commits).
   */
  private async runTypecheck(): Promise<CheckResult> {
    const hasTsconfig = await this.fileExists("tsconfig.json");
    const hasPackageJson = await this.fileExists("package.json");

    if (!hasTsconfig || !hasPackageJson) {
      return {
        success: true,
        output: "Skipped: no tsconfig.json or package.json",
      };
    }

    try {
      const { stdout, stderr } = await execAsync(
        "pnpm typecheck || npx tsc --noEmit",
        this.execOptions,
      );
      return {
        success: true,
        output: stdout || stderr || "Typecheck completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        output: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Check if a file or directory exists.
   */
  private async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract a meaningful error message from exec error.
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const execError = error as Error & {
        stdout?: string;
        stderr?: string;
      };
      return execError.stderr || execError.stdout || execError.message;
    }
    return String(error);
  }
}
