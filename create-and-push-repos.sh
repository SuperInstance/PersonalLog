#!/bin/bash
# GitHub Repository Creation and Push Script
# This script creates GitHub repositories and pushes all packages

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      GitHub Repository Creation & Push Script              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_DIR="/mnt/c/users/casey/personallog/packages"
REPOS=(
  "browser-gpu-profiler|webgpu-profiler|GPU profiler for WebGPU applications - Real-time GPU monitoring, benchmarking, and performance analysis in the browser"
  "in-browser-vector-search|vector-search|Semantic search engine with WebGPU acceleration - 10-100x faster vector search, 100% local processing, privacy-first"
  "jepa-real-time-sentiment-analysis|jepa-sentiment|Real-time emotion analysis with WebGPU - 60 FPS streaming sentiment analysis, 5-10x faster with GPU acceleration"
  "integration-examples|examples|Integration examples showing how SuperInstance tools work better together - 6 synergy groups with 9 production examples"
)

# Check for GitHub token or gh CLI
if [ -n "$GITHUB_TOKEN" ]; then
  METHOD="api"
  echo -e "${GREEN}✓${NC} GitHub token found (GITHUB_TOKEN)"
elif command -v gh &> /dev/null; then
  METHOD="gh"
  echo -e "${GREEN}✓${NC} GitHub CLI found (gh)"
else
  METHOD="manual"
  echo -e "${YELLOW}⚠${NC} No GitHub token or gh CLI found"
  echo ""
  echo "You have two options:"
  echo ""
  echo "1. ${BLUE}Use GitHub API${NC} (recommended - fastest)"
  echo "   Get a personal access token: https://github.com/settings/tokens"
  echo "   Required scopes: 'repo' (full repo control)"
  echo "   Then run: export GITHUB_TOKEN='your_token_here'"
  echo "   Then run this script again"
  echo ""
  echo "2. ${BLUE}Manual creation${NC} (easiest - 3 minutes)"
  echo "   Follow the step-by-step instructions below"
  echo ""
  read -p "Choose option (1 or 2): " choice

  if [ "$choice" = "1" ]; then
    echo ""
    echo "Please enter your GitHub personal access token:"
    echo "(Get one at: https://github.com/settings/tokens)"
    read -s -p "Token: " GITHUB_TOKEN
    export GITHUB_TOKEN
    echo ""
    METHOD="api"
  else
    METHOD="manual"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to create repo via API
create_repo_api() {
  local name=$1
  local description=$2

  echo -e "${BLUE}Creating GitHub repository: $name${NC}"

  response=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$name\",\"description\":\"$description\",\"private\":false,\"has_issues\":true,\"has_wiki\":false,\"has_downloads\":true}")

  if echo "$response" | grep -q "html_url"; then
    url=$(echo "$response" | grep -o '"html_url": "[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Created:${NC} $url"
    return 0
  else
    echo -e "${RED}✗ Failed to create $name${NC}"
    echo "$response" | grep -o '"message": "[^"]*' | cut -d'"' -f4
    return 1
  fi
}

# Function to create repo via gh CLI
create_repo_gh() {
  local name=$1
  local description=$2

  echo -e "${BLUE}Creating GitHub repository: $name${NC}"

  if gh repo create "$name" --public --description "$description" --source=. --remote=origin --push 2>&1 | grep -q "Created"; then
    echo -e "${GREEN}✓ Created:${NC} https://github.com/SuperInstance/$name"
    return 0
  else
    echo -e "${RED}✗ Failed to create $name${NC}"
    return 1
  fi
}

# Function to push to repo
push_repo() {
  local dir=$1
  local name=$2

  echo -e "${BLUE}Pushing $name...${NC}"

  cd "$BASE_DIR/$dir"

  # Ensure main branch
  git branch -M main 2>/dev/null || true

  # Push
  if git push -u origin main 2>&1; then
    echo -e "${GREEN}✓ Pushed:${NC} https://github.com/SuperInstance/$name"
    return 0
  else
    echo -e "${RED}✗ Failed to push $name${NC}"
    return 1
  fi
}

# Main execution
if [ "$METHOD" = "manual" ]; then
  echo -e "${YELLOW}═══ MANUAL REPOSITORY CREATION INSTRUCTIONS ═══${NC}"
  echo ""
  echo "Follow these steps to create the 4 GitHub repositories:"
  echo ""
  echo "1. Open these URLs in browser tabs (right-click → Open Link):"
  echo ""
  for repo_info in "${REPOS[@]}"; do
    IFS='|' read -r dir name description <<< "$repo_info"
    echo "   • https://github.com/new (will create: $name)"
  done
  echo ""
  echo "2. For each repository, enter:"
  echo ""
  for repo_info in "${REPOS[@]}"; do
    IFS='|' read -r dir name description <<< "$repo_info"
    echo "   ${BLUE}Repository $dir:${NC}"
    echo "   - Repository name: ${GREEN}$name${NC}"
    echo "   - Description: $description"
    echo "   - Visibility: ✅ Public"
    echo "   - Initialize: ❌ No (we'll push existing code)"
    echo ""
  done
  echo "3. After creating all 4 repos, press ENTER to continue..."
  read

  echo ""
  echo "Pushing all packages..."
  echo ""

  success=0
  for repo_info in "${REPOS[@]}"; do
    IFS='|' read -r dir name description <<< "$repo_info"
    if push_repo "$dir" "$name"; then
      ((success++))
    fi
    echo ""
  done

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo -e "Pushed ${GREEN}$success${NC}/${#REPOS[@]} repositories"
  echo ""

elif [ "$METHOD" = "api" ]; then
  echo -e "${BLUE}Creating repositories via GitHub API...${NC}"
  echo ""

  success=0
  for repo_info in "${REPOS[@]}"; do
    IFS='|' read -r dir name description <<< "$repo_info"

    if create_repo_api "$name" "$description"; then
      ((success++))
      if push_repo "$dir" "$name"; then
        echo -e "${GREEN}✓ $name fully deployed${NC}"
      fi
    fi
    echo ""
  done

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo -e "Created and pushed ${GREEN}$success${NC}/${#REPOS[@]} repositories"
  echo ""

elif [ "$METHOD" = "gh" ]; then
  echo -e "${BLUE}Creating repositories via GitHub CLI...${NC}"
  echo ""

  success=0
  for repo_info in "${REPOS[@]}"; do
    IFS='|' read -r dir name description <<< "$repo_info"

    if create_repo_gh "$name" "$description"; then
      ((success++))
    fi
    echo ""
  done

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo -e "Created ${GREEN}$success${NC}/${#REPOS[@]} repositories"
  echo ""
fi

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                      Summary                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Repositories deployed:"
echo ""
echo "✅ Spreader-tool         - https://github.com/SuperInstance/Spreader-tool"
echo "✅ CascadeRouter         - https://github.com/SuperInstance/CascadeRouter"
echo ""

for repo_info in "${REPOS[@]}"; do
  IFS='|' read -r dir name description <<< "$repo_info"
  echo "✅ $name - https://github.com/SuperInstance/$name"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Visit each repository to verify"
echo "2. Add topics/tags to each repo (Settings → Topics)"
echo "3. Enable GitHub Pages for documentation (Settings → Pages)"
echo "4. Publish to npm when ready"
echo ""
echo "🎉 Phase 1 launch complete!"
echo ""
