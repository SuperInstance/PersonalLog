# Analytics System - Quick Start Guide

## 1-Minute Setup

```typescript
// app/layout.tsx
import { setupAnalytics } from '@/lib/analytics'

export default function Layout({ children }) {
  useEffect(() => {
    setupAnalytics() // Defaults are great
  }, [])

  return <div>{children}</div>
}
```

## Common Tasks

### Track a Message

```typescript
import { trackMessageSent } from '@/lib/analytics'

await trackMessageSent({
  conversationId: 'conv-123',
  messageLength: 120,
  hasAttachment: false,
})
```

### Track Feature Usage

```typescript
import { trackFeatureUsed } from '@/lib/analytics'

await trackFeatureUsed({
  featureId: 'summarization',
  duration: 5000,
  success: true,
})
```

### Track Error

```typescript
import { trackError } from '@/lib/analytics'

await trackError({
  errorType: 'NetworkError',
  errorMessage: 'Failed to fetch',
  context: 'api-call',
  recoverable: true,
})
```

## Query Examples

### Most Used Features (7 days)

```typescript
import { analytics } from '@/lib/analytics'

const features = await analytics.usage.getMostUsedFeatures(7)
```

### Performance Summary (7 days)

```typescript
const metrics = await analytics.performance.getMetrics(7)
const apiStats = await analytics.performance.getAPIStats(7)
```

### Error Stats (7 days)

```typescript
const errors = await analytics.errors.getStats(7)
const unrecovered = await analytics.errors.getUnrecovered(7)
```

### Engagement Summary (7 days)

```typescript
const summary = await analytics.engagement.getSummary(7)
const peakHours = await analytics.engagement.getPeakHours(7)
```

## Data Management

### Export Data

```typescript
const data = await analytics.data.export(30)
// Download as JSON
```

### Delete Old Data

```typescript
await analytics.data.delete(30) // Delete data older than 30 days
```

### Clear Everything

```typescript
await analytics.data.clearAll()
```

## Configuration

```typescript
analytics.updateConfig({
  enabled: false,        // Disable analytics
  samplingRate: 0.1,     // Track 10% of events
  retentionDays: 30,     // Keep data for 30 days
})
```

## Event Types Reference

| Category | Events |
|----------|--------|
| **User Actions** | `message_sent`, `conversation_created`, `conversation_archived`, `settings_changed`, `ai_contact_created`, `search_performed` |
| **Performance** | `app_initialized`, `api_response`, `render_complete`, `storage_operation` |
| **Engagement** | `session_start`, `session_end`, `feature_used`, `page_view` |
| **Errors** | `error_occurred`, `error_recovered` |
| **Feature Flags** | `feature_enabled`, `feature_disabled`, `feature_evaluated` |

## Query Categories

```typescript
// Usage
analytics.usage.getMostUsedFeatures(days, limit)
analytics.usage.getFeatureUsage(featureId, days)

// Engagement
analytics.engagement.getSummary(days)
analytics.engagement.getPeakHours(days)
analytics.engagement.getDailySessions(days)

// Performance
analytics.performance.getMetrics(days)
analytics.performance.getAPIStats(days)
analytics.performance.getRenderStats(days)

// Errors
analytics.errors.getStats(days, limit)
analytics.errors.getRate(context, hours)
analytics.errors.getUnrecovered(days)

// Actions
analytics.actions.getMessageStats(days)
analytics.actions.getConversationStats(days)

// Data
analytics.data.export(days)
analytics.data.delete(days)
analytics.data.getStorageInfo()
```

## Privacy Guarantees

✅ All data stored locally (IndexedDB)
✅ No PII collected
✅ No cloud syncing
✅ User can view/export/delete all data
✅ Can be disabled entirely

## Full Documentation

See `/docs/research/analytics-system.md` for complete documentation.
