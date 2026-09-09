# Test Workspace

This directory contains a dummy project used for E2E testing.

## Playground

The `playground/` directory is a minimal TypeScript project that the E2E script modifies during testing.

## Usage

```bash

# From repo root

pnpm --filter @commitflow/api e2e
```

## Important

- Do NOT commit changes made by E2E tests
- The playground is reset before each E2E run
- **Requires real API keys in `apps/api/.env`**
