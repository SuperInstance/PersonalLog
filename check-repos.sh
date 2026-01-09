#!/bin/bash
# Quick verification script - checks if repos exist on GitHub

echo "🔍 Checking if GitHub repositories exist..."
echo ""

check_repo() {
    local repo_name=$1
    local url="https://github.com/SuperInstance/$repo_name"

    echo -n "Checking $repo_name... "

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "\033[0;32m✅ EXISTS\033[0m"
        return 0
    else
        echo -e "\033[1;33m⚠️  NOT FOUND\033[0m"
        echo "   → Create at: https://github.com/new"
        return 1
    fi
}

# Check all 4 repositories
check_repo "webgpu-profiler"
check_repo "vector-search"
check_repo "jepa-sentiment"
check_repo "examples"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count how many exist
exist_count=0
check_repo "webgpu-profiler" && ((exist_count++)) || true
check_repo "vector-search" && ((exist_count++)) || true
check_repo "jepa-sentiment" && ((exist_count++)) || true
check_repo "examples" && ((exist_count++)) || true

if [ $exist_count -eq 4 ]; then
    echo -e "\033[0;32m✅ All repositories found! Ready to push.\033[0m"
    echo ""
    echo "Run: cd /mnt/c/users/casey/personallog && ./push-to-github.sh"
else
    echo -e "\033[1;33m⚠️  $exist_count/4 repositories found.\033[0m"
    echo ""
    echo "Create missing repositories at: https://github.com/new"
    echo ""
    echo "Repository names:"
    echo "  1. webgpu-profiler"
    echo "  2. vector-search"
    echo "  3. jepa-sentiment"
    echo "  4. examples"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
