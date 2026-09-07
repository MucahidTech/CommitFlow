import { exec } from "node:child_process";
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
  /** Whether all checks passed */
  passed: boolean;
  /** Format check result */
  format: CheckResult;
  /** Typecheck result */
  typecheck: CheckResult;
  /** Human-readable list of failures */
  errors: string[];
}

/**
 * Quality gate service.
 * Runs formatting and type checking before allowing commits.
 */
export class QualityGateService {
  private readonly projectRoot: string;
  private readonly execOptions: { cwd: string; maxBuffer: number; timeout: number };

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.execOptions = {
      cwd: this.projectRoot,
      maxBuffer: 10 * 1024 * 1024, // 10MB to handle large outputs
      timeout: 60000, // 60s timeout
    };
  }

  /**
   * Run the quality gate (format + typecheck).
   */
  async run(): Promise<QualityGateResult> {
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
   * Run prettier formatting.
   * Uses pnpm format with fallback to npx prettier.
   */
  private async runFormat(): Promise<CheckResult> {
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
   * Uses pnpm typecheck with fallback to npx tsc --noEmit.
   */
  private async runTypecheck(): Promise<CheckResult> {
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
