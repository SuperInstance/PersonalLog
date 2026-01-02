'use client'

/**
 * Vibe Tuning Tab
 *
 * Allows fine-tuning of personality attributes with sliders and quick adjustments.
 */

import { Sparkles } from 'lucide-react'

interface VibeTuningTabProps {
  vibeAttributes: Record<string, number>
  onAdjust: (attr: string, change: number) => void
  temperature: number
  onTemperatureChange: (t: number) => void
  responseStyle: 'brief' | 'balanced' | 'detailed'
  onResponseStyleChange: (s: 'brief' | 'balanced' | 'detailed') => void
}

export function VibeTuningTab({
  vibeAttributes,
  onAdjust,
  temperature,
  onTemperatureChange,
  responseStyle,
  onResponseStyleChange,
}: VibeTuningTabProps) {
  const vibes = [
    { attribute: 'creativity', label: 'Creativity', icon: '🎨', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    { attribute: 'friendliness', label: 'Friendliness', icon: '😊', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { attribute: 'conciseness', label: 'Conciseness', icon: '💬', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    { attribute: 'formality', label: 'Formality', icon: '🎩', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    { attribute: 'humor', label: 'Humor', icon: '😄', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
    { attribute: 'empathy', label: 'Empathy', icon: '💚', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    { attribute: 'assertiveness', label: 'Assertiveness', icon: '⚡', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    { attribute: 'curiosity', label: 'Curiosity', icon: '🔍', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  ]

  return (
    <div className="space-y-6">
      {/* Quick adjustments */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Quick Vibe Adjustments
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Click + or - to adjust personality attributes. These will modify the AI's responses.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vibes.map(vibe => {
            const value = vibeAttributes[vibe.attribute] || 0.5

            return (
              <div key={vibe.attribute} className="bg-white dark:bg-slate-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{vibe.icon}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{vibe.label}</span>
                  </div>
                  <span className="text-sm text-slate-500">{Math.round(value * 100)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAdjust(vibe.attribute, -0.1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${vibe.color} transition-all`}
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => onAdjust(vibe.attribute, 0.1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Response Style Override */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Response Behavior
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Response Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['brief', 'balanced', 'detailed'].map(style => (
                <button
                  key={style}
                  onClick={() => onResponseStyleChange(style as any)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                    responseStyle === style
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Temperature Override: {temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Focused</span>
              <span>Exploratory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vibe Summary */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Current Vibe Profile
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(vibeAttributes).map(([attr, value]) => (
            value > 0.6 && (
              <span key={attr} className="px-3 py-1 bg-white dark:bg-slate-900 rounded-full text-sm text-slate-700 dark:text-slate-300">
                {attr}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
