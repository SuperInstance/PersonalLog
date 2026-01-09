/**
 * Inference Engine
 *
 * Core inference logic for LLM token generation.
 * Manages compute pipelines, shader execution, and token sampling.
 */

import type { ModelInfo, NeuralStreamConfig } from '../types/index.js';
import { WebGPUDeviceManager } from './WebGPUDeviceManager.js';
import { ModelLoader } from './ModelLoader.js';
import { KVCache } from './KVCache.js';
import { ComputePipelineManager } from '../utils/ComputePipelineManager.js';

/**
 * Inference engine for token generation
 */
export class InferenceEngine {
  private deviceManager: WebGPUDeviceManager;
  private modelLoader: ModelLoader;
  private modelInfo: ModelInfo;
  private kvCache: KVCache | null;
  private config: NeuralStreamConfig;
  private pipelineManager: ComputePipelineManager;

  // Compute pipelines
  private matmulPipeline: GPUComputePipeline | null = null;
  private attentionPipeline: GPUComputePipeline | null = null;
  private feedForwardPipeline: GPUComputePipeline | null = null;

  constructor(
    deviceManager: WebGPUDeviceManager,
    modelLoader: ModelLoader,
    modelInfo: ModelInfo,
    kvCache: KVCache | null,
    config: NeuralStreamConfig
  ) {
    this.deviceManager = deviceManager;
    this.modelLoader = modelLoader;
    this.modelInfo = modelInfo;
    this.kvCache = kvCache;
    this.config = config;
    this.pipelineManager = new ComputePipelineManager(deviceManager);
  }

  /**
   * Initialize compute pipelines
   */
  async initialize(): Promise<void> {
    console.log('Initializing inference engine...');

    // Load shader code
    const matmulShaderCode = await this.loadShader('matmul.wgsl');
    const attentionShaderCode = await this.loadShader('attention.wgsl');

    // Create compute pipelines
    this.matmulPipeline = await this.pipelineManager.createComputePipeline(
      'matmul',
      matmulShaderCode
    );

    this.attentionPipeline = await this.pipelineManager.createComputePipeline(
      'attention',
      attentionShaderCode
    );

    console.log('Inference engine initialized');
  }

  /**
   * Load shader code
   */
  private async loadShader(shaderName: string): Promise<string> {
    try {
      const response = await fetch(`/shaders/${shaderName}`);
      return await response.text();
    } catch (error) {
      console.warn(`Failed to load shader ${shaderName}, using embedded code`);
      // Fallback to embedded shaders
      return this.getEmbeddedShader(shaderName);
    }
  }

  /**
   * Get embedded shader code
   */
  private getEmbeddedShader(shaderName: string): string {
    // In production, these would be imported from shader files
    // For now, return placeholder
    return `
      @compute @workgroup_size(16, 16, 1)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        // Shader implementation
      }
    `;
  }

  /**
   * Generate a single token
   */
  async generateToken(inputTokens: number[]): Promise<number> {
    if (!this.matmulPipeline || !this.attentionPipeline) {
      throw new Error('Pipelines not initialized');
    }

    const device = this.deviceManager.getDevice();

    // Token generation pipeline:
    // 1. Embedding lookup
    // 2. Transformer layers (attention + feed-forward)
    // 3. LM head projection
    // 4. Sampling

    // For each transformer layer
    for (let layer = 0; layer < this.modelInfo.numLayers; layer++) {
      // Self-attention
      await this.runAttention(layer, inputTokens);

      // Feed-forward network
      await this.runFeedForward(layer);
    }

    // Project to vocabulary
    const logits = await this.projectToVocabulary();

    // Sample token
    const tokenId = this.sampleToken(logits);

    return tokenId;
  }

  /**
   * Run attention mechanism
   */
  private async runAttention(layer: number, inputTokens: number[]): Promise<void> {
    if (!this.attentionPipeline) return;

    const device = this.deviceManager.getDevice();

    // Create command encoder
    const commandEncoder = device.createCommandEncoder();

    // Compute workgroup sizes
    const workgroupsX = Math.ceil(this.modelInfo.contextLength / 16);
    const workgroupsY = this.modelInfo.numAttentionHeads;
    const workgroupsZ = 1;

    // Create compute pass
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.attentionPipeline);

    // Set bind groups (would be created from buffers)
    // computePass.setBindGroup(0, bindGroup);

    computePass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
    computePass.end();

    // Submit commands
    device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Run feed-forward network
   */
  private async runFeedForward(layer: number): Promise<void> {
    if (!this.matmulPipeline) return;

    const device = this.deviceManager.getDevice();
    const commandEncoder = device.createCommandEncoder();

    // Matrix multiplication for feed-forward
    const workgroupsX = Math.ceil(this.modelInfo.intermediateDim / 16);
    const workgroupsY = Math.ceil(this.modelInfo.hiddenDim / 16);

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.matmulPipeline);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY, 1);
    computePass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Project hidden states to vocabulary logits
   */
  private async projectToVocabulary(): Promise<Float32Array> {
    const device = this.deviceManager.getDevice();

    // Run LM head projection
    // Returns logits for each token in vocabulary

    // Placeholder: return random logits
    const logits = new Float32Array(this.modelInfo.vocabSize);
    for (let i = 0; i < logits.length; i++) {
      logits[i] = Math.random() * 2 - 1;
    }

    return logits;
  }

  /**
   * Sample token from logits
   */
  private sampleToken(logits: Float32Array): number {
    const temperature = this.config.temperature || 1.0;
    const topP = this.config.topP || 0.9;
    const topK = this.config.topK || 40;

    // Apply temperature
    const scaledLogits = logits.map(l => l / temperature);

    // Sort by logit value
    const indexed = scaledLogits.map((logit, idx) => ({ logit, idx }));
    indexed.sort((a, b) => b.logit - a.logit);

    // Apply top-k
    const topKIndices = indexed.slice(0, topK);

    // Apply top-p (nucleus sampling)
    let sum = 0;
    const probs: number[] = [];
    const indices: number[] = [];

    for (const item of topKIndices) {
      const exp = Math.exp(item.logit);
      sum += exp;
      probs.push(exp);
      indices.push(item.idx);

      if (sum > topP) break;
    }

    // Normalize probabilities
    for (let i = 0; i < probs.length; i++) {
      probs[i] /= sum;
    }

    // Sample from distribution
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (rand < cumulative) {
        return indices[i];
      }
    }

    return indices[indices.length - 1];
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('Disposing inference engine...');

    if (this.matmulPipeline) {
      this.matmulPipeline = null;
    }

    if (this.attentionPipeline) {
      this.attentionPipeline = null;
    }

    if (this.feedForwardPipeline) {
      this.feedForwardPipeline = null;
    }

    this.pipelineManager.dispose();
  }
}
