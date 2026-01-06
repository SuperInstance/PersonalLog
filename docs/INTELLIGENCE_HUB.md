# Intelligence Hub - Unified System Coordination

The Intelligence Hub is the central coordination system for all self-improving features in PersonalLog. It orchestrates analytics, experiments, optimization, and personalization systems to work together seamlessly.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE HUB                         │
│                   (Central Orchestrator)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │  Analytics  │  │ Experiments │  │   Optimization    │  │
│  │   System    │  │   System   │  │     System        │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────┬─────────┘  │
│         │                │                    │             │
│         └────────────────┴────────────────────┘             │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Event Bus (Pub/Sub)                     │  │
│  │  - Cross-system communication                        │  │
│  │  - Event routing and prioritization                  │  │
│  │  - Event persistence and replay                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Pipelines & Workflows                   │  │
│  │  - Daily optimization workflow                       │  │
│  │  - Continuous personalization workflow               │  │
│  │  - Performance recovery workflow                     │  │
│  │  - Feature rollout workflow                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Conflict Resolution                         │  │
│  │  - Priority-based conflict handling                  │  │
│  │  - User override support                             │  │
│  │  - Decision logging and audit trail                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Health Monitoring                          │  │
│  │  - System health checks                               │  │
│  │  - Performance metrics                                │  │
│  │  - Error detection and recovery                       │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Intelligence Hub (`src/lib/intelligence/hub.ts`)

The central coordinator that initializes and manages all intelligence systems.

**Key Responsibilities:**
- Initialize all systems (analytics, experiments, optimization, personalization)
- Coordinate cross-system operations
- Generate unified insights from all systems
- Monitor system health
- Manage workflows and recommendations

**Usage:**
```typescript
import { intelligence } from '@/lib/intelligence'

// Initialize on app startup
await intelligence.initialize({
  level: 'full',
  analytics: { enabled: true, retention: 30 },
  experiments: { enabled: true, autoRollout: false },
  optimization: { enabled: true, autoApply: false },
  personalization: { enabled: true, sensitivity: 'medium' },
})

// Get unified insights
const insights = await intelligence.getInsights()

// Check system health
const health = await intelligence.getHealth()

// Get recommendations
const recommendations = intelligence.getRecommendations()
```

### 2. Event Bus (`src/lib/intelligence/data-flow.ts`)

Pub/sub messaging system for cross-system communication.

**Event Types:**
- `analytics:event_recorded` - New event tracked
- `analytics:pattern_detected` - New pattern found
- `analytics:threshold_exceeded` - Metric threshold crossed
- `experiments:experiment_started` - Experiment started
- `experiments:experiment_completed` - Experiment finished
- `experiments:winner_determined` - Winning variant identified
- `optimization:suggested` - Optimization suggested
- `optimization:applied` - Optimization applied
- `optimization:rollback` - Optimization rolled back
- `optimization:issue_detected` - Problem detected
- `personalization:preference_learned` - Preference learned
- `personalization:pattern_detected` - Pattern detected
- `personalization:adaptation_applied` - Adaptation applied
- `intelligence:conflict_detected` - Systems disagree
- `intelligence:workflow_started` - Workflow started
- `intelligence:workflow_completed` - Workflow finished
- `intelligence:recommendation_generated` - New recommendation

**Event Flow Examples:**

1. **User Action → Personalization:**
```
User clicks "compact mode" button
  → analytics:event_recorded
  → personalization:preference_learned
  → personalization:adaptation_applied
```

2. **Performance Degradation → Optimization:**
```
API response time > 2s
  → analytics:threshold_exceeded
  → optimization:suggested
  → experiments:experiment_started (A/B test fix)
  → experiments:winner_determined
  → optimization:applied
```

3. **New Feature Rollout:**
```
Feature usage low
  → analytics:pattern_detected
  → personalization:pattern_detected (target users)
  → experiments:experiment_started (targeted rollout)
  → analytics:event_recorded (track usage)
  → experiments:winner_determined
  → Rollout to similar users
```

### 3. Data Pipelines (`src/lib/intelligence/data-flow.ts`)

Unified data flows between systems.

**Analytics Pipeline:**
```
User Action → Event Capture → Aggregation → Insights
                                         ↓
                                    Experiments (test changes)
                                    Optimization (tune performance)
                                    Personalization (adapt to user)
```

**Experiment Pipeline:**
```
Assignment → Treatment → Metrics → Analysis → Decision
     ↑                                      ↓
Personalization (target users)         Optimization (apply winner)
```

**Optimization Pipeline:**
```
Profile → Rules → Optimize → Validate → Apply
    ↑                                  ↓
Analytics (performance data)    Experiments (A/B test)
```

**Personalization Pipeline:**
```
Behavior → Patterns → Predictions → Actions
    ↑                                      ↓
Analytics (behavior data)        Experiments (test effectiveness)
```

### 4. Workflows (`src/lib/intelligence/workflows.ts`)

Automated multi-step processes that coordinate multiple systems.

#### Daily Optimization Workflow
Runs every night to optimize system performance.

**Steps:**
1. Analytics: Collect yesterday's performance data
2. Optimization: Generate optimization suggestions
3. Experiments: Create A/B tests for high-impact suggestions
4. Analytics: Monitor experiment progress
5. Optimization: Apply winning configurations
6. Personalization: Ensure user preferences preserved

**Trigger:** Daily at 2 AM (configurable)

#### Continuous Personalization Workflow
Runs in real-time as user interacts.

**Steps:**
1. Analytics: Track user actions
2. Personalization: Detect patterns in behavior
3. Personalization: Update preference model
4. Personalization: Apply adaptations (if confident)
5. Analytics: Track adaptation effectiveness
6. Experiments: A/B test if uncertain

**Trigger:** Real-time on user actions

#### Performance Recovery Workflow
Triggered when performance degrades.

**Steps:**
1. Analytics: Detect performance degradation
2. Hub: Trigger emergency optimization
3. Optimization: Identify root cause
4. Optimization: Rollback recent changes if needed
5. Optimization: Apply conservative fixes
6. Experiments: Test rollback effectiveness
7. Analytics: Monitor recovery

**Trigger:** Performance threshold exceeded

#### Feature Rollout Workflow
Roll out new features to targeted users.

**Steps:**
1. Analytics: Analyze feature usage
2. Personalization: Identify target user segment
3. Experiments: Create targeted experiment
4. Experiments: Run experiment
5. Analytics: Analyze results
6. Experiments: Rollout to similar users
7. Analytics: Monitor for regression

**Trigger:** Manual or low feature adoption detected

#### Adaptive Interface Workflow
Optimize UI based on usage patterns.

**Steps:**
1. Personalization: Detect usage time pattern
2. Optimization: Suggest proactive optimization
3. Experiments: Create validation experiment
4. Experiments: Test optimization
5. Optimization: Apply if effective
6. Analytics: Track improvement

**Trigger:** Pattern detected in usage

### 5. Conflict Resolution (`src/lib/intelligence/data-flow.ts`)

Handles conflicts between systems with different priorities.

**Priority System:**
1. **User Override** - Always wins
2. **Safety** - System stability and reliability
3. **Performance** - Speed and efficiency
4. **Quality** - Feature correctness
5. **Personalization** - User preferences

**Common Conflicts:**

1. **Optimization vs Personalization**
   - *Issue:* Optimization wants compact context (save tokens), personalization wants full context (user preference)
   - *Resolution:* User preference wins, optimization suggests

2. **Safety vs Performance**
   - *Issue:* Optimization wants aggressive caching, system needs lower memory
   - *Resolution:* Safety always wins

3. **Experiments vs Stability**
   - *Issue:* Experiments want to change config, system needs stable configuration
   - *Resolution:* Experiments only on non-critical paths

**Resolution Strategies:**
- Priority-based (documented priority levels)
- User override (always respected)
- Conservative default (when uncertain)
- A/B test resolution (try both, measure)

**Decision Logging:**
All conflict resolutions are logged with:
- Conflict description
- Systems involved
- Resolution action
- Reasoning
- Timestamp
- Resolved by (auto/manual)

### 6. Health Monitoring (`src/lib/intelligence/hub.ts`)

Monitors health of all intelligence systems.

**Health Checks:**
- **Analytics:** Event capture working?
- **Experiments:** Assignment stable?
- **Optimization:** No regressions?
- **Personalization:** Accuracy > threshold?

**Health Metrics:**
- Uptime for each system
- Error rates
- Performance (latency, throughput)
- Resource usage (memory, storage)

**Alerts:**
- **Critical:** System down
- **Warning:** Performance degradation
- **Warning:** Accuracy drop
- **Critical:** Resource exhaustion

**Automatic Recovery:**
- Restart failed systems
- Rollback harmful changes
- Disable failing features

## Configuration

### Settings Structure

```typescript
interface IntelligenceSettings {
  // Master controls
  enabled: boolean
  level: 'off' | 'basic' | 'advanced' | 'full'

  // Per-system controls
  analytics: {
    enabled: boolean
    retention: number // days
    sampleRate: number // 0-1
  }

  experiments: {
    enabled: boolean
    participation: boolean
    autoRollout: boolean
  }

  optimization: {
    enabled: boolean
    aggressiveness: 'conservative' | 'moderate' | 'aggressive'
    autoApply: boolean
  }

  personalization: {
    enabled: boolean
    sensitivity: 'low' | 'medium' | 'high'
    explainability: boolean
  }

  // Cross-system coordination
  coordination: {
    allowConflicts: boolean
    priority: OptimizationPriority[]
    syncInterval: number // minutes
  }
}
```

### Default Settings

```typescript
{
  enabled: true,
  level: 'advanced',

  analytics: {
    enabled: true,
    retention: 30,
    sampleRate: 1.0,
  },

  experiments: {
    enabled: true,
    participation: true,
    autoRollout: false,
  },

  optimization: {
    enabled: true,
    aggressiveness: 'moderate',
    autoApply: false,
  },

  personalization: {
    enabled: true,
    sensitivity: 'medium',
    explainability: true,
  },

  coordination: {
    allowConflicts: false,
    priority: ['personalization', 'optimization', 'experiments', 'analytics'],
    syncInterval: 5,
  },
}
```

## API Reference

### Lifecycle Methods

```typescript
// Initialize all systems
await intelligence.initialize(settings?)

// Shutdown gracefully
await intelligence.shutdown()
```

### Configuration

```typescript
// Get current settings
const settings = intelligence.getSettings()

// Update settings
intelligence.updateSettings({
  optimization: { autoApply: true }
})
```

### Coordinated Operations

```typescript
// Run daily optimization workflow
const recommendations = await intelligence.analyzeAndOptimize()

// Get active experiments
const experiments = await intelligence.runExperiments()

// Trigger personalization
await intelligence.personalizeAndAdapt()

// Get unified insights
const insights = await intelligence.getInsights()
```

### System Health

```typescript
// Get health status
const health = await intelligence.getHealth()

// Get conflicts
const conflicts = intelligence.getConflicts()

// Get bottlenecks
const bottlenecks = intelligence.getBottlenecks()

// Get recommendations
const recommendations = intelligence.getRecommendations()
```

### Events

```typescript
// Subscribe to events
intelligence.on('intelligence:workflow_completed', (event) => {
  console.log('Workflow completed:', event.data)
})

// Unsubscribe
intelligence.off('intelligence:workflow_completed', listener)

// Emit custom event
intelligence.emitEvent({
  type: 'custom:event',
  timestamp: Date.now(),
  source: 'hub',
  data: { /* ... */ }
})
```

## Usage Examples

### Example 1: Initialize with Custom Settings

```typescript
import { intelligence } from '@/lib/intelligence'

async function setupIntelligence() {
  await intelligence.initialize({
    enabled: true,
    level: 'full',
    analytics: {
      enabled: true,
      retention: 60, // Keep 60 days of data
      sampleRate: 1.0,
    },
    experiments: {
      enabled: true,
      participation: true,
      autoRollout: false, // Manual rollout only
    },
    optimization: {
      enabled: true,
      aggressiveness: 'moderate',
      autoApply: false, // Review before applying
    },
    personalization: {
      enabled: true,
      sensitivity: 'high', // Learn aggressively
      explainability: true,
    },
  })
}
```

### Example 2: Monitor System Health

```typescript
async function checkHealth() {
  const health = await intelligence.getHealth()

  if (health.analytics === 'down') {
    console.error('Analytics system is down!')
  }

  if (health.optimization === 'degraded') {
    console.warn('Optimization system degraded')
  }

  // Check for conflicts
  const conflicts = intelligence.getConflicts()
  if (conflicts.length > 0) {
    console.log('Active conflicts:', conflicts)
  }

  // Check recommendations
  const recommendations = intelligence.getRecommendations()
  recommendations.forEach(rec => {
    if (rec.priority === 'high') {
      console.log('High priority recommendation:', rec.title)
    }
  })
}
```

### Example 3: Subscribe to Events

```typescript
// Listen for experiment completions
intelligence.on('experiments:winner_determined', (event) => {
  const { experimentId, winner, impact } = event.data as any

  console.log(`Experiment ${experimentId} winner: ${winner}`)
  console.log(`Impact: ${(impact * 100).toFixed(1)}% improvement`)

  // Auto-apply if high confidence
  if (impact > 0.1) {
    console.log('Auto-applying winning variant')
  }
})

// Listen for conflicts
intelligence.on('intelligence:conflict_detected', (event) => {
  const { conflict } = event.data as any
  console.warn(`Conflict detected: ${conflict.description}`)

  // Notify user if high severity
  if (conflict.severity === 'high') {
    showNotification({
      type: 'warning',
      title: 'System Conflict',
      message: conflict.description,
    })
  }
})

// Listen for workflow completions
intelligence.on('intelligence:workflow_completed', (event) => {
  const { workflow } = event.data as any
  console.log(`Workflow ${workflow.name} completed`)

  if (workflow.result?.success) {
    console.log(`Duration: ${workflow.result.data.duration}ms`)
  }
})
```

### Example 4: Run Manual Optimization

```typescript
async function optimizeSystem() {
  console.log('Running optimization workflow...')

  const recommendations = await intelligence.analyzeAndOptimize()

  console.log(`Found ${recommendations.length} recommendations`)

  // Group by priority
  const high = recommendations.filter(r => r.priority === 'high')
  const medium = recommendations.filter(r => r.priority === 'medium')
  const low = recommendations.filter(r => r.priority === 'low')

  console.log(`High priority: ${high.length}`)
  console.log(`Medium priority: ${medium.length}`)
  console.log(`Low priority: ${low.length}`)

  // Show top recommendations
  recommendations.slice(0, 5).forEach(rec => {
    console.log(`- ${rec.title}`)
    console.log(`  ${rec.description}`)
    console.log(`  Expected: ${rec.expectedImpact}`)
    console.log(`  Action: ${rec.action?.type}`)
  })
}
```

### Example 5: Get Unified Insights

```typescript
async function getInsights() {
  const insights = await intelligence.getInsights()

  console.log('=== INTELLIGENCE INSIGHTS ===')
  console.log(insights.summary)
  console.log('')

  console.log('Analytics:')
  console.log(`  ${insights.analytics.highlight}`)
  console.log(`  Trend: ${insights.analytics.trend}`)
  console.log('')

  console.log('Experiments:')
  console.log(`  Active: ${insights.experiments.active}`)
  if (insights.experiments.winning) {
    console.log(`  Winner: ${insights.experiments.winning.name}`)
    console.log(`  Impact: ${insights.experiments.winning.impact}`)
  }
  console.log('')

  console.log('Optimization:')
  console.log(`  Applied: ${insights.optimization.applied}`)
  console.log(`  Impact: ${insights.optimization.impact}`)
  console.log(`  Health Score: ${insights.optimization.healthScore}%`)
  console.log('')

  console.log('Personalization:')
  console.log(`  Learned: ${insights.personalization.learned}`)
  console.log(`  Confidence: ${insights.personalization.confidence}%`)
  console.log(`  Preferences: ${insights.personalization.preferencesLearned}`)
}
```

## Best Practices

### 1. Initialize Early
Initialize the intelligence hub as early as possible in your app lifecycle:

```typescript
// In app initialization
await intelligence.initialize()
```

### 2. Handle Errors Gracefully
Always handle errors from intelligence operations:

```typescript
try {
  await intelligence.analyzeAndOptimize()
} catch (error) {
  console.error('Optimization failed:', error)
  // Continue anyway, don't block the app
}
```

### 3. Monitor Health
Regularly check system health:

```typescript
// Check health every 5 minutes
setInterval(async () => {
  const health = await intelligence.getHealth()
  if (health.analytics === 'down') {
    // Alert user, attempt recovery
  }
}, 5 * 60 * 1000)
```

### 4. Respect User Preferences
Always let users control intelligence features:

```typescript
// Provide settings UI
<IntelligenceSettings
  settings={intelligence.getSettings()}
  onChange={(updates) => intelligence.updateSettings(updates)}
/>
```

### 5. Log Important Events
Subscribe to and log important events for debugging:

```typescript
intelligence.on('intelligence:conflict_detected', (event) => {
  logger.warn('Conflict detected', event)
})

intelligence.on('optimization:rollback', (event) => {
  logger.error('Optimization rolled back', event)
})
```

### 6. Test Before Auto-Apply
When enabling auto-apply, start with conservative settings:

```typescript
{
  optimization: {
    autoApply: false, // Start with manual review
    aggressiveness: 'conservative', // Start conservative
  }
}
```

## Troubleshooting

### System Not Initializing

**Problem:** Hub fails to initialize

**Solutions:**
1. Check browser compatibility (requires IndexedDB)
2. Check storage quota
3. Check for conflicting extensions
4. Review console errors

### Poor Performance

**Problem:** Intelligence features slowing down app

**Solutions:**
1. Reduce `analytics.sampleRate`
2. Disable `personalization` temporarily
3. Set `optimization.aggressiveness` to 'conservative'
4. Clear old analytics data

### Inaccurate Personalization

**Problem:** System not adapting to user preferences

**Solutions:**
1. Increase `personalization.sensitivity` to 'high'
2. Check if `personalization.enabled` is true
3. Ensure enough user actions recorded
4. Review learned preferences in dashboard

### Experiments Not Converting

**Problem:** No experiment winners found

**Solutions:**
1. Increase `experiment.minSampleSize`
2. Check if traffic allocation is too low
3. Review primary metric alignment
4. Ensure experiments run long enough

### Optimization Regressions

**Problem:** Optimization making things worse

**Solutions:**
1. Disable `optimization.autoApply`
2. Set `optimization.aggressiveness` to 'conservative'
3. Review optimization suggestions before applying
4. Check health metrics for degradation

## Advanced Topics

### Custom Workflows

Create custom workflows for specific use cases:

```typescript
import { WorkflowExecutor } from '@/lib/intelligence/workflows'
import { getIntelligenceHub } from '@/lib/intelligence/hub'

const hub = getIntelligenceHub()
const executor = new WorkflowExecutor(hub)

// Define custom workflow
const customWorkflow: WorkflowExecution = {
  id: 'custom-workflow',
  name: 'Custom Optimization',
  status: 'pending',
  startedAt: Date.now(),
  steps: [
    {
      name: 'Step 1',
      system: 'analytics',
      status: 'pending',
    },
    // ... more steps
  ],
}

// Execute workflow
const result = await executor.execute(customWorkflow)
```

### Custom Event Types

Define and emit custom events:

```typescript
// Extend event types
interface CustomEvent extends IntelligenceEvent {
  type: 'my:custom_event'
  data: {
    customField: string
  }
}

// Emit event
intelligence.emitEvent({
  type: 'my:custom_event',
  timestamp: Date.now(),
  source: 'hub',
  data: {
    customField: 'value',
  },
})
```

### Custom Conflict Resolution

Implement custom conflict resolution logic:

```typescript
import { ConflictResolver } from '@/lib/intelligence/data-flow'

class CustomResolver extends ConflictResolver {
  resolve(conflict: Conflict): Conflict {
    // Custom resolution logic
    if (conflict.systems.includes('optimization') &&
        conflict.systems.includes('personalization')) {
      // Always prefer personalization for this conflict
      return {
        ...conflict,
        resolution: {
          action: 'Personalization preferred',
          priority: 'personalization',
          resolvedBy: 'auto',
          resolvedAt: Date.now(),
        },
      }
    }

    // Default resolution
    return super.resolve(conflict)
  }
}
```

## Performance Considerations

### Memory Usage
- Analytics data grows over time
- Implement retention policies
- Clear old data regularly

### CPU Usage
- Personalization runs on every action
- Use sampling to reduce frequency
- Batch computations when possible

### Storage Space
- IndexedDB has quota limits
- Monitor storage usage
- Implement cleanup policies

### Network
- All systems are local-only
- No network calls
- Privacy-first design

## Security & Privacy

### Data Privacy
- All data stored locally
- No cloud synchronization
- No analytics sent externally

### User Control
- Users can disable any system
- Clear all data on request
- Export data on request

### Transparency
- All decisions logged
- Explainable recommendations
- Audit trail available

## Future Enhancements

### Planned Features
- [ ] Cross-device synchronization
- [ ] Advanced anomaly detection
- [ ] Predictive optimization
- [ ] Natural language insights
- [ ] Custom workflow builder

### Under Consideration
- [ ] Federated learning
- [ ] Differential privacy
- [ ] Multi-user support
- [ ] Team analytics

## See Also

- [Analytics System](./ANALYTICS.md)
- [Experiments Framework](./EXPERIMENTS.md)
- [Optimization Engine](./OPTIMIZATION.md)
- [Personalization System](./PERSONALIZATION.md)
- [Architecture Overview](./ARCHITECTURE.md)
