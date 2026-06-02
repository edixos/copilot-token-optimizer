#!/bin/bash
# notification-token-display.sh
# EVENT: notification
# DESCRIPTION: Show auto-loaded token estimate once per session on first notification
#
# Native GitHub Copilot notification hook: appends a token budget summary to the
# first notification of each session. Subsequent notifications exit silently.
# Cached in .cpto/sessions/.notification-token-cache to avoid recomputing.
#
# Input: JSON on stdin with notification context
# Output: stderr informational message
#
# INSTALL: cpto hooks install notification-token-display

# Consume stdin
cat > /dev/null

CACHE_FILE=".cpto/sessions/.notification-token-cache"
SESSION_MARKER=".cpto/sessions/.notification-shown-$(date +%Y-%m-%d)"

# Already shown today — stay silent
if [ -f "$SESSION_MARKER" ]; then
  exit 0
fi

mkdir -p ".cpto/sessions"

# Compute token estimate if cache missing or stale (older than today)
if [ ! -f "$CACHE_FILE" ] || [ "$(find "$CACHE_FILE" -mtime +0 2>/dev/null)" ]; then
  WORD_COUNT=$(find . -maxdepth 3 \
    \( -name "*.md" -path "./.github/*.md" -o -path "./.github/copilot-instructions.md" -o -path "./docs/INDEX.md" \) \
    -not -path "./.cpto/completions/*" \
    -not -path "./.cpto/sessions/*" \
    2>/dev/null | xargs wc -w 2>/dev/null | tail -1 | awk '{print $1}')
  WORD_COUNT="${WORD_COUNT:-0}"
  APPROX_TOKENS=$(echo "$WORD_COUNT * 13 / 10" | bc 2>/dev/null || echo "0")
  echo "$APPROX_TOKENS" > "$CACHE_FILE"
else
  APPROX_TOKENS=$(cat "$CACHE_FILE")
fi

touch "$SESSION_MARKER"

# Format with thousands separator via awk
FORMATTED=$(echo "$APPROX_TOKENS" | awk '{
  n = $1; s = ""
  while (n > 999) { s = "," sprintf("%03d", n % 1000) s; n = int(n/1000) }
  print n s
}')

echo "📊 Session context: ~${FORMATTED} tokens in auto-loaded files" >&2

exit 0
