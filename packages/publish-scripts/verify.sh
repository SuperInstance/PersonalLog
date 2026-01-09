#!/bin/bash

###############################################################################
# Verify Published Packages on npm
#
# Verifies that packages are correctly published and installable
# Should be run AFTER npm publish completes
#
# Usage:
#   ./verify.sh                      # Verify all packages
#   ./verify.sh browser-gpu-profiler  # Verify specific package
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

# Package mappings
declare -A PACKAGES=(
  ["browser-gpu-profiler"]="@superinstance/webgpu-profiler"
  ["in-browser-vector-search"]="@superinstance/vector-search"
  ["jepa-real-time-sentiment-analysis"]="@superinstance/jepa-sentiment"
)

# Get package to verify (or all)
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

verify_npm_package() {
  local pkg_name=$1

  print_header "Verifying: $pkg_name"

  # Check if package exists on npm
  print_info "Checking if package exists on npm..."
  if ! npm view "$pkg_name" >/dev/null 2>&1; then
    print_error "Package not found on npm: $pkg_name"
    return 1
  fi

  print_success "Package found on npm"

  # Get package info
  local version=$(npm view "$pkg_name" version)
  local description=$(npm view "$pkg_name" description)
  local license=$(npm view "$pkg_name" license)
  local author=$(npm view "$pkg_name" author)

  echo "Version: $version"
  echo "Description: $description"
  echo "License: $license"
  echo "Author: $author"

  # Verify metadata
  if [ "$license" != "MIT" ]; then
    print_warning "License is not MIT: $license"
  fi

  # Check if latest version is published
  print_info "Checking latest version..."
  local latest=$(npm view "$pkg_name" dist-tags.latest)
  if [ "$latest" = "$version" ]; then
    print_success "Latest version: $latest"
  else
    print_warning "Latest tag ($latest) differs from version ($version)"
  fi

  # Check for tarball
  print_info "Checking tarball..."
  local tarball=$(npm view "$pkg_name" dist.tarball)
  if [ -n "$tarball" ]; then
    print_success "Tarball available: $tarball"
  else
    print_error "Tarball not found"
    return 1
  fi

  # Check for types
  print_info "Checking TypeScript types..."
  if npm view "$pkg_name" types >/dev/null 2>&1; then
    local types=$(npm view "$pkg_name" types)
    print_success "Types available: $types"
  else
    print_warning "Types field not found in package.json"
  fi

  return 0
}

test_installation() {
  local pkg_name=$1

  print_header "Testing Installation: $pkg_name"

  # Create temp directory for testing
  local test_dir=$(mktemp -d)
  print_info "Test directory: $test_dir"

  cd "$test_dir"

  # Initialize npm project
  print_info "Initializing test project..."
  npm init -y >/dev/null 2>&1

  # Install package
  print_info "Installing package..."
  if npm install "$pkg_name" 2>&1 | grep -q "saved"; then
    print_success "Package installed successfully"
  else
    print_error "Package installation failed"
    cd "$BASE_DIR/publish-scripts"
    rm -rf "$test_dir"
    return 1
  fi

  # Check if package is in node_modules
  if [ -d "node_modules/$pkg_name" ]; then
    print_success "Package found in node_modules"
  else
    print_error "Package not found in node_modules"
    cd "$BASE_DIR/publish-scripts"
    rm -rf "$test_dir"
    return 1
  fi

  # Check package.json in installed package
  if [ -f "node_modules/$pkg_name/package.json" ]; then
    print_success "package.json exists in installed package"
  else
    print_error "package.json missing in installed package"
    cd "$BASE_DIR/publish-scripts"
    rm -rf "$test_dir"
    return 1
  fi

  # Check for dist directory
  if [ -d "node_modules/$pkg_name/dist" ]; then
    print_success "dist directory exists in installed package"
  else
    print_warning "dist directory not found in installed package"
  fi

  # Check for index files
  if [ -f "node_modules/$pkg_name/dist/index.js" ]; then
    print_success "index.js exists in installed package"
  else
    print_error "index.js missing in installed package"
    cd "$BASE_DIR/publish-scripts"
    rm -rf "$test_dir"
    return 1
  fi

  if [ -f "node_modules/$pkg_name/dist/index.d.ts" ]; then
    print_success "index.d.ts exists in installed package"
  else
    print_warning "index.d.ts missing in installed package"
  fi

  # Clean up
  cd "$BASE_DIR/publish-scripts"
  rm -rf "$test_dir"
  print_info "Cleaned up test directory"

  return 0
}

verify_package() {
  local old_name=$1
  local new_name=$2

  print_header "Verifying Package: $old_name → $new_name"

  local errors=0

  # Verify on npm
  if ! verify_npm_package "$new_name"; then
    ((errors++))
  fi

  # Test installation
  if ! test_installation "$new_name"; then
    ((errors++))
  fi

  return $errors
}

###############################################################################
# Main
###############################################################################

main() {
  print_header "Verify Published Packages on npm"

  # Check npm authentication
  print_info "Checking npm authentication..."
  if ! npm whoami > /dev/null 2>&1; then
    print_warning "Not logged in to npm"
    print_info "Some checks may fail without authentication"
  else
    local user=$(npm whoami)
    print_success "Logged in as: $user"
  fi

  # Determine which packages to verify
  local packages=()

  if [ -n "$TARGET_PKG" ]; then
    # Verify specific package
    if [ -n "${PACKAGES[$TARGET_PKG]}" ]; then
      packages+=("$TARGET_PKG")
    else
      print_error "Package not found: $TARGET_PKG"
      exit 1
    fi
  else
    # Verify all Phase 1 packages
    for pkg in "${!PACKAGES[@]}"; do
      packages+=("$pkg")
    done
  fi

  # Verify each package
  local total=${#packages[@]}
  local passed=0
  local failed=0

  for old_name in "${packages[@]}"; do
    local new_name="${PACKAGES[$old_name]}"
    if verify_package "$old_name" "$new_name"; then
      ((passed++))
    else
      ((failed++))
    fi
  done

  # Final summary
  print_header "Verification Summary"
  echo "Total packages: $total"
  print_success "Verified: $passed"
  print_error "Failed: $failed"

  if [ "$failed" -gt 0 ]; then
    echo ""
    print_error "Some packages failed verification"
    echo "Please check the errors above"
    exit 1
  else
    echo ""
    print_success "All packages verified successfully!"
    echo ""
    echo "Packages are available on npm:"
    for old_name in "${packages[@]}"; do
      local new_name="${PACKAGES[$old_name]}"
      local version=$(npm view "$new_name" version)
      echo "  • $new_name@$version"
      echo "    https://www.npmjs.com/package/$new_name"
    done
  fi
}

# Run main
main
