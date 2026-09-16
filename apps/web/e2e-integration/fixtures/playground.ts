/**
 * Playground fixture for integration tests.
 * Creates an isolated temp directory with git initialized.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const FIXTURE_INDEX_CONTENT = `/**
 * Dummy project file for E2E integration testing.
 */

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;

export interface Playground {
  path: string;
  cleanup: () => void;
}

/**
 * Create an isolated playground in OS temp directory.
 */
export function createPlayground(): Playground {
  const playgroundPath = fs.mkdtempSync(path.join(os.tmpdir(), "commitflow-e2e-"));

  fs.mkdirSync(path.join(playgroundPath, "src"), { recursive: true });
  fs.writeFileSync(path.join(playgroundPath, "src", "index.ts"), FIXTURE_INDEX_CONTENT, "utf-8");

  fs.writeFileSync(
    path.join(playgroundPath, "package.json"),
    JSON.stringify(
      {
        name: "commitflow-playground",
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          format: 'prettier --write "src/**/*.ts"',
          typecheck: "tsc --noEmit",
        },
        devDependencies: {
          typescript: "^5.7.2",
          prettier: "^3.4.2",
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(playgroundPath, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
  );

  const gitOptions = { cwd: playgroundPath, stdio: "ignore" as const };
  execSync("git init", gitOptions);
  execSync('git config user.name "CommitFlow E2E"', gitOptions);
  execSync('git config user.email "e2e@commitflow.local"', gitOptions);
  execSync("git add .", gitOptions);
  execSync('git commit -m "chore: initial commit"', gitOptions);

  return {
    path: playgroundPath,
    cleanup: () => {
      try {
        fs.rmSync(playgroundPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows
      }
    },
  };
}
