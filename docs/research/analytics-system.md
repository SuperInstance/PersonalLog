# PersonalLog Analytics System

## Overview

The PersonalLog Analytics System is a **privacy-first, local-only** usage analytics solution designed to track user behavior, performance metrics, and engagement patterns without compromising user privacy. All data is stored locally in IndexedDB with no cloud synchronization.

### Key Features

- **Privacy First**: All data stored locally (IndexedDB), no PII collected, no cloud syncing
- **Non-Blocking**: Event logging doesn't impact app performance
- **Rich Insights**: Comprehensive queries for usage, performance, and engagement
- **Efficient Storage**: Batch writes and configurable retention policies
- **Type Safe**: Full TypeScript support with discriminated unions
- **Queryable**: Easy-to-use API for common analytics patterns

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (messages, conversations, settings, features, etc.)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Analytics API                             │
│           (convenience functions, tracking)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    ▼         ▼
┌──────────────────────┐  ┌───────────────────────┐
│   Event Collector    │  │   Query API           │
│                      │  │                       │
│ • Batching           │  │ • Usage queries       │
│ • Session tracking   │  │ • Performance queries │
│ • Sampling           │  │ • Error queries       │
│ • Privacy checks     │  │ • Engagement queries  │
└──────────┬───────────┘  └───────────┬───────────┘
           │                          │
           └──────────┬───────────────┘
                      ▼
           ┌──────────────────────┐
           │  IndexedDB Storage   │
           │                      │
           │ • Events store       │
           │ • Metadata store     │
           │ • Indexed queries    │
           └──────────────────────┘
```

## Installation & Setup

### 1. Initialize on App Startup

```typescript
// app/layout.tsx or root component
import { analytics, setupAnalytics } from '@/lib/analytics'

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize analytics
    setupAnalytics({
      enabled: true,
      persist: true,
      maxEvents: 100000,
      retentionDays: 90,
    })
  }, [])

  return <div>{children}</div>
}
```

### 2. Track Events Throughout Your App

```typescript
import { analytics, trackMessageSent, trackFeatureUsed } from '@/lib/analytics'

// Track a message being sent
await trackMessageSent({
  conversationId: 'conv-123',
  messageLength: 120,
  hasAttachment: false,
})

// Track feature usage
await trackFeatureUsed({
  featureId: 'voice-input',
  duration: 5000,
  success: true,
})

// Or use the generic track method
await analytics.track('conversation_created', {
  type: 'conversation_created',
  conversationType: 'personal',
  hasAIContact: true,
})
```

## Event Types

### User Actions

| Event Type | Description | Key Properties |
|------------|-------------|----------------|
| `message_sent` | User sends a message | `conversationId`, `messageLength`, `hasAttachment` |
| `conversation_created` | New conversation created | `conversationType`, `hasAIContact` |
| `conversation_archived` | Conversation archived | `messageCount`, `conversationAge` |
| `settings_changed` | Settings modified | `setting`, `previousValue`, `newValue` |
| `ai_contact_created` | AI contact/persona created | `provider`, `model`, `customPrompt` |
| `search_performed` | Search executed | `queryLength`, `resultCount`, `searchType` |

### Performance Events

| Event Type | Description | Key Properties |
|------------|-------------|----------------|
| `app_initialized` | App startup completed | `initTime`, `componentsLoaded` |
| `api_response` | API call completed | `endpoint`, `method`, `duration`, `success` |
| `render_complete` | Component rendered | `component`, `duration`, `elementCount` |
| `storage_operation` | IndexedDB operation | `operation`, `store`, `duration`, `success` |

### Engagement Events

| Event Type | Description | Key Properties |
|------------|-------------|----------------|
| `session_start` | User session starts | `source`, `previousSessionTime` |
| `session_end` | User session ends | `duration`, `actionsPerformed` |
| `feature_used` | Feature interaction | `featureId`, `duration`, `success` |
| `page_view` | Page navigation | `page`, `referrer`, `loadTime` |

### Error Events

| Event Type | Description | Key Properties |
|------------|-------------|----------------|
| `error_occurred` | Error happened | `errorType`, `errorMessage`, `context`, `recoverable` |
| `error_recovered` | Error was recovered | `errorType`, `recoveryStrategy`, `recoveryTime` |

## Query API

### Usage Queries

#### Get Most Used Features

```typescript
import { analytics } from '@/lib/analytics'

// Top 10 features in the last 7 days
const features = await analytics.usage.getMostUsedFeatures(7, 10)

// Example output:
// [
//   {
//     featureId: 'voice-input',
//     usageCount: 245,
//     lastUsed: '2025-01-02T10:30:00Z',
//     totalDuration: 122500,
//     averageDuration: 500,
//     successRate: 0.95,
//     trend: 'increasing'
//   }
// ]
```

#### Get Feature Adoption Rate

```typescript
const adoption = await analytics.usage.getFeatureAdoptionRate('voice-input', 30)

// Example output:
// {
//   uniqueUsers: 45,
//   totalUsers: 100,
//   adoptionRate: 0.45,
//   trend: 'increasing'
// }
```

### Engagement Queries

#### Get Engagement Summary

```typescript
const summary = await analytics.engagement.getSummary(7)

// Example output:
// {
//   totalSessions: 23,
//   totalSessionTime: 3450,
//   avgSessionDuration: 150,
//   avgMessagesPerSession: 8.5,
//   mostActiveDay: '2025-01-01',
//   mostActiveHour: 14,
//   peakUsageHours: [9, 14, 19],
//   retentionRate: 0.65
// }
```

#### Get Peak Usage Hours

```typescript
const peakHours = await analytics.engagement.getPeakHours(7)
// Returns: [9, 14, 19] - 9am, 2pm, 7pm
```

#### Get Daily Active Sessions

```typescript
const dailySessions = await analytics.engagement.getDailySessions(30)

// Example output:
// [
//   { date: '2025-01-01', sessions: 12 },
//   { date: '2025-01-02', sessions: 15 },
//   // ... more days
// ]
```

### Performance Queries

#### Get Performance Metrics

```typescript
const metrics = await analytics.performance.getMetrics(7)

// Example output:
// [
//   {
//     category: '/api/chat',
//     avgDuration: 245,
//     p95Duration: 450,
//     p99Duration: 680,
//     successRate: 0.98,
//     totalOperations: 1234,
//     trend: 'improving'
//   }
// ]
```

#### Get API Response Stats

```typescript
const apiStats = await analytics.performance.getAPIStats(7)

// Example output:
// {
//   count: 1500,
//   sum: 367500,
//   average: 245,
//   min: 45,
//   max: 1200,
//   percentiles: {
//     p50: 220,
//     p90: 380,
//     p95: 450,
//     p99: 680
//   }
// }
```

#### Get Render Performance

```typescript
const renderStats = await analytics.performance.getRenderStats(7)

// Example output:
// [
//   {
//     component: 'ConversationList',
//     avgDuration: 45,
//     p95: 78
//   }
// ]
```

### Error Queries

#### Get Error Statistics

```typescript
const errors = await analytics.errors.getStats(7, 10)

// Example output:
// [
//   {
//     errorType: 'NetworkError',
//     count: 12,
//     lastOccurred: '2025-01-02T10:30:00Z',
//     recoverable: true,
//     recoveryRate: 0.83,
//     avgRecoveryTime: 1200,
//     trend: 'decreasing'
//   }
// ]
```

#### Get Error Rate

```typescript
const errorRate = await analytics.errors.getRate('api', 24)

// Example output:
// {
//   totalErrors: 5,
//   totalEvents: 500,
//   errorRate: 0.01, // 1%
//   errorTypes: {
//     'NetworkError': 3,
//     'ValidationError': 2
//   }
// }
```

#### Get Unrecovered Errors

```typescript
const unrecovered = await analytics.errors.getUnrecovered(7)

// Example output:
// [
//   {
//     errorType: 'CriticalStorageError',
//     count: 2,
//     lastOccurred: '2025-01-02T09:15:00Z'
//   }
// ]
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: true,                    // Master switch
  persist: true,                    // Persist to IndexedDB
  maxEvents: 100000,                // Max events to store
  batchSize: 50,                    // Batch write size
  batchInterval: 5000,              // Batch interval (ms)
  detailedPerformance: true,        // Track detailed metrics
  trackErrors: true,                // Track errors
  sessionTimeout: 1800000,          // 30 minutes
  retentionDays: 90,                // Keep data for 90 days
  samplingRate: 1.0,                // Track 100% of events
}
```

### Custom Configuration

```typescript
await analytics.initialize({
  // Disable analytics entirely
  enabled: false,

  // Reduce storage footprint
  maxEvents: 50000,
  retentionDays: 30,

  // Sample 10% of events
  samplingRate: 0.1,

  // Batch more aggressively
  batchSize: 100,
  batchInterval: 10000,

  // Disable error tracking
  trackErrors: false,
})
```

### Dynamic Configuration

```typescript
// Update configuration at runtime
analytics.updateConfig({
  enabled: false, // Disable analytics
})

// Get current config
const config = analytics.getConfig()
```

## Data Management

### Export Analytics Data

```typescript
const exportData = await analytics.data.export(30)

// Returns:
// {
//   exportedAt: '2025-01-02T11:00:00Z',
//   timeRange: { start: '...', end: '...' },
//   eventCount: 15000,
//   events: [...],
//   summaries: { ... }
// }

// Download as JSON
const blob = new Blob([JSON.stringify(exportData, null, 2)], {
  type: 'application/json',
})
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `analytics-export-${Date.now()}.json`
a.click()
```

### Delete Analytics Data

```typescript
// Delete data older than 30 days
await analytics.data.delete(30)

// Clear all analytics data
await analytics.data.clearAll()
```

### Get Storage Info

```typescript
const info = await analytics.data.getStorageInfo()

// Returns:
// {
//   eventCount: 15234,
//   estimatedSizeBytes: 7617000,
//   estimatedSizeMB: 7.26
// }
```

## Integration Examples

### Message Tracking

```typescript
// In your message sending logic
import { trackMessageSent } from '@/lib/analytics'

async function sendMessage(conversationId: string, content: string) {
  const startTime = performance.now()

  try {
    // ... send message logic ...

    await trackMessageSent({
      conversationId,
      messageLength: content.length,
      hasAttachment: false,
    })
  } catch (error) {
    // Error will be tracked separately
  }
}
```

### Feature Usage Tracking

```typescript
// Track when user uses voice input
import { trackFeatureUsed } from '@/lib/analytics'

function startVoiceInput() {
  const startTime = Date.now()

  // ... voice input logic ...

  trackFeatureUsed({
    featureId: 'voice-input',
    duration: Date.now() - startTime,
    success: true,
  })
}
```

### Performance Monitoring

```typescript
// Wrap API calls with analytics
import { trackAPIResponse } from '@/lib/analytics'

async function fetchWithAnalytics(url: string, options: RequestInit) {
  const startTime = performance.now()
  let success = false
  let statusCode: number | undefined

  try {
    const response = await fetch(url, options)
    success = response.ok
    statusCode = response.status
    return response
  } catch (error) {
    success = false
    throw error
  } finally {
    const duration = performance.now() - startTime
    await trackAPIResponse({
      endpoint: url,
      method: options.method || 'GET',
      duration,
      success,
      statusCode,
    })
  }
}
```

### Error Tracking

```typescript
// Global error handler
import { trackError } from '@/lib/analytics'

window.addEventListener('error', (event) => {
  trackError({
    errorType: event.error?.name || 'Error',
    errorMessage: event.message,
    context: 'global',
    recoverable: true,
    stack: event.error?.stack,
  })
})
```

## Privacy Guarantees

1. **Local Only**: All data stored in IndexedDB, no cloud sync
2. **No PII**: No personally identifiable information collected
3. **User Control**: Users can export/delete their data
4. **Transparent**: Open source, auditable code
5. **Configurable**: Can be disabled entirely

## Performance Impact

- **Non-blocking**: Events buffered and written in batches
- **Minimal overhead**: ~1-2ms per event (in-memory)
- **Efficient storage**: IndexedDB with proper indexing
- **Configurable sampling**: Reduce events if needed
- **Lazy aggregation**: Queries run on-demand

## Best Practices

### 1. Track Meaningful Events

```typescript
// Good - Track specific feature usage
await trackFeatureUsed({
  featureId: 'summarization',
  duration: 5000,
  success: true,
})

// Avoid - Too generic
await analytics.track('action', { type: 'action' })
```

### 2. Use Proper Data Types

```typescript
// Good - Strong typing
await analytics.track('message_sent', {
  type: 'message_sent',
  conversationId: 'conv-123',
  messageLength: 120,
  hasAttachment: false,
})

// Avoid - Loose typing
await analytics.track('message_sent', {
  type: 'message_sent',
  data: { /* anything goes */ },
})
```

### 3. Don't Track Sensitive Data

```typescript
// Good - No sensitive content
await analytics.track('message_sent', {
  type: 'message_sent',
  messageLength: 120, // Just length, not content
})

// Avoid - Tracking actual message content
await analytics.track('message_sent', {
  type: 'message_sent',
  content: 'User's private message', // DON'T DO THIS
})
```

### 4. Handle Analytics Failures Gracefully

```typescript
try {
  await trackMessageSent(data)
} catch (error) {
  // Analytics failures shouldn't break the app
  console.warn('Failed to track event:', error)
}
```

## API Reference

See individual type definitions in `src/lib/analytics/types.ts` for complete API documentation.

## Future Enhancements

- [ ] Cloud sync (opt-in)
- [ ] Real-time dashboards
- [ ] Custom event definitions
- [ ] A/B testing support
- [ ] Funnel analysis
- [ ] Cohort analysis
- [ ] Anomaly detection
