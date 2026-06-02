---
name: init-cpto
description: 'Initialize the .cpto documentation layout for any project. Creates .cpto/ with COMMON_MISTAKES.md, QUICK_START.md, ARCHITECTURE_MAP.md, docs/learnings/ topic files, .github/copilot-instructions.md, and .copilotignore. Use when setting up a new project, onboarding a codebase, or when asked to "init cpto", "setup cpto", "create cpto layout", "initialize copilot docs", "setup copilot documentation structure", or "optimize copilot context".'
argument-hint: 'Optional: project name, type, and tech stack. If omitted, the skill will explore the codebase first.'
---

# init-cpto — Initialize the .cpto Documentation Layout

This skill creates a lean, signal-dense documentation structure that keeps the default Copilot working set under ~800 tokens while preserving deep project knowledge in on-demand files.

## When to Use

- Starting a new project and want Copilot pre-configured
- Onboarding an existing codebase for efficient AI-assisted development
- The current `copilot-instructions.md` is too long or generic
- Deep-dive docs are scattered and hard to load selectively

## Outcome

```
.github/copilot-instructions.md    ← Always-on startup summary (~200 lines max)
.copilotignore                     ← Excludes archives, sessions, completions
.cpto/
  COMMON_MISTAKES.md               ← Top mistakes for this stack
  QUICK_START.md                   ← Dev, test, build commands
  ARCHITECTURE_MAP.md              ← Directory layout + entry points
  completions/                     ← Per-task completion notes (never auto-loaded)
  sessions/
    active/                        ← In-progress session context
    archive/                       ← Finished session notes
docs/
  INDEX.md                         ← Working-set guide + token estimates
  learnings/                       ← 3-6 topic files loaded on demand
  archive/                         ← Never auto-loaded
```

---

## Procedure

### Step 1 — Gather Context

If the user provided project context in the argument, use it. Otherwise:

1. Read `package.json` / `go.mod` / `pyproject.toml` / `Cargo.toml` to identify language + framework.
2. Read `README.md` for project description.
3. Run a quick directory listing of the root and `src/` or `internal/` to understand structure.
4. Identify: project name, type (frontend/backend/CLI/library/full-stack), tech stack, main features.

If critical context is still missing after exploration, ask the user exactly one question covering: project name, type, and the most important tech decisions.

### Step 2 — Plan the Files

Before creating anything, decide:

- Which `docs/learnings/` topics apply (see [Topic Selection Guide](#topic-selection-guide))
- What the top 5 mistakes are for this stack (see [Common Mistakes by Stack](#common-mistakes-by-stack))
- What dev/test/build commands exist (from Makefile, package.json scripts, etc.)

### Step 3 — Create Files

Create each file using the templates in `./assets/templates/`. Fill every `[PLACEHOLDER]` with real project-specific content — never leave generic boilerplate.

**Order matters:**
1. `.cpto/ARCHITECTURE_MAP.md` — explore first, then write
2. `.cpto/QUICK_START.md` — extract from Makefile/package.json scripts
3. `.cpto/COMMON_MISTAKES.md` — tailor to the actual stack
4. `docs/INDEX.md` — reference the topics you'll create
5. `docs/learnings/<topic>.md` — create only the relevant topics
6. `.github/copilot-instructions.md` — write last (summarizes everything above)
7. `.copilotignore` — use the standard template

### Step 4 — Validate

- `copilot-instructions.md` must be ≤ 200 lines
- Every `[PLACEHOLDER]` must be replaced
- `docs/INDEX.md` must list all created learnings files
- `.copilotignore` must exclude `.cpto/completions/**`, `.cpto/sessions/**`, `docs/archive/**`
- No long session journals or task histories in `copilot-instructions.md`

### Step 5 — Report

After creation, report:
1. Files created (with line counts)
2. Recommended default working set (the 4 always-on files)
3. Deep-dive topic files and when to load each
4. Any project-specific assumptions made

---

## Topic Selection Guide

Choose 3–6 topics from this list based on what the project actually needs:

| Topic File | Use When |
|---|---|
| `testing-patterns.md` | Non-trivial test setup, mocking, envtest, e2e |
| `common-pitfalls.md` | Framework-specific footguns worth documenting |
| `performance.md` | Bundle size, query optimization, caching concerns |
| `api-design.md` | REST/gRPC API conventions, versioning, error codes |
| `state-management.md` | Frontend: complex client state (Zustand, Redux, TanStack) |
| `authentication.md` | Auth flows, token handling, OIDC/SSO patterns |
| `database-patterns.md` | ORM patterns, migrations, query patterns |
| `deployment.md` | CI/CD, Helm, Terraform, container builds |
| `codegen-patterns.md` | Generated code workflows (Orval, protobuf, oapi-codegen) |
| `controller-patterns.md` | Kubernetes controller-runtime reconciliation patterns |

---

## Common Mistakes by Stack

Use these as the starting point for `.cpto/COMMON_MISTAKES.md`, then add project-specific ones.

### Go / controller-runtime
- Forgetting `make generate` before touching CRD types
- `defer x.Close()` without error handling (`errcheck` lint failure)
- Ad-hoc string keys instead of `Ctx*` constants in `ReconcileData`
- Editing generated files under `proto/`, `internal/gen/`, or vendored code
- Missing `RequiresReplace()` on immutable Terraform fields

### Next.js / React
- Importing generated client code (`src/gen/`) directly from components
- Using `<img>` instead of `<Image>` from `next/image`
- Inline `style=` instead of Tailwind utilities
- Calling `pnpm install` without `--ignore-scripts` in CI/Docker
- Using `any` instead of proper TypeScript types

### Node.js / Express
- Missing `await` on async middleware
- Not validating at system boundaries (trust but verify incoming payloads)
- Synchronous file I/O in request handlers
- Missing error handler middleware as the last `app.use()`

### Python / Django / FastAPI
- Mutable default arguments in function signatures
- Missing `select_related`/`prefetch_related` causing N+1 queries
- Blocking I/O in async route handlers
- Secrets in source code instead of environment variables

### Terraform
- Hard-coding values that should be variables
- Not using `lifecycle { prevent_destroy = true }` for stateful resources
- Missing `depends_on` for implicit dependencies

---

## Templates

See linked asset files — they are the canonical file skeletons:

- [copilot-instructions.md template](./assets/templates/copilot-instructions.md)
- [COMMON_MISTAKES.md template](./assets/templates/COMMON_MISTAKES.md)
- [QUICK_START.md template](./assets/templates/QUICK_START.md)
- [ARCHITECTURE_MAP.md template](./assets/templates/ARCHITECTURE_MAP.md)
- [docs-INDEX.md template](./assets/templates/docs-INDEX.md)
- [.copilotignore template](./assets/templates/copilotignore.txt)

---

## Working-Set Rules (Embed in Every Project)

Document these in `docs/INDEX.md` and reinforce in `copilot-instructions.md`:

> - Default working set: ~800 tokens (4 files)
> - `.github/copilot-instructions.md` is the startup summary — keep it lean
> - Consult `.cpto/COMMON_MISTAKES.md`, `.cpto/QUICK_START.md`, `.cpto/ARCHITECTURE_MAP.md` before non-trivial work
> - Load `docs/learnings/` topic files only when the current task needs them
> - **Never auto-load**: `.cpto/completions/`, `.cpto/sessions/`, `docs/archive/`
