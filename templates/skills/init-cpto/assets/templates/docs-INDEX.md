# Docs Index — [PROJECT_NAME]

> Navigation guide for on-demand context loading.
> Load topic files **only** when the current task needs them.

---

## Default Working Set (~800 tokens)

These 4 files are loaded at the start of every session:

| File | Purpose | ~Tokens |
|---|---|---|
| `.github/copilot-instructions.md` | Project overview + critical rules | ~200 |
| `.cpto/COMMON_MISTAKES.md` | Top mistakes for this stack | ~250 |
| `.cpto/QUICK_START.md` | Dev/test/build commands | ~150 |
| `.cpto/ARCHITECTURE_MAP.md` | Directory layout + entry points | ~200 |

**Total default context: ~800 tokens**

---

## On-Demand Topic Files

Load these from `docs/learnings/` only when the task explicitly needs them.

| File | Load When | ~Tokens |
|---|---|---|
| `docs/learnings/[topic-1].md` | [trigger condition — e.g., "adding a new API endpoint"] | ~[N] |
| `docs/learnings/[topic-2].md` | [trigger condition — e.g., "writing or debugging tests"] | ~[N] |
| `docs/learnings/[topic-3].md` | [trigger condition] | ~[N] |
| `docs/learnings/[topic-4].md` | [trigger condition] | ~[N] |

---

## Never Auto-Load

These directories are excluded from the default working set. Access them explicitly only when needed:

- `.cpto/completions/` — per-task completion notes
- `.cpto/sessions/` — in-progress and archived session context
- `docs/archive/` — old or superseded documentation

---

## Before/After Context Budget

| Scenario | Before | After |
|---|---|---|
| Default session start | ~[X] tokens (unoptimized) | ~800 tokens |
| Adding a new [feature] | + full codebase scan | + `docs/learnings/[topic].md` (~[N] tokens) |
| Debugging [scenario] | + scattered context | + `docs/learnings/[topic].md` (~[N] tokens) |

---

## Working-Set Rules

> - Treat `.github/copilot-instructions.md` as the startup summary — keep it lean
> - Consult `.cpto/COMMON_MISTAKES.md`, `.cpto/QUICK_START.md`, `.cpto/ARCHITECTURE_MAP.md` before non-trivial work
> - Load `docs/learnings/` topic files **only when the current task needs them**
> - At task completion: create `.cpto/completions/YYYY-MM-DD-task-name.md`
> - **Never auto-load**: `.cpto/completions/`, `.cpto/sessions/`, `docs/archive/`
