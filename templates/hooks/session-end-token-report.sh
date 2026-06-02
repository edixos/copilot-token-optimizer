#!/bin/bash
# session-end-token-report.sh
# EVENT: PostToolUse
# DESCRIPTION: Append session token estimate to .copilot/sessions/token-log.md
#
# Opt-in GitHub Copilot session-end hook.
# Appends a token usage estimate to .copilot/sessions/token-log.md
#
# INSTALL: Copy to .copilot/hooks/session-end-token-report.sh
# and ensure it is referenced in your GitHub Copilot settings.

LOG_FILE=".copilot/sessions/token-log.md"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

# Count tokens in auto-loadable files (word count × 1.3 as proxy)
WORD_COUNT=$(find . -maxdepth 3 \
  \( -name "*.md" -path "./.copilot/*.md" -o -path "./.github/copilot-instructions.md" \) \
  -not -path "./.copilot/completions/*" \
  -not -path "./.copilot/sessions/*" \
  2>/dev/null | xargs wc -w 2>/dev/null | tail -1 | awk '{print $1}')

APPROX_TOKENS=$(echo "$WORD_COUNT * 1.3 / 1" | bc 2>/dev/null || echo "?")

mkdir -p "$(dirname "$LOG_FILE")"

if [ ! -f "$LOG_FILE" ]; then
  echo "# Token Log" > "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  echo "| Date | Time | Est. Session Tokens |" >> "$LOG_FILE"
  echo "|------|------|---------------------|" >> "$LOG_FILE"
fi

echo "| $DATE | $TIME | ~${APPROX_TOKENS} |" >> "$LOG_FILE"
