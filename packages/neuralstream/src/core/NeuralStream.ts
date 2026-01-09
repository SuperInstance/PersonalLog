/**
 * NeuralStream - Core Inference Engine
 *
 * Revolutionary browser LLM inference at 60 FPS using WebGPU acceleration.
 * Runs 7B parameter models locally with zero API costs.
 *
 * Architecture:
 * - WebGPU compute shaders for parallel processing
 * - KV-cache optimization for fast generation
 * - Speculative decoding for speed
 * - Pipeline parallelism for throughput
 */

import type {
  NeuralStreamConfig,
  TokenStream,
  TokenResult,
  ModelInfo,
  PerformanceMetrics,
  HardwareCapabilities,
  DeviceType,
  InferenceStrategy
} from '../types/index.js';
import {
  NeuralStreamError,
  ErrorCode
} from '../types/index.js';
import { WebGPUDeviceManager } from './WebGPUDeviceManager.js';
import { ModelLoader } from './ModelLoader.js';
import { InferenceEngine } from './InferenceEngine.js';
import { StreamingPipeline } from './StreamingPipeline.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { KVCache } from './KVCache.js';

/**
 * Main NeuralStream class - Entry point for browser LLM inference
 */
export class NeuralStream {
  private config: NeuralStreamConfig;
  private deviceManager: WebGPUDeviceManager;
  private modelLoader: ModelLoader;
  private inferenceEngine: InferenceEngine | null = null;
  private streamingPipeline: StreamingPipeline | null = null;
  private performanceMonitor: PerformanceMonitor;
  private kvCache: KVCache | null = null;
  private modelInfo: ModelInfo | null = null;
  private isInitialized = false;
  private isAborted = false;

  private constructor(config: NeuralStreamConfig, deviceManager: WebGPUDeviceManager) {
    this.config = {
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      device: DeviceType.AUTO,
      strategy: InferenceStrategy.SPECULATIVE,
      speculativeDecoding: true,
      speculativeTokens: 4,
      enableKVCache: true,
      batchSize: 1,
      progressiveRefinement: true,
      targetFPS: 60,
      memoryBudget: 0,
      enableMonitoring: true,
      logLevel: 'info',
      ...config
    };

    this.deviceManager = deviceManager;
    this.modelLoader = new ModelLoader(deviceManager);
    this.performanceMonitor = new PerformanceMonitor(this.config);
  }

  /**
   * Create a new NeuralStream instance
   * @param config Configuration options
   * @returns Initialized NeuralStream instance ready for inference
   */
  static async create(config: NeuralStreamConfig): Promise<NeuralStream> {
    // Check WebGPU support
    const capabilities = await NeuralStream.detectHardware();
    if (!capabilities.webGPUSupported) {
      throw new NeuralStreamError(
        'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Firefox Nightly.',
        ErrorCode.WEBGPU_NOT_SUPPORTED
      );
    }

    // Initialize device manager
    const deviceManager = await WebGPUDeviceManager.create(capabilities);
    const instance = new NeuralStream(config, deviceManager);

    // Load model
    await instance.initialize();

    return instance;
  }

  /**
   * Initialize the inference engine
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.log('info', 'Initializing NeuralStream...');

      // Load model
      this.log('info', `Loading model from ${this.config.modelPath}`);
      this.modelInfo = await this.modelLoader.loadModel(this.config.modelPath);
      this.log('info', `Model loaded: ${this.modelInfo.name} (${this.modelInfo.parameterCount})`);

      // Initialize KV-cache if enabled
      if (this.config.enableKVCache && this.modelInfo.features.kvCache) {
        this.kvCache = new KVCache(
          this.deviceManager.getDevice(),
          this.modelInfo,
          this.config.maxTokens
        );
        this.log('info', 'KV-cache initialized');
      }

      // Initialize inference engine
      this.inferenceEngine = new InferenceEngine(
        this.deviceManager,
        this.modelLoader,
        this.modelInfo,
        this.kvCache,
        this.config
      );
      this.log('info', 'Inference engine initialized');

      // Initialize streaming pipeline
      this.streamingPipeline = new StreamingPipeline(
        this.inferenceEngine,
        this.performanceMonitor,
        this.config
      );
      this.log('info', 'Streaming pipeline initialized');

      this.isInitialized = true;
      this.log('info', 'NeuralStream initialization complete');
    } catch (error) {
      this.log('error', `Initialization failed: ${error}`);
      throw new NeuralStreamError(
        `Failed to initialize NeuralStream: ${error}`,
        ErrorCode.MODEL_LOAD_FAILED,
        error
      );
    }
  }

  /**
   * Generate text from a prompt
   * @param prompt Input text prompt
   * @returns Async iterator of tokens streaming at 60 FPS
   */
  async *generate(prompt: string): AsyncIterator<TokenResult> {
    if (!this.isInitialized || !this.streamingPipeline) {
      throw new NeuralStreamError(
        'NeuralStream not initialized. Call create() first.',
        ErrorCode.INVALID_CONFIG
      );
    }

    this.isAborted = false;
    this.log('info', `Starting generation for prompt: "${prompt.slice(0, 50)}..."`);

    try {
      const stream = this.streamingPipeline.stream(prompt);

      for await (const token of stream) {
        if (this.isAborted) {
          this.log('info', 'Generation aborted');
          yield {
            ...token,
            isDone: true,
            finishReason: 'abort'
          };
          break;
        }

        yield token;

        // Check if done
        if (token.isDone) {
          this.log('info', `Generation complete: ${token.position} tokens in ${token.generationTime}ms`);
          break;
        }
      }
    } catch (error) {
      this.log('error', `Generation failed: ${error}`);
      throw new NeuralStreamError(
        `Generation failed: ${error}`,
        ErrorCode.INFERENCE_FAILED,
        error
      );
    }
  }

  /**
   * Create a token stream object with control methods
   * @param prompt Input text prompt
   * @returns TokenStream with abort capability
   */
  stream(prompt: string): TokenStream {
    const generator = this.generate(prompt);

    return {
      [Symbol.asyncIterator]: () => generator,

      abort: () => {
        this.isAborted = true;
      },

      getProgress: () => {
        if (!this.streamingPipeline) {
          throw new NeuralStreamError('Pipeline not initialized', ErrorCode.INVALID_CONFIG);
        }
        return this.streamingPipeline.getProgress();
      }
    };
  }

  /**
   * Create a chat session for conversational AI
   * @param systemPrompt Optional system prompt
   * @returns ChatSession interface
   */
  static async createChat(systemPrompt?: string): Promise<ChatSession> {
    const { ChatSessionImpl } = await import('./ChatSession.js');
    return ChatSessionImpl.create(systemPrompt);
  }

  /**
   * Get current model information
   */
  getModelInfo(): ModelInfo {
    if (!this.modelInfo) {
      throw new NeuralStreamError('Model not loaded', ErrorCode.MODEL_LOAD_FAILED);
    }
    return this.modelInfo;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get current configuration
   */
  getConfig(): NeuralStreamConfig {
    return { ...this.config };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(updates: Partial<NeuralStreamConfig>): void {
    this.config = { ...this.config, ...updates };
    this.log('info', 'Configuration updated');
  }

  /**
   * Detect hardware capabilities
   */
  static async detectHardware(): Promise<HardwareCapabilities> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return {
        webGPUSupported: false,
        adapter: null,
        features: {
          timestampQueries: false,
          pipelineStatistics: false,
          float16Textures: false,
          float32Textures: false,
          storageBuffers: false,
          maxComputeWorkgroups: []
        },
        recommendedDevice: DeviceType.CPU,
        maxModelSize: 0
      };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        return {
          webGPUSupported: true,
          adapter: null,
          features: {
            timestampQueries: false,
            pipelineStatistics: false,
            float16Textures: false,
            float32Textures: false,
            storageBuffers: false,
            maxComputeWorkgroups: []
          },
          recommendedDevice: DeviceType.CPU,
          maxModelSize: 0
        };
      }

      const features = await adapter.features.has('timestamp-query');
      const float16 = await adapter.features.has('float32-filterable');

      // Get adapter info
      const adapterInfo = await adapter.requestAdapterInfo();

      // Estimate max model size based on memory
      let maxModelSize = 3_000_000_000; // Default 3GB
      if ('memory' in adapterInfo) {
        const memory = (adapterInfo as any).memory;
        if (memory) {
          maxModelSize = Math.floor(memory * 0.7); // Use 70% of available memory
        }
      }

      return {
        webGPUSupported: true,
        adapter: {
          vendor: adapterInfo.vendor || 'Unknown',
          architecture: adapterInfo.architecture || 'Unknown',
          description: adapterInfo.description || 'Unknown',
          totalMemory: maxModelSize
        },
        features: {
          timestampQueries: features,
          pipelineStatistics: false,
          float16Textures: float16,
          float32Textures: true,
          storageBuffers: true,
          maxComputeWorkgroups: [65535, 65535, 65535]
        },
        recommendedDevice: maxModelSize > 2_000_000_000 ? DeviceType.GPU : DeviceType.HYBRID,
        maxModelSize
      };
    } catch (error) {
      return {
        webGPUSupported: false,
        adapter: null,
        features: {
          timestampQueries: false,
          pipelineStatistics: false,
          float16Textures: false,
          float32Textures: false,
          storageBuffers: false,
          maxComputeWorkgroups: []
        },
        recommendedDevice: DeviceType.CPU,
        maxModelSize: 0
      };
    }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.log('info', 'Disposing NeuralStream...');

    if (this.streamingPipeline) {
      this.streamingPipeline.dispose();
      this.streamingPipeline = null;
    }

    if (this.inferenceEngine) {
      this.inferenceEngine.dispose();
      this.inferenceEngine = null;
    }

    if (this.kvCache) {
      this.kvCache.dispose();
      this.kvCache = null;
    }

    this.deviceManager.dispose();
    this.isInitialized = false;

    this.log('info', 'NeuralStream disposed');
  }

  /**
   * Internal logging
   */
  private log(level: string, message: string): void {
    if (this.config.logLevel === 'none') return;
    if (this.config.logLevel === 'error' && level !== 'error') return;
    if (this.config.logLevel === 'warn' && !['warn', 'error'].includes(level)) return;

    const timestamp = new Date().toISOString();
    console.log(`[NeuralStream ${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}

/**
 * Chat session implementation
 */
export class ChatSessionImpl {
  private neuralStream: NeuralStream;
  private history: Array<{ role: 'system' | 'user' | 'assistant'; content: string; timestamp: number }> = [];
  private systemPrompt: string;

  private constructor(neuralStream: NeuralStream, systemPrompt?: string) {
    this.neuralStream = neuralStream;
    this.systemPrompt = systemPrompt || 'You are a helpful assistant.';
  }

  static async create(systemPrompt?: string): Promise<ChatSessionImpl> {
    const neuralStream = await NeuralStream.create({
      modelPath: '/models/llama-7b-quantized.gguf',
      maxTokens: 2048,
      temperature: 0.7
    });

    return new ChatSessionImpl(neuralStream, systemPrompt);
  }

  async respond(message: string): Promise<TokenStream> {
    // Add user message to history
    this.history.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Build prompt from history
    const prompt = this.buildPrompt();

    // Generate response
    const stream = this.neuralStream.stream(prompt);

    // Collect assistant response
    let fullResponse = '';
    const originalIterator = stream[Symbol.asyncIterator]();

    const wrappedStream: TokenStream = {
      [Symbol.asyncIterator]: async function* () {
        for await (const token of originalIterator) {
          if (!token.isDone) {
            fullResponse += token.token;
          }
          yield token;
        }

        // Add assistant response to history
        if (fullResponse) {
          this.history.push({
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now()
          });
        }
      }.bind(this),

      abort: () => stream.abort(),

      getProgress: () => stream.getProgress()
    };

    return wrappedStream;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  getConfig() {
    return this.neuralStream.getConfig();
  }

  getMetrics() {
    return this.neuralStream.getMetrics();
  }

  async dispose(): Promise<void> {
    await this.neuralStream.dispose();
  }

  private buildPrompt(): string {
    let prompt = this.systemPrompt + '\n\n';

    for (const msg of this.history) {
      prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
    }

    prompt += 'ASSISTANT: ';
    return prompt;
  }
}

// Re-export types
export * from '../types/index.js';
export type { ChatSession };
