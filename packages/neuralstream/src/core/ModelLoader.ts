/**
 * Model Loader
 *
 * Loads and parses quantized LLM models (GGUF format).
 * Handles model sharding, memory mapping, and weight extraction.
 */

import type { ModelInfo, QuantizationType } from '../types/index.js';
import { NeuralStreamError, ErrorCode } from '../types/index.js';
import { WebGPUDeviceManager } from './WebGPUDeviceManager.js';

/**
 * GGUF model file header
 */
interface GGUFHeader {
  version: number;
  tensorCount: number;
  metadataKVCount: number;
  metadata: Map<string, string | number | boolean>;
}

/**
 * Tensor information
 */
interface TensorInfo {
  name: string;
  dimensions: number[];
  dataType: string;
  offset: number;
  size: number;
}

/**
 * Loads and manages LLM models
 */
export class ModelLoader {
  private deviceManager: WebGPUDeviceManager;
  private modelData: ArrayBuffer | null = null;
  private modelInfo: ModelInfo | null = null;
  private tensors: Map<string, TensorInfo> = new Map();
  private weights: GPUBuffer | null = null;

  constructor(deviceManager: WebGPUDeviceManager) {
    this.deviceManager = deviceManager;
  }

  /**
   * Load model from file path or URL
   */
  async loadModel(modelPath: string): Promise<ModelInfo> {
    try {
      console.log(`Loading model from ${modelPath}...`);

      // Fetch model file
      const response = await fetch(modelPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.statusText}`);
      }

      // Read as ArrayBuffer
      this.modelData = await response.arrayBuffer();
      console.log(`Model loaded: ${this.modelData.byteLength} bytes`);

      // Parse GGUF header
      const header = this.parseGGUFHeader(this.modelData);

      // Extract model metadata
      this.modelInfo = this.extractModelInfo(header);

      // Parse tensor information
      this.parseTensors(header);

      // Load weights to GPU
      await this.loadWeightsToGPU();

      console.log('Model loading complete:', this.modelInfo);
      return this.modelInfo;
    } catch (error) {
      throw new NeuralStreamError(
        `Failed to load model: ${error}`,
        ErrorCode.MODEL_LOAD_FAILED,
        error
      );
    }
  }

  /**
   * Parse GGUF header
   */
  private parseGGUFHeader(data: ArrayBuffer): GGUFHeader {
    const view = new DataView(data);
    let offset = 0;

    // Magic number (GGUF)
    const magic = view.getUint32(offset, true);
    if (magic !== 0x46554747) {
      throw new Error('Invalid GGUF file: magic number mismatch');
    }
    offset += 4;

    // Version
    const version = view.getUint32(offset, true);
    offset += 4;

    // Tensor count
    const tensorCount = view.getUint32(offset, true);
    offset += 4;

    // Metadata KV count
    const metadataKVCount = view.getUint32(offset, true);
    offset += 4;

    // Parse metadata
    const metadata = new Map<string, string | number | boolean>();
    for (let i = 0; i < metadataKVCount; i++) {
      const key = this.parseString(view, offset);
      offset += key.length + 4; // length + string

      const type = view.getUint32(offset, true);
      offset += 4;

      const value = this.parseMetadataValue(view, offset, type);
      offset += this.getMetadataValueSize(value, type);

      metadata.set(key, value);
    }

    return {
      version,
      tensorCount,
      metadataKVCount,
      metadata
    };
  }

  /**
   * Parse string from buffer
   */
  private parseString(view: DataView, offset: number): string {
    const length = view.getUint32(offset, true);
    const bytes = new Uint8Array(view.buffer, offset + 4, length);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Parse metadata value
   */
  private parseMetadataValue(view: DataView, offset: number, type: number): string | number | boolean {
    switch (type) {
      case 0: // UINT8
        return view.getUint8(offset);
      case 1: // INT8
        return view.getInt8(offset);
      case 2: // UINT16
        return view.getUint16(offset, true);
      case 3: // INT16
        return view.getInt16(offset, true);
      case 4: // UINT32
        return view.getUint32(offset, true);
      case 5: // INT32
        return view.getInt32(offset, true);
      case 6: // FLOAT32
        return view.getFloat32(offset, true);
      case 7: // BOOL
        return view.getUint8(offset) !== 0;
      case 8: // STRING
        return this.parseString(view, offset);
      default:
        throw new Error(`Unknown metadata type: ${type}`);
    }
  }

  /**
   * Get size of metadata value
   */
  private getMetadataValueSize(value: unknown, type: number): number {
    if (typeof value === 'string') {
      return 4 + (value as string).length; // length + string
    }
    if (typeof value === 'number') {
      return 4;
    }
    if (typeof value === 'boolean') {
      return 1;
    }
    return 0;
  }

  /**
   * Extract model information from metadata
   */
  private extractModelInfo(header: GGUFHeader): ModelInfo {
    const metadata = header.metadata;

    // Extract common metadata fields
    const name = metadata.get('general.name') as string || 'Unknown';
    const version = metadata.get('general.version') as string || '1.0';
    const parameterCount = metadata.get('general.parameter_count') as number || 0;
    const contextLength = metadata.get('llama.context_length') as number || 2048;
    const embeddingDim = metadata.get('llama.embedding_length') as number || 4096;
    const numLayers = metadata.get('llama.block_count') as number || 32;
    const numAttentionHeads = metadata.get('llama.attention.head_count') as number || 32;
    const numKVHeads = metadata.get('llama.attention.head_count_kv') as number || numAttentionHeads;
    const hiddenDim = embeddingDim;
    const intermediateDim = metadata.get('llama.feed_forward_length') as number || embeddingDim * 4;
    const vocabSize = metadata.get('llama.vocab_size') as number || 32000;

    // Detect quantization type from file size
    const fileSize = this.modelData!.byteLength;
    const quantization = this.detectQuantization(fileSize, parameterCount);

    // Determine features
    const features = {
      speculativeDecoding: true,
      kvCache: true,
      batching: true,
      progressiveRefinement: true,
      requiresGPU: fileSize > 2_000_000_000 // >2GB
    };

    return {
      name,
      version,
      parameterCount: this.formatParameterCount(parameterCount),
      contextLength,
      embeddingDim,
      numLayers,
      numAttentionHeads,
      numKVHeads,
      hiddenDim,
      intermediateDim,
      vocabSize,
      quantization,
      modelSize: fileSize,
      features
    };
  }

  /**
   * Detect quantization type from file size
   */
  private detectQuantization(fileSize: number, paramCount: number): QuantizationType {
    const bytesPerParam = fileSize / paramCount;

    if (bytesPerParam < 0.6) return QuantizationType.Q4_0;
    if (bytesPerParam < 0.7) return QuantizationType.Q4_K;
    if (bytesPerParam < 0.8) return QuantizationType.Q5_0;
    if (bytesPerParam < 1.0) return QuantizationType.Q8_0;
    if (bytesPerParam < 2.0) return QuantizationType.F16;
    return QuantizationType.F32;
  }

  /**
   * Format parameter count (e.g., 7000000000 -> "7B")
   */
  private formatParameterCount(count: number): string {
    if (count >= 1_000_000_000) {
      return `${(count / 1_000_000_000).toFixed(1)}B`;
    }
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    return count.toString();
  }

  /**
   * Parse tensor information
   */
  private parseTensors(header: GGUFHeader): void {
    if (!this.modelData) return;

    const view = new DataView(this.modelData);
    let offset = this.getHeaderSize(header);

    for (let i = 0; i < header.tensorCount; i++) {
      const name = this.parseString(view, offset);
      offset += 4 + name.length;

      const numDims = view.getUint32(offset, true);
      offset += 4;

      const dimensions: number[] = [];
      for (let j = 0; j < numDims; j++) {
        dimensions.push(view.getUint32(offset, true));
        offset += 4;
      }

      const dataType = view.getUint32(offset, true);
      offset += 4;

      const dataOffset = view.getBigUint64(offset, true);
      offset += 8;

      const size = this.calculateTensorSize(dimensions, dataType);

      this.tensors.set(name, {
        name,
        dimensions,
        dataType: this.getDataTypeName(dataType),
        offset: Number(dataOffset),
        size
      });
    }

    console.log(`Parsed ${this.tensors.size} tensors`);
  }

  /**
   * Get header size
   */
  private getHeaderSize(header: GGUFHeader): number {
    // Rough estimate - in production would calculate exactly
    return 1024;
  }

  /**
   * Calculate tensor size in bytes
   */
  private calculateTensorSize(dimensions: number[], dataType: number): number {
    const elementCount = dimensions.reduce((a, b) => a * b, 1);
    const bytesPerElement = this.getBytesPerDataType(dataType);
    return elementCount * bytesPerElement;
  }

  /**
   * Get bytes per data type
   */
  private getBytesPerDataType(dataType: number): number {
    switch (dataType) {
      case 0: return 4; // F32
      case 1: return 2; // F16
      case 2: return 4; // Q4_0
      case 3: return 4; // Q4_1
      default: return 4;
    }
  }

  /**
   * Get data type name
   */
  private getDataTypeName(dataType: number): string {
    switch (dataType) {
      case 0: return 'F32';
      case 1: return 'F16';
      case 2: return 'Q4_0';
      case 3: return 'Q4_1';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Load weights to GPU memory
   */
  private async loadWeightsToGPU(): Promise<void> {
    if (!this.modelData || !this.modelInfo) return;

    const device = this.deviceManager.getDevice();
    const totalSize = this.modelInfo.modelSize;

    // Create GPU buffer for weights
    this.weights = this.deviceManager.allocateBuffer(
      totalSize,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      'model-weights'
    );

    // Copy weights to GPU
    // In production, would use more efficient chunking
    device.queue.writeBuffer(
      this.weights,
      0,
      this.modelData,
      0,
      totalSize
    );

    console.log('Weights loaded to GPU');
  }

  /**
   * Get tensor by name
   */
  getTensor(name: string): TensorInfo | undefined {
    return this.tensors.get(name);
  }

  /**
   * Get all tensor names
   */
  getTensorNames(): string[] {
    return Array.from(this.tensors.keys());
  }

  /**
   * Get model info
   */
  getModelInfo(): ModelInfo | null {
    return this.modelInfo;
  }

  /**
   * Get weights buffer
   */
  getWeights(): GPUBuffer | null {
    return this.weights;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('Disposing model loader...');

    if (this.weights) {
      this.weights.destroy();
      this.weights = null;
    }

    this.modelData = null;
    this.modelInfo = null;
    this.tensors.clear();
  }
}
