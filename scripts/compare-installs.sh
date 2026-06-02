#!/usr/bin/env bash
# compare-installs.sh
# Installs old (init.sh from main) and new (cpto npm CLI) in separate tmp dirs,
# runs the same operations, and shows a side-by-side comparison.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
OLD_DIR=$(mktemp -d)
NEW_DIR=$(mktemp -d)

PASS=0
FAIL=0

ok()   { echo "  ✓ $*"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $*"; FAIL=$((FAIL+1)); }
section() { echo ""; echo "── $* ──────────────────────────────────────"; }

cleanup() { rm -rf "$OLD_DIR" "$NEW_DIR"; }
trap cleanup EXIT

# ── Build new tarball ──────────────────────────────────────────────────────────
section "Building packages"
cd "$REPO_ROOT"
NEW_TARBALL="$REPO_ROOT/$(npm pack --quiet 2>/dev/null | tail -1)"
echo "  new tarball: $(basename "$NEW_TARBALL")"

# ── Old code: init.sh from main ────────────────────────────────────────────────
section "OLD — init.sh (main branch)"
git show main:init.sh > "$OLD_DIR/init.sh"
chmod +x "$OLD_DIR/init.sh"
cd "$OLD_DIR"
touch package.json  # satisfy project-root check in init.sh

# Feed interactive prompts non-interactively
printf "Express API\nExpress, PostgreSQL\nREST API\n" | bash init.sh > "$OLD_DIR/output.txt" 2>&1 || true
cat "$OLD_DIR/output.txt" | grep -E "✓|✅|⚠️|Error|Saving|token|Token" | head -20

OLD_FILES=$(find "$OLD_DIR" -not -name "init.sh" -not -name "package.json" \
  -not -name "output.txt" -type f | sed "s|$OLD_DIR/||" | sort)

echo ""
echo "  Files created:"
echo "$OLD_FILES" | sed 's/^/    /'

# ── New code: cpto CLI ──────────────────────────────────────────────────────────
section "NEW — cpto CLI (this branch)"
cd "$NEW_DIR"
npm install "$NEW_TARBALL" --quiet 2>/dev/null
CTO="$NEW_DIR/node_modules/.bin/cpto"

"$CTO" init --framework express --yes 2>&1 | grep -E "✓|✅|⚠️|Error|Complete|Token"

NEW_FILES=$(find "$NEW_DIR" -not -path "*/node_modules/*" -not -name "package*" \
  -not -name "*.lock" -type f | sed "s|$NEW_DIR/||" | sort)

echo ""
echo "  Files created:"
echo "$NEW_FILES" | sed 's/^/    /'

# ── measure output (new only — old has no measure command) ─────────────────────
section "NEW — cpto measure"
"$CTO" measure

# ── Assertions ────────────────────────────────────────────────────────────────
section "Assertions"

echo ""
echo "  OLD (init.sh):"
for f in .github/copilot-instructions.md .copilotignore .copilot/COMMON_MISTAKES.md .copilot/QUICK_START.md; do
  if echo "$OLD_FILES" | grep -q "^$f$"; then
    ok "$f created"
  else
    fail "$f missing"
  fi
done

echo ""
echo "  NEW (cpto):"
for f in .github/copilot-instructions.md .copilotignore .copilot/COMMON_MISTAKES.md .copilot/QUICK_START.md \
         .copilot/ARCHITECTURE_MAP.md docs/INDEX.md; do
  if echo "$NEW_FILES" | grep -q "^$f$"; then
    ok "$f created"
  else
    fail "$f missing"
  fi
done

# Guard: init without --force should warn
cd "$NEW_DIR"
GUARD_OUT=$("$CTO" init --framework express --yes 2>&1 || true)
if echo "$GUARD_OUT" | grep -q "already exists"; then
  ok "--force guard triggers on second init"
else
  fail "--force guard did not trigger"
fi

# --force should overwrite
FORCE_OUT=$("$CTO" init --framework express --yes --force 2>&1 || true)
if echo "$FORCE_OUT" | grep -q "Setup Complete"; then
  ok "--force overwrites cleanly"
else
  fail "--force overwrite failed"
fi

# measure after init should reach "Already optimized"
MEASURE_OUT=$("$CTO" measure 2>&1)
if echo "$MEASURE_OUT" | grep -q "Already optimized"; then
  ok "measure shows 'Already optimized' after init"
else
  fail "measure did not show 'Already optimized'"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
section "Summary"
echo ""
echo "  OLD files : $(echo "$OLD_FILES" | grep -c .)"
echo "  NEW files : $(echo "$NEW_FILES" | grep -c .)"
echo ""
echo "  OLD has measure command : no (bash script only)"
echo "  NEW has measure command : yes (real tokenization)"
echo "  NEW has --force guard   : yes"
echo "  NEW has --framework flag: yes (13 frameworks)"
echo "  NEW has CI + Dependabot : yes"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "  ALL $PASS assertions passed ✓"
else
  echo "  $PASS passed, $FAIL FAILED ✗"
  exit 1
fi
