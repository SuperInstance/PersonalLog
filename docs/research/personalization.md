# PersonalLog Personalization System

**Author:** Personalization Models Architect
**Date:** 2026-01-02
**Round:** 3
**Status:** Complete

## Overview

The Personalization System learns and adapts to each user's unique preferences, making PersonalLog feel like it "knows" the user. The system observes behavior, builds models of tendencies, and automatically adjusts the UI while always respecting user boundaries and providing full control.

## Philosophy

The personalization system is built on these core principles:

1. **Unobtrusive Learning:** Observes without being creepy or intrusive
2. **Transparency:** Always explains why settings are configured a certain way
3. **User Control:** Users can view, edit, override, or disable any learned preference
4. **Privacy First:** All models stored locally, never shared without consent
5. **Boundaries:** Never changes sensitive settings without asking

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  (Components use hooks to access personalization)                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      React Hooks Layer                           │
│  - usePersonalization()                                         │
│  - usePersonalizedSetting()                                     │
│  - usePersonalizedTheme()                                       │
│  - usePersonalizedTypography()                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      API Layer                                   │
│  - getPersonalizationAPI()                                      │
│  - getPreference(), setPreference()                             │
│  - recordUserAction()                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Core Systems Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │  Preference     │  │  Preference     │  │  Pattern       │ │
│  │  Learner        │  │  Aggregator     │  │  Detector      │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  User Model     │  │  UI Adapters    │                      │
│  │  Manager        │  │  (Apply to DOM) │                      │
│  └─────────────────┘  └─────────────────┘                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Storage Layer                                  │
│  - IndexedDB persistence                                        │
│  - Export/Import functionality                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Personalization Dimensions

### 1. Communication Style

How PersonalLog communicates with the user.

| Setting | Values | Description |
|---------|--------|-------------|
| `responseLength` | brief, balanced, detailed | Preferred AI response length |
| `tone` | casual, neutral, formal | Communication tone |
| `useEmojis` | boolean | Whether to use emoji |
| `formatting` | plain, markdown, structured | Default formatting style |

**Learning Signals:**
- User consistently expands AI responses → Increase response length
- User writes casually → Match tone
- User uses emojis → Enable emojis
- User prefers markdown → Use markdown formatting

### 2. UI Preferences

Visual and interaction preferences.

| Setting | Values | Description |
|---------|--------|-------------|
| `theme` | light, dark, auto | Color theme |
| `density` | compact, comfortable, spacious | UI spacing |
| `fontSize` | 0.85, 1.0, 1.15, 1.3 | Font size multiplier |
| `animations` | none, reduced, full | Animation level |
| `sidebarPosition` | left, right, hidden | Sidebar location |

**Learning Signals:**
- User manually changes theme → Remember preference
- User increases font size → Remember larger preference
- User collapses all sections → Prefer compact density
- System time + usage → Suggest auto theme

### 3. Content Preferences

Content consumption preferences.

| Setting | Values | Description |
|---------|--------|-------------|
| `topicsOfInterest` | string[] | Topics user engages with |
| `readingLevel` | simple, standard, advanced | Content complexity |
| `language` | string | Preferred language |
| `autoPlayMedia` | boolean | Auto-play audio/video |

**Learning Signals:**
- User reads certain topics → Highlight related content
- User looks up words often → Simplify reading level
- User pauses media → Disable auto-play

### 4. Interaction Patterns

Learned behavioral patterns (read-only).

| Pattern | Type | Description |
|---------|------|-------------|
| `peakHours` | number[] | Most active hours (0-23) |
| `avgSessionLength` | number | Typical session duration (minutes) |
| `topFeatures` | string[] | Most used features |
| `errorFrequency` | number | Errors per session (0-1) |
| `helpSeekFrequency` | number | Help requests per session |

**Learning Signals:**
- Session timing → Peak hours
- Session duration → Average length
- Feature usage → Top features
- Errors/help requests → Support needs

## Quick Start

### Basic Usage

```tsx
'use client'

import { usePersonalization } from '@/lib/personalization'

export default function SettingsPage() {
  const personalization = usePersonalization()

  // Get a preference
  const theme = personalization.get('ui.theme')

  // Set a preference (explicit)
  const handleThemeChange = (newTheme) => {
    personalization.set('ui.theme', newTheme)
  }

  // Learn from user action
  const handleExpandResponse = () => {
    personalization.recordAction({
      type: 'response-expanded',
      timestamp: new Date().toISOString(),
      context: { feature: 'ai-chat' }
    })
  }

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => handleThemeChange('dark')}>
        Dark Mode
      </button>
    </div>
  )
}
```

### Using Hooks

```tsx
import {
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout
} from '@/lib/personalization'

function MyComponent() {
  const { theme, setTheme, colors } = usePersonalizedTheme()
  const { fontSize, fontSizeClass } = usePersonalizedTypography()
  const { density, densityClass } = usePersonalizedLayout()

  return (
    <div className={`${densityClass} ${fontSizeClass}`}>
      <h1 style={{ color: colors.primary }}>
        Content adapted to your preferences
      </h1>
    </div>
  )
}
```

### Provider Setup

```tsx
// app/layout.tsx
import { PersonalizedProvider } from '@/lib/personalization'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PersonalizedProvider applyToDocument>
          {children}
        </PersonalizedProvider>
      </body>
    </html>
  )
}
```

## Learning System

### How Learning Works

1. **User Action:** User interacts with the app
2. **Signal Extraction:** Learner extracts preference signals
3. **Aggregation:** Multiple signals are combined
4. **Confidence Calculation:** System assesses confidence (0-1)
5. **Preference Update:** Model updates if confident enough

### Recording Actions

```typescript
import { recordUserAction } from '@/lib/personalization'

// User expanded an AI response
recordUserAction({
  type: 'response-expanded',
  timestamp: new Date().toISOString(),
  context: {
    feature: 'ai-chat',
    view: 'conversation'
  },
  data: {
    previousLength: 'brief',
    newLength: 'detailed'
  }
})

// User changed theme
recordUserAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: {
    value: 'dark'
  }
})

// Session ended
recordUserAction({
  type: 'session-ended',
  timestamp: new Date().toISOString(),
  context: {
    duration: 45 // minutes
  }
})
```

### Confidence Levels

| Confidence | Meaning | Behavior |
|------------|---------|----------|
| 0.0 - 0.3 | Weak | Not enough data, don't apply |
| 0.3 - 0.6 | Medium | Tentatively suggest |
| 0.6 - 0.8 | Strong | Likely preference, apply |
| 0.8 - 1.0 | Very Strong | Almost certain, apply confidently |

## API Reference

### Core API

```typescript
// Get API instance
const api = getPersonalizationAPI()

// Get preference value
const theme = api.get('ui.theme')

// Set preference (explicit)
api.set('ui.theme', 'dark')

// Reset to default
api.reset('ui.theme')

// Explain why a setting is configured
const explanation = api.explain('ui.theme')
// Returns: { value, reason, confidence, source, lastUpdated }

// Record action for learning
api.recordAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: 'dark' }
})

// Toggle learning
api.toggleLearning(false) // Disable learning

// Get statistics
const stats = api.getStats()
```

### React Hooks

#### `usePersonalization()`

Main hook for accessing personalization.

```typescript
const personalization = usePersonalization()

// Methods:
personalization.get<T>(key)           // Get value
personalization.set(key, value)       // Set value
personalization.learn(key, value, conf)  // Learn preference
personalization.reset(key)            // Reset to default
personalization.explain(key)          // Get explanation
personalization.recordAction(action)  // Record for learning
personalization.toggleLearning(bool)  // Enable/disable
personalization.getLearningState()    // Get state
```

#### `usePersonalizedSetting(key, defaultValue)`

Get/set single setting.

```typescript
const [theme, setTheme] = usePersonalizedSetting('ui.theme', 'auto')
// theme: current value
// setTheme: function to change it
```

#### `usePersonalizedTheme()`

Theme-specific hook.

```typescript
const { theme, setTheme, colors, isDark } = usePersonalizedTheme()
```

#### `usePersonalizedTypography()`

Typography preferences.

```typescript
const { fontSize, setFontSize, density, fontSizeClass } = usePersonalizedTypography()
```

#### `usePersonalizedLayout()`

Layout preferences.

```typescript
const { density, setDensity, sidebarPosition, densityClass } = usePersonalizedLayout()
```

#### `usePersonalizedContent()`

Content preferences.

```typescript
const {
  responseLength,
  tone,
  useEmojis,
  adaptContent
} = usePersonalizedContent()

const adaptedText = adaptContent(originalText)
```

### Components

#### `<PersonalizedProvider>`

Wrap app to enable personalization.

```tsx
<PersonalizedProvider userId="user-123" applyToDocument>
  <App />
</PersonalizedProvider>
```

#### `<PersonalizedSetting>`

Render based on setting.

```tsx
<PersonalizedSetting setting="ui.theme" options={['light', 'dark']}>
  {(theme) => <ThemeProvider theme={theme} />}
</PersonalizedSetting>
```

#### `<PersonalizedText>`

Text that adapts to preferences.

```tsx
<PersonalizedText adapt>
  This text will be adapted based on reading level and tone preferences.
</PersonalizedText>
```

#### `<PersonalizedExplanation>`

Show why a setting is configured.

```tsx
<PersonalizedExplanation setting="ui.theme">
  {(explanation) => (
    <div>
      <p>Why: {explanation.reason}</p>
      <p>Confidence: {explanation.confidence * 100}%</p>
    </div>
  )}
</PersonalizedExplanation>
```

## Storage & Persistence

### IndexedDB Storage

All personalization data is stored locally in IndexedDB:

- Database: `PersonalLogPersonalization`
- Store: `user-models`
- Key: `userId`

### Export/Import

```typescript
import {
  exportUserModelAsFile,
  importUserModelFromFile
} from '@/lib/personalization'

// Export to file
await exportUserModelAsFile('user-123', 'backup.json')

// Import from file
const model = await importUserModelFromFile('user-123', fileInput.files[0])
```

### Backup/Restore

```typescript
import { createBackup, restoreBackup } from '@/lib/personalization'

// Create backup of all models
const backupJson = await createBackup()

// Restore from backup
await restoreBackup(backupJson)
```

### Clear Data

```typescript
import { clearAllPersonalizationData } from '@/lib/personalization'

// Delete all personalization data
await clearAllPersonalizationData()
```

## Privacy & Ethics

### Privacy Guarantees

1. **Local-First:** All models stored locally, never sent to servers
2. **User Access:** Users can view all learned preferences
3. **Export:** Full data export available
4. **Delete:** Complete deletion supported
5. **Opt-Out:** Learning can be disabled entirely

### Transparent Explanations

Every preference includes:

- **Value:** Current setting
- **Reason:** Why it's set this way
- **Source:** explicit, learned, or default
- **Confidence:** How sure the system is (0-1)
- **Last Updated:** When it was last changed
- **Observation Count:** How many data points

Example explanation:

```
Why: Based on 47 observations. I'm quite confident you prefer this.
Source: learned
Confidence: 82%
Observations: 47
Last Updated: 2026-01-02T10:30:00Z
```

### Boundaries

The system respects boundaries:

- **Never** changes sensitive settings without asking
- **Always** allows override of learned preferences
- **Shows** confidence levels so users know when to trust
- **Requires** explicit opt-in for major changes
- **Respects** disabled categories

## Advanced Usage

### Custom Learning Rules

```typescript
import { PreferenceLearner } from '@/lib/personalization'

const learner = new PreferenceLearner()

const signals = learner.analyzeAction({
  type: 'custom-action',
  timestamp: new Date().toISOString(),
  data: { customData: 'value' }
})

// Process signals manually
signals.forEach(signal => {
  console.log(`Learned: ${signal.preferenceKey} = ${signal.value}`)
})
```

### Custom Pattern Detection

```typescript
import { PatternDetector } from '@/lib/personalization'

const detector = new PatternDetector()

// Record patterns
detector.recordSession(30, 14) // 30 min session at 2 PM
detector.recordFeatureUsage('search')
detector.recordError()

// Get detected patterns
const patterns = detector.getPatterns()
console.log(patterns.peakHours) // [14]
console.log(patterns.topFeatures) // ['search']
console.log(patterns.errorFrequency) // 1.0
```

### Event Subscription

```typescript
import { usePersonalizationEffect } from '@/lib/personalization'

function MyComponent() {
  usePersonalizationEffect({
    onPreferenceChanged: (key, value) => {
      console.log(`${key} changed to ${value}`)
    },
    onPreferenceLearned: (key, value, confidence) => {
      if (confidence > 0.8) {
        console.log(`High confidence learned: ${key} = ${value}`)
      }
    },
    onPatternDetected: (pattern) => {
      console.log(`Pattern detected: ${pattern}`)
    }
  })

  return <div>...</div>
}
```

## Best Practices

### DO

- Record user actions consistently
- Provide explanations for learned preferences
- Allow users to override any setting
- Show confidence levels
- Respect user boundaries
- Test with different user profiles

### DON'T

- Change sensitive settings without asking
- Hide that you're learning
- Make it impossible to disable learning
- Share learned data without consent
- Over-explain trivial preferences
- Apply low-confidence suggestions

## Testing

### Test Different User Profiles

```typescript
// User who prefers brevity
const briefUser = createTestUser({
  communication: { responseLength: 'brief' }
})

// User who prefers dark mode
const darkModeUser = createTestUser({
  ui: { theme: 'dark' }
})

// User with many sessions
const powerUser = createTestUser({
  patterns: {
    avgSessionLength: 120,
    topFeatures: ['search', 'export', 'settings']
  }
})
```

### Test Learning

```typescript
// Test signal extraction
const learner = new PreferenceLearner()
const signals = learner.analyzeAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: 'dark' }
})

assert(signals.length > 0)
assert(signals[0].preferenceKey === 'ui.theme')
assert(signals[0].value === 'dark')
assert(signals[0].strength >= 0.8)
```

## Success Criteria

All success criteria met:

- ✅ Learns from user behavior
- ✅ Models persist and load correctly
- ✅ UI adapts automatically
- ✅ User has full control
- ✅ Explanations are clear
- ✅ Learning is unobtrusive

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/personalization/types.ts` | 233 | Type definitions |
| `src/lib/personalization/learner.ts` | 397 | Learning system |
| `src/lib/personalization/models.ts` | 429 | User models |
| `src/lib/personalization/adapters.ts` | 523 | UI adapters |
| `src/lib/personalization/storage.ts` | 367 | IndexedDB storage |
| `src/lib/personalization/hooks.tsx` | 438 | React hooks |
| `src/components/personalization/Personalized.tsx` | 313 | React components |
| `src/lib/personalization/index.ts` | 229 | Public API |
| **Total** | **2,928** | Complete system |

## Next Steps

### Integration

1. Add personalization tracking to existing features
2. Wrap app with `PersonalizedProvider`
3. Replace hardcoded settings with personalized values
4. Add explanations tooltips to settings
5. Implement learning controls in settings page

### Enhancement Opportunities

1. **Collaborative Filtering:** "Users like you prefer..."
2. **A/B Testing:** Test learned preferences before applying
3. **Machine Learning:** Better pattern recognition
4. **Cross-Device Sync:** Optional cloud sync
5. **Export Insights:** "You're most productive at 2 PM"

### Monitoring

Track these metrics:

- Learning accuracy (user acceptance rate)
- Preference override frequency
- Session duration improvements
- Feature usage changes
- User satisfaction

---

**The personalization system is complete and ready for integration.** It provides a robust, privacy-first way to make PersonalLog feel like it truly knows each user while always maintaining transparency and control.
