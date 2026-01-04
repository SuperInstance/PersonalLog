# PersonalLog Deployment Runbook

**Version:** 1.0.0
**Last Updated:** January 4, 2025

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Vercel Deployment](#vercel-deployment)
3. [Netlify Deployment](#netlify-deployment)
4. [Self-Hosted Deployment](#self-hosted-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Environment Preparation

**Required:**
- [ ] Node.js 18.0.0+ installed
- [ ] pnpm 8+ installed (or npm/yarn)
- [ ] Git repository initialized
- [ ] Environment variables configured
- [ ] AI provider API keys obtained (optional but recommended)

**Code Quality:**
- [ ] All tests passing: `npm test`
- [ ] Type check passing: `npm run type-check`
- [ ] Lint passing: `npm run lint`
- [ ] Build successful: `npm run build`
- [ ] No console errors in development
- [ ] All features working in development mode

### Environment Variables

**Required for Production:**
```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
PORT=3002

# Build
BUILD_WASM=false  # Set to true if building WASM in CI/CD

# Optional: AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
GROQ_API_KEY=...
PERPLEXITY_API_KEY=...
TOGETHER_AI_API_KEY=...

# Optional: Storage
PACKAGES_PATH=../packages
```

### Security Checks

- [ ] No API keys in source code
- [ ] `.env.local` in `.gitignore`
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] Rate limiting configured (if applicable)
- [ ] Security headers configured

---

## Vercel Deployment

### Option 1: One-Click Deploy (Recommended)

**Steps:**

1. **Click the Deploy Button**
   - Go to the repository README
   - Click the "Deploy with Vercel" button
   - Or visit: https://vercel.com/new/clone?repository-url=https://github.com/SuperInstance/PersonalLog

2. **Connect GitHub Account**
   - Sign in to Vercel
   - Authorize GitHub access
   - Select the PersonalLog repository

3. **Configure Project**
   - Project Name: `personallog` (or custom)
   - Framework Preset: `Next.js`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

4. **Environment Variables**
   - Add the environment variables listed above
   - **Never** commit API keys to git
   - Use Vercel's environment variable management

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Vercel will provide a URL: `https://personallog.vercel.app`

### Option 2: Manual Vercel Deploy

**Steps:**

1. **Install Vercel CLI**
   ```bash
   pnpm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**
   ```bash
   vercel env add OPENAI_API_KEY production
   vercel env add ANTHROPIC_API_KEY production
   # Add other variables...
   ```

5. **Redeploy**
   ```bash
   vercel --prod
   ```

### Vercel Configuration

**vercel.json** (optional, for custom configuration):
```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "BUILD_WASM": "false"
  }
}
```

### Custom Domain (Optional)

**Steps:**

1. Go to Vercel Project Settings → Domains
2. Add your domain: `app.yourdomain.com`
3. Configure DNS:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (5-30 minutes)
5. Vercel will automatically provision SSL

---

## Netlify Deployment

### Option 1: Netlify CLI

**Steps:**

1. **Install Netlify CLI**
   ```bash
   pnpm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Initialize**
   ```bash
   netlify init
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Option 2: Netlify Dashboard

**Steps:**

1. Go to https://netlify.com
2. Sign up/login
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub
5. Select PersonalLog repository
6. Configure build settings:
   - Build command: `pnpm build`
   - Publish directory: `.next`
   - Install command: `pnpm install`
7. Add environment variables
8. Deploy site

### Netlify Configuration

**netlify.toml**:
```toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"
```

---

## Self-Hosted Deployment

### Docker Deployment

**Dockerfile** (if not already present):
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  personallog:
    build: .
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=http://localhost:3002
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    restart: unless-stopped
```

**Deploy:**
```bash
docker-compose up -d
```

### Traditional VPS/Server

**Prerequisites:**
- Linux server (Ubuntu 20.04+ recommended)
- Node.js 18+
- pnpm 8+
- Nginx (for reverse proxy)
- PM2 (for process management)

**Steps:**

1. **Install Node.js and pnpm**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pnpm
   ```

2. **Clone Repository**
   ```bash
   git clone https://github.com/SuperInstance/PersonalLog.git
   cd PersonalLog
   ```

3. **Install Dependencies**
   ```bash
   pnpm install
   ```

4. **Build Application**
   ```bash
   pnpm build
   ```

5. **Configure Environment**
   ```bash
   cp .env.example .env.production
   nano .env.production
   # Add your environment variables
   ```

6. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start npm --name "personallog" -- start
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Post-Deployment Verification

### Smoke Tests

**Critical Features to Test:**

1. **Application Loads**
   - [ ] Homepage loads successfully
   - [ ] No console errors
   - [ ] Assets load correctly
   - [ ] Responsive design works

2. **AI Features**
   - [ ] AI providers page loads
   - [ ] Can create AI contact
   - [ ] Can start conversation
   - [ ] Streaming responses work

3. **Knowledge Features**
   - [ ] Knowledge browser loads
   - [ ] Can add knowledge entry
   - [ ] Semantic search works
   - [ ] Tags and collections work

4. **Settings**
   - [ ] Settings page loads
   - [ ] Can save settings
   - [ ] Data management works
   - [ ] Backup works

5. **Data Operations**
   - [ ] Export data works
   - [ ] Import data works
   - [ ] Data integrity checks pass

### Performance Checks

**Lighthouse Score:**
```bash
npm run -g lighthouse
lighthouse https://your-app.vercel.app --view
```

**Target Scores:**
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

**Load Testing:**
```bash
# Using Apache Bench
ab -n 1000 -c 10 https://your-app.vercel.app/
```

**Metrics:**
- [ ] Time to First Byte (TTFB) < 500ms
- [ ] First Contentful Paint (FCP) < 2s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Input Delay (FID) < 100ms

### Security Checks

**SSL Certificate:**
- [ ] Valid SSL certificate
- [ ] HTTPS redirects correctly
- [ ] No mixed content warnings

**Headers:**
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Content-Security-Policy set
- [ ] Strict-Transport-Security set

**API Security:**
- [ ] API keys not exposed
- [ ] Rate limiting works
- [ ] CORS configured correctly
- [ ] No sensitive data in responses

---

## Monitoring & Maintenance

### Application Monitoring

**Vercel Analytics:**
- Dashboard: https://vercel.com/analytics
- Metrics: Page views, unique visitors, top pages
- Performance: Core Web Vitals

**Error Monitoring:**

Consider using:
- Sentry (https://sentry.io)
- LogRocket (https://logrocket.com)
- Vercel Logs

**Setup Sentry (example):**
```bash
pnpm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Log Monitoring

**Vercel Logs:**
- Dashboard → Project → Logs
- Filter by status code, path, etc.
- Set up alerts for errors

**PM2 Logs (self-hosted):**
```bash
pm2 logs personallog
pm2 logs personallog --err  # Error logs only
```

### Uptime Monitoring

**Services:**
- UptimeRobot (https://uptimerobot.com)
- Pingdom (https://pingdom.com)
- StatusCake (https://statuscake.com)

**Configure:**
- Monitor URL: https://your-app.vercel.app
- Check interval: 1 minute
- Alert on: Down, SSL errors

### Backup Monitoring

**Automated Backups:**
- [ ] Backup schedule configured
- [ ] Backup notifications enabled
- [ ] Restore tested recently
- [ ] Backups stored off-site

### Update Management

**Dependencies:**
```bash
# Check for updates
pnpm outdated

# Update dependencies
pnpm update

# Test before deploying
npm test
npm run build
```

**Security Updates:**
```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## Rollback Procedures

### Vercel Rollback

**Option 1: Instant Rollback**
1. Go to Vercel Dashboard
2. Deployments tab
3. Find previous successful deployment
4. Click "Promote to Production"

**Option 2: Git Rollback**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

### Netlify Rollback

1. Go to Netlify Dashboard
2. Deploys tab
3. Find previous successful deploy
4. Click "Publish deploy"

### Self-Hosted Rollback

**PM2:**
```bash
# Stop current version
pm2 stop personallog

# Switch to previous version
git checkout <previous-tag-or-commit>
pnpm install
pnpm build

# Start previous version
pm2 start personallog
```

**Docker:**
```bash
# Stop current container
docker-compose down

# Switch to previous version
git checkout <previous-tag-or-commit>
docker-compose build

# Start previous version
docker-compose up -d
```

### Emergency Rollback (5 minutes)

1. **Identify the issue**
   - Check logs
   - Verify recent changes
   - Confirm deployment time

2. **Roll back immediately**
   - Vercel: Promote previous deployment
   - Netlify: Publish previous deploy
   - Self-hosted: `git reset --hard HEAD~1`

3. **Verify rollback**
   - Test critical features
   - Check logs
   - Monitor for 10 minutes

4. **Post-mortem**
   - Document the issue
   - Root cause analysis
   - Create fix plan
   - Test thoroughly
   - Redeploy when ready

---

## Troubleshooting

### Build Failures

**Issue: Build fails with "Module not found"**

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm build
```

**Issue: Build fails with type errors**

**Solution:**
```bash
# Check type errors
npm run type-check

# Fix errors in source code (not tests)
# Rebuild
npm run build
```

### Runtime Errors

**Issue: "Failed to fetch" API errors**

**Check:**
- API keys configured correctly
- API keys have sufficient credits
- CORS configured correctly
- Network connectivity

**Solution:**
```bash
# Verify environment variables
# In Vercel Dashboard → Settings → Environment Variables
# Ensure all required keys are set
```

**Issue: "Out of memory" errors**

**Solution:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Performance Issues

**Issue: Slow page loads**

**Check:**
- Lighthouse score
- Bundle size
- API response times
- Caching enabled

**Solution:**
```bash
# Check bundle size
npm run build
# Review output for large bundles

# Optimize images
# Enable compression
# Review caching strategy
```

### Deployment Issues

**Issue: Vercel deployment stuck**

**Solution:**
1. Cancel deployment
2. Clear cache: Vercel Dashboard → Settings → Git
3. Redeploy

**Issue: Environment variables not working**

**Check:**
- Variables set in correct environment (production)
- Variable names match exactly
- Restart deployment after adding variables

### Data Issues

**Issue: Data not persisting**

**Check:**
- Browser storage (IndexedDB) not cleared
- No storage quota exceeded
- Browser supports IndexedDB

**Solution:**
- Check browser console for storage errors
- Clear browser cache and retry
- Export data as backup

---

## Maintenance Schedule

### Daily
- Check error logs
- Monitor uptime
- Verify backups

### Weekly
- Review performance metrics
- Check for security updates
- Test backup restore

### Monthly
- Update dependencies
- Review and optimize performance
- Audit access controls
- Test disaster recovery

### Quarterly
- Major dependency updates
- Architecture review
- Cost optimization
- Security audit

---

## Contact & Support

**Documentation:**
- [Deployment Guide](DEPLOYMENT.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [FAQ](FAQ.md)

**Community:**
- GitHub Issues: https://github.com/SuperInstance/PersonalLog/issues
- GitHub Discussions: https://github.com/SuperInstance/PersonalLog/discussions

**Emergency Contacts:**
- Maintain an on-call rotation for production issues
- Document escalation procedures
- Have incident response plan ready

---

*Last Updated: January 4, 2025*
