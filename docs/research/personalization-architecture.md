# Personalization System Architecture

## System Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USER INTERACTION                             │
│  (Changes settings, expands responses, uses features, sessions, etc.)     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          ACTION RECORDING LAYER                           │
│  recordUserAction({ type, timestamp, context, data })                    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           PREFERENCE LEARNER                              │
│  • Analyzes actions                                                      │
│  • Extracts signals                                                      │
│  • Assesses signal strength                                              │
│                                                                           │
│  Examples:                                                               │
│  • action: 'theme-changed' → signal: { preference: 'ui.theme', ... }    │
│  • action: 'response-expanded' → signal: { preference: 'responseLength' }│
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         PREFERENCE AGGREGATOR                             │
│  • Buffers signals by preference key                                     │
│  • Aggregates over time                                                  │
│  • Calculates confidence (0-1)                                           │
│  • Returns: { value, confidence }                                       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           PATTERN DETECTOR                                │
│  • Tracks session patterns (duration, timing)                            │
│  • Tracks feature usage                                                  │
│  • Tracks errors and help requests                                       │
│  • Returns: { peakHours, avgSessionLength, topFeatures, ... }           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            USER MODEL                                     │
│  • Stores all preferences (explicit, learned, default)                   │
│  • Stores interaction patterns                                           │
│  • Manages learning state (enabled/disabled)                             │
│  • Provides observation/subscription system                              │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           INDEXEDDB STORAGE                               │
│  • Persists user models locally                                          │
│  • Provides export/import functionality                                  │
│  • Supports backup/restore                                               │
│  • All data stored client-side only                                      │
└──────────────────────────────────────────────────────────────────────────┘
                           │
                           │ (on load)
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            UI ADAPTERS                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Theme        │  │ Typography   │  │ Layout       │  │ Content      │ │
│  │ Adapter      │  │ Adapter      │  │ Adapter      │  │ Adapter      │ │
│  │              │  │              │  │              │  │              │ │
│  │ • Colors     │  │ • Font size  │  │ • Density    │  │ • Tone       │ │
│  │ • Dark/Light │  │ • Line hgt   │  │ • Sidebar    │  │ • Length     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           DOM APPLICATION                                 │
│  • Sets CSS variables                                                   │
│  • Applies data attributes                                               │
│  • Updates document styles                                               │
│                                                                           │
│  Example:                                                                │
│  root.style.setProperty('--color-primary', '#3b82f6')                   │
│  root.setAttribute('data-theme', 'dark')                                 │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         PERSONALIZED UI                                   │
│  • Theme matches user preference                                         │
│  • Typography adapts to reading preference                               │
│  • Layout respects density preference                                    │
│  • Content adapts to communication style                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## React Integration

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            REACT APP                                      │
│                                                                           │
│  <PersonalizedProvider>                                                  │
│    │                                                                      │
│    ├─> Initializes ModelFactory                                          │
│    ├─> Creates/Loads PersonalizationModel                                │
│    ├─> Applies adapters to document                                      │
│    │                                                                      │
│    └─> <App>                                                             │
│          │                                                                │
│          ├─> <ComponentA>                                                │
│          │     │                                                          │
│          │     └─> usePersonalizedTheme()                                │
│          │           │                                                    │
│          │           ├─> get('ui.theme')                                 │
│          │           ├─> set('ui.theme', 'dark')                         │
│          │           └─> adapter.applyTheme()                            │
│          │                                                                │
│          ├─> <ComponentB>                                                │
│          │     │                                                          │
│          │     └─> usePersonalizedTypography()                          │
│          │           │                                                    │
│          │           ├─> get('ui.fontSize')                              │
│          │           ├─> get('ui.density')                               │
│          │           └─> adapter.applyTypography()                      │
│          │                                                                │
│          └─> <SettingsPage>                                              │
│                │                                                          │
│                └─> usePersonalization()                                  │
│                      │                                                    │
│                      ├─> get()                                           │
│                      ├─> set()                                           │
│                      ├─> explain()                                       │
│                      ├─> recordAction()                                  │
│                      └─> toggleLearning()                                │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Setting a Preference

```
User Clicks "Dark Mode"
        │
        ▼
<ThemeSwitcher />
        │
        │ onClick handler
        ▼
setTheme('dark')
        │
        │ calls
        ▼
personalization.set('ui.theme', 'dark')
        │
        ├─> Updates PreferenceModel
        ├─> Sets source='explicit'
        ├─> Sets confidence=1.0
        ├─> Notifies observers
        │       │
        │       └─> Trigger re-render
        │
        └─> Persists to IndexedDB
                │
                ▼
        [IndexedDB: PersonalLogPersonalization]
                │
                ▼
        adapter.applyTheme()
                │
                ├─> Get theme config
                ├─> Set CSS variables
                └─> Set data-theme attribute
                        │
                        ▼
                UI updates to dark mode
```

## Data Flow: Learning from Behavior

```
User Expands AI Response
        │
        ▼
<ExpandButton onClick={handleExpand} />
        │
        │ onClick handler
        ▼
recordUserAction({
  type: 'response-expanded',
  timestamp: '...',
  context: { feature: 'ai-chat' }
})
        │
        ▼
PreferenceLearner.analyzeAction()
        │
        ├─> Extract signal
        │   {
        │     preferenceKey: 'communication.responseLength',
        │     value: 'detailed',
        │     strength: 0.6
        │   }
        │
        ▼
PreferenceAggregator.addSignal()
        │
        ├─> Add to buffer
        ├─> Calculate confidence
        │   (based on observations, consistency, recency)
        │
        ▼
if (confidence > threshold)
        │
        ├─> model.preferences.learn()
        │   {
        │     key: 'communication.responseLength',
        │     value: 'detailed',
        │     confidence: 0.72
        │   }
        │
        ▼
Notify observers
        │
        └─> <PreferenceExplanation>
            shows: "Based on 12 observations,
                    I think you might prefer detailed"
```

## Storage Schema

```
IndexedDB: PersonalLogPersonalization
└─ ObjectStore: user-models
   │
   ├─ Key: userId (string)
   │
   └─ Value: {
        version: 1,
        userId: "user-123",
        checksum: "a1b2c3d4",
        model: {
          userId: "user-123",
          communication: {
            key: "communication.responseLength",
            value: "detailed",
            defaultValue: "balanced",
            source: "learned",
            confidence: 0.72,
            lastUpdated: "2026-01-02T10:30:00Z",
            observationCount: 12
          },
          ui: { /* similar */ },
          content: { /* similar */ },
          patterns: {
            peakHours: [9, 14, 20],
            avgSessionLength: 35,
            topFeatures: ["chat", "search", "export"],
            errorFrequency: 0.05,
            helpSeekFrequency: 0.1
          },
          preferences: {
            "communication.responseLength": { /* ... */ },
            "ui.theme": { /* ... */ },
            // ... all preferences
          },
          learning: {
            enabled: true,
            disabledCategories: [],
            totalActionsRecorded: 234,
            learningStartedAt: "2026-01-01T00:00:00Z",
            lastActionAt: "2026-01-02T10:30:00Z"
          }
        }
      }
```

## Component Hierarchy

```
PersonalizedProvider
│
├─ PersonalizedContainer
│   └─ Applies density & font size classes
│
├─ PersonalizedTheme
│   └─ Applies theme-specific styling
│
├─ PersonalizedSetting
│   └─ Renders based on setting value
│
├─ PersonalizedText
│   └─ Adapts text to preferences
│
└─ PersonalizedExplanation
    └─ Shows why setting is configured

Hooks:
│
├─ usePersonalization()
│   └─ Main access to all features
│
├─ usePersonalizedTheme()
│   └─ Theme-specific
│
├─ usePersonalizedTypography()
│   └─ Typography-specific
│
├─ usePersonalizedLayout()
│   └─ Layout-specific
│
├─ usePersonalizedContent()
│   └─ Content-specific
│
└─ useLearningState()
    └─ Learning controls
```

## Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT SYSTEM                              │
│                                                             │
│  User Action → Learner → Aggregator → Model Update          │
│       │                                                      │
│       └────────────────────────────────────────────────┐   │
│                                                          │   │
│                                                          ▼   │
│  ┌────────────────────────────────────────────────────┐  │   │
│  │            OBSERVER PATTERN                         │  │   │
│  │                                                     │  │   │
│  │  preference.subscribe((event) => {                 │  │   │
│  │    if (event.type === 'preference-changed')        │  │   │
│  │      updateUI(event.key, event.value)              │  │   │
│  │  })                                                │  │   │
│  │                                                     │  │   │
│  │  Events:                                           │  │   │
│  │  • preference-changed                              │  │   │
│  │  • preference-learned                              │  │   │
│  │  • pattern-detected                                │  │   │
│  │  • learning-toggled                                │  │   │
│  └────────────────────────────────────────────────────┘  │   │
│                                                         │   │
│  React Components Hook Into Events                      │   │
│                                                         │   │
└─────────────────────────────────────────────────────────┘   │
                                                              │
                                                              ▼
                                                    UI Updates
```

## Privacy Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PRIVACY LAYER                           │
│                                                             │
│  User Data                                                  │
│      │                                                      │
│      ├─> Local Browser Storage Only                        │
│      │    • IndexedDB                                       │
│      │    • Never sent to servers                           │
│      │    • Encrypted at rest (OS level)                   │
│      │                                                      │
│      ├─> User Control                                      │
│      │    • View all learned data                          │
│      │    • Delete any preference                         │
│      │    • Disable learning entirely                      │
│      │    • Export all data                               │
│      │                                                      │
│      └─> Transparency                                      │
│           • Explain every decision                        │
│           • Show confidence levels                        │
│           • Show data sources                             │
│           • No hidden tracking                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

This architecture ensures:
- Clear separation of concerns
- Testable components
- Easy to maintain and extend
- Privacy-first design
- Transparent to users
