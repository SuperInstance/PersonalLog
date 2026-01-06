# A/B Testing and Experimentation Framework

## Overview

PersonalLog includes a comprehensive A/B testing and experimentation framework that enables data-driven optimization of features, UI, and algorithms. The system supports:

- **Experiment Management**: Create, start, pause, complete, and archive experiments
- **User Assignment**: Consistent hashing for stable variant assignment
- **Multi-Armed Bandit**: 4 adaptive algorithms for optimization
- **Statistical Analysis**: Bayesian methods for winner determination
- **Metrics Tracking**: Automatic collection and aggregation
- **Real-time Dashboard**: Monitor experiments and view results

## Table of Contents

1. [Quick Start](#quick-start)
2. [Creating Experiments](#creating-experiments)
3. [Experiment Configuration](#experiment-configuration)
4. [User Assignment](#user-assignment)
5. [Metrics Tracking](#metrics-tracking)
6. [Multi-Armed Bandit](#multi-armed-bandit)
7. [Statistical Analysis](#statistical-analysis)
8. [React Integration](#react-integration)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Quick Start

### Basic Experiment

```typescript
import { createExperiment, startExperiment, getVariant } from '@/lib/experiments';

// 1. Create an experiment
const experiment = createExperiment({
  name: 'Message Density Test',
  description: 'Test compact vs comfortable vs spacious message layout',
  type: 'ui',
  variants: [
    {
      id: 'compact',
      name: 'Compact Layout',
      config: { spacing: '0.5rem', fontSize: '0.875rem' },
      isControl: true,
      weight: 0.33,
    },
    {
      id: 'comfortable',
      name: 'Comfortable Layout',
      config: { spacing: '1rem', fontSize: '0.925rem' },
      weight: 0.33,
    },
    {
      id: 'spacious',
      name: 'Spacious Layout',
      config: { spacing: '1.5rem', fontSize: '1rem' },
      weight: 0.34,
    },
  ],
  primaryMetric: {
    id: 'engagement',
    name: 'User Engagement',
    type: 'ratio',
    direction: 'maximize',
  },
  objective: 'engagement',
  duration: 14 * 24 * 60 * 60 * 1000, // 2 weeks
  trafficAllocation: 1.0,
  confidenceThreshold: 0.95,
  earlyStopping: true,
  bandit: true,
});

// 2. Start the experiment
startExperiment(experiment.id);

// 3. Get user's variant
const variant = getVariant(experiment.id, userId);

// 4. Use variant configuration
if (variant) {
  applyMessageDensity(variant.config);
}
```

### React Component

```tsx
import { Experiment, Variant } from '@/components/experiments/Variant';
import { useMetricTracker } from '@/lib/experiments';

function MessageList() {
  const trackMetric = useMetricTracker();

  const handleSendMessage = () => {
    // Track engagement
    trackMetric(experimentId, variantId, 'engagement', 1);
    // ... send message
  };

  return (
    <Experiment experiment="message-density-test">
      <Variant variant="compact">
        <MessageList spacing="0.5rem" onSend={handleSendMessage} />
      </Variant>
      <Variant variant="comfortable">
        <MessageList spacing="1rem" onSend={handleSendMessage} />
      </Variant>
      <Variant variant="spacious">
        <MessageList spacing="1.5rem" onSend={handleSendMessage} />
      </Variant>
    </Experiment>
  );
}
```

---

## Creating Experiments

### Experiment Types

Experiments can be categorized into types:

- **ui**: UI/UX experiments (layouts, colors, placement)
- **performance**: Performance experiments (batching, caching, thresholds)
- **ai**: AI/ML experiments (temperature, prompts, models)
- **algorithm**: Algorithm experiments (sorting, searching, ranking)
- **content**: Content experiments (copy, media, formatting)

### Metrics

Metrics define what you're measuring:

| Metric Type | Description | Example |
|-------------|-------------|---------|
| `binary` | Success/failure (0 or 1) | Click-through, conversion |
| `count` | Non-negative integers | Number of clicks, messages sent |
| `duration` | Time in milliseconds | Page load time, response time |
| `ratio` | 0-1 range | Engagement rate, retention rate |
| `numeric` | Any numeric value | Revenue, score |

### Objectives

Define the primary goal:

- `conversion`: Maximize conversion rate
- `engagement`: Maximize user engagement
- `retention`: Maximize user retention
- `satisfaction`: Maximize user satisfaction
- `performance`: Minimize load time/latency
- `revenue`: Maximize revenue

---

## Experiment Configuration

### Complete Example

```typescript
const experiment = createExperiment({
  // Basic info
  name: 'AI Response Suggestion Timing',
  description: 'Test when to show conversation continuation suggestions',
  type: 'ui',

  // Variants (must have at least 2, one marked as control)
  variants: [
    {
      id: 'no_suggestions',
      name: 'No Suggestions',
      config: { showSuggestions: false },
      isControl: true,
      weight: 0.25,
    },
    {
      id: 'always_show',
      name: 'Always Show',
      config: { showSuggestions: true, trigger: 'always' },
      weight: 0.25,
    },
    {
      id: 'show_on_pause',
      name: 'Show on Pause',
      config: { showSuggestions: true, trigger: 'pause', delay: 2000 },
      weight: 0.25,
    },
    {
      id: 'show_on_idle',
      name: 'Show on Idle',
      config: { showSuggestions: true, trigger: 'idle', delay: 5000 },
      weight: 0.25,
    },
  ],

  // Metrics (one primary, multiple secondary allowed)
  primaryMetric: {
    id: 'suggestion_acceptance_rate',
    name: 'Suggestion Acceptance Rate',
    type: 'binary',
    direction: 'maximize',
  },
  additionalMetrics: [
    {
      id: 'conversation_continuation_rate',
      name: 'Conversation Continuation Rate',
      type: 'binary',
      direction: 'maximize',
    },
    {
      id: 'time_to_next_message',
      name: 'Time to Next Message',
      type: 'duration',
      direction: 'minimize',
    },
  ],

  // Configuration
  objective: 'engagement',
  duration: 14 * 24 * 60 * 60 * 1000, // 2 weeks in milliseconds
  trafficAllocation: 0.5, // Only include 50% of users
  confidenceThreshold: 0.95, // 95% confidence
  earlyStopping: true, // Stop early if clear winner
  bandit: true, // Use multi-armed bandit
});
```

### Sample Size Calculation

```typescript
import { calculateSampleSize, SAMPLE_SIZE_CALCULATORS } from '@/lib/experiments';

// Method 1: Direct calculation
const sampleSize = calculateSampleSize({
  metricType: 'binary',
  baseline: 0.10, // 10% baseline conversion
  mde: 0.02, // Detect 2% absolute improvement
  power: 0.80, // 80% statistical power
  alpha: 0.05, // 95% confidence
  variants: 2,
  relativeMDE: false,
});

console.log(sampleSize.explanation);
// "To detect a 2.0% absolute change from baseline of 10.0% with 95% confidence
// and 80% power, you need 3,940 samples per variant (total 7,880). At 1,000
// daily users, this will take approximately 8 days."

// Method 2: Use convenience calculators
const result = SAMPLE_SIZE_CALCULATORS.engagementRate(0.10, 0.20);
// Calculate for 10% baseline with 20% relative MDE
```

---

## User Assignment

### Consistent Hashing

Users are assigned to variants using consistent hashing:

```typescript
const userId = 'user-123';
const variant = getVariant('experiment-id', userId);

// Same user always gets same variant (deterministic)
const variant2 = getVariant('experiment-id', userId);
expect(variant.id).toBe(variant2.id);
```

### Assignment Storage

Assignments are persisted to localStorage by default:

```typescript
// Assignment stored automatically
localStorage.getItem('personallog-experiments-assignments');
// Contains: { "exp-123:user-456": { variantId: "A", assignedAt: 1234567890 } }
```

### Traffic Allocation

Control what percentage of users participate:

```typescript
const experiment = createExperiment({
  // ...
  trafficAllocation: 0.5, // Only 50% of users participate
});

// Users outside allocation get null variant
const variant = getVariant(experiment.id, someUserId);
if (!variant) {
  // User not in experiment
}
```

### Targeting

Exclude specific users or target segments:

```typescript
const experiment = createExperiment({
  // ...
  targetAudience: {
    minHardwareScore: 50, // Only for devices with score > 50
    segments: ['power-users', 'beta-testers'],
    excludeUserIds: ['admin-1', 'internal-user-2'],
  },
});
```

---

## Metrics Tracking

### Track Binary Metric

```typescript
import { trackSuccess } from '@/lib/experiments';

// Track success (1) or failure (0)
trackSuccess(
  'experiment-id',
  'variant-id',
  'conversion',
  userClickedButton // true or false
);
```

### Track Count Metric

```typescript
import { trackMetric } from '@/lib/experiments';

// Track number of messages sent
trackMetric(
  'experiment-id',
  'variant-id',
  'messages_sent',
  messageCount // numeric value
);
```

### Track Duration Metric

```typescript
import { trackDuration } from '@/lib/experiments';

// Track time elapsed
const startTime = performance.now();
// ... do work ...
trackDuration('experiment-id', 'variant-id', 'load_time', startTime);
```

### React Hook

```tsx
import { useBinaryMetric, useDurationMetric } from '@/lib/experiments';

function MyComponent() {
  const trackSuccess = useBinaryMetric();
  const { start: startDuration, end: endDuration } = useDurationMetric();

  const handleClick = () => {
    // Track click
    trackSuccess(expId, varId, 'button_click', true);

    // Track operation duration
    startDuration(expId, varId, 'operation_time');
    // ... do operation ...
    endDuration();
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

---

## Multi-Armed Bandit

### Algorithm Selection

Choose from 4 bandit algorithms:

#### 1. Epsilon-Greedy

Simple exploration vs exploitation:

```typescript
import { MultiArmedBandit } from '@/lib/experiments';

const bandit = new MultiArmedBandit({
  algorithm: 'epsilon-greedy',
  epsilon: 0.1, // 10% exploration, 90% exploitation
  decayExploration: true, // Reduce exploration over time
  decayRate: 0.995,
});
```

**Best for:** Simple experiments, low traffic scenarios

#### 2. UCB1 (Upper Confidence Bound)

Optimism in the face of uncertainty:

```typescript
const bandit = new MultiArmedBandit({
  algorithm: 'ucb1',
  confidenceLevel: 2.0, // Higher = more exploration
  minPullsPerVariant: 10,
});
```

**Best for:** Many variants, high traffic

#### 3. Thompson Sampling (Default)

Bayesian probability matching:

```typescript
const bandit = new MultiArmedBandit({
  algorithm: 'thompson-sampling',
  minPullsPerVariant: 10,
});
```

**Best for:** Most scenarios, binary rewards, high variance

#### 4. Adaptive Allocation

Gradient-based optimization with softmax:

```typescript
const bandit = new MultiArmedBandit({
  algorithm: 'adaptive',
  temperature: 1.0, // Lower = more exploitation
  learningRate: 0.1,
});
```

**Best for:** Continuous optimization, complex reward landscapes

### Using Bandit in Experiments

```typescript
const experiment = createExperiment({
  // ...
  bandit: true, // Enable bandit optimization
});

// Bandit automatically learns and adapts
// Traffic shifts to better-performing variants over time
```

### Bandit Comparison

```typescript
import { compareBanditAlgorithms, recommendBanditAlgorithm } from '@/lib/experiments';

// Compare algorithms on historical data
const rewards = {
  'variant-a': [0, 1, 1, 0, 1, ...],
  'variant-b': [1, 1, 0, 1, 1, ...],
  'variant-c': [0, 0, 1, 0, 0, ...],
};

const comparison = compareBanditAlgorithms(variants, rewards, 1000);

console.log('Epsilon-Greedy:', comparison['epsilon-greedy'].totalReward);
console.log('UCB1:', comparison['ucb1'].totalReward);
console.log('Thompson Sampling:', comparison['thompson-sampling'].totalReward);
console.log('Adaptive:', comparison['adaptive'].totalReward);

// Get recommendation
const recommendation = recommendBanditAlgorithm(
  5, // numVariants
  10000, // expectedVolume
  'high' // rewardVariance
);
console.log('Recommended algorithm:', recommendation);
```

---

## Statistical Analysis

### Bayesian Methods

The framework uses Bayesian analysis for winner determination:

```typescript
import { getResults, completeExperiment } from '@/lib/experiments';

// Get current results
const results = getResults('experiment-id');

console.log('Winner:', results.winner.variantId);
console.log('Confidence:', results.winner.confidence); // "95.2%"
console.log('Lift:', results.winner.liftPercentage); // "+12.5%"

// Each variant has probability of being best
Object.entries(results.variants).forEach(([variantId, stats]) => {
  console.log(`${variantId}: ${(stats.probabilityOfBeingBest * 100).toFixed(1)}% chance of being best`);
});
```

### Probability of Being Best

Calculated using Monte Carlo simulation (10,000 samples):

```typescript
// For each variant
const variant = results.variants['compact'];

// Probability of being best (0-1)
console.log(variant.probabilityOfBeingBest); // 0.23 = 23%

// Expected improvement over baseline
console.log(variant.expectedImprovement); // 0.15 = +15%

// 95% credible interval
console.log(variant.credibleInterval); // [0.12, 0.18]

// Risk (potential loss if chosen)
console.log(variant.risk); // 0.03 = 3% risk
```

### Significance Testing

```typescript
// Check if results are significant
if (results.hasSignificantResults) {
  console.log('Winner determined with', results.winner.confidence, 'confidence');
} else {
  console.log('Not yet significant, continue testing');
}

// Get recommendation
console.log(results.recommendation);
// "keep_winner" | "keep_control" | "continue_testing" | "inconclusive"
```

### Confidence Intervals

```typescript
// Get 95% credible interval for variant
const interval = variant.credibleInterval; // [lower, upper]

// Interpretation: "We're 95% confident the true value is between
// ${interval[0]} and ${interval[1]}"
```

---

## React Integration

### Experiment Wrapper

```tsx
import { Experiment, Variant } from '@/components/experiments/Variant';

function MyFeature() {
  return (
    <Experiment experiment="my-experiment">
      <Variant variant="control">
        <ControlVersion />
      </Variant>
      <Variant variant="treatment">
        <TreatmentVersion />
      </Variant>
    </Experiment>
  );
}
```

### Variant Group

```tsx
import { VariantGroup } from '@/components/experiments/Variant';

function MyFeature() {
  const variants = {
    'compact': <CompactMessageList />,
    'comfortable': <ComfortableMessageList />,
    'spacious': <SpaciousMessageList />,
  };

  return (
    <VariantGroup
      experiment="message-density"
      variants={variants}
      fallback={<DefaultMessageList />}
    />
  );
}
```

### useVariant Hook

```tsx
import { useVariant } from '@/lib/experiments';

function MyComponent() {
  const variant = useVariant('experiment-id', userId);

  if (!variant) {
    return <Default />;
  }

  return <Component config={variant.config} />;
}
```

### useIsVariant Hook

```tsx
import { useIsVariant } from '@/lib/experiments';

function MyComponent() {
  const isTreatment = useIsVariant('experiment-id', 'treatment', userId);

  return (
    <div className={isTreatment ? 'treatment-style' : 'control-style'}>
      Content
    </div>
  );
}
```

### Metric Tracking Hooks

```tsx
import { useMetricTracker, useBinaryMetric, useDurationMetric } from '@/lib/experiments';

function MyComponent() {
  const trackMetric = useMetricTracker();
  const trackSuccess = useBinaryMetric();
  const { start, end } = useDurationMetric();

  const handleClick = () => {
    trackSuccess(expId, varId, 'click', true);
  };

  const loadContent = async () => {
    start(expId, varId, 'load_time');
    await fetchContent();
    end();
  };

  return <button onClick={handleClick}>Click</button>;
}
```

### useExperimentResults Hook

```tsx
import { useExperimentResults } from '@/lib/experiments';

function ExperimentMonitor({ experimentId }) {
  const results = useExperimentResults(experimentId);

  if (!results) {
    return <div>Loading results...</div>;
  }

  return (
    <div>
      <h3>Results</h3>
      <p>Total Users: {results.totalSampleSize}</p>
      <p>Confidence: {(results.overallConfidence * 100).toFixed(1)}%</p>
      {results.winner && (
        <p>Winner: {results.winner.variantId}</p>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Start Simple

Begin with 2 variants (control + 1 treatment):

```typescript
// Bad: Too many variants initially
const bad = createExperiment({
  variants: [ /* 10 variants */ ],
});

// Good: Start with 2
const good = createExperiment({
  variants: [
    { id: 'control', ... },
    { id: 'treatment', ... },
  ],
});
```

### 2. Use Appropriate Metrics

Match metric type to what you're measuring:

```typescript
// Bad: Using count for conversion
const bad = { id: 'conversion', type: 'count' }; // 0, 1, 1, 0, 1...

// Good: Use binary
const good = { id: 'conversion', type: 'binary' }; // 0 or 1

// Bad: Using binary for revenue
const bad2 = { id: 'revenue', type: 'binary' };

// Good: Use numeric
const good2 = { id: 'revenue', type: 'numeric' };
```

### 3. Calculate Sample Size First

Determine required sample size before starting:

```typescript
// Calculate needed sample size
const sampleSize = calculateSampleSize({
  baseline: 0.10,
  mde: 0.02,
  // ...
});

console.log('Need', sampleSize.sampleSize, 'per variant');
console.log('Duration:', sampleSize.durationDays, 'days');

// Set target in experiment
const experiment = createExperiment({
  // ...
  targetSampleSize: sampleSize.sampleSize,
});
```

### 4. Don't Stop Too Early

Wait for minimum sample size:

```typescript
const experiment = createExperiment({
  // ...
  minSampleSizeForStopping: 500, // Don't stop early with less than this
  earlyStopping: true,
});
```

### 5. Use Bandits for Long-Running Tests

Enable bandit optimization for ongoing optimization:

```typescript
const experiment = createExperiment({
  // ...
  bandit: true, // Enable multi-armed bandit
});

// Traffic automatically shifts to better variants
```

### 6. Track Secondary Metrics

Don't optimize primary metric at the expense of others:

```typescript
const experiment = createExperiment({
  primaryMetric: {
    id: 'conversion',
    direction: 'maximize',
  },
  additionalMetrics: [
    { id: 'load_time', direction: 'minimize' }, // Watch performance
    { id: 'user_satisfaction', direction: 'maximize' }, // Watch UX
  ],
});
```

### 7. Segment Analysis

Analyze results by user segments:

```typescript
// After experiment completes
const results = getResults('experiment-id');

// Check results by segment
const powerUserResults = analyzeBySegment(results, 'power-users');
const newUsersResults = analyzeBySegment(results, 'new-users');

// Winner might differ by segment
```

### 8. Document Experiments

Keep good documentation:

```typescript
const experiment = createExperiment({
  name: 'Clear, Descriptive Name',
  description: 'What we're testing and why',
  type: 'ui',
  // ...
  metadata: {
    hypothesis: 'Spacious layout increases engagement',
    owner: 'product-team',
    jiraLink: 'PROJ-123',
    expectedImpact: '+10% engagement',
  },
});
```

---

## API Reference

### Core Functions

#### `createExperiment(options)`

Create a new experiment.

```typescript
const experiment = createExperiment({
  name: string;
  description: string;
  type: ExperimentType;
  variants: Array<{
    id: string;
    name: string;
    config: Record<string, unknown>;
    isControl?: boolean;
    weight?: number;
  }>;
  primaryMetric: {
    id: string;
    name: string;
    type: MetricType;
    direction: 'minimize' | 'maximize';
  };
  additionalMetrics?: Array<...>;
  objective?: PrimaryObjective;
  duration?: number;
  trafficAllocation?: number;
  confidenceThreshold?: number;
  earlyStopping?: boolean;
  bandit?: boolean;
}): Experiment;
```

#### `getVariant(experimentId, userId?)`

Get variant assignment for user.

```typescript
const variant = getVariant('exp-123', 'user-456');
// Returns: Variant | null
```

#### `trackMetric(experimentId, variantId, metricId, value, userId?)`

Track a metric value.

```typescript
trackMetric('exp-123', 'variant-a', 'engagement', 5);
```

#### `trackSuccess(experimentId, variantId, metricId, success, userId?)`

Track binary metric.

```typescript
trackSuccess('exp-123', 'variant-a', 'conversion', true);
```

#### `trackDuration(experimentId, variantId, metricId, startTime, userId?)`

Track duration from startTime.

```typescript
const start = performance.now();
// ... do work ...
trackDuration('exp-123', 'variant-a', 'load_time', start);
```

#### `getResults(experimentId)`

Get experiment results.

```typescript
const results = getResults('exp-123');
// Returns: ExperimentResults | undefined
```

#### `startExperiment(experimentId)`

Start an experiment.

```typescript
startExperiment('exp-123');
```

#### `pauseExperiment(experimentId)`

Pause an experiment.

```typescript
pauseExperiment('exp-123');
```

#### `completeExperiment(experimentId)`

Complete and determine winner.

```typescript
const results = completeExperiment('exp-123');
```

### React Hooks

#### `useVariant(experimentId, userId?)`

Get variant assignment.

```tsx
const variant = useVariant('exp-123', userId);
```

#### `useIsVariant(experimentId, variantId, userId?)`

Check if specific variant is active.

```tsx
const isControl = useIsVariant('exp-123', 'control', userId);
```

#### `useMetricTracker()`

Track metrics.

```tsx
const track = useMetricTracker();
track('exp-123', 'variant-a', 'metric', 1);
```

#### `useBinaryMetric()`

Track binary metrics.

```tsx
const trackSuccess = useBinaryMetric();
trackSuccess('exp-123', 'variant-a', 'conversion', true);
```

#### `useDurationMetric()`

Track duration.

```tsx
const { start, end } = useDurationMetric();
start('exp-123', 'variant-a', 'load_time');
// ... do work ...
end();
```

#### `useExperimentResults(experimentId)`

Get experiment results (auto-refreshing).

```tsx
const results = useExperimentResults('exp-123');
```

### Sample Size Calculation

#### `calculateSampleSize(params)`

Calculate required sample size.

```typescript
const result = calculateSampleSize({
  metricType: 'binary' | 'continuous';
  baseline: number;
  mde: number;
  power: number;
  alpha: number;
  variants: number;
  relativeMDE?: boolean;
});

// Returns: SampleSizeResult
```

#### `SAMPLE_SIZE_CALCULATORS`

Convenience calculators.

```typescript
SAMPLE_SIZE_CALCULATORS.conversionRate(baseline, mde)
SAMPLE_SIZE_CALCULATORS.engagementRate(baseline, mde)
SAMPLE_SIZE_CALCULATORS.continuous(baseline, mde)
```

### Multi-Armed Bandit

#### `MultiArmedBandit`

Bandit implementation.

```typescript
const bandit = new MultiArmedBandit({
  algorithm: 'epsilon-greedy' | 'ucb1' | 'thompson-sampling' | 'adaptive';
  epsilon?: number;
  confidenceLevel?: number;
  learningRate?: number;
  minPullsPerVariant?: number;
  temperature?: number;
  decayExploration?: boolean;
  decayRate?: number;
});

bandit.selectVariant(variants): BanditSelection
bandit.updateReward(variantId, reward): void
bandit.getArmStatistics(): Record<string, BanditArm>
bandit.getBestVariant(): string | null
bandit.hasConverged(threshold?): boolean
bandit.reset(): void
bandit.exportState(): BanditState
```

#### `compareBanditAlgorithms(variants, rewards, rounds?)`

Compare algorithms.

```typescript
const comparison = compareBanditAlgorithms(
  variants,
  { 'variant-a': [0, 1, ...], 'variant-b': [1, 0, ...] },
  1000
);

// Returns: Record<BanditAlgorithm, { totalReward, finalVariant }>
```

#### `recommendBanditAlgorithm(numVariants, expectedVolume, rewardVariance)`

Get algorithm recommendation.

```typescript
const algo = recommendBanditAlgorithm(5, 10000, 'high');
// Returns: BanditAlgorithm
```

---

## Example Experiments

### Example 1: UI Density Test

```typescript
const densityTest = createExperiment({
  name: 'Message Display Density',
  description: 'Test tight vs comfortable vs spacious message spacing',
  type: 'ui',
  variants: [
    {
      id: 'compact',
      name: 'Compact',
      config: { spacing: '0.5rem', fontSize: '0.875rem' },
      isControl: true,
      weight: 0.33,
    },
    {
      id: 'comfortable',
      name: 'Comfortable',
      config: { spacing: '1rem', fontSize: '0.925rem' },
      weight: 0.33,
    },
    {
      id: 'spacious',
      name: 'Spacious',
      config: { spacing: '1.5rem', fontSize: '1rem' },
      weight: 0.34,
    },
  ],
  primaryMetric: {
    id: 'messages_per_session',
    name: 'Messages Per Session',
    type: 'count',
    direction: 'maximize',
  },
  additionalMetrics: [
    {
      id: 'session_duration',
      name: 'Session Duration',
      type: 'duration',
      direction: 'maximize',
    },
  ],
  objective: 'engagement',
  duration: 14 * 24 * 60 * 60 * 1000,
  trafficAllocation: 1.0,
  confidenceThreshold: 0.95,
  earlyStopping: true,
  bandit: false,
});
```

### Example 2: AI Temperature Test

```typescript
const temperatureTest = createExperiment({
  name: 'AI Response Temperature',
  description: 'Test different temperature settings for AI responses',
  type: 'ai',
  variants: [
    {
      id: 'temp_0.3',
      name: 'Conservative (0.3)',
      config: { temperature: 0.3 },
      isControl: true,
      weight: 0.25,
    },
    {
      id: 'temp_0.5',
      name: 'Balanced (0.5)',
      config: { temperature: 0.5 },
      weight: 0.25,
    },
    {
      id: 'temp_0.7',
      name: 'Creative (0.7)',
      config: { temperature: 0.7 },
      weight: 0.25,
    },
    {
      id: 'temp_1.0',
      name: 'Very Creative (1.0)',
      config: { temperature: 1.0 },
      weight: 0.25,
    },
  ],
  primaryMetric: {
    id: 'response_quality',
    name: 'Response Quality',
    type: 'ratio',
    direction: 'maximize',
  },
  additionalMetrics: [
    {
      id: 'response_regenerated',
      name: 'Response Regenerated',
      type: 'binary',
      direction: 'minimize',
    },
  ],
  objective: 'satisfaction',
  duration: 21 * 24 * 60 * 60 * 1000,
  trafficAllocation: 0.5,
  confidenceThreshold: 0.90,
  earlyStopping: true,
  bandit: true,
});
```

### Example 3: Search Algorithm Test

```typescript
const searchTest = createExperiment({
  name: 'Knowledge Search Ranking',
  description: 'Test vector vs hybrid search ranking',
  type: 'algorithm',
  variants: [
    {
      id: 'vector_only',
      name: 'Vector Similarity Only',
      config: { algorithm: 'vector', boostRecent: false },
      isControl: true,
      weight: 0.5,
    },
    {
      id: 'hybrid',
      name: 'Vector + Recency Boost',
      config: { algorithm: 'hybrid', boostRecent: true, decay: 0.9 },
      weight: 0.5,
    },
  ],
  primaryMetric: {
    id: 'search_success',
    name: 'Search Success Rate',
    type: 'binary',
    direction: 'maximize',
  },
  additionalMetrics: [
    {
      id: 'time_to_result',
      name: 'Time to Result Click',
      type: 'duration',
      direction: 'minimize',
    },
    {
      id: 'result_position',
      name: 'Average Result Position',
      type: 'numeric',
      direction: 'minimize',
    },
  ],
  objective: 'engagement',
  duration: 21 * 24 * 60 * 60 * 1000,
  trafficAllocation: 1.0,
  confidenceThreshold: 0.95,
  earlyStopping: true,
  bandit: true,
});
```

---

## Troubleshooting

### Users Not Assigned

**Problem:** `getVariant()` returns `null`

**Solutions:**
1. Check experiment is running: `manager.startExperiment(id)`
2. Check user is in traffic allocation
3. Check experiment status is `'running'`

### No Metrics Recorded

**Problem:** `getResults()` shows zero users

**Solutions:**
1. Ensure metrics are being tracked
2. Check `trackMetrics: true` in config
3. Verify userId is passed when tracking

### Bandit Not Converging

**Problem:** Bandit keeps exploring indefinitely

**Solutions:**
1. Increase `minPullsPerVariant`
2. Check if rewards are noisy (high variance)
3. Try different algorithm

### Build Errors

**Problem:** TypeScript errors with experiments

**Solutions:**
1. Ensure all variant configs match expected structure
2. Check metric types are valid
3. Verify experiment has exactly one control variant

---

## Additional Resources

- [Analytics Documentation](./ANALYTICS.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture](./ARCHITECTURE.md)
- [Best Practices](./BEST_PRACTICES.md)

---

**Last Updated:** 2025-01-05
**Version:** 2.0.0
**Framework:** PersonalLog Experiments
