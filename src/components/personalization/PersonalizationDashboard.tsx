/**
 * PersonalLog - Personalization Dashboard
 *
 * Comprehensive dashboard showing learned preferences, prediction accuracy,
 * and allowing users to control their personalization settings.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { usePersonalization, useLearningState } from '@/lib/personalization'
import { AccuracyTracker, AccuracyReporter, ABTestFramework } from '@/lib/personalization/accuracy'
import type { AccuracyMetrics } from '@/lib/personalization/accuracy'

interface DashboardProps {
  userId?: string
}

export function PersonalizationDashboard({ userId = 'default' }: DashboardProps) {
  const personalization = usePersonalization()
  const { learningEnabled, toggleLearning, disabledCategories, totalActionsRecorded, lastActionAt } =
    useLearningState()

  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'accuracy' | 'privacy'>('overview')
  const [report, setReport] = useState<string>('')

  useEffect(() => {
    // Initialize accuracy tracking
    const tracker = new AccuracyTracker()
    const abTest = new ABTestFramework()
    const reporter = new AccuracyReporter(tracker, abTest)

    // Calculate metrics
    const calculatedMetrics = tracker.calculateMetrics()
    setMetrics(calculatedMetrics)

    // Generate report
    setReport(reporter.getSummary())
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personalization Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Learn how PersonalLog adapts to your preferences
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={learningEnabled}
              onChange={(e) => toggleLearning(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="font-medium">Learning Enabled</span>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {(['overview', 'patterns', 'accuracy', 'privacy'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab userId={userId} />}
      {activeTab === 'patterns' && <PatternsTab userId={userId} />}
      {activeTab === 'accuracy' && <AccuracyTab metrics={metrics} report={report} />}
      {activeTab === 'privacy' && <PrivacyTab userId={userId} />}
    </div>
  )
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ userId }: { userId: string }) {
  const personalization = usePersonalization()
  const { learningEnabled, totalActionsRecorded, lastActionAt } = useLearningState()

  const preferences = personalization.getPreferences()
  const allPrefs = preferences.getAll()

  // Get key preferences
  const theme = preferences.get<'light' | 'dark' | 'auto'>('ui.theme')
  const density = preferences.get<'compact' | 'comfortable' | 'spacious'>('ui.density')
  const responseLength = preferences.get<'brief' | 'balanced' | 'detailed'>(
    'communication.responseLength'
  )
  const tone = preferences.get<'casual' | 'neutral' | 'formal'>('communication.tone')

  const learnedCount = Object.values(allPrefs).filter(p => p.source === 'learned').length
  const explicitCount = Object.values(allPrefs).filter(p => p.source === 'explicit').length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Actions Recorded"
          value={totalActionsRecorded.toString()}
          icon="📊"
        />
        <StatCard
          label="Learned Preferences"
          value={learnedCount.toString()}
          icon="🧠"
        />
        <StatCard
          label="Explicit Settings"
          value={explicitCount.toString()}
          icon="⚙️"
        />
        <StatCard
          label="Last Action"
          value={
            lastActionAt
              ? new Date(lastActionAt).toLocaleDateString()
              : 'Never'
          }
          icon="🕐"
        />
      </div>

      {/* Current Preferences */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Current Preferences</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PreferenceSection
            title="UI Settings"
            preferences={[
              { label: 'Theme', value: theme },
              { label: 'Density', value: density },
            ]}
          />

          <PreferenceSection
            title="Communication"
            preferences={[
              { label: 'Response Length', value: responseLength },
              { label: 'Tone', value: tone },
            ]}
          />
        </div>
      </div>

      {/* Learning Status */}
      <div className="border rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20">
        <h2 className="text-xl font-semibold mb-4">Learning Status</h2>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <span className={`font-medium ${learningEnabled ? 'text-green-600' : 'text-gray-600'}`}>
              {learningEnabled ? '🟢 Active' : '⚪ Paused'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Learning from:</span>
            <span className="font-medium">
              {totalActionsRecorded} actions
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            PersonalLog learns from your behavior to provide a more personalized experience.
            All data is stored locally on your device and never shared.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PATTERNS TAB
// ============================================================================

function PatternsTab({ userId }: { userId: string }) {
  const personalization = usePersonalization()
  const patterns = personalization.getPatterns()

  return (
    <div className="space-y-6">
      {/* Peak Hours */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Peak Usage Hours</h2>

        {patterns.peakHours && patterns.peakHours.length > 0 ? (
          <div className="grid grid-cols-24 gap-1">
            {Array.from({ length: 24 }, (_, i) => {
              const isPeak = patterns.peakHours?.includes(i)
              return (
                <div
                  key={i}
                  className={`h-12 rounded text-xs flex items-center justify-center ${
                    isPeak
                      ? 'bg-blue-500 text-white font-medium'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                  title={`${i}:00 - ${i + 1}:00`}
                >
                  {i}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500">No usage data yet</p>
        )}
      </div>

      {/* Session Length */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Session Length</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            label="Average Session"
            value={
              patterns.avgSessionLength
                ? `${Math.round(patterns.avgSessionLength / 60)} minutes`
                : 'N/A'
            }
          />
          <MetricCard
            label="Error Frequency"
            value={
              patterns.errorFrequency !== undefined
                ? `${(patterns.errorFrequency * 100).toFixed(1)}%`
                : 'N/A'
            }
          />
        </div>
      </div>

      {/* Top Features */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Most Used Features</h2>

        {patterns.topFeatures && patterns.topFeatures.length > 0 ? (
          <div className="space-y-2">
            {patterns.topFeatures.map((feature, index) => (
              <div
                key={feature}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">#{index + 1}</span>
                  <span className="font-medium">{feature}</span>
                </div>
                <span className="text-sm text-gray-500">Most used</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No feature usage data yet</p>
        )}
      </div>

      {/* Pattern Insights */}
      <div className="border rounded-lg p-6 bg-purple-50 dark:bg-purple-900/20">
        <h2 className="text-xl font-semibold mb-4">Pattern Insights</h2>

        <div className="space-y-3">
          {patterns.peakHours && patterns.peakHours.length > 0 && (
            <InsightCard
              emoji="⏰"
              title="Peak Activity"
              description={`Most active between ${patterns.peakHours[0]}:00 and ${patterns.peakHours[0] + 3}:00`}
            />
          )}

          {patterns.avgSessionLength && patterns.avgSessionLength > 0 && (
            <InsightCard
              emoji="⏱️"
              title="Session Duration"
              description={`Average session lasts ${Math.round(patterns.avgSessionLength / 60)} minutes`}
            />
          )}

          {patterns.topFeatures && patterns.topFeatures.length > 0 && (
            <InsightCard
              emoji="⭐"
              title="Favorite Feature"
              description={`${patterns.topFeatures[0]} is your most used feature`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ACCURACY TAB
// ============================================================================

function AccuracyTab({
  metrics,
  report
}: {
  metrics: AccuracyMetrics | null
  report: string
}) {
  if (!metrics) {
    return (
      <div className="border rounded-lg p-6 text-center">
        <p className="text-gray-500">No accuracy data available yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Predictions will be tracked as you use PersonalLog
        </p>
      </div>
    )
  }

  const accuracyPercent = (metrics.top1Accuracy * 100).toFixed(1)
  const targetMet = metrics.top1Accuracy >= 0.8

  return (
    <div className="space-y-6">
      {/* Overall Accuracy */}
      <div className={`border rounded-lg p-6 ${targetMet ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Overall Accuracy</h2>
          <span className={`text-3xl font-bold ${targetMet ? 'text-green-600' : 'text-yellow-600'}`}>
            {accuracyPercent}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          {targetMet ? (
            <>
              <span className="text-green-600 text-2xl">✅</span>
              <span className="font-medium">Target met! (&gt;80%)</span>
            </>
          ) : (
            <>
              <span className="text-yellow-600 text-2xl">⚠️</span>
              <span className="font-medium">Below target (Target: 80%)</span>
            </>
          )}
        </div>

        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                targetMet ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(metrics.top1Accuracy * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total Predictions"
          value={metrics.totalPredictions.toString()}
        />
        <MetricCard
          label="Correct Predictions"
          value={metrics.correctPredictions.toString()}
        />
        <MetricCard
          label="Average Confidence"
          value={`${(metrics.avgConfidence * 100).toFixed(1)}%`}
        />
      </div>

      {/* Calibration */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Confidence Calibration</h2>
        <p className="text-sm text-gray-600 mb-4">
          How well predicted confidence matches actual accuracy (higher is better)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            label="Calibration Score"
            value={`${(metrics.calibrationScore * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Brier Score"
            value={metrics.brierScore.toFixed(3)}
          />
        </div>
      </div>

      {/* Accuracy by Type */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Accuracy by Prediction Type</h2>

        <div className="space-y-2">
          {Array.from(metrics.accuracyByType.entries()).map(([type, accuracy]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">{type}</span>
              <span className="font-bold">{(accuracy * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Text Report */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Report</h2>
        <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
          {report}
        </pre>
      </div>
    </div>
  )
}

// ============================================================================
// PRIVACY TAB
// ============================================================================

function PrivacyTab({ userId }: { userId: string }) {
  const [dataExported, setDataExported] = useState(false)
  const [dataDeleted, setDataDeleted] = useState(false)

  const handleExport = async () => {
    try {
      const { getPersonalizationAPI } = await import('@/lib/personalization')
      const api = getPersonalizationAPI()
      const data = await api.exportData(userId)

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `personallog-${userId}-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setDataExported(true)
      setTimeout(() => setDataExported(false), 3000)
    } catch (error) {
      console.error('Failed to export data:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all learned personalization data? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      const { clearAllPersonalizationData } = await import('@/lib/personalization')
      await clearAllPersonalizationData()

      setDataDeleted(true)
      setTimeout(() => {
        setDataDeleted(false)
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Failed to delete data:', error)
      alert('Failed to delete data. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <div className="border rounded-lg p-6 bg-green-50 dark:bg-green-900/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <h2 className="text-xl font-semibold mb-2">Privacy First</h2>
            <p className="text-gray-700 dark:text-gray-300">
              All personalization data is stored locally on your device. Nothing is shared with
              external servers or third parties. You have full control over your data.
            </p>
          </div>
        </div>
      </div>

      {/* Data Controls */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Data Controls</h2>

        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <div>
              <h3 className="font-medium">Export Your Data</h3>
              <p className="text-sm text-gray-600">
                Download all learned preferences and patterns as JSON
              </p>
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {dataExported ? '✓ Exported' : 'Export'}
            </button>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded">
            <div>
              <h3 className="font-medium">Delete All Data</h3>
              <p className="text-sm text-gray-600">
                Permanently remove all learned preferences and patterns
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={dataDeleted}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {dataDeleted ? '✓ Deleted' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* What We Track */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">What We Track</h2>

        <div className="space-y-3">
          <PrivacyItem
            emoji="⏰"
            title="Usage Patterns"
            description="When you use PersonalLog and for how long"
          />
          <PrivacyItem
            emoji="⚙️"
            title="Preferences"
            description="Settings you explicitly configure and what we learn from your behavior"
          />
          <PrivacyItem
            emoji="🎯"
            title="Feature Usage"
            description="Which features you use most frequently"
          />
          <PrivacyItem
            emoji="🔮"
            title="Predictions"
            description="Our predictions and whether they were correct"
          />
        </div>
      </div>

      {/* How We Use It */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">How We Use Your Data</h2>

        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Provide personalized recommendations and settings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Improve prediction accuracy over time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Adapt the interface to your usage patterns</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Suggest relevant features and content</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500">✗</span>
            <span className="text-gray-500">Never shared with third parties</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500">✗</span>
            <span className="text-gray-500">Never used for advertising</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function PreferenceSection({
  title,
  preferences
}: {
  title: string
  preferences: Array<{ label: string; value: string }>
}) {
  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-2">
        {preferences.map((pref) => (
          <div key={pref.label} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-sm">{pref.label}</span>
            <span className="font-medium">{pref.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightCard({
  emoji,
  title,
  description
}: {
  emoji: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded">
      <span className="text-2xl">{emoji}</span>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

function PrivacyItem({
  emoji,
  title,
  description
}: {
  emoji: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
      <span className="text-xl">{emoji}</span>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}
