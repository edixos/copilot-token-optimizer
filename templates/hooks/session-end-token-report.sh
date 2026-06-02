#!/bin/bash
# session-end-token-report.sh
# EVENT: sessionEnd
# DESCRIPTION: Append session token estimate to .cpto/sessions/token-log.md
#
# Native GitHub Copilot sessionEnd hook.
# Appends a token usage estimate to .cpto/sessions/token-log.md
#
# Input: JSON on stdin with session context
# Output: informational only
#
# INSTALL: cpto hooks install session-end-token-report

# Consume stdin
cat > /dev/null

LOG_FILE=".cpto/sessions/token-log.md"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

# Count tokens in auto-loadable files (word count × 1.3 as proxy)
WORD_COUNT=$(find . -maxdepth 3 \
  \( -name "*.md" -path "./.github/*.md" -o -path "./.github/copilot-instructions.md" \) \
  -not -path "./.cpto/completions/*" \
  -not -path "./.cpto/sessions/*" \
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
