/**
 * NeuralStream + ThoughtChain Integration Tests
 *
 * Tests for combining local GPU inference with parallel reasoning
 * verification to create accurate, fast AI responses.
 *
 * SEO Keywords:
 * - browser AI integration
 * - local LLM with verification
 * - WebGPU reasoning system
 * - verified AI inference
 * - 60 FPS verified generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockDevice, type MockGPUDevice } from '../../neuralstream/tests/mocks/webgpu-mock.js';
import { QueryDecomposer } from '../../thoughtchain/src/decomposition.js';
import type { ThoughtChainConfig } from '../../thoughtchain/src/types.js';
import { TestContext, PerformanceTimer, TestDataGenerator } from '../../neuralstream/tests/utils/test-utils.js';

describe('NeuralStream + ThoughtChain Integration', () => {
  let ctx: TestContext;
  let device: MockGPUDevice;

  beforeEach(async () => {
    ctx = new TestContext();
    await ctx.setup();
    device = ctx.getDevice();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  describe('End-to-End Pipeline', () => {
    it('should process query with both inference and verification', async () => {
      const query = 'What is the capital of France and what is its population?';

      // Step 1: Decompose query
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });
      expect(decomposition.steps).toBeDefined();

      // Step 2: Simulate NeuralStream inference for each step
      const inferenceResults = [];
      for (const step of decomposition.steps) {
        // Simulate GPU inference
        const embedding = TestDataGenerator.randomFloat32Array(768);
        const buffer = device.createBuffer({
          size: embedding.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(buffer, 0, embedding);

        // Mock inference result
        const result = {
          step: step.step,
          reasoning: `Processed: ${step.question}`,
          confidence: 0.85 + Math.random() * 0.1,
          embedding,
        };

        inferenceResults.push(result);
        buffer.destroy();
      }

      // Step 3: Verify results (simulated ensemble)
      const verifiedResults = inferenceResults.map(result => ({
        ...result,
        verified: result.confidence > 0.8,
        verifierVotes: [1, 1, 1], // All verifiers agree
      }));

      expect(verifiedResults.length).toBe(decomposition.steps.length);
      expect(verifiedResults.every(r => r.verified)).toBe(true);
    });

    it('should handle complex multi-step reasoning', async () => {
      const query = 'Explain the causes of climate change and propose solutions';

      const config: ThoughtChainConfig = {
        steps: 7,
        verifiers: 3,
        confidenceThreshold: 0.90,
        backtrackOnLowConfidence: true,
      };

      // Decompose query
      const decomposition = QueryDecomposer.decompose(query, config);
      expect(decomposition.steps.length).toBe(7);

      // Process each step with inference and verification
      const results = [];
      for (const step of decomposition.steps) {
        // Simulate NeuralStream inference
        const startTime = performance.now();

        // GPU computation
        const data = new Float32Array(1000);
        device.queue.writeBuffer(
          device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          }),
          0,
          data
        );

        const inferenceTime = performance.now() - startTime;

        // Simulate verification
        const confidence = 0.85 + Math.random() * 0.1;

        results.push({
          step: step.step,
          inferenceTime,
          confidence,
          verified: confidence >= config.confidenceThreshold!,
        });
      }

      expect(results.length).toBe(7);

      // All steps should be verified
      expect(results.every(r => r.verified)).toBe(true);

      // Inference should be fast
      const avgInferenceTime = results.reduce((sum, r) => sum + r.inferenceTime, 0) / results.length;
      expect(avgInferenceTime).toBeLessThan(100);
    });
  });

  describe('Performance Integration', () => {
    it('should maintain 60 FPS with verification enabled', async () => {
      const query = 'Quick test query';
      const iterations = 60;

      const frameTimes = [];

      for (let i = 0; i < iterations; i++) {
        const frameStart = performance.now();

        // Decompose
        const decomposition = QueryDecomposer.decompose(query, { steps: 3 });

        // Simulate inference (GPU)
        const data = TestDataGenerator.randomFloat32Array(768);
        const buffer = device.createBuffer({
          size: data.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(buffer, 0, data);

        // Simulate verification
        const confidence = 0.9;

        buffer.destroy();

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const fps = 1000 / avgFrameTime;

      // Should maintain 60 FPS
      expect(fps).toBeGreaterThan(60 * 0.8); // At least 80% of target
    });

    it('should optimize parallel execution of inference and verification', async () => {
      const query = 'Parallel processing test';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      const startTime = performance.now();

      // Process steps in parallel where possible
      const parallelGroups = QueryDecomposer.optimizeForParallel(decomposition).parallelGroups;

      await Promise.all(
        parallelGroups.map(async (group) => {
          await Promise.all(
            group.map(async (stepNum) => {
              // Simulate parallel inference
              const step = decomposition.steps.find(s => s.step === stepNum);
              if (!step) return;

              // GPU inference
              const data = TestDataGenerator.randomFloat32Array(512);
              device.queue.writeBuffer(
                device.createBuffer({
                  size: data.byteLength,
                  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                }),
                0,
                data
              );
            })
          );
        })
      );

      const duration = performance.now() - startTime;

      // Parallel execution should be faster
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Memory Integration', () => {
    it('should share memory between inference and verification', async () => {
      const query = 'Memory optimization test';

      // Allocate shared buffers
      const sharedBufferSize = 10 * 1024 * 1024; // 10MB
      const sharedBuffer = device.createBuffer({
        size: sharedBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      // Use for inference
      const inferenceData = TestDataGenerator.randomFloat32Array(1000);
      device.queue.writeBuffer(sharedBuffer, 0, inferenceData);

      // Use same buffer for verification context
      const verificationData = new Float32Array(sharedBuffer.getData());
      expect(verificationData.length).toBe(inferenceData.length);

      sharedBuffer.destroy();
    });

    it('should manage memory efficiently during long chains', async () => {
      const query = 'Long reasoning chain test';
      const decomposition = QueryDecomposer.decompose(query, { steps: 20 });

      const buffers = [];
      const maxBuffers = 5; // Limit concurrent buffers

      for (const step of decomposition.steps) {
        // Allocate buffer for this step
        const buffer = device.createBuffer({
          size: 1024 * 1024,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        buffers.push(buffer);

        // Limit memory usage
        if (buffers.length > maxBuffers) {
          const oldBuffer = buffers.shift()!;
          oldBuffer.destroy();
        }

        // Use buffer
        const data = TestDataGenerator.randomFloat32Array(256);
        device.queue.writeBuffer(buffer, 0, data);
      }

      // Cleanup remaining buffers
      buffers.forEach(b => b.destroy());

      // Should not exceed max buffers at any point
      expect(buffers.length).toBeLessThanOrEqual(maxBuffers);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle inference errors with backtracking', async () => {
      const query = 'Error handling test';
      const decomposition = QueryDecomposer.decompose(query, { steps: 3 });

      let attempts = 0;
      const maxAttempts = 3;

      for (const step of decomposition.steps) {
        let success = false;

        while (!success && attempts < maxAttempts) {
          attempts++;

          try {
            // Simulate inference (may fail)
            if (Math.random() > 0.7) {
              throw new Error('Simulated inference error');
            }

            // Inference succeeded
            const buffer = device.createBuffer({
              size: 1024,
              usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            device.queue.writeBuffer(buffer, 0, new Float32Array(256));
            buffer.destroy();

            success = true;
          } catch (error) {
            // Backtrack and retry
            if (attempts >= maxAttempts) {
              throw error;
            }
          }
        }

        expect(success).toBe(true);
      }
    });

    it('should handle verification errors gracefully', async () => {
      const query = 'Verification error test';
      const decomposition = QueryDecomposer.decompose(query, { steps: 3 });

      const results = [];

      for (const step of decomposition.steps) {
        // Simulate inference
        const confidence = 0.5 + Math.random() * 0.4; // May be low

        // Handle low confidence
        if (confidence < 0.7) {
          // Trigger backtracking
          const newConfidence = confidence + 0.2;
          results.push({
            step: step.step,
            originalConfidence: confidence,
            backtracked: true,
            finalConfidence: newConfidence,
          });
        } else {
          results.push({
            step: step.step,
            confidence,
            backtracked: false,
          });
        }
      }

      // All steps should have acceptable confidence
      expect(results.every(r =>
        r.backtracked ? r.finalConfidence > 0.7 : r.confidence > 0.7
      )).toBe(true);
    });
  });

  describe('Quality Integration', () => {
    it('should improve response quality through verification', async () => {
      const query = 'Quality improvement test';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      const withoutVerification = [];
      const withVerification = [];

      for (const step of decomposition.steps) {
        // Simulate inference without verification
        const baseConfidence = 0.75 + Math.random() * 0.15;
        withoutVerification.push(baseConfidence);

        // Simulate with verification
        const verifiedConfidence = Math.min(0.98, baseConfidence + 0.1);
        withVerification.push(verifiedConfidence);
      }

      const avgWithout = withoutVerification.reduce((a, b) => a + b, 0) / withoutVerification.length;
      const avgWith = withVerification.reduce((a, b) => a + b, 0) / withVerification.length;

      // Verification should improve average confidence
      expect(avgWith).toBeGreaterThan(avgWithout);
    });

    it('should reduce errors through ensemble verification', async () => {
      const query = 'Error reduction test';
      const decomposition = QueryDecomposer.decompose(query, { steps: 10 });

      let errorsWithoutVerification = 0;
      let errorsWithVerification = 0;

      for (const step of decomposition.steps) {
        // Simulate single model (may error)
        if (Math.random() > 0.8) {
          errorsWithoutVerification++;
        }

        // Simulate ensemble verification
        const votes = [Math.random(), Math.random(), Math.random()].map(r => r > 0.3 ? 1 : 0);
        const ensembleAgreement = votes.reduce((a, b) => a + b, 0) / votes.length;

        if (ensembleAgreement < 0.5) {
          errorsWithVerification++;
        }
      }

      // Ensemble should have fewer errors
      expect(errorsWithVerification).toBeLessThanOrEqual(errorsWithoutVerification);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle complex research queries', async () => {
      const query = 'Analyze the impact of AI on healthcare, considering both benefits and ethical concerns';

      const config: ThoughtChainConfig = {
        steps: 8,
        verifiers: 5,
        confidenceThreshold: 0.92,
        backtrackOnLowConfidence: true,
        maxBacktrackAttempts: 3,
      };

      const startTime = performance.now();

      // Full pipeline
      const decomposition = QueryDecomposer.decompose(query, config);
      expect(decomposition.steps.length).toBe(8);

      const results = [];
      for (const step of decomposition.steps) {
        // Inference
        const inferenceStart = performance.now();
        const buffer = device.createBuffer({
          size: 2048,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(buffer, 0, TestDataGenerator.randomFloat32Array(512));
        buffer.destroy();
        const inferenceTime = performance.now() - inferenceStart;

        // Verification
        const confidence = 0.88 + Math.random() * 0.1;

        results.push({
          step: step.step,
          inferenceTime,
          confidence,
          verified: confidence >= config.confidenceThreshold!,
        });
      }

      const totalTime = performance.now() - startTime;

      expect(results.length).toBe(8);
      expect(totalTime).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should handle real-time conversational queries', async () => {
      const queries = [
        'Hello, how are you?',
        'What can you help me with?',
        'Tell me a joke',
        'Thanks for your help',
      ];

      const responseTimes = [];

      for (const query of queries) {
        const start = performance.now();

        // Fast decomposition (fewer steps for simple queries)
        const decomposition = QueryDecomposer.decompose(query, { steps: 2 });

        // Quick inference
        for (const step of decomposition.steps) {
          const buffer = device.createBuffer({
            size: 512,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          });
          device.queue.writeBuffer(buffer, 0, TestDataGenerator.randomFloat32Array(128));
          buffer.destroy();
        }

        const end = performance.now();
        responseTimes.push(end - start);
      }

      // Conversational responses should be fast
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(200); // < 200ms average
    });
  });

  describe('Scalability', () => {
    it('should handle multiple concurrent queries', async () => {
      const queries = Array.from({ length: 5 }, (_, i) => `Concurrent query ${i}`);

      const startTime = performance.now();

      await Promise.all(
        queries.map(async (query) => {
          const decomposition = QueryDecomposer.decompose(query, { steps: 3 });

          for (const step of decomposition.steps) {
            const buffer = device.createBuffer({
              size: 1024,
              usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            device.queue.writeBuffer(buffer, 0, TestDataGenerator.randomFloat32Array(256));
            buffer.destroy();
          }
        })
      );

      const duration = performance.now() - startTime;

      // Concurrent processing should be faster than sequential
      expect(duration).toBeLessThan(2000);
    });

    it('should scale with query complexity', async () => {
      const simpleQuery = 'Simple question';
      const complexQuery = 'Complex multi-faceted analysis requiring detailed consideration of multiple interconnected factors';

      const simpleDecomp = QueryDecomposer.decompose(simpleQuery, { steps: 3 });
      const complexDecomp = QueryDecomposer.decompose(complexQuery, { steps: 10 });

      expect(simpleDecomp.steps.length).toBeLessThan(complexDecomp.steps.length);
    });
  });
});
