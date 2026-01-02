# PWA & Performance Quick Start Guide

## Overview
This guide helps you quickly apply the PWA and performance improvements implemented in PersonalLog.

---

## Step 1: Create App Icons (Required)

You need to create icon files for the PWA to work properly. Use these sizes:

### Required Icons
```
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png
- favicon.ico
- apple-touch-icon.png
- og-image.png (1200x630)
```

### Quick Generation Tools
- **Favicon.io:** https://favicon.io/
- **RealFaviconGenerator:** https://realfavicongenerator.net/
- **Canva:** Create a 512x512 design, then export in multiple sizes

### Placement
Put all icons in: `/mnt/c/users/casey/PersonalLog/public/`

---

## Step 2: Apply VirtualList to Existing Components

### Priority 1: Message Lists

**File:** `src/components/messenger/MessageList.tsx` (or similar)

Replace current list implementation with:
```tsx
import { VirtualList } from "@/components/ui/VirtualList";

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <VirtualList
      items={messages}
      renderItem={(message) => (
        <MessageItem key={message.id} message={message} />
      )}
      height="calc(100vh - 200px)"
      itemHeight={100}
      overscan={5}
      getKey={(msg) => msg.id}
      className="w-full"
    />
  );
}
```

### Priority 2: Conversation Lists

**File:** `src/components/messenger/ConversationList.tsx` (or similar)

```tsx
import { VirtualList } from "@/components/ui/VirtualList";

function ConversationList({ conversations }: { conversations: Conversation[] }) {
  return (
    <VirtualList
      items={conversations}
      renderItem={(conversation) => (
        <ConversationItem key={conversation.id} conversation={conversation} />
      )}
      height={600}
      itemHeight={80}
      overscan={5}
      getKey={(conv) => conv.id}
    />
  );
}
```

### Priority 3: Knowledge Base

**File:** `src/components/knowledge/KnowledgeList.tsx` (or similar)

```tsx
import { VirtualList } from "@/components/ui/VirtualList";

function KnowledgeList({ articles, loading, onLoadMore }: Props) {
  return (
    <VirtualList
      items={articles}
      renderItem={(article) => (
        <ArticleCard key={article.id} article={article} />
      )}
      height={800}
      itemHeight={200}
      overscan={5}
      getKey={(article) => article.id}
      onLoadMore={onLoadMore}
      loading={loading}
      loadThreshold={300}
    />
  );
}
```

---

## Step 3: Test PWA Functionality

### Local Testing
```bash
cd /mnt/c/users/casey/PersonalLog
npm run dev
```

### Browser DevTools Check

1. **Open Chrome DevTools:**
   - F12 or Right-click → Inspect

2. **Check Service Worker:**
   - Go to Application tab → Service Workers
   - Verify "sw.js" is registered and active

3. **Check Cache Storage:**
   - Go to Application tab → Cache Storage
   - Look for caches: `personallog-v1-shell`, `personallog-v1-api`, etc.

4. **Check Manifest:**
   - Go to Application tab → Manifest
   - Verify all fields are correct

### Lighthouse Audit

1. Open DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App" check
4. Click "Analyze page load"
5. Target: Score 90+

### Offline Testing

1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Reload page
4. Verify:
   - App shell loads
   - Offline page appears for API calls
   - Cached content displays

---

## Step 4: SEO Verification

### Social Sharing Test

1. **Facebook Debugger:**
   - https://developers.facebook.com/tools/debug/
   - Enter your URL
   - Verify Open Graph tags

2. **Twitter Card Validator:**
   - https://cards-dev.twitter.com/validator
   - Enter your URL
   - Verify card preview

3. **Rich Results Test:**
   - https://search.google.com/test/rich-results
   - Verify structured data

### Sitemap Check

Visit: `http://localhost:3002/sitemap.xml`

Should show:
- Home page (priority 1.0)
- Messenger (priority 0.9)
- Longform (priority 0.8)
- Dashboard (priority 0.7)

### Robots.txt Check

Visit: `http://localhost:3002/robots.txt`

Should show:
- Allow: /
- Disallow: /api/
- Sitemap reference

---

## Step 5: Performance Testing

### Test with Large Datasets

Create a test component with 10,000 items:

```tsx
// test-large-list.tsx
import { VirtualList } from "@/components/ui/VirtualList";

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
  description: `This is item number ${i}`,
}));

export default function TestLargeList() {
  return (
    <div style={{ height: "100vh", padding: "20px" }}>
      <h1>10,000 Items Test</h1>
      <VirtualList
        items={items}
        renderItem={(item) => (
          <div className="p-4 border-b">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
          </div>
        )}
        height={600}
        itemHeight={80}
        overscan={5}
        getKey={(item) => item.id}
      />
    </div>
  );
}
```

### Performance Metrics

Monitor these in DevTools → Performance tab:
- **First Contentful Paint (FCP):** < 1.8s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.8s
- **Cumulative Layout Shift (CLS):** < 0.1
- **First Input Delay (FID):** < 100ms

---

## Step 6: Production Deployment

### Build Check
```bash
npm run build
```

Verify:
- Build completes successfully
- Service worker is included in `.next/static`
- No warnings about manifest

### Environment Variables
Ensure these are set for production:
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### HTTPS Requirement
PWA requires HTTPS. Ensure your host provides:
- HTTPS certificate
- Service worker support

---

## Common Issues & Solutions

### Issue: Service Worker Not Registering

**Solution:**
- Check browser console for errors
- Verify `sw.js` is in `public/` folder
- Ensure you're on localhost or HTTPS
- Clear cache and reload

### Issue: Icons Not Showing

**Solution:**
- Verify icon files exist in `public/`
- Check file paths in `manifest.json`
- Clear browser cache
- Regenerate icons with correct sizes

### Issue: VirtualList Not Rendering Items

**Solution:**
- Check that container has explicit height
- Verify `itemHeight` is reasonable estimate
- Ensure `getKey` returns unique values
- Check console for React warnings

### Issue: Caching Not Working

**Solution:**
- Open DevTools → Application → Service Workers
- Click "Update on reload"
- Unregister service worker
- Hard refresh (Ctrl+Shift+R)
- Check cache storage is enabled

---

## Success Criteria

✅ PWA Checklist:
- [ ] Installable on mobile
- [ ] Works offline
- [ ] Launches from home screen
- [ ] Has splash screen
- [ ] Service worker active
- [ ] Caches configured

✅ SEO Checklist:
- [ ] Open Graph tags work
- [ ] Twitter cards display
- [ ] Structured data valid
- [ ] Sitemap accessible
- [ ] Robots.txt correct
- [ ] Canonical URLs set

✅ Performance Checklist:
- [ ] Lighthouse score 90+
- [ ] Large lists scroll smoothly
- [ ] Second load instant (<1s)
- [ ] Memory usage stable
- [ ] No layout shift

---

## Next Steps

### Immediate (This Week)
1. Create all icon sizes
2. Apply VirtualList to message/conversation lists
3. Run Lighthouse audit
4. Fix any issues found

### Short-term (Next Sprint)
1. Add background sync for offline actions
2. Implement push notifications
3. Create performance monitoring dashboard
4. Add more sophisticated caching strategies

### Long-term (Future)
1. IndexedDB integration for large datasets
2. Service worker streaming for API responses
3. predictive caching based on user behavior
4. Custom offline editing capabilities

---

## Support & Resources

**Documentation:**
- PWA: https://web.dev/progressive-web-apps/
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Next.js Metadata: https://nextjs.org/docs/app/building-your-application/optimizing/metadata

**Testing Tools:**
- Lighthouse: Built into Chrome DevTools
- WebPageTest: https://www.webpagetest.org/
- PageSpeed Insights: https://pagespeed.web.dev/

**Community:**
- MDN Web Docs
- Stack Overflow (tag: pwa)
- Next.js Discord

---

Last updated: 2025-01-02
