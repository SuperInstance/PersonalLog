#!/bin/bash
# Dry run - Check if packages are ready to publish
# Usage: ./dry-run.sh
set -e

echo "🔍 Checking if packages are ready to publish..."
echo ""

# Package directories
packages=(
  "browser-gpu-profiler"
  "in-browser-vector-search"
  "jepa-real-time-sentiment-analysis"
  "integration-examples"
)

errors=0
warnings=0

# Check each package
for dir in "${packages[@]}"; do
  echo "========================================"
  echo "📦 Checking: $dir"
  echo "========================================"

  package_path="/mnt/c/users/casey/personallog/packages/$dir"

  # Check if directory exists
  if [ ! -d "$package_path" ]; then
    echo "❌ Directory not found: $package_path"
    ((errors++))
    continue
  fi

  cd "$package_path"

  # Check package.json
  if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    ((errors++))
    cd - > /dev/null
    continue
  fi
  echo "✓ package.json exists"

  # Extract package info
  pkg_name=$(node -p "require('./package.json').name" 2>/dev/null || echo "N/A")
  pkg_version=$(node -p "require('./package.json').version" 2>/dev/null || echo "N/A")
  pkg_description=$(node -p "require('./package.json').description" 2>/dev/null || echo "N/A")

  echo "  Name: $pkg_name"
  echo "  Version: $pkg_version"

  # Check description length
  if [ "$pkg_description" != "N/A" ]; then
    desc_length=${#pkg_description}
    echo "  Description: $desc_length characters"
    if [ $desc_length -lt 100 ]; then
      echo "  ⚠️  Description is short (< 100 chars)"
      ((warnings++))
    else
      echo "  ✓ Description length is good"
    fi
  else
    echo "  ❌ Description missing!"
    ((errors++))
  fi

  # Check for required fields
  echo ""
  echo "📋 Checking required fields..."

  # License
  if [ "$(node -p "require('./package.json').license" 2>/dev/null)" != "null" ]; then
    echo "  ✓ License field exists"
  else
    echo "  ❌ License field missing!"
    ((errors++))
  fi

  # Repository
  if [ "$(node -p "require('./package.json').repository" 2>/dev/null)" != "null" ]; then
    echo "  ✓ Repository field exists"
  else
    echo "  ❌ Repository field missing!"
    ((errors++))
  fi

  # Main entry point
  if [ "$(node -p "require('./package.json').main" 2>/dev/null)" != "null" ]; then
    echo "  ✓ Main entry point exists"
  else
    echo "  ❌ Main entry point missing!"
    ((errors++))
  fi

  # Types entry point
  if [ "$(node -p "require('./package.json').types" 2>/dev/null)" != "null" ]; then
    echo "  ✓ Types entry point exists"
  else
    echo "  ⚠️  Types entry point missing (TypeScript users will have issues)"
    ((warnings++))
  fi

  # Keywords
  keywords_count=$(node -p "require('./package.json').keywords.length" 2>/dev/null || echo "0")
  echo "  Keywords: $keywords_count"
  if [ $keywords_count -lt 5 ]; then
    echo "  ⚠️  Few keywords (< 5), add more for SEO"
    ((warnings++))
  else
    echo "  ✓ Good keyword count"
  fi

  # Check dist directory
  echo ""
  echo "🔍 Checking build output..."

  if [ -d "dist" ]; then
    echo "  ✓ dist/ directory exists"

    # Check for index files
    if [ -f "dist/index.js" ]; then
      echo "  ✓ dist/index.js exists"
    else
      echo "  ❌ dist/index.js not found!"
      ((errors++))
    fi

    if [ -f "dist/index.d.ts" ]; then
      echo "  ✓ dist/index.d.ts exists"
    else
      echo "  ⚠️  dist/index.d.ts not found (TypeScript definitions missing)"
      ((warnings++))
    fi

    # Check dist size
    if command -v du > /dev/null 2>&1; then
      dist_size=$(du -sh dist 2>/dev/null | cut -f1)
      echo "  Dist size: $dist_size"
    fi
  else
    echo "  ❌ dist/ directory not found! Run: npm run build"
    ((errors++))
  fi

  # Check README
  echo ""
  echo "📖 Checking documentation..."

  if [ -f "README.md" ]; then
    echo "  ✓ README.md exists"

    # Check for installation instructions
    if grep -q "npm install" README.md 2>/dev/null; then
      echo "  ✓ Installation instructions present"
    else
      echo "  ⚠️  Installation instructions not found"
      ((warnings++))
    fi

    # Check for examples
    if grep -q "example\|Example\|EXAMPLE" README.md 2>/dev/null; then
      echo "  ✓ Examples present"
    else
      echo "  ⚠️  No examples found in README"
      ((warnings++))
    fi
  else
    echo "  ❌ README.md not found!"
    ((errors++))
  fi

  # Check LICENSE
  if [ -f "LICENSE" ] || [ -f "LICENSE.md" ]; then
    echo "  ✓ LICENSE file exists"
  else
    echo "  ⚠️  LICENSE file not found (recommended)"
    ((warnings++))
  fi

  # Check .npmignore
  if [ -f ".npmignore" ]; then
    echo "  ✓ .npmignore exists"
  else
    echo "  ⚠️  .npmignore not found (will use default ignores)"
    ((warnings++))
  fi

  # Try to build
  echo ""
  echo "🔨 Testing build..."

  if npm run build > /dev/null 2>&1; then
    echo "  ✓ Build successful"
  else
    echo "  ⚠️  Build failed or not configured"
    ((warnings++))
  fi

  # Try to test
  echo ""
  echo "🧪 Testing tests..."

  if npm run test > /dev/null 2>&1; then
    echo "  ✓ Tests pass"
  else
    echo "  ⚠️  Tests failed or not configured"
    ((warnings++))
  fi

  # Try dry run publish
  echo ""
  echo "📤 Testing publish (dry run)..."

  if npm publish --dry-run > /dev/null 2>&1; then
    echo "  ✓ Dry run successful"
  else
    echo "  ❌ Dry run failed! Check package configuration"
    ((errors++))
  fi

  echo ""
  cd - > /dev/null
done

# Summary
echo "========================================"
echo "📊 SUMMARY"
echo "========================================"
echo ""
echo "Errors: $errors"
echo "Warnings: $warnings"
echo ""

if [ $errors -gt 0 ]; then
  echo "❌ Package is NOT ready to publish!"
  echo ""
  echo "Please fix the errors above before publishing."
  exit 1
elif [ $warnings -gt 0 ]; then
  echo "⚠️  Package is mostly ready, but has warnings"
  echo ""
  echo "Recommended: Fix warnings before publishing for best results."
  echo "You can publish anyway, but review warnings first."
  exit 0
else
  echo "✅ All checks passed! Ready to publish!"
  echo ""
  echo "Run: ./publish-all.sh"
  exit 0
fi
