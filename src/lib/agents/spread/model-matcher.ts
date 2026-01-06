/**
 * Task-Model Matching System
 *
 * Analyzes task requirements and matches them with the most suitable AI models
 * based on capabilities, complexity, and user preferences.
 */

import type { TaskRequirements, UserPreferences, ModelRecommendation } from './types'
import { AVAILABLE_MODELS } from './model-catalog'

// ============================================================================
// TASK ANALYSIS
// ============================================================================

/**
 * Analyzes a task description to extract requirements.
 *
 * @param taskDescription - Task description text
 * @param context - Optional analysis context
 * @returns Analyzed task requirements
 */
export function analyzeTask(
  taskDescription: string,
  context?: Partial<UserPreferences>
): TaskRequirements {
  const lower = taskDescription.toLowerCase()

  // Detect task type
  let type: TaskRequirements['type'] = 'general'

  if (isCodeTask(lower)) {
    type = 'code'
  } else if (isWritingTask(lower)) {
    type = 'writing'
  } else if (isAnalysisTask(lower)) {
    type = 'analysis'
  } else if (isMathTask(lower)) {
    type = 'math'
  } else if (isCreativeTask(lower)) {
    type = 'creative'
  }

  // Estimate complexity
  const complexity = estimateComplexity(lower, taskDescription.length)

  // Estimate tokens
  const estimatedTokens = estimateTokens(taskDescription, complexity)

  // Build requirements
  const requirements: TaskRequirements = {
    type,
    requiresCode: type === 'code',
    requiresMath: type === 'math',
    requiresCreative: type === 'creative' || type === 'writing',
    requiresAnalysis: type === 'analysis',
    requiresMultimodal: hasMultimodalRequirements(lower),
    requiresTools: hasToolRequirements(lower),
    complexity,
    estimatedTokens,
    description: taskDescription,
    priority: context?.priority || 'cost',
    fallbackAllowed: true
  }

  return requirements
}

// ============================================================================
// TASK TYPE DETECTION
// ============================================================================

/**
 * Check if task is a code-related task.
 */
function isCodeTask(text: string): boolean {
  const codeKeywords = [
    'code', 'implement', 'function', 'class', 'debug', 'refactor',
    'programming', 'software', 'algorithm', 'api', 'database',
    'typescript', 'javascript', 'python', 'react', 'component'
  ]

  return codeKeywords.some(keyword => text.includes(keyword))
}

/**
 * Check if task is a writing task.
 */
function isWritingTask(text: string): boolean {
  const writingKeywords = [
    'write', 'draft', 'essay', 'article', 'blog', 'document',
    'summary', 'report', 'content', 'narrative', 'story'
  ]

  return writingKeywords.some(keyword => text.includes(keyword))
}

/**
 * Check if task is an analysis task.
 */
function isAnalysisTask(text: string): boolean {
  const analysisKeywords = [
    'analyze', 'research', 'investigate', 'evaluate', 'assess',
    'compare', 'data', 'statistics', 'trends', 'insights',
    'findings', 'examine', 'study'
  ]

  return analysisKeywords.some(keyword => text.includes(keyword))
}

/**
 * Check if task is a math task.
 */
function isMathTask(text: string): boolean {
  const mathKeywords = [
    'calculate', 'solve', 'equation', 'formula', 'mathematics',
    'statistics', 'probability', 'geometry', 'algebra', 'calculus'
  ]

  return mathKeywords.some(keyword => text.includes(keyword))
}

/**
 * Check if task is a creative task.
 */
function isCreativeTask(text: string): boolean {
  const creativeKeywords = [
    'creative', 'brainstorm', 'imagine', 'design', 'invent',
    'story', 'poem', 'art', 'creative writing', 'fiction'
  ]

  return creativeKeywords.some(keyword => text.includes(keyword))
}

// ============================================================================
// COMPLEXITY ESTIMATION
// ============================================================================

/**
 * Estimate task complexity from description.
 */
function estimateComplexity(text: string, length: number): TaskRequirements['complexity'] {
  // Check for complexity indicators
  const highComplexityKeywords = [
    'complex', 'advanced', 'sophisticated', 'intricate',
    'comprehensive', 'detailed', 'thorough', 'extensive'
  ]

  const lowComplexityKeywords = [
    'simple', 'basic', 'quick', 'brief', 'straightforward',
    'easy', 'introductory', 'beginner'
  ]

  const hasHigh = highComplexityKeywords.some(keyword => text.includes(keyword))
  const hasLow = lowComplexityKeywords.some(keyword => text.includes(keyword))

  if (hasHigh) return 'high'
  if (hasLow) return 'low'

  // Default to medium, but use length as a hint
  if (length > 500) return 'high'
  if (length < 100) return 'low'

  return 'medium'
}

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

/**
 * Estimate input/output tokens for a task.
 */
function estimateTokens(
  description: string,
  complexity: TaskRequirements['complexity']
): TaskRequirements['estimatedTokens'] {
  // Input tokens: task description + some overhead
  const inputTokens = Math.ceil(description.length / 4) + 100

  // Output tokens: based on complexity and input size
  const complexityMultipliers = {
    low: 2,
    medium: 3,
    high: 5
  }

  const outputTokens = inputTokens * complexityMultipliers[complexity]

  return {
    input: inputTokens,
    output: outputTokens
  }
}

// ============================================================================
// CAPABILITY DETECTION
// ============================================================================

/**
 * Check if task requires multimodal capabilities.
 */
function hasMultimodalRequirements(text: string): boolean {
  const multimodalKeywords = [
    'image', 'picture', 'photo', 'audio', 'video',
    'visual', 'graph', 'chart', 'diagram', 'screenshot'
  ]

  return multimodalKeywords.some(keyword => text.includes(keyword))
}

/**
 * Check if task requires tool/function calling.
 */
function hasToolRequirements(text: string): boolean {
  const toolKeywords = [
    'search', 'lookup', 'fetch', 'api call', 'database query',
    'web', 'internet', 'external', 'tool'
  ]

  return toolKeywords.some(keyword => text.includes(keyword))
}

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

/**
 * Generate a model recommendation with detailed reasoning.
 *
 * @param task - Task requirements
 * @param preferences - User preferences
 * @returns Model recommendation with reasoning
 */
export function generateRecommendation(
  task: TaskRequirements,
  preferences?: UserPreferences
): ModelRecommendation {
  const { getModelSelector } = require('./multi-model')
  const selector = getModelSelector()

  // Get top recommendation
  const recommendations = selector.getRecommendations(task, preferences, 4)
  const top = recommendations[0]

  if (!top) {
    throw new Error('No suitable models found for task')
  }

  // Generate reasoning
  const reasoning = generateReasoning(top.model, task, preferences)

  // Generate alternatives
  const alternatives = recommendations.slice(1).map((r: any) => ({
    model: r.model,
    score: r.score,
    reason: getAlternativeReason(r.model, task, preferences)
  }))

  // Calculate cost
  const { getModelCostEstimator } = require('./multi-model')
  const estimator = getModelCostEstimator()
  const cost = estimator.estimateCost(task, top.model)

  // Calculate confidence
  const confidence = calculateConfidence(top, recommendations, task)

  return {
    model: top.model,
    confidence,
    score: top.score,
    reasoning,
    cost,
    alternatives
  }
}

/**
 * Generate reasoning for why a model was selected.
 */
function generateReasoning(
  model: any, // AIModel
  task: TaskRequirements,
  preferences?: UserPreferences
): string[] {
  const reasons: string[] = []

  // Capability matching
  if (task.requiresCode && model.capabilities.code) {
    reasons.push(`Excellent code generation capabilities`)
  }
  if (task.requiresMath && model.capabilities.math) {
    reasons.push(`Strong mathematical reasoning`)
  }
  if (task.requiresCreative && model.capabilities.creative) {
    reasons.push(`Good creative writing ability`)
  }
  if (task.requiresAnalysis && model.capabilities.analysis) {
    reasons.push(`Capable data analysis skills`)
  }
  if (task.requiresMultimodal && model.capabilities.multimodal) {
    reasons.push(`Multimodal support for images/audio`)
  }

  // Performance
  if (model.performance.quality === 'high') {
    reasons.push(`High-quality output (tier: ${model.performance.quality})`)
  }
  if (model.performance.speed === 'fast') {
    reasons.push(`Fast response speed (${model.benchmarks.avgTokensPerSecond} tokens/sec)`)
  }

  // Cost
  const totalCost = model.pricing.inputCost + model.pricing.outputCost
  if (totalCost < 1) {
    reasons.push(`Very cost-effective ($${totalCost.toFixed(2)} per 1M tokens)`)
  } else if (totalCost < 10) {
    reasons.push(`Affordable pricing ($${totalCost.toFixed(2)} per 1M tokens)`)
  }

  // Context window
  if (model.limits.maxTokens >= 100000) {
    reasons.push(`Large context window (${(model.limits.maxTokens / 1000).toFixed(0)}K tokens)`)
  }

  // Priority-specific reasons
  if (preferences?.priority === 'cost' && totalCost < 5) {
    reasons.push(`Optimized for cost efficiency`)
  }
  if (preferences?.priority === 'speed' && model.performance.speed === 'fast') {
    reasons.push(`Optimized for speed`)
  }
  if (preferences?.priority === 'quality' && model.performance.quality === 'high') {
    reasons.push(`Optimized for quality output`)
  }

  return reasons
}

/**
 * Generate reason for why an alternative model is suggested.
 */
function getAlternativeReason(
  model: any, // AIModel
  task: TaskRequirements,
  preferences?: UserPreferences
): string {
  const totalCost = model.pricing.inputCost + model.pricing.outputCost

  if (preferences?.priority === 'cost' && totalCost < 1) {
    return 'Even more cost-effective option'
  }
  if (preferences?.priority === 'quality' && model.performance.quality === 'high') {
    return 'Similar quality at different price point'
  }
  if (preferences?.priority === 'speed' && model.performance.speed === 'fast') {
    return 'Comparable speed with better capabilities'
  }

  if (model.capabilities.code && task.requiresCode) {
    return 'Also has strong code capabilities'
  }

  return 'Good alternative with different trade-offs'
}

/**
 * Calculate confidence in recommendation.
 */
function calculateConfidence(
  top: { model: any; score: number },
  all: Array<{ model: any; score: number }>,
  task: TaskRequirements
): number {
  if (all.length < 2) return 0.5

  // Calculate score gap between top and second
  const gap = top.score - all[1].score
  const averageScore = all.reduce((sum, r) => sum + r.score, 0) / all.length

  // More confidence if top is significantly better than average
  const aboveAverage = (top.score - averageScore) / Math.abs(averageScore)

  // Higher confidence for simpler tasks
  const complexityBonus = {
    low: 0.2,
    medium: 0.1,
    high: 0
  }

  let confidence = 0.5 + aboveAverage * 0.3 + complexityBonus[task.complexity]

  return Math.min(0.99, Math.max(0.1, confidence))
}

// ============================================================================
// BATCH TASK ANALYSIS
// ============================================================================

/**
 * Analyze multiple tasks in batch.
 *
 * @param taskDescriptions - Array of task descriptions
 * @param context - Optional shared context
 * @returns Array of analyzed requirements
 */
export function analyzeTasks(
  taskDescriptions: string[],
  context?: Partial<UserPreferences>
): TaskRequirements[] {
  return taskDescriptions.map(description =>
    analyzeTask(description, context)
  )
}

/**
 * Find optimal model assignment for multiple tasks.
 *
 * @param tasks - Task requirements
 * @param preferences - User preferences
 * @returns Map of task index to model ID
 */
export function optimizeTaskModelAssignment(
  tasks: TaskRequirements[],
  preferences?: UserPreferences
): Map<number, string> {
  const { getModelSelector } = require('./multi-model')
  const selector = getModelSelector()

  const assignment = new Map<number, string>()

  for (let i = 0; i < tasks.length; i++) {
    const model = selector.selectModelForTask(tasks[i], preferences)
    assignment.set(i, model.id)
  }

  return assignment
}
