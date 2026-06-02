<div align="center">

# 🚀 Copilot Token Optimizer

**Keep GitHub Copilot focused on the task in front of it**

Cut your Copilot working-context footprint by up to 90% by keeping the always-on instructions lean and routing deep documentation only when it is relevant.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/edixos/copilot-token-optimizer?style=social)](https://github.com/edixos/copilot-token-optimizer/stargazers)
[![npm version](https://img.shields.io/npm/v/copilot-token-optimizer.svg)](https://www.npmjs.com/package/@edixos/copilot-token-optimizer)
[![npm downloads](https://img.shields.io/npm/dm/copilot-token-optimizer.svg)](https://www.npmjs.com/package/@edixos/copilot-token-optimizer)

</div>

---

## The Problem

Teams often let `.github/copilot-instructions.md` grow into a dump of architecture notes, completed tasks, debugging journals, and one-off decisions. Even when Copilot can technically search the workspace on demand, bloated instruction files and sprawling reference docs still create noisy context, weaker answers, and less room for the code that matters now.

In one real project, the documentation footprint had drifted to **11,000 tokens** before any new task-specific context was added.

## The Solution

`copilot-token-optimizer` keeps the working set small and intentional:

- One lean `.github/copilot-instructions.md` file for always-on guidance
- Three high-signal core references in `.copilot/`
- Topic files in `docs/learnings/` that you pull in only when a task needs them
- Historical material archived out of the default path

Typical result: **11,000 → 1,300 tokens** for the docs you keep in active Copilot context. That is roughly a **90% reduction**.

Token estimates use a GPT-family tokenizer so the numbers track modern Copilot models much more closely than Claude-specific tooling.

## Quick Setup

**Option A — no install:**

```bash
npx copilot-token-optimizer init
```

**Option B — one-line install with global `cpto`:**

```bash
curl -fsSL https://raw.githubusercontent.com/edixos/copilot-token-optimizer/main/install.sh | bash
cpto init
```

**Option C — npm global:**

```bash
npm install -g @edixos/copilot-token-optimizer
cpto init
```

Measure first if you want a before/after estimate:

```bash
npx copilot-token-optimizer measure
# or
cpto measure
```

### What It Creates

```
your-project/
├── .github/
│   └── copilot-instructions.md   # Always-on project instructions
├── .copilotignore                # Excludes archives and low-signal docs
├── .copilot/
│   ├── COMMON_MISTAKES.md        # Critical failure modes
│   ├── QUICK_START.md            # Commands and daily workflows
│   ├── ARCHITECTURE_MAP.md       # File and feature map
│   ├── completions/              # Completed task notes
│   ├── sessions/                 # Session logs and snapshots
│   └── templates/                # Reusable doc templates
└── docs/
    ├── INDEX.md                  # Navigation + token guidance
    ├── learnings/                # Deep-dive topics, loaded on demand
    └── archive/                  # Historical docs, never in default context
```

## How It Works

The optimizer is built around one rule: keep the default Copilot context small, and make everything else easy to discover.

**Recommended working set:**

```text
.github/copilot-instructions.md   ~450 tokens
.copilot/COMMON_MISTAKES.md       ~350 tokens
.copilot/QUICK_START.md           ~100 tokens
.copilot/ARCHITECTURE_MAP.md      ~150 tokens
---------------------------------------------
Default working set               ~800 tokens
```

**Then load only the topic docs you need:**

- API work: `docs/learnings/api-design.md`
- Testing work: `docs/learnings/testing-patterns.md`
- Performance work: `docs/learnings/performance.md`

That usually keeps a real task around **1,300 tokens** instead of dragging the entire documentation history into every Copilot chat.

## Framework-Aware Setup

`cpto init` auto-detects these frameworks from repo metadata and applies the right ignore patterns:

- `express`
- `nextjs`
- `vue`
- `nuxtjs`
- `angular`
- `django`
- `rails`
- `nestjs`
- `laravel`
- `fastapi`
- `go`
- `spring-boot`
- `svelte`

Override detection when needed:

```bash
cpto init --framework nextjs
cpto init --framework django
cpto init --framework go
```

Framework-specific setup prompts live in [examples/README.md](examples/README.md).

## Workflow After Setup

1. Keep `.github/copilot-instructions.md` short. It should explain where deeper knowledge lives, not duplicate it.
2. Put recurring mistakes in `.copilot/COMMON_MISTAKES.md`.
3. Put commands and daily workflows in `.copilot/QUICK_START.md`.
4. Put file layout and architectural landmarks in `.copilot/ARCHITECTURE_MAP.md`.
5. Move durable topic knowledge into `docs/learnings/`.
6. Archive finished work into `.copilot/completions/`, `.copilot/sessions/archive/`, and `docs/archive/`.

## CLI Reference

| Command | Description |
|---------|-------------|
| `cpto init` | Create the Copilot-optimized documentation structure |
| `cpto measure` | Estimate the current documentation context footprint |
| `cpto audit` | Validate structure, token health, and ignore coverage |
| `cpto compress` | Deterministically reduce `.github/copilot-instructions.md` size |
| `cpto prune` | Remove stale sections from `.github/copilot-instructions.md` |
| `cpto diff` | Compare a file against its `.bak` token backup |
| `cpto watch` | Live token dashboard for the core working set |
| `cpto hooks` | Install and manage helper-script templates |
| `cpto update` | Update the CLI or refresh project content |

### Ongoing Maintenance

```bash
cpto audit
cpto compress
cpto prune
cpto diff
```

### CI Example

```bash
cpto audit --json
```

Without a global install:

```bash
npx copilot-token-optimizer audit --json
```

## Helper Scripts

GitHub Copilot does **not** expose a native CLI hook settings file. Instead, `cpto hooks` installs optional helper scripts into `.copilot/hooks/` and prints a JSON manifest you can wire into VS Code tasks, shell wrappers, or CI.

### Available Templates

```
templates/hooks/
├── pre-tool-token-guard.sh
├── pre-tool-read-guard.sh
├── pre-tool-bash-guard.sh
├── post-write-token-diff.sh
├── session-end-token-report.sh
├── user-prompt-inject-context.sh
├── user-prompt-inject-snapshot.sh
├── user-prompt-validate-copilot-instructions.sh
├── user-prompt-ghost-scanner.sh
├── stop-session-snapshot.sh
├── stop-path-guard.sh
└── notification-token-display.sh
```

### Install Them

```bash
cpto hooks install --all
cpto hooks settings
```

The `settings` command prints a machine-readable manifest of installed scripts and the `bash .copilot/hooks/...` command to run for each event group.

### Useful Helper Scripts

- `pre-tool-token-guard.sh` warns when the measured working set gets too large.
- `user-prompt-inject-context.sh` matches user prompts to files in `docs/learnings/` and prints a lightweight context payload you can pipe into wrappers.
- `post-write-token-diff.sh` records write sizes in `.copilot/sessions/write-log.md`.

## FAQ

**Is `cpto init` safe on an existing repo?**

Yes. If `.github/copilot-instructions.md` already exists, `cpto init` appends only missing optimizer sections unless you pass `--force`.

**Does this only work with Copilot?**

The structure is generic markdown and shell scripts, but the generated instruction file and tokenizer defaults are tuned for GitHub Copilot workflows.

**Why `.github/copilot-instructions.md` instead of `COPILOT.md`?**

Because `.github/copilot-instructions.md` matches GitHub Copilot’s standard instruction-file convention.

**What if my project already has too much documentation?**

Run `cpto measure`, move long-lived knowledge into `docs/learnings/`, archive historical material, then use `cpto compress` and `cpto prune` to keep the main instruction file tight.

## Contributing

Framework additions, docs improvements, CLI fixes, and helper-script improvements are all welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Need Help?

- Bug: [open an issue](https://github.com/edixos/copilot-token-optimizer/issues)
- Discussion: [start a discussion](https://github.com/edixos/copilot-token-optimizer/discussions)

## License

MIT
