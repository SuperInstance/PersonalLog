#!/bin/bash

###############################################################################
# Publish All Phase 1 Packages to npm
#
# Publishes all 3 Phase 1 packages to npm in sequence
# Packages:
#   1. browser-gpu-profiler → @superinstance/webgpu-profiler
#   2. @superinstance/in-browser-vector-search → @superinstance/vector-search
#   3. @superinstance/jepa-real-time-sentiment-analysis → @superinstance/jepa-sentiment
#
# Usage:
#   ./publish-all.sh              # Dry run (shows what will be published)
#   ./publish-all.sh --publish    # Actually publish to npm
#   ./publish-all.sh --skip-tests # Skip tests (not recommended)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=true
SKIP_TESTS=false
PUBLISH_FLAG="--dry-run"

for arg in "$@"; do
  case $arg in
    --publish)
      DRY_RUN=false
      PUBLISH_FLAG=""
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --publish       Actually publish to npm (default: dry run)"
      echo "  --skip-tests    Skip running tests (not recommended)"
      echo "  --help          Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                 # Dry run"
      echo "  $0 --publish       # Publish for real"
      echo "  $0 --publish --skip-tests  # Publish without tests"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Base directory
BASE_DIR="/mnt/c/users/casey/personallog/packages"

# Packages to publish (in order)
declare -A PACKAGES=(
  ["browser-gpu-profiler"]="@superinstance/webgpu-profiler"
  ["in-browser-vector-search"]="@superinstance/vector-search"
  ["jepa-real-time-sentiment-analysis"]="@superinstance/jepa-sentiment"
)

# Counters
TOTAL=${#PACKAGES[@]}
SUCCESS=0
FAILED=0
SKIPPED=0

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

check_npm_auth() {
  print_header "Checking npm authentication"

  if ! npm whoami > /dev/null 2>&1; then
    print_error "Not logged in to npm"
    print_info "Please run: npm login"
    exit 1
  fi

  local user=$(npm whoami)
  print_success "Logged in as: $user"
}

verify_package_exists() {
  local pkg_dir=$1
  local pkg_name=$2

  if [ ! -d "$pkg_dir" ]; then
    print_error "Package directory not found: $pkg_dir"
    return 1
  fi

  if [ ! -f "$pkg_dir/package.json" ]; then
    print_error "package.json not found in: $pkg_dir"
    return 1
  fi

  return 0
}

run_pre_publish_checks() {
  local pkg_dir=$1
  local pkg_name=$2

  print_info "Running pre-publish checks for $pkg_name..."

  cd "$pkg_dir"

  # Check if dist exists
  if [ ! -d "dist" ]; then
    print_warning "dist/ not found, building..."
    npm run build
  fi

  # Type check (if available)
  if grep -q '"type-check"' package.json; then
    print_info "Running type check..."
    npm run type-check
  fi

  # Lint (if available)
  if grep -q '"lint"' package.json && [ "$SKIP_TESTS" = false ]; then
    print_info "Running lint..."
    npm run lint
  fi

  # Tests (if available and not skipped)
  if grep -q '"test"' package.json && [ "$SKIP_TESTS" = false ]; then
    print_info "Running tests..."
    npm test
  fi

  # Security audit
  print_info "Running security audit..."
  npm audit || print_warning "Security audit found issues"

  cd "$BASE_DIR/publish-scripts"
}

publish_package() {
  local pkg_dir=$1
  local old_name=$2
  local new_name=$3

  print_header "Publishing: $old_name → $new_name"

  # Verify package exists
  if ! verify_package_exists "$pkg_dir" "$new_name"; then
    print_error "Package verification failed"
    ((FAILED++))
    return 1
  fi

  # Run pre-publish checks
  if ! run_pre_publish_checks "$pkg_dir" "$new_name"; then
    print_error "Pre-publish checks failed"
    ((FAILED++))
    return 1
  fi

  cd "$pkg_dir"

  # Update package name if needed
  if [ "$old_name" != "$new_name" ]; then
    print_info "Updating package name to: $new_name"
    npm pkg set name="$new_name"
  fi

  # Show what will be published
  print_info "Package contents:"
  npm pack --dry-run 2>&1 | head -20

  # Publish
  if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN - Would publish: $new_name"
    print_info "Use --publish to actually publish"
    ((SKIPPED++))
  else
    print_info "Publishing to npm..."
    if npm publish $PUBLISH_FLAG; then
      print_success "Published: $new_name"

      # Create git tag
      local version=$(npm pkg get version | tr -d '"')
      local tag="v${version}"

      print_info "Creating git tag: $tag"
      git tag -a "$tag" -m "Release $new_name $version"

      print_info "Pushing tag to origin..."
      git push origin "$tag"

      ((SUCCESS++))
    else
      print_error "Failed to publish: $new_name"
      ((FAILED++))
    fi
  fi

  cd "$BASE_DIR/publish-scripts"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  print_header "Phase 1 Package Publishing"

  if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No packages will be published"
    print_info "Use --publish to actually publish"
  else
    print_warning "PRODUCTION MODE - Packages will be published to npm!"
  fi

  # Check npm authentication
  check_npm_auth

  # Show summary
  print_info "Packages to publish: $TOTAL"
  echo ""
  for old_name in "${!PACKAGES[@]}"; do
    local new_name="${PACKAGES[$old_name]}"
    echo "  • $old_name → $new_name"
  done
  echo ""

  # Confirm if not dry run
  if [ "$DRY_RUN" = false ]; then
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      print_info "Aborted"
      exit 0
    fi
  fi

  # Publish each package
  for old_name in "${!PACKAGES[@]}"; do
    local new_name="${PACKAGES[$old_name]}"
    local pkg_dir="$BASE_DIR/$old_name"

    publish_package "$pkg_dir" "$old_name" "$new_name"
  done

  # Print summary
  print_header "Publishing Summary"
  echo "Total packages: $TOTAL"
  print_success "Success: $SUCCESS"
  print_error "Failed: $FAILED"
  print_warning "Skipped: $SKIPPED"
  echo ""

  if [ "$FAILED" -gt 0 ]; then
    print_error "Some packages failed to publish"
    exit 1
  fi

  if [ "$DRY_RUN" = true ]; then
    print_success "Dry run complete! Use --publish to actually publish"
  else
    print_success "All packages published successfully!"
    print_info "Next steps:"
    echo "  1. Verify packages on npm: https://www.npmjs.com/org/superinstance"
    echo "  2. Create GitHub releases for each package"
    echo "  3. Update documentation with installation instructions"
  fi
}

# Run main
main
