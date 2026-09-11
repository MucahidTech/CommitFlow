# CommitFlow Usage Guide

> Detailed workflows and operational guide for real-world execution scenarios.

This guide covers advanced features beyond the basic setup found in the [Quick Start](../README.md#-quick-start).

---

## Table of Contents

- [Project Context Initialization](#project-context-initialization)
- [User Context & Vision](#user-context--vision)
- [Target Commit Selection](#target-commit-selection)
- [Pause & Resume Workflows](#pause--resume-workflows)
- [Review Model Selection](#review-model-selection)
- [Common Scenarios](#common-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Project Context Initialization

### What is a Snapshot?

A **snapshot** is a one-time deep scan of your target project directory that gives AI agents full architectural understanding before code generation:

- **File structure** — up to 500 files (excluding `node_modules`, `.git`, `dist`, etc.)
- **Config files** — `package.json`, `tsconfig.json`, `go.mod`, etc.
- **Git history** — current branch, remote URL, last 10 commit messages, total count
- **Key files** — up to 10 important entry-point files (configs, server files, README)

The snapshot is sent to the AI once at the start of each execution plan to preserve tokens while maintaining full project awareness.

### When to Use

| Scenario               | Recommended                                       |
| ---------------------- | ------------------------------------------------- |
| Existing project setup | ✅ Always analyze first                           |
| Empty directory        | ⚠️ Optional (auto git init handles empty folders) |
| Continuing after Pause | ✅ Uses cached snapshot or optional re-scan       |

### Empty Directory Behavior

If you point CommitFlow at an empty directory:

- Snapshot is generated with empty `structure` and `keyFiles`
- Git repository is **initialized automatically** on execution
- Initial empty baseline commit is created automatically
- The AI understands it is bootstrapping a new application from scratch

---

## User Context & Vision

### Why It Matters

The snapshot tells the AI **what exists**. The User Context tells it **what you want**.

Without user context, the AI generates generic implementation code that may not align with your architecture rules, naming conventions, or tech preferences.

### Recommended Contents

```text
1. Project goal       → "SaaS platform for X"
2. Tech preferences   → "Use TypeScript strict, prefer functional style"
3. Architecture       → "Monorepo, feature-based modules, avoid classes"
4. Conventions        → "File names kebab-case, components PascalCase"
5. Things to avoid    → "No Redux, no class components, no moment.js"
```

---

## Target Commit Selection

### Purpose

When working on an existing repository or returning to a multi-step plan, you may want to start from a specific commit in the plan without re-executing previous steps.

### Workflow

1. **Paste the full plan** in the Commit Plan Input.
2. **Check off commits** that are already completed manually.
3. **Click the Star (★) icon** next to the commit where execution should begin.
4. **Click "Analyze Project"** and start execution.

The AI receives completed commits as background context while strictly generating code starting from the starred target commit.

---

## Pause & Resume Workflows

### What Gets Saved

After every completed commit, CommitFlow persists state to `<project>/.commitflow/state.json`:

- Project context and active target selection
- Current plan progress and index of the next step
- Completed commit results and timestamps

This directory is automatically appended to `.gitignore`.

### Resuming Execution

1. Re-open the dashboard with the same project path.
2. A **"Paused session found"** banner will display.
3. Choose **Fast Resume** (use saved state) or **Re-scan** (refresh snapshot if manual edits were made during pause).
4. Click **"Resume Execution"**.

---

## Review Model Selection

CommitFlow integrates with OpenRouter for secondary code reviews.

- **Default:** Uses the model specified in `OPENROUTER_REVIEW_MODEL`.
- **Live Catalog:** The model selector dropdown automatically fetches and caches free models from OpenRouter.
- **Custom / Paid Models:** Select "Other..." in the dropdown to supply any custom model ID.

---

## Common Scenarios

### Scenario 1: Bootstrap a New Project

1. Point path to an empty folder.
2. Paste execution plan.
3. Click **Execute Plan** (Git initializes automatically).

### Scenario 2: Existing Codebase Integration

1. Set project path and click **Analyze Project**.
2. Provide project guidelines in **User Context**.
3. Set target commit if resuming mid-plan.
4. Click **Execute Plan**.

---

## Troubleshooting

- **Execute Button Disabled:** Verify project path is set and project analysis has been executed.
- **Pause Delay:** Execution pause is cooperative; the active commit pipeline finishes its current quality check before halting safely.
