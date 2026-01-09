#!/bin/bash

###############################################################################
# Update Package Names to Scoped Format
#
# Updates package.json files to use scoped @superinstance/* names
# This is run automatically by publish-all.sh, but can be run separately
#
# Usage:
#   ./update-package-names.sh              # Preview changes
#   ./update-package-names.sh --apply     # Actually apply changes
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

# Parse arguments
APPLY=false
for arg in "$@"; do
  case $arg in
    --apply)
      APPLY=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --apply    Actually apply changes (default: preview)"
      echo "  --help     Show this help message"
      exit 0
      ;;
  esac
done

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

# Package mappings
declare -A PACKAGE_NAMES=(
  ["browser-gpu-profiler"]="@superinstance/webgpu-profiler"
  ["in-browser-vector-search"]="@superinstance/vector-search"
  ["jepa-real-time-sentiment-analysis"]="@superinstance/jepa-sentiment"
)

update_package_name() {
  local pkg_dir=$1
  local old_name=$2
  local new_name=$3

  cd "$pkg_dir"

  # Get current name
  local current=$(npm pkg get name | tr -d '"')

  if [ "$current" = "$new_name" ]; then
    print_info "Already updated: $current"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  echo ""
  print_info "Package: $(basename "$pkg_dir")"
  echo "  Current: $current"
  echo "  New:     $new_name"

  if [ "$APPLY" = true ]; then
    npm pkg set name="$new_name"
    print_success "Updated: $current → $new_name"
  else
    print_warning "Would update: $current → $new_name"
  fi

  cd "$BASE_DIR/publish-scripts"
}

###############################################################################
# Main
###############################################################################

main() {
  print_header "Update Package Names to @superinstance/*"

  if [ "$APPLY" = false ]; then
    print_warning "PREVIEW MODE - No changes will be made"
    print_info "Use --apply to actually update package names"
  else
    print_warning "This will update package.json files"
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      print_info "Aborted"
      exit 0
    fi
  fi

  echo ""
  print_info "Packages to update:"

  for old_name in "${!PACKAGE_NAMES[@]}"; do
    local new_name="${PACKAGE_NAMES[$old_name]}"
    echo "  • $old_name → $new_name"
  done

  # Update each package
  for old_name in "${!PACKAGE_NAMES[@]}"; do
    local new_name="${PACKAGE_NAMES[$old_name]}"
    local pkg_dir="$BASE_DIR/$old_name"

    if [ -d "$pkg_dir" ]; then
      update_package_name "$pkg_dir" "$old_name" "$new_name"
    else
      print_error "Directory not found: $pkg_dir"
    fi
  done

  # Summary
  echo ""
  print_header "Summary"

  if [ "$APPLY" = true ]; then
    print_success "Package names updated"
    echo ""
    print_info "Next steps:"
    echo "  1. Review changes: git diff"
    echo "  2. Commit changes: git commit -am 'chore: Update package names to @superinstance/*'"
    echo "  3. Publish: ./publish-all.sh --publish"
  else
    print_info "Preview complete"
    echo ""
    print_info "To apply changes:"
    echo "  ./update-package-names.sh --apply"
  fi
}

# Run main
main
