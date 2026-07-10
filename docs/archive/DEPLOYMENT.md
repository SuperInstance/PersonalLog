# PersonalLog Deployment Guide

This guide covers deploying PersonalLog to production using Vercel.

## Table of Contents

- [Platform Overview](#platform-overview)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Deployment Process](#deployment-process)
- [Preview Deployments](#preview-deployments)
- [Custom Domains](#custom-domains)
- [Monitoring & Analytics](#monitoring--analytics)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Platform Overview

### Why Vercel?

PersonalLog uses **Vercel** for production deployment because:

- **Native Next.js Support** - Built by the Next.js team, zero configuration required
- **Automatic Preview Deployments** - Every PR gets a live preview URL
- **Edge Functions** - API routes run on Edge for better performance
- **Built-in Analytics** - Web Vitals and performance metrics included
- **Zero-Downtime Deployments** - Instant rollbacks and incremental static regeneration
- **WASM Support** - Excellent support for WebAssembly modules
- **Free Tier** - 100GB bandwidth, unlimited deployments, team collaboration

### Alternative: Netlify

If you prefer Netlify, PersonalLog is compatible. See the [Netlify Alternative](#netlify-alternative) section.

---

## Quick Start

### 1. Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended for first deployment)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Configure environment variables (see below)
6. Click **"Deploy"**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### 3. Configure Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required for production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
BUILD_WASM=false

# Optional: Add AI provider API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

See [Environment Configuration](#environment-configuration) for complete list.

### 4. Verify Deployment

Your app is now live at `https://your-app.vercel.app`!

---

## Environment Configuration

### Required Variables

These must be set for production:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Base URL for PWA manifest |
| `BUILD_WASM` | `false` | Skip WASM build on Vercel (uses pre-built artifacts) |

### Optional Variables

AI Provider API Keys (can be added later in Settings UI):

| Variable | Provider | Get Key |
|----------|----------|---------|
| `OPENAI_API_KEY` | OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Anthropic | [console.anthropic.com](https://console.anthropic.com/) |
| `GOOGLE_API_KEY` | Google | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| `XAI_API_KEY` | X.ai | [console.x.ai](https://console.x.ai/) |
| `DEEPSEEK_API_KEY` | DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/) |
| `KIMI_API_KEY` | Kimi | [platform.moonshot.cn](https://platform.moonshot.cn/) |
| `ZAI_API_KEY` | Z.ai | [open.bigmodel.cn](https://open.bigmodel.cn/) |

### Feature Flags

Control app behavior without redeploying:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_PWA` | `true` | Enable PWA features |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Enable analytics tracking |
| `NEXT_PUBLIC_EXPERIMENTAL_FEATURES` | `false` | Enable experimental features |
| `NEXT_PUBLIC_HARDWARE_DETECTION` | `true` | Enable adaptive optimization |
| `NEXT_PUBLIC_ENABLE_KNOWLEDGE` | `true` | Enable knowledge base |
| `NEXT_PUBLIC_ENABLE_AI_CONTACTS` | `true` | Enable AI contact system |

### Setting Environment Variables in Vercel

1. Go to **Dashboard** → **Your Project** → **Settings** → **Environment Variables**
2. Add each variable with its value
3. Select appropriate environments (Production, Preview, Development)
4. **Important:** After adding variables, you must redeploy:
   - Go to **Deployments** → Click **...** on latest deployment → **Redeploy**

### Variable Precedence

1. **Production Environment** variables (highest priority)
2. **Preview Environment** variables
3. **Development Environment** variables
4. `.env.local` (local development only)
5. `.env.example` defaults (lowest priority)

---

## Deployment Process

### Automatic Deployments

Vercel automatically deploys when you:

1. **Push to `main` branch** → Production deployment
2. **Push to other branches** → Preview deployment
3. **Create Pull Request** → Preview deployment with comment
4. **Merge PR** → Production deployment

### Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
git checkout my-feature
vercel
```

### Build Process

The build process:

1. **Install dependencies** - `npm install`
2. **Skip WASM build** - `BUILD_WASM=false` (uses pre-built artifacts)
3. **Run tests** - `npm run test` (configured in CI)
4. **Build app** - `npm run build`
5. **Deploy** - Upload to Vercel Edge Network

### Build Logs

Monitor build progress in Vercel Dashboard → Deployments → Click deployment ID.

---

## Preview Deployments

### Automatic Previews

Every Pull Request gets a unique preview URL:

```
https://personallog-git-feature-branch.username.vercel.app
```

### Preview Features

- **Auto-comment** - Vercel comments on PR with deployment status
- **Live Updates** - Preview updates with every commit
- **Auto-teardown** - Previews expire after 7 days (configurable)
- **Shareable** - Anyone with the URL can view preview

### Preview Environment Variables

Set preview-specific variables in Vercel Dashboard:

- Settings → Environment Variables → Select **"Preview"** environment
- Useful for testing with staging APIs

### Disabling Previews

To disable previews for specific branches:

1. Go to **Settings** → **Git**
2. Under **"Ignored Build Steps"**, add:
   ```
   if [ "$VERCEL_GIT_COMMIT_REF" == "branch-name" ]; then exit 1; fi
   ```

---

## Custom Domains

### Adding a Custom Domain

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `app.personallog.com`)
4. Choose your domain type:
   - **Production** - Points to main deployment
   - **Preview** - Points to preview deployments (`*.preview.personallog.com`)

### DNS Configuration

Vercel will provide DNS records to add:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Domain Verification

After adding DNS records:

1. Wait for DNS propagation (usually < 30 minutes)
2. Vercel will auto-detect and issue SSL certificate
3. Domain status changes to **"Valid Configuration"**

### Redirects

Set up redirects in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/old-path",
      "destination": "/new-path",
      "permanent": true
    }
  ]
}
```

---

## Monitoring & Analytics

### Vercel Analytics

Automatically enabled for all deployments:

- **Page Views** - Track visitor traffic
- **Web Vitals** - CLS, FID, LCP, FCP, TTFB
- **Top Pages** - Most visited pages
- **Geographic Data** - Visitor locations
- **Device Data** - Desktop vs mobile

**View Analytics:**
Dashboard → Your Project → Analytics

### Custom Analytics

#### Google Analytics

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

2. Add to `app/layout.tsx`:
   ```tsx
   <Script
     src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"
     strategy="afterInteractive"
   />
   ```

#### PostHog Analytics

1. Set environment variables:
   ```bash
   NEXT_PUBLIC_POSTHOG_KEY=phc_...
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

#### Sentry Error Tracking

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://...
   ```

2. Install Sentry SDK:
   ```bash
   npm install @sentry/nextjs
   ```

### Performance Monitoring

Check performance in Vercel Dashboard:

- **Build Duration** - How long builds take
- **Function Execution** - API route performance
- **Edge Network** - CDN cache hit rates
- **Bandwidth Usage** - Total bandwidth consumed

---

## Performance Optimization

### Caching Strategy

PersonalLog uses aggressive caching for optimal performance:

| Asset Type | Cache Duration | Strategy |
|------------|---------------|----------|
| Static assets (JS/CSS/WASM) | 1 year | Immutable, content hash |
| Icons (PNG/SVG) | 1 week | Cache-Control header |
| Manifest | 1 day | Cache-Control header |
| Service Worker | No cache | Must-revalidate |
| API routes | No cache | No-store |

### CDN Optimization

Vercel automatically:

- Serves assets from 100+ edge locations worldwide
- Compresses responses (gzip, brotli)
- Minifies JavaScript and CSS
- Optimizes images (WebP, AVIF)
- HTTP/2 and HTTP/3 support

### Bundle Size

Current bundle sizes:

```bash
# Check bundle size
npm run build

# Target sizes:
# - First Load JS: < 200 KB
# - Total page size: < 500 KB
```

### Monitoring Performance

Use these tools to monitor performance:

- **Vercel Analytics** - Built-in Web Vitals
- **Lighthouse** - Run in Chrome DevTools
- **PageSpeed Insights** - [pagespeed.web.dev](https://pagespeed.web.dev)
- **WebPageTest** - [webpagetest.org](https://webpagetest.org)

---

## Troubleshooting

### Build Failures

#### WASM Build Failure

**Problem:** Build fails with "wasm-pack not found"

**Solution:** Set environment variable:
```bash
BUILD_WASM=false
```

#### Module Not Found

**Problem:** "Cannot find module './component'"

**Solution:**
1. Check file imports use correct casing
2. Run `npm install` to ensure dependencies
3. Clear cache: `rm -rf .next node_modules && npm install`

#### TypeScript Errors

**Problem:** Build fails with TypeScript errors

**Solution:**
1. Run locally: `npm run type-check`
2. Fix errors in IDE
3. Ensure `tsconfig.json` is correct

### Runtime Errors

#### API Route 404

**Problem:** API routes return 404

**Solution:**
1. Check file path: `src/app/api/route.ts`
2. Ensure file exports named export: `export async function GET()`
3. Check `vercel.json` rewrites configuration

#### Environment Variables Undefined

**Problem:** `process.env.VARIABLE` is undefined

**Solution:**
1. Check variable name (case-sensitive)
2. Ensure variable added in Vercel Dashboard
3. Redeploy after adding variables
4. Use `NEXT_PUBLIC_` prefix for client-side variables

#### PWA Not Installing

**Problem:** PWA install prompt doesn't appear

**Solution:**
1. Check service worker registered: `navigator.serviceWorker`
2. Verify manifest.json is accessible
3. Check app is served over HTTPS
4. Ensure site meets [PWA installability criteria](https://web.dev/install-criteria/)

### Performance Issues

#### Slow Initial Load

**Problem:** First page load takes > 3 seconds

**Solutions:**
1. Check build size: `npm run build`
2. Enable image optimization
3. Use dynamic imports for heavy components
4. Check Vercel Analytics for bottlenecks

#### High Memory Usage

**Problem:** App crashes with out of memory

**Solutions:**
1. Check for memory leaks in useEffect hooks
2. Limit IndexedDB cache size
3. Use React.memo for expensive components
4. Profile with Chrome DevTools Memory panel

### Deployment Issues

#### Deployment Stuck

**Problem:** Deployment stuck in "Building" state

**Solutions:**
1. Cancel deployment and redeploy
2. Check GitHub Actions for conflicts
3. Verify build logs in Vercel Dashboard
4. Contact Vercel support if persists

#### Wrong Version Deployed

**Problem:** Deployment doesn't include latest commits

**Solutions:**
1. Verify commit pushed to GitHub
2. Check correct branch is deployed
3. Clear Vercel cache: Redeploy with "Skip Cache" enabled
4. Check for stale Git fetch: `git fetch origin`

---

## Rollback Procedures

### Instant Rollback

Vercel keeps all deployment history:

1. Go to **Deployments** in Dashboard
2. Find the deployment you want to rollback to
3. Click **"Promote to Production"**
4. Done! Instant rollback with zero downtime

### Rollback via CLI

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Emergency Rollback

If production is critically broken:

1. **Immediate rollback** (above)
2. **Issue fix** in new branch
3. **Test** on preview deployment
4. **Deploy** to production when ready

### Rollback Best Practices

- Always test on preview before production
- Keep deployment descriptions clear
- Monitor after deployment for 15 minutes
- Have rollback procedure documented
- Tag stable releases in Git

---

## Advanced Configuration

### Multi-Environment Setup

Configure separate environments:

```bash
# Production (main branch)
NEXT_PUBLIC_APP_URL=https://app.personallog.com
NODE_ENV=production

# Staging (develop branch)
NEXT_PUBLIC_APP_URL=https://staging.personallog.com
NODE_ENV=staging

# Preview (PRs)
NEXT_PUBLIC_APP_URL=https://personallog-git-pr.vercel.app
NODE_ENV=development
```

### Branch Protection

Require reviews before deploying:

1. Go to **Settings** → **Git** → **Branch Protection**
2. Enable "Protected Branches"
3. Require reviews for `main` branch
4. Enable "Require status checks to pass"

### Deployment Hooks

Add custom deployment scripts in `vercel.json`:

```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "github": {
    "silent": true
  }
}
```

### Monorepo Configuration

If deploying from a monorepo:

```json
{
  "framework": null,
  "buildCommand": "cd apps/personallog && npm run build",
  "outputDirectory": "apps/personallog/.next"
}
```

---

## Netlify Alternative

If you prefer Netlify instead of Vercel:

### Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"
  BUILD_WASM = "false"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Environment Variables

Add in Netlify Dashboard → Site → Settings → Environment Variables:

Same variables as Vercel (see above).

### Deploy to Netlify

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click **"Add new site"** → **"Import an existing project"**
4. Select your GitHub repository
5. Configure build settings
6. Click **"Deploy site"**

---

## Security Checklist

Before deploying to production:

- [ ] Environment variables set correctly
- [ ] API keys not committed to Git
- [ ] `.env.local` in `.gitignore`
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Custom domain configured (optional)
- [ ] Rate limiting on API routes (if needed)
- [ ] CORS configured for external requests
- [ ] Security headers set ( CSP, XSS Protection)
- [ ] Service Worker validated
- [ ] Analytics configured (optional)

---

## Support & Resources

### Official Documentation

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI](https://vercel.com/docs/cli)

### Community

- [Vercel Discord](https://vercel.com/discord)
- [Next.js GitHub](https://github.com/vercel/next.js)
- [PersonalLog Issues](https://github.com/SuperInstance/PersonalLog/issues)

### Getting Help

If you encounter issues:

1. Check Vercel build logs
2. Search existing GitHub issues
3. Ask in Vercel Discord
4. Create new GitHub issue with details

---

**Deployment Status:** ✅ Production Ready

**Last Updated:** 2025-01-02

**Version:** 1.0.0
