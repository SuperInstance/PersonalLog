/**
 * KV-Cache Implementation
 *
 * Efficient caching of key-value pairs for autoregressive generation.
 * Dramatically speeds up token generation by caching previous computations.
 */

import type { ModelInfo } from '../types/index.js';

/**
 * Key-Value cache for efficient attention computation
 */
export class KVCache {
  private device: GPUDevice;
  private modelInfo: ModelInfo;
  private maxTokens: number;

  private keyCache: GPUBuffer | null = null;
  private valueCache: GPUBuffer | null = null;
  private currentLength: number = 0;

  private cacheSizePerToken: number;

  constructor(device: GPUDevice, modelInfo: ModelInfo, maxTokens: number) {
    this.device = device;
    this.modelInfo = modelInfo;
    this.maxTokens = maxTokens;

    // Calculate cache size per token
    // 2 tensors (K, V) x numLayers x numHeads x headDim x sizeof(float32)
    const elementsPerToken = 2 * modelInfo.numLayers * modelInfo.numKVHeads * modelInfo.embeddingDim;
    this.cacheSizePerToken = elementsPerToken * 4; // 4 bytes per float32

    this.initialize();
  }

  /**
   * Initialize cache buffers
   */
  private initialize(): void {
    const totalCacheSize = this.cacheSizePerToken * this.maxTokens;

    this.keyCache = this.device.createBuffer({
      size: totalCacheSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'kv-cache-key'
    });

    this.valueCache = this.device.createBuffer({
      size: totalCacheSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'kv-cache-value'
    });

    console.log(`KV-Cache initialized: ${totalCacheSize / 1024 / 1024} MB`);
  }

  /**
   * Update cache with new tokens
   */
  update(keys: Float32Array, values: Float32Array, numTokens: number): void {
    if (!this.keyCache || !this.valueCache) {
      throw new Error('Cache not initialized');
    }

    if (this.currentLength + numTokens > this.maxTokens) {
      console.warn('KV-cache full, clearing old entries');
      this.currentLength = 0;
    }

    const offset = this.currentLength * this.cacheSizePerToken;

    this.device.queue.writeBuffer(
      this.keyCache,
      offset,
      keys.buffer,
      0,
      keys.byteLength
    );

    this.device.queue.writeBuffer(
      this.valueCache,
      offset,
      values.buffer,
      0,
      values.byteLength
    );

    this.currentLength += numTokens;
  }

  /**
   * Get current cache length
   */
  getLength(): number {
    return this.currentLength;
  }

  /**
   * Reset cache
   */
  reset(): void {
    this.currentLength = 0;
  }

  /**
   * Get cache buffers
   */
  getBuffers(): { key: GPUBuffer; value: GPUBuffer } | null {
    if (!this.keyCache || !this.valueCache) {
      return null;
    }
    return {
      key: this.keyCache,
      value: this.valueCache
    };
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cacheSizePerToken * this.maxTokens;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('Disposing KV-cache...');

    if (this.keyCache) {
      this.keyCache.destroy();
      this.keyCache = null;
    }

    if (this.valueCache) {
      this.valueCache.destroy();
      this.valueCache = null;
    }

    this.currentLength = 0;
  }
}
