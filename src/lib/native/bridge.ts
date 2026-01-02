/**
 * JavaScript-WASM Bridge
 *
 * Provides a high-level JavaScript interface to the Rust WebAssembly module.
 * Handles loading, initialization, fallback, and feature detection.
 */

import { getErrorHandler } from '@/lib/errors/handler';

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
 * Detect WASM and SIMD support in the current browser
 */
export function detectWasmFeatures(): WasmFeatures {
  const features: WasmFeatures = {
    supported: false,
    simd: false,
    bulkMemory: false,
    threads: false,
    exceptions: false,
  }

  try {
    // Basic WASM support (minimum viable version)
    const basicWasm = new WebAssembly.Module(
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    )
    features.supported = WebAssembly.validate(basicWasm)

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
      features.simd = WebAssembly.validate(simdWasm)
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
      features.bulkMemory = WebAssembly.validate(bulkWasm)
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
 * JavaScript fallback for cosine similarity
 */
function cosineSimilarityJS(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (normA * normB)
}

/**
 * JavaScript fallback for dot product
 */
function dotProductJS(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0)
}

/**
 * JavaScript fallback for vector normalization
 */
function normalizeVectorJS(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0))
  if (norm === 0) return v
  return v.map(val => val / norm)
}

// ============================================================================
// WASM MODULE LOADER
// ============================================================================

let wasmModule: WasmModule | null = null
let wasmFeatures: WasmFeatures | null = null
let useWasm = false
let initPromise: Promise<boolean> | null = null

/**
 * Load and initialize the WASM module
 */
export async function loadWasmModule(): Promise<boolean> {
  // Return cached promise if already loading
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      // Detect features
      wasmFeatures = detectWasmFeatures()

      if (!wasmFeatures.supported) {
        const errorHandler = getErrorHandler();
        errorHandler.handle(new Error('WASM not supported in this browser'), {
          component: 'WASM-Loader',
          additional: { fallback: 'JavaScript' }
        });
        useWasm = false
        return false
      }

      // Dynamic import of the WASM module
      // Note: This assumes wasm-pack has built the module to native/rust/pkg/
      const wasmUrl = '/native/rust/pkg/personallog_native.js'

      try {
        const wasmModuleImport = await import(/* @vite-ignore */ wasmUrl)
        await wasmModuleImport.default()

        wasmModule = wasmModuleImport as unknown as WasmModule

        const version = wasmModule.version()
        const hasSimd = wasmModule.has_simd()

        console.log(`[WASM] Loaded successfully (v${version}, SIMD: ${hasSimd})`)
        useWasm = true
        return true
      } catch (importError) {
        // Report to error handler with helpful context
        const errorHandler = getErrorHandler();
        errorHandler.handle(importError, {
          component: 'WASM-Loader',
          additional: {
            operation: 'importWasmModule',
            url: wasmUrl,
            hint: 'Run: npm run build:wasm'
          }
        });
        useWasm = false
        return false
      }

    } catch (error) {
      // Report to error handler
      const errorHandler = getErrorHandler();
      errorHandler.handle(error, {
        component: 'WASM-Loader',
        additional: { operation: 'initialize' }
      });
      useWasm = false
      return false
    }
  })()

  return initPromise
}

/**
 * Get the vector operations interface (WASM or fallback)
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
 * Create WASM-backed operations
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
        console.warn('[WASM] cosine_similarity failed, using JS fallback:', e)
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
        console.warn('[WASM] dot_product failed, using JS fallback:', e)
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
        console.warn('[WASM] euclidean_distance failed, using JS fallback:', e)
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
        console.warn('[WASM] batch_cosine_similarity failed, using JS fallback:', e)
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
        console.warn('[WASM] top_k_similar failed, using JS fallback:', e)
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
        console.warn('[WASM] normalize_vector failed, using JS fallback:', e)
        return normalizeVectorJS(v)
      }
    },

    vector_mean(vectors: number[], dimension: number): number[] {
      const vectors32 = new Float32Array(vectors)

      try {
        const result = wasm.vector_mean(vectors32, dimension)
        return Array.from(result)
      } catch (e) {
        console.warn('[WASM] vector_mean failed, using JS fallback:', e)
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
        console.warn('[WASM] weighted_sum failed, using JS fallback:', e)
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
        console.warn('[WASM] hash_embedding failed, using JS fallback:', e)
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
 * Create JS fallback operations
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
    },
    estimate_memory_size(num_vectors: number, dimension: number): number {
      return num_vectors * dimension * 4
    },
    recommended_batch_size(vector_dimension: number): number {
      if (vector_dimension <= 128) return 256
      if (vector_dimension <= 384) return 128
      if (vector_dimension <= 768) return 64
      return 32
    },
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Get WASM features (cached)
 */
export function getWasmFeatures(): WasmFeatures {
  if (!wasmFeatures) {
    wasmFeatures = detectWasmFeatures()
  }
  return wasmFeatures
}

/**
 * Check if WASM is currently being used
 */
export function isUsingWasm(): boolean {
  return useWasm
}

/**
 * Force disable WASM (for testing)
 */
export function disableWasm(): void {
  useWasm = false
}

/**
 * Re-enable WASM after forced disable
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
if (typeof window !== 'undefined') {
  // Load asynchronously, don't block initial render
  loadWasmModule().catch(console.error)
}
