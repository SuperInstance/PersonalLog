#!/bin/bash

# =============================================================================
# Spreader & Cascade Router - GitHub Release Script
# =============================================================================
#
# This script initializes git repositories and pushes both packages to GitHub.
# Make sure you have:
# 1. Created the repositories on GitHub
# 2. Have push access to both repositories
# 3. Have your SSH keys configured (or use HTTPS with token)
#
# Usage:
#   chmod +x scripts/push-to-github.sh
#   ./scripts/push-to-github.sh
#
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Package directories
SPREADER_DIR="packages/spreader-tool"
CASCADE_DIR="packages/cascade-router"

# Repository URLs
SPREADER_REPO="https://github.com/SuperInstance/Spreader-tool.git"
CASCADE_REPO="https://github.com/SuperInstance/CascadeRouter.git"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Spreader & Cascade Router - GitHub Release Preparation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# =============================================================================
# Pre-flight Checks
# =============================================================================

echo -e "${YELLOW}[1/6] Running pre-flight checks...${NC}"

# Check if directories exist
if [ ! -d "$SPREADER_DIR" ]; then
  echo -e "${RED}✗ Spreader directory not found: $SPREADER_DIR${NC}"
  exit 1
fi

if [ ! -d "$CASCADE_DIR" ]; then
  echo -e "${RED}✗ Cascade Router directory not found: $CASCADE_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All directories exist${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ git is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ git is installed${NC}"
echo ""

# =============================================================================
# Prepare Spreader Repository
# =============================================================================

echo -e "${YELLOW}[2/6] Preparing Spreader repository...${NC}"

cd "$SPREADER_DIR"

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
  git branch -M main
else
  echo "Git repository already initialized"
fi

# Add all files
echo "Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo -e "${YELLOW}No changes to commit in Spreader${NC}"
else
  # Commit changes
  echo "Creating initial commit..."
  git commit -m "Initial release: Spreader v1.0.0

Features:
- Parallel multi-agent research
- Full context architecture
- Ralph Wiggum summarization
- 3+ LLM provider support
- Beautiful CLI interface
- Comprehensive documentation

This release makes Spreader available as a completely independent,
open-source tool for parallel AI-driven information gathering.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

  echo -e "${GREEN}✓ Spreader committed${NC}"
fi

cd ../..
echo ""

# =============================================================================
# Prepare Cascade Router Repository
# =============================================================================

echo -e "${YELLOW}[3/6] Preparing Cascade Router repository...${NC}"

cd "$CASCADE_DIR"

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
  git branch -M main
else
  echo "Git repository already initialized"
fi

# Add all files
echo "Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo -e "${YELLOW}No changes to commit in Cascade Router${NC}"
else
  # Commit changes
  echo "Creating initial commit..."
  git commit -m "Initial release: Cascade Router v1.0.0

Features:
- 6 intelligent routing strategies
- Token budget management
- Rate limiting
- Progress monitoring
- 3+ LLM provider support
- Cost optimization
- Comprehensive documentation

This release makes Cascade Router available as a completely independent,
open-source tool for intelligent LLM routing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

  echo -e "${GREEN}✓ Cascade Router committed${NC}"
fi

cd ../..
echo ""

# =============================================================================
# Add Remote Repositories
# =============================================================================

echo -e "${YELLOW}[4/6] Adding remote repositories...${NC}"

cd "$SPREADER_DIR"
if git remote get-url origin &> /dev/null; then
  echo "Remote 'origin' already exists for Spreader"
  git remote set-url origin "$SPREADER_REPO"
else
  git remote add origin "$SPREADER_REPO"
fi
echo -e "${GREEN}✓ Spreader remote configured: $SPREADER_REPO${NC}"
cd ../..

cd "$CASCADE_DIR"
if git remote get-url origin &> /dev/null; then
  echo "Remote 'origin' already exists for Cascade Router"
  git remote set-url origin "$CASCADE_REPO"
else
  git remote add origin "$CASCADE_REPO"
fi
echo -e "${GREEN}✓ Cascade Router remote configured: $CASCADE_REPO${NC}"
cd ../..
echo ""

# =============================================================================
# Push to GitHub
# =============================================================================

echo -e "${YELLOW}[5/6] Pushing to GitHub...${NC}"
echo ""
echo -e "${RED}WARNING: This will push both repositories to GitHub.${NC}"
echo -e "${YELLOW}Make sure you have created the repositories on GitHub first:${NC}"
echo ""
echo "  1. https://github.com/new - Create 'Spreader-tool'"
echo "  2. https://github.com/new - Create 'CascadeRouter'"
echo ""
read -p "Ready to push? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Push cancelled. You can push manually later:${NC}"
  echo ""
  echo "  cd $SPREADER_DIR && git push -u origin main"
  echo "  cd $CASCADE_DIR && git push -u origin main"
  exit 0
fi

# Push Spreader
echo "Pushing Spreader to GitHub..."
cd "$SPREADER_DIR"
if git push -u origin main; then
  echo -e "${GREEN}✓ Spreader pushed successfully${NC}"
else
  echo -e "${RED}✗ Failed to push Spreader${NC}"
  exit 1
fi
cd ../..

# Push Cascade Router
echo "Pushing Cascade Router to GitHub..."
cd "$CASCADE_DIR"
if git push -u origin main; then
  echo -e "${GREEN}✓ Cascade Router pushed successfully${NC}"
else
  echo -e "${RED}✗ Failed to push Cascade Router${NC}"
  exit 1
fi
cd ../..
echo ""

# =============================================================================
# Success!
# =============================================================================

echo -e "${YELLOW}[6/6] Release complete!${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Both tools successfully pushed to GitHub!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Repository URLs:"
echo ""
echo -e "${BLUE}  Spreader:${NC}      https://github.com/SuperInstance/Spreader-tool"
echo -e "${BLUE}  Cascade Router:${NC} https://github.com/SuperInstance/CascadeRouter"
echo ""
echo "Next Steps:"
echo ""
echo "  1. Verify repositories on GitHub"
echo "  2. Create initial release (v1.0.0) with release notes"
echo "  3. Set up npm tokens for automated publishing"
echo "  4. Enable GitHub Actions for CI/CD"
echo "  5. Announce the release!"
echo ""
echo -e "${YELLOW}Quick Links:${NC}"
echo ""
echo "  - Spreader Issues:      https://github.com/SuperInstance/Spreader-tool/issues"
echo "  - Cascade Issues:       https://github.com/SuperInstance/CascadeRouter/issues"
echo "  - Spreader Releases:    https://github.com/SuperInstance/Spreader-tool/releases"
echo "  - Cascade Releases:     https://github.com/SuperInstance/CascadeRouter/releases"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
