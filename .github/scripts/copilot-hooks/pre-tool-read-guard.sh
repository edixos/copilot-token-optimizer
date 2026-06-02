#!/bin/bash
# pre-tool-read-guard.sh
# EVENT: preToolUse
# MATCHER: read_file
# DESCRIPTION: Block reads of lock files, minified JS, binaries, and oversized files
#
# Native GitHub Copilot preToolUse hook: blocks or warns when Copilot tries to read
# files that are too large or obviously wasteful (lock files, minified JS, binaries).
#
# Input: JSON on stdin with { toolName, toolArgs: { file_path: "..." }, ... }
# Output: JSON to stdout for deny decisions
#   - Exit 0: allow
#   - Exit 2: deny the tool call
#
# INSTALL: cpto hooks install pre-tool-read-guard
#
# CONFIGURE (optional env vars):
#   CPTO_READ_MAX_BYTES      — block threshold in bytes (default: 51200 = 50KB)
#   CPTO_READ_WARN_BYTES     — warn threshold in bytes  (default: 10240 = 10KB)
#   CPTO_READ_GUARD_DISABLE  — set to 1 to bypass all guards

# Bypass switch
if [ "${CPTO_READ_GUARD_DISABLE:-0}" = "1" ]; then
  cat > /dev/null
  exit 0
fi

READ_MAX_BYTES="${CPTO_READ_MAX_BYTES:-51200}"
READ_WARN_BYTES="${CPTO_READ_WARN_BYTES:-10240}"

# Extract file_path from stdin JSON
FILE_PATH=$(cat | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    args = data.get('toolArgs', data.get('tool_input', {}))
    if isinstance(args, str):
        import json as j
        args = j.loads(args)
    print(args.get('file_path', args.get('filePath', '')))
except:
    pass
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# --- Extension-based block rules (fast, no disk access) ---
BASENAME=$(basename "$FILE_PATH")
EXT="${BASENAME##*.}"

case "$BASENAME" in
  package-lock.json|yarn.lock|pnpm-lock.yaml|Cargo.lock|poetry.lock|Gemfile.lock|composer.lock)
    echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"'$FILE_PATH' is a lock file (~10,000-50,000 tokens). Use: cat package.json for dependency info\"}"
    exit 2
    ;;
esac

case "$EXT" in
  min.js|min.css)
    echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"'$FILE_PATH' is a minified file. Read the source file instead.\"}"
    exit 2
    ;;
  snap)
    echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"'$FILE_PATH' is a test snapshot. Read the test source instead.\"}"
    exit 2
    ;;
  pb.go|pb)
    echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"'$FILE_PATH' is a protobuf-generated file. Read the .proto source instead.\"}"
    exit 2
    ;;
  pyc|pyo|class|o|a|so|dylib|dll|exe|wasm)
    echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"'$FILE_PATH' is a compiled binary file.\"}"
    exit 2
    ;;
esac

# --- Size-based rules (requires file to exist) ---
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

FILE_BYTES=$(wc -c < "$FILE_PATH" 2>/dev/null || echo "0")

if [ "$FILE_BYTES" -ge "$READ_MAX_BYTES" ] 2>/dev/null; then
  FILE_KB=$((FILE_BYTES / 1024))
  APPROX_TOKENS=$((FILE_BYTES / 4))
  echo "{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"'$FILE_PATH' is ${FILE_KB}KB (~${APPROX_TOKENS} tokens, limit: $((READ_MAX_BYTES / 1024))KB). Use head -100 or read with offset/limit.\"}"
  exit 2
elif [ "$FILE_BYTES" -ge "$READ_WARN_BYTES" ] 2>/dev/null; then
  FILE_KB=$((FILE_BYTES / 1024))
  APPROX_TOKENS=$((FILE_BYTES / 4))
  echo "⚠️  Large file: '$FILE_PATH' is ${FILE_KB}KB (~${APPROX_TOKENS} tokens). Reading..." >&2
  echo "   Consider: Read with offset/limit to read only the relevant section." >&2
fi

exit 0
