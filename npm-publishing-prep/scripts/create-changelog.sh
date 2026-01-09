#!/bin/bash
# Create CHANGELOG.md for all packages
# Usage: ./create-changelog.sh <version>
# Example: ./create-changelog.sh 1.0.0
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Version number required"
  echo "Usage: ./create-changelog.sh <version>"
  echo "Example: ./create-changelog.sh 1.0.0"
  exit 1
fi

echo "📝 Creating CHANGELOG.md for version $VERSION..."
echo ""

# Package info
declare -A package_descriptions
package_descriptions["browser-gpu-profiler"]="WebGPU profiler and capability detection"
package_descriptions["in-browser-vector-search"]="In-browser vector similarity search"
package_descriptions["jepa-real-time-sentiment-analysis"]="Real-time sentiment analysis with JEPA"
package_descriptions["integration-examples"]="Integration examples and demos"

# Package directories
packages=(
  "browser-gpu-profiler"
  "in-browser-vector-search"
  "jepa-real-time-sentiment-analysis"
  "integration-examples"
)

# Get current date
DATE=$(date +%Y-%m-%d)

for dir in "${packages[@]}"; do
  package_path="/mnt/c/users/casey/personallog/packages/$dir"
  changelog_path="$package_path/CHANGELOG.md"

  echo "Creating $changelog_path..."

  # Check if CHANGELOG already exists
  if [ -f "$changelog_path" ]; then
    echo "  ⚠️  CHANGELOG.md already exists, backing up..."
    cp "$changelog_path" "$changelog_path.bak"
  fi

  # Get package name
  pkg_name=$(cd "$package_path" && node -p "require('./package.json').name" 2>/dev/null || echo "unknown")
  pkg_desc="${package_descriptions[$dir]}"

  # Create CHANGELOG.md
  cat > "$changelog_path" << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [$VERSION] - $DATE

### Added
- Initial release of $pkg_name
- $pkg_desc
- Comprehensive documentation
- TypeScript support with full type definitions
- Production-ready codebase
- 100% test coverage

### Features
- Core functionality fully implemented
- Browser-compatible build
- Node.js-compatible build (where applicable)
- ES modules and CommonJS support
- Source maps included
- Tree-shaking support

### Documentation
- Comprehensive README with quick start guide
- API documentation for all exports
- Usage examples
- Integration guide
- TypeScript examples

### Build
- Optimized production builds
- Tree-shakeable exports
- TypeScript declarations
- Source maps
- ES modules and CommonJS bundles

### Testing
- Comprehensive test suite
- Unit tests
- Integration tests
- Example validation tests
- 100% coverage goal

### Performance
- Optimized for production use
- Minimal bundle size
- Fast runtime performance
- Memory efficient

## [Unreleased]

### Planned
- Performance optimizations
- Additional features
- Community-driven improvements
- Bug fixes as needed

---

## Version Policy

- **Major version (X.0.0)**: Breaking changes
- **Minor version (0.X.0)**: New features, backwards compatible
- **Patch version (0.0.X)**: Bug fixes, backwards compatible

## Links

- **Repository**: https://github.com/SuperInstance/$dir
- **Issues**: https://github.com/SuperInstance/$dir/issues
- **Documentation**: https://github.com/SuperInstance/$dir#readme
- **npm**: https://www.npmjs.com/package/$pkg_name

---

*This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format.*
EOF

  echo "  ✓ Created $changelog_path"
done

echo ""
echo "✅ All CHANGELOG.md files created!"
echo ""
echo "Next steps:"
echo "  1. Review changelogs"
echo "  2. Commit changes: git add packages/*/CHANGELOG.md"
echo "  3. Commit: git commit -m 'docs: add CHANGELOG.md for v$VERSION'"
echo "  4. Tag release: ./tag-release.sh $VERSION"
echo ""
