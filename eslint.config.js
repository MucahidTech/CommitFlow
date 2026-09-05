// @ts-check
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default defineConfig(
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
    "**/.turbo/**",
    "**/pnpm-lock.yaml",
  ]),

  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic, prettierConfig],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
);
