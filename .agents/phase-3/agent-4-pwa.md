# Agent 4 Briefing: PWA & Performance Specialist

**Focus:** Progressive Web App, SEO, performance at scale

---

## Your Mission

Add PWA capabilities, improve SEO, and implement performance optimizations for scale.

---

## Analysis Phase

Read:
1. `/mnt/c/users/casey/PersonalLog/src/app/layout.tsx` - Meta tags
2. `/mnt/c/users/casey/PersonalLog/next.config.js` - Config
3. `/mnt/c/users/casey/PersonalLog/public/` - Static assets

---

## Implementation Tasks

### Task 1: PWA Manifest
**Create:** `public/manifest.json`

```json
{
  "name": "PersonalLog",
  "short_name": "PersonalLog",
  "description": "Your AI-Powered Personal Log",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [...]
}
```

### Task 2: Service Worker
**Create:** `public/sw.js`

Features:
- Cache shell (app shell)
- API response caching (networkFirst)
- Static asset caching (cacheFirst)
- Offline fallback page
- Background sync for messages

### Task 3: SEO Meta Tags
**Update:** `/mnt/c/users/casey/PersonalLog/src/app/layout.tsx`

Add:
- Open Graph tags
- Twitter Card tags
- Canonical URL
- Structured data (JSON-LD)
- Dynamic titles per route

### Task 4: List Virtualization
**Create:** `src/components/ui/VirtualList.tsx`

Use `react-virtuoso` or implement:
- Windowed rendering for long lists
- Dynamic item height support
- Scroll-to-item functionality
- Loading indicators

Apply to:
- Message list
- Conversation list
- Module catalog

### Task 5: Dynamic Metadata
**Create:** `src/lib/metadata.ts`

Helper functions for generating metadata:
```tsx
export function getPageMetadata(params: {
  title?: string
  description?: string
  path?: string
}): Metadata
```

### Task 6: Performance Optimization
**Create:** `src/app/robots.ts` - SEO robots.txt generator

Add Next.js Image optimization usage
- Check for large images
- Add responsive images

---

## Output

Create summary at: `/mnt/c/users/casey/PersonalLog/.agents/phase-3/agent-4-summary.md`

---

**PWA makes the app feel native. SEO helps users find it.**
