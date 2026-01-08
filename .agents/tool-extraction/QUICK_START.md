# Tool Extraction Quick Start

**For:** Extraction Teams
**When:** Start of Phase 1
**Time to Read:** 5 minutes

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Understand Your Tool (5 min)
Read the catalog section for your tool:
- Hardware Detection: Tool #3 in catalog
- Cascade Router: Tool #2 in catalog
- Analytics: Tool #4 in catalog
- Spreader: Tool #1 in catalog
- Plugin System: Tool #5 in catalog

### Step 2: Explore the Code (15 min)
```bash
cd /mnt/c/users/casey/personallog/src/lib
ls -la <your-tool-directory>/

# Read the main file
cat <your-tool-directory>/index.ts

# Check dependencies
grep -r "import.*@/" <your-tool-directory>/
```

### Step 3: Create Extraction Plan (30 min)
Create a file: `<tool>-extraction-plan.md`
```markdown
# <Tool> Extraction Plan

## Files to Extract
- file1.ts - purpose
- file2.ts - purpose

## PersonalLog Dependencies to Remove
- @/types/conversation -> extract type
- @/lib/storage -> use interface

## New Package Structure
<tool-name>/
├── src/
└── ...

## Extraction Steps
1. [ ] Copy files
2. [ ] Remove dependencies
3. [ ] Fix imports
4. [ ] Test
5. [ ] Document
```

### Step 4: Start Extracting! (Go!)
```bash
mkdir -p packages/<tool-name>
cd packages/<tool-name>
npm init -y
# Start extracting!
```

---

## 📋 Extraction Checklist (Print This)

### Phase 1: Code Extraction (Days 1-2)
- [ ] Copy source files to new package
- [ ] Identify all PersonalLog dependencies
- [ ] Remove or replace PersonalLog imports
- [ ] Fix TypeScript errors
- [ ] Run existing tests
- [ ] Fix broken tests
- [ ] Verify 80%+ coverage

### Phase 2: Package Setup (Day 3)
- [ ] Create package.json
- [ ] Setup TypeScript config
- [ ] Add build scripts
- [ ] Configure ESLint/Prettier
- [ ] Setup Jest/Vitest
- [ ] Add .npmignore

### Phase 3: Documentation (Days 3-4)
- [ ] Write README with:
  - [ ] Clear value proposition (1-2 sentences)
  - [ ] 5-minute quick start
  - [ ] Installation instructions
  - [ ] API reference
  - [ ] 3+ examples
- [ ] Add JSDoc comments to public APIs
- [ ] Create CONTRIBUTING.md
- [ ] Add LICENSE file

### Phase 4: Examples (Day 4)
- [ ] Example 1: Basic usage
- [ ] Example 2: Advanced usage
- [ ] Example 3: Integration with other tools
- [ ] Test all examples work

### Phase 5: Testing (Day 5)
- [ ] Unit tests (all public functions)
- [ ] Integration tests (real usage)
- [ ] Performance tests (if applicable)
- [ ] Manual testing (examples work)
- [ ] All tests passing

### Phase 6: Publishing (Day 5)
- [ ] Build package: `npm run build`
- [ ] Dry-run publish: `npm publish --dry-run`
- [ ] Tag release: `git tag v1.0.0`
- [ ] Publish to npm: `npm publish`
- [ ] Verify installable: `npm install @superinstance/<tool>`

---

## 🎯 Success Criteria

Your tool extraction is successful when:

✅ **Zero PersonalLog Dependencies**
```bash
# Check this:
grep -r "@/lib" src/
grep -r "@/types" src/
# Should return nothing (or only node_modules)
```

✅ **Installs as Standalone**
```bash
cd /tmp
mkdir test-<tool>
cd test-<tool>
npm init -y
npm install @superinstance/<tool>
# Works without any PersonalLog packages
```

✅ **Tests Pass**
```bash
npm test
# All tests passing
# Coverage ≥ 80%
```

✅ **Documentation Complete**
```bash
cat README.md
# Has: value prop, quick start, API reference, examples
```

✅ **Examples Work**
```bash
cd examples/basic
node index.js
# Runs without errors
```

---

## ⚡ Quick Commands

### Initialize New Package
```bash
mkdir -p packages/<tool-name>
cd packages/<tool-name>
npm init -y

npm install --save-dev \
  typescript \
  @types/node \
  jest \
  @types/jest \
  ts-jest \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier
```

### Setup TypeScript
```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF
```

### Setup Jest
```bash
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/types.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
EOF
```

### Setup Package Scripts
```bash
# Add to package.json scripts:
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

### Setup .npmignore
```bash
cat > .npmignore << 'EOF'
src/
__tests__/
*.test.ts
tsconfig.json
jest.config.js
.eslintrc.js
.prettierrc
.git/
.github/
EOF
```

---

## 🔍 Common Issues & Solutions

### Issue: "Cannot find module '@/lib/...'"
**Solution:** Extract the dependency or remove it
```typescript
// BEFORE
import { storage } from '@/lib/storage'

// AFTER - Extract interface
export interface Storage {
  get(key: string): Promise<any>
}

// Or remove if not needed
```

### Issue: Tests failing after extraction
**Solution:** Update test imports
```typescript
// BEFORE
import { myFunction } from '@/lib/my-tool'

// AFTER
import { myFunction } from '../index'
```

### Issue: Type errors
**Solution:** Extract types or use `any` temporarily
```typescript
// EXTRACT TYPE
export interface MyType {
  id: string
  name: string
}

// OR USE ANY (temporarily, with TODO)
// TODO: Extract this type from PersonalLog
function process(data: any) {
  // ...
}
```

### Issue: Circular dependencies
**Solution:** Use lazy imports or interfaces
```typescript
// LAZY IMPORT
function loadTool() {
  return require('./other-tool')
}

// OR INTERFACE
export interface OtherTool {
  method(): void
}
```

---

## 📊 Progress Tracking

### Daily Update Template
```markdown
## <Tool Name> - Day X

### Completed
- [x] Extracted files X, Y, Z
- [x] Removed dependency A
- [x] Fixed test B

### In Progress
- [ ] Removing dependency C (50% done)
- [ ] Writing documentation (started)

### Blockers
- **Issue:** Dependency D is complex
- **Solution:** Discussing with architecture team
- **ETA:** Tomorrow

### Tomorrow's Plan
1. Finish dependency C
2. Start documentation
3. Get unblocked on D
```

### Weekly Summary Template
```markdown
## <Tool Name> - Week X Summary

### Accomplishments
- Extracted core files
- Removed all PersonalLog dependencies
- All tests passing
- Documentation 80% complete

### Metrics
- Files extracted: 15
- Dependencies removed: 8
- Tests passing: 45/45 (100%)
- Coverage: 87%

### Next Week
- Finish documentation
- Create examples
- Publish to npm

### Risks
- None currently
```

---

## 🆘 Getting Help

### I'm Stuck! (15 min rule)
- Try for 15 minutes
- Check documentation
- Search codebase for similar patterns
- Then ask in `#extraction-questions`

### Blocker (>1 hour impact)
- Post immediately in `#extraction-updates`
- Tag @architecture
- We'll swarm on it

### Decision Needed
- Document the options
- Post in `#extraction-questions`
- Architecture team will decide within 2 hours

### Completed Extraction
- Post in `#extraction-updates`
- Request code review
- Celebrate! 🎉

---

## ✅ Final Checklist Before Publishing

- [ ] All PersonalLog dependencies removed
- [ ] All tests passing (≥80% coverage)
- [ ] README complete with:
  - [ ] Clear value proposition
  - [ ] Installation instructions
  - [ ] Quick start guide
  - [ ] API reference
  - [ ] 3+ examples
- [ ] Build working: `npm run build`
- [ ] Dry-run successful: `npm publish --dry-run`
- [ ] Code review approved
- [ ] Tagged release: `git tag v1.0.0`
- [ ] Published: `npm publish`
- [ ] Verified: `npm install @superinstance/<tool>` works

---

## 🎉 You're Ready!

**Remember:**
- Focus on one tool at a time
- Ask questions early
- Celebrate small wins
- We're building something amazing

**Go forth and extract!** 🚀

---

**Quick Start Version:** 1.0
**Last Updated:** 2026-01-07
**Maintained By:** Architecture Team
