# Agent 1 Briefing: Frontend & UI Audit

**Starting Point:** `src/app/`
**Focus:** React components, pages, UI implementation

---

## Your Mission

Audit the entire frontend of PersonalLog starting from `src/app/`. Examine all pages, layouts, components, and UI implementation. Create a detailed markdown report of findings.

---

## Areas to Audit

### 1. Pages (src/app/*)
- All page.tsx files
- Route groups and layouts
- Navigation structure
- Meta tags and SEO

### 2. Components (src/components/*)
- Reusable components
- Page-specific components
- Provider components
- Dashboard components
- Settings components

### 3. UI/UX Issues
- Inconsistent styling
- Missing loading states
- Missing error states
- Empty states not handled
- Dark mode issues
- Responsive design gaps

### 4. Accessibility
- Missing ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast

### 5. Performance
- Unnecessary re-renders
- Large component trees
- Missing React.memo
- Unoptimized lists
- Client-only patterns

---

## Audit Process

1. **Read all page files** in src/app/
2. **Read all component files** in src/components/
3. **Test each route** conceptually (analyze code paths)
4. **Check for:**
   - Missing 'use client' where needed
   - Inconsistent imports
   - Duplicate code
   - Missing error boundaries
   - Unsafe patterns

---

## Output Format

Create `.agents/audit/agent-1-findings.md` with:

```markdown
# Frontend & UI Audit Findings

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

### Component Structure
- Are components properly separated?
- Are props well-typed?
- Are components reusable?
- Is there duplicate code?

### State Management
- Is useState used correctly?
- Are there missing dependencies in useEffect?
- Is there unnecessary state?
- Could state be lifted?

### Performance
- Are large lists virtualized?
- Are there unnecessary re-renders?
- Are heavy operations memoized?
- Is lazy loading used?

### Error Handling
- Are error boundaries present?
- Are errors displayed to users?
- Is there error recovery?
- Are errors logged?

### Accessibility
- Do buttons have accessible names?
- Do forms have labels?
- Is focus managed?
- Are ARIA labels used?

---

Start your audit from `src/app/page.tsx` and work through all pages and components. Be thorough and specific in your findings.

---

**Good luck, Agent!** The quality of the UI depends on your audit.
