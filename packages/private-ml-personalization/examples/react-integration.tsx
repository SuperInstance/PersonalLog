/**
 * Example 3: React Integration
 *
 * This example demonstrates how to use the personalization system
 * with React components and hooks.
 */

import React, { useState, useEffect } from 'react'
import {
  usePersonalization,
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  usePersonalizedContent,
  usePersonalizedSetting,
  useLearningState
} from '@superinstance/private-ml-personalization/react'

// ============================================================================
// Example 1: Theme Toggle Component
// ============================================================================

export function ThemeToggle() {
  const { theme, setTheme, colors, isDark } = usePersonalizedTheme()

  return (
    <div style={{ padding: '20px', background: colors?.background }}>
      <h3 style={{ color: colors?.foreground }}>Theme Settings</h3>
      <p>Current theme: {theme}</p>
      {isDark && <span>🌙</span>}
      {!isDark && <span>☀️</span>}

      <div>
        <button onClick={() => setTheme('light')}>
          Light
        </button>
        <button onClick={() => setTheme('dark')}>
          Dark
        </button>
        <button onClick={() => setTheme('auto')}>
          Auto
        </button>
      </div>

      <div style={{ marginTop: '10px', fontSize: '12px', color: colors?.muted }}>
        CSS Variables:
        <br />
        --color-background: {colors?.background}
        <br />
        --color-foreground: {colors?.foreground}
      </div>
    </div>
  )
}

// ============================================================================
// Example 2: Typography Settings
// ============================================================================

export function TypographySettings() {
  const {
    fontSize,
    setFontSize,
    density,
    setDensity,
    fontSizeClass
  } = usePersonalizedTypography()

  return (
    <div className={`p-4 ${fontSizeClass}`}>
      <h3>Typography Settings</h3>

      <div>
        <label>Font Size: {(fontSize * 100).toFixed(0)}%</label>
        <input
          type="range"
          min={0.85}
          max={1.3}
          step={0.15}
          value={fontSize}
          onChange={(e) => setFontSize(parseFloat(e.target.value) as any)}
        />
        <span> ({fontSizeClass})</span>
      </div>

      <div>
        <label>UI Density:</label>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as any)}
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>
    </div>
  )
}

// ============================================================================
// Example 3: Layout Settings
// ============================================================================

export function LayoutSettings() {
  const {
    density,
    setDensity,
    sidebarPosition,
    setSidebarPosition,
    spacing
  } = usePersonalizedLayout()

  return (
    <div>
      <h3>Layout Settings</h3>

      <div>
        <label>Sidebar Position:</label>
        <select
          value={sidebarPosition}
          onChange={(e) => setSidebarPosition(e.target.value as any)}
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      <div>
        <label>Spacing Scale:</label>
        <ul>
          <li>XS: {spacing?.xs}</li>
          <li>SM: {spacing?.sm}</li>
          <li>MD: {spacing?.md}</li>
          <li>LG: {spacing?.lg}</li>
          <li>XL: {spacing?.xl}</li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// Example 4: Content Personalization
// ============================================================================

export function ContentPersonalization() {
  const {
    responseLength,
    setResponseLength,
    tone,
    setTone,
    useEmojis,
    setUseEmojis,
    adaptContent
  } = usePersonalizedContent()

  const [content, setContent] = useState('This is an example content that will be adapted based on your preferences.')

  return (
    <div>
      <h3>Content Preferences</h3>

      <div>
        <label>Response Length:</label>
        <select
          value={responseLength}
          onChange={(e) => setResponseLength(e.target.value as any)}
        >
          <option value="brief">Brief</option>
          <option value="balanced">Balanced</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>

      <div>
        <label>Tone:</label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as any)}
        >
          <option value="casual">Casual</option>
          <option value="neutral">Neutral</option>
          <option value="formal">Formal</option>
        </select>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={useEmojis}
            onChange={(e) => setUseEmojis(e.target.checked)}
          />
          Use Emojis
        </label>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5' }}>
        <h4>Adapted Content Preview:</h4>
        <p>{adaptContent(content)}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Example 5: Custom Settings with Metadata
// ============================================================================

export function CustomSetting() {
  const [animationLevel, setAnimationLevel, meta] = usePersonalizedSetting(
    'ui.animations',
    'reduced'
  )

  return (
    <div>
      <h4>Animation Level</h4>
      <select
        value={animationLevel}
        onChange={(e) => setAnimationLevel(e.target.value as any)}
      >
        <option value="none">None</option>
        <option value="reduced">Reduced</option>
        <option value="full">Full</option>
      </select>

      <div style={{ fontSize: '12px', color: '#666' }}>
        Source: {meta.source}<br />
        Confidence: {(meta.confidence * 100).toFixed(0)}%
      </div>
    </div>
  )
}

// ============================================================================
// Example 6: Learning State Management
// ============================================================================

export function LearningControls() {
  const {
    learningEnabled,
    toggleLearning,
    disabledCategories,
    totalActionsRecorded,
    disableCategory,
    enableCategory
  } = useLearningState()

  return (
    <div>
      <h3>Learning Controls</h3>

      <div>
        <label>
          <input
            type="checkbox"
            checked={learningEnabled}
            onChange={() => toggleLearning()}
          />
          Enable Learning
        </label>
      </div>

      <div>
        <p>Total Actions Recorded: {totalActionsRecorded}</p>
      </div>

      <div>
        <h4>Category Controls:</h4>
        {['communication', 'ui', 'content'].map((category) => {
          const isDisabled = disabledCategories.includes(category as any)
          return (
            <div key={category}>
              <label>
                <input
                  type="checkbox"
                  checked={!isDisabled}
                  onChange={(e) => {
                    const cat = category as any
                    e.target.checked ? enableCategory(cat) : disableCategory(cat)
                  }}
                />
                {category}
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Example 7: Comprehensive Settings Panel
// ============================================================================

export function SettingsPanel() {
  const { get, set, explain, recordAction } = usePersonalization()

  const handleRecordAction = () => {
    recordAction({
      type: 'feature-used',
      context: { feature: 'settings' }
    })
  }

  return (
    <div className="settings-panel">
      <h1>Personalization Settings</h1>

      <section>
        <ThemeToggle />
      </section>

      <section>
        <TypographySettings />
      </section>

      <section>
        <LayoutSettings />
      </section>

      <section>
        <ContentPersonalization />
      </section>

      <section>
        <LearningControls />
      </section>

      <section>
        <h3>Preference Explanations</h3>
        <button onClick={handleRecordAction}>
          Record Settings Visit
        </button>
        <div>
          <p>Why is the theme {get('ui.theme')}?</p>
          <p>{explain('ui.theme').reason}</p>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// Example 8: Personalized Content Display
// ============================================================================

interface PersonalizedContentProps {
  title: string
  content: string
}

export function PersonalizedContent({ title, content }: PersonalizedContentProps) {
  const { get, adapter } = usePersonalization()

  const theme = get<'light' | 'dark'>('ui.theme')
  const density = get<'compact' | 'comfortable' | 'spacious'>('ui.density')
  const fontSize = get<number>('ui.fontSize')

  const contentAdapter = adapter?.getContent()
  const adaptedContent = contentAdapter?.adaptContent(content) || content

  return (
    <article
      className={`personalized-article density-${density}`}
      style={{ fontSize: `${fontSize}rem` }}
    >
      <h2>{title}</h2>
      <div>{adaptedContent}</div>
    </article>
  )
}

// ============================================================================
// Example 9: Usage in App Root
// ============================================================================

export function App() {
  const { adapter } = usePersonalization()

  // Apply all personalization on mount
  useEffect(() => {
    adapter?.applyAll()
  }, [adapter])

  return (
    <div className="app">
      <SettingsPanel />
    </div>
  )
}

export default App
