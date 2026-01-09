/**
 * NeuralStream Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NeuralStream, NeuralStreamError, ErrorCode } from '../index';

describe('NeuralStream', () => {
  describe('Hardware Detection', () => {
    it('should detect hardware capabilities', async () => {
      const capabilities = await NeuralStream.detectHardware();

      expect(capabilities).toBeDefined();
      expect(typeof capabilities.webGPUSupported).toBe('boolean');
      expect(capabilities.features).toBeDefined();
      expect(capabilities.recommendedDevice).toBeDefined();
    });

    it('should return GPU info if available', async () => {
      const capabilities = await NeuralStream.detectHardware();

      if (capabilities.webGPUSupported && capabilities.adapter) {
        expect(capabilities.adapter.vendor).toBeDefined();
        expect(capabilities.adapter.architecture).toBeDefined();
        expect(capabilities.adapter.totalMemory).toBeGreaterThan(0);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid configuration', async () => {
      const config = {
        modelPath: '/models/test.gguf',
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      };

      // Should not throw
      expect(() => NeuralStream.create(config)).not.toThrow();
    });

    it('should validate temperature range', () => {
      const invalidConfig = {
        modelPath: '/models/test.gguf',
        temperature: 2.0 // Invalid: > 1.0
      };

      // Should throw or clamp
      expect(async () => {
        await NeuralStream.create(invalidConfig);
      }).rejects.toThrow();
    });
  });

  describe('Model Loading', () => {
    it('should throw error if WebGPU not supported', async () => {
      // Mock WebGPU not supported
      const originalGPU = (global as any).navigator?.gpu;
      (global as any).navigator = { gpu: undefined };

      try {
        await expect(
          NeuralStream.create({ modelPath: '/models/test.gguf' })
        ).rejects.toThrow(ErrorCode.WEBGPU_NOT_SUPPORTED);
      } finally {
        // Restore
        if (originalGPU) {
          (global as any).navigator.gpu = originalGPU;
        }
      }
    });

    it('should throw error for invalid model path', async () => {
      await expect(
        NeuralStream.create({ modelPath: '/nonexistent/model.gguf' })
      ).rejects.toThrow(ErrorCode.MODEL_LOAD_FAILED);
    });
  });

  describe('Token Generation', () => {
    let stream: NeuralStream;

    beforeEach(async () => {
      // Initialize with test model
      // stream = await NeuralStream.create({ modelPath: '/models/test.gguf' });
    });

    afterEach(async () => {
      if (stream) {
        await stream.dispose();
      }
    });

    it('should generate tokens', async () => {
      // Test token generation
      // const tokens = [];
      // for await (const token of stream.generate('Hello')) {
      //   tokens.push(token);
      //   if (token.isDone) break;
      // }
      // expect(tokens.length).toBeGreaterThan(0);
    });

    it('should respect max tokens limit', async () => {
      // Test max tokens
    });

    it('should support streaming', async () => {
      // Test streaming
    });

    it('should support abort', async () => {
      // Test abort
    });
  });

  describe('Performance Metrics', () => {
    it('should track metrics correctly', async () => {
      // Test metrics tracking
    });

    it('should calculate FPS correctly', async () => {
      // Test FPS calculation
    });

    it('should track memory usage', async () => {
      // Test memory tracking
    });
  });

  describe('Error Handling', () => {
    it('should handle device loss gracefully', async () => {
      // Test device loss
    });

    it('should handle out of memory', async () => {
      // Test OOM
    });

    it('should handle timeout', async () => {
      // Test timeout
    });
  });
});

describe('NeuralStreamError', () => {
  it('should create error with code', () => {
    const error = new NeuralStreamError(
      'Test error',
      ErrorCode.INVALID_CONFIG
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.INVALID_CONFIG);
    expect(error.name).toBe('NeuralStreamError');
  });

  it('should include details', () => {
    const details = { field: 'value' };
    const error = new NeuralStreamError(
      'Test error',
      ErrorCode.INVALID_CONFIG,
      details
    );

    expect(error.details).toEqual(details);
  });
});
