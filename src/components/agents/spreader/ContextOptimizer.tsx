/**
 * Context Optimizer UI Component
 *
 * Displays message importance scores, compression options,
 * and allows users to apply context optimization.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Message } from '@/types/conversation'
import {
  ContextOptimizer as OptimizerEngine,
  type CompressionResult,
  type CompressionStrategy
} from '@/lib/agents/spread/optimizer'
import { calculateAllImportance, type MessageImportance } from '@/lib/agents/spread/importance-scoring'
import {
  detectRedundancy,
  type RedundancyAnalysis
} from '@/lib/agents/spread/compression-strategies'
import { estimateTotalTokens } from '@/lib/agents/spread/token-utils'

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  messages: Message[]
  maxTokens: number
  targetTokens: number
  onApply: (result: CompressionResult) => void
  onClose: () => void
}

interface TruncatedText {
  text: string
  isTruncated: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function truncate(text: string, maxLength: number): TruncatedText {
  if (!text || text.length <= maxLength) {
    return { text: text || '', isTruncated: false }
  }

  return {
    text: text.substring(0, maxLength) + '...',
    isTruncated: true
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContextOptimizer({
  messages,
  maxTokens,
  targetTokens,
  onApply,
  onClose
}: Props) {
  const [importanceScores, setImportanceScores] = useState<MessageImportance[]>([])
  const [redundancyAnalysis, setRedundancyAnalysis] = useState<RedundancyAnalysis | null>(null)
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<CompressionStrategy>('hybrid')

  // Calculate initial analysis
  useEffect(() => {
    const analyze = async () => {
      setIsAnalyzing(true)

      // Calculate importance scores
      const scores = calculateAllImportance(messages)
      setImportanceScores(scores)

      // Detect redundancy
      const redundancy = detectRedundancy(messages)
      setRedundancyAnalysis(redundancy)

      setIsAnalyzing(false)
    }

    analyze()
  }, [messages])

  // Token calculations
  const currentTokens = useMemo(() =>
    estimateTotalTokens(messages), [messages]
  )

  const usagePercentage = useMemo(() =>
    (currentTokens / maxTokens) * 100, [currentTokens, maxTokens]
  )

  const targetPercentage = useMemo(() =>
    (targetTokens / maxTokens) * 100, [targetTokens, maxTokens]
  )

  // Handle compression
  const handleCompress = async (strategy: CompressionStrategy) => {
    setIsCompressing(true)
    setSelectedStrategy(strategy)

    try {
      const optimizer = new OptimizerEngine()
      const result = await optimizer.compressContext(messages, targetTokens, strategy)
      setCompressionResult(result)
    } catch (error) {
      console.error('Compression failed:', error)
    } finally {
      setIsCompressing(false)
    }
  }

  // Apply compression
  const handleApply = () => {
    if (compressionResult) {
      onApply(compressionResult)
      onClose()
    }
  }

  // Reset to initial state
  const handleReset = () => {
    setCompressionResult(null)
  }

  // Get color class for percentage
  const getColorClass = (percentage: number): string => {
    if (percentage >= 85) return 'text-red-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getBgColorClass = (percentage: number): string => {
    if (percentage >= 85) return 'bg-red-100'
    if (percentage >= 60) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  return (
    <div className="context-optimizer fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Context Optimizer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Token counts */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${getBgColorClass(usagePercentage)}`}>
              <div className="text-sm font-medium text-gray-600">Current Usage</div>
              <div className={`text-2xl font-bold ${getColorClass(usagePercentage)}`}>
                {formatNumber(currentTokens)} tokens
              </div>
              <div className="text-sm text-gray-600">
                {usagePercentage.toFixed(1)}% of capacity
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Target</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(targetTokens)} tokens
              </div>
              <div className="text-sm text-gray-600">
                {targetPercentage.toFixed(1)}% of capacity
              </div>
            </div>

            {compressionResult && (
              <div className={`p-4 rounded-lg ${
                compressionResult.compressedTokens <= targetTokens
                  ? 'bg-green-50'
                  : 'bg-yellow-50'
              }`}>
                <div className="text-sm font-medium text-gray-600">After Compression</div>
                <div className={`text-2xl font-bold ${
                  compressionResult.compressedTokens <= targetTokens
                    ? 'text-green-600'
                    : 'text-yellow-600'
                }`}>
                  {formatNumber(compressionResult.compressedTokens)} tokens
                </div>
                <div className="text-sm text-gray-600">
                  {(compressionResult.compressionRatio * 100).toFixed(1)}% reduction
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-gray-600">Analyzing messages...</div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Redundancy analysis */}
              {redundancyAnalysis && redundancyAnalysis.redundantMessages.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">
                    Redundancy Detected
                  </h3>
                  <div className="text-sm text-orange-800">
                    <p>
                      Found {redundancyAnalysis.redundantMessages.length} redundant messages
                      ({redundancyAnalysis.duplicateCount} duplicates, {redundancyAnalysis.similarCount} similar)
                    </p>
                    <p className="mt-1">
                      Potential savings: {formatNumber(redundancyAnalysis.totalRedundantTokens)} tokens
                    </p>
                  </div>
                </div>
              )}

              {/* Importance scores */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  Message Importance Scores
                </h3>

                <div className="space-y-2">
                  {messages.map((msg, i) => {
                    const score = importanceScores[i]
                    if (!score) return null

                    const { text: preview, isTruncated } = truncate(msg.content.text || '', 150)

                    return (
                      <div
                        key={msg.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50"
                      >
                        {/* Score badge */}
                        <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold ${
                          score.score >= 0.7 ? 'bg-green-500' :
                          score.score >= 0.4 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}>
                          {(score.score * 100).toFixed(0)}%
                        </div>

                        {/* Message preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {msg.author === 'user' ? 'You' : 'AI'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <p className="text-sm text-gray-700">
                            {preview}
                            {isTruncated && (
                              <span className="text-blue-600 ml-1">more</span>
                            )}
                          </p>

                          {/* Factors */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {score.factors.hasQuestions && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                Question
                              </span>
                            )}
                            {score.factors.hasDecisions && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                Decision
                              </span>
                            )}
                            {score.factors.hasCode && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                Code
                              </span>
                            )}
                            {score.factors.hasPreservable && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                Preserved
                              </span>
                            )}
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                              {formatNumber(score.factors.tokenCount)} tokens
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Compression options */}
              {!compressionResult && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Compression Options
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleCompress('lossless')}
                      disabled={isCompressing}
                      className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-semibold text-gray-900 mb-2">Lossless</div>
                      <div className="text-sm text-gray-600">
                        Remove duplicates only
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Zero information loss
                      </div>
                    </button>

                    <button
                      onClick={() => handleCompress('lossy')}
                      disabled={isCompressing}
                      className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-semibold text-gray-900 mb-2">Lossy</div>
                      <div className="text-sm text-gray-600">
                        Remove low-importance messages
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Maximum compression
                      </div>
                    </button>

                    <button
                      onClick={() => handleCompress('hybrid')}
                      disabled={isCompressing}
                      className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-semibold text-gray-900 mb-2">Hybrid</div>
                      <div className="text-sm text-gray-600">
                        Best of both approaches
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Recommended
                      </div>
                    </button>
                  </div>

                  {isCompressing && (
                    <div className="mt-4 text-center text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Compressing context...
                    </div>
                  )}
                </div>
              )}

              {/* Compression result */}
              {compressionResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-4">
                    Compression Result
                  </h3>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600">Strategy</div>
                      <div className="font-semibold text-gray-900 capitalize">
                        {compressionResult.strategy}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600">Messages Removed</div>
                      <div className="font-semibold text-gray-900">
                        {compressionResult.removedCount}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600">Tokens Saved</div>
                      <div className="font-semibold text-green-600">
                        {formatNumber(compressionResult.originalTokens - compressionResult.compressedTokens)}
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <details className="mb-4">
                    <summary className="cursor-pointer font-medium text-gray-900">
                      View Compressed Messages ({compressionResult.compressedMessages.length})
                    </summary>

                    <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                      {compressionResult.compressedMessages.map(msg => {
                        const { text: preview } = truncate(msg.content.text || '', 200)
                        return (
                          <div key={msg.id} className="p-3 bg-white rounded border">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {msg.author === 'user' ? 'You' : 'AI'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{preview}</p>
                          </div>
                        )
                      })}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end gap-3">
          {compressionResult ? (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Try Different Strategy
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Compression
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
