#!/bin/bash
# pre-tool-token-guard.sh
# EVENT: preToolUse
# DESCRIPTION: Warn/block when auto-loaded files exceed token thresholds
#
# Native GitHub Copilot preToolUse hook: warns when auto-loaded files exceed
# token thresholds. Fires once per session (marker file prevents per-call overhead).
#
# Input: JSON on stdin with { toolName, toolArgs, cwd, ... }
# Output: JSON to stdout with { permissionDecision, permissionDecisionReason }
#   - Exit 0: allow (default)
#   - Exit 2: deny the tool call
#
# INSTALL: cpto hooks install pre-tool-token-guard
#
# CONFIGURE (optional env vars):
#   CPTO_WARN_TOKENS  — token count that triggers a warning  (default: 2000)
#   CPTO_BLOCK_TOKENS — token count that blocks the tool call (default: 8000)

MARKER=".cpto/sessions/.token-guard-checked"
WARN_TOKENS="${CPTO_WARN_TOKENS:-2000}"
BLOCK_TOKENS="${CPTO_BLOCK_TOKENS:-8000}"

# Consume stdin (required even if unused)
cat > /dev/null

# Only run once per session to avoid per-call latency
if [ -f "$MARKER" ]; then
  exit 0
fi

mkdir -p ".cpto/sessions"

# Estimate tokens from auto-loaded files (word count × 1.3)
WORD_COUNT=$(find . -maxdepth 3 \
  \( -name "*.md" -path "./.cpto/*.md" -o -path "./.github/copilot-instructions.md" -o -path "./docs/INDEX.md" \) \
  -not -path "./.cpto/completions/*" \
  -not -path "./.cpto/sessions/*" \
  2>/dev/null | xargs wc -w 2>/dev/null | tail -1 | awk '{print $1}')

# Mark checked so subsequent tool calls skip this
touch "$MARKER"

WORD_COUNT="${WORD_COUNT:-0}"
APPROX_TOKENS=$(echo "$WORD_COUNT * 13 / 10" | bc 2>/dev/null || echo "0")

if [ "$APPROX_TOKENS" -ge "$BLOCK_TOKENS" ] 2>/dev/null; then
  echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Token guard: ~${APPROX_TOKENS} tokens in auto-loaded files (limit: ${BLOCK_TOKENS}). Run: cpto measure\"}"
  exit 2
elif [ "$APPROX_TOKENS" -ge "$WARN_TOKENS" ] 2>/dev/null; then
  echo "⚠️  Token warning: ~${APPROX_TOKENS} tokens in auto-loaded files (target: <${WARN_TOKENS})" >&2
  echo "   Run: cpto measure  to see the breakdown" >&2
fi

exit 0
