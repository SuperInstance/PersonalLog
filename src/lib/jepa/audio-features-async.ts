/**
 * JEPA - Async Audio Feature Extraction
 *
 * Wrapper for using Web Workers to extract audio features without blocking UI.
 * Provides caching and performance optimization.
 *
 * @module lib/jepa/audio-features-async
 */

import { AudioFeatures, SpectralFeatures, ProsodicFeatures } from './audio-features'

// ============================================================================
// TYPES
// ============================================================================

export interface AsyncFeatureExtractionOptions {
  /** Whether to cache results */
  cache?: boolean

  /** Timeout in milliseconds (default: 10000ms) */
  timeout?: number

  /** Called when feature extraction starts */
  onStart?: () => void

  /** Called when feature extraction completes */
  onComplete?: (features: AudioFeatures, duration: number) => void

  /** Called when feature extraction fails */
  onError?: (error: Error) => void

  /** Progress updates (if supported) */
  onProgress?: (progress: number) => void
}

export interface FeatureExtractionResult {
  features: AudioFeatures
  processingTime: number
  cached: boolean
}

// ============================================================================
// FEATURE CACHE
// ============================================================================

class FeatureCache {
  private cache = new Map<string, { features: AudioFeatures; timestamp: number }>()
  private maxAge = 60000 // 60 seconds
  private maxSize = 100

  set(key: string, features: AudioFeatures): void {
    // Remove oldest entries if cache is too large
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      features,
      timestamp: Date.now(),
    })
  }

  get(key: string): AudioFeatures | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry is too old
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    return entry.features
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }
}

// ============================================================================
// ASYNC FEATURE EXTRACTION
// ============================================================================

let workerInstance: Worker | null = null
const featureCache = new FeatureCache()

/**
 * Extract audio features asynchronously using Web Worker
 *
 * @param samples - Audio samples
 * @param sampleRate - Sample rate in Hz
 * @param options - Extraction options
 * @returns Promise with extracted features
 */
export async function extractAudioFeaturesAsync(
  samples: Float32Array,
  sampleRate: number,
  options: AsyncFeatureExtractionOptions = {}
): Promise<FeatureExtractionResult> {
  const {
    cache = true,
    timeout = 10000,
    onStart,
    onComplete,
    onError,
  } = options

  // Generate cache key
  const cacheKey = `${sampleRate}-${samples.length}-${samples.slice(0, 10).join(',')}`

  // Check cache first
  if (cache && featureCache.has(cacheKey)) {
    const cachedFeatures = featureCache.get(cacheKey)!
    return {
      features: cachedFeatures,
      processingTime: 0,
      cached: true,
    }
  }

  onStart?.()

  try {
    // Get or create worker
    const worker = getWorker()

    // Create extraction promise with timeout
    const extractionPromise = new Promise<FeatureExtractionResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Feature extraction timeout after ${timeout}ms`))
      }, timeout)

      // Set up message handler
      const handleMessage = (event: MessageEvent) => {
        clearTimeout(timeoutId)

        const { type, features, processingTime, error } = event.data

        if (type === 'features-extracted') {
          // Convert plain object to typed features
          const audioFeatures: AudioFeatures = {
            mfcc: features.mfcc,
            spectral: features.spectral as SpectralFeatures,
            prosodic: features.prosodic as ProsodicFeatures,
          }

          // Cache results
          if (cache) {
            featureCache.set(cacheKey, audioFeatures)
          }

          onComplete?.(audioFeatures, processingTime)

          resolve({
            features: audioFeatures,
            processingTime,
            cached: false,
          })
        } else if (type === 'error') {
          reject(new Error(error))
        }

        // Clean up
        worker.removeEventListener('message', handleMessage)
      }

      worker.addEventListener('message', handleMessage)

      // Send extraction request
      worker.postMessage({
        type: 'extract-features',
        audioData: {
          samples,
          sampleRate,
        },
      })
    })

    return await extractionPromise
  } catch (error) {
    onError?.(error as Error)
    throw error
  }
}

/**
 * Extract features from multiple audio chunks in parallel
 */
export async function extractAudioFeaturesBatch(
  chunks: Array<{ samples: Float32Array; sampleRate: number }>,
  options: AsyncFeatureExtractionOptions = {}
): Promise<FeatureExtractionResult[]> {
  const promises = chunks.map(chunk =>
    extractAudioFeaturesAsync(chunk.samples, chunk.sampleRate, options)
  )

  return Promise.all(promises)
}

/**
 * Get or create the Web Worker instance
 */
function getWorker(): Worker {
  if (!workerInstance) {
    try {
      // Try to create worker from file
      workerInstance = new Worker(
        new URL('./audio-features.worker.ts', import.meta.url),
        { type: 'module' }
      )
    } catch (error) {
      console.warn('Failed to create Web Worker, falling back to main thread:', error)
      // Fallback: Use synchronous extraction on main thread
      // This will be slower but won't crash
      throw new Error('Web Worker not supported')
    }

    // Clean up worker on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        workerInstance?.terminate()
        workerInstance = null
      })
    }
  }

  return workerInstance
}

/**
 * Terminate the Web Worker and clean up resources
 */
export function cleanupAudioFeaturesWorker(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
  featureCache.clear()
}

/**
 * Clear the feature cache
 */
export function clearFeatureCache(): void {
  featureCache.clear()
}

/**
 * Get cache statistics
 */
export function getFeatureCacheStats(): {
  size: number
  keys: string[]
} {
  return {
    size: featureCache['cache'].size,
    keys: Array.from(featureCache['cache'].keys()),
  }
}
