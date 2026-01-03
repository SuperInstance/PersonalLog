# Analytics Pipeline - Usage Examples

## Quick Start

### 1. Initialize Analytics

```typescript
import { analytics, initializePipeline } from '@/lib/analytics'

// In your app initialization
await analytics.initialize({
  enabled: true,
  persist: true,
  maxEvents: 100000,
  retentionDays: 90,
})

// Or use the pipeline for advanced features
await initializePipeline({
  autoInsights: true,
  autoCleanup: true,
  retentionDays: 90,
})
```

### 2. Track Events

```typescript
import { analytics } from '@/lib/analytics'

// Track a message sent
await analytics.track('message_sent', {
  type: 'message_sent',
  conversationId: 'conv-123',
  messageLength: 120,
  hasAttachment: false,
  replyToMessage: true,
})

// Track an API call
await analytics.track('api_response', {
  type: 'api_response',
  endpoint: '/api/chat',
  method: 'POST',
  duration: 245,
  success: true,
  statusCode: 200,
})

// Track a feature usage
await analytics.track('feature_used', {
  type: 'feature_used',
  featureId: 'knowledge-search',
  duration: 5000,
  success: true,
})

// Track an error
await analytics.track('error_occurred', {
  type: 'error_occurred',
  errorType: 'NetworkError',
  errorMessage: 'Failed to fetch',
  context: 'api-call',
  recoverable: true,
})
```

### 3. Query Analytics

```typescript
// Get engagement summary
const engagement = await analytics.engagement.getSummary(7)
console.log(engagement.totalSessions)      // 45
console.log(engagement.avgSessionDuration) // 300 (seconds)

// Get performance metrics
const performance = await analytics.performance.getMetrics(7)
performance.forEach(metric => {
  console.log(`${metric.category}: ${metric.avgDuration}ms`)
})

// Get error statistics
const errors = await analytics.errors.getStats(7, 10)
errors.forEach(error => {
  console.log(`${error.errorType}: ${error.count} times`)
})

// Get feature usage
const features = await analytics.usage.getMostUsedFeatures(7, 10)
features.forEach(feature => {
  console.log(`${feature.featureId}: ${feature.usageCount} uses`)
})
```

### 4. Generate Insights

```typescript
import { generateRecentInsights, getTodaysSummary } from '@/lib/analytics'

// Generate insights for last 7 days
const insights = await generateRecentInsights(7)
insights.forEach(insight => {
  console.log(`[${insight.severity}] ${insight.title}`)
  console.log(`  ${insight.description}`)
})

// Get today's summary
const summary = await getTodaysSummary()
console.log(summary.summary) // "You sent 234 messages across 45 sessions"
console.log(summary.stats.totalMessages)
console.log(summary.patterns)
console.log(summary.suggestions)
```

### 5. Use the Pipeline

```typescript
import { getAnalyticsPipeline } from '@/lib/analytics'

const pipeline = getAnalyticsPipeline()

// Get comprehensive report
const report = await pipeline.getReport(7)
console.log(report.overview)
console.log(report.engagement)
console.log(report.performance)
console.log(report.insights)

// Get real-time snapshot
const snapshot = await pipeline.getSnapshot()
console.log(snapshot.now.activeSession)
console.log(snapshot.today.messages)

// Generate daily summary
const daily = await pipeline.getDailySummary()
console.log(daily.summary)
console.log(daily.stats)

// Export data
const exportData = await pipeline.exportData(30)
// Returns JSON with all events, summaries, metadata

// Cleanup old data
const deletedCount = await pipeline.cleanup(90)
console.log(`Deleted ${deletedCount} old events`)
```

## Event Tracking Examples

### Track User Actions

```typescript
// Message events
await analytics.track('message_sent', {
  type: 'message_sent',
  conversationId: 'conv-123',
  messageLength: 120,
  hasAttachment: false,
  attachmentTypes: ['image'],
  replyToMessage: true,
  responseTime: 5000,
})

await analytics.track('conversation_created', {
  type: 'conversation_created',
  conversationType: 'chat',
  hasAIContact: true,
})

await analytics.track('search_performed', {
  type: 'search_performed',
  queryLength: 15,
  resultCount: 23,
  searchType: 'conversations',
})

await analytics.track('settings_changed', {
  type: 'settings_changed',
  setting: 'ui.theme',
  previousValue: 'light',
  newValue: 'dark',
})
```

### Track Performance

```typescript
// App initialization
await analytics.track('app_initialized', {
  type: 'app_initialized',
  initTime: 450,
  componentsLoaded: ['router', 'store', 'analytics'],
  failedComponents: [],
})

// API calls
const startTime = performance.now()
const response = await fetch('/api/chat')
const duration = performance.now() - startTime

await analytics.track('api_response', {
  type: 'api_response',
  endpoint: '/api/chat',
  method: 'POST',
  duration,
  success: response.ok,
  statusCode: response.status,
})

// Component rendering
const renderStart = performance.now()
// ... render component ...
const renderDuration = performance.now() - renderStart

await analytics.track('render_complete', {
  type: 'render_complete',
  component: 'ChatArea',
  duration: renderDuration,
  elementCount: 150,
})
```

### Track Errors

```typescript
try {
  await riskyOperation()
} catch (error) {
  await analytics.track('error_occurred', {
    type: 'error_occurred',
    errorType: error.name,
    errorMessage: error.message,
    context: 'risky-operation',
    recoverable: true,
    stack: error.stack,
  })
}

// Track recovery
await analytics.track('error_recovered', {
  type: 'error_recovered',
  errorType: 'NetworkError',
  recoveryStrategy: 'retry',
  recoveryTime: 2500,
})
```

### Track Engagement

```typescript
// Session tracking
await analytics.track('session_start', {
  type: 'session_start',
  source: 'direct',
  previousSessionTime: 3600000, // 1 hour ago
})

// Later, when session ends
await analytics.track('session_end', {
  type: 'session_end',
  duration: 1800, // 30 minutes
  actionsPerformed: 45,
  messagesSent: 23,
  featuresUsed: ['chat', 'search', 'knowledge'],
})

// Feature usage
await analytics.track('feature_used', {
  type: 'feature_used',
  featureId: 'voice-input',
  duration: 15000,
  success: true,
  context: { language: 'en' },
})
```

## React Integration

### useAnalytics Hook

```typescript
import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

function useAnalytics(featureId: string) {
  useEffect(() => {
    const startTime = Date.now()

    // Track feature usage on mount
    analytics.track('feature_used', {
      type: 'feature_used',
      featureId,
    })

    // Track session start
    return () => {
      const duration = Date.now() - startTime
      analytics.track('feature_used', {
        type: 'feature_used',
        featureId: `${featureId}-duration`,
        duration,
        success: true,
      })
    }
  }, [featureId])
}

// Usage
function ChatComponent() {
  useAnalytics('chat')

  return <div>...</div>
}
```

### Performance Wrapper

```typescript
import { analytics } from '@/lib/analytics'

export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  context: string
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now()
    try {
      const result = await fn(...args)
      const duration = performance.now() - startTime

      await analytics.track('api_response', {
        type: 'api_response',
        endpoint: context,
        method: 'FUNCTION',
        duration,
        success: true,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      await analytics.track('error_occurred', {
        type: 'error_occurred',
        errorType: error.name,
        errorMessage: error.message,
        context,
        recoverable: true,
      })

      await analytics.track('api_response', {
        type: 'api_response',
        endpoint: context,
        method: 'FUNCTION',
        duration,
        success: false,
      })

      throw error
    }
  }) as T
}

// Usage
const fetchWithTracking = withPerformanceTracking(
  async (url: string) => fetch(url).then(r => r.json()),
  'fetch-data'
)
```

## Dashboard Integration

### Navigate to Dashboard

```typescript
import { useRouter } from 'next/navigation'

function AnalyticsButton() {
  const router = useRouter()

  return (
    <button onClick={() => router.push('/settings/analytics')}>
      View Analytics
    </button>
  )
}
```

### Embed Analytics in Settings

```typescript
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>

      <Tabs>
        <Tab label="General">...</Tab>
        <Tab label="Analytics">
          <AnalyticsDashboard />
        </Tab>
        <Tab label="Performance">...</Tab>
      </Tabs>
    </div>
  )
}
```

## Best Practices

### 1. Event Naming
- Use snake_case for event types
- Be descriptive but concise
- Group related events with prefixes

### 2. Data Privacy
- Never include PII in event data
- Use anonymous IDs for users
- Sanitize error messages
- Avoid sensitive data

### 3. Performance
- Use async/await for all tracking calls
- Don't await tracking in hot paths
- Batch events when possible
- Use sampling for high-frequency events

### 4. Error Handling
- Wrap analytics calls in try/catch
- Never let analytics break your app
- Log failures for debugging
- Provide fallback behavior

### 5. Testing
- Mock analytics in tests
- Test event validation
- Verify storage operations
- Check export functionality

## Advanced Usage

### Custom Aggregation

```typescript
import { analyticsAggregator } from '@/lib/analytics'

// Get time series data
const timeSeries = await analyticsAggregator.getTimeSeries(
  { type: 'days', value: 7 },
  'day',
  'message_sent'
)

// Get event counts by type
const counts = await analyticsAggregator.getEventCountsByType({
  type: 'days',
  value: 7,
})

// Get peak usage hours
const peakHours = await analyticsAggregator.getPeakUsageHours({
  type: 'days',
  value: 7,
})
```

### Custom Insights

```typescript
import { InsightsEngine } from '@/lib/analytics'

const engine = new InsightsEngine()

// Generate custom insights
const insights = await engine.generateInsights(
  { type: 'days', value: 7 },
  ['usage', 'performance'] // specific categories
)

// Generate summary for specific date
const summary = await engine.generateDailySummary(new Date('2026-01-03'))
```

### Direct Storage Access

```typescript
import { analyticsEventStore } from '@/lib/analytics'

// Query events directly
const events = await analyticsEventStore.queryEvents({
  startTime: '2026-01-01T00:00:00Z',
  endTime: '2026-01-08T00:00:00Z',
  types: ['message_sent', 'error_occurred'],
  limit: 100,
  sortOrder: 'desc',
})

// Count events
const count = await analyticsEventStore.countEvents()

// Delete old events
const deleted = await analyticsEventStore.deleteEventsBefore('2026-01-01T00:00:00Z')
```

---

## Troubleshooting

### Analytics Not Recording

```typescript
// Check if enabled
const config = analytics.getConfig()
console.log('Analytics enabled:', config.enabled)

// Check if persisting
console.log('Analytics persist:', config.persist)

// Re-initialize if needed
await analytics.initialize({ enabled: true, persist: true })
```

### Dashboard Shows No Data

```typescript
// Generate some test events
for (let i = 0; i < 10; i++) {
  await analytics.track('message_sent', {
    type: 'message_sent',
    conversationId: `test-${i}`,
    messageLength: 100 + i * 10,
    hasAttachment: false,
  })
}

// Refresh dashboard
window.location.reload()
```

### Export Not Working

```typescript
// Check storage size
const info = await analytics.data.getStorageInfo()
console.log('Event count:', info.eventCount)

// Try smaller export
const data = await analytics.data.export(7) // Last 7 days only
console.log('Exported events:', data.events.length)
```

---

## Migration Guide

### From Old Analytics

If you have an existing analytics system:

```typescript
// 1. Keep old system running
import oldAnalytics from './old-analytics'

// 2. Mirror events to new system
await analytics.track('message_sent', {
  type: 'message_sent',
  ...oldData,
})

// 3. Compare data
const oldStats = await oldAnalytics.getStats()
const newStats = await analytics.engagement.getSummary(7)

// 4. Gradually migrate queries
// Replace old queries with new analytics API

// 5. Remove old system once confident
```

---

For more examples, see:
- `/src/lib/analytics/examples.ts` - API usage examples
- `/src/app/settings/analytics/page.tsx` - Dashboard implementation
- `/src/lib/analytics/__tests__/` - Test examples
