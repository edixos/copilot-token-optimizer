# Templates

Reusable templates for documentation maintenance and task tracking.

---

## Available Templates

### [completion-template.md](completion-template.md)

**Purpose**: Document completed tasks

**Use when**: Every task completion

**Includes**:
- Task summary
- Files created/modified/deleted
- Features implemented
- Bugs fixed
- Testing performed
- Commits
- Notes for future

**Token cost**: 0 (never auto-loaded via .copilotignore)

---

### [maintenance-guide.md](maintenance-guide.md)

**Purpose**: Guide Copilot on documentation maintenance

**Use when**: Setting up new project

**Includes**:
- When to update COMMON_MISTAKES.md
- When to create completion docs
- When to archive documentation
- When to update learnings
- Decision trees and examples

**Token cost**: ~400 tokens (load when maintaining docs)

---

## Hook Templates

### [hooks/user-prompt-optimize.sh](hooks/user-prompt-optimize.sh)

**Purpose**: Optional prompt compressor for wrapper-based Copilot setups

**Use when**: You want prompt normalization and lightweight skill routing, and you are comfortable calling an external model

**Includes**:
- Prompt compression rules
- Dynamic skill discovery from local manifests and workspace signals
- Compact JSONL decision logging
- Daily aggregate credit reporting
- Plain-text or JSON output modes

**Token cost**: 0 when not installed, external API usage when enabled

**Default state**: Off. Install it only if you want the extra step, then enable it with `CPTO_PROMPT_OPTIMIZER_ENABLED=1`.

**Pricing note**: the AI-credit estimate follows the published Copilot model pricing table, but token counts are still estimated from the prompt text unless your wrapper provides exact usage data.

---

## Usage

### Completion Template

1. **At task completion**: Copilot creates `.github/completions/YYYY-MM-DD-task-name.md`
2. **Uses template**: Fills in all sections with task details
3. **Zero tokens**: Never auto-loaded (via .copilotignore)
4. **Available**: Explicitly request to review past work

**Example**:
```
.github/completions/2025-11-10-add-authentication.md
.github/completions/2025-11-11-fix-login-bug.md
.github/completions/2025-11-12-optimize-queries.md
```

### Skills

Skills are plugin-like automation templates that extend GitHub Copilot's capabilities.

**Install via CLI:**
```bash
# Interactive (prompts for scope: local project or global)
cpto skills install init-cpto

# Install all available skills
cpto skills install --all

# Non-interactive: install to .github/skills/ directly
cpto skills install --all --scope local

# Non-interactive: install globally to ~/.agents/skills/
cpto skills install --all --scope global
```

**Trigger in Copilot Chat:**
```
@init-cpto
```

> The `@init-cpto` skill reads your project, selects the right doc templates, and fills every placeholder with real project-specific content.

**Skill install scopes:**
| Scope | Path | Availability |
|---|---|---|
| Local | `.github/skills/` | This project only |
| Global | `~/.agents/skills/` | All projects on this machine |

### Maintenance Guide

1. **At project setup**: Copy to `.github/DOCUMENTATION_MAINTENANCE.md`
2. **Reference in .github/copilot-instructions.md**: Link from session start protocol
3. **Load as needed**: When updating docs or making structural changes

### Prompt Optimizer Hook

1. Install it with `cpto hooks install user-prompt-optimize`
2. Keep it disabled by default
3. Enable it only in the environments that should use the external API
4. Point `CPTO_PROMPT_OPTIMIZER_SKILLS_FILE` or `CPTO_PROMPT_OPTIMIZER_SKILLS_DIRS` at local skill manifests when you want custom routing hints
5. Set `CPTO_PROMPT_OPTIMIZER_CREDIT_MODEL` when you want the AI-credit estimate to reflect a different Copilot model
6. Set `CPTO_PROMPT_OPTIMIZER_OUTPUT_FORMAT=json` only when a wrapper expects structured output

---

## Customization

### Completion Template

Customize sections based on your needs:
- Add deployment checklist
- Add review checklist
- Add security checklist
- Add performance metrics

### Maintenance Guide

Customize criteria based on your project:
- Adjust "critical bug" threshold (>1 hour)
- Add project-specific archive rules
- Add team-specific patterns

---

## Token Optimization

**Completion docs system**:
- ✅ Zero tokens (never auto-loaded)
- ✅ 100% knowledge preserved
- ✅ Available on explicit request
- ✅ Scales infinitely (add unlimited docs at 0 token cost)

**Maintenance guide**:
- ✅ ~400 tokens (only when needed)
- ✅ Loaded when maintaining docs
- ✅ Not part of essential session start
- ✅ Ensures consistent doc updates

---

**Last Updated**: 2025-11-11
