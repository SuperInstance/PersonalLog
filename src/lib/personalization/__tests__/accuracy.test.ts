/**
 * Unit Tests: Accuracy Tracking
 *
 * Tests the prediction accuracy tracking system including:
 * - Prediction recording
 * - Feedback collection
 * - Accuracy metrics calculation
 * - Calibration analysis
 * - A/B testing framework
 *
 * @coverage Target: 80%+ (Comprehensive testing)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  AccuracyTracker,
  ABTestFramework,
  AccuracyReporter,
} from '../accuracy'
import type { PreferenceKey, PreferenceValue } from '../types'

describe('AccuracyTracker', () => {
  let tracker: AccuracyTracker

  beforeEach(() => {
    tracker = new AccuracyTracker()
  })

  // ==========================================================================
  // PREDICTION RECORDING TESTS
  // ==========================================================================

  describe('Prediction Recording', () => {
    it('should record a prediction', () => {
      const predictionId = tracker.recordPrediction('ui.theme', 'dark', 0.8)

      expect(predictionId).toBeDefined()
      expect(predictionId).toMatch(/^pred_\d+_[a-z0-9]+$/)
    })

    it('should store prediction with correct data', () => {
      const predictionId = tracker.recordPrediction('ui.theme', 'dark', 0.85, 'naive-bayes')
      const predictions = tracker.getRecentPredictions(1)

      expect(predictions).toHaveLength(1)
      expect(predictions[0].preferenceKey).toBe('ui.theme')
      expect(predictions[0].predictedValue).toBe('dark')
      expect(predictions[0].confidence).toBe(0.85)
      expect(predictions[0].model).toBe('naive-bayes')
      expect(predictions[0].actualValue).toBeUndefined()
      expect(predictions[0].isCorrect).toBeUndefined()
    })

    it('should record multiple predictions', () => {
      tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordPrediction('ui.fontSize', 1.0, 0.9)
      tracker.recordPrediction('communication.tone', 'casual', 0.7)

      const stats = tracker.getStats()

      expect(stats.totalPredictions).toBe(3)
      expect(stats.predictionsWithFeedback).toBe(0)
      expect(stats.pendingPredictions).toBe(3)
    })

    it('should limit history size', () => {
      const smallTracker = new AccuracyTracker()

      // Record more predictions than maxHistorySize
      for (let i = 0; i < 15000; i++) {
        smallTracker.recordPrediction('ui.theme', 'dark', 0.8)
      }

      const stats = smallTracker.getStats()

      // History should be trimmed to maxHistorySize (10000)
      expect(stats.totalPredictions).toBeLessThanOrEqual(10000)
    })
  })

  // ==========================================================================
  // FEEDBACK RECORDING TESTS
  // ==========================================================================

  describe('Feedback Recording', () => {
    it('should record feedback for prediction', () => {
      const predictionId = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(predictionId, 'dark')

      const stats = tracker.getStats()

      expect(stats.predictionsWithFeedback).toBe(1)
      expect(stats.pendingPredictions).toBe(0)
    })

    it('should mark correct prediction', () => {
      const predictionId = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(predictionId, 'dark')

      const predictions = tracker.getRecentPredictions(1)

      expect(predictions[0].isCorrect).toBe(true)
      expect(predictions[0].actualValue).toBe('dark')
    })

    it('should mark incorrect prediction', () => {
      const predictionId = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(predictionId, 'light')

      const predictions = tracker.getRecentPredictions(1)

      expect(predictions[0].isCorrect).toBe(false)
      expect(predictions[0].actualValue).toBe('light')
    })

    it('should calculate feedback delay', () => {
      const predictionId = tracker.recordPrediction('ui.theme', 'dark', 0.8)

      // Wait a bit
      const start = Date.now()
      while (Date.now() - start < 100) {
        // busy wait for 100ms
      }

      tracker.recordFeedback(predictionId, 'dark')

      const stats = tracker.getStats()

      expect(stats.avgFeedbackDelay).toBeGreaterThanOrEqual(100)
      expect(stats.avgFeedbackDelay).toBeLessThan(200)
    })

    it('should handle feedback for non-existent prediction', () => {
      // Should not throw, just warn
      expect(() => {
        tracker.recordFeedback('non_existent_id', 'dark')
      }).not.toThrow()
    })
  })

  // ==========================================================================
  // ACCURACY METRICS TESTS
  // ==========================================================================

  describe('Accuracy Metrics', () => {
    it('should return empty metrics when no predictions', () => {
      const metrics = tracker.calculateMetrics()

      expect(metrics.totalPredictions).toBe(0)
      expect(metrics.correctPredictions).toBe(0)
      expect(metrics.top1Accuracy).toBe(0)
      expect(metrics.topKAccuracy).toBe(0)
    })

    it('should calculate accuracy correctly', () => {
      // Record 10 predictions, 7 correct
      for (let i = 0; i < 7; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }

      for (let i = 0; i < 3; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'light')
      }

      const metrics = tracker.calculateMetrics()

      expect(metrics.totalPredictions).toBe(10)
      expect(metrics.correctPredictions).toBe(7)
      expect(metrics.top1Accuracy).toBe(0.7)
    })

    it('should calculate average confidence', () => {
      const confidences = [0.5, 0.7, 0.9, 0.6, 0.8]

      confidences.forEach(conf => {
        const id = tracker.recordPrediction('ui.theme', 'dark', conf)
        tracker.recordFeedback(id, 'dark')
      })

      const metrics = tracker.calculateMetrics()

      const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length
      expect(metrics.avgConfidence).toBeCloseTo(avgConf, 5)
    })

    it('should calculate accuracy by metric', () => {
      // Theme predictions (100% accuracy)
      for (let i = 0; i < 5; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }

      // Font size predictions (50% accuracy)
      for (let i = 0; i < 2; i++) {
        const id = tracker.recordPrediction('ui.fontSize', 1.0, 0.7)
        tracker.recordFeedback(id, 1.0)
      }
      for (let i = 0; i < 2; i++) {
        const id = tracker.recordPrediction('ui.fontSize', 1.0, 0.7)
        tracker.recordFeedback(id, 1.15)
      }

      const metrics = tracker.calculateMetrics()

      expect(metrics.accuracyByMetric.get('ui.theme')).toBe(1.0)
      expect(metrics.accuracyByMetric.get('ui.fontSize')).toBe(0.5)
    })

    it('should calculate accuracy by type', () => {
      // UI predictions (100% accuracy)
      for (let i = 0; i < 3; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }

      // Communication predictions (33% accuracy)
      for (let i = 0; i < 1; i++) {
        const id = tracker.recordPrediction('communication.tone', 'casual', 0.7)
        tracker.recordFeedback(id, 'casual')
      }
      for (let i = 0; i < 2; i++) {
        const id = tracker.recordPrediction('communication.tone', 'casual', 0.7)
        tracker.recordFeedback(id, 'formal')
      }

      const metrics = tracker.calculateMetrics()

      expect(metrics.accuracyByType.get('ui')).toBe(1.0)
      expect(metrics.accuracyByType.get('communication')).toBeCloseTo(0.333, 2)
    })

    it('should calculate top-k accuracy', () => {
      // For now, top-k = top-1 since we don't track multiple predictions
      for (let i = 0; i < 5; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }

      const metrics = tracker.calculateMetrics()

      expect(metrics.topKAccuracy).toBe(metrics.top1Accuracy)
    })
  })

  // ==========================================================================
  // CALIBRATION TESTS
  // ==========================================================================

  describe('Confidence Calibration', () => {
    it('should create confidence buckets', () => {
      // Add predictions across different confidence ranges
      tracker.recordPrediction('ui.theme', 'dark', 0.1)
      tracker.recordPrediction('ui.theme', 'dark', 0.3)
      tracker.recordPrediction('ui.theme', 'dark', 0.5)
      tracker.recordPrediction('ui.theme', 'dark', 0.7)
      tracker.recordPrediction('ui.theme', 'dark', 0.9)

      for (let i = 0; i < 5; i++) {
        const predictions = tracker.getRecentPredictions(5)
        const id = predictions[i].id
        tracker.recordFeedback(id, 'dark')
      }

      const metrics = tracker.calculateMetrics()

      expect(metrics.accuracyByConfidence).toHaveLength(5)
    })

    it('should calculate calibration score', () => {
      // Perfectly calibrated predictions
      for (let i = 0; i < 10; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }

      const metrics = tracker.calculateMetrics()

      // With perfect predictions, calibration should be high
      expect(metrics.calibrationScore).toBeGreaterThan(0.5)
    })

    it('should calculate brier score', () => {
      // Record some predictions with feedback
      for (let i = 0; i < 5; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }

      const metrics = tracker.calculateMetrics()

      // Brier score should be between 0 and 1
      expect(metrics.brierScore).toBeGreaterThanOrEqual(0)
      expect(metrics.brierScore).toBeLessThanOrEqual(1)
    })
  })

  // ==========================================================================
  // CORRECT/INCORRECT PREDICTIONS TESTS
  // ==========================================================================

  describe('Prediction Retrieval', () => {
    it('should get correct predictions', () => {
      const correctId = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(correctId, 'dark')

      const incorrectId = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(incorrectId, 'light')

      const correctPredictions = tracker.getCorrectPredictions()
      const incorrectPredictions = tracker.getIncorrectPredictions()

      expect(correctPredictions).toHaveLength(1)
      expect(incorrectPredictions).toHaveLength(1)
      expect(correctPredictions[0].id).toBe(correctId)
      expect(incorrectPredictions[0].id).toBe(incorrectId)
    })

    it('should get recent predictions', () => {
      for (let i = 0; i < 20; i++) {
        tracker.recordPrediction('ui.theme', 'dark', 0.8)
      }

      const recent = tracker.getRecentPredictions(10)

      expect(recent).toHaveLength(10)
    })

    it('should limit recent predictions', () => {
      for (let i = 0; i < 20; i++) {
        tracker.recordPrediction('ui.theme', 'dark', 0.8)
      }

      const recent = tracker.getRecentPredictions(15)

      expect(recent.length).toBeLessThanOrEqual(15)
    })
  })

  // ==========================================================================
  // ACCURACY TREND TESTS
  // ==========================================================================

  describe('Accuracy Trend', () => {
    it('should calculate accuracy trend over time', () => {
      // First bucket: 50% accuracy
      for (let i = 0; i < 50; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, i % 2 === 0 ? 'dark' : 'light')
      }

      // Second bucket: 80% accuracy
      for (let i = 0; i < 50; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, i < 40 ? 'dark' : 'light')
      }

      const trend = tracker.getAccuracyTrend(50)

      expect(trend).toHaveLength(2)
      expect(trend[0].accuracy).toBeCloseTo(0.5, 1)
      expect(trend[1].accuracy).toBeCloseTo(0.8, 1)
    })

    it('should handle empty predictions', () => {
      const trend = tracker.getAccuracyTrend()

      expect(trend).toHaveLength(0)
    })
  })

  // ==========================================================================
  // STATS TESTS
  // ==========================================================================

  describe('Statistics', () => {
    it('should return stats', () => {
      tracker.recordPrediction('ui.theme', 'dark', 0.8)

      const stats = tracker.getStats()

      expect(stats.totalPredictions).toBe(1)
      expect(stats.predictionsWithFeedback).toBe(0)
      expect(stats.pendingPredictions).toBe(1)
      expect(stats.avgFeedbackDelay).toBeNull()
    })

    it('should calculate average feedback delay', () => {
      const id1 = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(id1, 'dark')

      const start = Date.now()
      while (Date.now() - start < 50) {
        // busy wait
      }

      const id2 = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(id2, 'dark')

      const stats = tracker.getStats()

      expect(stats.avgFeedbackDelay).toBeGreaterThanOrEqual(0)
      expect(stats.avgFeedbackDelay).toBeLessThan(100)
    })
  })

  // ==========================================================================
  // RESET TESTS
  // ==========================================================================

  describe('Reset', () => {
    it('should reset all tracking', () => {
      tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordPrediction('ui.fontSize', 1.0, 0.9)

      tracker.reset()

      const stats = tracker.getStats()

      expect(stats.totalPredictions).toBe(0)
      expect(tracker.getRecentPredictions()).toHaveLength(0)
    })
  })
})

describe('ABTestFramework', () => {
  let abTest: ABTestFramework

  beforeEach(() => {
    abTest = new ABTestFramework()
  })

  // ==========================================================================
  // TEST MANAGEMENT TESTS
  // ==========================================================================

  describe('Test Management', () => {
    it('should start a new test', () => {
      abTest.startTest('test1')

      const results = abTest.getAllResults()

      expect(results).toHaveLength(1)
    })

    it('should not allow duplicate test names', () => {
      abTest.startTest('test1')
      abTest.startTest('test1') // Should not create duplicate

      const results = abTest.getAllResults()

      expect(results).toHaveLength(1)
    })

    it('should record control results', () => {
      abTest.startTest('test1')
      abTest.recordControl('test1', true, 0.8)
      abTest.recordControl('test1', false, 0.6)

      const results = abTest.calculateResults('test1')

      expect(results).toBeDefined()
      expect(results?.sampleSize).toBe(2) // Only control recorded so far
    })

    it('should record treatment results', () => {
      abTest.startTest('test1')
      abTest.recordTreatment('test1', true, 0.9)
      abTest.recordTreatment('test1', true, 0.85)

      const results = abTest.calculateResults('test1')

      expect(results).toBeDefined()
      expect(results?.treatmentAccuracy).toBe(1.0)
    })

    it('should calculate test results', () => {
      abTest.startTest('test1')

      // Control: 70% accuracy
      for (let i = 0; i < 7; i++) {
        abTest.recordControl('test1', true, 0.7)
      }
      for (let i = 0; i < 3; i++) {
        abTest.recordControl('test1', false, 0.7)
      }

      // Treatment: 90% accuracy
      for (let i = 0; i < 9; i++) {
        abTest.recordTreatment('test1', true, 0.9)
      }
      for (let i = 0; i < 1; i++) {
        abTest.recordTreatment('test1', false, 0.9)
      }

      const results = abTest.calculateResults('test1')

      expect(results).toBeDefined()
      expect(results?.controlAccuracy).toBeCloseTo(0.7, 1)
      expect(results?.treatmentAccuracy).toBeCloseTo(0.9, 1)
      expect(results?.lift).toBeCloseTo(28.6, 1) // (0.9 - 0.7) / 0.7 * 100
    })
  })

  // ==========================================================================
  // STATISTICAL TESTS
  // ==========================================================================

  describe('Statistical Calculations', () => {
    it('should calculate p-value', () => {
      abTest.startTest('test1')

      // Control: 50% accuracy
      for (let i = 0; i < 50; i++) {
        abTest.recordControl('test1', i % 2 === 0, 0.5)
      }

      // Treatment: 60% accuracy
      for (let i = 0; i < 50; i++) {
        abTest.recordTreatment('test1', i < 30, 0.6)
      }

      const results = abTest.calculateResults('test1')

      expect(results?.pValue).toBeGreaterThanOrEqual(0)
      expect(results?.pValue).toBeLessThanOrEqual(1)
    })

    it('should determine significance', () => {
      abTest.startTest('test1')

      // Control: 50% accuracy
      for (let i = 0; i < 100; i++) {
        abTest.recordControl('test1', i % 2 === 0, 0.5)
      }

      // Treatment: 70% accuracy (significant difference)
      for (let i = 0; i < 100; i++) {
        abTest.recordTreatment('test1', i < 70, 0.7)
      }

      const results = abTest.calculateResults('test1')

      // With this sample size and difference, should be significant
      expect(results?.isSignificant).toBe(true)
      expect(results?.pValue).toBeLessThan(0.05)
    })

    it('should calculate lift correctly', () => {
      abTest.startTest('test1')

      // Control: 50%
      for (let i = 0; i < 10; i++) {
        abTest.recordControl('test1', i < 5, 0.5)
      }

      // Treatment: 75%
      for (let i = 0; i < 8; i++) {
        abTest.recordTreatment('test1', true, 0.75)
      }
      for (let i = 0; i < 2; i++) {
        abTest.recordTreatment('test1', false, 0.75)
      }

      const results = abTest.calculateResults('test1')

      // Lift = (0.8 - 0.5) / 0.5 * 100 = 60%
      expect(results?.lift).toBeCloseTo(60, 0)
    })
  })

  // ==========================================================================
  // MULTI-TEST TESTS
  // ==========================================================================

  describe('Multiple Tests', () => {
    it('should track multiple tests', () => {
      abTest.startTest('test1')
      abTest.startTest('test2')
      abTest.startTest('test3')

      const results = abTest.getAllResults()

      expect(results).toHaveLength(3)
    })

    it('should calculate results for all tests', () => {
      abTest.startTest('test1')
      abTest.recordControl('test1', true, 0.8)
      abTest.recordTreatment('test1', true, 0.9)

      abTest.startTest('test2')
      abTest.recordControl('test2', false, 0.5)
      abTest.recordTreatment('test2', true, 0.7)

      const results = abTest.getAllResults()

      expect(results).toHaveLength(2)
      expect(results[0].testName).toBe('test1')
      expect(results[1].testName).toBe('test2')
    })
  })

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle recording to non-existent test', () => {
      // Should not throw
      expect(() => {
        abTest.recordControl('nonexistent', true, 0.8)
      }).not.toThrow()
    })

    it('should return null for non-existent test results', () => {
      const results = abTest.calculateResults('nonexistent')

      expect(results).toBeNull()
    })
  })

  // ==========================================================================
  // RESET TESTS
  // ==========================================================================

  describe('Reset', () => {
    it('should reset all tests', () => {
      abTest.startTest('test1')
      abTest.recordControl('test1', true, 0.8)

      abTest.reset()

      const results = abTest.getAllResults()

      expect(results).toHaveLength(0)
    })
  })
})

describe('AccuracyReporter', () => {
  let tracker: AccuracyTracker
  let abTest: ABTestFramework
  let reporter: AccuracyReporter

  beforeEach(() => {
    tracker = new AccuracyTracker()
    abTest = new ABTestFramework()
    reporter = new AccuracyReporter(tracker, abTest)
  })

  // ==========================================================================
  // REPORT GENERATION TESTS
  // ==========================================================================

  describe('Report Generation', () => {
    it('should generate report with no data', () => {
      const report = reporter.generateReport()

      expect(report.summary.overallAccuracy).toBe(0)
      expect(report.summary.targetMet).toBe(false)
      expect(report.summary.totalPredictions).toBe(0)
    })

    it('should generate report with data', () => {
      // Add some predictions
      for (let i = 0; i < 8; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }
      for (let i = 0; i < 2; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'light')
      }

      const report = reporter.generateReport()

      expect(report.summary.overallAccuracy).toBe(0.8)
      expect(report.summary.targetMet).toBe(true)
      expect(report.summary.totalPredictions).toBe(10)
    })

    it('should include accuracy by metric', () => {
      const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(id, 'dark')

      const report = reporter.generateReport()

      expect(report.byMetric['ui.theme']).toBeDefined()
      expect(report.byMetric['ui.theme']).toBe(1.0)
    })

    it('should include accuracy by type', () => {
      const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(id, 'dark')

      const report = reporter.generateReport()

      expect(report.byType['ui']).toBeDefined()
      expect(report.byType['ui']).toBe(1.0)
    })

    it('should include confidence calibration', () => {
      const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(id, 'dark')

      const report = reporter.generateReport()

      expect(report.confidenceCalibration).toBeInstanceOf(Array)
      expect(report.confidenceCalibration.length).toBeGreaterThan(0)
    })

    it('should include trend data', () => {
      for (let i = 0; i < 50; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, i % 2 === 0 ? 'dark' : 'light')
      }

      const report = reporter.generateReport()

      expect(report.trend).toBeInstanceOf(Array)
      expect(report.trend.length).toBeGreaterThan(0)
    })

    it('should include A/B test results', () => {
      abTest.startTest('test1')
      abTest.recordControl('test1', true, 0.8)
      abTest.recordTreatment('test1', true, 0.9)

      const report = reporter.generateReport()

      expect(report.abTests).toHaveLength(1)
      expect(report.abTests[0].testName).toBe('test1')
    })
  })

  // ==========================================================================
  // SUMMARY TESTS
  // ==========================================================================

  describe('Summary Generation', () => {
    it('should generate text summary', () => {
      const summary = reporter.getSummary()

      expect(typeof summary).toBe('string')
      expect(summary).toContain('Prediction Accuracy Report')
      expect(summary).toContain('Overall Accuracy')
    })

    it('should include target status in summary', () => {
      for (let i = 0; i < 9; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }

      const summary = reporter.getSummary()

      expect(summary).toContain('✅ Yes')
    })

    it('should show below target when accuracy < 80%', () => {
      for (let i = 0; i < 5; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }
      for (let i = 0; i < 5; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'light')
      }

      const summary = reporter.getSummary()

      expect(summary).toContain('❌ No')
    })

    it('should include accuracy by type in summary', () => {
      const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(id, 'dark')

      const summary = reporter.getSummary()

      expect(summary).toContain('Accuracy by Type')
    })

    it('should include confidence calibration in summary', () => {
      const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      tracker.recordFeedback(id, 'dark')

      const summary = reporter.getSummary()

      expect(summary).toContain('Confidence Calibration')
    })

    it('should show miscalibrated buckets', () => {
      // Create predictions with poor calibration
      const id = tracker.recordPrediction('ui.theme', 'dark', 0.9)
      tracker.recordFeedback(id, 'light')

      const summary = reporter.getSummary()

      // Should indicate miscalibration
      expect(summary).toContain('Miscalibrated')
    })
  })

  // ==========================================================================
  // TARGET ACCURACY TESTS
  // ==========================================================================

  describe('Target Accuracy', () => {
    it('should meet target at 80%', () => {
      for (let i = 0; i < 80; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }
      for (let i = 0; i < 20; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'light')
      }

      const report = reporter.generateReport()

      expect(report.summary.targetMet).toBe(true)
    })

    it('should not meet target below 80%', () => {
      for (let i = 0; i < 70; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }
      for (let i = 0; i < 30; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'light')
      }

      const report = reporter.generateReport()

      expect(report.summary.targetMet).toBe(false)
    })

    it('should exactly meet target at 80%', () => {
      for (let i = 0; i < 8; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'dark')
      }
      for (let i = 0; i < 2; i++) {
        const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
        tracker.recordFeedback(id, 'light')
      }

      const report = reporter.generateReport()

      expect(report.summary.targetMet).toBe(true)
      expect(report.summary.overallAccuracy).toBe(0.8)
    })
  })
})

describe('Integration Tests', () => {
  it('should track predictions and calculate accuracy end-to-end', () => {
    const tracker = new AccuracyTracker()

    // Simulate a realistic prediction workflow
    const predictions = [
      { key: 'ui.theme', predicted: 'dark', actual: 'dark', confidence: 0.9 },
      { key: 'ui.theme', predicted: 'dark', actual: 'dark', confidence: 0.85 },
      { key: 'ui.theme', predicted: 'dark', actual: 'light', confidence: 0.7 },
      { key: 'ui.fontSize', predicted: 1.0, actual: 1.0, confidence: 0.8 },
      { key: 'ui.fontSize', predicted: 1.0, actual: 1.15, confidence: 0.6 },
    ]

    const predictionIds = predictions.map(p =>
      tracker.recordPrediction(p.key as PreferenceKey, p.predicted, p.confidence)
    )

    predictionIds.forEach((id, i) => {
      tracker.recordFeedback(id, predictions[i].actual as PreferenceValue)
    })

    const metrics = tracker.calculateMetrics()

    // Overall accuracy: 3/5 = 60%
    expect(metrics.top1Accuracy).toBe(0.6)

    // Theme accuracy: 2/3 = 66.7%
    expect(metrics.accuracyByMetric.get('ui.theme')).toBeCloseTo(0.667, 2)

    // Font size accuracy: 1/2 = 50%
    expect(metrics.accuracyByMetric.get('ui.fontSize')).toBe(0.5)

    // UI type accuracy: 3/5 = 60%
    expect(metrics.accuracyByType.get('ui')).toBe(0.6)
  })

  it('should integrate with A/B testing', () => {
    const tracker = new AccuracyTracker()
    const abTest = new ABTestFramework()
    const reporter = new AccuracyReporter(tracker, abTest)

    // Start A/B test
    abTest.startTest('personalization_effectiveness')

    // Control group (no personalization)
    for (let i = 0; i < 10; i++) {
      abTest.recordControl('personalization_effectiveness', i < 5, 0.5)
    }

    // Treatment group (with personalization)
    for (let i = 0; i < 10; i++) {
      abTest.recordTreatment('personalization_effectiveness', i < 8, 0.8)
    }

    const report = reporter.generateReport()

    expect(report.abTests).toHaveLength(1)
    expect(report.abTests[0].controlAccuracy).toBe(0.5)
    expect(report.abTests[0].treatmentAccuracy).toBe(0.8)
    expect(report.abTests[0].lift).toBeCloseTo(60, 5) // (0.8 - 0.5) / 0.5 * 100
  })

  it('should handle full workflow: record, feedback, report', () => {
    const tracker = new AccuracyTracker()
    const abTest = new ABTestFramework()
    const reporter = new AccuracyReporter(tracker, abTest)

    // Record predictions
    const predictionIds = []
    for (let i = 0; i < 100; i++) {
      const id = tracker.recordPrediction('ui.theme', 'dark', 0.8)
      predictionIds.push(id)
    }

    // Provide feedback
    predictionIds.forEach((id, i) => {
      tracker.recordFeedback(id, i < 85 ? 'dark' : 'light')
    })

    // Generate report
    const report = reporter.generateReport()
    const summary = reporter.getSummary()

    // Verify report
    expect(report.summary.overallAccuracy).toBe(0.85)
    expect(report.summary.targetMet).toBe(true)

    // Verify summary
    expect(summary).toContain('85.0%')
    expect(summary).toContain('✅ Yes')
  })
})
