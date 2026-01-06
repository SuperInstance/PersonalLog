# Spread Analytics & Reporting System

Comprehensive analytics and reporting for tracking parallel conversation spread operations.

## Overview

The Spread Analytics system tracks all spread operations, calculates efficiency metrics, and provides detailed reports to help optimize your parallel task execution strategy.

## Features

### ✅ Tracking
- **Automatic tracking** of all spread operations
- **Task-level metrics** (duration, cost, tokens, status)
- **Result aggregation** (time saved, cost saved, success rate)
- **Quality metrics** (conflict rate, auto-merge rate, result quality)

### ✅ Analytics
- **Efficiency calculations** - Compare serial vs parallel execution
- **Success rate analysis** - Track success by task type
- **Time/Cost savings** - Measure actual savings from spreading
- **Performance metrics** - Speed, reliability, and quality scores

### ✅ Reporting
- **HTML reports** - Beautiful, printable reports
- **JSON export** - Raw data export
- **PDF generation** - Print-to-PDF via HTML
- **Summary reports** - Aggregate multiple spreads

### ✅ Visualization
- **Overview metrics** - High-level KPI dashboard
- **Efficiency charts** - Time and cost savings over time
- **Success rate charts** - By task type
- **Detailed tables** - Individual spread analysis

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Spread Analytics Dashboard              │
│  • Overview metrics  • Charts  • Tables  • Export   │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              SpreadAnalytics Class                   │
│  • trackSpread()  • getMetrics()  • calculate...()   │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              IndexedDB Storage                       │
│  • spreads store  • by-timestamp index  • by-parent  │
└─────────────────────────────────────────────────────┘
```

## Usage

### Basic Tracking

```typescript
import { getSpreadAnalytics } from '@/lib/agents/spread'

const analytics = getSpreadAnalytics()

// Track a spread operation
await analytics.trackSpread('spread_123', {
  parentConversationId: 'conv_abc',
  taskCount: 3,
  tasks: [
    {
      id: 'task_1',
      task: 'Research authentication',
      model: 'gpt-4',
      startTime: Date.now(),
      status: 'pending',
      tokenCount: 0,
      cost: 0
    }
  ],
  results: {
    totalDuration: 0,
    serialDuration: 0,
    timeSaved: 0,
    timeSavedPercentage: 0,
    totalCost: 0,
    serialCost: 0,
    costSaved: 0,
    successCount: 0,
    failCount: 0
  },
  quality: {
    resultQuality: 0,
    conflictRate: 0,
    autoMergeRate: 0
  }
})
```

### Getting Metrics

```typescript
// Get metrics for a date range
const metrics = await analytics.getMetrics(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  new Date()
)

console.log(`Total spreads: ${metrics.totalSpreads}`)
console.log(`Avg time saved: ${metrics.avgTimeSaved}ms`)
console.log(`Avg cost saved: $${metrics.avgCostSaved}`)
```

### Calculating Efficiency

```typescript
// Calculate efficiency for a specific spread
const efficiency = await analytics.calculateEfficiency('spread_123')

console.log(`Time saved: ${efficiency.timeSavedPercentage.toFixed(1)}%`)
console.log(`Cost saved: ${efficiency.costSavedPercentage.toFixed(1)}%`)
console.log(`Efficiency score: ${efficiency.efficiencyScore}/100`)
```

### Calculating Success Rate

```typescript
// Calculate success rate
const successRate = await analytics.calculateSuccessRate('spread_123')

console.log(`Overall: ${(successRate.overallRate * 100).toFixed(1)}%`)

// By task type
for (const [type, stats] of Object.entries(successRate.byType)) {
  console.log(`${type}: ${(stats.rate * 100).toFixed(1)}%`)
}
```

### Comparing Strategies (A/B Testing)

```typescript
// Compare by model
const byModel = await analytics.compareStrategies(startDate, endDate, 'model')

// Compare by task count
const byTaskCount = await analytics.compareStrategies(startDate, endDate, 'taskCount')

// Compare by time of day
const byTimeOfDay = await analytics.compareStrategies(startDate, endDate, 'timeOfDay')
```

### Generating Reports

```typescript
import { SpreadReportGenerator, downloadReport } from '@/lib/agents/spread'

const generator = new SpreadReportGenerator()

// Generate a report
const report = await generator.generateReport('spread_123')

// Export as HTML
const html = await generator.exportToHTML(report)
downloadReport(html, 'spread-report.html', 'text/html')

// Export as JSON
const json = await generator.exportToJSON(report)
downloadReport(json, 'spread-report.json', 'application/json')

// Print to PDF (opens in new tab)
await generator.exportToHTML(report)
openHTMLReport(html) // Use browser's print to PDF
```

## Dashboard Component

### SpreadAnalyticsDashboard

Main dashboard component with full analytics visualization.

```tsx
import { SpreadAnalyticsDashboard } from '@/components/agents/spreader/SpreadAnalyticsDashboard'

function AnalyticsPage() {
  return (
    <div className="p-8">
      <SpreadAnalyticsDashboard />
    </div>
  )
}
```

**Features:**
- Date range selector (24h, 7d, 30d, 90d)
- Overview metrics cards
- Efficiency trend chart
- Success rate by task type
- Individual spreads table
- Detailed spread view
- Export buttons (HTML, JSON, PDF)

## API Reference

### SpreadAnalytics

#### Methods

- `init()` - Initialize database
- `trackSpread(spreadId, data)` - Record spread event
- `updateSpread(spreadId, updates)` - Update spread event
- `getSpread(spreadId)` - Get specific spread
- `getAllSpreads(startDate, endDate)` - Get all in range
- `getMetrics(startDate, endDate)` - Get aggregated metrics
- `calculateEfficiency(spreadId)` - Calculate efficiency report
- `calculateSuccessRate(spreadId)` - Calculate success rate
- `compareStrategies(startDate, endDate, groupBy)` - A/B testing
- `deleteOldData(olderThanDays)` - Cleanup old data
- `exportData()` - Export all data as JSON
- `importData(json)` - Import data from JSON

### SpreadReportGenerator

#### Methods

- `generateReport(spreadId, options)` - Generate comprehensive report
- `generateHTMLReport(report)` - Generate HTML report
- `exportToJSON(report)` - Export as JSON string
- `exportToHTML(report)` - Export as HTML string
- `generateSummaryReport(spreadIds)` - Aggregate multiple spreads

## Metrics Reference

### Efficiency Metrics

- **serialDuration** - Total time if done serially
- **parallelDuration** - Actual parallel execution time
- **timeSaved** - Time saved (serial - parallel)
- **timeSavedPercentage** - Percentage saved
- **serialCost** - Cost if done serially with cheapest model
- **actualCost** - Actual cost with model selection
- **costSaved** - Money saved (serial - actual)
- **costSavedPercentage** - Percentage saved
- **efficiencyScore** - Combined score (0-100)

### Quality Metrics

- **resultQuality** - User rating (1-5)
- **conflictRate** - Conflicts per merge
- **autoMergeRate** - Auto-merged tasks / total tasks
- **accuracyScore** - How accurate results were
- **completenessScore** - How complete results were
- **relevanceScore** - How relevant results were
- **qualityScore** - Combined score (0-100)

### Success Rate Metrics

- **overallRate** - Overall success rate (0-1)
- **successCount** - Number of successful tasks
- **failCount** - Number of failed tasks
- **byType** - Success rate by task type (code, research, writing, etc.)

## Data Schema

### SpreadEvent

```typescript
interface SpreadEvent {
  id: string                    // Unique event ID
  timestamp: number             // Creation time
  spreadId: string              // Spread operation ID
  parentConversationId: string  // Parent conversation ID
  taskCount: number             // Number of tasks

  tasks: Array<{
    id: string                  // Task ID
    task: string                // Task description
    model: string               // Model used
    startTime: number           // Start time
    endTime?: number            // End time
    duration?: number           // Duration in ms
    status: 'pending' | 'running' | 'complete' | 'failed'
    tokenCount: number          // Tokens used
    cost: number                // Cost in USD
  }>

  results: {
    totalDuration: number       // Actual duration
    serialDuration: number      // Serial duration
    timeSaved: number           // Time saved
    timeSavedPercentage: number // Percentage saved
    totalCost: number           // Actual cost
    serialCost: number          // Serial cost
    costSaved: number           // Cost saved
    successCount: number        // Successful tasks
    failCount: number           // Failed tasks
  }

  quality: {
    resultQuality: number       // 1-5 rating
    conflictRate: number        // Conflicts per merge
    autoMergeRate: number       // Auto-merge percentage
  }
}
```

## Best Practices

### 1. Track All Spreads

Always track spread operations when they start:

```typescript
const spreadId = `spread_${Date.now()}`
await analytics.trackSpread(spreadId, { /* ... */ })
```

### 2. Update When Tasks Complete

Update the spread event as tasks complete:

```typescript
await analytics.updateSpread(spreadId, {
  tasks: updatedTasks,
  results: calculatedResults
})
```

### 3. Review Regularly

Check analytics dashboard weekly to:
- Identify best-performing task types
- Optimize model selection
- Track cost savings
- Improve success rates

### 4. Export Reports

Generate reports for:
- Monthly summaries
- Performance reviews
- Cost analysis
- Optimization planning

## Integration Examples

### With Spreader Agent

```typescript
import { spreadConversations } from '@/lib/agents/spreader/spread-commands'
import { getSpreadAnalytics } from '@/lib/agents/spread/analytics'

// When spreading tasks
const result = await spreadConversations({
  tasks: ['Task 1', 'Task 2', 'Task 3'],
  parentConversationId: conversationId
})

// Analytics are tracked automatically
```

### With Merge Operations

```typescript
import { mergeChildConversation } from '@/lib/agents/spreader/spread-commands'

// When merging results
const mergeResult = await mergeChildConversation({
  childId: 'child_123',
  parentConversationId: 'conv_abc'
})

// Update analytics
await analytics.updateSpread(spreadId, {
  quality: {
    resultQuality: 5,
    conflictRate: 0.2,
    autoMergeRate: 0.8
  }
})
```

## Performance Considerations

- IndexedDB operations are async and non-blocking
- Analytics data is stored locally (no network calls)
- Queries are optimized with indexes (timestamp, parent ID)
- Automatic cleanup of old data (>90 days by default)
- Export/import for backup and migration

## Troubleshooting

### Data Not Showing

1. Check that tracking is called: `await analytics.trackSpread()`
2. Verify date range includes your data
3. Check browser console for errors
4. Try clearing cache and reloading

### Metrics Incorrect

1. Ensure tasks are updated with completion status
2. Verify duration and cost are calculated correctly
3. Check that both start and end times are set
4. Review task status (complete/failed/pending)

### Export Failing

1. Ensure browser allows downloads
2. Check popup blocker settings
3. Try smaller date ranges
4. Use JSON export for debugging

## Future Enhancements

- [ ] Real-time updates via WebSockets
- [ ] Advanced charts (time series, heatmaps)
- [ ] Custom metric definitions
- [ ] Alerting on thresholds
- [ ] Export to CSV/Excel
- [ ] Integration with analytics platforms
- [ ] Predictive optimization suggestions
- [ ] Cost forecasting

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.
