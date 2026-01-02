# Agent 4 Briefing: Documentation & DX Audit

**Starting Point:** `docs/`, `README.md`, `package.json`
**Focus:** Documentation completeness, developer experience

---

## Your Mission

Audit all documentation and the overall developer experience starting from docs and configuration files. Identify gaps, inconsistencies, and areas for improvement. Create a detailed markdown report of findings.

---

## Areas to Audit

### 1. Documentation Files (docs/*)
- INTEGRATION.md - Integration architecture
- SETTINGS_GUIDE.md - Settings user guide
- TESTING.md - Testing documentation
- BUILD.md - Build instructions (if exists)
- Any other documentation

### 2. Root Documentation
- README.md - Project overview
- CONTRIBUTING.md - Contribution guide (if exists)
- LICENSE - License file
- CHANGELOG.md - Changelog (if exists)

### 3. Code Documentation
- JSDoc comments in source
- README files in subdirectories
- Inline code comments
- Type documentation

### 4. Developer Experience
- package.json scripts
- Development setup
- Build process
- Test running
- Error messages

### 5. Configuration Files
- tsconfig.json - TypeScript config
- next.config.js - Next.js config
- vitest.config.ts - Vitest config
- playwright.config.ts - Playwright config
- .eslintrc, .prettierrc (if exist)

---

## Audit Process

1. **Read all documentation files**
2. **Check for:**
   - Missing documentation
   - Outdated information
   - Inconsistent formatting
   - Unclear instructions
   - Missing examples

3. **Verify:**
   - Setup instructions work
   - Commands are correct
   - Links are valid
   - Code examples work
   - API docs match code

---

## Output Format

Create `.agents/audit/agent-4-findings.md` with:

```markdown
# Documentation & DX Audit Findings

## Critical Issues (P0)
- [ ] Issue 1
- [ ] Issue 2

## High Priority (P1)
- [ ] Issue 1
- [ ] Issue 2

## Medium Priority (P2)
- [ ] Issue 1
- [ ] Issue 2

## Low Priority (P3)
- [ ] Issue 1
- [ ] Issue 2

## Debugging Focus Areas
- Area 1: description
- Area 2: description

## Research Opportunities
- Opportunity 1: description
- Opportunity 2: description
```

---

## Specific Checks

### Documentation Completeness
- Is there a getting started guide?
- Are all APIs documented?
- Are all components documented?
- Are all settings explained?
- Are troubleshooting steps included?

### Documentation Quality
- Is the writing clear?
- Are there examples for everything?
- Are diagrams included where helpful?
- Is the tone consistent?
- Is it well-organized?

### Developer Setup
- Can a new developer start quickly?
- Are prerequisites clear?
- Are all dependencies documented?
- Is environment setup documented?
- Are common tasks documented?

### Code Comments
- Are complex functions explained?
- Are non-obvious decisions documented?
- Are workarounds noted?
- Are TODO/FIXME comments addressed?
- Are parameter types documented?

### Configuration
- Is TypeScript configured strictly?
- Are lint rules enabled?
- Are format rules enforced?
- Are test configurations correct?
- Are build options optimized?

---

Start your audit from `README.md` and work through all documentation files. Also check package.json for scripts and dependencies.

---

**Good luck, Agent!** The developer experience depends on your audit.
