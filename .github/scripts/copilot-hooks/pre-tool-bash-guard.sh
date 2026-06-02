#!/bin/bash
# pre-tool-bash-guard.sh
# EVENT: preToolUse
# MATCHER: bash
# DESCRIPTION: Block dangerous Bash patterns that fill context (find /, cat node_modules, etc.)
#
# Native GitHub Copilot preToolUse hook: intercepts bash tool calls and blocks or
# warns on commands likely to produce massive output and exhaust context.
#
# Input: JSON on stdin with { toolName: "bash", toolArgs: { command: "..." }, ... }
# Output: JSON to stdout for deny decisions
#   - Exit 0: allow
#   - Exit 2: deny the tool call
#
# Blocked (exit 2): find from /, cat node_modules, bare recursive grep with no path
# Warned (exit 0 + stderr): log file globs, glob cat, unscoped find without -maxdepth
#
# CONFIGURE:
#   CPTO_BASH_GUARD_DISABLE=1  — bypass all checks

if [ "${CPTO_BASH_GUARD_DISABLE:-0}" = "1" ]; then
  cat > /dev/null
  exit 0
fi

# Read stdin JSON to extract the command
CMD=$(cat | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    args = data.get('toolArgs', data.get('tool_input', {}))
    if isinstance(args, str):
        import json as j
        args = j.loads(args)
    print(args.get('command', ''))
except Exception:
    pass
" 2>/dev/null)

if [ -z "$CMD" ]; then
  exit 0
fi

# ── BLOCKED PATTERNS (exit 2) ────────────────────────────────────────────

if echo "$CMD" | grep -qE 'find\s+/(\s|$)'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"find / searches the full filesystem. Use: find . -maxdepth 3 instead."}'
  exit 2
fi

if echo "$CMD" | grep -qE 'cat\s+.*node_modules/'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Reading node_modules/ wastes context. Use: npm info <package> instead."}'
  exit 2
fi

# bare grep -r "pattern" with no path (pattern ends the command)
if echo "$CMD" | grep -qP '(?:^|\|)\s*grep\s+(?:-\w*[rR]\w*|-[^\s]*[rR])\s+"[^"]+"\s*$' 2>/dev/null; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"grep -r without a path scans the entire tree. Add a path: grep -r pattern src/"}'
  exit 2
fi

# ── WARNED PATTERNS (exit 0 + stderr) ────────────────────────────────────

if echo "$CMD" | grep -qE 'find\s+.*-name\s+['\''"]?\*\.log'; then
  echo "⚠️  Large output possible: log files can be very large." >&2
  echo "   Add | head -50  to cap output, or use: tail -100 <logfile>" >&2
fi

if echo "$CMD" | grep -qE '\bcat\s+\*\.'; then
  echo "⚠️  Large output possible: 'cat *.<ext>' may expand to many files." >&2
  echo "   Add | head -100  to cap output if you don't need everything." >&2
fi

# find . without -maxdepth
if echo "$CMD" | grep -qE '\bfind\s+\.' && ! echo "$CMD" | grep -q '\-maxdepth'; then
  echo "⚠️  Broad find: consider adding -maxdepth 3 to limit recursion depth." >&2
fi

exit 0
