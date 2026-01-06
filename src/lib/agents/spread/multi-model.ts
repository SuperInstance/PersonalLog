/**
 * Multi-Model Spreading System
 *
 * Intelligent model selection system that optimizes for cost, speed, or quality
 * when spreading tasks across different AI models.
 */

import type { AIModel, TaskRequirements, UserPreferences, ModelCapabilities, CostEstimate, CostComparison } from './types'
import { AVAILABLE_MODELS } from './model-catalog'
import { analyzeTask } from './model-matcher'

// ============================================================================
// MODEL SELECTOR
// ============================================================================

/**
 * Selects the best AI model for a given task based on requirements and preferences.
 */
export class ModelSelector {
  /**
   * Select the best model for a task.
   *
   * @param task - Task requirements
   * @param preferences - User preferences for optimization
   * @returns Selected AI model
   */
  selectModelForTask(
    task: TaskRequirements,
    preferences?: UserPreferences
  ): AIModel {
    // Filter models by capability requirements
    const candidates = AVAILABLE_MODELS.filter(model =>
      this.isModelSuitable(model, task)
    )

    // If no candidates, return most capable model
    if (candidates.length === 0) {
      console.warn('[ModelSelector] No suitable models found, returning default')
      return AVAILABLE_MODELS[0]
    }

    // Score models based on preferences
    const scored = candidates.map(model => ({
      model,
      score: this.scoreModel(model, task, preferences)
    }))

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score)

    return scored[0].model
  }

  /**
   * Get top N recommended models for a task.
   *
   * @param task - Task requirements
   * @param preferences - User preferences
   * @param count - Number of recommendations to return
   * @returns Array of recommended models with scores
   */
  getRecommendations(
    task: TaskRequirements,
    preferences?: UserPreferences,
    count: number = 3
  ): Array<{ model: AIModel; score: number }> {
    const candidates = AVAILABLE_MODELS.filter(model =>
      this.isModelSuitable(model, task)
    )

    const scored = candidates
      .map(model => ({
        model,
        score: this.scoreModel(model, task, preferences)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)

    return scored
  }

  /**
   * Check if a model is suitable for a task.
   */
  private isModelSuitable(model: AIModel, task: TaskRequirements): boolean {
    // Check capability requirements
    if (task.requiresCode && !model.capabilities.code) return false
    if (task.requiresMath && !model.capabilities.math) return false
    if (task.requiresCreative && !model.capabilities.creative) return false
    if (task.requiresAnalysis && !model.capabilities.analysis) return false

    // Check complexity requirements
    if (task.complexity === 'high' && model.performance.quality === 'low') {
      return false
    }

    // Check token requirements
    const totalTokens = task.estimatedTokens.input + task.estimatedTokens.output
    if (totalTokens > model.limits.maxTokens) {
      return false
    }

    return true
  }

  /**
   * Score a model for a task (higher is better).
   */
  private scoreModel(
    model: AIModel,
    task: TaskRequirements,
    preferences?: UserPreferences
  ): number {
    let score = 0

    // Quality score (weighted x2)
    const qualityScores = { low: 1, medium: 2, high: 3 }
    score += qualityScores[model.performance.quality] * 2

    // Speed score
    const speedScores = { slow: 1, medium: 2, fast: 3 }
    score += speedScores[model.performance.speed]

    // Capability matching (heavy weight for required capabilities)
    if (task.requiresCode && model.capabilities.code) score += 5
    if (task.requiresMath && model.capabilities.math) score += 5
    if (task.requiresCreative && model.capabilities.creative) score += 3
    if (task.requiresAnalysis && model.capabilities.analysis) score += 3

    // Multimodal bonus
    if (task.requiresMultimodal && model.capabilities.multimodal) score += 4

    // Tools/function calling bonus
    if (task.requiresTools && model.capabilities.tools) score += 2

    // Reliability bonus
    score += model.performance.reliability * 3

    // Cost scoring based on user preferences
    const totalCost = this.calculateCost(task, model)

    if (preferences?.priority === 'cost') {
      // Lower cost is MUCH better (penalty based on cost)
      score -= totalCost * 100
    } else if (preferences?.priority === 'quality') {
      // Higher quality is better (already accounted for)
      // Penalize cost less
      score -= totalCost * 10
    } else if (preferences?.priority === 'speed') {
      // Faster is better
      score += model.benchmarks.avgTokensPerSecond * 0.5
      // Small cost penalty
      score -= totalCost * 5
    } else {
      // Default: balanced approach
      score -= totalCost * 20
    }

    // Complexity bonus/penalty
    if (task.complexity === 'high' && model.performance.quality === 'high') {
      score += 3 // Bonus for high quality on complex tasks
    } else if (task.complexity === 'low' && model.performance.quality === 'low') {
      score += 1 // It's okay to use low quality for simple tasks
    }

    return score
  }

  /**
   * Calculate estimated cost for a task with a model.
   */
  private calculateCost(task: TaskRequirements, model: AIModel): number {
    const inputCost = (task.estimatedTokens.input / 1e6) * model.pricing.inputCost
    const outputCost = (task.estimatedTokens.output / 1e6) * model.pricing.outputCost
    return inputCost + outputCost
  }
}

// ============================================================================
// MODEL COST ESTIMATOR
// ============================================================================

/**
 * Estimates and compares costs across different models.
 */
export class ModelCostEstimator {
  /**
   * Estimate cost for a specific task with a specific model.
   *
   * @param task - Task requirements
   * @param model - AI model to use
   * @returns Cost estimate
   */
  estimateCost(task: TaskRequirements, model: AIModel): CostEstimate {
    const inputCost = (task.estimatedTokens.input / 1e6) * model.pricing.inputCost
    const outputCost = (task.estimatedTokens.output / 1e6) * model.pricing.outputCost
    const totalCost = inputCost + outputCost

    const estimatedTime = task.estimatedTokens.output / model.benchmarks.avgTokensPerSecond

    return {
      modelId: model.id,
      modelName: model.name,
      inputCost,
      outputCost,
      totalCost,
      estimatedTime,
      tokens: task.estimatedTokens,
      model
    }
  }

  /**
   * Compare costs across all suitable models for a task.
   *
   * @param task - Task requirements
   * @returns Cost comparison with cheapest, fastest, and best quality options
   */
  compareCosts(task: TaskRequirements): CostComparison {
    const suitableModels = AVAILABLE_MODELS.filter(m =>
      this.isModelSuitable(m, task)
    )

    const estimates = suitableModels.map(m => this.estimateCost(task, m))

    const cheapest = [...estimates].sort((a, b) => a.totalCost - b.totalCost)[0]
    const fastest = [...estimates].sort((a, b) => a.estimatedTime - b.estimatedTime)[0]
    const bestQuality = [...estimates].sort((a, b) => {
      const qualityOrder = { high: 3, medium: 2, low: 1 }
      return qualityOrder[b.model.performance.quality] - qualityOrder[a.model.performance.quality]
    })[0]

    return {
      cheapest,
      fastest,
      bestQuality,
      all: estimates
    }
  }

  /**
   * Check if a model is suitable for a task.
   */
  private isModelSuitable(model: AIModel, task: TaskRequirements): boolean {
    if (task.requiresCode && !model.capabilities.code) return false
    if (task.requiresMath && !model.capabilities.math) return false
    if (task.requiresCreative && !model.capabilities.creative) return false
    if (task.requiresAnalysis && !model.capabilities.analysis) return false
    if (task.complexity === 'high' && model.performance.quality === 'low') return false

    const totalTokens = task.estimatedTokens.input + task.estimatedTokens.output
    if (totalTokens > model.limits.maxTokens) return false

    return true
  }
}

// ============================================================================
// MODEL PERFORMANCE TRACKER
// ============================================================================

/**
 * Tracks actual model performance for optimization.
 */
export class ModelPerformanceTracker {
  private performanceHistory: Map<string, PerformanceRecord[]> = new Map()

  /**
   * Record actual performance from a model execution.
   *
   * @param modelId - Model identifier
   * @param record - Performance record
   */
  recordPerformance(modelId: string, record: PerformanceRecord): void {
    const history = this.performanceHistory.get(modelId) || []
    history.push(record)

    // Keep only last 100 records per model
    if (history.length > 100) {
      history.shift()
    }

    this.performanceHistory.set(modelId, history)
  }

  /**
   * Get average performance metrics for a model.
   *
   * @param modelId - Model identifier
   * @returns Average performance or null
   */
  getAveragePerformance(modelId: string): AveragePerformance | null {
    const history = this.performanceHistory.get(modelId)
    if (!history || history.length === 0) return null

    const totalCost = history.reduce((sum, r) => sum + r.actualCost, 0)
    const totalTime = history.reduce((sum, r) => sum + r.actualTime, 0)
    const successCount = history.filter(r => r.success).length

    return {
      modelId,
      averageCost: totalCost / history.length,
      averageTime: totalTime / history.length,
      successRate: successCount / history.length,
      sampleSize: history.length
    }
  }

  /**
   * Get performance comparison across models.
   *
   * @param modelIds - Model IDs to compare
   * @returns Performance metrics for each model
   */
  comparePerformance(modelIds: string[]): Map<string, AveragePerformance | null> {
    const comparison = new Map<string, AveragePerformance | null>()

    for (const modelId of modelIds) {
      comparison.set(modelId, this.getAveragePerformance(modelId))
    }

    return comparison
  }

  /**
   * Get all performance history.
   */
  getAllHistory(): Map<string, PerformanceRecord[]> {
    return new Map(this.performanceHistory)
  }

  /**
   * Clear performance history for a model.
   */
  clearHistory(modelId: string): void {
    this.performanceHistory.delete(modelId)
  }

  /**
   * Clear all performance history.
   */
  clearAllHistory(): void {
    this.performanceHistory.clear()
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceRecord {
  modelId: string
  taskId: string
  taskType: TaskRequirements['type']
  actualCost: number
  actualTime: number
  actualTokens: {
    input: number
    output: number
  }
  success: boolean
  timestamp: number
}

export interface AveragePerformance {
  modelId: string
  averageCost: number
  averageTime: number
  successRate: number
  sampleSize: number
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

let modelSelectorInstance: ModelSelector | null = null
let costEstimatorInstance: ModelCostEstimator | null = null
let performanceTrackerInstance: ModelPerformanceTracker | null = null

/**
 * Get or create the singleton ModelSelector.
 */
export function getModelSelector(): ModelSelector {
  if (!modelSelectorInstance) {
    modelSelectorInstance = new ModelSelector()
  }
  return modelSelectorInstance
}

/**
 * Get or create the singleton ModelCostEstimator.
 */
export function getModelCostEstimator(): ModelCostEstimator {
  if (!costEstimatorInstance) {
    costEstimatorInstance = new ModelCostEstimator()
  }
  return costEstimatorInstance
}

/**
 * Get or create the singleton ModelPerformanceTracker.
 */
export function getModelPerformanceTracker(): ModelPerformanceTracker {
  if (!performanceTrackerInstance) {
    performanceTrackerInstance = new ModelPerformanceTracker()
  }
  return performanceTrackerInstance
}
