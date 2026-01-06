# Personalization System Documentation

The PersonalLog personalization system learns from user behavior to provide a tailored experience that adapts to individual preferences and usage patterns.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Pattern Detection](#pattern-detection)
- [Prediction Engine](#prediction-engine)
- [Learning System](#learning-system)
- [Accuracy Tracking](#accuracy-tracking)
- [Privacy & Data Storage](#privacy--data-storage)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Dashboard](#dashboard)

## Overview

The personalization system is designed to make PersonalLog feel magical by anticipating what users want. It achieves this through:

- **Pattern Detection**: Identifying recurring usage patterns over time
- **Prediction Engine**: Using multiple ML models to predict user preferences
- **Online Learning**: Continuously updating predictions based on behavior
- **Accuracy Tracking**: Measuring and improving prediction quality
- **Privacy-First**: All data stored locally, nothing shared externally

### Key Features

- 5+ pattern types detected (temporal, task, workflow, contextual, anomaly)
- Prediction accuracy >80% target
- Cold start handling for new users
- Real-time feedback incorporation
- Comprehensive accuracy metrics
- User-controllable privacy settings

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Personalization Layer                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │   Pattern   │  │  Prediction │  │     Accuracy      │  │
│  │   Detector  │→ │   Engine    │→ │     Tracker       │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────┬─────────┘  │
│         │                │                    │             │
│         └────────────────┴────────────────────┘             │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              User Model & Preferences                 │  │
│  │  - Learned Preferences                               │  │
│  │  - Interaction Patterns                              │  │
│  │  - Confidence Scores                                 │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────┼──────────────────────────────┐  │
│  ▼                      ▼                      ▼         │  │
│  ┌─────────┐      ┌──────────┐          ┌──────────┐  │  │
│  │  Local  │      │ IndexedDB │          │ Dashboard │  │  │
│  │ Memory  │      │  Storage  │          │   UI     │  │  │
│  └─────────┘      └──────────┘          └────┬─────┘  │  │
│                                                  │         │  │
└──────────────────────────────────────────────────┼─────────┘
                                                   │
                                                   ▼
                                      User Interface (React)
```

## Pattern Detection

The system detects 5 types of usage patterns:

### 1. Temporal Patterns

Track when users are active and how that relates to their preferences.

**Detected patterns:**
- Peak usage hours by day of week
- Session duration patterns (short/medium/long)
- Time-based feature preferences
- Most active days

**Detection algorithm:**
```typescript
import { TimePatternAnalyzer } from '@/lib/personalization'

const analyzer = new TimePatternAnalyzer()

// Record activity
analyzer.recordActivity({
  type: 'feature-used',
  timestamp: new Date().toISOString(),
  context: { feature: 'search' }
})

// Detect patterns
const patterns = analyzer.detectPatterns()
console.log(patterns.peakHoursByDay) // { 0: [9, 10, 14], 1: [9, 10, 15], ... }
console.log(patterns.timeBasedPreferences) // { morning: ['search'], afternoon: ['chat'] }
```

**Use cases:**
- Suggest dark mode in evening
- Pre-load frequently used features based on time
- Adjust UI density based on session length patterns

### 2. Task Patterns

Identify which AI providers and features work best for specific tasks.

**Detected patterns:**
- Task type classification (creative writing, coding, research)
- Provider preference per task
- Feature usage per task
- Task success rate

**Detection algorithm:**
```typescript
import { TaskPatternAnalyzer } from '@/lib/personalization'

const analyzer = new TaskPatternAnalyzer()

// Record task execution
analyzer.recordTask(
  'creative-writing',    // task
  'anthropic',           // provider used
  ['JEPA', 'search'],    // features used
  true                   // success
)

// Detect patterns
const patterns = analyzer.detectPatterns()
console.log(patterns.taskProviderMapping)
// { 'creative-writing': 'anthropic', 'coding': 'openai' }

// Predict best provider for task
const provider = analyzer.predictProvider('creative-writing')
console.log(provider) // 'anthropic'
```

**Use cases:**
- Automatically select best provider for task type
- Suggest relevant features for current task
- Warn about low-success-rate tasks

### 3. Workflow Patterns

Identify common action sequences that users perform.

**Detected patterns:**
- Frequent action sequences (e.g., search → select model → send message)
- Workflow frequency and duration
- Success rate per workflow
- Average completion time

**Detection algorithm:**
```typescript
import { WorkflowAnalyzer } from '@/lib/personalization'

const analyzer = new WorkflowAnalyzer()

// Track workflow
analyzer.startWorkflow()
analyzer.recordAction('search-performed')
analyzer.recordAction('model-selected')
analyzer.recordAction('message-sent')
analyzer.endWorkflow(true) // success

// Detect common workflows
const workflows = analyzer.detectWorkflows(3) // min frequency
console.log(workflows)
// [{
//   name: 'search-performed to message-sent',
//   sequence: ['search-performed', 'model-selected', 'message-sent'],
//   frequency: 15,
//   avgDuration: 45000,
//   successRate: 0.93
// }]
```

**Use cases:**
- Suggest next action in workflow
- Automate common workflows
- Identify inefficient workflows

### 4. Contextual Patterns

Predict next action based on current context.

**Detected patterns:**
- Action transition probabilities
- Time between actions
- Context-aware recommendations

**Detection algorithm:**
```typescript
import { ContextualPatternAnalyzer } from '@/lib/personalization'

const analyzer = new ContextualPatternAnalyzer()

// Record transitions
analyzer.recordTransition('search-performed', 'result-clicked', 2500)
analyzer.recordTransition('search-performed', 'search-refined', 1500)

// Detect patterns
const patterns = analyzer.detectPatterns(0.3) // min confidence
console.log(patterns)
// [{
//   trigger: 'search-performed',
//   nextAction: 'result-clicked',
//   confidence: 0.67,
//   avgTimeBetween: 2500
// }]

// Predict next action
const prediction = analyzer.predictNext('search-performed')
console.log(prediction.nextAction) // 'result-clicked'
```

**Use cases:**
- Pre-load likely next action
- Provide contextual shortcuts
- Streamline workflows

### 5. Anomaly Detection

Identify unusual behavior that might indicate issues or opportunities.

**Detected anomalies:**
- Error spikes (unusual error rate)
- Unusual feature usage
- Session abnormalities
- Preference instability

**Detection algorithm:**
```typescript
import { AnomalyDetector } from '@/lib/personalization'

const detector = new AnomalyDetector()

// Record errors
detector.recordError()
detector.recordError()

// Detect anomalies
const anomalies = detector.detectAnomalies()
console.log(anomalies)
// [{
//   type: 'error_spike',
//   description: '15 errors in the last hour',
//   severity: 'medium',
//   timestamp: '2025-01-05T10:30:00Z'
// }]
```

**Use cases:**
- Alert user to unusual behavior
- Trigger help prompts
- Improve system reliability

## Prediction Engine

The prediction engine uses multiple ML models to predict user preferences.

### Available Models

#### 1. Rule-Based Model

Simple, interpretable rules for common patterns.

```typescript
import { RuleBasedModel } from '@/lib/personalization'

const model = new RuleBasedModel()

// Add custom rule
model.addRule(
  'ui.theme',                      // preference
  (ctx) => ctx.timeOfDay === 'night', // condition
  'dark',                          // prediction
  0.7                              // confidence
)

// Predict
const prediction = model.predict('ui.theme', {
  timeOfDay: 'night',
  dayOfWeek: 2,
  recentActions: []
})
console.log(prediction.value) // 'dark'
```

#### 2. Naive Bayes Classifier

Probabilistic classifier based on feature independence.

```typescript
import { NaiveBayesClassifier } from '@/lib/personalization'

const classifier = new NaiveBayesClassifier()

// Train
classifier.train(
  { feature: 'search', view: 'messenger', hour: 'morning' },
  'ui.theme.dark'
)

// Predict
const prediction = classifier.predict({
  feature: 'search',
  view: 'messenger',
  hour: 'morning'
})
console.log(prediction.value) // 'ui.theme.dark'
console.log(prediction.confidence) // 0.75
```

#### 3. K-Nearest Neighbors

Find similar historical sessions to predict preferences.

```typescript
import { KNearestNeighbors } from '@/lib/personalization'

const knn = new KNearestNeighbors(5) // k=5

// Train with feature vectors
knn.train([1, 0, 1, 0], 'dark')
knn.train([0, 1, 0, 1], 'light')

// Predict
const prediction = knn.predict([1, 0, 1, 1])
console.log(prediction.value) // 'dark' (most similar)
```

#### 4. Collaborative Filtering

Find similar users and recommend their preferences.

```typescript
import { CollaborativeFiltering } from '@/lib/personalization'

const cf = new CollaborativeFiltering()

// Add ratings (implicit or explicit)
cf.addRating('user1', 'feature-search', 0.9)
cf.addRating('user1', 'feature-chat', 0.7)
cf.addRating('user2', 'feature-search', 0.8)
cf.addRating('user2', 'feature-chat', 0.9)

// Find similar users
const similarUsers = cf.findSimilarUsers('user1', 5)

// Predict preference
const prediction = cf.predict('user1', 'feature-export')
console.log(prediction.value) // Predicted rating
```

#### 5. Content-Based Filtering

Recommend features based on content similarity.

```typescript
import { ContentBasedFiltering } from '@/lib/personalization'

const cbf = new ContentBasedFiltering()

// Add feature with vector representation
cbf.addFeature('search', 'find messages', [0.8, 0.6, 0.9])
cbf.addFeature('filter', 'filter messages', [0.7, 0.5, 0.8])

// Find similar features
const similar = cbf.findSimilarFeatures('search', 'find messages', 5)

// Suggest features
const suggestions = cbf.suggest('search', 'find messages')
console.log(suggestions.value) // ['filter', ...]
```

### Predictive Engine

Orchestrates all models for comprehensive predictions.

```typescript
import { PredictiveEngine, PatternAnalyzer } from '@/lib/personalization'

const patternAnalyzer = new PatternAnalyzer()
const engine = new PredictiveEngine(patternAnalyzer)

// Train with user actions
engine.train(userActions)

// Predict provider for task
const providerPred = engine.predictProvider('creative-writing', {
  timeOfDay: 'morning',
  dayOfWeek: 2,
  recentActions: []
})
console.log(providerPred.provider) // 'anthropic'
console.log(providerPred.confidence) // 0.85
console.log(providerPred.reason) // 'You've used anthropic for creative-writing 90% successfully'

// Get recommendations
const recommendations = engine.getRecommendations(context)
console.log(recommendations)
// [{
//   type: 'provider',
//   recommendation: 'anthropic',
//   confidence: 0.85,
//   context: 'AI Provider',
//   explanation: '...'
// }]
```

## Learning System

The learning system continuously updates user models based on behavior.

### Preference Signals

Extract preference indicators from user actions.

```typescript
import { PreferenceLearner } from '@/lib/personalization'

const learner = new PreferenceLearner()

// Analyze action for signals
const signals = learner.analyzeAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: 'dark' }
})

console.log(signals)
// [{
//   preferenceKey: 'ui.theme',
//   value: 'dark',
//   strength: 0.8,
//   sourceAction: {...},
//   timestamp: '...'
// }]
```

### Preference Aggregation

Combine multiple signals into learned preferences.

```typescript
import { PreferenceAggregator } from '@/lib/personalization'

const aggregator = new PreferenceAggregator()

// Add signals
aggregator.addSignal(signal1)
aggregator.addSignal(signal2)

// Aggregate into preference
const result = aggregator.aggregate('ui.theme')
console.log(result.value) // 'dark'
console.log(result.confidence) // 0.75
```

### Pattern Detection

Detect usage patterns over time.

```typescript
import { PatternDetector } from '@/lib/personalization'

const detector = new PatternDetector()

// Record sessions
detector.recordSession(3600, 14) // 1 hour at 2pm

// Record feature usage
detector.recordFeatureUsage('search')

// Record errors/help
detector.recordError()
detector.recordHelp()

// Get patterns
const patterns = detector.getPatterns()
console.log(patterns.peakHours) // [14, 15, 16]
console.log(patterns.avgSessionLength) // 3600
console.log(patterns.topFeatures) // ['search', 'chat', ...]
```

### User Model

Manages all user preferences and patterns.

```typescript
import { PersonalizationModel } from '@/lib/personalization'

const model = new PersonalizationModel('user123')

// Get/set preferences
const theme = model.getPreferences().get('ui.theme')
model.getPreferences().set('ui.theme', 'dark', 'explicit')

// Learn preference
model.getPreferences().learn('ui.theme', 'dark', 0.8)

// Update patterns
model.updatePatterns({
  peakHours: [9, 10, 14],
  avgSessionLength: 3600
})

// Control learning
model.toggleLearning(true)
model.disableLearningCategory('ui')
model.isLearningEnabled('communication') // true

// Subscribe to events
model.unsubscribe = model.subscribe((event) => {
  console.log('Event:', event.type)
})
```

## Accuracy Tracking

Measure and improve prediction quality over time.

### Tracking Predictions

```typescript
import { AccuracyTracker } from '@/lib/personalization'

const tracker = new AccuracyTracker()

// Record prediction
const predictionId = tracker.recordPrediction(
  'ui.theme',  // preference key
  'dark',      // predicted value
  0.8,         // confidence
  'naive-bayes' // model
)

// Record feedback
tracker.recordFeedback(predictionId, 'dark') // correct
tracker.recordFeedback(predictionId, 'light') // incorrect

// Get metrics
const metrics = tracker.calculateMetrics()
console.log(metrics.top1Accuracy) // 0.85
console.log(metrics.avgConfidence) // 0.78
console.log(metrics.calibrationScore) // 0.92
```

### Accuracy Metrics

- **Top-1 Accuracy**: Percentage of correct predictions
- **Top-K Accuracy**: Correct in top K predictions
- **Average Confidence**: Mean prediction confidence
- **Calibration Score**: How well confidence matches accuracy (0-1)
- **Brier Score**: Probability forecasting accuracy (lower is better)
- **Per-Metric Accuracy**: Accuracy for each preference
- **Per-Type Accuracy**: Accuracy by category (ui, communication, content)

### Confidence Calibration

Measure how well predicted confidence matches actual accuracy.

```typescript
const metrics = tracker.calculateMetrics()

metrics.accuracyByConfidence.forEach(bucket => {
  console.log(`${bucket.range}:`)
  console.log(`  Expected: ${(bucket.expectedAccuracy * 100).toFixed(0)}%`)
  console.log(`  Actual: ${(bucket.accuracy * 100).toFixed(0)}%`)
  console.log(`  Count: ${bucket.count}`)

  if (Math.abs(bucket.expectedAccuracy - bucket.accuracy) > 0.1) {
    console.log('  ⚠️ Miscalibrated!')
  }
})
```

### A/B Testing

Test personalization improvements.

```typescript
import { ABTestFramework } from '@/lib/personalization'

const abTest = new ABTestFramework()

// Start test
abTest.startTest('personalization_vs_default')

// Record control results
abTest.recordControl('personalization_vs_default', true, 0.7)
abTest.recordControl('personalization_vs_default', false, 0.7)

// Record treatment results
abTest.recordTreatment('personalization_vs_default', true, 0.9)
abTest.recordTreatment('personalization_vs_default', true, 0.9)

// Calculate results
const results = abTest.calculateResults('personalization_vs_default')
console.log(results.controlAccuracy) // 0.5
console.log(results.treatmentAccuracy) // 1.0
console.log(results.lift) // 100% improvement
console.log(results.isSignificant) // true (p < 0.05)
```

### Accuracy Reporting

Generate comprehensive reports.

```typescript
import { AccuracyReporter } from '@/lib/personalization'

const reporter = new AccuracyReporter(tracker, abTest)

// Generate report
const report = reporter.generateReport()
console.log(report.summary)
// {
//   overallAccuracy: 0.85,
//   targetMet: true,
//   totalPredictions: 1000,
//   avgConfidence: 0.78,
//   calibrationScore: 0.92
// }

// Get text summary
const summary = reporter.getSummary()
console.log(summary)
// Prediction Accuracy Report
// ========================
// Overall Accuracy: 85.0%
// Target Met: ✅ Yes (Target: 80%)
// Total Predictions: 1000
// ...
```

## Privacy & Data Storage

All personalization data is stored locally on the user's device.

### Storage API

```typescript
import {
  saveUserModel,
  loadUserModel,
  deleteUserModel,
  exportUserModel,
  importUserModel,
  getStorageStats,
  clearAllPersonalizationData
} from '@/lib/personalization'

// Save model
await saveUserModel('user123', userModel)

// Load model
const model = await loadUserModel('user123')

// Delete model
await deleteUserModel('user123')

// Export model
const json = await exportUserModel('user123')

// Import model
const imported = await importUserModel('user123', json)

// Get storage stats
const stats = await getStorageStats()
console.log(stats.modelCount) // 1
console.log(stats.totalSize) // 45000 bytes

// Clear all data
await clearAllPersonalizationData()
```

### File Export/Import

```typescript
// Export as file
await exportUserModelAsFile('user123', 'personallog-backup.json')

// Import from file
const file = event.target.files[0]
const model = await importUserModelFromFile('user123', file)
```

### Backup/Restore

```typescript
import {
  createBackup,
  restoreBackup
} from '@/lib/personalization'

// Create backup of all models
const backupJson = await createBackup()

// Restore from backup
await restoreBackup(backupJson)
```

## API Reference

### Quick Access Functions

```typescript
import {
  getPreference,
  setPreference,
  recordUserAction,
  explainPreference,
  togglePersonalizationLearning,
  getPersonalizationStats
} from '@/lib/personalization'

// Get preference
const theme = getPreference<'light' | 'dark'>('ui.theme')

// Set preference
setPreference('ui.theme', 'dark')

// Record action
recordUserAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: 'dark' }
})

// Explain preference
const explanation = explainPreference('ui.theme')
console.log(explanation.reason) // 'You set this to "dark"'

// Toggle learning
togglePersonalizationLearning(false)

// Get stats
const stats = getPersonalizationStats()
console.log(stats.learning.totalActionsRecorded)
```

### React Hooks

```typescript
import {
  usePersonalization,
  usePersonalizedSetting,
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  usePersonalizedContent,
  useLearningState,
  usePreferenceExplanation
} from '@/lib/personalization'

// Get personalization instance
const personalization = usePersonalization()

// Get/set setting
const [value, setValue] = usePersonalizedSetting('ui.theme')

// Theme hook
const { theme, setTheme, isDark } = usePersonalizedTheme()

// Typography hook
const { fontSize, setFontSize, density, setDensity } = usePersonalizedTypography()

// Layout hook
const { sidebarPosition, setSidebarPosition } = usePersonalizedLayout()

// Content hook
const { responseLength, setResponseLength, tone, setTone } = usePersonalizedContent()

// Learning state
const { learningEnabled, toggleLearning, totalActionsRecorded } = useLearningState()

// Preference explanation
const explanation = usePreferenceExplanation('ui.theme')
```

### React Components

```typescript
import {
  PersonalizedProvider,
  PersonalizedSetting,
  PersonalizedText,
  PersonalizedContainer,
  PersonalizedTheme,
  PersonalizedExplanation,
  PersonalizedControls
} from '@/lib/personalization'

// Wrap app with provider
<PersonalizedProvider userId="user123">
  <App />
</PersonalizedProvider>

// Display personalized setting
<PersonalizedSetting setting="ui.theme">
  {(value) => <div>Current theme: {value}</div>}
</PersonalizedSetting>

// Adapt text to preferences
<PersonalizedText adapt>
  This text adapts to your reading level and response length preferences.
</PersonalizedText>

// Container with density
<PersonalizedContainer applyDensity>
  <div>Respects density preferences</div>
</PersonalizedContainer>

// Theme wrapper
<PersonalizedTheme>
  <App />
</PersonalizedTheme>

// Show preference explanation
<PersonalizedExplanation setting="ui.theme">
  {(explanation) => (
    <div>
      <p>Value: {explanation.value}</p>
      <p>Why: {explanation.reason}</p>
      <p>Confidence: {explanation.confidence}</p>
    </div>
  )}
</PersonalizedExplanation>

// Personalization controls
<PersonalizedControls />
```

## Usage Examples

### Example 1: Theme Personalization

```typescript
'use client'

import { usePersonalizedTheme } from '@/lib/personalization'

export function ThemeSelector() {
  const { theme, setTheme, isDark } = usePersonalizedTheme()

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
      <p>Current: {theme} ({isDark ? 'dark' : 'light'} mode)</p>
    </div>
  )
}
```

### Example 2: AI Provider Recommendation

```typescript
import { PredictiveEngine, PatternAnalyzer } from '@/lib/personalization'

export function recommendProvider(taskType: string) {
  const patternAnalyzer = new PatternAnalyzer()
  const engine = new PredictiveEngine(patternAnalyzer)

  const context = {
    timeOfDay: 'morning',
    dayOfWeek: new Date().getDay(),
    recentActions: []
  }

  const prediction = engine.predictProvider(taskType, context)

  return {
    provider: prediction.provider,
    confidence: prediction.confidence,
    reason: prediction.reason
  }
}

// Usage
const recommendation = recommendProvider('creative-writing')
console.log(`Recommend ${recommendation.provider} (${recommendation.reason})`)
```

### Example 3: Workflow Automation

```typescript
import { WorkflowAnalyzer } from '@/lib/personalization'

export function setupWorkflowTracking() {
  const analyzer = new WorkflowAnalyzer()

  // Track user actions
  function trackAction(actionType: string) {
    analyzer.recordAction(actionType)
  }

  // Detect workflow completion
  function completeWorkflow(success: boolean) {
    analyzer.endWorkflow(success)

    // Check for common workflows
    const workflows = analyzer.detectWorkflows(3)
    workflows.forEach(workflow => {
      console.log(`Common workflow: ${workflow.name}`)
      console.log(`Frequency: ${workflow.frequency}`)
      console.log(`Success rate: ${workflow.successRate}`)
    })
  }

  return { trackAction, completeWorkflow }
}
```

### Example 4: Accuracy Monitoring

```typescript
import { AccuracyTracker, AccuracyReporter } from '@/lib/personalization'

export function setupAccuracyMonitoring() {
  const tracker = new AccuracyTracker()
  const reporter = new AccuracyReporter(tracker, new ABTestFramework())

  // Track prediction
  function trackPrediction(
    preferenceKey: string,
    predictedValue: any,
    confidence: number
  ) {
    return tracker.recordPrediction(preferenceKey, predictedValue, confidence)
  }

  // Record feedback
  function recordFeedback(predictionId: string, actualValue: any) {
    tracker.recordFeedback(predictionId, actualValue)

    // Check if we're meeting targets
    const metrics = tracker.calculateMetrics()
    if (metrics.top1Accuracy < 0.8) {
      console.warn('Prediction accuracy below 80% target!')
    }
  }

  // Generate report
  function generateReport() {
    return reporter.getSummary()
  }

  return { trackPrediction, recordFeedback, generateReport }
}
```

## Dashboard

The Personalization Dashboard provides a comprehensive view of learned preferences and system performance.

### Features

1. **Overview Tab**
   - Learned preferences summary
   - Actions recorded
   - Learning status
   - Current settings

2. **Patterns Tab**
   - Peak usage hours heatmap
   - Session length statistics
   - Most used features
   - Pattern insights

3. **Accuracy Tab**
   - Overall accuracy score
   - Target achievement (>80%)
   - Per-metric accuracy
   - Confidence calibration
   - Detailed reports

4. **Privacy Tab**
   - Privacy notice
   - Data export
   - Data deletion
   - What we track
   - How we use data

### Usage

```typescript
import { PersonalizationDashboard } from '@/components/personalization/PersonalizationDashboard'

export function SettingsPage() {
  return (
    <PersonalizationDashboard userId="user123" />
  )
}
```

### Screenshot

The dashboard includes:
- Real-time accuracy metrics
- Visual confidence calibration
- Interactive pattern heatmaps
- Privacy controls
- Export/import functionality

## Best Practices

### 1. Start Simple

Begin with rule-based predictions before training complex models.

```typescript
// Good: Start with rules
const ruleModel = new RuleBasedModel()
ruleModel.addRule('ui.theme', ctx => ctx.timeOfDay === 'night', 'dark', 0.7)

// Then: Add ML models as you collect data
const nbModel = new NaiveBayesClassifier()
nbModel.train(features, label)
```

### 2. Handle Cold Start

Provide reasonable defaults for new users.

```typescript
function getPreference(key: string) {
  const learned = userPreferences.get(key)
  if (learned && learned.confidence > 0.5) {
    return learned.value
  }
  // Fall back to default
  return defaultPreferences[key]
}
```

### 3. Respect User Privacy

Always allow users to disable learning and clear data.

```typescript
function recordAction(action: UserAction) {
  if (!isLearningEnabled()) {
    return
  }
  tracker.record(action)
}
```

### 4. Track Accuracy

Monitor prediction quality to ensure the system is improving.

```typescript
const metrics = tracker.calculateMetrics()
if (metrics.top1Accuracy < 0.8) {
  console.warn('Accuracy below target, retraining models...')
  retrainModels()
}
```

### 5. Provide Feedback

Let users know what the system has learned and why.

```typescript
<PersonalizedExplanation setting="ui.theme">
  {(explanation) => (
    <div>
      <p>Theme: {explanation.value}</p>
      <p>{explanation.reason}</p>
      <p>Confidence: {(explanation.confidence * 100).toFixed(0)}%</p>
    </div>
  )}
</PersonalizedExplanation>
```

## Performance Considerations

- **Memory**: Pattern history limited to 10,000 predictions by default
- **Storage**: IndexedDB for persistent storage, ~50KB per user
- **CPU**: Pattern detection runs in background, <100ms for typical usage
- **Network**: No external API calls, fully local

## Troubleshooting

### Low Accuracy

**Problem**: Prediction accuracy below 80%

**Solutions**:
- Collect more training data
- Adjust model parameters
- Try different prediction models
- Check for concept drift (user preferences changing)

### Poor Calibration

**Problem**: Confidence doesn't match accuracy

**Solutions**:
- Use more training data
- Apply temperature scaling
- Check for overfitting
- Use ensemble methods

### Memory Issues

**Problem**: Too much memory used

**Solutions**:
- Reduce history size
- Trim old predictions
- Clear inactive user models
- Use more efficient data structures

## Future Enhancements

- Neural network models for complex patterns
- Federated learning (privacy-preserving)
- Multi-user collaboration
- Advanced anomaly detection
- Real-time model updates
- Cross-device synchronization
