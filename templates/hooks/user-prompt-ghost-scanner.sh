#!/bin/bash
# user-prompt-ghost-scanner.sh
# EVENT: UserPromptSubmit
# DESCRIPTION: Detect .github/copilot-instructions.md sections never referenced in recent sessions and suggest pruning
#
# GitHub Copilot UserPromptSubmit hook: scans .copilot/sessions/token-log.md for session entries,
# extracts section headers from .github/copilot-instructions.md, and flags sections with zero references across
# the last 10+ sessions as "ghost tokens" worth pruning.
#
# stdout is injected as context Copilot sees. Output is silent when:
#   - token-log.md has fewer than 5 sessions
#   - all sections are referenced
#   - .github/copilot-instructions.md doesn't exist
#   - already ran today (daily marker)
#
# Override: CPTO_GHOST_SCAN_DISABLE=1

if [ "${CPTO_GHOST_SCAN_DISABLE:-0}" = "1" ]; then
  exit 0
fi

SESSION_MARKER=".copilot/sessions/.ghost-checked-$(date +%Y%m%d)"
TOKEN_LOG=".copilot/sessions/token-log.md"
COPILOT_MD=".github/copilot-instructions.md"

# Run once per day
if [ -f "$SESSION_MARKER" ]; then
  exit 0
fi

# Require both files to exist
if [ ! -f "$TOKEN_LOG" ] || [ ! -f "$COPILOT_MD" ]; then
  exit 0
fi

mkdir -p ".copilot/sessions"
touch "$SESSION_MARKER"

python3 - "$TOKEN_LOG" "$COPILOT_MD" << 'PYEOF'
import sys, re, os

log_path = sys.argv[1]
copilot_path = sys.argv[2]

# Count sessions in log (lines starting with ##)
log_content = open(log_path, encoding='utf-8', errors='ignore').read()
sessions = re.findall(r'^## ', log_content, re.MULTILINE)
if len(sessions) < 5:
    sys.exit(0)

# Extract section headers from .github/copilot-instructions.md (## and ###, skip H1)
copilot_content = open(copilot_path, encoding='utf-8', errors='ignore').read()
headers = re.findall(r'^#{2,3}\s+(.+)$', copilot_content, re.MULTILINE)
if not headers:
    sys.exit(0)

# Limit to last 10 sessions for ghost check
# Sessions are delimited by ## headers in log
session_blocks = re.split(r'^## .+$', log_content, flags=re.MULTILINE)
recent_blocks = session_blocks[-10:] if len(session_blocks) >= 10 else session_blocks
recent_log = '\n'.join(recent_blocks).lower()

ghosts = []
for header in headers:
    # Extract keywords from header (words > 3 chars)
    words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{4,}\b', header)]
    if not words:
        continue
    # Ghost if NONE of the keywords appear in recent sessions
    referenced = any(w in recent_log for w in words)
    if not referenced:
        ghosts.append(header)

if not ghosts:
    sys.exit(0)

ghost_limit = int(os.environ.get('CPTO_GHOST_MAX_REPORT', '5'))
shown = ghosts[:ghost_limit]
remaining = len(ghosts) - len(shown)

print(f'Note: {len(ghosts)} .github/copilot-instructions.md section(s) have not been referenced in recent sessions and may be safe to remove:')
for g in shown:
    print(f'- "{g}"')
if remaining > 0:
    print(f'... and {remaining} more')
print('Consider running: cpto prune  to remove stale sections')
PYEOF
