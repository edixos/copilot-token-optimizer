#!/bin/bash
# user-prompt-validate-copilot-instructions.sh
# EVENT: UserPromptSubmit
# DESCRIPTION: Validate .github/copilot-instructions.md structure once per session, inject warnings
#
# GitHub Copilot UserPromptSubmit hook: validates .github/copilot-instructions.md structure once per
# session. Issues are injected via stdout (Copilot sees them) and printed to
# stderr (user sees them). Clean .github/copilot-instructions.md produces no output.
#
# INSTALL: cpto hooks install user-prompt-validate-copilot-instructions
# Or manually: copy to .github/hooks/user-prompt-validate-copilot-instructions.sh
#
# CONFIGURE (optional env vars):
#   CPTO_COPILOT_MD_PATH       — path to .github/copilot-instructions.md (default: .github/copilot-instructions.md)
#   CPTO_TOKEN_WARN_THRESHOLD — token count warning threshold (default: 600)

MARKER=".github/sessions/.copilot-instructions-validated-$(date +%Y-%m-%d)"
COPILOT_MD="${CPTO_COPILOT_MD_PATH:-.github/copilot-instructions.md}"
TOKEN_THRESHOLD="${CPTO_TOKEN_WARN_THRESHOLD:-600}"

# Only run once per day
if [ -f "$MARKER" ]; then
  exit 0
fi

mkdir -p ".github/sessions"
touch "$MARKER"

# .github/copilot-instructions.md missing — silent, not an error (project may not use cpto)
if [ ! -f "$COPILOT_MD" ]; then
  exit 0
fi

# Run all checks via Python for clean logic
ISSUES=$(python3 - "$COPILOT_MD" "$TOKEN_THRESHOLD" <<'PYEOF'
import sys, re

copilot_md = sys.argv[1]
threshold = int(sys.argv[2])
content = open(copilot_md).read()
lines = content.splitlines()
issues = []

# Check 1: Token count estimate (word count * 1.3)
word_count = len(content.split())
approx_tokens = int(word_count * 1.3)
if approx_tokens > threshold:
    issues.append(f'Token count: ~{approx_tokens} tokens (target: <{threshold}). Run: npx cpto compress')

# Check 2: Completed tasks section embedded
completed_headers = [
    l for l in lines
    if re.match(r'^#{1,3}\s+(completed|done|finished|✓|✅)', l, re.I)
]
if completed_headers:
    for h in completed_headers:
        lineno = lines.index(h) + 1
        issues.append(f'Completed tasks in .github/copilot-instructions.md (line {lineno}: "{h.strip()}"). Move to .github/completions/')

# Check 3: Session notes embedded (date headers like ## 2026-05-20)
date_headers = [
    (i+1, l) for i, l in enumerate(lines)
    if re.match(r'^#{1,3}\s+\d{4}-\d{2}-\d{2}', l)
]
if date_headers:
    for lineno, h in date_headers:
        issues.append(f'Session note embedded (line {lineno}: "{h.strip()}"). Move to .github/sessions/archive/')

# Check 4: Large inline content that should be @ imports
# Flag if any section is >200 words (suggests copy-pasted content)
section_starts = [i for i, l in enumerate(lines) if re.match(r'^#{1,3} ', l)]
section_starts.append(len(lines))
for idx in range(len(section_starts) - 1):
    start = section_starts[idx]
    end = section_starts[idx + 1]
    section_content = '\n'.join(lines[start+1:end])
    section_words = len(section_content.split())
    if section_words > 200:
        header = lines[start].strip()
        issues.append(f'Large section "{header}" ({section_words} words). Consider splitting to docs/ and using @ import.')

if issues:
    print(f'.github/copilot-instructions.md check: {len(issues)} issue(s) found')
    for issue in issues:
        print(f'  - {issue}')
    print('Run: cpto audit  for full report')
PYEOF
)

if [ -n "$ISSUES" ]; then
  # stdout → injected into Copilot's context
  echo "Note: $ISSUES"
  # stderr → visible to user in terminal
  echo "⚡ $ISSUES" >&2
fi

exit 0
