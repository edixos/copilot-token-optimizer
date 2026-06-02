#!/bin/bash

# DEPRECATED: Use the npm CLI instead:
#   npx copilot-token-optimizer init
# This bash script is kept for legacy compatibility but is no longer maintained.

# Copilot Token Optimizer - Project Initialization Script
# This script sets up the optimized documentation structure in your project

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo ""
echo -e "${YELLOW}⚠️  DEPRECATED: This bash script is no longer maintained.${NC}"
echo -e "${YELLOW}   Use the npm CLI instead: npx copilot-token-optimizer init${NC}"
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   Copilot Token Optimizer - Project Setup      ║"
echo "║   🚀 90% Token Savings in 5 Minutes           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if we're in a project directory
if [ ! -d ".git" ] && [ ! -f "package.json" ] && [ ! -f "requirements.txt" ] && [ ! -f "Gemfile" ]; then
    echo -e "${YELLOW}⚠️  Warning: This doesn't look like a project root directory${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Setup cancelled${NC}"
        exit 1
    fi
fi

# Collect project information
echo -e "${BLUE}📋 Project Information${NC}"
echo ""
read -p "Project Type (e.g., Express, Next.js, Django): " PROJECT_TYPE
read -p "Tech Stack (e.g., Express, PostgreSQL, Prisma): " TECH_STACK
read -p "Main Features (brief description): " MAIN_FEATURES
echo ""

# Create directory structure
echo -e "${GREEN}📁 Creating directory structure...${NC}"

mkdir -p .copilot/completions
mkdir -p .copilot/sessions/active
mkdir -p .copilot/sessions/archive
mkdir -p .copilot/templates
mkdir -p .github
mkdir -p docs/learnings
mkdir -p docs/archive

echo "   ✓ Created .copilot/ directories"
echo "   ✓ Created docs/ directories"

# Create .copilotignore
echo -e "${GREEN}📝 Creating .copilotignore...${NC}"

cat > .copilotignore << 'EOF'
# Task completion documents (load only when explicitly requested)
.copilot/completions/**

# Session files (load only when explicitly requested)
.copilot/sessions/**

# Archived documentation (load only when explicitly requested)
docs/archive/**

# Node modules and dependencies
node_modules/**
dist/**
build/**
.next/**

# Git
.git/**

# Environment
.env
.env.*
!.env.example

# Logs
*.log
logs/**

# IDE
.vscode/**
.idea/**

# OS
.DS_Store
EOF

echo "   ✓ Created .copilotignore"

# Create .github/copilot-instructions.md
echo -e "${GREEN}📝 Creating .github/copilot-instructions.md...${NC}"

cat > .github/copilot-instructions.md << EOF
# GitHub Copilot Instructions

**Keep this file lean. Route deeper context through the linked docs below.**

---

## Project Overview

${PROJECT_TYPE} application for ${MAIN_FEATURES}

**Tech Stack**: ${TECH_STACK}

---

## Session Start Protocol ⚡

Use this file as the startup summary for Copilot Chat. For non-trivial work, consult the three core references before editing:

\`\`\`bash
# High-signal docs (~800 tokens total)
✓ .copilot/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .copilot/QUICK_START.md          # Essential commands
✓ .copilot/ARCHITECTURE_MAP.md     # File locations
\`\`\`

**Load topic docs only when the task needs them:**
- Use \`docs/INDEX.md\` to find deep-dive notes in \`docs/learnings/\`
- Pull in only the topic files that match the current task

**At task completion:**
- Create completion doc in \`.copilot/completions/YYYY-MM-DD-task-name.md\`
- Use template: \`.copilot/templates/completion-template.md\`
- Move session file to \`.copilot/sessions/archive/\` (if created)
- Update docs as needed (see \`.copilot/DOCUMENTATION_MAINTENANCE.md\`)

**⚠️ NEVER auto-load:**
- Files in \`.copilot/completions/\` (0 token cost)
- Files in \`.copilot/sessions/\` (0 token cost)
- Files in \`docs/archive/\` (0 token cost)
- Only load when user explicitly requests

---

## Quick Start Commands

\`\`\`bash
# Add your common commands here
# npm run dev
# npm test
# npm run build
\`\`\`

**See**: \`.copilot/QUICK_START.md\` for complete command reference

---

## Documentation Navigation

**📋 Master Index**: \`docs/INDEX.md\` - Complete navigation with token costs

### Core References
- **Common Mistakes**: \`.copilot/COMMON_MISTAKES.md\` ⚠️ **MANDATORY**
- **Quick Start**: \`.copilot/QUICK_START.md\`
- **Architecture Map**: \`.copilot/ARCHITECTURE_MAP.md\`
- **Maintenance**: \`.copilot/DOCUMENTATION_MAINTENANCE.md\`

---

**Last Updated**: $(date +%Y-%m-%d)
**Optimized with**: [Copilot Token Optimizer](https://github.com/nadimtuhin/copilot-token-optimizer)
EOF

echo "   ✓ Created .github/copilot-instructions.md"

# Create placeholder files
echo -e "${GREEN}📝 Creating placeholder documentation files...${NC}"

cat > .copilot/COMMON_MISTAKES.md << 'EOF'
# Common Mistakes

**⚠️ CRITICAL - Read at session start (2 min saves 2 hours!)**

---

## Top 5 Critical Mistakes

### 1. [Add Your First Critical Mistake]

**Symptom**:
**Check**:
**Fix**:

### 2. [Add Second Mistake]

### 3. [Add Third Mistake]

### 4. [Add Fourth Mistake]

### 5. [Add Fifth Mistake]

---

**Update this file when:**
- Bug took >1 hour to debug
- Error could cause production issue
- Mistake repeated across sessions
- Pattern violates framework conventions

**Last Updated**: YYYY-MM-DD
EOF

cat > .copilot/QUICK_START.md << 'EOF'
# Quick Start Commands

**Essential commands for this project**

---

## Development

```bash
# Start development server
# Add your commands

# Run tests
# Add your commands

# Build for production
# Add your commands
```

## Database (if applicable)

```bash
# Migrations
# Seed data
```

## Common Workflows

1. **Starting work**:
2. **Running tests**:
3. **Deploying**:

---

**Last Updated**: YYYY-MM-DD
EOF

cat > .copilot/ARCHITECTURE_MAP.md << 'EOF'
# Architecture Map

**File locations and project structure**

---

## Directory Structure

```
project/
├── [Add your structure]
```

## Key File Locations

- **Configuration**:
- **Main entry**:
- **Tests**:

## Common Patterns

### Pattern 1
### Pattern 2

---

**Last Updated**: YYYY-MM-DD
EOF

cat > .copilot/LEARNINGS_INDEX.md << 'EOF'
# Learnings Index

**Lightweight index - detailed content in docs/ directory (read as needed)**

---

## Quick References (Always Available - ~800 tokens)

- **Common Mistakes**: `.copilot/COMMON_MISTAKES.md` ⚠️ **READ AT SESSION START**
- **Quick Start**: `.copilot/QUICK_START.md`
- **Architecture**: `.copilot/ARCHITECTURE_MAP.md`
- **Maintenance**: `.copilot/DOCUMENTATION_MAINTENANCE.md`

## Learning Topics (Load As Needed)

- `docs/learnings/[topic-1].md`
- `docs/learnings/[topic-2].md`

---

**Last Updated**: YYYY-MM-DD
EOF

echo "   ✓ Created .copilot/ documentation files"

# Copy templates if source repository is available
if [ -d "../copilot-token-optimizer/templates" ]; then
    echo -e "${GREEN}📝 Copying templates...${NC}"
    cp ../copilot-token-optimizer/templates/completion-template.md .copilot/templates/ 2>/dev/null || true
    cp ../copilot-token-optimizer/templates/maintenance-guide.md .copilot/DOCUMENTATION_MAINTENANCE.md 2>/dev/null || true
    echo "   ✓ Copied templates"
else
    echo -e "${YELLOW}⚠️  Templates not found - download from repository${NC}"
fi

# Create docs/INDEX.md
cat > docs/INDEX.md << 'EOF'
# Documentation Index

**Master navigation with token cost estimates**

---

## Session Start (Essential - ~800 tokens)

Load these files at every session start:
- `.github/copilot-instructions.md` (~450 tokens)
- `.copilot/COMMON_MISTAKES.md` (~350 tokens)
- `.copilot/QUICK_START.md` (~100 tokens)
- `.copilot/ARCHITECTURE_MAP.md` (~150 tokens)

## Task-Specific Topics (Load As Needed)

Add your topic files in `docs/learnings/` and list them here with token estimates.

---

**Last Updated**: YYYY-MM-DD
EOF

cat > docs/QUICK_REFERENCE.md << 'EOF'
# Quick Reference

**Fast lookups for common operations**

---

## Session Start Checklist

- [ ] Load COMMON_MISTAKES.md
- [ ] Load QUICK_START.md
- [ ] Load ARCHITECTURE_MAP.md
- [ ] Review current task

## Common Commands

Add your frequently used commands here.

---

**Last Updated**: YYYY-MM-DD
EOF

cat > docs/archive/README.md << 'EOF'
# Documentation Archive

This directory contains superseded documentation kept for historical reference.

## Archived Files

(Add archived files here with reason and date)

---

**Note**: These files are kept for reference only. Do not load them in active sessions.

**Last Updated**: YYYY-MM-DD
EOF

echo "   ✓ Created docs/ files"

# Create README for sessions
cat > .copilot/sessions/README.md << 'EOF'
# Session Files

Track work progress across sessions.

## Active Sessions

Current session files go in `active/` directory.

## Archive

Completed sessions move to `archive/` directory.

## Never Auto-Load

Session files cost 0 tokens (never auto-loaded via .copilotignore).
Available when explicitly requested.

---

**Last Updated**: YYYY-MM-DD
EOF

cat > .copilot/completions/README.md << 'EOF'
# Task Completion Documentation

Document completed tasks with zero token cost.

## Usage

Create completion docs as:
`.copilot/completions/YYYY-MM-DD-task-name.md`

Use template: `.copilot/templates/completion-template.md`

## Never Auto-Load

Completion docs cost 0 tokens (never auto-loaded via .copilotignore).
Available when explicitly requested.

---

**Last Updated**: YYYY-MM-DD
EOF

echo "   ✓ Created session and completion READMEs"

# Summary
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Created structure:"
echo "   ✓ .copilot/ directory with documentation"
echo "   ✓ docs/ directory with navigation"
echo "   ✓ .copilotignore for token optimization"
echo "   ✓ .github/copilot-instructions.md main guide"
echo ""
echo "📊 Token Optimization:"
echo "   • Session start: ~800 tokens (vs ~8,000 before)"
echo "   • Overall: ~1,300 tokens (vs ~11,000 before)"
echo "   • Savings: 88% reduction ⚡"
echo ""
echo "📝 Next Steps:"
echo ""
echo "   1. Customize .copilot/COMMON_MISTAKES.md"
echo "      Add your top 5 critical mistakes"
echo ""
echo "   2. Update .copilot/QUICK_START.md"
echo "      Add your common commands"
echo ""
echo "   3. Fill in .copilot/ARCHITECTURE_MAP.md"
echo "      Document your project structure"
echo ""
echo "   4. Create topic files in docs/learnings/"
echo "      Split knowledge by topic (~500 tokens each)"
echo ""
echo "   5. Start GitHub Copilot and verify:"
echo "      - Loads only 4 files at start (~800 tokens)"
echo "      - Historical files cost 0 tokens"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   https://github.com/nadimtuhin/copilot-token-optimizer"
echo ""
echo -e "${GREEN}🎉 Ready to save 90% on tokens!${NC}"
echo ""
