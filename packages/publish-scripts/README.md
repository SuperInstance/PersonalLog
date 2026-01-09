# npm Publishing Scripts

Automated scripts for publishing Phase 1 packages to npm.

## Overview

This directory contains scripts to automate the publishing process for Phase 1 packages:

1. **browser-gpu-profiler** → `@superinstance/webgpu-profiler`
2. **in-browser-vector-search** → `@superinstance/vector-search`
3. **jepa-real-time-sentiment-analysis** → `@superinstance/jepa-sentiment`

## Prerequisites

1. **npm account**: Create an account at https://npmjs.com
2. **Logged in**: Run `npm login` and authenticate
3. **Verify**: Run `npm whoami` to confirm login

## Scripts

### 1. CHECKLIST.md

Comprehensive pre-publish checklist covering:
- Package metadata verification
- Build verification
- Documentation checks
- Testing verification
- Security checks
- Post-publish verification

**View before publishing to ensure everything is ready.**

```bash
cat CHECKLIST.md
```

### 2. dry-run.sh

Test if packages are ready to publish without actually publishing.

**Use this first to verify everything is ready.**

```bash
# Check all packages
./dry-run.sh

# Check specific package
./dry-run.sh browser-gpu-profiler
```

**What it does:**
- Validates package.json metadata
- Runs build process
- Executes tests
- Type checking
- Linting
- Security audit
- Documentation check
- .npmignore verification

### 3. publish-all.sh

Publish all Phase 1 packages to npm.

**⚠️ IMPORTANT: Run dry-run.sh first!**

```bash
# Dry run (shows what will be published)
./publish-all.sh

# Actually publish to npm
./publish-all.sh --publish

# Publish without running tests (not recommended)
./publish-all.sh --publish --skip-tests
```

**What it does:**
- Validates each package
- Updates package names to scoped names (@superinstance/*)
- Runs pre-publish checks (build, test, type-check, lint)
- Publishes to npm registry
- Creates git tags
- Pushes tags to GitHub

**Options:**
- `--publish`: Actually publish (default is dry run)
- `--skip-tests`: Skip running tests (not recommended)
- `--help`: Show help message

### 4. tag-release.sh

Create git tags and GitHub releases for published packages.

**Run after successful npm publish.**

```bash
# Tag all packages
./tag-release.sh

# Tag specific package
./tag-release.sh browser-gpu-profiler
```

**What it does:**
- Creates annotated git tags (v1.0.0)
- Pushes tags to GitHub
- Creates GitHub releases using gh CLI
- Includes CHANGELOG entries in release notes

**Requirements:**
- gh CLI installed: https://cli.github.com/
- Authenticated with gh: `gh auth login`

### 5. verify.sh

Verify packages are correctly published on npm.

**Run after publishing to confirm success.**

```bash
# Verify all packages
./verify.sh

# Verify specific package
./verify.sh browser-gpu-profiler
```

**What it does:**
- Checks package exists on npm
- Verifies metadata (version, license, author)
- Checks tarball availability
- Verifies TypeScript types are available
- Tests installation in temp directory
- Validates package contents

## Publishing Workflow

Follow this complete workflow for publishing:

### Step 1: Preparation

```bash
# 1. Make sure you're logged in to npm
npm login
npm whoami

# 2. Review the checklist
cat CHECKLIST.md

# 3. Run dry-run to check everything
./dry-run.sh
```

### Step 2: Publish

```bash
# 4. Publish all packages (for real)
./publish-all.sh --publish

# 5. Tag and create releases
./tag-release.sh

# 6. Verify packages are on npm
./verify.sh
```

### Step 3: Post-Publish

```bash
# 7. Verify packages on npmjs.com
# Visit: https://www.npmjs.com/org/superinstance

# 8. Create GitHub releases (if not auto-created)
# Visit: https://github.com/SuperInstance/[repo]/releases

# 9. Update documentation with installation instructions
# Update README files with published package names
```

## Package Name Mappings

| Directory | npm Package |
|-----------|-------------|
| `browser-gpu-profiler` | `@superinstance/webgpu-profiler` |
| `in-browser-vector-search` | `@superinstance/vector-search` |
| `jepa-real-time-sentiment-analysis` | `@superinstance/jepa-sentiment` |

## Troubleshooting

### Issue: "Package name already exists"

**Solution:** The package may already be published. Check with:
```bash
npm view @superinstance/package-name
```

### Issue: "402 Payment Required"

**Solution:** Scoped packages need public access:
```bash
npm access public
```

### Issue: "Not logged in"

**Solution:** Log in to npm:
```bash
npm login
```

### Issue: "Tests failed"

**Solution:** Fix failing tests before publishing:
```bash
cd /path/to/package
npm test
```

### Issue: "TypeScript errors"

**Solution:** Fix TypeScript errors:
```bash
cd /path/to/package
npm run type-check
```

## Quick Reference

```bash
# Complete workflow
npm login && \
./dry-run.sh && \
./publish-all.sh --publish && \
./tag-release.sh && \
./verify.sh

# Check specific package
./dry-run.sh browser-gpu-profiler
./publish-all.sh --publish  # Publishes all
./tag-release.sh browser-gpu-profiler
./verify.sh browser-gpu-profiler

# View what will be published
npm pack --dry-run
tar -tzf *.tgz | less
```

## File Structure

```
publish-scripts/
├── README.md           # This file
├── CHECKLIST.md        # Comprehensive pre-publish checklist
├── dry-run.sh          # Test if ready to publish
├── publish-all.sh      # Publish all packages
├── tag-release.sh      # Create tags and releases
└── verify.sh           # Verify published packages
```

## Safety Features

1. **Dry Run Mode**: All scripts default to safe dry-run mode
2. **Pre-checks**: Comprehensive checks before publishing
3. **Error Handling**: Scripts exit on errors
4. **Colored Output**: Clear visual feedback
5. **Summary Reports**: Detailed success/failure reporting

## Best Practices

1. **Always run dry-run first** - Verify everything is ready
2. **Review the checklist** - Ensure all items are checked
3. **Test in isolation** - Verify each package individually if needed
4. **Keep CHANGELOG updated** - Document all changes
5. **Tag releases** - Use semantic versioning
6. **Create GitHub releases** - Include release notes
7. **Verify after publishing** - Ensure packages are installable

## Support

For issues or questions:
- Check package README files
- Review the checklist: `CHECKLIST.md`
- Check npm docs: https://docs.npmjs.com/

## License

MIT

---

**Last Updated:** 2026-01-08
**Status:** Ready for Phase 1 publishing
