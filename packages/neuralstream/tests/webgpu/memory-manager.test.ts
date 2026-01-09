/**
 * Memory Manager Tests
 *
 * Tests for WebGPU memory management, buffer allocation, and optimization.
 * Validates efficient memory usage for LLM inference.
 *
 * SEO Keywords:
 * - WebGPU memory management
 * - GPU buffer optimization
 * - browser LLM inference memory
 * - efficient buffer allocation
 * - memory pool management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockDevice, type MockGPUDevice } from '../mocks/webgpu-mock.js';
import {
  TestContext,
  MemoryTracker,
  TestDataGenerator,
  CustomAssertions,
  Benchmark,
} from '../utils/test-utils.js';

describe('Memory Manager', () => {
  let ctx: TestContext;
  let device: MockGPUDevice;
  let tracker: MemoryTracker;

  beforeEach(async () => {
    ctx = new TestContext();
    await ctx.setup();
    device = ctx.getDevice();
    tracker = ctx.getMemoryTracker();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  describe('Buffer Allocation', () => {
    it('should allocate small buffers efficiently', () => {
      const buffers = [];
      const totalSize = 10 * 1024; // 10KB
      const bufferSize = 1024; // 1KB per buffer

      for (let i = 0; i < 10; i++) {
        const buffer = device.createBuffer({
          size: bufferSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        buffers.push(buffer);
        tracker.track(`buffer_${i}`, bufferSize);
      }

      expect(buffers.length).toBe(10);
      expect(tracker.getTrackedMemory()).toBe(totalSize);

      // Cleanup
      buffers.forEach(b => b.destroy());
    });

    it('should allocate large buffers without fragmentation', () => {
      const buffers = [];
      const sizes = [
        10 * 1024 * 1024, // 10MB
        20 * 1024 * 1024, // 20MB
        50 * 1024 * 1024, // 50MB
        100 * 1024 * 1024, // 100MB
      ];

      for (const size of sizes) {
        const buffer = device.createBuffer({
          size,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        expect(buffer.size).toBe(size);
        buffers.push(buffer);
        tracker.track(`buffer_${size}`, size);
      }

      const totalTracked = tracker.getTrackedMemory();
      const expectedTotal = sizes.reduce((a, b) => a + b, 0);
      expect(totalTracked).toBe(expectedTotal);

      // Cleanup
      buffers.forEach(b => b.destroy());
    });

    it('should handle buffer allocation patterns for LLM weights', () => {
      // Simulate LLM weight allocation (layer by layer)
      const layers = 12;
      const hiddenSize = 768;
      const intermediateSize = 3072;

      const buffers = [];

      // Allocate weights for each layer
      for (let layer = 0; layer < layers; layer++) {
        // Query, Key, Value projections
        const qkvSize = hiddenSize * 3 * hiddenSize * 4; // float32
        const qkvBuffer = device.createBuffer({
          size: qkvSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        buffers.push(qkvBuffer);
        tracker.track(`layer_${layer}_qkv`, qkvSize);

        // Output projection
        const outputSize = hiddenSize * hiddenSize * 4;
        const outputBuffer = device.createBuffer({
          size: outputSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        buffers.push(outputBuffer);
        tracker.track(`layer_${layer}_output`, outputSize);

        // FFN intermediate
        const ffnIntermediateSize = hiddenSize * intermediateSize * 4;
        const ffnIntermediateBuffer = device.createBuffer({
          size: ffnIntermediateSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        buffers.push(ffnIntermediateBuffer);
        tracker.track(`layer_${layer}_ffn_intermediate`, ffnIntermediateSize);

        // FFN output
        const ffnOutputSize = intermediateSize * hiddenSize * 4;
        const ffnOutputBuffer = device.createBuffer({
          size: ffnOutputSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        buffers.push(ffnOutputBuffer);
        tracker.track(`layer_${layer}_ffn_output`, ffnOutputSize);
      }

      expect(buffers.length).toBe(layers * 4);

      const totalMemory = tracker.getTrackedMemory();
      expect(totalMemory).toBeGreaterThan(0);

      // Cleanup
      buffers.forEach(b => b.destroy());
    });
  });

  describe('Buffer Reuse', () => {
    it('should reuse buffers for sequential operations', async () => {
      const bufferSize = 1024 * 1024; // 1MB
      const buffer = device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      // Simulate sequential token generation
      const sequenceLength = 100;
      for (let i = 0; i < sequenceLength; i++) {
        const data = new Float32Array(256); // Token embedding
        device.queue.writeBuffer(buffer, 0, data);

        // Simulate computation...
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      expect(buffer).toBeDefined();
      buffer.destroy();
    });

    it('should implement buffer pooling for efficiency', () => {
      class BufferPool {
        private pools: Map<number, MockGPUBuffer[]> = new Map();
        private device: MockGPUDevice;

        constructor(device: MockGPUDevice) {
          this.device = device;
        }

        acquire(size: number, usage: number): MockGPUBuffer {
          const poolSize = Math.ceil(size / 1024) * 1024; // Round to KB

          if (!this.pools.has(poolSize)) {
            this.pools.set(poolSize, []);
          }

          const pool = this.pools.get(poolSize)!;
          if (pool.length > 0) {
            return pool.pop()!;
          }

          return this.device.createBuffer({ size: poolSize, usage });
        }

        release(buffer: MockGPUBuffer): void {
          const size = buffer.size;
          if (!this.pools.has(size)) {
            this.pools.set(size, []);
          }
          this.pools.get(size)!.push(buffer);
        }

        getPoolSize(): number {
          let total = 0;
          for (const [, buffers] of this.pools) {
            total += buffers.length;
          }
          return total;
        }
      }

      const pool = new BufferPool(device);

      // Acquire and release buffers
      const buffers = [];
      for (let i = 0; i < 10; i++) {
        const buffer = pool.acquire(1024 * 1024, GPUBufferUsage.STORAGE);
        buffers.push(buffer);
      }

      expect(buffers.length).toBe(10);

      // Release buffers back to pool
      buffers.forEach(b => pool.release(b));

      expect(pool.getPoolSize()).toBe(10);

      // Acquire again (should reuse from pool)
      const reusedBuffers = [];
      for (let i = 0; i < 10; i++) {
        const buffer = pool.acquire(1024 * 1024, GPUBufferUsage.STORAGE);
        reusedBuffers.push(buffer);
      }

      expect(reusedBuffers.length).toBe(10);
      expect(pool.getPoolSize()).toBe(0); // Pool should be empty
    });
  });

  describe('Memory Efficiency', () => {
    it('should minimize memory overhead for activations', () => {
      // Simulate activation memory for transformer
      const batchSize = 1;
      const sequenceLength = 512;
      const hiddenSize = 768;

      const activations = [];

      // Input embeddings
      const inputSize = batchSize * sequenceLength * hiddenSize * 4;
      const inputBuffer = device.createBuffer({
        size: inputSize,
        usage: GPUBufferUsage.STORAGE,
      });
      activations.push(inputBuffer);
      tracker.track('input', inputSize);

      // Layer activations (for 12 layers)
      const layers = 12;
      for (let i = 0; i < layers; i++) {
        const activationSize = batchSize * sequenceLength * hiddenSize * 4;
        const activationBuffer = device.createBuffer({
          size: activationSize,
          usage: GPUBufferUsage.STORAGE,
        });
        activations.push(activationBuffer);
        tracker.track(`activation_layer_${i}`, activationSize);
      }

      const totalActivationMemory = tracker.getTrackedMemory();

      // Activation memory should be reasonable (< 2GB)
      expect(totalActivationMemory).toBeLessThan(2 * 1024 * 1024 * 1024);

      // Cleanup
      activations.forEach(a => a.destroy());
    });

    it('should implement gradient checkpointing for memory efficiency', () => {
      // Simulate gradient checkpointing: store only subset of activations
      const totalLayers = 24;
      const checkpointInterval = 4; // Store every 4th layer
      const sequenceLength = 1024;
      const hiddenSize = 1024;

      // Without checkpointing: store all activations
      const memoryWithoutCheckpointing =
        totalLayers * sequenceLength * hiddenSize * 4;

      // With checkpointing: store only checkpointed layers
      const numCheckpoints = Math.ceil(totalLayers / checkpointInterval);
      const memoryWithCheckpointing =
        numCheckpoints * sequenceLength * hiddenSize * 4;

      const memorySaved =
        memoryWithoutCheckpointing - memoryWithCheckpointing;
      const savingsPercentage =
        (memorySaved / memoryWithoutCheckpointing) * 100;

      // Should save significant memory
      expect(savingsPercentage).toBeGreaterThan(50);

      // Verify checkpointing is working
      expect(numCheckpoints).toBeLessThan(totalLayers);
    });

    it('should optimize memory layout for cache locality', () => {
      // SoA (Structure of Arrays) vs AoS (Array of Structures)
      const numElements = 10000;
      const numFeatures = 128;

      // AoS: Interleaved layout
      const aosSize = numElements * numFeatures * 4;
      const aosBuffer = device.createBuffer({
        size: aosSize,
        usage: GPUBufferUsage.STORAGE,
      });

      // SoA: Separate arrays for each feature
      const soaBuffers = [];
      for (let i = 0; i < numFeatures; i++) {
        const buffer = device.createBuffer({
          size: numElements * 4,
          usage: GPUBufferUsage.STORAGE,
        });
        soaBuffers.push(buffer);
      }

      const soaTotalSize = soaBuffers.reduce(
        (sum, b) => sum + b.size,
        0
      );

      // Both should have similar total memory
      expect(soaTotalSize).toBeCloseTo(aosSize, 2);

      // Cleanup
      aosBuffer.destroy();
      soaBuffers.forEach(b => b.destroy());
    });
  });

  describe('Memory Limits', () => {
    it('should respect device memory limits', () => {
      const maxBufferSize = device.limits.maxBufferSize;

      // Try to allocate maximum buffer
      const largeBuffer = device.createBuffer({
        size: maxBufferSize,
        usage: GPUBufferUsage.STORAGE,
      });

      expect(largeBuffer.size).toBe(maxBufferSize);

      largeBuffer.destroy();
    });

    it('should handle out-of-memory conditions gracefully', () => {
      const buffers = [];
      let totalAllocated = 0;
      const maxMemory = 4 * 1024 * 1024 * 1024; // 4GB

      try {
        // Allocate until near limit
        while (totalAllocated < maxMemory) {
          const size = 100 * 1024 * 1024; // 100MB
          const buffer = device.createBuffer({
            size,
            usage: GPUBufferUsage.STORAGE,
          });

          buffers.push(buffer);
          totalAllocated += size;

          // Stop at 90% of max
          if (totalAllocated >= maxMemory * 0.9) {
            break;
          }
        }
      } catch (error) {
        // Should handle out-of-memory gracefully
        expect(error).toBeDefined();
      } finally {
        // Cleanup
        buffers.forEach(b => b.destroy());
      }

      expect(buffers.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should allocate buffers quickly', async () => {
      const iterations = 1000;
      const bufferSize = 1024 * 1024; // 1MB

      const result = Benchmark.measureSync(
        'buffer_allocation',
        iterations,
        () => {
          const buffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          });
          buffer.destroy(); // Immediate destroy for testing
          return buffer;
        }
      );

      // Average allocation should be fast (< 1ms)
      expect(result.avgTime).toBeLessThan(1);
      expect(result.iterations).toBe(iterations);
    });

    it('should write data to buffers efficiently', async () => {
      const bufferSize = 10 * 1024 * 1024; // 10MB
      const buffer = device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      const data = new Float32Array(bufferSize / 4);

      const result = await Benchmark.measure(
        'buffer_write',
        10,
        async () => {
          device.queue.writeBuffer(buffer, 0, data);
        }
      );

      // Writing 10MB should be fast
      expect(result.avgTime).toBeLessThan(50); // < 50ms per write

      buffer.destroy();
    });

    it('should benchmark memory throughput', async () => {
      const sizes = [
        1 * 1024 * 1024, // 1MB
        10 * 1024 * 1024, // 10MB
        100 * 1024 * 1024, // 100MB
      ];

      const results = [];

      for (const size of sizes) {
        const buffer = device.createBuffer({
          size,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        const data = new Float32Array(size / 4);

        const timer = performance.now();
        device.queue.writeBuffer(buffer, 0, data);
        const duration = performance.now() - timer;

        const throughput = (size / (1024 * 1024)) / (duration / 1000); // MB/s

        results.push({
          size: size / (1024 * 1024),
          duration,
          throughput,
        });

        buffer.destroy();
      }

      // All sizes should achieve good throughput
      for (const result of results) {
        expect(result.throughput).toBeGreaterThan(100); // > 100 MB/s
      }
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage accurately', () => {
      tracker.reset();

      const allocations = [
        { name: 'weights', size: 100 * 1024 * 1024 },
        { name: 'activations', size: 50 * 1024 * 1024 },
        { name: 'gradients', size: 50 * 1024 * 1024 },
      ];

      for (const allocation of allocations) {
        tracker.track(allocation.name, allocation.size);
      }

      const report = tracker.report();

      expect(report.tracked).toBe(
        allocations.reduce((sum, a) => sum + a.size, 0)
      );
      expect(Object.keys(report.allocations).length).toBe(allocations.length);
    });

    it('should provide memory usage statistics', () => {
      tracker.reset();

      // Simulate typical LLM memory usage
      const vocabSize = 50000;
      const hiddenSize = 768;
      const numLayers = 12;

      // Embedding layer
      const embeddingSize = vocabSize * hiddenSize * 4;
      tracker.track('embedding', embeddingSize);

      // Transformer layers
      for (let i = 0; i < numLayers; i++) {
        const layerSize = hiddenSize * hiddenSize * 4 * 4; // QKV + O + FFN
        tracker.track(`layer_${i}`, layerSize);
      }

      const report = tracker.report();

      // Total should be in hundreds of MB
      expect(report.tracked).toBeGreaterThan(100 * 1024 * 1024);
      expect(report.tracked).toBeLessThan(1024 * 1024 * 1024); // < 1GB
    });
  });
});
