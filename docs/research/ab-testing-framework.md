# A/B Testing Framework

Comprehensive A/B testing system for PersonalLog with Bayesian statistical analysis and multi-armed bandit optimization.

## Overview

The A/B testing framework enables automated experimentation with:

- **Experiment Management**: Create, start, pause, complete, and archive experiments
- **Consistent Assignment**: Users always see the same variant using deterministic hashing
- **Metrics Tracking**: Track binary, count, duration, ratio, and numeric metrics
- **Bayesian Analysis**: Probability of being best, credible intervals, expected improvement
- **Multi-Armed Bandit**: Automatically optimize traffic to winning variants
- **React Integration**: Declarative components and hooks for seamless integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Experiment Manager                        │
│  - Creates and manages experiments                           │
│  - Handles lifecycle (draft → running → completed)           │
│  - Coordinates subsystems                                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Assignment    │   │ Metrics       │   │ Statistical   │
│ Engine        │   │ Tracker       │   │ Analyzer      │
│               │   │               │   │               │
│ - Consistent  │   │ - Track       │   │ - Bayesian    │
│   hashing     │   │   values      │   │   analysis    │
│ - Bandit      │   │ - Aggregate   │   │ - Winner      │
│   selection   │   │   statistics  │   │   selection   │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Features

### Experiment Types

1. **UI Experiments**
   - Button placement
   - Color schemes
   - Layout variations
   - Message densities

2. **Performance Experiments**
   - Batch sizes
   - Caching strategies
   - Lazy loading thresholds
   - Pre-fetching options

3. **AI Experiments**
   - Temperature values
   - Response lengths
   - Prompt templates
   - Model selections

### Assignment Strategies

1. **Consistent Hashing** (Default)
   - Users always see the same variant
   - Deterministic based on user ID
   - Configurable traffic allocation

2. **Multi-Armed Bandit** (Optional)
   - Thompson sampling for variant selection
   - Automatically optimizes for winning variants
   - Balances exploration vs exploitation

### Statistical Analysis

- **Bayesian Approach**: No fixed sample size required
- **Probability of Being Best**: Monte Carlo simulation (10,000 samples)
- **Credible Intervals**: 95% confidence intervals
- **Expected Improvement**: Potential lift over control
- **Risk Assessment**: Potential loss if wrong

## Quick Start

### 1. Initialize the Framework

```typescript
import { initializeExperiments } from '@/lib/experiments';

// Initialize on app startup
await initializeExperiments({
  debug: true,
  trackMetrics: true,
  persistAssignments: true,
});
```

### 2. Create an Experiment

```typescript
import { createExperiment, startExperiment } from '@/lib/experiments';

const experiment = createExperiment({
  name: 'Message Density',
  description: 'Test different message densities for readability',
  type: 'ui',
  variants: [
    {
      id: 'compact',
      name: 'Compact',
      config: { spacing: 'small', fontSize: 14 },
      weight: 1,
    },
    {
      id: 'comfortable',
      name: 'Comfortable',
      config: { spacing: 'medium', fontSize: 16 },
      weight: 1,
      isControl: true,
    },
    {
      id: 'spacious',
      name: 'Spacious',
      config: { spacing: 'large', fontSize: 18 },
      weight: 1,
    },
  ],
  primaryMetric: {
    id: 'engagement',
    name: 'User Engagement',
    type: 'ratio',
    direction: 'maximize',
  },
  additionalMetrics: [
    {
      id: 'readability',
      name: 'Readability Score',
      type: 'numeric',
      direction: 'maximize',
    },
  ],
  objective: 'engagement',
  duration: 7 * 24 * 60 * 60 * 1000, // 1 week
  confidenceThreshold: 0.95,
  earlyStopping: true,
  bandit: true,
});

// Start the experiment
startExperiment(experiment.id);
```

### 3. Use in React Components

#### Using Hooks

```typescript
'use client';

import { useVariant, useMetricTracker } from '@/lib/experiments';

export function MessageView() {
  const userId = useUserId();
  const variant = useVariant('exp-message-density', userId);
  const trackMetric = useMetricTracker();

  if (!variant) {
    return null;
  }

  const config = variant.config as { spacing: string; fontSize: number };

  useEffect(() => {
    // Track when user interacts with messages
    const handleInteraction = () => {
      trackMetric('exp-message-density', variant.id, 'engagement', 1);
    };

    // ... setup event listeners
  }, [variant.id, trackMetric]);

  return (
    <div style={{ spacing: config.spacing, fontSize: config.fontSize }}>
      {/* Message content */}
    </div>
  );
}
```

#### Using Variant Components

```typescript
'use client';

import { Variant, Control } from '@/components/experiments/Variant';

export function MessageView({ userId }) {
  return (
    <>
      <Control experiment="exp-message-density" userId={userId}>
        <div className="spacing-medium text-base">
          {/* Control variant */}
        </div>
      </Control>

      <Variant experiment="exp-message-density" variant="compact" userId={userId}>
        <div className="spacing-small text-sm">
          {/* Compact variant */}
        </div>
      </Variant>

      <Variant experiment="exp-message-density" variant="spacious" userId={userId}>
        <div className="spacing-large text-lg">
          {/* Spacious variant */}
        </div>
      </Variant>
    </>
  );
}
```

#### Using VariantGroup

```typescript
'use client';

import { VariantGroup } from '@/components/experiments/Variant';

export function MessageView({ userId }) {
  const variants = {
    compact: <MessageList spacing="small" fontSize={14} />,
    comfortable: <MessageList spacing="medium" fontSize={16} />,
    spacious: <MessageList spacing="large" fontSize={18} />,
  };

  return (
    <VariantGroup
      experiment="exp-message-density"
      userId={userId}
      variants={variants}
      fallback={<MessageList spacing="medium" fontSize={16} />}
    />
  );
}
```

### 4. Track Metrics

```typescript
import { trackMetric, trackSuccess, trackDuration } from '@/lib/experiments';

// Track numeric value
trackMetric('exp-message-density', variantId, 'readability', score);

// Track binary success/failure
trackSuccess('exp-message-density', variantId, 'engagement', userEngaged);

// Track duration
const startTime = performance.now();
// ... do work
trackDuration('exp-message-density', variantId, 'load_time', startTime);
```

### 5. Check Results

```typescript
import { getResults, completeExperiment } from '@/lib/experiments';

// Get current results
const results = getResults(experimentId);

if (results?.winner) {
  console.log(`Winner: ${results.winner.variantId}`);
  console.log(`Probability: ${results.winner.probability}`);
  console.log(`Lift: ${results.winner.liftPercentage}`);
}

// Complete experiment and apply winner
if (results?.hasSignificantResults) {
  completeExperiment(experimentId);
}
```

## API Reference

### Experiment Manager

```typescript
import { getGlobalManager } from '@/lib/experiments';

const manager = getGlobalManager();

// Create experiment
const experiment = manager.createExperiment(definition);

// Lifecycle
manager.startExperiment(id);
manager.pauseExperiment(id);
manager.resumeExperiment(id);
manager.completeExperiment(id);
manager.archiveExperiment(id);

// Assignment
const variant = manager.assignVariant(experimentId, userId, sessionId);

// Metrics
manager.trackMetric(experimentId, variantId, metricId, value, userId, sessionId);

// Results
const results = manager.getResults(experimentId);
```

### React Hooks

```typescript
import {
  useVariant,
  useIsVariant,
  useMetricTracker,
  useBinaryMetric,
  useDurationMetric,
  useExperimentResults,
  useExperiment,
  useCreateExperiment,
} from '@/lib/experiments';

// Get assigned variant
const variant = useVariant(experimentId, userId);

// Check if specific variant is active
const isActive = useIsVariant(experimentId, variantId, userId);

// Track metrics
const trackMetric = useMetricTracker();
trackMetric(experimentId, variantId, metricId, value);

// Track binary metrics
const trackSuccess = useBinaryMetric();
trackSuccess(experimentId, variantId, metricId, success);

// Track duration
const { start, end } = useDurationMetric();
start(experimentId, variantId, metricId);
// ... do work
end();

// Get results
const results = useExperimentResults(experimentId);
```

## Statistical Methods

### Bayesian Analysis

The framework uses Bayesian inference for experiment analysis:

1. **Posterior Distribution**: Beta distribution for binary metrics
2. **Monte Carlo Simulation**: 10,000 samples to estimate probabilities
3. **Credible Intervals**: 95% confidence intervals using Beta quantiles
4. **Probability of Being Best**: Proportion of simulations where variant wins

### Multi-Armed Bandit

Thompson sampling for adaptive allocation:

1. **Model**: Beta distribution for each variant
2. **Update**: Posterior parameters after each observation
3. **Sample**: Draw from posterior for each variant
4. **Select**: Choose variant with highest sample
5. **Explore**: Random selection with probability ε

### Early Stopping

Experiments can stop early when:

- Minimum sample size reached
- Winner confidence exceeds threshold
- Clear winner emerges

## Best Practices

### 1. Define Clear Hypotheses

```typescript
const experiment = createExperiment({
  name: 'Button Color Impact on Conversions',
  description: 'Hypothesis: Green button will increase conversions by 10%',
  type: 'ui',
  // ...
});
```

### 2. Use Appropriate Metrics

```typescript
primaryMetric: {
  id: 'conversion',
  name: 'Conversion Rate',
  type: 'binary', // Use binary for yes/no outcomes
  direction: 'maximize',
},
additionalMetrics: [
  {
    id: 'time_to_convert',
    name: 'Time to Convert',
    type: 'duration', // Use duration for time-based metrics
    direction: 'minimize',
  },
],
```

### 3. Set Realistic Targets

```typescript
targetSampleSize: 1000, // Calculate based on effect size
confidenceThreshold: 0.95, // 95% confidence
minDetectableEffect: 0.05, // 5% minimum effect
```

### 4. Monitor Results

```typescript
// Set up periodic result checking
useEffect(() => {
  const interval = setInterval(() => {
    const results = getResults(experimentId);
    if (results?.hasSignificantResults) {
      console.log('Significant results detected!');
    }
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, [experimentId]);
```

### 5. Document Experiments

```typescript
const experiment = createExperiment({
  name: 'Message Density Test',
  description: `
    Testing different message densities to optimize readability.
    Based on user feedback requesting more spacious layouts.

    Variants:
    - Compact: Current default
    - Comfortable: 20% more spacing (control)
    - Spacious: 40% more spacing

    Success criteria: 10% increase in engagement metric
  `,
  // ...
});
```

## Example Experiments

### UI Experiment: Button Placement

```typescript
const buttonPlacement = createExperiment({
  name: 'Button Placement Test',
  description: 'Test top vs bottom button placement',
  type: 'ui',
  variants: [
    {
      id: 'top',
      name: 'Top Button',
      config: { position: 'top' },
      isControl: true,
    },
    {
      id: 'bottom',
      name: 'Bottom Button',
      config: { position: 'bottom' },
    },
  ],
  primaryMetric: {
    id: 'click_rate',
    name: 'Click Rate',
    type: 'ratio',
    direction: 'maximize',
  },
  objective: 'engagement',
});
```

### Performance Experiment: Batch Size

```typescript
const batchSize = createExperiment({
  name: 'Vector Search Batch Size',
  description: 'Optimize batch size for vector search performance',
  type: 'performance',
  variants: [
    {
      id: 'batch_10',
      name: 'Batch Size 10',
      config: { batchSize: 10 },
      isControl: true,
    },
    {
      id: 'batch_50',
      name: 'Batch Size 50',
      config: { batchSize: 50 },
    },
    {
      id: 'batch_100',
      name: 'Batch Size 100',
      config: { batchSize: 100 },
    },
  ],
  primaryMetric: {
    id: 'search_time',
    name: 'Average Search Time',
    type: 'duration',
    direction: 'minimize',
  },
  additionalMetrics: [
    {
      id: 'memory_usage',
      name: 'Memory Usage',
      type: 'numeric',
      direction: 'minimize',
    },
  ],
  objective: 'performance',
});
```

### AI Experiment: Temperature

```typescript
const temperature = createExperiment({
  name: 'AI Response Temperature',
  description: 'Test different temperature values for AI responses',
  type: 'ai',
  variants: [
    {
      id: 'temp_0.3',
      name: 'Conservative (0.3)',
      config: { temperature: 0.3 },
      isControl: true,
    },
    {
      id: 'temp_0.7',
      name: 'Balanced (0.7)',
      config: { temperature: 0.7 },
    },
    {
      id: 'temp_1.0',
      name: 'Creative (1.0)',
      config: { temperature: 1.0 },
    },
  ],
  primaryMetric: {
    id: 'satisfaction',
    name: 'User Satisfaction',
    type: 'numeric',
    direction: 'maximize',
  },
  additionalMetrics: [
    {
      id: 'response_length',
      name: 'Response Length',
      type: 'count',
      direction: 'maximize',
    },
  ],
  objective: 'satisfaction',
});
```

## Configuration

### Default Configuration

```typescript
{
  enabled: true,
  defaultConfidenceThreshold: 0.95,
  defaultMinSampleSize: 100,
  defaultTrafficAllocation: 1.0,
  earlyStoppingByDefault: true,
  banditByDefault: true,
  storageKey: 'personallog-experiments',
  persistAssignments: true,
  trackMetrics: true,
  debug: false,
  assignmentSalt: 'personallog-ab-salt',
}
```

### Custom Configuration

```typescript
await initializeExperiments({
  debug: true,  // Enable debug logging
  trackMetrics: true,
  persistAssignments: true,
  defaultConfidenceThreshold: 0.99,  // More conservative
  defaultMinSampleSize: 500,  // Larger samples
  earlyStoppingByDefault: false,  // Disable early stopping
  banditByDefault: false,  // Use consistent hashing
});
```

## Storage and Persistence

### localStorage Keys

- `personallog-experiments`: Experiment definitions
- `personallog-experiments-assignments`: User assignments
- `personallog-experiments-metrics`: Metric data
- `personallog-experiments-bandits`: Bandit states
- `personallog-user-id`: Unique user ID
- `personallog-session-id`: Session ID

### Export/Import

```typescript
import { getGlobalManager } from '@/lib/experiments';

const manager = getGlobalManager();

// Export all data
const data = manager.exportExperiments();

// Import data
manager.importExperiments(data);
```

## Debugging

### Enable Debug Mode

```typescript
await initializeExperiments({
  debug: true,
});
```

### Check Assignment

```typescript
const assignment = manager.getAssignment(experimentId, userId);
console.log('User assigned to:', assignment.variantId);
```

### View Metrics

```typescript
const metrics = manager.getResults(experimentId);
console.log('Variant stats:', metrics.variants);
```

## Performance Considerations

1. **Sample Size**: Calculate required sample size before starting
2. **Metrics Overhead**: Tracking has minimal overhead (< 1ms per metric)
3. **Storage**: Metrics stored in localStorage, clear periodically
4. **Computation**: Statistical analysis runs on-demand, not continuously

## Limitations

1. **Client-Side Only**: No server-side integration yet
2. **Local Storage**: Limited to ~5MB of data
3. **Single User**: No multi-user coordination
4. **Binary Focus**: Best optimized for binary metrics

## Future Enhancements

- [ ] Server-side integration
- [ ] Real-time result streaming
- [ ] Advanced statistical tests (t-test, chi-square)
- [ ] Cohort analysis
- [ ] Funnel experiments
- [ ] Multi-page experiments
- [ ] Visual experiment builder

## Glossary

- **Variant**: A specific version being tested (e.g., "compact" layout)
- **Control**: The baseline variant for comparison
- **Metric**: A measurement being tracked (e.g., "engagement")
- **Primary Metric**: The main metric used to determine the winner
- **Probability of Being Best**: Bayesian estimate (0-1) of variant superiority
- **Credible Interval**: Range containing true value with 95% probability
- **Thompson Sampling**: Bandit algorithm for adaptive allocation
- **Early Stopping**: Stopping experiment when winner is clear
- **Traffic Allocation**: Fraction of users included in experiment

## References

- [Bayesian A/B Testing](https://www.evanmiller.org/bayesian-ab-testing.html)
- [Thompson Sampling](https://en.wikipedia.org/wiki/Thompson_sampling)
- [Multi-Armed Bandit](https://en.wikipedia.org/wiki/Multi-armed_bandit)
- [Beta Distribution](https://en.wikipedia.org/wiki/Beta_distribution)
