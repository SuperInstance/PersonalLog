/**
 * JEPA Model Downloader
 *
 * Helper utility for downloading and managing Whisper models.
 * Handles downloading, validation, caching, and storage.
 */

import type {
  WhisperModelInfo,
  WhisperModelSize,
  ModelDownloadProgress,
  ModelDownloadStatus,
} from './stt-types'
import { WHISPER_MODELS } from './stt-types'

export interface DownloadOptions {
  onProgress?: (progress: ModelDownloadProgress) => void
  validateChecksum?: boolean
  timeout?: number // milliseconds
}

export interface ModelInfo {
  size: WhisperModelSize
  isDownloaded: boolean
  fileSize: number
  downloadedAt?: string
  checksumValid?: boolean
}

export class ModelDownloader {
  private static readonly STORAGE_KEY = 'jepa_whisper_models'
  private static readonly CACHE_VERSION = 'v1'

  /**
   * Get list of all available models
   */
  static getAvailableModels(): WhisperModelInfo[] {
    return Object.values(WHISPER_MODELS)
  }

  /**
   * Get info about a specific model
   */
  static getModelInfo(size: WhisperModelSize): WhisperModelInfo {
    return WHISPER_MODELS[size]
  }

  /**
   * Get status of all models
   */
  static async getModelStatus(): Promise<ModelInfo[]> {
    const models = Object.values(WHISPER_MODELS)
    const storage = await this.getStorage()

    return models.map((model) => {
      const stored = storage[model.size]

      return {
        size: model.size,
        isDownloaded: !!stored,
        fileSize: model.fileSize,
        downloadedAt: stored?.timestamp,
        checksumValid: stored?.checksumValid,
      }
    })
  }

  /**
   * Check if a model is downloaded
   */
  static async isModelDownloaded(size: WhisperModelSize): Promise<boolean> {
    const storage = await this.getStorage()
    return !!storage[size]
  }

  /**
   * Download a model
   */
  static async downloadModel(
    size: WhisperModelSize,
    options: DownloadOptions = {}
  ): Promise<void> {
    const model = WHISPER_MODELS[size]

    // Check if already downloaded
    const isDownloaded = await this.isModelDownloaded(size)
    if (isDownloaded) {
      console.log(`Model ${size} already downloaded`)
      return
    }

    console.log(`Starting download of model ${size} from ${model.url}`)

    try {
      // Download with progress tracking
      const modelData = await this.downloadWithProgress(model.url, model.fileSize, options)

      // Validate checksum if requested
      let checksumValid = false
      if (options.validateChecksum && model.sha256) {
        checksumValid = await this.validateChecksum(modelData, model.sha256)
        if (!checksumValid) {
          throw new Error('Checksum validation failed')
        }
      } else {
        checksumValid = true
      }

      // Save to storage
      await this.saveModel(size, modelData, checksumValid)

      console.log(`Model ${size} downloaded successfully`)
    } catch (error) {
      console.error(`Failed to download model ${size}:`, error)
      throw error
    }
  }

  /**
   * Delete a downloaded model
   */
  static async deleteModel(size: WhisperModelSize): Promise<void> {
    const storage = await this.getStorage()

    if (!storage[size]) {
      console.log(`Model ${size} not found in storage`)
      return
    }

    // Delete from IndexedDB
    await this.deleteModelFromIndexedDB(size)

    // Update storage metadata
    delete storage[size]
    await this.saveStorage(storage)

    console.log(`Model ${size} deleted`)
  }

  /**
   * Get the total size of all downloaded models
   */
  static async getTotalDownloadedSize(): Promise<number> {
    const storage = await this.getStorage()
    let total = 0

    for (const [size, info] of Object.entries(storage)) {
      const model = WHISPER_MODELS[size as WhisperModelSize]
      if (model) {
        total += model.fileSize
      }
    }

    return total
  }

  /**
   * Clear all downloaded models
   */
  static async clearAllModels(): Promise<void> {
    const storage = await this.getStorage()

    for (const size of Object.keys(storage)) {
      await this.deleteModelFromIndexedDB(size as WhisperModelSize)
    }

    await this.saveStorage({})
    console.log('All models cleared')
  }

  /**
   * Get recommended model based on device capabilities
   */
  static getRecommendedModel(): WhisperModelSize {
    // Check device capabilities
    const memory = this.estimateDeviceMemory()
    const cores = navigator.hardwareConcurrency || 2

    // Tiny model: < 4GB RAM, any CPU
    if (memory < 4) {
      return 'tiny'
    }

    // Base model: 4-8GB RAM, 2+ cores
    if (memory < 8) {
      return 'base'
    }

    // Small model: 8-16GB RAM, 4+ cores
    if (memory < 16) {
      return 'small'
    }

    // Medium model: 16-32GB RAM, 8+ cores
    if (memory < 32) {
      return 'medium'
    }

    // Large model: 32GB+ RAM, 8+ cores
    return 'large'
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private static async downloadWithProgress(
    url: string,
    expectedSize: number,
    options: DownloadOptions
  ): Promise<Uint8Array> {
    const controller = new AbortController()
    const timeout = options.timeout || 300000 // 5 minutes default
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : expectedSize

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const chunks: Uint8Array[] = []
      let receivedLength = 0
      const startTime = Date.now()

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // Update progress
        const elapsed = (Date.now() - startTime) / 1000
        const speed = receivedLength / elapsed
        const remainingBytes = total - receivedLength
        const remainingTime = speed > 0 ? remainingBytes / speed : 0

        options.onProgress?.({
          modelName: url.split('/').pop() || 'model',
          downloadedBytes: receivedLength,
          totalBytes: total,
          percentage: (receivedLength / total) * 100,
          speed,
          remainingTime,
        })
      }

      // Combine chunks
      const modelData = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        modelData.set(chunk, position)
        position += chunk.length
      }

      return modelData
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private static async validateChecksum(
    data: Uint8Array,
    expectedChecksum: string
  ): Promise<boolean> {
    try {
      // Use SubtleCrypto for SHA-256
      // Create a new ArrayBuffer from the data to avoid SharedArrayBuffer issues
      const arrayBuffer = new ArrayBuffer(data.byteLength)
      const view = new Uint8Array(arrayBuffer)
      view.set(data)

      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      return hashHex === expectedChecksum.toLowerCase()
    } catch (error) {
      console.error('Checksum validation error:', error)
      return false
    }
  }

  private static async saveModel(
    size: WhisperModelSize,
    data: Uint8Array,
    checksumValid: boolean
  ): Promise<void> {
    // Save to IndexedDB
    await this.saveModelToIndexedDB(size, data)

    // Update storage metadata
    const storage = await this.getStorage()
    storage[size] = {
      timestamp: new Date().toISOString(),
      checksumValid,
    }
    await this.saveStorage(storage)
  }

  private static async saveModelToIndexedDB(
    size: WhisperModelSize,
    data: Uint8Array
  ): Promise<void> {
    const DB_NAME = 'WhisperModels'
    const STORE_NAME = 'models'

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)

        store.put({ id: size, data, timestamp: Date.now() })

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  private static async deleteModelFromIndexedDB(size: WhisperModelSize): Promise<void> {
    const DB_NAME = 'WhisperModels'
    const STORE_NAME = 'models'

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)

        store.delete(size)

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }
    })
  }

  private static async getStorage(): Promise<Record<string, any>> {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${this.CACHE_VERSION}`)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  private static async saveStorage(storage: Record<string, any>): Promise<void> {
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY}_${this.CACHE_VERSION}`,
        JSON.stringify(storage)
      )
    } catch (error) {
      console.error('Failed to save storage:', error)
    }
  }

  private static estimateDeviceMemory(): number {
    // @ts-ignore - deviceMemory is not in standard types yet
    return navigator.deviceMemory || 4 // Default to 4GB if not available
  }
}
