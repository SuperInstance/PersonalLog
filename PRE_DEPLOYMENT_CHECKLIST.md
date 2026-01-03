# Pre-Deployment Checklist

Use this checklist before deploying PersonalLog to production.

## Phase 1: Code Readiness

- [ ] All tests passing locally (`npm run test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Deployment verification passes (`npm run verify:deployment`)
- [ ] Bundle size acceptable (< 500KB gzipped)
- [ ] No console errors in production build
- [ ] All features working in production build

## Phase 2: Environment Configuration

- [ ] `.env.example` updated with all variables
- [ ] All required environment variables set in Vercel Dashboard
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] `BUILD_WASM=false` set for deployment
- [ ] AI provider API keys added (if using)
- [ ] Feature flags configured correctly
- [ ] No sensitive data in environment variables
- [ ] Environment variables tested in preview deployment

## Phase 3: Documentation

- [ ] `DEPLOYMENT.md` is up to date
- [ ] `README.md` deployment section is current
- [ ] Changelog updated (if applicable)
- [ ] Migration notes documented (if breaking changes)
- [ ] Environment variables documented in `.env.example`
- [ ] API changes documented (if applicable)

## Phase 4: Testing

- [ ] Smoke tests passing (`npm run test:smoke`)
- [ ] Integration tests passing
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Accessibility tests passing (`npm run test:a11y`)
- [ ] Performance tests acceptable (`npm run test:perf`)
- [ ] Manual testing completed on staging/preview
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari)
- [ ] Mobile testing completed (iOS Safari, Android Chrome)
- [ ] PWA installation tested
- [ ] Service worker functioning correctly

## Phase 5: Security

- [ ] No API keys or secrets in code
- [ ] `.env.local` in `.gitignore`
- [ ] Dependencies audited (`npm audit`)
- [ ] No high/critical vulnerabilities
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] CORS configured correctly
- [ ] Rate limiting on API routes (if needed)
- [ ] Content Security Policy configured (if needed)

## Phase 6: Performance

- [ ] Lighthouse score > 90 on all metrics
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms
- [ ] Time to Interactive < 3.5s
- [ ] Images optimized and lazy-loaded
- [ ] Bundle size optimized and code-split
- [ ] CDN caching configured correctly
- [ ] Service worker caching strategy verified

## Phase 7: Monitoring & Analytics

- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry or similar)
- [ ] Performance monitoring configured
- [ ] Custom analytics configured (if using)
- [ ] Web Vitals tracking enabled
- [ ] API error monitoring set up
- [ ] Uptime monitoring configured
- [ ] Alert notifications configured

## Phase 8: Deployment Configuration

- [ ] `vercel.json` configuration correct
- [ ] Build command verified
- [ ] Output directory correct
- [ ] Node version specified
- [ ] Environment variables configured
- [ ] Headers configured (CSP, CORS, etc.)
- [ ] Redirects configured (if needed)
- [ ] Caching strategy configured
- [ ] Custom domain configured (if applicable)

## Phase 9: Preview Deployment

- [ ] Preview deployment successful
- [ ] Preview URL accessible
- [ ] All features tested on preview
- [ ] Environment variables working
- [ ] API routes responding correctly
- [ ] No console errors
- [ ] Performance acceptable on preview
- [ ] Team members have tested preview

## Phase 10: Production Deployment

- [ ] Main branch up to date
- [ ] All PRs merged
- [ ] No uncommitted changes
- [ ] Deployment initiated
- [ ] Build logs show no errors
- [ ] Deployment successful
- [ ] Production URL accessible
- [ ] Smoke tests passing on production
- [ ] Critical paths tested on production

## Phase 11: Post-Deployment

- [ ] Monitor error logs for 15 minutes
- [ ] Check Web Vitals in Vercel Analytics
- [ ] Verify no increase in error rate
- [ ] Test all critical user flows
- [ ] Check API response times
- [ ] Verify data persistence (IndexedDB)
- [ ] Test PWA installation
- [ ] Monitor performance metrics
- [ ] Check mobile functionality
- [ ] Verify cross-browser compatibility

## Phase 12: Rollback Preparation

- [ ] Previous deployment recorded
- [ ] Rollback procedure documented
- [ ] Team knows rollback process
- [ ] Database backup available (if applicable)
- [ ] Feature flags ready to disable features
- [ ] Emergency communication plan ready

## Quick Deploy Command

```bash
# Verify before deploying
npm run verify:deployment

# Deploy to production
vercel --prod

# Or use Vercel Dashboard
# Dashboard → Deployments → Deploy
```

## Emergency Rollback

If critical issues are found:

```bash
# Via CLI
vercel rollback <previous-deployment-url>

# Via Dashboard
# Dashboard → Deployments → Previous deployment → Promote to Production
```

## Notes

- Complete all items in each phase before proceeding
- If any item fails, fix before deploying
- Keep detailed records of deployments
- Monitor for at least 24 hours after deployment
- Collect feedback and metrics for next deployment

---

**Last Updated:** 2025-01-02
**Version:** 1.0.0
