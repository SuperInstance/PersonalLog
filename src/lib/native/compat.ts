/**
 * WASM Compatibility Utilities
 *
 * Feature detection and compatibility checks for WebAssembly support.
 */

export interface WasmFeatures {
  supported: boolean
  simd: boolean
  bulkMemory: boolean
  threads: boolean
  exceptions: boolean
}

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

    // Threads detection (requires SharedArrayBuffer)
    features.threads = typeof SharedArrayBuffer !== 'undefined'

    // Exceptions detection
    try {
      const excWasm = new WebAssembly.Module(
        new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x00, 0x61, 0x00, 0x00, 0x00,
        ])
      )
      features.exceptions = WebAssembly.validate(excWasm as any)
    } catch {
      features.exceptions = false
    }

  } catch (e) {
    console.warn('[WASM] Feature detection failed:', e)
  }

  return features
}

/**
 * Check if the browser supports WASM with a reasonable feature set
 */
export function isWasmRecommended(): boolean {
  const features = detectWasmFeatures()
  return features.supported && features.bulkMemory
}

/**
 * Get a human-readable description of WASM support
 */
export function getWasmSupportDescription(): string {
  const features = detectWasmFeatures()

  if (!features.supported) {
    return 'WebAssembly is not supported in this browser'
  }

  const capabilities: string[] = []

  if (features.simd) {
    capabilities.push('SIMD acceleration')
  }

  if (features.bulkMemory) {
    capabilities.push('bulk memory operations')
  }

  if (features.threads) {
    capabilities.push('multi-threading')
  }

  if (features.exceptions) {
    capabilities.push('exception handling')
  }

  if (capabilities.length === 0) {
    return 'WebAssembly is supported but without optimizations'
  }

  return `WebAssembly with: ${capabilities.join(', ')}`
}

/**
 * Log WASM feature information (for debugging)
 */
export function logWasmInfo(): void {
  const features = detectWasmFeatures()

  console.group('[WASM Feature Detection]')
  console.log('Supported:', features.supported)
  console.log('SIMD:', features.simd)
  console.log('Bulk Memory:', features.bulkMemory)
  console.log('Threads:', features.threads)
  console.log('Exceptions:', features.exceptions)
  console.log('Description:', getWasmSupportDescription())
  console.groupEnd()
}
