#!/bin/bash

###############################################################################
# Dry Run - Test if Packages are Ready to Publish
#
# Runs all pre-publish checks without actually publishing
# This is the safest way to verify everything is ready
#
# Usage:
#   ./dry-run.sh                    # Check all packages
#   ./dry-run.sh browser-gpu-profiler  # Check specific package
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

# Get package to check (or all)
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

check_package_metadata() {
  local pkg_dir=$1

  print_header "Checking Package Metadata"

  cd "$pkg_dir"

  # Check package.json exists
  if [ ! -f "package.json" ]; then
    print_error "package.json not found"
    return 1
  fi

  # Extract key fields
  local name=$(npm pkg get name | tr -d '"')
  local version=$(npm pkg get version | tr -d '"')
  local license=$(npm pkg get license | tr -d '"')
  local author=$(npm pkg get author | tr -d '"')
  local main=$(npm pkg get main | tr -d '"')
  local types=$(npm pkg get types | tr -d '"')

  echo "Package Name: $name"
  echo "Version: $version"
  echo "License: $license"
  echo "Author: $author"
  echo "Main: $main"
  echo "Types: $types"

  # Validate fields
  local errors=0

  if [ -z "$name" ]; then
    print_error "Package name is missing"
    ((errors++))
  elif [[ ! "$name" =~ ^@superinstance/ ]]; then
    print_warning "Package name is not scoped: $name"
  else
    print_success "Package name: $name"
  fi

  if [ -z "$version" ]; then
    print_error "Version is missing"
    ((errors++))
  elif [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_error "Version doesn't follow semver: $version"
    ((errors++))
  else
    print_success "Version: $version"
  fi

  if [ "$license" != "MIT" ]; then
    print_warning "License is not MIT: $license"
  else
    print_success "License: $license"
  fi

  if [ "$author" != "SuperInstance" ]; then
    print_warning "Author is not SuperInstance: $author"
  else
    print_success "Author: $author"
  fi

  if [ -z "$main" ] || [ ! -f "$main" ]; then
    print_error "Main entry point missing or doesn't exist: $main"
    ((errors++))
  else
    print_success "Main entry: $main"
  fi

  if [ -n "$types" ] && [ ! -f "$types" ]; then
    print_error "Types entry point doesn't exist: $types"
    ((errors++))
  elif [ -n "$types" ]; then
    print_success "Types entry: $types"
  fi

  cd "$BASE_DIR/publish-scripts"

  return $errors
}

check_build() {
  local pkg_dir=$1

  print_header "Checking Build"

  cd "$pkg_dir"

  # Check if build script exists
  if ! grep -q '"build"' package.json; then
    print_warning "No build script found"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  # Check if dist exists
  if [ ! -d "dist" ]; then
    print_warning "dist/ not found, running build..."
    if npm run build; then
      print_success "Build successful"
    else
      print_error "Build failed"
      cd "$BASE_DIR/publish-scripts"
      return 1
    fi
  else
    print_success "dist/ exists"
  fi

  # Check required files in dist
  local required_files=("index.js" "index.d.ts")
  local missing_files=()

  for file in "${required_files[@]}"; do
    if [ ! -f "dist/$file" ]; then
      missing_files+=("$file")
    fi
  done

  if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Missing files in dist/: ${missing_files[*]}"
    cd "$BASE_DIR/publish-scripts"
    return 1
  fi

  # Check file sizes
  local bundle_size=$(du -sh dist/ | cut -f1)
  print_info "Bundle size: $bundle_size"

  cd "$BASE_DIR/publish-scripts"
  return 0
}

check_tests() {
  local pkg_dir=$1

  print_header "Checking Tests"

  cd "$pkg_dir"

  # Check if test script exists
  if ! grep -q '"test"' package.json; then
    print_warning "No test script found"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  print_info "Running tests..."
  if npm test 2>&1; then
    print_success "Tests passed"
    cd "$BASE_DIR/publish-scripts"
    return 0
  else
    print_error "Tests failed"
    cd "$BASE_DIR/publish-scripts"
    return 1
  fi
}

check_type_check() {
  local pkg_dir=$1

  print_header "Type Checking"

  cd "$pkg_dir"

  if ! grep -q '"type-check"' package.json; then
    print_warning "No type-check script found"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  print_info "Running type check..."
  if npm run type-check 2>&1; then
    print_success "Type check passed"
    cd "$BASE_DIR/publish-scripts"
    return 0
  else
    print_error "Type check failed"
    cd "$BASE_DIR/publish-scripts"
    return 1
  fi
}

check_lint() {
  local pkg_dir=$1

  print_header "Linting"

  cd "$pkg_dir"

  if ! grep -q '"lint"' package.json; then
    print_warning "No lint script found"
    cd "$BASE_DIR/publish-scripts"
    return 0
  fi

  print_info "Running lint..."
  if npm run lint 2>&1; then
    print_success "Lint passed"
    cd "$BASE_DIR/publish-scripts"
    return 0
  else
    print_error "Lint failed"
    cd "$BASE_DIR/publish-scripts"
    return 1
  fi
}

check_documentation() {
  local pkg_dir=$1

  print_header "Checking Documentation"

  cd "$pkg_dir"

  local errors=0

  # Check README
  if [ ! -f "README.md" ]; then
    print_error "README.md not found"
    ((errors++))
  else
    print_success "README.md exists"

    # Check README size
    local readme_size=$(wc -l < README.md)
    if [ "$readme_size" -lt 50 ]; then
      print_warning "README.md seems short ($readme_size lines)"
    else
      print_success "README.md is comprehensive ($readme_size lines)"
    fi
  fi

  # Check LICENSE
  if [ ! -f "LICENSE" ]; then
    print_error "LICENSE not found"
    ((errors++))
  else
    print_success "LICENSE exists"
  fi

  # Check CHANGELOG
  if [ ! -f "CHANGELOG.md" ]; then
    print_warning "CHANGELOG.md not found"
  else
    print_success "CHANGELOG.md exists"
  fi

  cd "$BASE_DIR/publish-scripts"
  return $errors
}

check_npmignore() {
  local pkg_dir=$1

  print_header "Checking .npmignore"

  cd "$pkg_dir"

  if [ ! -f ".npmignore" ]; then
    print_warning ".npmignore not found (will use default ignore rules)"
  else
    print_success ".npmignore exists"

    # Check what will be published
    print_info "Files that will be published:"
    npm pack --dry-run 2>&1 | grep -E "^dist|^README|^LICENSE" | head -10
  fi

  cd "$BASE_DIR/publish-scripts"
}

check_security() {
  local pkg_dir=$1

  print_header "Security Check"

  cd "$pkg_dir"

  # Check for secrets
  print_info "Checking for secrets..."
  if grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" src/ 2>/dev/null; then
    print_error "Potential secrets found in source code"
    cd "$BASE_DIR/publish-scripts"
    return 1
  else
    print_success "No secrets found"
  fi

  # Run npm audit
  print_info "Running npm audit..."
  if npm audit 2>&1 | grep -q "vulnerabilities"; then
    print_warning "Security vulnerabilities found"
    npm audit
  else
    print_success "No vulnerabilities found"
  fi

  cd "$BASE_DIR/publish-scripts"
  return 0
}

check_package() {
  local pkg_dir=$1
  local pkg_name=$(basename "$pkg_dir")

  print_header "Checking Package: $pkg_name"

  local total_checks=0
  local passed_checks=0

  # Run all checks
  check_package_metadata "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  check_build "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  check_tests "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  check_type_check "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  check_lint "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  check_documentation "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  check_npmignore "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  check_security "$pkg_dir" && ((passed_checks++))
  ((total_checks++))

  # Summary
  echo ""
  echo -e "${BLUE}Summary for $pkg_name:${NC}"
  echo "Passed: $passed_checks/$total_checks checks"

  if [ "$passed_checks" -eq "$total_checks" ]; then
    print_success "Ready to publish!"
    return 0
  else
    print_error "Not ready to publish"
    return 1
  fi
}

###############################################################################
# Main
###############################################################################

main() {
  print_header "Dry Run - Package Publishing Readiness Check"

  # Check npm authentication
  print_info "Checking npm authentication..."
  if ! npm whoami > /dev/null 2>&1; then
    print_warning "Not logged in to npm (run: npm login)"
  else
    local user=$(npm whoami)
    print_success "Logged in as: $user"
  fi

  # Determine which packages to check
  local packages=()

  if [ -n "$TARGET_PKG" ]; then
    # Check specific package
    if [ -d "$BASE_DIR/$TARGET_PKG" ]; then
      packages+=("$TARGET_PKG")
    else
      print_error "Package not found: $TARGET_PKG"
      exit 1
    fi
  else
    # Check all Phase 1 packages
    packages+=("browser-gpu-profiler")
    packages+=("in-browser-vector-search")
    packages+=("jepa-real-time-sentiment-analysis")
  fi

  # Check each package
  local total=${#packages[@]}
  local passed=0
  local failed=0

  for pkg in "${packages[@]}"; do
    if check_package "$BASE_DIR/$pkg"; then
      ((passed++))
    else
      ((failed++))
    fi
  done

  # Final summary
  print_header "Dry Run Summary"
  echo "Total packages: $total"
  print_success "Ready: $passed"
  print_error "Not ready: $failed"

  if [ "$failed" -gt 0 ]; then
    echo ""
    print_error "Some packages are not ready to publish"
    echo "Please fix the issues above before publishing"
    exit 1
  else
    echo ""
    print_success "All packages are ready to publish!"
    echo "Run './publish-all.sh --publish' to publish"
  fi
}

# Run main
main
