/**
 * JEPA Model Integration
 *
 * Handles loading, caching, and inference for the Tiny-JEPA ONNX model.
 * Uses onnxruntime-web for browser-based ML inference.
 *
 * @module lib/jepa/model-integration
 */

import type { AudioFeatures } from './audio-features'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ModelConfig {
  /** Model name */
  name: string
  /** Model version */
  version: string
  /** Model URL for download */
  url: string
  /** Expected file size in bytes */
  fileSize: number
  /** Input tensor shape [batch, sequence, features] */
  inputShape: [number, number, number]
  /** Output tensor shape [batch, embedding_dim] */
  outputShape: [number, number]
  /** Embedding dimension */
  embeddingDim: number
}

export interface InferenceOptions {
  /** Execution provider (cpu, webgl, wasm) */
  executionProvider?: 'cpu' | 'webgl' | 'wasm'
  /** Enable profiling */
  profiling?: boolean
}

export interface InferenceResult {
  /** Embedding vector */
  embedding: Float32Array
  /** Inference time in milliseconds */
  inferenceTime: number
  /** Execution provider used */
  executionProvider: string
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const TINY_JEPA_CONFIG: ModelConfig = {
  name: 'tiny-jepa-v1',
  version: '1.0.0',
  // Placeholder URL - replace with actual model URL when available
  url: 'https://github.com/SuperInstance/PersonalLog/releases/download/v1.0.0/tiny-jepa-emotion-v1.onnx',
  fileSize: 4 * 1024 * 1024, // 4MB
  inputShape: [1, 100, 13], // [batch, frames, mfcc_coeffs]
  outputShape: [1, 32], // [batch, embedding_dim]
  embeddingDim: 32,
}

// ============================================================================
// JEPA MODEL CLASS
// ============================================================================

export class JEPAModel {
  private session: any = null
  private loaded = false
  private loading = false
  private config: ModelConfig
  private cache: IndexedDBCache

  constructor(config: ModelConfig = TINY_JEPA_CONFIG) {
    this.config = config
    this.cache = new IndexedDBCache()
  }

  /**
   * Initialize and load the model
   */
  async load(options: InferenceOptions = {}): Promise<void> {
    if (this.loaded) {
      return // Already loaded
    }

    if (this.loading) {
      throw new Error('Model is already loading')
    }

    this.loading = true

    try {
      // Try to load from cache first
      const cachedModel = await this.cache.load(this.config.name, this.config.version)

      if (cachedModel) {
        console.log('[JEPA] Loading model from IndexedDB cache')
        await this.loadFromArrayBuffer(cachedModel, options)
      } else {
        console.log('[JEPA] Downloading model from remote URL')
        const modelArrayBuffer = await this.downloadModel()
        await this.cache.save(this.config.name, this.config.version, modelArrayBuffer)
        await this.loadFromArrayBuffer(modelArrayBuffer, options)
      }

      this.loaded = true
      console.log('[JEPA] Model loaded successfully')
    } catch (error) {
      console.error('[JEPA] Failed to load model:', error)
      throw new Error(`Failed to load JEPA model: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      this.loading = false
    }
  }

  /**
   * Run inference on audio features
   */
  async infer(features: AudioFeatures, options: InferenceOptions = {}): Promise<InferenceResult> {
    if (!this.loaded || !this.session) {
      throw new Error('Model not loaded. Call load() first.')
    }

    const startTime = performance.now()

    try {
      // Prepare input tensor
      const inputTensor = this.prepareInput(features)

      // Run inference
      const outputs = await this.session.run({
        audio_features: inputTensor,
      })

      // Extract embedding
      const embedding = this.extractOutput(outputs)

      const inferenceTime = performance.now() - startTime

      return {
        embedding,
        inferenceTime,
        executionProvider: options.executionProvider || 'wasm',
      }
    } catch (error) {
      console.error('[JEPA] Inference failed:', error)
      throw new Error(`Inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Unload the model and free memory
   */
  async unload(): Promise<void> {
    if (this.session) {
      try {
        await this.session.release()
        this.session = null
        this.loaded = false
        console.log('[JEPA] Model unloaded')
      } catch (error) {
        console.error('[JEPA] Failed to unload model:', error)
      }
    }
  }

  /**
   * Get model configuration
   */
  getConfig(): ModelConfig {
    return { ...this.config }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Download model from URL
   */
  private async downloadModel(): Promise<ArrayBuffer> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    try {
      const response = await fetch(this.config.url, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const expectedSize = contentLength ? parseInt(contentLength, 10) : this.config.fileSize

      console.log(`[JEPA] Downloading model (${(expectedSize / 1024 / 1024).toFixed(2)} MB)`)

      const arrayBuffer = await response.arrayBuffer()

      // Validate file size
      if (arrayBuffer.byteLength !== expectedSize) {
        console.warn(
          `[JEPA] Model file size mismatch: expected ${expectedSize}, got ${arrayBuffer.byteLength}`
        )
      }

      return arrayBuffer
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Model download timed out')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Load model from ArrayBuffer
   */
  private async loadFromArrayBuffer(
    arrayBuffer: ArrayBuffer,
    options: InferenceOptions
  ): Promise<void> {
    // Dynamically import onnxruntime-web to avoid SSR issues
    const ort = await import('onnxruntime-web')

    // Configure session options
    const sessionOptions = {
      executionProviders: [options.executionProvider || 'wasm'],
      enableProfiling: options.profiling || false,
    }

    // Create inference session
    this.session = await ort.InferenceSession.create(arrayBuffer, sessionOptions)
  }

  /**
   * Prepare input tensor from audio features
   */
  private prepareInput(features: AudioFeatures): any {
    // Dynamically import onnxruntime-web
    const ort = require('onnxruntime-web')

    // Use MFCC features as input (already shaped as [100, 13])
    const mfccData = features.mfcc

    // Create tensor with shape [1, 100, 13]
    const tensor = new ort.Tensor('float32', mfccData, this.config.inputShape)

    return tensor
  }

  /**
   * Extract output embedding from model outputs
   */
  private extractOutput(outputs: Record<string, any>): Float32Array {
    // Get the embedding output
    // The model output is named 'embedding' by default
    const outputName = Object.keys(outputs).find(name => name.includes('embedding')) || Object.keys(outputs)[0]
    const output = outputs[outputName]

    // Convert to Float32Array
    const embedding = output.data instanceof Float32Array ? output.data : new Float32Array(output.data)

    return embedding
  }
}

// ============================================================================
// INDEXEDDB CACHE
// ============================================================================

class IndexedDBCache {
  private readonly DB_NAME = 'PersonalLog'
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = 'jepa_models'

  /**
   * Load model from IndexedDB cache
   */
  async load(modelName: string, version: string): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => {
        console.error('[JEPA] Failed to open IndexedDB:', request.error)
        resolve(null) // Resolve with null instead of rejecting
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'name' })
          store.createIndex('version', 'version', { unique: false })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(this.STORE_NAME, 'readonly')
        const store = transaction.objectStore(this.STORE_NAME)
        const index = store.index('version')
        const getRequest = index.get(version)

        getRequest.onsuccess = () => {
          const result = getRequest.result
          if (result && result.data) {
            console.log(`[JEPA] Model cache hit: ${modelName}@${version}`)
            db.close()
            resolve(result.data)
          } else {
            db.close()
            resolve(null)
          }
        }

        getRequest.onerror = () => {
          console.error('[JEPA] Failed to read from cache:', getRequest.error)
          db.close()
          resolve(null)
        }
      }
    })
  }

  /**
   * Save model to IndexedDB cache
   */
  async save(modelName: string, version: string, data: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => {
        console.error('[JEPA] Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'name' })
          store.createIndex('version', 'version', { unique: false })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(this.STORE_NAME, 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)

        const record = {
          name: modelName,
          version,
          data,
          timestamp: Date.now(),
        }

        store.put(record)

        transaction.oncomplete = () => {
          console.log(`[JEPA] Model cached: ${modelName}@${version}`)
          db.close()
          resolve()
        }

        transaction.onerror = () => {
          console.error('[JEPA] Failed to cache model:', transaction.error)
          db.close()
          reject(transaction.error)
        }
      }
    })
  }

  /**
   * Delete model from cache
   */
  async delete(modelName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(this.STORE_NAME, 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)

        store.delete(modelName)

        transaction.oncomplete = () => {
          db.close()
          resolve()
        }

        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }
    })
  }

  /**
   * Clear all cached models
   */
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(this.STORE_NAME, 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)

        store.clear()

        transaction.oncomplete = () => {
          db.close()
          resolve()
        }

        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }
    })
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let modelInstance: JEPAModel | null = null

/**
 * Get or create the singleton JEPA model instance
 */
export async function getJEPAModel(): Promise<JEPAModel> {
  if (!modelInstance) {
    modelInstance = new JEPAModel()
    await modelInstance.load()
  }
  return modelInstance
}

/**
 * Dispose the JEPA model instance
 */
export async function disposeJEPAModel(): Promise<void> {
  if (modelInstance) {
    await modelInstance.unload()
    modelInstance = null
  }
}
