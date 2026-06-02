#!/bin/bash
# post-write-token-diff.sh
# EVENT: postToolUse
# MATCHER: (write_file|replace_string_in_file|create_file|edit_file)
# DESCRIPTION: Log token cost of each Write/Edit to .cpto/sessions/write-log.md
#
# Native GitHub Copilot postToolUse hook: logs token cost of each write operation.
# Appends to .cpto/sessions/write-log.md so you can see which files are
# growing your context window.
#
# Input: JSON on stdin with { toolName, toolArgs: { filePath: "..." }, result, ... }
# Output: informational only (stderr warnings)
#   - Exit 0: always (postToolUse cannot deny)
#
# INSTALL: cpto hooks install post-write-token-diff
#
# CONFIGURE (optional):
#   CPTO_WRITE_ADVISORY_TOKENS — cumulative threshold for advisory (default: 5000)

LOG_FILE=".cpto/sessions/write-log.md"
ADVISORY_THRESHOLD="${CPTO_WRITE_ADVISORY_TOKENS:-5000}"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

# Get file path and tool name from stdin JSON
INPUT=$(cat /dev/stdin 2>/dev/null)
PARSED=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tool = data.get('toolName', '')
    args = data.get('toolArgs', data.get('tool_input', {}))
    if isinstance(args, str):
        import json as j
        args = j.loads(args)
    path = args.get('filePath', args.get('file_path', ''))
    print(f'{tool}\t{path}')
except:
    print('\t')
" 2>/dev/null)

TOOL_NAME=$(echo "$PARSED" | cut -f1)
FILE_PATH=$(echo "$PARSED" | cut -f2)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Token estimate: word count × 1.3 (fast, no node startup)
WORD_COUNT=$(wc -w < "$FILE_PATH" 2>/dev/null || echo "0")
FILE_TOKENS=$(echo "$WORD_COUNT * 13 / 10" | bc 2>/dev/null || echo "0")

# Init log file if needed
mkdir -p "$(dirname "$LOG_FILE")"
if [ ! -f "$LOG_FILE" ]; then
  printf '# Write Token Log\n\n| Date | Time | Tool | File | Est. Tokens |\n|------|------|------|------|-------------|\n' > "$LOG_FILE"
fi

echo "| $DATE | $TIME | $TOOL_NAME | \`$FILE_PATH\` | ~${FILE_TOKENS} |" >> "$LOG_FILE"

# Cumulative advisory: sum the last column of the log
CUMULATIVE=$(awk -F'~' 'NR>2 && NF>1 {gsub(/ \|.*/,"",$NF); sum += $NF} END {print sum+0}' "$LOG_FILE" 2>/dev/null || echo "0")

if [ "$CUMULATIVE" -ge "$ADVISORY_THRESHOLD" ] 2>/dev/null; then
  echo "📝 Write log: ~${CUMULATIVE} tokens written this session (across $(grep -c '|' "$LOG_FILE" 2>/dev/null || echo "?") files)" >&2
  echo "   View full log: cat ${LOG_FILE}" >&2
fi

exit 0
