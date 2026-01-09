/**
 * Test Utilities for NeuralStream
 *
 * Helper functions for testing WebGPU operations, memory management,
 * and performance metrics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { MockGPUDevice } from '../mocks/webgpu-mock.js';

/**
 * Performance measurement helper
 */
export class PerformanceTimer {
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }

  async measure<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start();
    const result = await fn();
    const duration = this.end();
    return { result, duration };
  }

  measureSync<T>(fn: () => T): { result: T; duration: number } {
    this.start();
    const result = fn();
    const duration = this.end();
    return { result, duration };
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private initialMemory: number = 0;
  private allocations: Map<string, number> = new Map();

  async start(): Promise<void> {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.initialMemory = process.memoryUsage().heapUsed;
    }
  }

  track(name: string, size: number): void {
    this.allocations.set(name, size);
  }

  getTrackedMemory(): number {
    let total = 0;
    for (const size of this.allocations.values()) {
      total += size;
    }
    return total;
  }

  getMemoryIncrease(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed - this.initialMemory;
    }
    return 0;
  }

  reset(): void {
    this.allocations.clear();
  }

  report(): { tracked: number; increase: number; allocations: Record<string, number> } {
    const allocations: Record<string, number> = {};
    for (const [name, size] of this.allocations.entries()) {
      allocations[name] = size;
    }

    return {
      tracked: this.getTrackedMemory(),
      increase: this.getMemoryIncrease(),
      allocations,
    };
  }
}

/**
 * Float array comparison utilities
 */
export class ArrayComparer {
  static equal(a: Float32Array, b: Float32Array, tolerance = 0.0001): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > tolerance) {
        return false;
      }
    }

    return true;
  }

  static maxDifference(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Arrays must have same length');
    }

    let maxDiff = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = Math.abs(a[i] - b[i]);
      if (diff > maxDiff) {
        maxDiff = diff;
      }
    }

    return maxDiff;
  }

  static meanSquaredError(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Arrays must have same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return sum / a.length;
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  static randomFloat32Array(length: number, min = -1, max = 1): Float32Array {
    const arr = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = Math.random() * (max - min) + min;
    }
    return arr;
  }

  static randomInt32Array(length: number, min = 0, max = 1000): Int32Array {
    const arr = new Int32Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * (max - min)) + min;
    }
    return arr;
  }

  static identityMatrix(size: number): Float32Array {
    const matrix = new Float32Array(size * size);
    for (let i = 0; i < size; i++) {
      matrix[i * size + i] = 1.0;
    }
    return matrix;
  }

  static sequentialFloat32Array(length: number, start = 0, step = 1): Float32Array {
    const arr = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = start + i * step;
    }
    return arr;
  }

  static onesFloat32Array(length: number): Float32Array {
    return new Float32Array(length).fill(1.0);
  }

  static zerosFloat32Array(length: number): Float32Array {
    return new Float32Array(length).fill(0.0);
  }
}

/**
 * WebGPU device wrapper for testing
 */
export class TestDevice {
  constructor(public device: MockGPUDevice) {}

  async cleanup(): Promise<void> {
    this.device.destroy();
  }
}

/**
 * Test context manager
 */
export class TestContext {
  private device: TestDevice | null = null;
  private memoryTracker: MemoryTracker = new MemoryTracker();
  private timer: PerformanceTimer = new PerformanceTimer();

  async setup(): Promise<void> {
    const { createMockDevice } = await import('../mocks/webgpu-mock.js');
    this.device = new TestDevice(createMockDevice());
    await this.memoryTracker.start();
  }

  async teardown(): Promise<void> {
    if (this.device) {
      await this.device.cleanup();
      this.device = null;
    }
  }

  getDevice(): MockGPUDevice {
    if (!this.device) {
      throw new Error('Test context not initialized. Call setup() first.');
    }
    return this.device.device;
  }

  getMemoryTracker(): MemoryTracker {
    return this.memoryTracker;
  }

  getTimer(): PerformanceTimer {
    return this.timer;
  }
}

/**
 * Benchmark utilities
 */
export class Benchmark {
  static async measure(
    name: string,
    iterations: number,
    fn: () => Promise<void>
  ): Promise<{ name: string; iterations: number; totalTime: number; avgTime: number; opsPerSecond: number }> {
    const timer = new PerformanceTimer();
    timer.start();

    for (let i = 0; i < iterations; i++) {
      await fn();
    }

    const totalTime = timer.end();
    const avgTime = totalTime / iterations;
    const opsPerSecond = 1000 / avgTime;

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      opsPerSecond,
    };
  }

  static measureSync<T>(
    name: string,
    iterations: number,
    fn: () => T
  ): { name: string; iterations: number; totalTime: number; avgTime: number; opsPerSecond: number; result: T } {
    const timer = new PerformanceTimer();
    timer.start();

    let result: T;
    for (let i = 0; i < iterations; i++) {
      result = fn();
    }

    const totalTime = timer.end();
    const avgTime = totalTime / iterations;
    const opsPerSecond = 1000 / avgTime;

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      opsPerSecond,
      result: result!,
    };
  }
}

/**
 * Assertion helpers
 */
export class CustomAssertions {
  static assertPerformance(
    duration: number,
    maxDuration: number,
    operation: string
  ): void {
    expect(duration).toBeLessThanOrEqual(maxDuration);
  }

  static assertMemoryUsage(
    tracker: MemoryTracker,
    maxMemory: number,
    operation: string
  ): void {
    const memory = tracker.getTrackedMemory();
    expect(memory).toBeLessThanOrEqual(maxMemory);
  }

  static assertArrayCloseTo(
    actual: Float32Array,
    expected: Float32Array,
    tolerance = 0.0001,
    message = 'Arrays are not close enough'
  ): void {
    expect(ArrayComparer.equal(actual, expected, tolerance)).toBe(true);
  }

  static assert60FPS(
    duration: number,
    message = 'Operation did not meet 60 FPS target (16.67ms)'
  ): void {
    expect(duration).toBeLessThanOrEqual(16.67);
  }
}

/**
 * Test suite generator for matrix operations
 */
export function generateMatrixTestSuites(
  sizes: number[],
  testFn: (size: number) => Promise<void> | void
): void {
  describe.each(sizes.map(size => ({ size })))('Matrix size: $size', ({ size }) => {
    it(`should handle ${size}x${size} matrices`, async () => {
      await testFn(size);
    });
  });
}

/**
 * Retry helper for flaky WebGPU tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * WebGPU feature detection
 */
export class WebGPUFeatureDetector {
  static hasWebGPU(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  static getAdapterInfo(): string {
    if (!this.hasWebGPU()) {
      return 'WebGPU not available';
    }
    return 'WebGPU available';
  }

  static skipIfNoWebGPU(): void {
    if (!this.hasWebGPU()) {
      return;
    }
  }
}

/**
 * Mock data generators for LLM testing
 */
export class LLMTestDataGenerator {
  static generateRandomTokens(vocabSize: number, sequenceLength: number): Uint32Array {
    const tokens = new Uint32Array(sequenceLength);
    for (let i = 0; i < sequenceLength; i++) {
      tokens[i] = Math.floor(Math.random() * vocabSize);
    }
    return tokens;
  }

  static generateEmbeddingSequence(embeddingDim: number, sequenceLength: number): Float32Array {
    const embeddings = new Float32Array(embeddingDim * sequenceLength);
    for (let i = 0; i < embeddings.length; i++) {
      embeddings[i] = Math.random() * 2 - 1; // Random values between -1 and 1
    }
    return embeddings;
  }

  static generateAttentionMask(sequenceLength: number): Uint8Array {
    const mask = new Uint8Array(sequenceLength);
    for (let i = 0; i < sequenceLength; i++) {
      mask[i] = 1; // All tokens are valid
    }
    return mask;
  }
}
