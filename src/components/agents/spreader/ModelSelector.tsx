/**
 * Model Selector UI Component
 *
 * Allows users to view and select AI models for spreading tasks,
 * with cost comparison and performance insights.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import type { TaskRequirements, UserPreferences, CostComparison, AIModel } from '@/lib/agents/spread/types'
import { analyzeTask, generateRecommendation } from '@/lib/agents/spread/model-matcher'
import { getModelSelector, getModelCostEstimator } from '@/lib/agents/spread/multi-model'

// ============================================================================
// TYPES
// ============================================================================

interface ModelSelectorProps {
  /** Task description to analyze */
  task: string
  /** Callback when model is selected */
  onSelect: (modelId: string) => void
  /** Initial user preferences */
  initialPreferences?: Partial<UserPreferences>
  /** Show detailed comparison? */
  showComparison?: boolean
  /** Custom className */
  className?: string
}

interface ModelCardProps {
  model: AIModel
  cost: {
    totalCost: number
    estimatedTime: number
  }
  isRecommended: boolean
  rank: number
  onSelect: () => void
}

// ============================================================================
// MODEL CARD COMPONENT
// ============================================================================

function ModelCard({ model, cost, isRecommended, rank, onSelect }: ModelCardProps) {
  const qualityColors = {
    low: 'text-gray-500',
    medium: 'text-yellow-600',
    high: 'text-green-600'
  }

  const speedColors = {
    slow: 'text-red-500',
    medium: 'text-yellow-500',
    fast: 'text-green-500'
  }

  return (
    <div
      className={`relative border rounded-lg p-4 transition-all hover:shadow-md ${
        isRecommended ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'
      }`}
    >
      {isRecommended && (
        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          Top Pick
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h5 className="font-semibold text-lg">{model.name}</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">{model.provider}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500">#{rank}</span>
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1 mb-3">
        {model.capabilities.code && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Code</span>
        )}
        {model.capabilities.math && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Math</span>
        )}
        {model.capabilities.creative && (
          <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">Creative</span>
        )}
        {model.capabilities.analysis && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Analysis</span>
        )}
        {model.capabilities.multimodal && (
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Multimodal</span>
        )}
        {model.capabilities.tools && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Tools</span>
        )}
      </div>

      {/* Performance */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Quality:</span>
          <span className={`ml-1 font-medium ${qualityColors[model.performance.quality]}`}>
            {model.performance.quality}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Speed:</span>
          <span className={`ml-1 font-medium ${speedColors[model.performance.speed]}`}>
            {model.performance.speed}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Reliability:</span>
          <span className="ml-1 font-medium">
            {(model.performance.reliability * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Cost & Time */}
      <div className="flex items-center justify-between text-sm mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Est. Cost:</span>
          <span className="ml-1 font-semibold text-green-600">
            ${cost.totalCost.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Time:</span>
          <span className="ml-1 font-semibold">
            {cost.estimatedTime.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Context Window */}
      <div className="text-xs text-gray-500 mb-3">
        Context: {(model.limits.maxTokens / 1000).toFixed(0)}K tokens
      </div>

      {/* Select Button */}
      <button
        onClick={onSelect}
        className={`w-full py-2 px-4 rounded font-medium transition-colors ${
          isRecommended
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
        }`}
      >
        Select Model
      </button>
    </div>
  )
}

// ============================================================================
// MAIN MODEL SELECTOR COMPONENT
// ============================================================================

export function ModelSelector({
  task,
  onSelect,
  initialPreferences,
  showComparison = true,
  className = ''
}: ModelSelectorProps) {
  const [requirements, setRequirements] = useState<TaskRequirements | null>(null)
  const [recommendations, setRecommendations] = useState<Array<{ model: AIModel; score: number }>>([])
  const [costComparison, setCostComparison] = useState<CostComparison | null>(null)
  const [userPreference, setUserPreference] = useState<'cost' | 'quality' | 'speed'>(
    initialPreferences?.priority || 'cost'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Analyze task and get recommendations
  useEffect(() => {
    if (!task) return

    setLoading(true)
    setError(null)

    try {
      // Analyze task
      const reqs = analyzeTask(task, { priority: userPreference })
      setRequirements(reqs)

      // Get recommendations
      const selector = getModelSelector()
      const recommended = selector.getRecommendations(reqs, { priority: userPreference }, 5)
      setRecommendations(recommended.map(r => ({ model: r.model, score: r.score })))

      // Cost comparison
      const estimator = getModelCostEstimator()
      const comparison = estimator.compareCosts(reqs)
      setCostComparison(comparison)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze task')
      console.error('[ModelSelector] Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }, [task, userPreference])

  // Handle model selection
  const handleSelectModel = (modelId: string) => {
    onSelect(modelId)
  }

  if (loading) {
    return (
      <div className={`model-selector p-6 bg-white dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing task...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`model-selector p-6 bg-red-50 dark:bg-red-900/20 rounded-lg ${className}`}>
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    )
  }

  if (!requirements) {
    return (
      <div className={`model-selector p-6 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-600 dark:text-gray-400">Enter a task description to see model recommendations</p>
      </div>
    )
  }

  return (
    <div className={`model-selector p-6 bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      <h3 className="text-xl font-bold mb-4">AI Model Selection</h3>

      {/* Task Analysis */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold mb-2">Task Analysis</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Type:</span>
            <span className="ml-2 font-medium capitalize">{requirements.type}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Complexity:</span>
            <span className="ml-2 font-medium capitalize">{requirements.complexity}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Est. Input:</span>
            <span className="ml-2 font-medium">{requirements.estimatedTokens.input.toLocaleString()} tokens</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Est. Output:</span>
            <span className="ml-2 font-medium">{requirements.estimatedTokens.output.toLocaleString()} tokens</span>
          </div>
        </div>
      </div>

      {/* Preference Selector */}
      <div className="mb-6">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Optimize for:
        </span>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="preference"
              value="cost"
              checked={userPreference === 'cost'}
              onChange={() => setUserPreference('cost')}
              className="mr-2"
            />
            <span>Cost</span>
            <span className="ml-1 text-xs text-green-600">(cheapest)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="preference"
              value="quality"
              checked={userPreference === 'quality'}
              onChange={() => setUserPreference('quality')}
              className="mr-2"
            />
            <span>Quality</span>
            <span className="ml-1 text-xs text-blue-600">(best output)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="preference"
              value="speed"
              checked={userPreference === 'speed'}
              onChange={() => setUserPreference('speed')}
              className="mr-2"
            />
            <span>Speed</span>
            <span className="ml-1 text-xs text-orange-600">(fastest)</span>
          </label>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Recommended Models</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec, i) => {
              const cost = costComparison?.all.find(c => c.modelId === rec.model.id)
              if (!cost) return null

              return (
                <ModelCard
                  key={rec.model.id}
                  model={rec.model}
                  cost={{
                    totalCost: cost.totalCost,
                    estimatedTime: cost.estimatedTime
                  }}
                  isRecommended={i === 0}
                  rank={i + 1}
                  onSelect={() => handleSelectModel(rec.model.id)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Cost Comparison Table */}
      {showComparison && costComparison && costComparison.all.length > 0 && (
        <div className="cost-comparison">
          <h4 className="font-semibold mb-3">Cost Comparison</h4>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-3">Model</th>
                  <th className="text-right py-2 px-3">Input Cost</th>
                  <th className="text-right py-2 px-3">Output Cost</th>
                  <th className="text-right py-2 px-3">Total Cost</th>
                  <th className="text-right py-2 px-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {costComparison.all.map((cost, i) => {
                  const isCheapest = cost.modelId === costComparison.cheapest.modelId
                  const isFastest = cost.modelId === costComparison.fastest.modelId
                  const isBestQuality = cost.modelId === costComparison.bestQuality.modelId

                  return (
                    <tr
                      key={cost.modelId}
                      className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        isCheapest ? 'bg-green-50 dark:bg-green-900/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cost.modelName}</span>
                          {isCheapest && <span className="text-green-600">💰</span>}
                          {isFastest && <span className="text-orange-600">⚡</span>}
                          {isBestQuality && <span className="text-blue-600">🏆</span>}
                        </div>
                      </td>
                      <td className="text-right py-2 px-3">${cost.inputCost.toFixed(4)}</td>
                      <td className="text-right py-2 px-3">${cost.outputCost.toFixed(4)}</td>
                      <td className="text-right py-2 px-3 font-semibold">${cost.totalCost.toFixed(4)}</td>
                      <td className="text-right py-2 px-3">{cost.estimatedTime.toFixed(1)}s</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 flex gap-4">
            <span>💰 Cheapest</span>
            <span>⚡ Fastest</span>
            <span>🏆 Best Quality</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ModelSelector
