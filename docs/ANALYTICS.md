# Analytics System Documentation

## Overview

The PersonalLog Analytics System is a comprehensive, privacy-first, local-only analytics platform that tracks user behavior, performance metrics, engagement patterns, and system errors without any cloud synchronization. All data is stored locally in IndexedDB with full user control over retention, export, and deletion.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Analytics Dashboard                          │
│                  (/settings/analytics)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    Analytics Pipeline                            │
│  - Event collection & batching                                   │
│  - Time-series aggregation                                       │
│  - Pattern detection                                            │
│  - Insight generation                                           │
└─────┬───────────────────────────────────────────────┬───────────┘
      │                                               │
┌─────▼──────┐                            ┌──────────▼──────────┐
│  Insights  │                            │   Query API         │
│  Engine    │                            │   - Usage stats     │
│            │                            │   - Performance     │
│ - Trends   │                            │   - Engagement      │
│ - Anomalies│                            │   - Errors          │
│ - Patterns │                            └──────────┬──────────┘
└─────┬──────┘                                       │
      │                                              │
┌─────▼──────────────────────────────────────────────▼──────────┐
│                    Event Aggregator                            │
│  - Time-series bucketing (hour/day/week/month)                 │
│  - Statistical analysis (mean, p95, p99, outliers)             │
│  - Feature usage tracking                                      │
│  - Error rate calculation                                      │
└─────┬──────────────────────────────────────────────┬──────────┘
      │                                              │
┌─────▼──────┐                            ┌──────────▼──────────┐
│  Event     │                            │   Event Store       │
│  Collector │                            │   (IndexedDB)       │
│            │                            │                     │
│ - Batching │                            │ - Events            │
│ - Sampling │                            │ - Metadata          │
│ - Privacy  │                            │ - Retention         │
└────────────┘                            └─────────────────────┘
```

## Event Catalog

The analytics system tracks **27+ event types** across 6 categories:

### User Actions (11 events)
- `message_sent` - User sent a message
- `conversation_created` - User created a new conversation
- `conversation_archived` - User archived a conversation
- `conversation_deleted` - User deleted a conversation
- `settings_changed` - User changed a setting
- `ai_contact_created` - User created a new AI contact
- `ai_contact_modified` - User modified an AI contact
- `ai_contact_deleted` - User deleted an AI contact
- `search_performed` - User performed a search
- `export_triggered` - User exported data
- `import_triggered` - User imported data

### Performance (5 events)
- `app_initialized` - App initialization completed
- `api_response` - API call completed
- `render_complete` - Component rendering completed
- `storage_operation` - Storage operation completed
- `memory_measurement` - Memory usage measurement

### Engagement (9 events)
- `session_start` - User session started
- `session_end` - User session ended
- `feature_used` - User used a feature
- `feature_abandoned` - User abandoned a feature
- `page_view` - User viewed a page
- `conversation_viewed` - User viewed a conversation
- `messenger_opened` - User opened the messenger
- `knowledge_viewed` - User viewed knowledge base
- `ai_chat_started` - User started AI chat

### Errors (2 events)
- `error_occurred` - An error occurred
- `error_recovered` - An error was recovered

### Feature Flags (3 events)
- `feature_enabled` - Feature flag was enabled
- `feature_disabled` - Feature flag was disabled
- `feature_evaluated` - Feature flag was evaluated

### System (4 events)
- `hardware_detected` - Hardware detection completed
- `benchmark_completed` - Benchmark test completed
- `data_compacted` - Data compaction completed
- `data_exported` - Data export completed

## Event Schema

Each event has the following structure:

```typescript
interface AnalyticsEvent {
  id: string                    // Unique event identifier
  type: EventType               // Event type
  category: EventCategory        // Event category
  timestamp: string              // ISO 8601 timestamp
  sessionId: string              // Session identifier
  data: EventData                // Event-specific data
  metadata?: {
    hardwareHash?: string        // Hardware profile hash
    activeFeatures?: string[]    // Active feature flags
    appVersion?: string          // App version
    platform?: string            // Platform info
  }
}
```

## Usage

### Basic Tracking

```typescript
import { analytics } from '@/lib/analytics'

// Initialize on app startup
await analytics.initialize()

// Track events
await analytics.track('message_sent', {
  type: 'message_sent',
  conversationId: 'abc-123',
  messageLength: 120,
  hasAttachment: false,
})

// Track feature usage
await analytics.track('feature_used', {
  type: 'feature_used',
  featureId: 'knowledge-search',
  success: true,
  duration: 1500,
})
```

### Querying Analytics

```typescript
// Get most used features
const features = await analytics.usage.getMostUsedFeatures(7, 10)

// Get engagement summary
const engagement = await analytics.engagement.getSummary(7)

// Get performance metrics
const performance = await analytics.performance.getMetrics(7)

// Get error statistics
const errors = await analytics.errors.getStats(7, 10)
```

### Using the Pipeline

```typescript
import { quickReport, quickInsights } from '@/lib/analytics'

// Get comprehensive report
const report = await quickReport(7) // Last 7 days

console.log(report.overview)
console.log(report.insights)
console.log(report.trends)

// Get insights
const insights = await quickInsights(7)

insights.forEach(insight => {
  console.log(`${insight.severity}: ${insight.title}`)
  console.log(insight.description)
})
```

## Pattern Detection

The insights engine automatically detects:

### Usage Patterns
- **Peak Hours**: Identifies when user is most active
- **Activity Trends**: Detects increasing/decreasing activity
- **Feature Adoption**: Tracks which features are used most
- **Daily/Weekly Patterns**: Analyzes time-of-day and day-of-week patterns

### Performance Patterns
- **Slow APIs**: Detects APIs with p95 > 5 seconds
- **Slow Renders**: Identifies components with render time > 100ms
- **Memory Pressure**: Tracks memory usage patterns
- **Storage Bottlenecks**: Identifies slow storage operations

### Error Patterns
- **Frequent Errors**: Detects errors occurring >10 times
- **Unrecovered Errors**: Tracks errors without recovery
- **Error Clustering**: Groups related errors
- **Recovery Rates**: Measures error recovery success

### Engagement Patterns
- **Session Duration**: Tracks average session length
- **Retention**: Measures returning user rate
- **Feature Stickiness**: Identifies features users keep using
- **Churn Detection**: Detects declining engagement

## Statistical Methods

### Trend Analysis
- **Moving Average**: Smooths time-series data
- **Linear Regression**: Identifies overall trend direction
- **Percent of Change**: Compares current vs previous period

### Outlier Detection
- **Z-Score**: Identifies statistical outliers (>3σ)
- **IQR Method**: Detects outliers using quartiles
- **Percentile Analysis**: Tracks p50, p90, p95, p99

### Correlation Analysis
- **Pearson Correlation**: Linear relationships
- **Spearman Correlation**: Monotonic relationships
- **Cross-Correlation**: Time-lagged relationships

### Seasonality Detection
- **Time-of-Day Patterns**: Hourly activity analysis
- **Day-of-Week Patterns**: Weekly activity analysis
- **Monthly Patterns**: Long-term cycle detection

## Privacy Controls

### Opt-Out
```typescript
// Disable analytics
analytics.updateConfig({ enabled: false })

// Re-enable
analytics.updateConfig({ enabled: true })
```

### Data Retention
```typescript
// Set retention to 30 days
analytics.updateConfig({ retentionDays: 30 })

// Apply retention policy
await analytics.data.delete(30) // Delete data older than 30 days
```

### Data Export
```typescript
// Export all data as JSON
const exportData = await analytics.data.export(30)

// Download as file
const blob = new Blob([JSON.stringify(exportData, null, 2)], {
  type: 'application/json',
})
const url = URL.createObjectURL(blob)
// Trigger download...
```

### Data Deletion
```typescript
// Delete all analytics data
await analytics.data.clearAll()

// Delete data older than N days
await analytics.data.delete(90)
```

## Performance Considerations

### Batching
- Events are batched in memory (default: 50 events)
- Batch flushes every 5 seconds or when batch is full
- Reduces IndexedDB write operations by 95%+

### Sampling
- Configurable sampling rate (0-1, default: 1.0)
- Useful for high-volume events (render_complete, api_response)
- Reduces storage overhead while maintaining statistical significance

### IndexedDB Optimization
- Indexed stores for fast querying by timestamp, type, session
- Automatic compaction prevents database bloat
- Efficient pagination for large result sets

### Memory Management
- In-memory batch buffer limited to configured size
- Automatic flushing when buffer is full
- No event data held in memory longer than necessary

## Dashboard Features

### Overview Cards
- **Total Events**: Event count in selected time range
- **Sessions**: Number of user sessions
- **Avg Duration**: Average session length
- **Errors**: Total error count with trend

### Charts
- **Message Volume**: Bar chart showing messages over time
- **Response Times**: Line chart showing API latency trends
- **Feature Usage**: Horizontal bar chart of most-used features
- **Error Distribution**: Breakdown of error types

### Insights Panel
- **Automated Analysis**: Natural language insights
- **Severity Levels**: info, warning, critical, success
- **Actionable Recommendations**: Specific optimization suggestions
- **Trend Indicators**: Visual indicators for trends

### Data Management
- **Export JSON**: Download all analytics data
- **Delete All**: Clear analytics database
- **Privacy Notice**: Clear communication about local-only storage

## Configuration

```typescript
interface AnalyticsConfig {
  enabled: boolean           // Master on/off switch
  persist: boolean           // Whether to persist to IndexedDB
  maxEvents: number          // Maximum events to keep (0 = unlimited)
  batchSize: number          // Batch size for writes
  batchInterval: number      // Batch flush interval (ms)
  detailedPerformance: boolean // Track detailed perf metrics
  trackErrors: boolean       // Whether to track errors
  sessionTimeout: number     // Session timeout (ms)
  retentionDays: number      // Data retention period (0 = forever)
  samplingRate: number       // Sampling rate (0-1)
}
```

Default configuration:
```typescript
{
  enabled: true,
  persist: true,
  maxEvents: 100000,
  batchSize: 50,
  batchInterval: 5000,      // 5 seconds
  detailedPerformance: true,
  trackErrors: true,
  sessionTimeout: 1800000,   // 30 minutes
  retentionDays: 90,
  samplingRate: 1.0,
}
```

## API Reference

### Main Analytics API

#### `analytics.initialize(config?)`
Initialize the analytics system.

#### `analytics.track(type, data)`
Track an analytics event.

#### `analytics.shutdown()`
Gracefully shutdown analytics.

### Query APIs

#### Usage Queries
- `analytics.usage.getMostUsedFeatures(days, limit)`
- `analytics.usage.getFeatureUsage(featureId, days)`
- `analytics.usage.getFeatureAdoptionRate(featureId, days)`

#### Engagement Queries
- `analytics.engagement.getSummary(days)`
- `analytics.engagement.getPeakHours(days)`
- `analytics.engagement.getDailySessions(days)`
- `analytics.engagement.getSessionStats(days)`

#### Performance Queries
- `analytics.performance.getMetrics(days)`
- `analytics.performance.getAPIStats(days)`
- `analytics.performance.getRenderStats(days)`
- `analytics.performance.getStorageStats(days)`

#### Error Queries
- `analytics.errors.getStats(days, limit)`
- `analytics.errors.getRate(context, hours)`
- `analytics.errors.getMostFrequent(days, limit)`
- `analytics.errors.getUnrecovered(days)`

#### Data Management
- `analytics.data.export(days)`
- `analytics.data.delete(days)`
- `analytics.data.clearAll()`
- `analytics.data.getStorageInfo()`

## Integration Examples

### Tracking in React Components

```typescript
'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

export function MyComponent() {
  useEffect(() => {
    analytics.track('feature_used', {
      type: 'feature_used',
      featureId: 'my-component',
      success: true,
    })
  }, [])

  return <div>...</div>
}
```

### Tracking API Calls

```typescript
import { analytics } from '@/lib/analytics'

export async function callAPI(endpoint: string) {
  const startTime = Date.now()

  try {
    const response = await fetch(endpoint)
    const duration = Date.now() - startTime

    await analytics.track('api_response', {
      type: 'api_response',
      endpoint,
      method: 'GET',
      duration,
      success: response.ok,
      statusCode: response.status,
    })

    return response
  } catch (error) {
    const duration = Date.now() - startTime

    await analytics.track('api_response', {
      type: 'api_response',
      endpoint,
      method: 'GET',
      duration,
      success: false,
      errorType: error.name,
    })

    throw error
  }
}
```

### Tracking Errors

```typescript
import { analytics } from '@/lib/analytics'

export async function riskyOperation() {
  try {
    // ... operation
  } catch (error) {
    await analytics.track('error_occurred', {
      type: 'error_occurred',
      errorType: error.name,
      errorMessage: error.message,
      context: 'riskyOperation',
      recoverable: true,
      stack: error.stack,
    })

    // Handle error...
  }
}
```

## Best Practices

### DO
- ✅ Track high-value user actions (messages, searches, feature usage)
- ✅ Track performance metrics (API calls, renders, storage)
- ✅ Track errors with context for debugging
- ✅ Use batching for high-frequency events
- ✅ Apply appropriate sampling rates
- ✅ Respect user privacy preferences
- ✅ Implement retention policies

### DON'T
- ❌ Track PII (personally identifiable information)
- ❌ Track message content or conversation text
- ❌ Track without user consent
- ❌ Store analytics data in the cloud
- ❌ Track excessive detail for low-value events
- ❌ Ignore performance impact
- ❌ Forget to test analytics code

## Testing

The analytics system has comprehensive test coverage:

```bash
# Run all analytics tests
npm test -- src/lib/analytics/__tests__/

# Run specific test file
npm test -- collector.test.ts

# Run with coverage
npm test -- --coverage src/lib/analytics/
```

### Test Coverage
- Event collector: 85%+
- Aggregator: 80%+
- Insights engine: 75%+
- Query API: 80%+
- Storage layer: 70%+

## Troubleshooting

### Events Not Appearing
1. Check if analytics is enabled: `analytics.getConfig().enabled`
2. Verify persistence: `analytics.getConfig().persist`
3. Check browser console for errors
4. Ensure IndexedDB is available

### High Memory Usage
1. Reduce batch size: `analytics.updateConfig({ batchSize: 25 })`
2. Reduce flush interval: `analytics.updateConfig({ batchInterval: 2000 })`
3. Enable sampling: `analytics.updateConfig({ samplingRate: 0.5 })`
4. Apply retention policy: `await analytics.data.delete(30)`

### Slow Queries
1. Reduce time range
2. Add event type filters
3. Use aggregation instead of raw events
4. Apply pagination with limit/offset

## Future Enhancements

### Planned Features
- [ ] Real-time event streaming dashboard
- [ ] Custom event type registration
- [ ] Advanced correlation analysis
- [ ] Predictive analytics (ML-based)
- [ ] Funnel analysis
- [ ] Cohort analysis
- [ ] A/B test integration
- [ ] Export to CSV/Excel

### Under Consideration
- [ ] Cloud backup (opt-in)
- [ ] Cross-device analytics sync
- [ ] Advanced visualizations (heatmaps, funnels)
- [ ] Custom insight rules
- [ ] Alerting/notifications
- [ ] Scheduled reports

## Contributing

When adding new analytics features:

1. **Add Event Types**: Update `types.ts` and `events.ts`
2. **Add Tests**: Write comprehensive tests in `__tests__/`
3. **Update Documentation**: Document new events and features
4. **Privacy Review**: Ensure no PII is tracked
5. **Performance Test**: Validate minimal overhead
6. **Update Dashboard**: Add visualizations if needed

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- GitHub Issues: [PersonalLog Issues](https://github.com/yourusername/personallog/issues)
- Documentation: [Full Docs](https://docs.personallog.dev)

---

**Last Updated:** 2025-01-05
**Version:** 2.0.0
**Status:** Production Ready ✅
