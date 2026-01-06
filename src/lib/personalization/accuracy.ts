/**
 * PersonalLog - Prediction Accuracy Tracking
 *
 * Tracks and analyzes prediction accuracy for the personalization system.
 * Measures how well the system learns and predicts user preferences.
 */

import type { PreferenceKey, PreferenceValue } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface PredictionRecord {
  /** Prediction ID */
  id: string
  /** Preference key being predicted */
  preferenceKey: PreferenceKey
  /** Predicted value */
  predictedValue: PreferenceValue
  /** Actual value (when available) */
  actualValue?: PreferenceValue
  /** Confidence of prediction (0-1) */
  confidence: number
  /** Timestamp of prediction */
  timestamp: string
  /** Whether prediction was correct */
  isCorrect?: boolean
  /** Time until actual value was observed */
  feedbackDelay?: number // ms
  /** Model used for prediction */
  model: string
}

export interface AccuracyMetrics {
  /** Total predictions made */
  totalPredictions: number
  /** Correct predictions (top-1) */
  correctPredictions: number
  /** Top-1 accuracy (correct / total) */
  top1Accuracy: number
  /** Top-k accuracy (correct in top k predictions) */
  topKAccuracy: number
  /** Average confidence */
  avgConfidence: number
  /** Confidence calibration (how well confidence matches accuracy) */
  calibrationScore: number
  /** Brier score (probability forecasting accuracy) */
  brierScore: number
  /** Per-metric accuracy breakdown */
  accuracyByMetric: Map<string, number>
  /** Accuracy by prediction type */
  accuracyByType: Map<string, number>
  /** Accuracy by confidence bucket */
  accuracyByConfidence: ConfidenceBucket[]
}

export interface ConfidenceBucket {
  /** Confidence range (e.g., 0.8-1.0) */
  range: string
  /** Min confidence */
  minConfidence: number
  /** Max confidence */
  maxConfidence: number
  /** Number of predictions in this bucket */
  count: number
  /** Actual accuracy in this bucket */
  accuracy: number
  /** Expected accuracy (should match actual if well calibrated) */
  expectedAccuracy: number
}

export interface ABDTestResult {
  /** Test name/identifier */
  testName: string
  /** Control group accuracy */
  controlAccuracy: number
  /** Treatment group accuracy */
  treatmentAccuracy: number
  /** Statistical significance (p-value) */
  pValue: number
  /** Is difference statistically significant */
  isSignificant: boolean
  /** Lift (improvement %) */
  lift: number
  /** Sample size */
  sampleSize: number
}

// ============================================================================
// ACCURACY TRACKER
// ============================================================================

export class AccuracyTracker {
  private predictions: Map<string, PredictionRecord> = new Map()
  private predictionHistory: PredictionRecord[] = []
  private maxHistorySize = 10000

  /**
   * Record a prediction
   */
  recordPrediction(
    preferenceKey: PreferenceKey,
    predictedValue: PreferenceValue,
    confidence: number,
    model: string = 'unknown'
  ): string {
    const id = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const record: PredictionRecord = {
      id,
      preferenceKey,
      predictedValue,
      confidence,
      timestamp: new Date().toISOString(),
      model,
    }

    this.predictions.set(id, record)
    this.predictionHistory.push(record)

    // Trim history if needed
    if (this.predictionHistory.length > this.maxHistorySize) {
      const removed = this.predictionHistory.shift()
      if (removed) {
        this.predictions.delete(removed.id)
      }
    }

    return id
  }

  /**
   * Record feedback for a prediction
   */
  recordFeedback(predictionId: string, actualValue: PreferenceValue): void {
    const record = this.predictions.get(predictionId)
    if (!record) {
      console.warn(`Prediction ${predictionId} not found for feedback`)
      return
    }

    record.actualValue = actualValue
    record.isCorrect = JSON.stringify(record.predictedValue) === JSON.stringify(actualValue)
    record.feedbackDelay = Date.now() - new Date(record.timestamp).getTime()

    this.predictions.set(predictionId, record)
  }

  /**
   * Calculate overall accuracy metrics
   */
  calculateMetrics(): AccuracyMetrics {
    const predictionsWithFeedback = Array.from(this.predictions.values()).filter(
      p => p.actualValue !== undefined
    )

    if (predictionsWithFeedback.length === 0) {
      return this.getEmptyMetrics()
    }

    const total = predictionsWithFeedback.length
    const correct = predictionsWithFeedback.filter(p => p.isCorrect).length

    // Top-1 accuracy
    const top1Accuracy = correct / total

    // Top-k accuracy (assuming k=3 for now)
    const topKAccuracy = this.calculateTopKAccuracy(predictionsWithFeedback, 3)

    // Average confidence
    const avgConfidence =
      predictionsWithFeedback.reduce((sum, p) => sum + p.confidence, 0) / total

    // Confidence calibration
    const calibrationScore = this.calculateCalibrationScore(predictionsWithFeedback)

    // Brier score
    const brierScore = this.calculateBrierScore(predictionsWithFeedback)

    // Accuracy by metric
    const accuracyByMetric = this.calculateAccuracyByMetric(predictionsWithFeedback)

    // Accuracy by type
    const accuracyByType = this.calculateAccuracyByType(predictionsWithFeedback)

    // Accuracy by confidence bucket
    const accuracyByConfidence = this.calculateAccuracyByConfidence(predictionsWithFeedback)

    return {
      totalPredictions: total,
      correctPredictions: correct,
      top1Accuracy,
      topKAccuracy,
      avgConfidence,
      calibrationScore,
      brierScore,
      accuracyByMetric,
      accuracyByType,
      accuracyByConfidence,
    }
  }

  /**
   * Get accuracy for a specific metric
   */
  getMetricAccuracy(metric: string): number | null {
    const metrics = this.calculateMetrics()
    return metrics.accuracyByMetric.get(metric) || null
  }

  /**
   * Get accuracy for a specific prediction type
   */
  getTypeAccuracy(type: string): number | null {
    const metrics = this.calculateMetrics()
    return metrics.accuracyByType.get(type) || null
  }

  /**
   * Get recent predictions (last N)
   */
  getRecentPredictions(count: number = 100): PredictionRecord[] {
    return this.predictionHistory.slice(-count)
  }

  /**
   * Get correct predictions
   */
  getCorrectPredictions(): PredictionRecord[] {
    return Array.from(this.predictions.values()).filter(p => p.isCorrect === true)
  }

  /**
   * Get incorrect predictions
   */
  getIncorrectPredictions(): PredictionRecord[] {
    return Array.from(this.predictions.values()).filter(p => p.isCorrect === false)
  }

  /**
   * Get accuracy trend over time
   */
  getAccuracyTrend(bucketSize: number = 100): Array<{
    bucket: number
    accuracy: number
    count: number
  }> {
    const predictionsWithFeedback = Array.from(this.predictions.values()).filter(
      p => p.actualValue !== undefined
    )

    const buckets: Array<{ bucket: number; accuracy: number; count: number }> = []
    const totalBuckets = Math.ceil(predictionsWithFeedback.length / bucketSize)

    for (let i = 0; i < totalBuckets; i++) {
      const start = i * bucketSize
      const end = start + bucketSize
      const bucketPredictions = predictionsWithFeedback.slice(start, end)

      if (bucketPredictions.length === 0) continue

      const correct = bucketPredictions.filter(p => p.isCorrect).length
      const accuracy = correct / bucketPredictions.length

      buckets.push({
        bucket: i + 1,
        accuracy,
        count: bucketPredictions.length,
      })
    }

    return buckets
  }

  /**
   * Reset all tracking
   */
  reset(): void {
    this.predictions.clear()
    this.predictionHistory = []
  }

  /**
   * Get prediction statistics
   */
  getStats(): {
    totalPredictions: number
    predictionsWithFeedback: number
    pendingPredictions: number
    avgFeedbackDelay: number | null
  } {
    const total = this.predictions.size
    const withFeedback = Array.from(this.predictions.values()).filter(
      p => p.actualValue !== undefined
    ).length

    const feedbackDelays = Array.from(this.predictions.values())
      .filter(p => p.feedbackDelay !== undefined)
      .map(p => p.feedbackDelay!)

    const avgFeedbackDelay =
      feedbackDelays.length > 0
        ? feedbackDelays.reduce((sum, d) => sum + d, 0) / feedbackDelays.length
        : null

    return {
      totalPredictions: total,
      predictionsWithFeedback: withFeedback,
      pendingPredictions: total - withFeedback,
      avgFeedbackDelay,
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Calculate top-k accuracy
   */
  private calculateTopKAccuracy(predictions: PredictionRecord[], k: number): number {
    // For now, top-k is same as top-1 since we don't track multiple predictions
    // This can be enhanced when we support multiple ranked predictions
    const correct = predictions.filter(p => p.isCorrect).length
    return correct / predictions.length
  }

  /**
   * Calculate calibration score
   * Measures how well confidence predictions match actual accuracy
   */
  private calculateCalibrationScore(predictions: PredictionRecord[]): number {
    // Group by confidence buckets and compare expected vs actual accuracy
    const buckets = this.calculateAccuracyByConfidence(predictions)

    if (buckets.length === 0) return 0

    // Calculate mean absolute error between expected and actual
    const errors = buckets.map(bucket => {
      const error = Math.abs(bucket.expectedAccuracy - bucket.accuracy)
      return error
    })

    // Return 1 - mean error (lower error = better calibration)
    const meanError = errors.reduce((sum, e) => sum + e, 0) / errors.length
    return Math.max(0, 1 - meanError)
  }

  /**
   * Calculate Brier score
   * Measures accuracy of probability predictions (lower is better)
   */
  private calculateBrierScore(predictions: PredictionRecord[]): number {
    // Brier score = 1/N * sum((predicted_prob - actual_outcome)^2)
    const sumSquaredErrors = predictions.reduce((sum, p) => {
      const outcome = p.isCorrect ? 1 : 0
      const error = Math.pow(p.confidence - outcome, 2)
      return sum + error
    }, 0)

    return sumSquaredErrors / predictions.length
  }

  /**
   * Calculate accuracy by metric
   */
  private calculateAccuracyByMetric(predictions: PredictionRecord[]): Map<string, number> {
    const metricMap = new Map<string, { correct: number; total: number }>()

    for (const prediction of predictions) {
      const metric = prediction.preferenceKey
      const current = metricMap.get(metric) || { correct: 0, total: 0 }

      current.total++
      if (prediction.isCorrect) {
        current.correct++
      }

      metricMap.set(metric, current)
    }

    const accuracyMap = new Map<string, number>()
    Array.from(metricMap.entries()).forEach(([metric, stats]) => {
      accuracyMap.set(metric, stats.correct / stats.total)
    })

    return accuracyMap
  }

  /**
   * Calculate accuracy by prediction type
   */
  private calculateAccuracyByType(predictions: PredictionRecord[]): Map<string, number> {
    const typeMap = new Map<string, { correct: number; total: number }>()

    for (const prediction of predictions) {
      // Extract type from preference key (e.g., 'ui.theme' -> 'ui')
      const parts = prediction.preferenceKey.split('.')
      const type = parts[0] || 'unknown'

      const current = typeMap.get(type) || { correct: 0, total: 0 }

      current.total++
      if (prediction.isCorrect) {
        current.correct++
      }

      typeMap.set(type, current)
    }

    const accuracyMap = new Map<string, number>()
    Array.from(typeMap.entries()).forEach(([type, stats]) => {
      accuracyMap.set(type, stats.correct / stats.total)
    })

    return accuracyMap
  }

  /**
   * Calculate accuracy by confidence bucket
   */
  private calculateAccuracyByConfidence(predictions: PredictionRecord[]): ConfidenceBucket[] {
    const buckets: ConfidenceBucket[] = [
      { range: '0.0-0.2', minConfidence: 0.0, maxConfidence: 0.2, count: 0, accuracy: 0, expectedAccuracy: 0.1 },
      { range: '0.2-0.4', minConfidence: 0.2, maxConfidence: 0.4, count: 0, accuracy: 0, expectedAccuracy: 0.3 },
      { range: '0.4-0.6', minConfidence: 0.4, maxConfidence: 0.6, count: 0, accuracy: 0, expectedAccuracy: 0.5 },
      { range: '0.6-0.8', minConfidence: 0.6, maxConfidence: 0.8, count: 0, accuracy: 0, expectedAccuracy: 0.7 },
      { range: '0.8-1.0', minConfidence: 0.8, maxConfidence: 1.0, count: 0, accuracy: 0, expectedAccuracy: 0.9 },
    ]

    const bucketData = new Map<number, { correct: number; total: number; confidenceSum: number }>()

    for (const prediction of predictions) {
      // Find appropriate bucket
      let bucketIndex = -1
      for (let i = 0; i < buckets.length; i++) {
        if (
          prediction.confidence >= buckets[i].minConfidence &&
          prediction.confidence < buckets[i].maxConfidence
        ) {
          bucketIndex = i
          break
        }
      }

      if (bucketIndex === -1) continue

      const data = bucketData.get(bucketIndex) || { correct: 0, total: 0, confidenceSum: 0 }
      data.total++
      data.confidenceSum += prediction.confidence
      if (prediction.isCorrect) {
        data.correct++
      }
      bucketData.set(bucketIndex, data)
    }

    // Update bucket stats
    for (let i = 0; i < buckets.length; i++) {
      const data = bucketData.get(i)
      if (data && data.total > 0) {
        buckets[i].count = data.total
        buckets[i].accuracy = data.correct / data.total
        buckets[i].expectedAccuracy = data.confidenceSum / data.total
      }
    }

    return buckets
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): AccuracyMetrics {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      top1Accuracy: 0,
      topKAccuracy: 0,
      avgConfidence: 0,
      calibrationScore: 0,
      brierScore: 0,
      accuracyByMetric: new Map(),
      accuracyByType: new Map(),
      accuracyByConfidence: [],
    }
  }
}

// ============================================================================
// A/B TEST FRAMEWORK
// ============================================================================

export class ABTestFramework {
  private tests: Map<string, {
    controlResults: Array<{ correct: boolean; confidence: number }>
    treatmentResults: Array<{ correct: boolean; confidence: number }>
  }> = new Map()

  /**
   * Start a new A/B test
   */
  startTest(testName: string): void {
    if (this.tests.has(testName)) {
      console.warn(`A/B test ${testName} already exists`)
      return
    }

    this.tests.set(testName, {
      controlResults: [],
      treatmentResults: [],
    })
  }

  /**
   * Record a control group result
   */
  recordControl(testName: string, correct: boolean, confidence: number): void {
    const test = this.tests.get(testName)
    if (!test) {
      console.warn(`A/B test ${testName} not found`)
      return
    }

    test.controlResults.push({ correct, confidence })
  }

  /**
   * Record a treatment group result
   */
  recordTreatment(testName: string, correct: boolean, confidence: number): void {
    const test = this.tests.get(testName)
    if (!test) {
      console.warn(`A/B test ${testName} not found`)
      return
    }

    test.treatmentResults.push({ correct, confidence })
  }

  /**
   * Calculate A/B test results
   */
  calculateResults(testName: string): ABDTestResult | null {
    const test = this.tests.get(testName)
    if (!test) {
      console.warn(`A/B test ${testName} not found`)
      return null
    }

    const controlCorrect = test.controlResults.filter(r => r.correct).length
    const controlAccuracy = controlCorrect / test.controlResults.length

    const treatmentCorrect = test.treatmentResults.filter(r => r.correct).length
    const treatmentAccuracy = treatmentCorrect / test.treatmentResults.length

    // Calculate p-value using z-test for proportions
    const pValue = this.calculateZTestPValue(
      controlCorrect,
      test.controlResults.length,
      treatmentCorrect,
      test.treatmentResults.length
    )

    // Calculate lift
    const lift = ((treatmentAccuracy - controlAccuracy) / controlAccuracy) * 100

    // Check significance (p < 0.05)
    const isSignificant = pValue < 0.05

    return {
      testName,
      controlAccuracy,
      treatmentAccuracy,
      pValue,
      isSignificant,
      lift,
      sampleSize: test.controlResults.length + test.treatmentResults.length,
    }
  }

  /**
   * Get all A/B test results
   */
  getAllResults(): ABDTestResult[] {
    const results: ABDTestResult[] = []

    Array.from(this.tests.keys()).forEach(testName => {
      const result = this.calculateResults(testName)
      if (result) {
        results.push(result)
      }
    })

    return results
  }

  /**
   * Clear all tests
   */
  reset(): void {
    this.tests.clear()
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Calculate p-value for z-test of proportions
   */
  private calculateZTestPValue(
    controlCorrect: number,
    controlTotal: number,
    treatmentCorrect: number,
    treatmentTotal: number
  ): number {
    const p1 = controlCorrect / controlTotal
    const p2 = treatmentCorrect / treatmentTotal
    const pooledP = (controlCorrect + treatmentCorrect) / (controlTotal + treatmentTotal)

    const standardError = Math.sqrt(
      pooledP * (1 - pooledP) * (1 / controlTotal + 1 / treatmentTotal)
    )

    if (standardError === 0) return 1.0

    const zScore = (p2 - p1) / standardError

    // Approximate p-value from z-score (two-tailed)
    // This is a simplified approximation
    const absZ = Math.abs(zScore)
    const pValue = 2 * (1 - this.normalCDF(absZ))

    return pValue
  }

  /**
   * Normal cumulative distribution function (approximation)
   */
  private normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const sign = x < 0 ? -1 : 1
    x = Math.abs(x) / Math.sqrt(2)

    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return 0.5 * (1.0 + sign * y)
  }
}

// ============================================================================
// ACCURACY REPORTER
// ============================================================================

export class AccuracyReporter {
  private tracker: AccuracyTracker
  private abTest: ABTestFramework

  constructor(tracker: AccuracyTracker, abTest: ABTestFramework) {
    this.tracker = tracker
    this.abTest = abTest
  }

  /**
   * Generate comprehensive accuracy report
   */
  generateReport(): {
    summary: {
      overallAccuracy: number
      targetMet: boolean
      totalPredictions: number
      avgConfidence: number
      calibrationScore: number
    }
    byMetric: Record<string, number>
    byType: Record<string, number>
    confidenceCalibration: Array<{
      range: string
      expected: number
      actual: number
      count: number
    }>
    trend: Array<{
      bucket: number
      accuracy: number
    }>
    abTests: ABDTestResult[]
  } {
    const metrics = this.tracker.calculateMetrics()
    const stats = this.tracker.getStats()

    // Check if target accuracy is met (>80%)
    const targetMet = metrics.top1Accuracy >= 0.8

    // Convert maps to records
    const byMetric: Record<string, number> = {}
    Array.from(metrics.accuracyByMetric.entries()).forEach(([key, value]) => {
      byMetric[key] = value
    })

    const byType: Record<string, number> = {}
    Array.from(metrics.accuracyByType.entries()).forEach(([key, value]) => {
      byType[key] = value
    })

    // Format calibration data
    const confidenceCalibration = metrics.accuracyByConfidence.map(bucket => ({
      range: bucket.range,
      expected: bucket.expectedAccuracy,
      actual: bucket.accuracy,
      count: bucket.count,
    }))

    // Get trend (simplified)
    const trend = this.tracker.getAccuracyTrend().map(t => ({
      bucket: t.bucket,
      accuracy: t.accuracy,
    }))

    // Get A/B test results
    const abTests = this.abTest.getAllResults()

    return {
      summary: {
        overallAccuracy: metrics.top1Accuracy,
        targetMet,
        totalPredictions: stats.totalPredictions,
        avgConfidence: metrics.avgConfidence,
        calibrationScore: metrics.calibrationScore,
      },
      byMetric,
      byType,
      confidenceCalibration,
      trend,
      abTests,
    }
  }

  /**
   * Get human-readable summary
   */
  getSummary(): string {
    const report = this.generateReport()
    const { summary } = report

    let text = `Prediction Accuracy Report\n`
    text += `========================\n\n`
    text += `Overall Accuracy: ${(summary.overallAccuracy * 100).toFixed(1)}%\n`
    text += `Target Met: ${summary.targetMet ? '✅ Yes' : '❌ No'} (Target: 80%)\n`
    text += `Total Predictions: ${summary.totalPredictions}\n`
    text += `Average Confidence: ${(summary.avgConfidence * 100).toFixed(1)}%\n`
    text += `Calibration Score: ${(summary.calibrationScore * 100).toFixed(1)}%\n\n`

    // Accuracy by type
    text += `Accuracy by Type:\n`
    for (const [type, accuracy] of Object.entries(report.byType)) {
      text += `  ${type}: ${(accuracy * 100).toFixed(1)}%\n`
    }

    // Confidence calibration
    text += `\nConfidence Calibration:\n`
    for (const bucket of report.confidenceCalibration) {
      if (bucket.count > 0) {
        const diff = bucket.actual - bucket.expected
        text += `  ${bucket.range}: Expected ${(bucket.expected * 100).toFixed(0)}%, Actual ${(bucket.actual * 100).toFixed(0)}% (${bucket.count} predictions)`
        if (Math.abs(diff) > 0.1) {
          text += ` ⚠️ Miscalibrated`
        }
        text += `\n`
      }
    }

    return text
  }
}
