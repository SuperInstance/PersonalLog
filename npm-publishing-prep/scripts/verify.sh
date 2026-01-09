#!/bin/bash
# Verify packages are on npm
# Usage: ./verify.sh
set -e

echo "🔍 Verifying packages on npm..."
echo ""

# Packages to verify
packages=(
  "@superinstance/webgpu-profiler"
  "@superinstance/vector-search"
  "@superinstance/jepa-sentiment"
  "@superinstance/examples"
)

found=0
not_found=0

for pkg in "${packages[@]}"; do
  echo "Checking $pkg..."
  echo "----------------------------"

  if npm view "$pkg" > /dev/null 2>&1; then
    echo "✓ Package found on npm"
    echo ""

    # Get package info
    name=$(npm view "$pkg" name)
    version=$(npm view "$pkg" version)
    description=$(npm view "$pkg" description)
    author=$(npm view "$pkg" author)
    license=$(npm view "$pkg" license)
    homepage=$(npm view "$pkg" homepage 2>/dev/null || echo "N/A")
    repository=$(npm view "$pkg" repository.url 2>/dev/null || echo "N/A")

    echo "  Name: $name"
    echo "  Version: $version"
    echo "  Description: ${description:0:100}..."
    echo "  Author: $author"
    echo "  License: $license"
    echo "  Homepage: $homepage"
    echo "  Repository: $repository"
    echo ""

    # Get latest versions
    echo "  Recent versions:"
    npm view "$pkg" versions | tail -n 5 | sed 's/^/    /'
    echo ""

    # Check downloads (last week)
    if command -v curl > /dev/null 2>&1; then
      downloads=$(curl -s "https://api.npmjs.org/downloads/point/last-week/$pkg" | grep -o '"downloads":[0-9]*' | cut -d: -f2)
      if [ -n "$downloads" ]; then
        echo "  Downloads (last week): $downloads"
      fi
    fi

    ((found++))
  else
    echo "✗ Package NOT found on npm"
    echo ""
    echo "  Possible reasons:"
    echo "    - Package not yet published"
    echo "    - Package name is different"
    echo "    - Network issues"
    echo ""
    echo "  Check manually:"
    echo "    https://www.npmjs.com/package/$pkg"
    ((not_found++))
  fi

  echo ""
  echo "========================================"
  echo ""
done

# Summary
echo "📊 SUMMARY"
echo "========================================"
echo "Packages found: $found / ${#packages[@]}"
echo "Packages not found: $not_found / ${#packages[@]}"
echo ""

if [ $found -eq ${#packages[@]} ]; then
  echo "✅ All packages verified on npm!"
  echo ""
  echo "View on npmjs.com:"
  for pkg in "${packages[@]}"; do
    echo "  https://www.npmjs.com/package/$pkg"
  done
  exit 0
else
  echo "⚠️  Some packages not found on npm"
  echo ""
  echo "Missing packages:"
  for pkg in "${packages[@]}"; do
    if ! npm view "$pkg" > /dev/null 2>&1; then
      echo "  - $pkg"
    fi
  done
  echo ""
  echo "Run: ./publish-all.sh"
  exit 1
fi
