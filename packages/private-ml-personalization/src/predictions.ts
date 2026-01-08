/**
 * PersonalLog - Predictive Preference System
 *
 * Predicts user preferences and recommendations using:
 * - Rule-based models
 * - Naive Bayes classifier
 * - K-Nearest Neighbors
 * - Collaborative filtering (local)
 * - Content-based filtering
 */

import type {
  PreferenceKey,
  PreferenceValue,
  UserAction,
} from './types'
import { PatternAnalyzer, type PatternContext } from './patterns'

// ============================================================================
// TYPES
// ============================================================================

export interface Prediction<T = PreferenceValue> {
  /** Predicted value */
  value: T
  /** Confidence (0-1) */
  confidence: number
  /** Reasoning */
  reason: string
  /** Model used */
  model: string
}

export interface ProviderPrediction {
  /** Recommended provider */
  provider: string
  /** Confidence */
  confidence: number
  /** Reasoning */
  reason: string
}

export interface FeaturePrediction {
  /** Likely next feature */
  feature: string
  /** Confidence */
  confidence: number
}

export interface ContextualRecommendation {
  /** Type of recommendation */
  type: 'provider' | 'feature' | 'setting' | 'action'
  /** Recommendation */
  recommendation: string
  /** Confidence */
  confidence: number
  /** Context */
  context: string
  /** Explanation */
  explanation: string
}

// ============================================================================
// RULE-BASED MODEL
// ============================================================================

export class RuleBasedModel {
  private rules: Array<{
    condition: (context: PatternContext) => boolean
    prediction: PreferenceValue
    preference: PreferenceKey
    confidence: number
  }> = []

  constructor() {
    this.initializeRules()
  }

  /**
   * Initialize prediction rules
   */
  private initializeRules(): void {
    // Time-based theme preference
    this.rules.push({
      condition: (ctx) => ctx.timeOfDay === 'evening' || ctx.timeOfDay === 'night',
      prediction: 'dark' as const,
      preference: 'ui.theme',
      confidence: 0.7,
    })

    this.rules.push({
      condition: (ctx) => ctx.timeOfDay === 'morning' || ctx.timeOfDay === 'afternoon',
      prediction: 'light' as const,
      preference: 'ui.theme',
      confidence: 0.6,
    })

    // Weekend vs weekday patterns
    this.rules.push({
      condition: (ctx) => ctx.dayOfWeek >= 5, // Sat/Sun
      prediction: 'spacious' as const,
      preference: 'ui.density',
      confidence: 0.5,
    })

    this.rules.push({
      condition: (ctx) => ctx.dayOfWeek < 5, // Weekdays
      prediction: 'comfortable' as const,
      preference: 'ui.density',
      confidence: 0.5,
    })
  }

  /**
   * Predict preference based on rules
   */
  predict(
    preference: PreferenceKey,
    context: PatternContext
  ): Prediction<PreferenceValue> | null {
    const applicableRules = this.rules.filter(
      r => r.preference === preference && r.condition(context)
    )

    if (applicableRules.length === 0) return null

    // Return highest confidence rule
    const rule = applicableRules.sort((a, b) => b.confidence - a.confidence)[0]

    return {
      value: rule.prediction,
      confidence: rule.confidence,
      reason: `Based on ${context.timeOfDay} time on ${context.dayOfWeek}`,
      model: 'rule-based',
    }
  }

  /**
   * Add custom rule
   */
  addRule(
    preference: PreferenceKey,
    condition: (context: PatternContext) => boolean,
    prediction: PreferenceValue,
    confidence: number
  ): void {
    this.rules.push({
      condition,
      prediction,
      preference,
      confidence,
    })
  }
}

// ============================================================================
// NAIVE BAYES CLASSIFIER
// ============================================================================

export class NaiveBayesClassifier {
  private classProbabilities = new Map<string, number>() // class -> probability
  private featureProbabilities = new Map<string, Map<string, number>>() // feature -> class -> probability

  /**
   * Train model with examples
   */
  train(features: Record<string, unknown>, label: string): void {
    // Update class probability
    const classCount = this.classProbabilities.get(label) || 0
    this.classProbabilities.set(label, classCount + 1)

    // Update feature probabilities
    for (const [feature, value] of Object.entries(features)) {
      const key = `${feature}:${String(value)}`
      let featureMap = this.featureProbabilities.get(key)
      if (!featureMap) {
        featureMap = new Map()
        this.featureProbabilities.set(key, featureMap)
      }

      const count = featureMap.get(label) || 0
      featureMap.set(label, count + 1)
    }
  }

  /**
   * Predict class for features
   */
  predict(features: Record<string, unknown>): Prediction<string> | null {
    const totalSamples = Array.from(this.classProbabilities.values())
      .reduce((sum, count) => sum + count, 0)

    if (totalSamples === 0) return null

    let bestClass: { class: string; probability: number } | null = null

    // Calculate probability for each class
    for (const [className, classCount] of this.classProbabilities.entries()) {
      let logProb = Math.log(classCount / totalSamples)

      // Add log probabilities for each feature
      for (const [feature, value] of Object.entries(features)) {
        const key = `${feature}:${String(value)}`
        const featureMap = this.featureProbabilities.get(key)

        if (featureMap) {
          const count = featureMap.get(className) || 0
          // Laplace smoothing
          const prob = (count + 1) / (classCount + 2)
          logProb += Math.log(prob)
        }
      }

      const prob = Math.exp(logProb)

      if (!bestClass || prob > bestClass.probability) {
        bestClass = { class: className, probability: prob }
      }
    }

    if (!bestClass) return null

    // Normalize probability to confidence
    const confidence = Math.min(bestClass.probability, 1.0)

    return {
      value: bestClass.class,
      confidence,
      reason: `Based on ${Object.keys(features).length} features with ${confidence.toFixed(2)} confidence`,
      model: 'naive-bayes',
    }
  }

  /**
   * Reset model
   */
  reset(): void {
    this.classProbabilities.clear()
    this.featureProbabilities.clear()
  }
}

// ============================================================================
// K-NEAREST NEIGHBORS
// ============================================================================

export class KNearestNeighbors {
  private k: number
  private trainingData: Array<{
    features: number[]
    label: string
  }> = []

  constructor(k: number = 5) {
    this.k = k
  }

  /**
   * Add training example
   */
  train(features: number[], label: string): void {
    this.trainingData.push({ features, label })
  }

  /**
   * Predict label for features
   */
  predict(features: number[]): Prediction<string> | null {
    if (this.trainingData.length === 0) return null

    // Calculate distances to all training points
    const distances = this.trainingData.map(point => ({
      label: point.label,
      distance: this.euclideanDistance(features, point.features),
    }))

    // Sort by distance and get k nearest
    const kNearest = distances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, Math.min(this.k, distances.length))

    // Count votes
    const votes = new Map<string, number>()
    for (const neighbor of kNearest) {
      const count = votes.get(neighbor.label) || 0
      votes.set(neighbor.label, count + 1)
    }

    // Get most voted class
    let bestLabel: { label: string; votes: number } | null = null
    for (const [label, count] of votes.entries()) {
      if (!bestLabel || count > bestLabel.votes) {
        bestLabel = { label, votes: count }
      }
    }

    if (!bestLabel) return null

    // Confidence based on vote proportion
    const confidence = bestLabel.votes / this.k

    return {
      value: bestLabel.label,
      confidence,
      reason: `Based on ${this.k} nearest similar sessions`,
      model: 'knn',
    }
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += Math.pow(a[i] - b[i], 2)
    }
    return Math.sqrt(sum)
  }

  /**
   * Reset model
   */
  reset(): void {
    this.trainingData = []
  }
}

// ============================================================================
// COLLABORATIVE FILTERING (LOCAL)
// ============================================================================

export class CollaborativeFiltering {
  // userId -> (feature -> rating)
  private userRatings = new Map<string, Map<string, number>>()
  // feature -> (user -> rating)
  private itemRatings = new Map<string, Map<string, number>>()

  /**
   * Add rating
   */
  addRating(userId: string, feature: string, rating: number): void {
    // User ratings
    let userMap = this.userRatings.get(userId)
    if (!userMap) {
      userMap = new Map()
      this.userRatings.set(userId, userMap)
    }
    userMap.set(feature, rating)

    // Item ratings
    let itemMap = this.itemRatings.get(feature)
    if (!itemMap) {
      itemMap = new Map()
      this.itemRatings.set(feature, itemMap)
    }
    itemMap.set(userId, rating)
  }

  /**
   * Find similar users
   */
  findSimilarUsers(userId: string, n: number = 5): string[] {
    const userRatings = this.userRatings.get(userId)
    if (!userRatings) return []

    const similarities: Array<{ otherUser: string; similarity: number }> = []

    for (const [otherUser, otherRatings] of this.userRatings.entries()) {
      if (otherUser === userId) continue

      const similarity = this.cosineSimilarity(userRatings, otherRatings)
      similarities.push({ otherUser, similarity })
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n)
      .map(s => s.otherUser)
  }

  /**
   * Predict rating for user and feature
   */
  predict(userId: string, feature: string): Prediction<number> | null {
    const similarUsers = this.findSimilarUsers(userId, 10)
    if (similarUsers.length === 0) return null

    // Get ratings from similar users
    let weightedSum = 0
    let similaritySum = 0

    for (const otherUser of similarUsers) {
      const otherRatings = this.userRatings.get(otherUser)
      if (!otherRatings) continue

      const rating = otherRatings.get(feature)
      if (rating === undefined) continue

      const similarity = this.cosineSimilarity(
        this.userRatings.get(userId)!,
        otherRatings
      )

      weightedSum += similarity * rating
      similaritySum += Math.abs(similarity)
    }

    if (similaritySum === 0) return null

    const predictedRating = weightedSum / similaritySum

    return {
      value: predictedRating,
      confidence: Math.min(similaritySum / similarUsers.length, 1.0),
      reason: `Based on preferences of ${similarUsers.length} similar users`,
      model: 'collaborative-filtering',
    }
  }

  /**
   * Calculate cosine similarity between two rating vectors
   */
  private cosineSimilarity(
    ratings1: Map<string, number>,
    ratings2: Map<string, number>
  ): number {
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    // Find common features
    const commonFeatures: string[] = []
    for (const feature of ratings1.keys()) {
      if (ratings2.has(feature)) {
        commonFeatures.push(feature)
      }
    }

    if (commonFeatures.length === 0) return 0

    for (const feature of commonFeatures) {
      const r1 = ratings1.get(feature)!
      const r2 = ratings2.get(feature)!
      dotProduct += r1 * r2
      norm1 += r1 * r1
      norm2 += r2 * r2
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
    if (denominator === 0) return 0

    return dotProduct / denominator
  }

  /**
   * Reset model
   */
  reset(): void {
    this.userRatings.clear()
    this.itemRatings.clear()
  }
}

// ============================================================================
// CONTENT-BASED FILTERING
// ============================================================================

export class ContentBasedFiltering {
  // feature -> (content -> vector)
  private featureVectors = new Map<string, Map<string, number[]>>()

  /**
   * Add feature with content vector
   */
  addFeature(feature: string, content: string, vector: number[]): void {
    let contentMap = this.featureVectors.get(feature)
    if (!contentMap) {
      contentMap = new Map()
      this.featureVectors.set(feature, contentMap)
    }
    contentMap.set(content, vector)
  }

  /**
   * Find similar features based on content
   */
  findSimilarFeatures(feature: string, content: string, n: number = 5): Array<{
    feature: string
    similarity: number
  }> {
    const contentMap = this.featureVectors.get(feature)
    if (!contentMap) return []

    const targetVector = contentMap.get(content)
    if (!targetVector) return []

    const similarities: Array<{ feature: string; similarity: number }> = []

    for (const [otherFeature, otherContentMap] of this.featureVectors.entries()) {
      if (otherFeature === feature) continue

      for (const [otherContent, otherVector] of otherContentMap.entries()) {
        const similarity = this.cosineSimilarity(targetVector, otherVector)
        similarities.push({
          feature: `${otherFeature}:${otherContent}`,
          similarity,
        })
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n)
  }

  /**
   * Suggest features based on content similarity
   */
  suggest(feature: string, content: string): Prediction<string[]> | null {
    const similar = this.findSimilarFeatures(feature, content, 10)
    if (similar.length === 0) return null

    const suggestions = similar
      .filter(s => s.similarity > 0.5)
      .map(s => s.feature)

    if (suggestions.length === 0) return null

    const avgSimilarity = similar
      .slice(0, suggestions.length)
      .reduce((sum, s) => sum + s.similarity, 0) / suggestions.length

    return {
      value: suggestions,
      confidence: avgSimilarity,
      reason: `Based on ${similar.length} similar features`,
      model: 'content-based',
    }
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    if (denominator === 0) return 0

    return dotProduct / denominator
  }

  /**
   * Reset model
   */
  reset(): void {
    this.featureVectors.clear()
  }
}

// ============================================================================
// PREDICTIVE ENGINE
// ============================================================================

export class PredictiveEngine {
  private ruleBased = new RuleBasedModel()
  private naiveBayes = new NaiveBayesClassifier()
  private knn = new KNearestNeighbors(5)
  private collaborative = new CollaborativeFiltering()
  private contentBased = new ContentBasedFiltering()
  private patternAnalyzer: PatternAnalyzer

  constructor(patternAnalyzer: PatternAnalyzer) {
    this.patternAnalyzer = patternAnalyzer
  }

  /**
   * Predict AI provider for task
   */
  predictProvider(task: string, context: PatternContext): ProviderPrediction {
    const taskAnalyzer = this.patternAnalyzer.getTaskAnalyzer()
    const predictedProvider = taskAnalyzer.predictProvider(task)

    if (predictedProvider) {
      const successRate = taskAnalyzer.getSuccessRate(task)

      return {
        provider: predictedProvider,
        confidence: Math.min(0.5 + (successRate * 0.5), 1.0),
        reason: `You've used ${predictedProvider} for ${task} ${successRate.toFixed(0)}% successfully`,
      }
    }

    // Fallback to time-based rules
    const timePatterns = this.patternAnalyzer.getTimeAnalyzer().detectPatterns()
    const timeFeatures = timePatterns.timeBasedPreferences

    let recommendedProvider = 'openai' // default

    if (context.timeOfDay === 'morning') {
      // Suggest from morning features
      if (timeFeatures.morning.length > 0) {
        recommendedProvider = this.extractProviderFromFeatures(timeFeatures.morning)
      }
    } else if (context.timeOfDay === 'afternoon') {
      if (timeFeatures.afternoon.length > 0) {
        recommendedProvider = this.extractProviderFromFeatures(timeFeatures.afternoon)
      }
    } else if (context.timeOfDay === 'evening') {
      if (timeFeatures.evening.length > 0) {
        recommendedProvider = this.extractProviderFromFeatures(timeFeatures.evening)
      }
    }

    return {
      provider: recommendedProvider,
      confidence: 0.4,
      reason: `Based on your ${context.timeOfDay} usage patterns`,
    }
  }

  /**
   * Predict tone preference
   */
  predictTone(context: PatternContext): Prediction<'casual' | 'neutral' | 'formal'> {
    const rulePrediction = this.ruleBased.predict('communication.tone', context)

    if (rulePrediction) {
      return rulePrediction as Prediction<'casual' | 'neutral' | 'formal'>
    }

    return {
      value: 'neutral',
      confidence: 0.5,
      reason: 'Default tone preference',
      model: 'default',
    }
  }

  /**
   * Predict response length
   */
  predictResponseLength(context: PatternContext): Prediction<'brief' | 'balanced' | 'detailed'> {
    const rulePrediction = this.ruleBased.predict('communication.responseLength', context)

    if (rulePrediction) {
      return rulePrediction as Prediction<'brief' | 'balanced' | 'detailed'>
    }

    return {
      value: 'balanced',
      confidence: 0.5,
      reason: 'Default response length',
      model: 'default',
    }
  }

  /**
   * Get contextual recommendations
   */
  getRecommendations(context: PatternContext): ContextualRecommendation[] {
    const recommendations: ContextualRecommendation[] = []

    // Provider recommendation
    const providerPred = this.predictProvider('general', context)
    recommendations.push({
      type: 'provider',
      recommendation: providerPred.provider,
      confidence: providerPred.confidence,
      context: 'AI Provider',
      explanation: providerPred.reason,
    })

    // Feature recommendations based on workflows
    const workflows = this.patternAnalyzer.getWorkflowAnalyzer().detectWorkflows(3)
    for (const workflow of workflows.slice(0, 3)) {
      recommendations.push({
        type: 'feature',
        recommendation: workflow.name,
        confidence: workflow.successRate,
        context: 'Common Workflow',
        explanation: `You frequently use this workflow (${workflow.frequency} times)`,
      })
    }

    // Time-based recommendations
    if (context.timeOfDay === 'evening' || context.timeOfDay === 'night') {
      recommendations.push({
        type: 'setting',
        recommendation: 'Enable dark mode',
        confidence: 0.7,
        context: 'Theme',
        explanation: `It's ${context.timeOfDay}, dark mode might be more comfortable`,
      })
    }

    return recommendations.slice(0, 5)
  }

  /**
   * Extract provider name from features
   */
  private extractProviderFromFeatures(features: string[]): string {
    // Simple heuristic - look for provider names in features
    const providers = ['openai', 'anthropic', 'ollama', 'deepseek', 'kimi', 'z-ai', 'x-ai']

    for (const provider of providers) {
      if (features.some(f => f.toLowerCase().includes(provider))) {
        return provider
      }
    }

    return 'openai' // default
  }

  /**
   * Train models with user actions
   */
  train(actions: UserAction[]): void {
    for (const action of actions) {
      // Extract features from action
      const features = this.extractFeatures(action)
      const label = this.extractLabel(action)

      if (features && label) {
        this.naiveBayes.train(features, label)
      }
    }
  }

  /**
   * Extract features from action
   */
  private extractFeatures(action: UserAction): Record<string, unknown> | null {
    const features: Record<string, unknown> = {
      type: action.type,
    }

    if (action.context?.feature) {
      features['feature'] = action.context.feature
    }

    if (action.context?.view) {
      features['view'] = action.context.view
    }

    const hour = new Date(action.timestamp).getHours()
    features['hour'] = hour >= 6 && hour < 12 ? 'morning' :
                     hour >= 12 && hour < 18 ? 'afternoon' :
                     hour >= 18 && hour < 24 ? 'evening' : 'night'

    return features
  }

  /**
   * Extract label from action
   */
  private extractLabel(action: UserAction): string | null {
    // Simple label extraction based on action type
    return action.type || null
  }

  /**
   * Get rule-based model
   */
  getRuleBasedModel(): RuleBasedModel {
    return this.ruleBased
  }

  /**
   * Get naive bayes model
   */
  getNaiveBayesModel(): NaiveBayesClassifier {
    return this.naiveBayes
  }

  /**
   * Get KNN model
   */
  getKNNModel(): KNearestNeighbors {
    return this.knn
  }

  /**
   * Get collaborative filtering model
   */
  getCollaborativeModel(): CollaborativeFiltering {
    return this.collaborative
  }

  /**
   * Get content-based model
   */
  getContentBasedModel(): ContentBasedFiltering {
    return this.contentBased
  }

  /**
   * Reset all models
   */
  reset(): void {
    this.naiveBayes.reset()
    this.knn.reset()
    this.collaborative.reset()
    this.contentBased.reset()
  }
}
