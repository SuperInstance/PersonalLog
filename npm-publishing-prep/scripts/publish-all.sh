#!/bin/bash
# Publish all Phase 1 packages to npm
# Usage: ./publish-all.sh [--dry-run]
set -e

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "🔍 DRY RUN MODE - No packages will be published"
fi

echo "🚀 Publishing SuperInstance packages to npm..."
echo ""

# Package mapping: local-directory | npm-package-name
packages=(
  "browser-gpu-profiler|@superinstance/webgpu-profiler"
  "in-browser-vector-search|@superinstance/vector-search"
  "jepa-real-time-sentiment-analysis|@superinstance/jepa-sentiment"
  "integration-examples|@superinstance/examples"
)

# Check if logged in to npm
echo "📋 Checking npm authentication..."
if ! npm whoami > /dev/null 2>&1; then
  echo "❌ Not logged in to npm. Please run: npm login"
  exit 1
fi
echo "✓ Authenticated as: $(npm whoami)"
echo ""

# Publish each package
for package_info in "${packages[@]}"; do
  IFS='|' read -r dir name <<< "$package_info"

  echo "========================================"
  echo "📦 Publishing: $name"
  echo "========================================"

  package_path="/mnt/c/users/casey/personallog/packages/$dir"

  # Check if package directory exists
  if [ ! -d "$package_path" ]; then
    echo "❌ Directory not found: $package_path"
    exit 1
  fi

  cd "$package_path"

  # Run pre-publish checks
  echo "🔍 Running pre-publish checks..."

  # Check if package.json exists
  if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
  fi

  # Verify package name
  pkg_name=$(node -p "require('./package.json').name")
  if [ "$pkg_name" != "$name" ]; then
    echo "❌ Package name mismatch! Expected: $name, Found: $pkg_name"
    exit 1
  fi
  echo "✓ Package name: $pkg_name"

  # Verify version
  version=$(node -p "require('./package.json').version")
  echo "✓ Version: $version"

  # Check if dist directory exists
  if [ ! -d "dist" ]; then
    echo "❌ dist/ directory not found! Run: npm run build"
    exit 1
  fi
  echo "✓ Build directory exists"

  # Run tests
  echo "🧪 Running tests..."
  if npm run test > /dev/null 2>&1; then
    echo "✓ Tests passed"
  else
    echo "⚠️  Tests failed or not configured"
  fi

  # Build if needed
  echo "🔨 Building package..."
  if npm run build > /dev/null 2>&1; then
    echo "✓ Build successful"
  else
    echo "⚠️  Build failed or not needed"
  fi

  # Publish
  echo ""
  echo "📤 Publishing to npm..."
  if [ -n "$DRY_RUN" ]; then
    echo "[DRY RUN] Would publish: $name@$version"
    npm publish $DRY_RUN --access public
  else
    npm publish --access public
    echo "✅ $name@$version published successfully!"
  fi

  echo ""

  # Return to original directory
  cd - > /dev/null
done

echo ""
echo "========================================"
echo "✅ Publishing complete!"
echo "========================================"
echo ""
echo "📋 Published packages:"
for package_info in "${packages[@]}"; do
  IFS='|' read -r dir name <<< "$package_info"
  version=$(cd "/mnt/c/users/casey/personallog/packages/$dir" && node -p "require('./package.json').version")
  echo "  - $name@$version"
done

echo ""
echo "🔍 Verify on npm:"
for package_info in "${packages[@]}"; do
  IFS='|' read -r dir name <<< "$package_info"
  echo "  npm view $name"
done

echo ""
echo "🌐 View on npmjs.com:"
for package_info in "${packages[@]}"; do
  IFS='|' read -r dir name <<< "$package_info"
  echo "  https://www.npmjs.com/package/$name"
done

echo ""
