/**
 * Compute Pipeline Manager
 *
 * Manages WebGPU compute pipelines and bind groups.
 */

import { WebGPUDeviceManager } from '../core/WebGPUDeviceManager.js';

/**
 * Manages compute pipelines
 */
export class ComputePipelineManager {
  private deviceManager: WebGPUDeviceManager;
  private pipelines: Map<string, GPUComputePipeline> = new Map();
  private bindGroupLayouts: Map<string, GPUBindGroupLayout> = new Map();

  constructor(deviceManager: WebGPUDeviceManager) {
    this.deviceManager = deviceManager;
  }

  /**
   * Create compute pipeline from shader code
   */
  async createComputePipeline(name: string, shaderCode: string): Promise<GPUComputePipeline> {
    const device = this.deviceManager.getDevice();

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: shaderCode,
      label: `${name}-shader`
    });

    // Create pipeline layout
    const bindGroupLayout = this.createBindGroupLayout(device);
    this.bindGroupLayouts.set(name, bindGroupLayout);

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
      label: `${name}-layout`
    });

    // Create compute pipeline
    const pipeline = device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      },
      label: name
    });

    this.pipelines.set(name, pipeline);
    console.log(`Compute pipeline created: ${name}`);

    return pipeline;
  }

  /**
   * Create bind group layout
   */
  private createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      entries: [
        // Storage buffers for input/output
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        // Uniform buffer
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
    });
  }

  /**
   * Get pipeline by name
   */
  getPipeline(name: string): GPUComputePipeline | undefined {
    return this.pipelines.get(name);
  }

  /**
   * Get bind group layout by name
   */
  getBindGroupLayout(name: string): GPUBindGroupLayout | undefined {
    return this.bindGroupLayouts.get(name);
  }

  /**
   * Create bind group for pipeline
   */
  createBindGroup(
    pipelineName: string,
    buffers: {
      input: GPUBuffer;
      weights?: GPUBuffer;
      output: GPUBuffer;
      uniforms: GPUBuffer;
    }
  ): GPUBindGroup | null {
    const layout = this.bindGroupLayouts.get(pipelineName);
    if (!layout) return null;

    const device = this.deviceManager.getDevice();

    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: buffers.input } },
      { binding: 1, resource: { buffer: buffers.weights || buffers.input } },
      { binding: 2, resource: { buffer: buffers.output } },
      { binding: 3, resource: { buffer: buffers.uniforms } }
    ];

    return device.createBindGroup({
      layout,
      entries
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('Disposing compute pipeline manager...');

    this.pipelines.clear();
    this.bindGroupLayouts.clear();
  }
}
