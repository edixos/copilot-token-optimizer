# Quick Start Guide

Get a Copilot-friendly documentation layout in a few minutes.

---

## Fastest Path

```bash
npx copilot-token-optimizer init
```

Or install globally:

```bash
npm install -g @edixos/copilot-token-optimizer
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

If you want prompt compression for a wrapper-based setup, `user-prompt-optimize.sh` is included as an opt-in template. It stays inactive until you set `CPTO_PROMPT_OPTIMIZER_ENABLED=1`, and by default it emits plain text rather than JSON.

It discovers skill candidates from local manifests and workspace signals, so it can adapt to different project types without a hard-coded skill list. Its logs stay compact in:

- `.copilot-runtime/prompt-optimizer.ndjson`
- `.copilot-runtime/prompt-optimizer-daily.ndjson`
- `.copilot-runtime/prompt-optimizer-daily.md`

If you want the credit estimate to match a specific Copilot model, set `CPTO_PROMPT_OPTIMIZER_CREDIT_MODEL` before enabling the hook. The pricing is model-accurate, while the token count is still estimated from the prompt text unless your wrapper supplies usage data.

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
