# npm Publishing Pre-Publish Checklist

**Phase 1 Packages:**
1. `browser-gpu-profiler` → `@superinstance/webgpu-profiler`
2. `@superinstance/in-browser-vector-search` → `@superinstance/vector-search`
3. `@superinstance/jepa-real-time-sentiment-analysis` → `@superinstance/jepa-sentiment`

---

## 📋 Package Metadata Verification

### For Each Package:

- [ ] **Package name** matches npm scoped naming (@superinstance/package-name)
- [ ] **Version** is correct (1.0.0 for initial release)
- [ ] **Description** is clear and concise (max 100 chars recommended)
- [ ] **Keywords** are comprehensive and relevant
- [ ] **Author** is set to "SuperInstance"
- [ ] **License** is set to "MIT"
- [ ] **Repository URL** points to correct GitHub repo
- [ ] **Bugs URL** points to GitHub issues
- [ ] **Homepage** points to GitHub README
- [ ] **Main entry point** is correctly set (dist/index.js)
- [ ] **Types entry point** is correctly set (dist/index.d.ts)
- [ ] **Exports field** is properly configured
- [ ] **Files field** includes only necessary files
- [ ] **Engines** specifies Node.js >=18.0.0
- [ ] **Type** is set to "module"

### Verify with:
```bash
cd /path/to/package
cat package.json | jq '.name, .version, .license, .author'
```

---

## 🔨 Build Verification

### For Each Package:

- [ ] **Build script** runs without errors (`npm run build`)
- [ ] **Dist directory** exists and contains:
  - [ ] index.js
  - [ ] index.d.ts
  - [ ] Any exported sub-modules
- [ ] **TypeScript compilation** succeeds (0 errors)
- [ ] **Source maps** are generated (if needed)
- [ ] **Bundle size** is reasonable (<500KB recommended)
- [ ] **No console.log or debug statements** in production build

### Verify with:
```bash
cd /path/to/package
npm run build
ls -la dist/
cat dist/index.js | head -20
```

---

## 📚 Documentation Check

### For Each Package:

- [ ] **README.md** exists and is complete:
  - [ ] Clear title and badge
  - [ ] What problem it solves
  - [ ] Key features (3-5 bullets)
  - [ ] Installation instructions
  - [ ] Quick start example (5-minute setup)
  - [ ] Basic usage
  - [ ] API documentation link
  - [ ] License badge
- [ ] **LICENSE file** exists (MIT)
- [ ] **CHANGELOG.md** exists with initial version
- [ ] **Documentation builds** without errors
- [ ] **All examples are runnable**
- [ ] **Links in README are valid**

### Verify with:
```bash
cd /path/to/package
ls -la README.md LICENSE CHANGELOG.md
# Check for broken links
markdown-link-check README.md
```

---

## 🧪 Testing Verification

### For Each Package:

- [ ] **Test suite exists** and is comprehensive
- [ ] **All tests pass** (`npm test`)
- [ ] **Test coverage** is measured (aim for 80%+)
- [ ] **No TypeScript errors** (`npm run type-check`)
- [ ] **No ESLint errors** (`npm run lint`)
- [ ] **Integration tests** pass (if applicable)
- [ ] **Edge cases covered**

### Verify with:
```bash
cd /path/to/package
npm test
npm run type-check
npm run lint
npm run test:coverage  # if available
```

---

## 📦 Package Specific Checks

### browser-gpu-profiler (@superinstance/webgpu-profiler)

- [ ] WebGPU API imports are conditional/optional
- [ ] Browser compatibility documented
- [ ] Fallback mechanisms documented
- [ ] Performance benchmarks documented
- [ ] Memory usage documented

### in-browser-vector-search (@superinstance/vector-search)

- [ ] IndexedDB operations handled properly
- [ ] WASM support is optional
- [ ] WebGPU acceleration is optional
- [ ] Checkpoint system tested
- [ ] LoRA export format documented

### jepa-real-time-sentiment-analysis (@superinstance/jepa-sentiment)

- [ ] WebGPU acceleration is optional
- [ ] CPU fallback works correctly
- [ ] VAD scoring accuracy documented
- [ ] Real-time performance benchmarks
- [ ] Confidence intervals documented

---

## 🔒 Security Check

### For Each Package:

- [ ] **No secrets or API keys** in code
- [ ] **No hardcoded credentials**
- [ ] **No console.log with sensitive data**
- [ ] **Dependencies are audited** (`npm audit`)
- [ ] **No vulnerable dependencies** (`npm audit fix`)
- [ ] **.npmignore** properly configured
- [ ] **No source maps** in published package (unless intentional)
- [ ] **No test files** in published package
- [ ] **No development configs** in published package

### Verify with:
```bash
cd /path/to/package
npm audit
grep -r "API_KEY\|SECRET\|PASSWORD" src/
cat .npmignore
```

---

## 📁 .npmignore Verification

### For Each Package:

Ensure `.npmignore` excludes:
- [ ] Source files (src/)
- [ ] Test files (*.test.ts, __tests__, *.spec.ts)
- [ ] Benchmark files
- [ ] CI/CD configs (.github/, .gitlab-ci.yml)
- [ ] Development configs (.eslintrc, .prettierrc, tsconfig.json)
- [ ] .git directory
- [ ] node_modules/
- [ ] *.log files
- [ ] .env files
- [ ] IDE files (.vscode/, .idea/)

### Verify with:
```bash
cd /path/to/package
cat .npmignore
npm pack --dry-run
tar -tzf *.tgz | less  # Review what will be published
```

---

## 🌐 npm Registry Verification

### Pre-Publish Checks:

- [ ] **npm account** is logged in (`npm whoami`)
- [ ] **Package name is available** on npm
  - [ ] Check: `npm view @superinstance/package-name` (should fail)
- [ ] **Scoped access** is configured
  - [ ] Public: `npm access public`
- [ ] **Two-factor auth** enabled (recommended)
- [ ] **npm profile** is complete

### Verify with:
```bash
npm whoami
npm view @superinstance/webgpu-profiler  # Should fail (package doesn't exist yet)
npm profile get
```

---

## 🏷️ Version & Tagging

### For Each Package:

- [ ] **Version** follows semantic versioning (1.0.0)
- [ ] **Git tag** will be created (v1.0.0)
- [ ] **Tag pushed** to GitHub
- [ ] **GitHub release** created
- [ ] **CHANGELOG** updated for release

### Version policy:
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards compatible

---

## 🚀 Final Pre-Publish Check

### Run This Before Publishing:

```bash
#!/bin/bash
# Run from package directory

echo "🔍 Running pre-publish checks..."

# 1. Clean build
echo "📦 Cleaning..."
rm -rf dist/

# 2. Build
echo "🔨 Building..."
npm run build || exit 1

# 3. Type check
echo "🔍 Type checking..."
npm run type-check || exit 1

# 4. Lint
echo "🧹 Linting..."
npm run lint || exit 1

# 5. Tests
echo "🧪 Testing..."
npm test || exit 1

# 6. Check what will be published
echo "📋 Checking package contents..."
npm pack --dry-run || exit 1

# 7. Security audit
echo "🔒 Security audit..."
npm audit || exit 1

echo "✅ All checks passed! Ready to publish."
```

---

## 📝 Publishing Checklist (During Publish)

- [ ] Run `npm publish --dry-run` and review output
- [ ] Check file size and contents
- [ ] Run `npm publish` (actual publish)
- [ ] Verify package on npm: `npm view @superinstance/package-name`
- [ ] Install fresh: `npm install @superinstance/package-name@latest`
- [ ] Test installed package works
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Create GitHub release
- [ ] Update CHANGELOG.md

---

## ✅ Post-Publish Verification

### For Each Package:

- [ ] **Package is searchable** on npmjs.com
- [ ] **Installation works** (`npm install @superinstance/package-name`)
- [ ] **Import works** in new project
- [ ] **TypeScript types** are available
- [ ] **Documentation renders** correctly on npm
- [ ] **GitHub release** created with notes
- [ ] **Git tag** pushed and visible
- [ ] **README badges** show published version

### Verify with:
```bash
# Test installation in a fresh directory
mkdir /tmp/test-package
cd /tmp/test-package
npm init -y
npm install @superinstance/package-name
node -e "console.log(require('@superinstance/package-name'))"
```

---

## 📊 Publishing Success Criteria

### All Packages Must:

✅ Pass all pre-publish checks above
✅ Publish successfully to npm
✅ Be installable via npm
✅ Have TypeScript types available
✅ Have complete documentation
✅ Have MIT license
✅ Have GitHub release created
✅ Be tagged in git (v1.0.0)
✅ Have CHANGELOG.md updated

---

## 🚨 Common Issues & Solutions

### Issue: "Package name already exists"
**Solution:** Choose a different scoped name or check if you already published

### Issue: "402 Payment Required"
**Solution:** Run `npm access public` to publish scoped packages publicly

### Issue: "Cannot read property '0' of undefined"
**Solution:** Check package.json syntax, ensure all fields are valid

### Issue: "Types not found"
**Solution:** Ensure `types` field in package.json points to correct .d.ts file

### Issue: "File too large"
**Solution:** Check bundle size, exclude unnecessary files with .npmignore

---

## 📚 Resources

- [npm publish documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic versioning](https://semver.org/)
- [Package.json best practices](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
- [Scoped packages](https://docs.npmjs.com/cli/v9/using-npm/scope)

---

**Last Updated:** 2026-01-08
**Status:** Ready for Phase 1 publishing
