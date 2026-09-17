# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-17

### Added

- Commit plan execution engine with atomic git commits
- Two-agent AI orchestration (generator + reviewer)
- Multi-provider support: DeepSeek, OpenRouter, Groq
- Project snapshot and context initialization for existing repositories
- Target commit selection and completed commit filtering
- Pause and resume workflows with persistent state
- Safe mode for previewing changes without committing
- Quality gates: automatic formatting and TypeScript verification
- Error feedback loop with targeted retry on failed checks
- Real-time progress via Server-Sent Events (SSE)
- Next.js dashboard with commit roadmap and live console
- Interactive provider configuration modal

### Developer Experience

- Monorepo with Turborepo and pnpm workspaces
- Shared Zod schemas and inferred TypeScript types
- Unit tests with Vitest (~150 tests)
- E2E UI tests with Playwright (~40 tests, mocked API)
- E2E API tests against real AI providers and git
- Full-stack integration test (browser + backend + AI + git)
- CI pipeline with quality checks and E2E jobs
- Comprehensive documentation: README, USAGE, TESTING
