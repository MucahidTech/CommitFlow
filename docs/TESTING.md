# Testing Guide

CommitFlow uses a layered testing strategy. This document is the single source of truth for what each layer covers, how to run it, and what it requires.

## Test Layers

| Layer           | Location                    | Runner                  | Requires AI | Estimated time |
| --------------- | --------------------------- | ----------------------- | ----------- | -------------- |
| Unit            | `apps/*/src/**/*.test.ts`   | Vitest                  | No          | ~10s           |
| E2E API         | `apps/api/test/e2e/`        | tsx + real backend      | Yes         | ~30s           |
| E2E UI          | `apps/web/e2e/`             | Playwright (mocked API) | No          | ~35s           |
| E2E Integration | `apps/web/e2e-integration/` | Playwright + real stack | Yes         | ~30-60s        |

## Commands

```bash
# All unit tests (fast, no AI required)
pnpm test

# E2E UI tests (Playwright with mocked API)
pnpm e2e:web

# E2E API tests (requires AI keys in apps/api/.env)
pnpm e2e:api

# Full-stack integration test
pnpm e2e:integration

# All E2E suites (requires AI keys)
pnpm e2e:all

# Full quality check (format + lint + typecheck + unit + E2E)
pnpm verify
```

## When to Use Each Layer

- **Unit tests** run on every change. They are fast and do not depend on external services.
- **E2E UI tests** validate browser behavior with a mocked API. Run them when changing components, hooks, or user flows.
- **E2E API tests** validate the backend pipeline against a real AI provider and git. Run them before pushing changes that affect orchestration, git, or quality gates.
- **E2E Integration** validates the full stack from browser to git commit. Run it before releases or when changing the integration between frontend and backend.

## AI Keys

E2E API and E2E Integration tests require at least one AI provider key in `apps/api/.env`:

```env
GROQ_API_KEY=...
DEEPSEEK_API_KEY=...
OPENROUTER_API_KEY=...
```

Unit tests and E2E UI tests do not require any keys.

## Auto-Skip Behavior

- **E2E API tests** skip gracefully when no AI keys are configured. They exit with code 0 and a clear message. This allows CI to pass without secrets.
- **E2E Integration tests** skip when `SKIP_INTEGRATION=true` is set. This is useful when you want to run only UI tests.

## CI

- **Quality Checks** and **E2E Web** run on every push and pull request. No AI keys required.
- **E2E API** and **E2E Integration** run only when the `ENABLE_E2E_API` repository variable is set to `true`. This avoids consuming AI credits on every push.

## Writing Tests

- Place unit tests next to the file under test: `foo.ts` → `foo.test.ts`.
- Place E2E UI tests in `apps/web/e2e/`.
- Place E2E Integration tests in `apps/web/e2e-integration/`.
- Use `data-testid` for elements that need stable selectors in tests.
- Prefer `getByRole`, `getByLabel`, and `getByText` over CSS selectors.

## Troubleshooting

### E2E tests skip unexpectedly

Check that `GROQ_API_KEY` or another provider key is present in `apps/api/.env`.

### E2E Integration fails with EADDRINUSE

Ensure no other process is using ports 3000 or 4000. Stop any running dev servers before running E2E tests.

### Playwright reports are not generated

Run `pnpm --filter @commitflow/web test:e2e:report` to open the last report.
