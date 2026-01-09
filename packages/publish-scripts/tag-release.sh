#!/bin/bash

###############################################################################
# Tag and Push Releases for Published Packages
#
# Creates git tags and GitHub releases for all published packages
# Should be run AFTER successful npm publish
#
# Usage:
#   ./tag-release.sh                  # Tag all packages
#   ./tag-release.sh browser-gpu-profiler  # Tag specific package
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base directory
BASE_DIR="/mnt/c/users/casey/personallog/packages"

# Get package to tag (or all)
TARGET_PKG="$1"

###############################################################################
# Functions
###############################################################################

print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

create_tag() {
  local pkg_dir=$1
  local pkg_name=$(basename "$pkg_dir")

  print_header "Tagging Package: $pkg_name"

  cd "$pkg_dir"

  # Get version from package.json
  local version=$(npm pkg get version | tr -d '"')
  local tag="v${version}"

  # Check if tag already exists
  if git rev-parse "$tag" >/dev/null 2>&1; then
    print_warning "Tag $tag already exists"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  # Create annotated tag
  print_info "Creating tag: $tag"
  if git tag -a "$tag" -m "Release $pkg_name $version

Changes:
- Published version $version to npm
- See CHANGELOG.md for details"; then
    print_success "Tag created: $tag"
  else
    print_error "Failed to create tag"
    cd "$BASE_DIR/publish-scripts"
    return 1
  fi

  # Push tag to origin
  print_info "Pushing tag to origin..."
  if git push origin "$tag"; then
    print_success "Tag pushed: $tag"
  else
    print_error "Failed to push tag"
    cd "$BASE_DIR/publish-scripts"
    return 1
  fi

  cd "$BASE_DIR/publish-scripts"
  return 0
}

create_github_release() {
  local pkg_dir=$1
  local pkg_name=$(basename "$pkg_dir")

  print_header "Creating GitHub Release: $pkg_name"

  cd "$pkg_dir"

  # Get version from package.json
  local version=$(npm pkg get version | tr -d '"')
  local tag="v${version}"

  # Check if gh CLI is available
  if ! command -v gh &> /dev/null; then
    print_warning "gh CLI not found. Skipping GitHub release creation."
    print_info "Install gh CLI: https://cli.github.com/"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  # Check if authenticated
  if ! gh auth status >/dev/null 2>&1; then
    print_warning "Not authenticated with gh CLI. Skipping GitHub release creation."
    print_info "Authenticate with: gh auth login"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  # Read CHANGELOG if exists
  local notes=""
  if [ -f "CHANGELOG.md" ]; then
    # Extract current version section from CHANGELOG
    notes=$(sed -n "/^## \[$version\]/,/^## \[/p" CHANGELOG.md | head -n -1)
  fi

  # If no notes in CHANGELOG, use default
  if [ -z "$notes" ]; then
    notes="Release $pkg_name version $version

Published to npm as: $(npm pkg get name | tr -d '"')

Installation:
\`\`\`bash
npm install $(npm pkg get name | tr -d '"')
\`\`\`

See README.md for usage instructions."
  fi

  # Create release
  print_info "Creating GitHub release for $tag..."
  if echo "$notes" | gh release create "$tag" --title "$pkg_name $version" --notes-file -; then
    print_success "GitHub release created"
  else
    print_warning "Failed to create GitHub release (may already exist)"
  fi

  cd "$BASE_DIR/publish-scripts"
  return 0
}

tag_package() {
  local pkg_dir=$1
  local pkg_name=$(basename "$pkg_dir")

  print_header "Processing Package: $pkg_name"

  # Verify package exists
  if [ ! -d "$pkg_dir" ]; then
    print_error "Package directory not found: $pkg_dir"
    return 1
  fi

  # Create tag
  if ! create_tag "$pkg_dir"; then
    return 1
  fi

  # Create GitHub release
  if ! create_github_release "$pkg_dir"; then
    return 1
  fi

  return 0
}

###############################################################################
# Main
###############################################################################

main() {
  print_header "Tag and Release Packages"

  # Check git status
  print_info "Checking git status..."
  if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes"
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      print_info "Aborted"
      exit 0
    fi
  fi

  # Determine which packages to tag
  local packages=()

  if [ -n "$TARGET_PKG" ]; then
    # Tag specific package
    if [ -d "$BASE_DIR/$TARGET_PKG" ]; then
      packages+=("$TARGET_PKG")
    else
      print_error "Package not found: $TARGET_PKG"
      exit 1
    fi
  else
    # Tag all Phase 1 packages
    packages+=("browser-gpu-profiler")
    packages+=("in-browser-vector-search")
    packages+=("jepa-real-time-sentiment-analysis")
  fi

  # Tag each package
  local total=${#packages[@]}
  local passed=0
  local failed=0

  for pkg in "${packages[@]}"; do
    if tag_package "$BASE_DIR/$pkg"; then
      ((passed++))
    else
      ((failed++))
    fi
  done

  # Final summary
  print_header "Tagging Summary"
  echo "Total packages: $total"
  print_success "Success: $passed"
  print_error "Failed: $failed"

  if [ "$failed" -gt 0 ]; then
    print_error "Some packages failed to tag"
    exit 1
  else
    print_success "All packages tagged successfully!"
    echo ""
    print_info "View releases on GitHub:"
    for pkg in "${packages[@]}"; do
      local pkg_dir="$BASE_DIR/$pkg"
      cd "$pkg_dir"
      local version=$(npm pkg get version | tr -d '"')
      local repo=$(npm pkg get repository.url | tr -d '"')
      echo "  • $pkg: $repo/releases/tag/v$version"
    done
  fi
}

# Run main
main
