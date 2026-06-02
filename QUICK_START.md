# Quick Start Guide

Get a Copilot-friendly documentation layout in a few minutes.

---

## Fastest Path

```bash
npx copilot-token-optimizer init
```

Or install globally:

```bash
npm install -g copilot-token-optimizer
cpto init
```

## Measure First

If you want a baseline before changing anything:

```bash
cpto measure
```

This estimates the documentation footprint of the files most likely to end up in active Copilot context.

## What to Customize Immediately

After `init`, update these files first:

1. `.github/copilot-instructions.md`
2. `.copilot/COMMON_MISTAKES.md`
3. `.copilot/QUICK_START.md`
4. `.copilot/ARCHITECTURE_MAP.md`

## Recommended Working Set

Keep the default Copilot working set to these files:

- `.github/copilot-instructions.md`
- `.copilot/COMMON_MISTAKES.md`
- `.copilot/QUICK_START.md`
- `.copilot/ARCHITECTURE_MAP.md`

Then pull in topic docs from `docs/learnings/` only when the task needs them.

## Validate the Setup

```bash
cpto audit
```

This checks that:

- `.github/copilot-instructions.md` exists
- `.copilotignore` covers archives and session history
- core files exist
- token counts are still healthy

## Optional Helper Scripts

Install the optional helper scripts if you want token guards, write logging, or prompt-to-topic matching:

```bash
cpto hooks install --all
cpto hooks settings
```

The `settings` command prints a JSON manifest for wiring those scripts into VS Code tasks, shell wrappers, or CI.

## Manual Prompt-Based Setup

If you prefer to have Copilot create the structure from a chat prompt instead of the CLI:

1. Open `UNIVERSAL_SETUP.md`.
2. Paste it into Copilot Chat.
3. Fill in your project type, stack, and main features.
4. Ask Copilot to generate the files in-place.

## Next Steps

1. Add real commands to `.copilot/QUICK_START.md`.
2. Add real architectural landmarks to `.copilot/ARCHITECTURE_MAP.md`.
3. Add your top five repeat mistakes to `.copilot/COMMON_MISTAKES.md`.
4. Move long-form knowledge into `docs/learnings/`.
5. Run `cpto compress` and `cpto prune` whenever `.github/copilot-instructions.md` starts to sprawl.
