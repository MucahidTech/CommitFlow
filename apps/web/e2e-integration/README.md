# E2E Integration Tests

Full-stack tests with real backend + real AI + real git.

## Requirements

- AI keys in `apps/api/.env`
- `pnpm --filter @commitflow/web exec playwright install chromium`

## Running

"""bash
pnpm --filter @commitflow/web test:e2e:integration
"""

## Skipping

"""bash
SKIP_INTEGRATION=true pnpm --filter @commitflow/web test:e2e:integration
"""

## Difference from `e2e/`

| Aspect  | e2e/   | e2e-integration/ |
| ------- | ------ | ---------------- |
| Backend | Mocked | Real             |
| AI      | Mocked | Real             |
| Git     | No     | Real commits     |
| Speed   | ~3s    | ~30-60s          |
