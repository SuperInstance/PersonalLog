/**
 * WebGPU Device Manager
 *
 * Manages WebGPU adapter, device, and memory allocation.
 * Handles device loss, memory management, and resource cleanup.
 */

import type { HardwareCapabilities, DeviceType, GPUMemoryLayout } from '../types/index.js';
import { NeuralStreamError, ErrorCode } from '../types/index.js';

/**
 * Manages WebGPU device lifecycle and memory
 */
export class WebGPUDeviceManager {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private capabilities: HardwareCapabilities;
  private memoryLayout: GPUMemoryLayout | null = null;
  private isDisposed = false;
  private buffers: GPUBuffer[] = [];

  private constructor(capabilities: HardwareCapabilities) {
    this.capabilities = capabilities;
  }

  /**
   * Create device manager with optimal adapter
   */
  static async create(capabilities: HardwareCapabilities): Promise<WebGPUDeviceManager> {
    const manager = new WebGPUDeviceManager(capabilities);
    await manager.initialize();
    return manager;
  }

  /**
   * Initialize WebGPU adapter and device
   */
  private async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new NeuralStreamError(
        'WebGPU not supported',
        ErrorCode.WEBGPU_NOT_SUPPORTED
      );
    }

    // Request adapter with performance preference
    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!this.adapter) {
      throw new NeuralStreamError(
        'No GPU adapter found',
        ErrorCode.WEBGPU_NOT_SUPPORTED
      );
    }

    // Request device with required features
    const requiredFeatures: GPUFeatureName[] = [];
    if (this.capabilities.features.timestampQueries) {
      requiredFeatures.push('timestamp-query' as GPUFeatureName);
    }

    this.device = await this.adapter.requestDevice({
      requiredFeatures,
      requiredLimits: {
        maxBufferSize: this.capabilities.maxModelSize,
        maxStorageBufferBindingSize: this.capabilities.maxModelSize
      }
    });

    if (!this.device) {
      throw new NeuralStreamError(
        'Failed to create GPU device',
        ErrorCode.WEBGPU_NOT_SUPPORTED
      );
    }

    // Handle device loss
    this.device.lost.then((info) => {
      console.error(`GPU device lost: ${info.message}`);
      this.isDisposed = true;
    });

    console.log('WebGPU device initialized:', {
      adapter: this.capabilities.adapter?.description,
      maxModelSize: this.capabilities.maxModelSize
    });
  }

  /**
   * Get the GPU device
   */
  getDevice(): GPUDevice {
    if (!this.device || this.isDisposed) {
      throw new NeuralStreamError('Device not available', ErrorCode.DEVICE_LOST);
    }
    return this.device;
  }

  /**
   * Get the GPU adapter
   */
  getAdapter(): GPUAdapter {
    if (!this.adapter) {
      throw new NeuralStreamError('Adapter not available', ErrorCode.DEVICE_LOST);
    }
    return this.adapter;
  }

  /**
   * Allocate GPU buffer with error handling
   */
  allocateBuffer(size: number, usage: GPUBufferUsageFlags, label?: string): GPUBuffer {
    if (!this.device || this.isDisposed) {
      throw new NeuralStreamError('Device not available', ErrorCode.DEVICE_LOST);
    }

    try {
      const descriptor: GPUBufferDescriptor = {
        size,
        usage,
        label: label || 'buffer'
      };

      // Add mapped at creation flag for easy initialization
      if (usage & GPUBufferUsage.MAP_WRITE) {
        descriptor.mappedAtCreation = true;
      }

      const buffer = this.device.createBuffer(descriptor);
      this.buffers.push(buffer);

      return buffer;
    } catch (error) {
      throw new NeuralStreamError(
        `Failed to allocate buffer of size ${size}: ${error}`,
        ErrorCode.OUT_OF_MEMORY,
        error
      );
    }
  }

  /**
   * Allocate memory layout for model
   */
  allocateModelMemory(
    weightsSize: number,
    kvCacheSize: number,
    workingMemory: number
  ): GPUMemoryLayout {
    if (!this.device) {
      throw new NeuralStreamError('Device not available', ErrorCode.DEVICE_LOST);
    }

    // Calculate buffer sizes
    const attentionSize = workingMemory;
    const feedForwardSize = workingMemory * 4;
    const outputSize = workingMemory;
    const tempSize = workingMemory * 2;

    // Allocate buffers
    const weights = this.allocateBuffer(
      weightsSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      'weights'
    );

    const kvCache = this.allocateBuffer(
      kvCacheSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      'kv-cache'
    );

    const attention = this.allocateBuffer(
      attentionSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      'attention'
    );

    const feedForward = this.allocateBuffer(
      feedForwardSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      'feed-forward'
    );

    const output = this.allocateBuffer(
      outputSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_READ,
      'output'
    );

    const temp = this.allocateBuffer(
      tempSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      'temp'
    );

    this.memoryLayout = {
      weights,
      kvCache,
      attention,
      feedForward,
      output,
      temp,
      totalSize: weightsSize + kvCacheSize + attentionSize + feedForwardSize + outputSize + tempSize
    };

    console.log('Memory layout allocated:', {
      total: this.memoryLayout.totalSize,
      weights: weightsSize,
      kvCache: kvCacheSize,
      working: workingMemory
    });

    return this.memoryLayout;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): {
    allocated: number;
    used: number;
    available: number;
  } {
    const allocated = this.buffers.reduce((sum, buffer) => sum + buffer.size, 0);
    const available = this.capabilities.maxModelSize;

    return {
      allocated,
      used: allocated,
      available: available - allocated
    };
  }

  /**
   * Check if memory is sufficient
   */
  checkMemoryAvailable(requiredSize: number): boolean {
    const usage = this.getMemoryUsage();
    return usage.available >= requiredSize;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('Disposing WebGPU device manager...');

    // Destroy all buffers
    for (const buffer of this.buffers) {
      buffer.destroy();
    }
    this.buffers = [];

    // Destroy device
    if (this.device && !this.isDisposed) {
      this.device.destroy();
      this.device = null;
    }

    this.adapter = null;
    this.memoryLayout = null;
    this.isDisposed = true;

    console.log('WebGPU device manager disposed');
  }

  /**
   * Check if device is valid
   */
  isValid(): boolean {
    return !this.isDisposed && this.device !== null;
  }
}
