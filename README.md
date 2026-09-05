# 🚀 CommitFlow

> AI-powered devtool for executing atomic, validated commit plans on target repositories.

## 💡 What is CommitFlow?

CommitFlow is a development automation tool that receives a structured commit plan and executes it automatically. It orchestrates dual AI agents to implement changes, enforce quality gates, and commit each change atomically.

## ✨ Key Features

- **Commit Plan Execution** — Parse and execute structured commit plans with atomic commits
- **Dual AI Orchestration** — DeepSeek generates code, Gemini reviews it before application
- **File Context Engine** — Reads current file contents before modification to prevent data loss
- **Quality Gates** — Automatic formatting (`pnpm format`) and type checking (`tsc --noEmit`) before each commit
- **Real-time Progress** — Server-Sent Events (SSE) streaming to the dashboard
- **Interactive Dashboard** — Next.js UI with commit roadmap visualization and live logs

## 🏗️ Architecture

CommitFlow is a pnpm-based monorepo using Turborepo for task orchestration.

| Package                      | Description                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `apps/api`                   | Express backend — AI orchestration, git execution, quality gates |
| `apps/web`                   | Next.js dashboard — plan input, roadmap visualization, live logs |
| `packages/shared`            | Zod schemas and inferred TypeScript types                        |
| `packages/config-typescript` | Shared TypeScript configurations across the workspace            |

## 🛠️ Tech Stack

- **Monorepo:** Turborepo + pnpm Workspaces
- **Backend:** Node.js, Express, TypeScript, simple-git
- **AI:** DeepSeek API (code generation), Gemini API (code review)
- **Frontend:** Next.js (App Router), Tailwind CSS, TanStack Query
- **Validation:** Zod schemas with inferred types
- **Quality:** ESLint, Prettier, TypeScript strict mode

## 🚦 Getting Started

### 📋 Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### ⚙️ Local Setup

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm build

# Run linting & formatting checks
pnpm lint
pnpm format:check
```

## 🚧 Development Status

**Early Development** — Core architecture being established.

## 📜 License

This project is licensed under the PolyForm Noncommercial License 1.0.0.

**Source-Available** — You may view and learn from this code, but you may not use it commercially, redistribute it, or create derivative works without explicit written permission.

See [LICENSE](./LICENSE) for the full license text.
