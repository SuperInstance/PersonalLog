# PersonalLog Personalization Integration Guide

This guide shows how to integrate the personalization system into the existing PersonalLog application.

## Current Integration Points

### 1. Root Layout

Add the PersonalizedProvider to enable personalization app-wide:

```tsx
// src/app/layout.tsx
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

### 2. Messenger Component

Add learning to the chat/messenger interface:

```tsx
// src/components/messenger/ChatArea.tsx
import { recordUserAction } from '@/lib/personalization'

export function ChatArea() {
  const handleExpandResponse = () => {
    // Record action for learning
    recordUserAction({
      type: 'response-expanded',
      timestamp: new Date().toISOString(),
      context: { feature: 'messenger', view: 'chat' }
    })

    // Existing expand logic...
  }

  const handleCollapseResponse = () => {
    recordUserAction({
      type: 'response-collapsed',
      timestamp: new Date().toISOString(),
      context: { feature: 'messenger', view: 'chat' }
    })

    // Existing collapse logic...
  }

  // Track session
  useEffect(() => {
    const startTime = Date.now()

    return () => {
      const duration = (Date.now() - startTime) / 1000 / 60 // minutes
      recordUserAction({
        type: 'session-ended',
        timestamp: new Date().toISOString(),
        context: {
          feature: 'messenger',
          duration
        }
      })
    }
  }, [])

  return (
    // Existing chat UI...
  )
}
```

### 3. Settings Page

Add personalization controls to settings:

```tsx
// src/app/settings/page.tsx
import {
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  useLearningState
} from '@/lib/personalization'

export default function SettingsPage() {
  const { theme, setTheme } = usePersonalizedTheme()
  const { fontSize, setFontSize } = usePersonalizedTypography()
  const { density, setDensity } = usePersonalizedLayout()
  const { learningEnabled, toggleLearning } = useLearningState()

  return (
    <div>
      <section>
        <h2>Appearance</h2>
        <ThemeControl value={theme} onChange={setTheme} />
        <FontSizeControl value={fontSize} onChange={setFontSize} />
        <DensityControl value={density} onChange={setDensity} />
      </section>

      <section>
        <h2>Privacy & Learning</h2>
        <Toggle
          label="Enable Personalization"
          checked={learningEnabled}
          onChange={toggleLearning}
        />
      </section>
    </div>
  )
}
```

### 4. Theme Switcher

Add to existing theme controls:

```tsx
// src/components/layout/ThemeSwitcher.tsx
import { usePersonalizedTheme } from '@/lib/personalization'

export function ThemeSwitcher() {
  const { theme, setTheme } = usePersonalizedTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

### 5. AI Response Adaptation

Adapt AI responses to user preferences:

```tsx
// src/app/api/chat/route.ts
import { getPreference } from '@/lib/personalization'

export async function POST(request: Request) {
  const { messages } = await request.json()

  // Get user's response length preference
  const responseLength = getPreference('communication.responseLength')
  const tone = getPreference('communication.tone')
  const useEmojis = getPreference('communication.useEmojis')

  // Adjust prompt based on preferences
  let systemPrompt = 'You are a helpful assistant.'

  if (responseLength === 'brief') {
    systemPrompt += ' Keep responses concise and to the point.'
  } else if (responseLength === 'detailed') {
    systemPrompt += ' Provide comprehensive, detailed responses.'
  }

  if (tone === 'casual') {
    systemPrompt += ' Use a casual, friendly tone.'
  } else if (tone === 'formal') {
    systemPrompt += ' Use a formal, professional tone.'
  }

  if (useEmojis) {
    systemPrompt += ' Feel free to use emojis to express yourself.'
  }

  // Generate response with adapted prompt
  // ...
}
```

## Action Tracking Locations

Add these tracking calls throughout the app:

### Theme Actions

```typescript
// Wherever theme is changed
recordUserAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: newTheme }
})
```

### Feature Usage

```typescript
// Track when features are used
recordUserAction({
  type: 'feature-used',
  timestamp: new Date().toISOString(),
  context: {
    feature: 'search', // or 'export', 'compaction', etc.
    view: 'conversations'
  }
})
```

### Errors

```typescript
// Track errors (respect privacy - don't record sensitive data)
recordUserAction({
  type: 'error-occurred',
  timestamp: new Date().toISOString(),
  context: {
    feature: 'ai-chat',
    errorCategory: 'api-timeout' // Generic category only
  }
})
```

### Help Requests

```typescript
// Track help-seeking
recordUserAction({
  type: 'help-requested',
  timestamp: new Date().toISOString(),
  context: {
    feature: 'settings',
    helpTopic: 'compaction'
  }
})
```

## Settings Page Enhancement

Add a personalization section to the existing settings:

```tsx
// src/app/settings/personalization/page.tsx
import {
  PersonalizedExplanation,
  PersonalizedControls
} from '@/lib/personalization'

export default function PersonalizationSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Personalization</h1>

      {/* Theme */}
      <section>
        <h2 className="text-lg font-semibold">Theme</h2>
        <PersonalizedControls
          setting="ui.theme"
          label="Theme"
          type="select"
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'Auto (System)' }
          ]}
        />
        <PersonalizedExplanation setting="ui.theme" />
      </section>

      {/* Typography */}
      <section>
        <h2 className="text-lg font-semibold">Typography</h2>
        <PersonalizedControls
          setting="ui.fontSize"
          label="Font Size"
          type="slider"
          min={0.85}
          max={1.3}
          step={0.15}
        />
      </section>

      {/* Communication */}
      <section>
        <h2 className="text-lg font-semibold">AI Responses</h2>
        <PersonalizedControls
          setting="communication.responseLength"
          label="Response Length"
          type="select"
          options={[
            { value: 'brief', label: 'Brief' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'detailed', label: 'Detailed' }
          ]}
        />
      </section>

      {/* Learning Controls */}
      <LearningControls />
    </div>
  )
}

function LearningControls() {
  const {
    learningEnabled,
    toggleLearning,
    disabledCategories,
    disableCategory,
    enableCategory
  } = useLearningState()

  return (
    <section className="border rounded p-4">
      <h2 className="text-lg font-semibold mb-4">Learning Controls</h2>

      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={learningEnabled}
            onChange={(e) => toggleLearning(e.target.checked)}
          />
          <span>Enable learning from my behavior</span>
        </label>

        <div>
          <p className="text-sm font-medium mb-2">Category Learning:</p>
          <CategoryToggle
            label="Communication"
            category="communication"
            disabled={disabledCategories.includes('communication')}
            onToggle={(enabled) =>
              enabled ? enableCategory('communication') : disableCategory('communication')
            }
          />
          <CategoryToggle
            label="UI"
            category="ui"
            disabled={disabledCategories.includes('ui')}
            onToggle={(enabled) =>
              enabled ? enableCategory('ui') : disableCategory('ui')
            }
          />
          <CategoryToggle
            label="Content"
            category="content"
            disabled={disabledCategories.includes('content')}
            onToggle={(enabled) =>
              enabled ? enableCategory('content') : disableCategory('content')
            }
          />
        </div>
      </div>
    </section>
  )
}
```

## Migration Checklist

- [ ] Add PersonalizedProvider to root layout
- [ ] Add action tracking to messenger
- [ ] Add action tracking to AI chat
- [ ] Add theme controls to settings
- [ ] Add typography controls to settings
- [ ] Add communication controls to settings
- [ ] Implement learning controls section
- [ ] Add explanation tooltips
- [ ] Test with different user profiles
- [ ] Update documentation

## Testing Integration

### 1. Verify Learning Works

```typescript
// In browser console
import { getPersonalizationAPI } from '@/lib/personalization'

const api = getPersonalizationAPI()

// Record some actions
api.recordAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: 'dark' }
})

api.recordAction({
  type: 'response-expanded',
  timestamp: new Date().toISOString()
})

// Check learned preferences
const theme = api.get('ui.theme')
console.log('Theme:', theme) // Should be 'dark'

const stats = api.getStats()
console.log('Stats:', stats)
```

### 2. Verify Persistence

```typescript
// Set a preference
api.set('ui.fontSize', 1.15)

// Refresh page
// Should persist the preference

const fontSize = api.get('ui.fontSize')
console.log('Font size:', fontSize) // Should be 1.15
```

### 3. Verify Explanations

```typescript
const explanation = api.explain('ui.theme')
console.log(explanation)
// Should show why theme is set
```

## Performance Considerations

The personalization system is designed to be lightweight:

- Single model instance per user
- Lazy adapter initialization
- Efficient IndexedDB queries
- Minimal memory footprint

Profile these areas after integration:

1. Initial page load (should add < 50ms)
2. Preference access (should be < 1ms)
3. Action recording (should be < 5ms)
4. Storage operations (should be < 100ms)

## Privacy Checklist

- [ ] Inform users about learning in settings
- [ ] Provide easy way to disable learning
- [ ] Allow export of all learned data
- [ ] Allow deletion of all learned data
- [ ] Don't record sensitive content
- [ ] Store everything locally
- [ ] Provide clear explanations

## Support & Troubleshooting

### Learning Not Working

1. Check if learning is enabled: `getLearningState().enabled`
2. Check if category is disabled: `getLearningState().disabledCategories`
3. Verify actions are being recorded
4. Check browser console for errors

### Preferences Not Persisting

1. Check IndexedDB is available
2. Verify no browser extensions blocking storage
3. Check storage quota not exceeded
4. Look for browser console errors

### UI Not Adapting

1. Verify PersonalizedProvider is wrapping app
2. Check adapters are being used
3. Verify CSS variables are set
4. Check for CSS specificity issues

## Next Steps

After integration:

1. Monitor learning accuracy
2. Gather user feedback
3. Refine confidence thresholds
4. Add more action tracking
5. Implement suggested enhancements

---

The personalization system is ready for integration. Start with the provider and basic tracking, then gradually add more features.
