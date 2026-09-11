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

### Core Capabilities

- 📜 **Commit Plan Execution** — Parse and execute structured commit plans with atomic git commits.
- 🤖 **Two-Agent AI Orchestration** — DeepSeek generates code while OpenRouter acts as an automated reviewer.
- 🛡️ **Quality Gates** — Automatic code formatting and TypeScript verification before applying changes.
- 🔄 **Error Feedback Loop** — Self-correcting retry loop using targeted error feedback on failed builds.

### Context & Control

- 🔍 **Project Snapshot & Context** — Deep scanning of existing projects to detect code structure and tech stack.
- 🎯 **Target Commit Selection** — Start or resume execution from any specific commit in the roadmap.
- ⏸️ **Pause & Resume Workflows** — Safely interrupt and persist long-running task states to `.commitflow/state.json`.
- 🎨 **Review Model Selector** — Dynamically switch between free or custom OpenRouter models from a live catalog.
- 🔒 **Safe Mode** — Preview and test all generated changes safely without committing to Git (Default: ON).

### Developer Experience

- 📂 **File Context Engine** — Reads and preserves existing file structures to prevent data corruption.
- ⚡ **Real-time Progress** — Server-Sent Events (SSE) stream live status updates directly to the client.
- 🖥️ **Interactive Dashboard** — Next.js UI with commit roadmap visualization, control options, and live logs.
- 🧪 **E2E Testing** — Isolated playground workspace for full automated pipeline verification.

---

## 🏗️ Architecture & Tech Stack

```text
commitflow/
├── .github/workflows/ # CI/CD automation pipelines
├── apps/
│ ├── api/ # Express server (AI orchestration, Git execution, Quality gates)
│ └── web/ # Next.js 15 dashboard (Roadmap visualization, SSE live logs)
└── packages/
├── shared/ # Centralized TypeScript types, Zod schemas & shared utilities
└── config-typescript/ # Shared TypeScript & tooling configurations
```

| Component              | Technology                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| **Monorepo**           | Turborepo + pnpm Workspaces                                                |
| **Backend & Frontend** | Express 4, Node.js 22+, Next.js 15 (App Router), React 19, Tailwind CSS v4 |
| **AI Models**          | DeepSeek (`deepseek-chat`), OpenRouter (Configurable Free/Paid Models)     |
| **Shared Layer**       | Zod schemas & shared inferred TypeScript types                             |
| **Testing & Quality**  | Vitest, React Testing Library, ESLint, Prettier, TypeScript Strict         |

---

## 🛠️ How It Works

### Execution Pipeline

```text

1. Context Init → Scan project path, auto-init Git if empty, detect tech stack & snapshots
2. Plan Submit → API validates structure via Zod schemas and target commit configurations
3. Generation → DeepSeek reads target context & generates changes
4. AI Review → OpenRouter inspects code (refines up to 3x)
5. Quality Gate → Prettier & TypeScript compiler execute checks
6. Git Commit → Rollback on error; apply atomic commit on pass (if Safe Mode OFF)
7. Stream Status → Live updates pushed to Next.js dashboard via SSE with Pause/Resume controls
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

## 📖 Documentation

| Document                       | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| [README](./README.md)          | Overview, quick start, tech stack (this file)                |
| [Usage Guide](./docs/USAGE.md) | Detailed workflows: snapshots, pause/resume, model selection |
| [License](./LICENSE)           | PolyForm Noncommercial License 1.0.0                         |

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
