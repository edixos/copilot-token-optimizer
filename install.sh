#!/bin/bash
# Copilot Token Optimizer — one-line global installer
# Usage: curl -fsSL https://raw.githubusercontent.com/edixos/copilot-token-optimizer/main/install.sh | bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}$*${NC}"; }
ok()    { echo -e "${GREEN}✓ $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $*${NC}"; }
die()   { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }

echo ""
echo "  Copilot Token Optimizer — installer"
echo ""

# Check node
if ! command -v node &>/dev/null; then
  die "Node.js not found. Install from https://nodejs.org (v20+) and re-run."
fi

NODE_MAJOR=$(node -e 'process.stdout.write(String(process.versions.node.split(".")[0]))')
if [ "$NODE_MAJOR" -lt 20 ]; then
  die "Node.js v${NODE_MAJOR} found — v20+ required. Update at https://nodejs.org."
fi

# Check npm
if ! command -v npm &>/dev/null; then
  die "npm not found. Install Node.js from https://nodejs.org."
fi

info "Installing copilot-token-optimizer globally..."
npm install -g @edixos/copilot-token-optimizer </dev/null

echo ""
ok "Installed! Run:"
echo "   cpto init          # set up your project"
echo "   cpto --help        # all commands"
echo ""
