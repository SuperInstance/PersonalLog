#!/bin/bash
# Tag and push release to git
# Usage: ./tag-release.sh <version>
# Example: ./tag-release.sh 1.0.0
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Version number required"
  echo ""
  echo "Usage: ./tag-release.sh <version>"
  echo "Example: ./tag-release.sh 1.0.0"
  echo ""
  echo "This will:"
  echo "  1. Update package.json version in all packages"
  echo "  2. Commit the version changes"
  echo "  3. Create git tags for each package"
  echo "  4. Push tags to remote"
  exit 1
fi

# Validate version format (semver)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "❌ Error: Invalid version format"
  echo ""
  echo "Version must follow semantic versioning: X.Y.Z or X.Y.Z-PRERELEASE"
  echo "  X = Major version (breaking changes)"
  echo "  Y = Minor version (new features, backwards compatible)"
  echo "  Z = Patch version (bug fixes, backwards compatible)"
  echo ""
  echo "Examples:"
  echo "  1.0.0    - First stable release"
  echo "  1.1.0    - New features"
  echo "  1.1.1    - Bug fix"
  echo "  2.0.0    - Breaking changes"
  echo "  1.0.0-beta.1  - Pre-release version"
  exit 1
fi

echo "🏷️  Tagging version $VERSION for all packages..."
echo ""

# Package directories
packages=(
  "browser-gpu-profiler|@superinstance/webgpu-profiler"
  "in-browser-vector-search|@superinstance/vector-search"
  "jepa-real-time-sentiment-analysis|@superinstance/jepa-sentiment"
  "integration-examples|@superinstance/examples"
)

# Check git status
echo "🔍 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: Working directory has uncommitted changes"
  echo ""
  git status --short
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
  fi
fi

# Update versions in package.json files
echo ""
echo "📝 Updating package.json versions..."
for package_info in "${packages[@]}"; do
  IFS='|' read -r dir name <<< "$package_info"
  package_path="/mnt/c/users/casey/personallog/packages/$dir"

  if [ -f "$package_path/package.json" ]; then
    echo "  Updating $name..."
    # Use npm version to update package.json
    cd "$package_path"
    npm version "$VERSION" --no-git-tag-version > /dev/null
    cd - > /dev/null
  fi
done

# Commit the version changes
echo ""
echo "💾 Committing version updates..."
git add packages/*/package.json
git commit -m "chore: bump version to $VERSION

- Update all packages to version $VERSION
- Prepare for npm release

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>" || echo "No new commits (version already at $VERSION)"

# Create tags for each package
echo ""
echo "🏷️  Creating git tags..."
for package_info in "${packages[@]}"; do
  IFS='|' read -r dir name <<< "$package_info"

  # Check if tag already exists
  if git rev-parse "$name@$VERSION" >/dev/null 2>&1; then
    echo "  ⚠️  Tag $name@$VERSION already exists, skipping..."
  else
    echo "  Tagging $name@$VERSION..."
    git tag -a "$name@$VERSION" -m "Release $name $VERSION"
  fi
done

# Also create a general tag
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "  ⚠️  Tag v$VERSION already exists, skipping..."
else
  echo "  Tagging v$VERSION..."
  git tag -a "v$VERSION" -m "Release version $VERSION"
fi

# Push to remote
echo ""
echo "📤 Pushing to remote..."
read -p "Push tags and commits to remote? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "  Pushing commits..."
  git push origin main

  echo "  Pushing tags..."
  for package_info in "${packages[@]}"; do
    IFS='|' read -r dir name <<< "$package_info"
    echo "    Pushing $name@$VERSION..."
    git push origin "$name@$VERSION"
  done
  git push origin "v$VERSION"

  echo ""
  echo "✅ All tags pushed successfully!"
else
  echo ""
  echo "⚠️  Tags created locally but not pushed."
  echo "To push manually:"
  echo "  git push origin main"
  for package_info in "${packages[@]}"; do
    IFS='|' read -r dir name <<< "$package_info"
    echo "  git push origin $name@$VERSION"
  done
  echo "  git push origin v$VERSION"
fi

echo ""
echo "========================================"
echo "✅ Release tagging complete!"
echo "========================================"
echo ""
echo "Tags created:"
echo "  v$VERSION (general release)"
for package_info in "${packages[@]}"; do
  IFS='|' read -r dir name <<< "$package_info"
  echo "  $name@$VERSION"
done
echo ""
echo "Next steps:"
echo "  1. Verify tags: git tag -l"
echo "  2. Push to npm: ./publish-all.sh"
echo "  3. Verify on npm: ./verify.sh"
echo "  4. Create GitHub releases"
echo ""
