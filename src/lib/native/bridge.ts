/**
 * JavaScript-WASM Bridge
 *
 * Provides a high-level JavaScript interface to the Rust WebAssembly module.
 * Handles loading, initialization, fallback, and feature detection.
 */

import { getErrorHandler } from '@/lib/errors/handler';
import {
  cosineSimilarity,
  dotProduct as dotProductUtil,
  normalizeVector as normalizeVectorUtil,
  estimateMemorySize,
  recommendedBatchSize,
  hashEmbedding,
} from '@/lib/vector/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface WasmVectorOps {
  cosine_similarity(a: number[], b: number[]): number
  dot_product(a: number[], b: number[]): number
  euclidean_distance(a: number[], b: number[]): number
  batch_cosine_similarity(query: number[], vectors: number[], dimension: number): number[]
  top_k_similar(query: number[], vectors: number[], dimension: number, k: number): number[]
  normalize_vector(v: number[]): number[]
  vector_mean(vectors: number[], dimension: number): number[]
  weighted_sum(vectors: number[], weights: number[], dimension: number): number[]
  hash_embedding(text: string, dimensions: number): number[]
  estimate_memory_size(num_vectors: number, dimension: number): number
  recommended_batch_size(vector_dimension: number): number
}

export interface WasmModule {
  cosine_similarity: (a: Float32Array, b: Float32Array) => number
  dot_product: (a: Float32Array, b: Float32Array) => number
  euclidean_distance: (a: Float32Array, b: Float32Array) => number
  batch_cosine_similarity: (query: Float32Array, vectors: Float32Array, dimension: number) => Float32Array
  top_k_similar: (query: Float32Array, vectors: Float32Array, dimension: number, k: number) => Float32Array
  normalize_vector: (v: Float32Array) => Float32Array
  vector_mean: (vectors: Float32Array, dimension: number) => Float32Array
  weighted_sum: (vectors: Float32Array, weights: Float32Array, dimension: number) => Float32Array
  hash_embedding: (text: string, dimensions: number) => Float32Array
  estimate_memory_size: (num_vectors: number, dimension: number) => number
  recommended_batch_size: (vector_dimension: number) => number
  version: () => string
  has_simd: () => boolean
  __wbindgen_malloc: (size: number, align: number) => number
  __wbindgen_free: (ptr: number, size: number, align: number) => void
}

export interface WasmFeatures {
  supported: boolean
  simd: boolean
  bulkMemory: boolean
  threads: boolean
  exceptions: boolean
}

// ============================================================================
// FEATURE DETECTION
// ============================================================================

/**
 * Detects WebAssembly and SIMD support in the current browser.
 *
 * @returns Object indicating support for various WASM features
 *
 * @example
 * ```typescript
 * const features = detectWasmFeatures()
 * console.log(`SIMD supported: ${features.simd}`)
 * console.log(`Bulk memory: ${features.bulkMemory}`)
 * ```
 */
export function detectWasmFeatures(): WasmFeatures {
  const features: WasmFeatures = {
    supported: false,
    simd: false,
    bulkMemory: false,
    threads: false,
    exceptions: false,
  }

  // Check for browser environment
  if (typeof window === 'undefined' && typeof self === 'undefined') {
    return features
  }

  try {
    // Basic WASM support (minimum viable version)
    const basicWasm = new WebAssembly.Module(
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    )
    features.supported = WebAssembly.validate(basicWasm as any)

    if (!features.supported) {
      return features
    }

    // SIMD detection
    try {
      const simdWasm = new WebAssembly.Module(
        new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x00, 0x61, 0x00, 0x00, 0x00,
          0x01, 0x07, 0x01, 0x00, 0x01, 0x61, 0x00, 0x00
        ])
      )
      features.simd = WebAssembly.validate(simdWasm as any)
    } catch {
      features.simd = false
    }

    // Bulk memory detection
    try {
      const bulkWasm = new WebAssembly.Module(
        new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x00, 0x61, 0x00, 0x00, 0x00,
        ])
      )
      features.bulkMemory = WebAssembly.validate(bulkWasm as any)
    } catch {
      features.bulkMemory = false
    }

  } catch (e) {
    // Report to error handler instead of just console.warn
    const errorHandler = getErrorHandler();
    errorHandler.handle(e, {
      component: 'WASM-FeatureDetection',
      additional: { operation: 'detectWasmFeatures' }
    });
  }

  return features
}

// ============================================================================
// FALLBACK IMPLEMENTATIONS (Pure JS)
// ============================================================================

/**
 * JavaScript fallback for cosine similarity.
 * Uses shared utility function.
 */
function cosineSimilarityJS(a: number[], b: number[]): number {
  return cosineSimilarity(a, b)
}

/**
 * JavaScript fallback for dot product.
 * Uses shared utility function.
 */
function dotProductJS(a: number[], b: number[]): number {
  return dotProductUtil(a, b)
}

/**
 * JavaScript fallback for vector normalization.
 * Uses shared utility function.
 */
function normalizeVectorJS(v: number[]): number[] {
  return normalizeVectorUtil(v)
}

// ============================================================================
// WASM MODULE LOADER
// ============================================================================

let wasmModule: WasmModule | null = null
let wasmFeatures: WasmFeatures | null = null
let useWasm = false
let initPromise: Promise<boolean> | null = null

/**
 * Loads and initializes the WASM module.
 *
 * Automatically detects feature support and falls back to JavaScript if WASM is unavailable.
 * The loading promise is cached so multiple calls return the same promise.
 *
 * @returns Promise resolving to true if WASM loaded successfully, false otherwise
 *
 * @example
 * ```typescript
 * const success = await loadWasmModule()
 * if (success) {
 *   console.log('WASM acceleration available')
 * }
 * ```
 */
export async function loadWasmModule(): Promise<boolean> {
  // Return cached promise if already loading
  if (initPromise) {
    return initPromise
  }

  // Check for browser environment
  if (typeof window === 'undefined' && typeof self === 'undefined') {
    // Server-side - WASM not available
    useWasm = false
    return false
  }

  initPromise = (async () => {
    try {
      // Detect features
      wasmFeatures = detectWasmFeatures()

      if (!wasmFeatures.supported) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(new Error('WASM not supported in this browser'), {
          component: 'WASM-Loader',
          additional: {
            fallback: 'JavaScript',
            message: 'Your browser does not support WebAssembly. Using JavaScript fallback for vector operations.'
          }
        });
        useWasm = false
        return false
      }

      // Dynamic import of the WASM module
      // Note: This assumes wasm-pack has built the module to native/rust/pkg/
      const wasmUrl = '/native/rust/pkg/personallog_native.js'

      try {
        // Add timeout for WASM loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('WASM loading timeout (10s)')), 10000)
        })

        const wasmModuleImport = await Promise.race([
          import(/* @vite-ignore */ wasmUrl),
          timeoutPromise
        ])

        // Initialize WASM module
        await wasmModuleImport.default()

        wasmModule = wasmModuleImport as unknown as WasmModule

        const version = wasmModule.version()
        const hasSimd = wasmModule.has_simd()

        console.log(`[WASM] Loaded successfully (v${version}, SIMD: ${hasSimd})`)
        useWasm = true
        return true
      } catch (importError: any) {
        // Provide helpful error messages
        let errorMessage = 'Failed to load WASM module'
        let hint = 'WASM will use JavaScript fallback for vector operations.'

        if (importError.message.includes('timeout')) {
          errorMessage = 'WASM loading timeout'
          hint = 'The module took too long to load. Using JavaScript fallback.'
        } else if (importError.message.includes('Failed to fetch')) {
          errorMessage = 'WASM module not found'
          hint = 'Run "npm run build:wasm" to build WASM, or use JavaScript fallback.'
        } else if (importError.message.includes('not a valid WebAssembly module')) {
          errorMessage = 'Invalid WASM module'
          hint = 'The WASM binary may be corrupted. Try rebuilding with "npm run build:wasm:release".'
        }

        // Report to error handler with helpful context
        const errorHandler = getErrorHandler();
        errorHandler.handle(new Error(errorMessage, { cause: importError }), {
          component: 'WASM-Loader',
          additional: {
            operation: 'importWasmModule',
            url: wasmUrl,
            hint,
            fallback: 'JavaScript'
          }
        });

        console.warn(`[WASM] ${errorMessage}. ${hint}`)
        useWasm = false
        return false
      }

    } catch (error: any) {
      // Catch-all error handler
      const errorHandler = getErrorHandler();
      errorHandler.handle(error, {
        component: 'WASM-Loader',
        additional: {
          operation: 'initialize',
          fallback: 'JavaScript',
          message: 'Failed to initialize WASM. Using JavaScript fallback.'
        }
      });
      useWasm = false
      return false
    }
  })()

  return initPromise
}

/**
 * Gets the vector operations interface (WASM or JavaScript fallback).
 *
 * Ensures WASM is loaded before returning the appropriate implementation.
 *
 * @returns Promise resolving to vector operations interface
 *
 * @example
 * ```typescript
 * const ops = await getVectorOps()
 * const similarity = ops.cosine_similarity(vec1, vec2)
 * ```
 */
export async function getVectorOps(): Promise<WasmVectorOps> {
  // Ensure WASM is loaded
  if (wasmModule === null && !initPromise) {
    await loadWasmModule()
  } else if (initPromise) {
    await initPromise
  }

  // Return the appropriate implementation
  if (useWasm && wasmModule) {
    return createWasmOps(wasmModule)
  } else {
    return createJsOps()
  }
}

/**
 * Creates WASM-backed vector operations.
 *
 * @param wasm - The loaded WASM module
 * @returns Vector operations interface using WASM implementation
 *
 * @internal
 */
function createWasmOps(wasm: WasmModule): WasmVectorOps {
  return {
    cosine_similarity(a: number[], b: number[]): number {
      if (a.length !== b.length) return 0

      const a32 = new Float32Array(a)
      const b32 = new Float32Array(b)

      try {
        return wasm.cosine_similarity(a32, b32)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-cosine_similarity',
          additional: { fallback: 'JavaScript', dimensions: a.length }
        });
        return cosineSimilarityJS(a, b)
      }
    },

    dot_product(a: number[], b: number[]): number {
      if (a.length !== b.length) return 0

      const a32 = new Float32Array(a)
      const b32 = new Float32Array(b)

      try {
        return wasm.dot_product(a32, b32)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-dot_product',
          additional: { fallback: 'JavaScript', dimensions: a.length }
        });
        return dotProductJS(a, b)
      }
    },

    euclidean_distance(a: number[], b: number[]): number {
      if (a.length !== b.length) return 0

      const a32 = new Float32Array(a)
      const b32 = new Float32Array(b)

      try {
        return wasm.euclidean_distance(a32, b32)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-euclidean_distance',
          additional: { fallback: 'JavaScript', dimensions: a.length }
        });
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
      }
    },

    batch_cosine_similarity(query: number[], vectors: number[], dimension: number): number[] {
      const query32 = new Float32Array(query)
      const vectors32 = new Float32Array(vectors)

      try {
        const result = wasm.batch_cosine_similarity(query32, vectors32, dimension)
        return Array.from(result)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-batch_cosine_similarity',
          additional: {
            fallback: 'JavaScript',
            dimension,
            numVectors: vectors.length / dimension
          }
        });
        // JS fallback
        const numVectors = vectors.length / dimension
        const results: number[] = []
        for (let i = 0; i < numVectors; i++) {
          const vec = vectors.slice(i * dimension, (i + 1) * dimension)
          results.push(cosineSimilarityJS(query, vec))
        }
        return results
      }
    },

    top_k_similar(query: number[], vectors: number[], dimension: number, k: number): number[] {
      const query32 = new Float32Array(query)
      const vectors32 = new Float32Array(vectors)

      try {
        const result = wasm.top_k_similar(query32, vectors32, dimension, k)
        return Array.from(result)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-top_k_similar',
          additional: {
            fallback: 'JavaScript',
            dimension,
            k
          }
        });
        // JS fallback
        const scores = this.batch_cosine_similarity(query, vectors, dimension)
        const indexed = scores.map((score, idx) => ({ idx, score }))
        indexed.sort((a, b) => b.score - a.score)
        return indexed.slice(0, k).flatMap(({ idx, score }) => [idx, score])
      }
    },

    normalize_vector(v: number[]): number[] {
      const v32 = new Float32Array(v)

      try {
        const result = wasm.normalize_vector(v32)
        return Array.from(result)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-normalize_vector',
          additional: { fallback: 'JavaScript', dimensions: v.length }
        });
        return normalizeVectorJS(v)
      }
    },

    vector_mean(vectors: number[], dimension: number): number[] {
      const vectors32 = new Float32Array(vectors)

      try {
        const result = wasm.vector_mean(vectors32, dimension)
        return Array.from(result)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-vector_mean',
          additional: { fallback: 'JavaScript', dimension }
        });
        const numVectors = vectors.length / dimension
        const mean = new Array(dimension).fill(0)
        for (let i = 0; i < numVectors; i++) {
          for (let j = 0; j < dimension; j++) {
            mean[j] += vectors[i * dimension + j]
          }
        }
        return mean.map(v => v / numVectors)
      }
    },

    weighted_sum(vectors: number[], weights: number[], dimension: number): number[] {
      const vectors32 = new Float32Array(vectors)
      const weights32 = new Float32Array(weights)

      try {
        const result = wasm.weighted_sum(vectors32, weights32, dimension)
        return Array.from(result)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-weighted_sum',
          additional: { fallback: 'JavaScript', dimension }
        });
        const numVectors = vectors.length / dimension
        const result = new Array(dimension).fill(0)
        for (let i = 0; i < numVectors; i++) {
          for (let j = 0; j < dimension; j++) {
            result[j] += vectors[i * dimension + j] * weights[i]
          }
        }
        return result
      }
    },

    hash_embedding(text: string, dimensions: number): number[] {
      try {
        const result = wasm.hash_embedding(text, dimensions)
        return Array.from(result)
      } catch (e) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(e, {
          component: 'WASM-hash_embedding',
          additional: { fallback: 'JavaScript', dimensions, textLength: text.length }
        });
        // Simple JS fallback
        const vector = new Array(dimensions).fill(0)
        let hash = 0
        for (let i = 0; i < text.length; i++) {
          hash = ((hash << 5) - hash) + text.charCodeAt(i)
          hash = hash | 0
        }
        let seed = Math.abs(hash)
        for (let i = 0; i < dimensions; i++) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff
          vector[i] = (seed % 1000) / 1000
        }
        return normalizeVectorJS(vector)
      }
    },

    estimate_memory_size(num_vectors: number, dimension: number): number {
      try {
        return wasm.estimate_memory_size(num_vectors, dimension)
      } catch {
        return num_vectors * dimension * 4 // 4 bytes per f32
      }
    },

    recommended_batch_size(vector_dimension: number): number {
      try {
        return wasm.recommended_batch_size(vector_dimension)
      } catch {
        if (vector_dimension <= 128) return 256
        if (vector_dimension <= 384) return 128
        if (vector_dimension <= 768) return 64
        return 32
      }
    },
  }
}

/**
 * Creates JavaScript fallback vector operations.
 *
 * @returns Vector operations interface using pure JavaScript implementation
 *
 * @internal
 */
function createJsOps(): WasmVectorOps {
  return {
    cosine_similarity: cosineSimilarityJS,
    dot_product: dotProductJS,
    euclidean_distance(a: number[], b: number[]): number {
      return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
    },
    batch_cosine_similarity(query: number[], vectors: number[], dimension: number): number[] {
      const numVectors = vectors.length / dimension
      const results: number[] = []
      for (let i = 0; i < numVectors; i++) {
        const vec = vectors.slice(i * dimension, (i + 1) * dimension)
        results.push(cosineSimilarityJS(query, vec))
      }
      return results
    },
    top_k_similar(query: number[], vectors: number[], dimension: number, k: number): number[] {
      const scores = this.batch_cosine_similarity(query, vectors, dimension)
      const indexed = scores.map((score, idx) => ({ idx, score }))
      indexed.sort((a, b) => b.score - a.score)
      return indexed.slice(0, k).flatMap(({ idx, score }) => [idx, score])
    },
    normalize_vector: normalizeVectorJS,
    vector_mean(vectors: number[], dimension: number): number[] {
      const numVectors = vectors.length / dimension
      const mean = new Array(dimension).fill(0)
      for (let i = 0; i < numVectors; i++) {
        for (let j = 0; j < dimension; j++) {
          mean[j] += vectors[i * dimension + j]
        }
      }
      return mean.map(v => v / numVectors)
    },
    weighted_sum(vectors: number[], weights: number[], dimension: number): number[] {
      const numVectors = vectors.length / dimension
      const result = new Array(dimension).fill(0)
      for (let i = 0; i < numVectors; i++) {
        for (let j = 0; j < dimension; j++) {
          result[j] += vectors[i * dimension + j] * weights[i]
        }
      }
      return result
    },
    hash_embedding(text: string, dimensions: number): number[] {
      return hashEmbedding(text, dimensions)
    },
    estimate_memory_size(num_vectors: number, dimension: number): number {
      return estimateMemorySize(num_vectors, dimension)
    },
    recommended_batch_size(vector_dimension: number): number {
      return recommendedBatchSize(vector_dimension)
    },
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Gets detected WASM features (cached).
 *
 * @returns Detected WASM features
 *
 * @example
 * ```typescript
 * const features = getWasmFeatures()
 * console.log(`WASM supported: ${features.supported}`)
 * ```
 */
export function getWasmFeatures(): WasmFeatures {
  if (!wasmFeatures) {
    wasmFeatures = detectWasmFeatures()
  }
  return wasmFeatures
}

/**
 * Checks whether WASM is currently being used for vector operations.
 *
 * @returns true if WASM is being used, false if using JavaScript fallback
 *
 * @example
 * ```typescript
 * if (isUsingWasm()) {
 *   console.log('Running with WASM acceleration')
 * }
 * ```
 */
export function isUsingWasm(): boolean {
  return useWasm
}

/**
 * Forces WASM to be disabled (useful for testing).
 *
 * @example
 * ```typescript
 * disableWasm()
 * // Now operations will use JS fallback
 * ```
 */
export function disableWasm(): void {
  useWasm = false
}

/**
 * Re-enables WASM after it was forcibly disabled.
 *
 * Only has an effect if WASM is actually supported.
 *
 * @example
 * ```typescript
 * enableWasm()
 * // Now operations will use WASM again (if supported)
 * ```
 */
export function enableWasm(): void {
  if (wasmFeatures?.supported) {
    useWasm = true
  }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Auto-load WASM in browser environments
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  // Load asynchronously, don't block initial render
  loadWasmModule().catch(console.error)
}
