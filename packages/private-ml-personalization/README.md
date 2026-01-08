# @superinstance/private-ml-personalization

> Privacy-first machine learning personalization system that learns user preferences locally

[![npm version](https://badge.fury.io/js/%40superinstance%2Fprivate-ml-personalization.svg)](https://www.npmjs.com/package/@superinstance/private-ml-personalization)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 What is it?

**Private ML Personalization** is a comprehensive, production-ready personalization system that:

- ✅ **Learns from user behavior** - Automatically detects patterns and preferences
- ✅ **100% Privacy-first** - All data stays local, nothing leaves the device
- ✅ **Multiple ML algorithms** - Naive Bayes, KNN, Collaborative Filtering, and more
- ✅ **React integration** - Beautiful hooks for seamless integration
- ✅ **IndexedDB storage** - Persistent local storage with backup/restore
- ✅ **Pattern detection** - Temporal, workflow, contextual, and anomaly detection
- ✅ **Zero dependencies** - Works completely standalone

## 🚀 Quick Start

### Installation

```bash
npm install @superinstance/private-ml-personalization
# or
yarn add @superinstance/private-ml-personalization
# or
pnpm add @superinstance/private-ml-personalization
```

### Basic Usage

```typescript
import { getPersonalizationAPI } from '@superinstance/private-ml-personalization'

// Get the API instance
const api = getPersonalizationAPI()

// Set a preference explicitly
api.set('ui.theme', 'dark')

// Get a preference
const theme = api.get<'light' | 'dark'>('ui.theme')

// Record user actions for learning
api.recordAction({
  type: 'feature-used',
  timestamp: new Date().toISOString(),
  context: { feature: 'search' }
})

// Get learning statistics
const stats = api.getStats()
console.log(stats.patterns.peakHours) // [9, 10, 14] - User's peak hours
```

### React Integration

```tsx
import { usePersonalization, usePersonalizedTheme } from '@superinstance/private-ml-personalization/react'

function ThemeToggle() {
  const { theme, setTheme } = usePersonalizedTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Current: {theme}
    </button>
  )
}

function Settings() {
  const { get, set } = usePersonalization()

  return (
    <div>
      <label>
        Font Size:
        <select
          value={get<number>('ui.fontSize')}
          onChange={(e) => set('ui.fontSize', parseFloat(e.target.value))}
        >
          <option value={0.85}>Small</option>
          <option value={1.0}>Normal</option>
          <option value={1.15}>Large</option>
        </select>
      </label>
    </div>
  )
}
```

## 📚 Features

### 1. Preference Learning

Automatically learn from user behavior:

```typescript
import { PreferenceLearner } from '@superinstance/private-ml-personalization'

const learner = new PreferenceLearner()

// Analyze user actions
const signals = learner.analyzeAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: 'dark' }
})

// Signals suggest: user prefers dark theme with 0.8 confidence
```

### 2. Pattern Detection

Detect complex behavioral patterns:

```typescript
import { PatternAnalyzer } from '@superinstance/private-ml-personalization'

const analyzer = new PatternAnalyzer()

// Detect time patterns
const timePatterns = analyzer.getTimeAnalyzer().detectPatterns()
console.log(timePatterns.peakHoursByDay)
// { 0: [9, 10, 11], 1: [14, 15, 16], ... }

// Detect workflows
const workflows = analyzer.getWorkflowAnalyzer().detectWorkflows(3)
console.log(workflows)
// [
//   { name: "search to edit", frequency: 15, successRate: 0.93 },
//   { name: "create to share", frequency: 8, successRate: 0.87 }
// ]
```

### 3. ML Predictions

Multiple prediction algorithms:

```typescript
import { NaiveBayesClassifier, KNearestNeighbors } from '@superinstance/private-ml-personalization'

// Naive Bayes
const nb = new NaiveBayesClassifier()
nb.train({ feature: 'search', timeOfDay: 'morning' }, 'openai')
nb.train({ feature: 'code', timeOfDay: 'evening' }, 'anthropic')

const prediction = nb.predict({ feature: 'code', timeOfDay: 'evening' })
console.log(prediction)
// { value: 'anthropic', confidence: 0.87, reason: '...' }

// K-Nearest Neighbors
const knn = new KNearestNeighbors(5)
knn.train([1, 0, 1], 'task-a')
knn.train([0, 1, 1], 'task-b')

const result = knn.predict([1, 0, 1])
```

### 4. Accuracy Tracking

Track and measure prediction accuracy:

```typescript
import { AccuracyTracker } from '@superinstance/private-ml-personalization'

const tracker = new AccuracyTracker()

// Record predictions
const predId = tracker.recordPrediction('ui.theme', 'dark', 0.85, 'naive-bayes')

// Record feedback
tracker.recordFeedback(predId, 'dark')

// Get metrics
const metrics = tracker.calculateMetrics()
console.log(metrics.top1Accuracy) // 0.87
console.log(metrics.calibrationScore) // 0.92
```

### 5. Persistent Storage

IndexedDB-based storage with backup/restore:

```typescript
import {
  saveUserModel,
  loadUserModel,
  exportUserModelAsFile,
  importUserModelFromFile
} from '@superinstance/private-ml-personalization'

// Save to IndexedDB
await saveUserModel('user-123', userModel)

// Load from IndexedDB
const model = await loadUserModel('user-123')

// Export as JSON file
await exportUserModelAsFile('user-123', 'my-preferences.json')

// Import from file
await importUserModelFromFile('user-123', fileHandle)
```

### 6. UI Adapters

Apply preferences to UI components:

```typescript
import { PersonalizationAdapter } from '@superinstance/private-ml-personalization'

const adapter = new PersonalizationAdapter(preferenceModel)

// Apply all preferences to document
adapter.applyAll()

// Get theme colors
const theme = adapter.getTheme().getThemeConfig()
console.log(theme.colors.background) // '#0a0a0a'

// Get typography config
const typography = adapter.getTypography().getTypographyConfig()
console.log(typography.fontSize) // 1.15

// Get CSS variables for inline styles
const cssVars = generateCSSVariables(adapter)
```

## 🎨 Preference Types

The system tracks three categories of preferences:

### Communication Preferences
- `responseLength`: 'brief' | 'balanced' | 'detailed'
- `tone`: 'casual' | 'neutral' | 'formal'
- `useEmojis`: boolean
- `formatting`: 'plain' | 'markdown' | 'structured'

### UI Preferences
- `theme`: 'light' | 'dark' | 'auto'
- `density`: 'compact' | 'comfortable' | 'spacious'
- `fontSize`: 0.85 | 1.0 | 1.15 | 1.3
- `animations`: 'none' | 'reduced' | 'full'
- `sidebarPosition`: 'left' | 'right' | 'hidden'
- `autoScrollMessages`: boolean
- `groupMessagesByContext`: boolean

### Content Preferences
- `topicsOfInterest`: string[]
- `readingLevel`: 'simple' | 'standard' | 'advanced'
- `language`: string
- `autoPlayMedia`: boolean
- `recentQueries`: string[]
- `summaryLength`: 'brief' | 'balanced' | 'detailed'
- `technicalDetail`: 'simple' | 'standard' | 'advanced'

## 🔧 Advanced Usage

### Custom Learning Rules

```typescript
import { RuleBasedModel } from '@superinstance/private-ml-personalization'

const model = new RuleBasedModel()

// Add custom prediction rule
model.addRule(
  'ui.density',
  (context) => context.dayOfWeek >= 5, // Weekend
  'spacious',
  0.6
)

const prediction = model.predict('ui.density', {
  timeOfDay: 'morning',
  dayOfWeek: 6,
  recentActions: []
})
```

### A/B Testing

```typescript
import { ABTestFramework } from '@superinstance/private-ml-personalization'

const abTest = new ABTestFramework()

// Start test
abTest.startTest('theme-prediction')

// Record results
abTest.recordControl('theme-prediction', true, 0.8)
abTest.recordTreatment('theme-prediction', true, 0.9)

// Calculate results
const results = abTest.calculateResults('theme-prediction')
console.log(results.lift) // 12.5%
console.log(results.isSignificant) // true
```

### Anomaly Detection

```typescript
import { AnomalyDetector } from '@superinstance/private-ml-personalization'

const detector = new AnomalyDetector()

// Record anomalies
detector.recordError()
detector.recordUnusualFeature('rare-feature')
detector.recordPreferenceChange('ui.theme', 'light', 'dark')

// Get detected anomalies
const anomalies = detector.detectAnomalies()
console.log(anomalies)
// [
//   {
//     type: 'error_spike',
//     description: '12 errors in the last hour',
//     severity: 'medium'
//   }
// ]
```

## 📊 React Hooks Reference

### `usePersonalization(userId?)`

Main hook for accessing personalization system.

```tsx
const {
  get,           // Get preference value
  set,           // Set preference value
  learn,         // Learn from observation
  reset,         // Reset to default
  explain,       // Get explanation
  recordAction,  // Record user action
  toggleLearning,// Toggle learning on/off
  getLearningState,
  getPatterns,
  adapter        // UI adapter instance
} = usePersonalization('user-123')
```

### `usePersonalizedSetting(key, defaultValue)`

Hook for single preference with metadata.

```tsx
const [value, setValue, meta] = usePersonalizedSetting('ui.theme', 'auto')
// meta: { loading: false, source: 'explicit', confidence: 1.0 }
```

### `usePersonalizedTheme()`

Theme-specific hook.

```tsx
const { theme, setTheme, colors, isDark, isLight } = usePersonalizedTheme()
```

### `usePersonalizedTypography()`

Typography-specific hook.

```tsx
const {
  fontSize,
  setFontSize,
  density,
  setDensity,
  fontSizeClass,
  lineHeight,
  letterSpacing
} = usePersonalizedTypography()
```

### `usePersonalizedLayout()`

Layout-specific hook.

```tsx
const {
  density,
  setDensity,
  sidebarPosition,
  setSidebarPosition,
  densityClass,
  spacing
} = usePersonalizedLayout()
```

### `usePersonalizedContent()`

Content-specific hook.

```tsx
const {
  responseLength,
  tone,
  useEmojis,
  formatting,
  readingLevel,
  language,
  autoPlayMedia,
  adaptContent
} = usePersonalizedContent()
```

## 🔒 Privacy & Security

- **100% Local** - All data stored in browser's IndexedDB
- **No tracking** - No telemetry or analytics
- **No network** - Never sends data anywhere
- **User control** - Full export/delete capabilities
- **Transparent** - Open source, auditable code

## 🌐 Browser Support

- Chrome/Edge >= 90
- Firefox >= 88
- Safari >= 14
- Requires IndexedDB support

## 📦 Size

- **Core**: ~45 KB minified
- **React**: ~12 KB minified
- **Tree-shakeable**: Import only what you need

## 🤝 Contributing

Contributions are welcome! Please see [GitHub Issues](https://github.com/SuperInstance/Private-ML-Personalization/issues).

## 📄 License

MIT © [SuperInstance](https://github.com/SuperInstance)

## 🔗 Links

- [GitHub Repository](https://github.com/SuperInstance/Private-ML-Personalization)
- [NPM Package](https://www.npmjs.com/package/@superinstance/private-ml-personalization)
- [Documentation](https://github.com/SuperInstance/Private-ML-Personalization#readme)
- [Issues](https://github.com/SuperInstance/Private-ML-Personalization/issues)

---

Made with ❤️ by [SuperInstance](https://github.com/SuperInstance)
