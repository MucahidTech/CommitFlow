<div align="center">

# 🚀 CommitFlow

> Automated project execution engine with two-agent AI code review.

[![CI Status](https://github.com/MucahidTech/CommitFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/MucahidTech/CommitFlow/actions/workflows/ci.yml)
[![License: PolyForm NonCommercial](https://img.shields.io/badge/License-PolyForm--NonCommercial--1.0.0-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D11.0.0-orange.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/turborepo-2.3.3-red.svg)](https://turbo.build/)

</div>

---

**CommitFlow** receives structured commit plans and executes them automatically. It orchestrates a dual-agent AI pipeline (DeepSeek for code generation, OpenRouter for code review), enforces strict quality gates, and applies atomic git commits.

---

## ✨ Key Features

- 📜 **Commit Plan Execution** — Parse and execute structured commit plans with atomic commits.
- 🤖 **Two-Agent AI Orchestration** — DeepSeek generates code, OpenRouter reviews it before application.
- 📂 **File Context Engine** — Reads current file contents before modification to prevent data loss.
- 🛡️ **Quality Gates** — Automatic formatting and type checking before each commit.
- 🔄 **Error Feedback Loop** — Automatic retry with targeted error feedback on quality failures.
- ⚡ **Real-time Progress** — Server-Sent Events (SSE) streaming live status to the dashboard.
- 🖥️ **Interactive Dashboard** — Next.js UI with commit roadmap visualization and live logs.
- 🔒 **Safe Mode** — Preview changes without committing to git (default: ON).
- 🧪 **E2E Testing** — Full pipeline verification with an isolated playground environment.

---

## 🏗️ Architecture & Tech Stack

```text
commitflow/
├── apps/
│ ├── api/ # Express server (AI orchestration, Git execution, Quality gates)
│ └── web/ # Next.js 15 dashboard (Roadmap visualization, SSE live logs)
└── packages/
├── shared/ # Zod schemas & TypeScript types
└── config-*/ # Shared TS & tooling configurations
```

| Component              | Technology                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| **Monorepo**           | Turborepo + pnpm Workspaces                                                |
| **Backend & Frontend** | Express 4, Node.js 22+, Next.js 15 (App Router), React 19, Tailwind CSS v4 |
| **AI Models**          | DeepSeek (`deepseek-chat`), OpenRouter (`cohere/north-mini-code:free`)     |
| **Validation**         | Zod schemas with inferred types                                            |
| **Testing & Quality**  | Vitest, React Testing Library, ESLint, Prettier, TypeScript Strict         |

---

## 🛠️ How It Works & Usage

### Execution Pipeline

```text

1. Submit Plan → API validates structure via Zod schemas
2. Generation → DeepSeek reads target context & generates changes
3. AI Review → OpenRouter inspects code (refines up to 3x)
4. Quality Gate → Prettier & TypeScript compiler execute checks
5. Git Commit → Rollback on error; apply atomic commit on pass (if Safe Mode OFF)
6. Stream Status → Live updates pushed to Next.js dashboard via SSE
```

---

### Commit Plan Format

Each line represents an atomic execution step: `ID - type(scope): subject`

```text
001 - feat(shared): scaffold shared package
002 - feat(api): add endpoint
003 - fix(web): resolve render crash
```

| Type        | Purpose           | Supported Types                                 |
| ----------- | ----------------- | ----------------------------------------------- |
| **Core**    | Features & Fixes  | `feat`, `fix`, `refactor`, `perf`               |
| **Tooling** | Docs, Config & CI | `docs`, `chore`, `test`, `ci`, `build`, `style` |

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** `>= 22.0.0`
- **pnpm** `>= 11.0.0`
- **Git** `>= 2.30`

### 2. Setup & Installation

```bash

# Clone and install dependencies

git clone https://github.com/MucahidTech/CommitFlow.git
cd CommitFlow
pnpm install

# Build shared packages

pnpm build
```

### 3. Environment Setup

Create `apps/api/.env`:

```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_REVIEW_MODEL=cohere/north-mini-code:free
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Run Development Server

```bash
pnpm dev
```

Open **http://localhost:3000** to access the dashboard.

---

## 🧪 Testing & Scripts

| Command                             | Description                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `pnpm test`                         | Run unit & component tests across all workspaces          |
| `pnpm --filter @commitflow/api e2e` | Run end-to-end integration test (Full AI-to-Git pipeline) |
| `pnpm lint`                         | Run ESLint across all packages                            |
| `pnpm typecheck`                    | Run TypeScript type checks                                |
| `pnpm format`                       | Format code with Prettier                                 |

---

## 📜 License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**. See [LICENSE](./LICENSE) for details.
