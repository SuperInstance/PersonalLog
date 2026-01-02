# Personalization Quick Start Guide

## Installation

The personalization system is already integrated into PersonalLog. No installation needed.

## 5-Minute Setup

### 1. Wrap Your App with the Provider

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

### 2. Use Personalized Settings

```tsx
// app/settings/page.tsx
import { usePersonalizedSetting } from '@/lib/personalization'

export default function SettingsPage() {
  const [theme, setTheme] = usePersonalizedSetting('ui.theme', 'auto')

  return (
    <div>
      <h1>Settings</h1>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
    </div>
  )
}
```

### 3. Record User Actions (Automatic Learning)

```tsx
import { recordUserAction } from '@/lib/personalization'

// When user expands a response
function handleExpand() {
  recordUserAction({
    type: 'response-expanded',
    timestamp: new Date().toISOString(),
    context: { feature: 'ai-chat' }
  })
}

// When user changes a setting
function handleThemeChange(newTheme: string) {
  recordUserAction({
    type: 'theme-changed',
    timestamp: new Date().toISOString(),
    data: { value: newTheme }
  })
}
```

## Common Patterns

### Theme Switcher

```tsx
import { usePersonalizedTheme } from '@/lib/personalization'

export function ThemeSwitcher() {
  const { theme, setTheme } = usePersonalizedTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
    </button>
  )
}
```

### Personalized Container

```tsx
import { PersonalizedContainer } from '@/lib/personalization'

export function MyComponent() {
  return (
    <PersonalizedContainer applyDensity applyFontSize>
      <div>This content respects user's density and font size preferences</div>
    </PersonalizedContainer>
  )
}
```

### Show Why a Setting is Configured

```tsx
import { PersonalizedExplanation } from '@/lib/personalization'

export function SettingExplanation() {
  return (
    <PersonalizedExplanation setting="ui.theme">
      {(explanation) => (
        <div className="text-sm text-gray-600">
          <p>Current: {explanation.value}</p>
          <p>Why: {explanation.reason}</p>
          {explanation.source === 'learned' && (
            <p>Confidence: {Math.round(explanation.confidence * 100)}%</p>
          )}
        </div>
      )}
    </PersonalizedExplanation>
  )
}
```

## All Preference Keys

```typescript
// Communication
'communication.responseLength'     // 'brief' | 'balanced' | 'detailed'
'communication.tone'               // 'casual' | 'neutral' | 'formal'
'communication.useEmojis'          // boolean
'communication.formatting'         // 'plain' | 'markdown' | 'structured'

// UI
'ui.theme'                         // 'light' | 'dark' | 'auto'
'ui.density'                       // 'compact' | 'comfortable' | 'spacious'
'ui.fontSize'                      // 0.85 | 1.0 | 1.15 | 1.3
'ui.animations'                    // 'none' | 'reduced' | 'full'
'ui.sidebarPosition'               // 'left' | 'right' | 'hidden'

// Content
'content.topicsOfInterest'         // string[]
'content.readingLevel'             // 'simple' | 'standard' | 'advanced'
'content.language'                 // string
'content.autoPlayMedia'            // boolean
```

## Learning Actions

Record these actions to enable learning:

```typescript
// Theme
{ type: 'theme-changed', data: { value: 'dark' } }

// Response preferences
{ type: 'response-expanded' }
{ type: 'response-collapsed' }

// Typography
{ type: 'font-size-changed', data: { value: 1.15 } }

// Layout
{ type: 'sidebar-toggled', data: { position: 'right' } }

// Content
{ type: 'emoji-used' }

// Usage tracking
{ type: 'feature-used', context: { feature: 'search' } }
{ type: 'session-ended', context: { duration: 30 } }
{ type: 'error-occurred' }
{ type: 'help-requested' }

// General
{ type: 'setting-changed', data: { setting: 'key', value: 'value' } }
```

## Testing Personalization

```typescript
// Set up test user
import { getPersonalizationAPI } from '@/lib/personalization'

const api = getPersonalizationAPI()

// Set preferences
api.set('ui.theme', 'dark')
api.set('communication.responseLength', 'detailed')

// Record actions
api.recordAction({
  type: 'response-expanded',
  timestamp: new Date().toISOString()
})

// Check learning
const stats = api.getStats()
console.log(stats.patterns)
console.log(stats.aggregationStats)
```

## Need More Info?

See the full documentation: `docs/research/personalization.md`
