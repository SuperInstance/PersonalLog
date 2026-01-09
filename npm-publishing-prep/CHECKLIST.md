# npm Publishing Checklist

**For Each Package:** Complete this checklist before publishing to npm

---

## Package Metadata Verification

### Basic Information
- [ ] **package.json name** is correct format: `@superinstance/package-name`
- [ ] **Version number** follows semantic versioning (e.g., 1.0.0)
- [ ] **Description** is compelling and clear (250+ characters recommended)
- [ ] **Keywords** array populated (10-20 relevant keywords for SEO)
- [ ] **Author/Maintainer** information included
- [ ] **License field** set to "MIT"
- [ ] **Repository URL** points to GitHub
- [ ] **Bugs URL** points to GitHub issues
- [ ] **Homepage URL** points to GitHub pages or docs
- [ ] **Files array** properly configured (includes dist, excludes src/tests)

### Entry Points
- [ ] **Main entry point** correct (`"main": "dist/index.js"`)
- [ ] **Types entry point** correct (`"types": "dist/index.d.ts"`)
- [ ] **Module entry point** correct (`"module": "dist/index.esm.js"`)
- [ ] **Exports field** configured (if using ES modules)
- [ ] **Browser field** configured (if browser-specific)

---

## Dependencies Verification

### Production Dependencies
- [ ] All **dependencies** listed and necessary
- [ ] **Peer dependencies** declared (e.g., React, Vue)
- [ ] **Versions properly pinned** (use ^ for compatible updates)
- [ ] **License compatibility** checked (all dependencies MIT-compatible)
- [ ] **No unnecessary dependencies** (minimal footprint)
- [ ] **No duplicate dependencies** (deduped)

### Development Dependencies
- [ ] All **devDependencies** separated from dependencies
- [ ] **Testing libraries** in devDependencies (jest, vitest, etc.)
- [ ] **Build tools** in devDependencies (typescript, rollup, etc.)
- [ ] **Linting tools** in devDependencies (eslint, prettier, etc.)

---

## Build Verification

### Build Process
- [ ] `npm run build` succeeds without errors
- [ ] `npm run type-check` succeeds (0 TypeScript errors)
- [ ] **Dist files generated** in correct location
- [ ] **Source maps included** (optional but recommended)
- [ ] **Package size reasonable** (analyze with `npm run size`)
- [ ] **Tree-shaking works** (ES modules properly exported)
- [ ] **No console.log in production** build

### Bundle Analysis
- [ ] **No circular dependencies**
- [ ] **No unused exports**
- [ ] **No duplicated code**
- [ ] **Minimal bundle size** (consider code splitting if large)

---

## Testing Verification

### Test Suite
- [ ] `npm run test` passes all tests
- [ ] **Unit tests** comprehensive (80%+ coverage goal)
- [ ] **Integration tests** pass
- [ ] **E2E tests** pass (if applicable)
- [ ] **No test warnings or skipped tests**
- [ ] **Tests run on CI** (GitHub Actions, GitLab CI, etc.)

### Coverage
- [ ] **Code coverage** meets minimum (80%+)
- [ ] **Critical paths** covered (100%)
- [ ] **Edge cases** tested
- [ ] **Error handling** tested

---

## Documentation Verification

### Required Files
- [ ] **README.md** comprehensive and clear
- [ ] **LICENSE file** exists (MIT license recommended)
- [ ] **CHANGELOG.md** exists (or HISTORY.md)
- [ ] **CONTRIBUTING.md** (optional but recommended)
- [ ] **.npmignore** properly configured

### README Contents
- [ ] **Title and description** clear
- [ ] **Installation instructions** (`npm install @superinstance/package-name`)
- [ ] **Quick start** example (5 minutes to first use)
- [ ] **Usage examples** (basic + advanced)
- [ ] **API documentation** link
- [ ] **Badge links** (npm version, downloads, license, build)
- [ ] **Contributing guide** link
- [ ] **License information**

### API Documentation
- [ ] **All public APIs documented**
- [ ] **Type definitions exported** (for TypeScript users)
- [ ] **JSDoc comments** complete
- [ ] **Examples for each API**
- [ ] **Parameter types** documented
- [ ] **Return types** documented
- [ ] **Error scenarios** documented

---

## Security Verification

### Secrets and Sensitive Data
- [ ] **No API keys** in code
- [ ] **No passwords** in code
- [ ] **No private keys** in code
- [ ] **No hardcoded credentials**
- [ ] **Environment variables** properly used
- [ ] **.env.example** provided (if using env vars)

### Package Security
- [ ] **.npmignore** excludes development files
- [ ] **.gitignore** properly configured
- [ ] **No sensitive data in build** output
- [ ] **Dependabot enabled** (on GitHub)
- [ ] **Security policy** defined (SECURITY.md)
- [ ] **No known vulnerabilities** (`npm audit`)

---

## Git Status Verification

### Repository Cleanliness
- [ ] **Working tree is clean** (`git status` shows no changes)
- [ ] **All changes committed**
- [ ] **Commit messages** follow conventional commits
- [ ] **Version tagged** in git (`git tag v1.0.0`)
- [ ] **Tags pushed to remote** (`git push origin v1.0.0`)
- [ ] **Main branch updated** (`git push origin main`)

### Release Preparation
- [ ] **CHANGELOG.md updated** with release notes
- [ ] **Version bumped** in package.json
- [ ] **Git tag created** for version
- [ ] **Release notes** prepared (for GitHub release)

---

## Pre-Publish Final Checks

### Package Inspection
- [ ] **Run `npm pack`** to test package creation
- [ ] **Inspect tarball contents** (`tar -tzf *.tgz`)
- [ ] **Verify all necessary files included**
- [ ] **Verify no unnecessary files included**
- [ ] **Test installation from tarball** (`npm install ./package.tgz`)

### Dry Run
- [ ] **Run `npm publish --dry-run`** to test
- [ ] **Review package contents** that will be published
- [ ] **Verify package size** is reasonable
- [ ] **Check for any warnings**

---

## Post-Publish Verification

### npm Registry
- [ ] **Package appears on npmjs.com**
- [ ] **Version is correct**
- [ ] **Description displays properly**
- [ ] **Readme renders correctly**
- [ ] **Keywords are searchable**
- [ ] **Homepage link works**
- [ ] **Repository link works**
- [ ] **Bug tracker link works**

### Installation Test
- [ ] **Fresh install works** (`npm install @superinstance/package-name`)
- [ ] **Import works** in TypeScript project
- [ ] **Import works** in JavaScript project
- [ ] **All examples run without errors**
- [ ] **No runtime errors** in browser/Node.js

---

## Package-Specific Checks

### 1. @superinstance/webgpu-profiler
- [ ] WebGPU imports work correctly
- [ ] Browser compatibility documented
- [ ] GPU capability detection tested
- [ ] Examples work in browser
- [ ] TypeScript types for WebGPU APIs

### 2. @superinstance/vector-search
- [ ] Vector operations tested
- [ ] Similarity search accurate
- [ ] Performance benchmarks documented
- [ ] Memory usage reasonable
- [ ] TypeScript types for vector operations

### 3. @superinstance/jepa-sentiment
- [ ] JEPA model loads correctly
- [ ] Sentiment analysis accurate
- [ ] Real-time performance tested
- [ ] Model size documented
- [ ] TypeScript types for predictions

### 4. @superinstance/examples
- [ ] All examples run without errors
- [ ] Dependencies are correct
- [ ] Setup instructions clear
- [ ] Screenshots included (if applicable)
- [ ] Links to live demos (if available)

---

## Ready to Publish?

When all checks are complete:

```bash
# 1. Run final checks
npm run build
npm run test
npm run lint

# 2. Create tarball and inspect
npm pack
tar -tzf *.tgz

# 3. Dry run (does not publish)
npm publish --dry-run

# 4. Publish to npm
npm publish --access public

# 5. Verify on npm
npm view @superinstance/package-name

# 6. Tag and push to git
git tag v1.0.0
git push origin v1.0.0
```

---

## Common Issues and Solutions

### Issue: "Package name already exists"
**Solution:** Choose a different scoped package name or check if you already own it

### Issue: "402 Payment Required"
**Solution:** For scoped packages, use `--access public` flag

### Issue: "EINVALIDPKGNAME"
**Solution:** Package name must be lowercase, can't start with dot/underscore

### Issue: "Missing required field: repository"
**Solution:** Add repository field to package.json

### Issue: "EBADENGINE"
**Solution:** Check engines field in package.json matches Node version

### Issue: "404 Not Found" after publish
**Solution:** Wait 1-2 minutes for npm registry propagation

---

## Publishing Contacts

- **npm Issues:** https://npm.community
- **GitHub Issues:** https://github.com/SuperInstance/[repo]/issues
- **Maintainer:** [Your contact info]

---

*Last Updated: 2025-01-08*
*Status: Ready for Phase 1 Package Publishing*
