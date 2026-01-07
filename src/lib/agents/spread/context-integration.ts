/**
 * Context Optimizer Integration for Spreader Agent
 *
 * Integrates the ContextOptimizerEngine with the Spreader agent for automatic
 * context optimization during spread and merge operations.
 */

import { Message } from '@/types/conversation'
import {
  ContextOptimizerEngine,
  getContextOptimizer,
  type ContextOptimizationResult,
  type TaskContextRequirements
} from './context-optimizer'
import { estimateTotalTokens } from './optimizer'
import { getSpreadAnalytics } from './analytics'

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * Integration configuration for Spreader agent.
 */
export interface SpreaderContextIntegration {
  // Optimizer instance
  optimizer: ContextOptimizerEngine

  // Auto-optimization settings
  autoOptimizeBeforeSpread: boolean
  autoOptimizeAfterMerge: boolean

  // Token limits
  maxContextTokens: number
  spreadContextTokens: number  // Tokens per child conversation

  // Task analysis
  enableTaskAnalysis: boolean

  // Logging
  logOptimizations: boolean
}

/**
 * Default integration configuration.
 */
export const DEFAULT_INTEGRATION_CONFIG: SpreaderContextIntegration = {
  optimizer: getContextOptimizer(),
  autoOptimizeBeforeSpread: true,
  autoOptimizeAfterMerge: true,
  maxContextTokens: 128000,
  spreadContextTokens: 32000,
  enableTaskAnalysis: true,
  logOptimizations: true
}

// ============================================================================
// SPREAD CONTEXT OPTIMIZATION
// ============================================================================

/**
 * Optimizes context before spreading to child conversations.
 *
 * Ensures each child conversation gets the most relevant context
 * without exceeding token limits.
 */
export async function optimizeContextForSpread(
  parentMessages: Message[],
  tasks: string[],
  config: SpreaderContextIntegration = DEFAULT_INTEGRATION_CONFIG
): Promise<{
  optimizedParentContext: Message[]
  perTaskContexts: Map<string, Message[]>
  optimizationResult: ContextOptimizationResult | null
}> {
  // Step 1: Optimize parent conversation
  let optimizedParentContext = parentMessages
  let optimizationResult: ContextOptimizationResult | null = null

  if (config.autoOptimizeBeforeSpread) {
    optimizationResult = await config.optimizer.optimize(parentMessages)
    optimizedParentContext = optimizationResult.optimizedMessages

    if (config.logOptimizations && optimizationResult) {
      console.log('[ContextOptimizer] Pre-spread optimization:', {
        tokensSaved: optimizationResult.tokensSaved,
        messagesRemoved: optimizationResult.messagesRemoved,
        strategy: optimizationResult.strategy
      })
    }
  }

  // Step 2: Generate task-specific contexts
  const perTaskContexts = new Map<string, Message[]>()

  if (config.enableTaskAnalysis) {
    // Analyze each task and create optimized context
    for (const task of tasks) {
      const taskRequirements = analyzeTask(task, optimizedParentContext)
      const taskResult = await config.optimizer.optimizeForTask(
        optimizedParentContext,
        taskRequirements
      )

      perTaskContexts.set(task, taskResult.optimizedMessages)

      if (config.logOptimizations) {
        console.log('[ContextOptimizer] Task-specific optimization:', {
          task: task.substring(0, 50) + '...',
          contextSize: taskResult.optimizedMessages.length,
          tokens: estimateTotalTokens(taskResult.optimizedMessages)
        })
      }
    }
  } else {
    // No task analysis - give all tasks the same optimized context
    for (const task of tasks) {
      // Take last N messages to fit in spread context budget
      const taskContext = fitToBudget(
        optimizedParentContext,
        config.spreadContextTokens
      )
      perTaskContexts.set(task, taskContext)
    }
  }

  return {
    optimizedParentContext,
    perTaskContexts,
    optimizationResult
  }
}

/**
 * Optimizes context after merging child conversations.
 *
 * Removes redundant content from merged results to keep
 * parent conversation within token limits.
 */
export async function optimizeContextAfterMerge(
  parentMessages: Message[],
  mergedChildMessages: Message[],
  config: SpreaderContextIntegration = DEFAULT_INTEGRATION_CONFIG
): Promise<{
  optimizedContext: Message[]
  optimizationResult: ContextOptimizationResult | null
}> {
  // Combine parent and merged messages
  const combinedMessages = [...parentMessages, ...mergedChildMessages]

  // Optimize combined context
  let optimizationResult: ContextOptimizationResult | null = null
  let optimizedContext = combinedMessages

  if (config.autoOptimizeAfterMerge) {
    optimizationResult = await config.optimizer.optimize(combinedMessages)
    optimizedContext = optimizationResult.optimizedMessages

    if (config.logOptimizations && optimizationResult) {
      console.log('[ContextOptimizer] Post-merge optimization:', {
        tokensSaved: optimizationResult.tokensSaved,
        messagesRemoved: optimizationResult.messagesRemoved,
        strategy: optimizationResult.strategy
      })
    }
  }

  return {
    optimizedContext,
    optimizationResult
  }
}

// ============================================================================
// TASK ANALYSIS
// ============================================================================

/**
 * Analyzes a task to determine context requirements.
 */
function analyzeTask(task: string, context: Message[]): TaskContextRequirements {
  const taskType = inferTaskType(task)
  const keywords = extractKeywords(task)

  // Estimate required context size based on task complexity
  const complexity = estimateTaskComplexity(task, context)
  const minTokens = Math.floor(1000 * complexity)
  const maxTokens = Math.floor(32000 * complexity)

  return {
    task,
    taskType,
    keywords,
    minTokens,
    maxTokens,
    priority: complexity > 0.7 ? 'high' : complexity > 0.4 ? 'medium' : 'low',
    requiredMessageIds: []
  }
}

/**
 * Infers task type from description.
 */
function inferTaskType(task: string): TaskContextRequirements['taskType'] {
  const lower = task.toLowerCase()

  if (lower.includes('code') || lower.includes('implement') || lower.includes('function')) {
    return 'code'
  }
  if (lower.includes('research') || lower.includes('analyze') || lower.includes('investigate')) {
    return 'research'
  }
  if (lower.includes('write') || lower.includes('draft') || lower.includes('document')) {
    return 'writing'
  }
  if (lower.includes('analyze') || lower.includes('evaluate') || lower.includes('assess')) {
    return 'analysis'
  }

  return 'general'
}

/**
 * Extracts keywords from task description.
 */
function extractKeywords(task: string): string[] {
  const words = task.toLowerCase().split(/\s+/)

  // Filter out common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can'
  ])

  const keywords = words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10) // Top 10 keywords

  return keywords
}

/**
 * Estimates task complexity (0-1).
 */
function estimateTaskComplexity(task: string, context: Message[]): number {
  let complexity = 0.5 // Base complexity

  // Length factor
  const length = task.length
  if (length > 200) complexity += 0.2
  else if (length > 100) complexity += 0.1

  // Keyword complexity
  const complexKeywords = [
    'implement', 'architecture', 'integration', 'optimization',
    'refactor', 'migration', 'scalability', 'performance'
  ]

  const hasComplexKeyword = complexKeywords.some(keyword =>
    task.toLowerCase().includes(keyword)
  )

  if (hasComplexKeyword) complexity += 0.2

  // Context size factor
  const contextTokens = estimateTotalTokens(context)
  if (contextTokens > 50000) complexity += 0.1
  else if (contextTokens > 20000) complexity += 0.05

  return Math.min(complexity, 1.0)
}

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

/**
 * Fits messages within token budget by keeping most recent/relevant.
 */
function fitToBudget(messages: Message[], budget: number): Message[] {
  // Take messages from the end (most recent) until budget reached
  const fitted: Message[] = []
  let tokens = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const msgTokens = estimateTotalTokens([msg])

    if (tokens + msgTokens <= budget) {
      fitted.unshift(msg)
      tokens += msgTokens
    }

    if (tokens >= budget) break
  }

  return fitted
}

// ============================================================================
// METRICS AND ANALYTICS
// ============================================================================

/**
 * Records context optimization in analytics.
 */
export async function recordContextOptimization(
  result: ContextOptimizationResult,
  operation: 'spread' | 'merge',
  conversationId: string
): Promise<void> {
  const analytics = getSpreadAnalytics()

  // Create a spread event for tracking
  await analytics.trackSpread(`context_${operation}_${conversationId}`, {
    parentConversationId: conversationId,
    taskCount: operation === 'spread' ? result.originalMessages.length : 1,
    results: {
      totalDuration: result.processingTime,
      serialDuration: result.processingTime * 2, // Estimate
      timeSaved: result.processingTime,
      timeSavedPercentage: 50, // Estimate
      totalCost: 0,
      serialCost: 0,
      costSaved: 0,
      successCount: result.messagesKept,
      failCount: result.messagesRemoved
    }
  })
}

/**
 * Gets context optimization statistics.
 */
export function getContextOptimizationStats(): {
  metrics: ReturnType<ContextOptimizerEngine['getMetrics']>
  config: SpreaderContextIntegration
} {
  const optimizer = getContextOptimizer()

  return {
    metrics: optimizer.getMetrics(),
    config: DEFAULT_INTEGRATION_CONFIG
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getContextOptimizer }
export { resetContextOptimizer } from './context-optimizer'
export type { ContextOptimizerEngine, ContextOptimizationResult }
