/**
 * WebGPU Compute Shaders Tests
 *
 * Tests for WebGPU compute shader compilation, execution, and performance.
 * These tests validate the core GPU acceleration capabilities.
 *
 * SEO Keywords:
 * - WebGPU compute shaders
 * - GPU acceleration
 * - browser machine learning
 * - parallel computing
 * - 60 FPS inference
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupWebGPUMock, createMockDevice, type MockGPUDevice } from '../mocks/webgpu-mock.js';
import {
  TestContext,
  PerformanceTimer,
  TestDataGenerator,
  CustomAssertions,
  Benchmark,
  retry,
} from '../utils/test-utils.js';

describe('WebGPU Compute Shaders', () => {
  let ctx: TestContext;
  let device: MockGPUDevice;

  beforeEach(async () => {
    setupWebGPUMock();
    ctx = new TestContext();
    await ctx.setup();
    device = ctx.getDevice();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  describe('Shader Compilation', () => {
    it('should compile basic compute shader', async () => {
      const shaderCode = `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          if (global_id.x >= arrayLength(&input)) {
            return;
          }
          output[global_id.x] = input[global_id.x] * 2.0;
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });
      expect(shaderModule).toBeDefined();
      expect(shaderModule.code).toBe(shaderCode);

      const compilationInfo = await shaderModule.compilationInfo;
      expect(compilationInfo.messages).toBeDefined();
    });

    it('should compile matrix multiplication shader', async () => {
      const shaderCode = `
        struct MatrixParams {
          dim: u32,
        };

        @group(0) @binding(0) var<uniform> params: MatrixParams;
        @group(0) @binding(1) var<storage, read> A: array<f32>;
        @group(0) @binding(2) var<storage, read> B: array<f32>;
        @group(0) @binding(3) var<storage, read_write> C: array<f32>;

        @compute @workgroup_size(16, 16)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let row = global_id.x;
          let col = global_id.y;
          let dim = params.dim;

          if (row >= dim || col >= dim) {
            return;
          }

          var sum: f32 = 0.0;
          for (var k: u32 = 0; k < dim; k = k + 1) {
            sum = sum + A[row * dim + k] * B[k * dim + col];
          }
          C[row * dim + col] = sum;
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });
      expect(shaderModule).toBeDefined();

      const compilationInfo = await shaderModule.compilationInfo;
      expect(compilationInfo.messages.length).toBe(0);
    });

    it('should handle complex attention mechanism shader', async () => {
      const shaderCode = `
        struct AttentionParams {
          seq_len: u32,
          head_dim: u32,
        };

        @group(0) @binding(0) var<uniform> params: AttentionParams;
        @group(0) @binding(1) var<storage, read> Q: array<f32>;
        @group(0) @binding(2) var<storage, read> K: array<f32>;
        @group(0) @binding(3) var<storage, read> V: array<f32>;
        @group(0) @binding(4) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let seq_len = params.seq_len;
          let head_dim = params.head_dim;
          let token_idx = global_id.x;

          if (token_idx >= seq_len) {
            return;
          }

          // Compute attention scores
          var scores: array<f32, 1024>;
          for (var i: u32 = 0; i < seq_len; i = i + 1) {
            var dot: f32 = 0.0;
            for (var j: u32 = 0; j < head_dim; j = j + 1) {
              dot = dot + Q[token_idx * head_dim + j] * K[i * head_dim + j];
            }
            scores[i] = dot / sqrt(f32(head_dim));
          }

          // Softmax
          var max_score: f32 = scores[0];
          for (var i: u32 = 1; i < seq_len; i = i + 1) {
            max_score = max(max_score, scores[i]);
          }

          var exp_sum: f32 = 0.0;
          for (var i: u32 = 0; i < seq_len; i = i + 1) {
            scores[i] = exp(scores[i] - max_score);
            exp_sum = exp_sum + scores[i];
          }

          // Weighted sum of values
          for (var j: u32 = 0; j < head_dim; j = j + 1) {
            var weighted: f32 = 0.0;
            for (var i: u32 = 0; i < seq_len; i = i + 1) {
              weighted = weighted + (scores[i] / exp_sum) * V[i * head_dim + j];
            }
            output[token_idx * head_dim + j] = weighted;
          }
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });
      expect(shaderModule).toBeDefined();
    });
  });

  describe('Pipeline Creation', () => {
    it('should create compute pipeline', async () => {
      const shaderCode = `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          output[global_id.x] = input[global_id.x] * 2.0;
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });

      const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        ],
      });

      const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });

      const pipeline = device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });

      expect(pipeline).toBeDefined();
      expect(pipeline.getComputeStage()).toBeDefined();
    });

    it('should create multiple pipelines efficiently', async () => {
      const timer = new PerformanceTimer();
      timer.start();

      const pipelines = [];
      for (let i = 0; i < 10; i++) {
        const shaderCode = `
          @group(0) @binding(0) var<storage, read> input: array<f32>;
          @group(0) @binding(1) var<storage, read_write> output: array<f32>;

          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            output[global_id.x] = input[global_id.x] * ${2.0 + i * 0.1};
          }
        `;

        const shaderModule = device.createShaderModule({ code: shaderCode });
        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
        });

        const pipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout],
        });

        const pipeline = device.createComputePipeline({
          layout: pipelineLayout,
          compute: { module: shaderModule, entryPoint: 'main' },
        });

        pipelines.push(pipeline);
      }

      const duration = timer.end();

      expect(pipelines.length).toBe(10);
      // Pipeline creation should be fast (< 100ms for 10 pipelines)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Compute Dispatch', () => {
    it('should dispatch basic compute shader', async () => {
      const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const output = new Float32Array(input.length);

      const shaderCode = `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let idx = global_id.x;
          if (idx >= arrayLength(&input)) {
            return;
          }
          output[idx] = input[idx] * 2.0;
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });
      const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        ],
      });

      const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });

      const pipeline = device.createComputePipeline({
        layout: pipelineLayout,
        compute: { module: shaderModule, entryPoint: 'main' },
      });

      const inputBuffer = device.createBuffer({
        size: input.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      new Float32Array(inputBuffer.getData()).set(input);
      inputBuffer.unmap();

      const outputBuffer = device.createBuffer({
        size: output.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: inputBuffer } },
          { binding: 1, resource: { buffer: outputBuffer } },
        ],
      });

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(input.length / 64));
      passEncoder.end();

      const commandBuffer = commandEncoder.finish();
      device.queue.submit([commandBuffer]);

      // Verify dispatch was successful
      expect(commandBuffer).toBeDefined();
    });

    it('should handle large workgroup dispatch', async () => {
      const size = 10000;
      const shaderCode = `
        @group(0) @binding(0) var<storage, read_write> data: array<f32>;

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let idx = global_id.x;
          if (idx >= ${size}u) {
            return;
          }
          data[idx] = f32(idx);
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });
      const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        ],
      });

      const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
      const pipeline = device.createComputePipeline({
        layout: pipelineLayout,
        compute: { module: shaderModule, entryPoint: 'main' },
      });

      const dataBuffer = device.createBuffer({
        size: size * 4,
        usage: GPUBufferUsage.STORAGE,
      });

      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: dataBuffer } }],
      });

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(size / 256));
      passEncoder.end();

      const commandBuffer = commandEncoder.finish();
      device.queue.submit([commandBuffer]);

      expect(commandBuffer).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should meet 60 FPS target for simple operations', async () => {
      const timer = new PerformanceTimer();
      const iterations = 100;

      const durations: number[] = [];
      for (let i = 0; i < iterations; i++) {
        timer.start();

        const shaderCode = `
          @group(0) @binding(0) var<storage, read> input: array<f32>;
          @group(0) @binding(1) var<storage, read_write> output: array<f32>;

          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            output[global_id.x] = input[global_id.x] * 2.0;
          }
        `;

        const shaderModule = device.createShaderModule({ code: shaderCode });
        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
        });

        const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
        const pipeline = device.createComputePipeline({
          layout: pipelineLayout,
          compute: { module: shaderModule, entryPoint: 'main' },
        });

        const input = new Float32Array(1000);
        const inputBuffer = device.createBuffer({
          size: input.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true,
        });
        new Float32Array(inputBuffer.getData()).set(input);
        inputBuffer.unmap();

        const outputBuffer = device.createBuffer({
          size: input.byteLength,
          usage: GPUBufferUsage.STORAGE,
        });

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: inputBuffer } },
            { binding: 1, resource: { buffer: outputBuffer } },
          ],
        });

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(input.length / 64));
        passEncoder.end();

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);

        const duration = timer.end();
        durations.push(duration);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      // 60 FPS = 16.67ms per frame
      CustomAssertions.assert60FPS(avgDuration, 'Average compute dispatch should meet 60 FPS target');
    });

    it('should handle parallel dispatch efficiently', async () => {
      const timer = new PerformanceTimer();
      timer.start();

      const dispatchPromises = [];
      for (let i = 0; i < 10; i++) {
        const shaderCode = `
          @group(0) @binding(0) var<storage, read_write> data: array<f32>;

          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            data[global_id.x] = f32(global_id.x) * 2.0;
          }
        `;

        const shaderModule = device.createShaderModule({ code: shaderCode });
        const bindGroupLayout = device.createBindGroupLayout({
          entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }],
        });

        const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
        const pipeline = device.createComputePipeline({
          layout: pipelineLayout,
          compute: { module: shaderModule, entryPoint: 'main' },
        });

        const dataBuffer = device.createBuffer({
          size: 1000 * 4,
          usage: GPUBufferUsage.STORAGE,
        });

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [{ binding: 0, resource: { buffer: dataBuffer } }],
        });

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(1000 / 64));
        passEncoder.end();

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
      }

      const duration = timer.end();

      // 10 parallel dispatches should complete in < 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid shader code gracefully', async () => {
      const invalidShaderCode = `
        This is not valid WGSL shader code
      `;

      const shaderModule = device.createShaderModule({ code: invalidShaderCode });
      const compilationInfo = await shaderModule.compilationInfo;

      // Should have compilation errors
      expect(compilationInfo.messages.length).toBeGreaterThan(0);
    });

    it('should handle out-of-bounds access safely', async () => {
      const shaderCode = `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          // Intentionally access beyond bounds (shader should guard against this)
          let idx = global_id.x;
          if (idx >= arrayLength(&input)) {
            return;
          }
          output[idx] = input[idx];
        }
      `;

      const shaderModule = device.createShaderModule({ code: shaderCode });
      expect(shaderModule).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources properly', async () => {
      const buffers = [];
      const shaderModules = [];
      const pipelines = [];

      for (let i = 0; i < 100; i++) {
        const buffer = device.createBuffer({
          size: 1024 * 1024, // 1MB
          usage: GPUBufferUsage.STORAGE,
        });
        buffers.push(buffer);

        const shaderCode = `
          @group(0) @binding(0) var<storage, read> input: array<f32>;
          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {}
        `;
        const shaderModule = device.createShaderModule({ code: shaderCode });
        shaderModules.push(shaderModule);
      }

      expect(buffers.length).toBe(100);
      expect(shaderModules.length).toBe(100);

      // Cleanup
      buffers.forEach(b => b.destroy());
    });

    it('should reuse buffers efficiently', async () => {
      const buffer = device.createBuffer({
        size: 1024 * 1024,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      // Reuse buffer multiple times
      for (let i = 0; i < 10; i++) {
        const data = new Float32Array(1024);
        device.queue.writeBuffer(buffer, 0, data);
      }

      expect(buffer).toBeDefined();
    });
  });
});
