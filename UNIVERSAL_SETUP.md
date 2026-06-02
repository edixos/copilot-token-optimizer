# Universal GitHub Copilot Setup Prompt

Copy this prompt into GitHub Copilot Chat when you want Copilot itself to create the optimized documentation structure.

---

# Create an Optimized Copilot Documentation Layout for [PROJECT_NAME]

You are GitHub Copilot working inside this repository. Create a documentation layout that keeps the default working context small while preserving deep project knowledge in files that can be loaded only when relevant.

## Project Context

**Project Type**: [Express / Next.js / Django / React / etc.]
**Tech Stack**: [List main technologies]
**Main Features**: [Brief description]

## Goals

1. Keep `.github/copilot-instructions.md` concise and under 200 lines.
2. Move durable high-signal knowledge into `.github/`.
3. Move deep-dive topics into `docs/learnings/`.
4. Keep historical material in places that are never part of the default working set.
5. Include token estimates and navigation hints so future Copilot sessions stay lean.

## Files and Directories to Create

### Root

- `.github/copilot-instructions.md`
- `.copilotignore`

### `.github/`

```text
.github/
├── COMMON_MISTAKES.md
├── QUICK_START.md
├── ARCHITECTURE_MAP.md
├── LEARNINGS_INDEX.md
├── DOCUMENTATION_MAINTENANCE.md
├── completions/
├── sessions/
│   ├── active/
│   └── archive/
└── templates/
```

### `docs/`

```text
docs/
├── INDEX.md
├── QUICK_REFERENCE.md
├── learnings/
└── archive/
```

## Content Requirements

### `.github/copilot-instructions.md`

Make this the always-on summary for Copilot. It should include:

- a short project overview
- a short working agreement for Copilot
- the three core reference files to consult first
- quick-start commands
- where to find deep-dive docs
- a rule to avoid loading archives, session logs, and completed-task notes by default

### `.cpto/COMMON_MISTAKES.md`

Include the top five high-cost mistakes for this stack. Focus on bugs that are expensive, recurrent, or framework-specific.

### `.cpto/QUICK_START.md`

Include:

- development commands
- test commands
- build commands
- database or migration commands if relevant
- common local workflows

### `.cpto/ARCHITECTURE_MAP.md`

Include:

- the main directory layout
- where core features live
- key entry points
- common extension points

### `docs/INDEX.md`

Include:

- the default working set
- which topic files to load for which tasks
- directional token estimates
- a short before/after explanation

### `docs/learnings/`

Create 3 to 6 topic files that fit the project. Likely topics:

- `testing-patterns.md`
- `common-pitfalls.md`
- `performance.md`
- `database-patterns.md` for backend work
- `api-design.md` for API projects
- `state-management.md` for frontend work
- `authentication.md` for full-stack work

## Ignore Rules

Create `.copilotignore` with rules that exclude:

- `.github/completions/**`
- `.github/sessions/**`
- `docs/archive/**`
- dependency folders
- logs
- build artifacts
- editor metadata

## Working-Set Rules

Document these rules clearly:

- Keep the default Copilot working set around 800 tokens.
- Treat `.github/copilot-instructions.md` as the startup summary.
- Consult `.github/COMMON_MISTAKES.md`, `.github/QUICK_START.md`, and `.github/ARCHITECTURE_MAP.md` before non-trivial edits.
- Load topic files from `docs/learnings/` only when the current task needs them.
- Never place long session journals or completed tasks in `.github/copilot-instructions.md`.

## Framework Customization

Tailor the generated content to this project’s framework. Include real conventions for routing, testing, data access, build tools, and deployment where applicable.

## Validation

After creating the files, verify:

- all links and paths are correct
- `.github/copilot-instructions.md` is concise
- archives and session logs are excluded by `.copilotignore`
- the docs are split by topic instead of one large file
- the output is specific to this project rather than boilerplate

## Final Response Format

After creating the files, report:

1. Which files you created
2. The recommended default working set
3. The main deep-dive topic files
4. Any project-specific assumptions you made
- Never auto-load completions, sessions, or archives

---

## Example Session After Setup

```
User: [Starts new GitHub Copilot session]

Copilot: [Auto-loads only 4 files: ~800 tokens]
1. .github/copilot-instructions.md
2. .cpto/COMMON_MISTAKES.md
3. .cpto/QUICK_START.md
4. .cpto/ARCHITECTURE_MAP.md

Copilot: Ready! What would you like to work on?

User: Add a new API endpoint

Copilot: [Loads docs/learnings/api-design.md: ~500 tokens]
Total context: ~1,300 tokens (vs 8,000+ before)
```

---

## Getting Started

To use this setup:
1. Copy this entire prompt
2. Paste into GitHub Copilot in your new project
3. Provide project context when asked
4. Copilot will create all structure automatically
5. Review and customize as needed

---

**Last Updated**: 2025-11-10
**Source Project**: fb-msg-pipeline-hub (RedwoodJS)
