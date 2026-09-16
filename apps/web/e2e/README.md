# Web E2E Tests (Playwright)

## Overview

End-to-end tests for the CommitFlow dashboard. Tests run against a locally
started Next.js dev server with **all API calls mocked** via Playwright's
route interception.

## Why mocks?

The API layer is tested separately with real HTTP/SSE in
`apps/api/test/e2e/`. Playwright tests focus on UI behavior:

- Rendering
- User interactions (clicks, typing, selection)
- State synchronization
- LocalStorage persistence

## Running

```bash

# All E2E tests

pnpm --filter @commitflow/web test:e2e

# UI mode (interactive)

pnpm --filter @commitflow/web test:e2e:ui

# Debug specific test

pnpm --filter @commitflow/web test:e2e:debug

# Show last report

pnpm --filter @commitflow/web test:e2e:report
```

## First-time setup

```bash

# Install browsers (one-time)

pnpm --filter @commitflow/web exec playwright install chromium
```

## Structure

- `fixtures/api-mocks.ts` — API route mocks
- `dashboard.spec.ts` — Layout and basic interactions
- `execution.spec.ts` — Execution flow
- `provider-config.spec.ts` — Provider modal
- `validation.spec.ts` — Form validation
