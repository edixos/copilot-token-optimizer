# [PROJECT_NAME] Copilot Instructions

## Project Overview

**[PROJECT_NAME]** is a [brief one-sentence description of what the project does].

- **Language**: [Go X.Y / TypeScript / Python / etc.]
- **Stack**: [key frameworks and libraries]
- **Docs site**: [MkDocs / Zensical / None — canonical nav in X]

---

## Session Start Protocol ⚡

For non-trivial work, consult the three core references **before** editing:

```bash
# High-signal docs (~800 tokens total)
✓ .cpto/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .cpto/QUICK_START.md          # Essential commands
✓ .cpto/ARCHITECTURE_MAP.md     # File locations
```

**Load topic docs only when the task needs them:**
- Use `docs/INDEX.md` to find deep-dive notes in `docs/learnings/`
- Path-specific rules: `.github/instructions/NAME.instructions.md`

**At task completion:**
- Create completion doc in `.cpto/completions/YYYY-MM-DD-task-name.md`
- Move session file to `.cpto/sessions/archive/` (if created)

**⚠️ NEVER auto-load:**
- Files in `.cpto/completions/` (0 token cost)
- Files in `.cpto/sessions/` (0 token cost)
- Files in `docs/archive/` (0 token cost)

---

## Architecture Map (Quick Reference)

| Layer | Path | Notes |
|---|---|---|
| [Entry point] | `[path/]` | [brief note] |
| [Core logic] | `[path/]` | [brief note] |
| [API / routes] | `[path/]` | [brief note] |
| [Config / types] | `[path/]` | [brief note] |

---

## Critical Rules

1. [Most important rule for this project — e.g., never edit generated files]
2. [Second most important rule]
3. [Third rule]
4. [Run `make X` before every push / pnpm pre-pr before commit]
5. [Key convention — naming, constants, error handling]

---

## Quick Commands

```bash
[dev-command]       # Start development server / run locally
[test-command]      # Run tests
[build-command]     # Build the project
[lint-command]      # Lint
[gate-command]      # Full pre-commit / pre-MR gate
```

---

## Corporate Proxy

```bash
source ~/Renault/.proxies   # Run if any network command silently fails
```

---

**Last Updated**: [YYYY-MM-DD]
**Optimized with**: Copilot Token Optimizer
