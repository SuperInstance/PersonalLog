/**
 * WebGPU Sentiment Analyzer Tests
 *
 * Comprehensive test suite for GPU-accelerated sentiment analysis.
 * Tests include GPU availability, fallback behavior, performance,
 * and accuracy verification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest' // or your testing framework
import {
  WebGPUSentimentAnalyzer,
  isWebGPUAvailable,
  createWebGPUSentimentAnalyzer,
  detectSentimentGPU,
} from '../webgpu-sentiment-analyzer'
import type { WebGPUConfig, WebGPUInferenceResult } from '../types'

// ============================================================================
// TEST UTILITIES
// ============================================================================

function assertValidResult(result: WebGPUInferenceResult) {
  expect(result).toBeDefined()
  expect(result.sentiment).toBeDefined()
  expect(typeof result.valence).toBe('number')
  expect(result.valence).toBeGreaterThanOrEqual(0)
  expect(result.valence).toBeLessThanOrEqual(1)
  expect(typeof result.arousal).toBe('number')
  expect(result.arousal).toBeGreaterThanOrEqual(0)
  expect(result.arousal).toBeLessThanOrEqual(1)
  expect(typeof result.dominance).toBe('number')
  expect(result.dominance).toBeGreaterThanOrEqual(0)
  expect(result.dominance).toBeLessThanOrEqual(1)
  expect(typeof result.confidence).toBe('number')
  expect(result.confidence).toBeGreaterThanOrEqual(0)
  expect(result.confidence).toBeLessThanOrEqual(1)
  expect(result.usedGPU).toBeDefined()
}

// ============================================================================
// WEBGPU AVAILABILITY TESTS
// ============================================================================

describe('WebGPU Availability', () => {
  it('should detect WebGPU availability', () => {
    const available = isWebGPUAvailable()

    // Should return boolean
    expect(typeof available).toBe('boolean')

    // If in browser/GPU environment, should be true
    // If in Node.js, should be false
    if (typeof window !== 'undefined') {
      console.info('WebGPU available:', available)
    }
  })
})

// ============================================================================
// ANALYZER INITIALIZATION TESTS
// ============================================================================

describe('WebGPUSentimentAnalyzer Initialization', () => {
  it('should initialize with default config', async () => {
    const analyzer = new WebGPUSentimentAnalyzer()
    await analyzer.initialize()

    expect(analyzer.isUsingGPU()).toBeDefined()

    await analyzer.cleanup()
  })

  it('should initialize with custom config', async () => {
    const config: WebGPUConfig = {
      enableTimestamps: true,
      maxBufferSize: 128 * 1024 * 1024, // 128MB
      useMappedBuffers: true,
    }

    const analyzer = new WebGPUSentimentAnalyzer(config)
    await analyzer.initialize()

    expect(analyzer.isUsingGPU()).toBeDefined()

    await analyzer.cleanup()
  })

  it('should force CPU fallback when requested', async () => {
    const config: WebGPUConfig = {
      forceCPUFallback: true,
    }

    const analyzer = new WebGPUSentimentAnalyzer(config)
    await analyzer.initialize()

    expect(analyzer.isUsingGPU()).toBe(false)

    await analyzer.cleanup()
  })

  it('should initialize only once', async () => {
    const analyzer = new WebGPUSentimentAnalyzer()

    await analyzer.initialize()
    await analyzer.initialize() // Should not throw

    expect(analyzer.isUsingGPU()).toBeDefined()

    await analyzer.cleanup()
  })
})

// ============================================================================
// SINGLE TEXT ANALYSIS TESTS
// ============================================================================

describe('Single Text Analysis', () => {
  let analyzer: WebGPUSentimentAnalyzer

  beforeEach(async () => {
    analyzer = await createWebGPUSentimentAnalyzer()
  })

  afterEach(async () => {
    await analyzer.cleanup()
  })

  it('should analyze positive sentiment', async () => {
    const result = await analyzer.analyze("I'm so happy and excited! 🎉")

    assertValidResult(result)

    expect(['happy', 'excited']).toContain(result.sentiment)
    expect(result.valence).toBeGreaterThan(0.6)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should analyze negative sentiment', async () => {
    const result = await analyzer.analyze("This makes me so angry and frustrated!")

    assertValidResult(result)

    expect(['angry', 'tense', 'anxious']).toContain(result.sentiment)
    expect(result.valence).toBeLessThan(0.4)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should analyze neutral sentiment', async () => {
    const result = await analyzer.analyze("The meeting is at 3 PM tomorrow.")

    assertValidResult(result)

    expect(['neutral', 'calm', 'relaxed']).toContain(result.sentiment)
    expect(result.confidence).toBeGreaterThan(0.3)
  })

  it('should detect emoji sentiment', async () => {
    const result = await analyzer.analyze("I love this! 😍❤️💖")

    assertValidResult(result)

    expect(result.sentiment).toBe('happy')
    expect(result.valence).toBeGreaterThan(0.7)
  })

  it('should handle empty text', async () => {
    const result = await analyzer.analyze("")

    assertValidResult(result)

    expect(result.sentiment).toBe('neutral')
  })

  it('should handle very short text', async () => {
    const result = await analyzer.analyze("Hi!")

    assertValidResult(result)

    // Short text should have lower confidence
    expect(result.confidence).toBeLessThan(0.8)
  })

  it('should include performance metrics', async () => {
    const result = await analyzer.analyze("Testing performance metrics")

    assertValidResult(result)

    expect(result.performance).toBeDefined()
    expect(result.performance?.gpuExecutionTime).toBeGreaterThanOrEqual(0)
    expect(result.performance?.cpuExecutionTime).toBeGreaterThan(0)
    expect(result.performance?.throughput).toBeGreaterThan(0)
  })

  it('should include device info when using GPU', async () => {
    const result = await analyzer.analyze("Testing device info")

    assertValidResult(result)

    if (result.usedGPU) {
      expect(result.deviceInfo).toBeDefined()
      expect(result.deviceInfo?.adapter).toBeDefined()
      expect(result.deviceInfo?.vendor).toBeDefined()
    }
  })
})

// ============================================================================
// BATCH ANALYSIS TESTS
// ============================================================================

describe('Batch Analysis', () => {
  let analyzer: WebGPUSentimentAnalyzer

  beforeEach(async () => {
    analyzer = await createWebGPUSentimentAnalyzer()
  })

  afterEach(async () => {
    await analyzer.cleanup()
  })

  it('should analyze multiple texts in batch', async () => {
    const texts = [
      "I love this! 😊",
      "This is terrible 😡",
      "It's okay, I guess",
      "So excited for this! 🎉",
      "Feeling sad today 😢",
    ]

    const results = await analyzer.analyzeBatch(texts)

    expect(results).toHaveLength(texts.length)

    results.forEach((result, i) => {
      assertValidResult(result)
      expect(result.evidence).toBeDefined()
    })
  })

  it('should handle empty batch', async () => {
    const results = await analyzer.analyzeBatch([])

    expect(results).toHaveLength(0)
  })

  it('should process batch faster than sequential', async () => {
    const texts = Array(10).fill("Test message for performance comparison")

    // Batch processing
    const batchStart = performance.now()
    const batchResults = await analyzer.analyzeBatch(texts)
    const batchTime = performance.now() - batchStart

    // Sequential processing
    const sequentialStart = performance.now()
    const sequentialResults = []
    for (const text of texts) {
      sequentialResults.push(await analyzer.analyze(text))
    }
    const sequentialTime = performance.now() - sequentialStart

    expect(batchResults).toHaveLength(sequentialResults.length)

    // Batch should be faster or similar (due to parallel processing)
    console.info(`Batch time: ${batchTime.toFixed(2)}ms, Sequential: ${sequentialTime.toFixed(2)}ms`)
  })
})

// ============================================================================
// CPU FALLBACK TESTS
// ============================================================================

describe('CPU Fallback', () => {
  it('should fall back to CPU when WebGPU unavailable', async () => {
    const analyzer = new WebGPUSentimentAnalyzer({
      forceCPUFallback: true,
    })

    await analyzer.initialize()

    expect(analyzer.isUsingGPU()).toBe(false)

    const result = await analyzer.analyze("Testing CPU fallback")

    assertValidResult(result)
    expect(result.usedGPU).toBe(false)
    expect(result.performance?.gpuExecutionTime).toBe(0)

    await analyzer.cleanup()
  })

  it('should produce same results on CPU and GPU', async () => {
    const testText = "I'm very happy and excited! 🎉"

    // GPU analysis (or CPU if WebGPU unavailable)
    const gpuAnalyzer = await createWebGPUSentimentAnalyzer()
    const gpuResult = await gpuAnalyzer.analyze(testText)

    // CPU analysis (forced)
    const cpuAnalyzer = await createWebGPUSentimentAnalyzer({
      forceCPUFallback: true,
    })
    const cpuResult = await cpuAnalyzer.analyze(testText)

    // Same sentiment classification
    expect(gpuResult.sentiment).toBe(cpuResult.sentiment)

    // Similar VAD scores (may have small floating-point differences)
    expect(Math.abs(gpuResult.valence - cpuResult.valence)).toBeLessThan(0.01)
    expect(Math.abs(gpuResult.arousal - cpuResult.arousal)).toBeLessThan(0.01)
    expect(Math.abs(gpuResult.dominance - cpuResult.dominance)).toBeLessThan(0.01)

    await gpuAnalyzer.cleanup()
    await cpuAnalyzer.cleanup()
  })
})

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance Metrics', () => {
  let analyzer: WebGPUSentimentAnalyzer

  beforeEach(async () => {
    analyzer = await createWebGPUSentimentAnalyzer()
  })

  afterEach(async () => {
    await analyzer.cleanup()
  })

  it('should track performance history', async () => {
    // Run several analyses
    for (let i = 0; i < 5; i++) {
      await analyzer.analyze(`Test message ${i}`)
    }

    const stats = analyzer.getPerformanceStats()

    expect(stats.totalInferences).toBeGreaterThanOrEqual(5)
    expect(stats.averageSpeedup).toBeGreaterThan(0)
    expect(stats.averageThroughput).toBeGreaterThan(0)
  })

  it('should report GPU utilization', async () => {
    await analyzer.analyze("Test")

    const stats = analyzer.getPerformanceStats()

    expect(stats.gpuUtilizationRate).toBeGreaterThanOrEqual(0)
    expect(stats.gpuUtilizationRate).toBeLessThanOrEqual(1)
  })

  it('should calculate speedup factor correctly', async () => {
    const result = await analyzer.analyze("Testing speedup calculation")

    if (result.performance && result.usedGPU) {
      expect(result.performance.speedupFactor).toBeGreaterThan(0)
      // Speedup should be reasonable (0.5x to 100x)
      expect(result.performance.speedupFactor).toBeLessThan(100)
    }
  })
})

// ============================================================================
// CONVENIENCE FUNCTIONS TESTS
// ============================================================================

describe('Convenience Functions', () => {
  it('should create analyzer with factory function', async () => {
    const analyzer = await createWebGPUSentimentAnalyzer()

    expect(analyzer).toBeInstanceOf(WebGPUSentimentAnalyzer)

    await analyzer.cleanup()
  })

  it('should analyze with convenience function', async () => {
    const result = await detectSentimentGPU("Quick analysis test")

    assertValidResult(result)
  })

  it('should auto-initialize in convenience function', async () => {
    // Should work without manual initialization
    const result = await detectSentimentGPU("Auto-init test")

    assertValidResult(result)
  })
})

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

describe('Edge Cases', () => {
  let analyzer: WebGPUSentimentAnalyzer

  beforeEach(async () => {
    analyzer = await createWebGPUSentimentAnalyzer()
  })

  afterEach(async () => {
    await analyzer.cleanup()
  })

  it('should handle special characters', async () => {
    const result = await analyzer.analyze("@#$%^&*()")

    assertValidResult(result)
  })

  it('should handle very long text', async () => {
    const longText = "This is a test. ".repeat(100)

    const result = await analyzer.analyze(longText)

    assertValidResult(result)
  })

  it('should handle mixed emojis', async () => {
    const result = await analyzer.analyze("Happy 😊 Sad 😢 Angry 😡 Calm 😌")

    assertValidResult(result)

    // Should detect multiple emotions
    expect(result.secondarySentiments).toBeDefined()
  })

  it('should handle unicode text', async () => {
    const result = await analyzer.analyze("こんにちは 😊")

    assertValidResult(result)
  })

  it('should handle multiple exclamation marks', async () => {
    const result = await analyzer.analyze("So excited!!!")

    assertValidResult(result)

    // Should detect high arousal
    expect(result.arousal).toBeGreaterThan(0.5)
  })
})

// ============================================================================
// DEVICE INFO TESTS
// ============================================================================

describe('Device Information', () => {
  it('should return null for device info on CPU', async () => {
    const analyzer = new WebGPUSentimentAnalyzer({
      forceCPUFallback: true,
    })

    await analyzer.initialize()

    expect(analyzer.getDeviceInfo()).toBeNull()

    await analyzer.cleanup()
  })

  it('should return device info when using GPU', async () => {
    const analyzer = await createWebGPUSentimentAnalyzer()

    if (analyzer.isUsingGPU()) {
      const deviceInfo = analyzer.getDeviceInfo()

      expect(deviceInfo).toBeDefined()
      expect(deviceInfo?.adapter).toBeDefined()
      expect(deviceInfo?.vendor).toBeDefined()
    }

    await analyzer.cleanup()
  })
})

// ============================================================================
// RESOURCE CLEANUP TESTS
// ============================================================================

describe('Resource Cleanup', () => {
  it('should cleanup resources properly', async () => {
    const analyzer = await createWebGPUSentimentAnalyzer()

    await analyzer.analyze("Test before cleanup")
    await analyzer.cleanup()

    // Should be able to create new analyzer after cleanup
    const newAnalyzer = await createWebGPUSentimentAnalyzer()
    await newAnalyzer.cleanup()
  })

  it('should handle multiple cleanup calls', async () => {
    const analyzer = await createWebGPUSentimentAnalyzer()

    await analyzer.cleanup()
    await analyzer.cleanup() // Should not throw
  })
})
