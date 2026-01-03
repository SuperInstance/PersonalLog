# Round 6 Agent Briefings - Performance & Reliability

**Round Goal:** Make the app fast, reliable, and production-grade with 95+ Lighthouse scores
**Orchestrator:** Claude Sonnet 4.5
**Date:** 2025-01-02
**Dependencies:** Round 5 complete

---

## Agent 1: Performance Optimization Expert

### Mission
Eliminate all jank, optimize bundle sizes, and achieve 95+ Lighthouse scores across all metrics.

### Context
- PersonalLog is already well-optimized (75-80% faster from Phase 2 improvements)
- Uses React.memo, useMemo, useCallback throughout
- Has VirtualList for large lists
- Need to push to excellence: 95+ Lighthouse, <2s TTI

### Deliverables
1. **Lighthouse Audit & Fixes**
   - Run comprehensive Lighthouse audit
   - Fix all performance issues identified
   - Target: 95+ Performance, 100 Accessibility, 100 Best Practices, 95+ SEO
   - Document all changes made

2. **Bundle Optimization**
   - Analyze bundle with webpack-bundle-analyzer
   - Code-split large components
   - Lazy load non-critical routes
   - Remove unused dependencies
   - Target: <500KB gzipped total

3. **Runtime Performance**
   - Identify and eliminate main-thread blocking
   - Optimize expensive renders
   - Add requestIdleCallback for non-urgent work
   - Use Web Workers for heavy computations
   - Target: 60 FPS during all interactions

4. **Asset Optimization**
   - Compress all images (WebP/AVIF)
   - Add font-display: swap
   - Preload critical resources
   - Defer non-critical CSS/JS
   - Implement resource hints (preconnect, dns-prefetch)

5. **Performance Budgets**
   - Set performance budgets in package.json
   - Add CI/CD performance regression tests
   - Create performance.md documentation

### Success Criteria
- [ ] Lighthouse score 95+ across all metrics
- [ ] Time to Interactive < 2s on 4G
- [ ] First Contentful Paint < 1s
- [ ] Bundle size < 500KB gzipped
- [ ] 60 FPS during all user interactions
- [ ] Performance budgets enforced in CI

---

## Agent 2: Error Monitoring Specialist

### Mission
Add comprehensive error tracking and logging to catch all errors in production.

### Context
- PersonalLog has error boundaries but no centralized tracking
- Need to catch JavaScript errors, React errors, API errors
- Should integrate with Sentry or similar
- Must respect user privacy

### Deliverables
1. **Error Tracking Integration**
   - Integrate Sentry (or equivalent)
   - Configure source maps for error debugging
   - Add user context (hardware profile, performance class)
   - Filter out sensitive information
   - Add error breadcrumbs

2. **Error Classification**
   - Categorize errors (critical, warning, info)
   - Add error recovery mechanisms
   - Create error recovery UI
   - Document common errors and solutions

3. **Logging System**
   - Add structured logging (development vs production)
   - Log key user actions
   - Log performance metrics
   - Add export logs functionality for debugging

4. **Error Dashboard**
   - Create settings page for error viewing
   - Show recent errors with context
   - Allow users to export error logs
   - Add "Report Issue" functionality

5. **Privacy-First Configuration**
   - Don't log personal data
   - Allow users to opt-out of error tracking
   - Store logs locally first
   - Clear documentation of what's logged

### Success Criteria
- [ ] All errors captured and categorized
- [ ] Error tracking works in production
- [ ] Users can view and export their error logs
- [ ] Privacy controls documented and respected
- [ ] Error recovery mechanisms work

---

## Agent 3: Caching Strategy Engineer

### Mission
Implement aggressive caching strategy for instant loads and offline support.

### Context
- PWA service worker exists but can be optimized
- Need better caching strategies for different resource types
- Should support stale-while-revalidate patterns
- Must handle cache invalidation properly

### Deliverables
1. **Service Worker Optimization**
   - Improve existing service worker caching strategy
   - Implement cache-first for static assets
   - Implement network-first for API calls
   - Add stale-while-revalidate for HTML
   - Implement cache versioning and invalidation

2. **API Response Caching**
   - Add IndexedDB caching for API responses
   - Implement cache tags for invalidation
   - Add background sync for offline requests
   - Show stale data while fetching fresh

3. **Asset Caching**
   - Cache all static assets (JS, CSS, images)
   - Implement prefetch for likely navigation
   - Add runtime caching for dynamic imports
   - Use cache headers effectively

4. **Cache Management UI**
   - Add settings page showing cache size
   - Allow users to clear cache
   - Show cache hit/miss statistics
   - Add cache health monitoring

5. **Offline-First Enhancements**
   - Improve offline fallback page
   - Add offline indicators in UI
   - Queue actions when offline, sync when online
   - Test and document offline behavior

### Success Criteria
- [ ] Second-page load < 500ms (from cache)
- [ ] Offline mode works for all core features
- [ ] Cache invalidation works correctly
- [ ] Users can manage their cache
- [ ] Cache statistics are visible

---

## Agent 4: Regression Testing Engineer

### Mission
Create performance regression test suite that catches performance degradation.

### Context
- PersonalLog has smoke tests (Round 5) and integration tests
- No automated performance regression tests
- Need to catch bundle size bloat and runtime slowdowns
- Should integrate into CI/CD pipeline

### Deliverables
1. **Lighthouse CI**
   - Set up Lighthouse CI in GitHub Actions
   - Run against every PR
   - Fail PR if scores drop by >5 points
   - Upload Lighthouse reports as artifacts
   - Show performance trends over time

2. **Bundle Size Tracking**
   - Track bundle size in CI/CD
   - Fail PR if bundle grows >10%
   - Categorize size by route/chunk
   - Add bundle size comments to PRs

3. **Runtime Performance Tests**
   - Create Playwright tests for key interactions
   - Measure frame rate during scrolling
   - Measure time to interactive for key pages
   - Test with slow 3G networks
   - Benchmark expensive operations

4. **Performance Budget Enforcement**
   - Add performance-budget.json config
   - Enforce budgets in CI/CD
   - Document how to adjust budgets
   - Create performance budget dashboard

5. **Performance Regression Documentation**
   - Create docs/performance-testing.md
   - Document how to run performance tests
   - Document how to fix common regressions
   - Add performance troubleshooting guide

### Success Criteria
- [ ] Lighthouse CI runs on every PR
- [ ] Bundle size tracked and enforced
- [ ] Performance budgets prevent regressions
- [ ] Runtime tests catch slowdowns
- [ ] Performance tests documented
- [ ] CI/CD fails on performance regression

---

## Round 6 Success Criteria

### Overall Round Goals
- [ ] Lighthouse score 95+ across all metrics
- [ ] Error tracking catches all errors
- [ ] Caching provides instant loads
- [ ] Performance tests prevent regressions
- [ ] Documentation complete

### Integration Requirements
- All performance improvements must work together
- Error monitoring must not impact performance
- Caching must work with error tracking
- Tests must validate all systems

### Dependencies
- Round 5 must be complete (deployment, smoke tests)
- Need production deployment URL for testing
- Need working CI/CD from Round 5

---

*Round 6 Briefings Prepared*
*4 Agents Ready*
*Expected Completion: 20 files, 4,000 lines*
