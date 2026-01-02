/**
 * Personalization Demo Component
 *
 * Demonstrates the personalization system in action.
 */

'use client'

import React, { useState } from 'react'
import {
  usePersonalization,
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  usePersonalizedContent,
  useLearningState,
  usePreferenceExplanation,
  PersonalizedContainer,
  PersonalizedExplanation,
  PersonalizedText,
} from '@/lib/personalization'
import { recordUserAction } from '@/lib/personalization'

export function PersonalizationDemo() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Personalization Demo</h1>

      <ThemeSection />
      <TypographySection />
      <LayoutSection />
      <CommunicationSection />
      <LearningSection />
      <ExplanationsSection />
      <ActionsSection />
    </div>
  )
}

function ThemeSection() {
  const { theme, setTheme, colors, isDark } = usePersonalizedTheme()

  return (
    <section className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Theme</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Current Theme: {theme}</label>
          <div className="flex gap-2">
            {(['light', 'dark', 'auto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t)
                  recordUserAction({
                    type: 'theme-changed',
                    timestamp: new Date().toISOString(),
                    data: { value: t },
                  })
                }}
                className={`px-4 py-2 rounded ${
                  theme === t
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded" style={{ backgroundColor: colors.primary }}>Primary</div>
          <div className="p-2 rounded" style={{ backgroundColor: colors.secondary }}>Secondary</div>
          <div className="p-2 rounded" style={{ backgroundColor: colors.accent }}>Accent</div>
        </div>

        <p className="text-sm text-gray-600">
          Is Dark: {isDark ? 'Yes' : 'No'}
        </p>
      </div>
    </section>
  )
}

function TypographySection() {
  const { fontSize, setFontSize, density, setDensity, fontSizeClass } = usePersonalizedTypography()

  return (
    <section className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Typography</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Font Size: {fontSize}</label>
          <div className="flex gap-2">
            {([0.85, 1.0, 1.15, 1.3] as const).map((size) => (
              <button
                key={size}
                onClick={() => {
                  setFontSize(size)
                  recordUserAction({
                    type: 'font-size-changed',
                    timestamp: new Date().toISOString(),
                    data: { value: size },
                  })
                }}
                className={`px-4 py-2 rounded ${
                  fontSize === size
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {size === 0.85 ? 'Small' : size === 1.0 ? 'Medium' : size === 1.15 ? 'Large' : 'XL'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Density: {density}</label>
          <div className="flex gap-2">
            {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDensity(d)
                  recordUserAction({
                    type: 'setting-changed',
                    timestamp: new Date().toISOString(),
                    data: { setting: 'ui.density', value: d },
                  })
                }}
                className={`px-4 py-2 rounded ${
                  density === d
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={`p-4 border rounded ${fontSizeClass}`}>
          <p>This text adapts to your font size preference.</p>
          <p>Current class: {fontSizeClass}</p>
        </div>
      </div>
    </section>
  )
}

function LayoutSection() {
  const { density, setDensity, sidebarPosition, setSidebarPosition, densityClass } = usePersonalizedLayout()

  return (
    <section className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Layout</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Sidebar Position: {sidebarPosition}</label>
          <div className="flex gap-2">
            {(['left', 'right', 'hidden'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  setSidebarPosition(pos)
                  recordUserAction({
                    type: 'sidebar-toggled',
                    timestamp: new Date().toISOString(),
                    data: { position: pos },
                  })
                }}
                className={`px-4 py-2 rounded ${
                  sidebarPosition === pos
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <PersonalizedContainer applyDensity>
          <div className="p-4 border rounded bg-gray-50 dark:bg-gray-800">
            <p>This container respects density preferences.</p>
            <p className="text-sm text-gray-600">Current density: {density}</p>
            <p className="text-sm text-gray-600">Density class: {densityClass}</p>
          </div>
        </PersonalizedContainer>
      </div>
    </section>
  )
}

function CommunicationSection() {
  const {
    responseLength,
    setResponseLength,
    tone,
    setTone,
    useEmojis,
    setUseEmojis,
    adaptContent,
  } = usePersonalizedContent()

  const [sampleText] = useState(
    'PersonalLog is a powerful note-taking application that adapts to your preferences and learning style.'
  )

  return (
    <section className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Communication</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Response Length: {responseLength}</label>
          <div className="flex gap-2">
            {(['brief', 'balanced', 'detailed'] as const).map((len) => (
              <button
                key={len}
                onClick={() => {
                  setResponseLength(len)
                  recordUserAction({
                    type: 'setting-changed',
                    timestamp: new Date().toISOString(),
                    data: { setting: 'communication.responseLength', value: len },
                  })
                }}
                className={`px-4 py-2 rounded ${
                  responseLength === len
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {len.charAt(0).toUpperCase() + len.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tone: {tone}</label>
          <div className="flex gap-2">
            {(['casual', 'neutral', 'formal'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTone(t)
                  recordUserAction({
                    type: 'setting-changed',
                    timestamp: new Date().toISOString(),
                    data: { setting: 'communication.tone', value: t },
                  })
                }}
                className={`px-4 py-2 rounded ${
                  tone === t
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useEmojis}
              onChange={(e) => {
                setUseEmojis(e.target.checked)
                recordUserAction({
                  type: 'emoji-used',
                  timestamp: new Date().toISOString(),
                })
              }}
              className="w-4 h-4"
            />
            <span>Use Emojis {useEmojis ? '👍' : ''}</span>
          </label>
        </div>

        <div className="p-4 border rounded bg-gray-50 dark:bg-gray-800">
          <p className="text-sm font-medium mb-2">Adapted Content Example:</p>
          <PersonalizedText adapt>{sampleText}</PersonalizedText>
        </div>
      </div>
    </section>
  )
}

function LearningSection() {
  const {
    learningEnabled,
    toggleLearning,
    disabledCategories,
    totalActionsRecorded,
    lastActionAt,
  } = useLearningState()

  return (
    <section className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Learning State</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={learningEnabled}
              onChange={(e) => toggleLearning(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Learning Enabled</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Actions Recorded:</span> {totalActionsRecorded}
          </div>
          <div>
            <span className="font-medium">Last Action:</span>{' '}
            {lastActionAt ? new Date(lastActionAt).toLocaleString() : 'Never'}
          </div>
        </div>

        {disabledCategories.length > 0 && (
          <div className="text-sm text-gray-600">
            Disabled categories: {disabledCategories.join(', ')}
          </div>
        )}
      </div>
    </section>
  )
}

function ExplanationsSection() {
  const [selectedSetting, setSelectedSetting] = useState<string>('ui.theme')

  return (
    <section className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Preference Explanations</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Setting:</label>
          <select
            value={selectedSetting}
            onChange={(e) => setSelectedSetting(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="ui.theme">Theme</option>
            <option value="ui.fontSize">Font Size</option>
            <option value="ui.density">Density</option>
            <option value="communication.responseLength">Response Length</option>
            <option value="communication.tone">Tone</option>
          </select>
        </div>

        <PersonalizedExplanation setting={selectedSetting as any}>
          {(explanation) => (
            <div className="p-4 border rounded bg-blue-50 dark:bg-blue-900/20">
              <p className="mb-2"><strong>Value:</strong> {JSON.stringify(explanation.value)}</p>
              <p className="mb-2"><strong>Why:</strong> {explanation.reason}</p>
              <p className="mb-2"><strong>Source:</strong> {explanation.source}</p>
              <p className="mb-2"><strong>Confidence:</strong> {Math.round(explanation.confidence * 100)}%</p>
              <p className="text-sm text-gray-600">
                Last updated: {new Date(explanation.lastUpdated).toLocaleString()}
              </p>
            </div>
          )}
        </PersonalizedExplanation>
      </div>
    </section>
  )
}

function ActionsSection() {
  const personalization = usePersonalization()

  const actions = [
    { type: 'response-expanded', label: 'Expand Response' },
    { type: 'response-collapsed', label: 'Collapse Response' },
    { type: 'emoji-used', label: 'Use Emoji' },
    { type: 'feature-used', label: 'Use Feature' },
  ]

  const handleAction = (type: string) => {
    recordUserAction({
      type,
      timestamp: new Date().toISOString(),
      context: type === 'feature-used' ? { feature: 'demo' } : undefined,
    })
    alert(`Recorded action: ${type}`)
  }

  const stats = personalization.getStats()

  return (
    <section className="border rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Record Actions</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.type}
              onClick={() => handleAction(action.type)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="p-4 border rounded bg-gray-50 dark:bg-gray-800">
          <h3 className="font-medium mb-2">Statistics</h3>
          <div className="text-sm space-y-1">
            <div>Total Actions: {stats.totalActionsRecorded}</div>
            <div>Patterns Detected: {Object.keys(stats.patterns).length}</div>
            <div>
              Peak Hours: {stats.patterns.peakHours.length > 0
                ? stats.patterns.peakHours.join(', ')
                : 'None yet'}
            </div>
            <div>
              Avg Session: {stats.patterns.avgSessionLength > 0
                ? `${stats.patterns.avgSessionLength} minutes`
                : 'No data'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
