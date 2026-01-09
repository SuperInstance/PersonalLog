#!/bin/bash
# Script to push all Phase 1 packages to GitHub
# Make sure repositories are created on GitHub first!

echo "🚀 Pushing SuperInstance Phase 1 packages to GitHub..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to push a repository
push_repo() {
    local repo_path=$1
    local repo_name=$2

    echo -e "${YELLOW}Pushing $repo_name...${NC}"

    cd "$repo_path" || exit 1

    # Check if remote exists
    if git remote get-url origin > /dev/null 2>&1; then
        echo "Remote origin already exists"
        git remote -v
    else
        echo "Adding remote origin..."
        git remote add origin "https://github.com/SuperInstance/$repo_name.git"
    fi

    # Ensure main branch exists
    if ! git show-ref --verify --quiet refs/heads/main; then
        echo "Creating main branch..."
        git branch -M main
    fi

    # Push to GitHub
    echo "Pushing to GitHub..."
    git push -u origin main

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $repo_name pushed successfully!${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to push $repo_name${NC}"
        echo "Make sure the repository exists on GitHub first!"
    fi

    echo ""
    cd - > /dev/null
}

# Push all repositories
push_repo "/mnt/c/users/casey/personallog/packages/browser-gpu-profiler" "webgpu-profiler"
push_repo "/mnt/c/users/casey/personallog/packages/in-browser-vector-search" "vector-search"
push_repo "/mnt/c/users/casey/personallog/packages/jepa-real-time-sentiment-analysis" "jepa-sentiment"
push_repo "/mnt/c/users/casey/personallog/packages/integration-examples" "examples"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  All repositories pushed to GitHub! 🎉                     ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  Next steps:                                               ║${NC}"
echo -e "${GREEN}║  1. Verify repositories at github.com/SuperInstance        ║${NC}"
echo -e "${GREEN}║  2. Add badges to READMEs                                  ║${NC}"
echo -e "${GREEN}║  3. Publish to npm                                         ║${NC}"
echo -e "${GREEN}║  4. Announce to community                                  ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
