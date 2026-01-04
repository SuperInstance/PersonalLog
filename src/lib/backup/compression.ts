/**
 * Backup Compression Utilities
 *
 * Handles compression and decompression of backup data using gzip.
 * Uses browser native CompressionStream and DecompressionStream APIs.
 */

import {
  CompressionType,
  Backup,
  BackupFile
} from './types'
import { StorageError } from '@/lib/errors'

// ============================================================================
// COMPRESSION STREAM
// ============================================================================

/**
 * Check if compression is supported in this browser
 */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' &&
         typeof DecompressionStream !== 'undefined'
}

/**
 * Compress data using gzip
 *
 * @param data - Data to compress (string or Uint8Array)
 * @returns Promise resolving to compressed data
 * @throws {StorageError} If compression is not supported or fails
 *
 * @example
 * ```typescript
 * const compressed = await compressData('{"foo":"bar"}')
 * console.log(compressed) // Uint8Array of compressed data
 * ```
 */
export async function compressData(
  data: string | Uint8Array
): Promise<Uint8Array> {
  if (!isCompressionSupported()) {
    throw new StorageError('Compression is not supported in this browser', {
      technicalDetails: 'CompressionStream API not available',
      context: { userAgent: navigator.userAgent }
    })
  }

  try {
    // Convert string to Uint8Array if needed
    const inputData = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data

    // Create compression stream
    const compressionStream = new CompressionStream('gzip')
    const writer = compressionStream.writable.getWriter()
    const reader = compressionStream.readable.getReader()

    // Write input data (cast to BufferSource to fix TypeScript error)
    await writer.write(inputData as BufferSource)
    await writer.close()

    // Read compressed data
    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) chunks.push(value)
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const compressed = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      compressed.set(chunk, offset)
      offset += chunk.length
    }

    return compressed
  } catch (error) {
    throw new StorageError('Failed to compress data', {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Decompress gzip data
 *
 * @param data - Compressed data
 * @returns Promise resolving to decompressed string
 * @throws {StorageError} If decompression fails
 *
 * @example
 * ```typescript
 * const decompressed = await decompressData(compressedBytes)
 * console.log(decompressed) // '{"foo":"bar"}'
 * ```
 */
export async function decompressData(data: Uint8Array): Promise<string> {
  if (!isCompressionSupported()) {
    throw new StorageError('Decompression is not supported in this browser', {
      technicalDetails: 'DecompressionStream API not available',
      context: { userAgent: navigator.userAgent }
    })
  }

  try {
    // Create decompression stream
    const decompressionStream = new DecompressionStream('gzip')
    const writer = decompressionStream.writable.getWriter()
    const reader = decompressionStream.readable.getReader()

    // Write compressed data
    await writer.write(data as any)
    await writer.close()

    // Read decompressed data
    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) chunks.push(value)
    }

    // Combine chunks and decode
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const decompressed = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      decompressed.set(chunk, offset)
      offset += chunk.length
    }

    return new TextDecoder().decode(decompressed)
  } catch (error) {
    throw new StorageError('Failed to decompress data', {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

// ============================================================================
// BACKUP COMPRESSION
// ============================================================================

/**
 * Compress a backup
 *
 * @param backup - Backup to compress
 * @returns Promise resolving to compressed backup with updated size
 * @throws {StorageError} If compression fails
 *
 * @example
 * ```typescript
 * const compressed = await compressBackup(backup)
 * console.log(compressed.compressedSize) // Size after compression
 * ```
 */
export async function compressBackup(backup: Backup): Promise<Backup> {
  if (backup.compression === 'none') {
    return backup
  }

  try {
    // Serialize backup data to JSON
    const jsonData = JSON.stringify(backup.data)
    backup.size = new Blob([jsonData]).size

    // Compress the JSON data
    const compressed = await compressData(jsonData)
    backup.compressedSize = compressed.length

    // Store compressed data as base64
    const base64Compressed = arrayBufferToBase64(compressed)
    ;(backup as any)._compressedData = base64Compressed

    // Update compression metadata
    backup.compression = 'gzip'

    // Calculate compression ratio
    const ratio = ((backup.size - backup.compressedSize) / backup.size * 100).toFixed(1)
    console.log(`[Backup] Compressed ${backup.name}: ${backup.size} -> ${backup.compressedSize} bytes (${ratio}% reduction)`)

    return backup
  } catch (error) {
    throw new StorageError(`Failed to compress backup: ${backup.name}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      context: { backupId: backup.id },
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Decompress a backup
 *
 * @param backup - Compressed backup
 * @returns Promise resolving to decompressed backup with data restored
 * @throws {StorageError} If decompression fails
 *
 * @example
 * ```typescript
 * const decompressed = await decompressBackup(backup)
 * console.log(decompressed.data) // Full backup data
 * ```
 */
export async function decompressBackup(backup: Backup): Promise<Backup> {
  if (backup.compression === 'none') {
    return backup
  }

  try {
    // Get compressed data
    const compressedData = (backup as any)._compressedData
    if (!compressedData) {
      throw new StorageError('Backup marked as compressed but no compressed data found', {
        context: { backupId: backup.id, compression: backup.compression }
      })
    }

    // Convert base64 to Uint8Array
    const compressedBytes = base64ToArrayBuffer(compressedData)

    // Decompress
    const decompressedJson = await decompressData(compressedBytes)

    // Parse JSON
    backup.data = JSON.parse(decompressedJson)

    // Verify size
    const actualSize = new Blob([decompressedJson]).size
    if (Math.abs(actualSize - backup.size) > 100) {
      console.warn(`[Backup] Size mismatch after decompression: expected ${backup.size}, got ${actualSize}`)
    }

    return backup
  } catch (error) {
    throw new StorageError(`Failed to decompress backup: ${backup.name}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      context: { backupId: backup.id, compression: backup.compression },
      cause: error instanceof Error ? error : undefined
    })
  }
}

// ============================================================================
// BACKUP FILE COMPRESSION (for download)
// ============================================================================

/**
 * Compress backup for file download
 *
 * @param backup - Backup to compress
 * @param compression - Compression type
 * @returns Promise resolving to Blob ready for download
 * @throws {StorageError} If compression fails
 *
 * @example
 * ```typescript
 * const blob = await compressBackupForDownload(backup, 'gzip')
 * // Download blob as file
 * ```
 */
export async function compressBackupForDownload(
  backup: Backup,
  compression: CompressionType
): Promise<Blob> {
  try {
    // Create backup file structure
    const backupFile: BackupFile = {
      version: backup.version,
      timestamp: backup.timestamp,
      type: backup.type,
      checksum: backup.checksum,
      compression,
      encryption: 'none',
      appVersion: backup.appVersion,
      data: backup.data
    }

    // Serialize to JSON
    const jsonData = JSON.stringify(backupFile, null, 2)

    // Compress if requested
    if (compression === 'gzip') {
      const compressed = await compressData(jsonData)
      return new Blob([compressed as any], { type: 'application/gzip' })
    }

    return new Blob([jsonData], { type: 'application/json' })
  } catch (error) {
    throw new StorageError(`Failed to prepare backup for download: ${backup.name}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      context: { backupId: backup.id, compression },
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Decompress backup file from upload
 *
 * @param file - Uploaded file
 * @returns Promise resolving to BackupFile structure
 * @throws {StorageError} If decompression or parsing fails
 *
 * @example
 * ```typescript
 * const backupFile = await decompressBackupFromUpload(file)
 * console.log(backupFile.data) // Backup data
 * ```
 */
export async function decompressBackupFromUpload(file: File): Promise<BackupFile> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    // Check if file is gzipped (magic number)
    const isGzipped = data[0] === 0x1f && data[1] === 0x8b

    let jsonStr: string

    if (isGzipped) {
      // Decompress
      jsonStr = await decompressData(data)
    } else {
      // Already plain JSON
      jsonStr = new TextDecoder().decode(data)
    }

    // Parse JSON
    const backupFile = JSON.parse(jsonStr) as BackupFile

    // Validate structure
    if (!backupFile.version || !backupFile.timestamp || !backupFile.data) {
      throw new StorageError('Invalid backup file format', {
        technicalDetails: 'Missing required fields: version, timestamp, or data',
        context: { fileName: file.name, fileSize: file.size }
      })
    }

    return backupFile
  } catch (error) {
    throw new StorageError(`Failed to load backup from file: ${file.name}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      context: { fileName: file.name, fileSize: file.size },
      cause: error instanceof Error ? error : undefined
    })
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

/**
 * Calculate compression ratio
 *
 * @param originalSize - Original size in bytes
 * @param compressedSize - Compressed size in bytes
 * @returns Compression ratio as percentage (0-100)
 *
 * @example
 * ```typescript
 * const ratio = calculateCompressionRatio(1000, 250)
 * console.log(ratio) // 75.0 (75% reduction)
 * ```
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize === 0) return 0
  return ((originalSize - compressedSize) / originalSize) * 100
}

/**
 * Format bytes for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 *
 * @example
 * ```typescript
 * console.log(formatBytes(1536000)) // "1.46 MB"
 * ```
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Estimate compression ratio for JSON data
 *
 * Uses heuristics to estimate potential compression ratio based on data patterns.
 *
 * @param jsonData - JSON string to analyze
 * @returns Estimated compression ratio (0-100)
 *
 * @example
 * ```typescript
 * const estimated = estimateCompressionRatio(jsonString)
 * console.log(`Estimated ${estimated}% reduction`)
 * ```
 */
export function estimateCompressionRatio(jsonData: string): number {
  // Heuristics for compression estimation
  const repeatedChars = (jsonData.match(/(.)\1{4,}/g) || []).length
  const repeatedWords = (jsonData.match(/\b(\w+)\b\1+\b/g) || []).length
  const whitespaceRatio = (jsonData.match(/\s/g) || []).length / jsonData.length

  // Base compression from gzip (typically 60-70% for JSON)
  let estimate = 60

  // Boost estimate for repetitive data
  estimate += Math.min(repeatedChars * 0.5, 10)
  estimate += Math.min(repeatedWords * 0.3, 5)

  // Boost estimate for high whitespace
  if (whitespaceRatio > 0.2) {
    estimate += 5
  }

  return Math.min(estimate, 85) // Cap at 85%
}

// ============================================================================
// STREAMING COMPRESSION (for large backups)
// ============================================================================

/**
 * Create a readable stream for compressed data
 *
 * Useful for very large backups where you want to stream the compression.
 *
 * @param data - Data to compress
 * @returns ReadableStream of compressed data
 *
 * @example
 * ```typescript
 * const stream = createCompressionStream(jsonData)
 * const response = new Response(stream)
 * ```
 */
export function createCompressionStream(data: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const compressionStream = new CompressionStream('gzip')

  // Create a transform stream that encodes and compresses
  const transform = new TransformStream({
    async transform(chunk: string, controller) {
      const encoded = encoder.encode(chunk)
      controller.enqueue(encoded)
    }
  })

  // Pipe: string -> encode -> compress
  const reader = new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    }
  })
    .pipeThrough(transform)
    .pipeThrough(compressionStream)

  return reader
}

/**
 * Create a writable stream for decompression
 *
 * @returns WritableStream that decompresses incoming data
 *
 * @example
 * ```typescript
 * const stream = createDecompressionStream()
 * // Write compressed data to stream
 * ```
 */
export function createDecompressionStream(): {
  writable: WritableStream<Uint8Array>
  readable: ReadableStream<Uint8Array>
} {
  const decompressionStream = new DecompressionStream('gzip')
  return {
    writable: decompressionStream.writable as WritableStream<Uint8Array>,
    readable: decompressionStream.readable as ReadableStream<Uint8Array>
  }
}
