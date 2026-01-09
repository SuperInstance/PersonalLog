/**
 * NeuralStream Type Definitions
 *
 * Core types for WebGPU-accelerated LLM inference engine.
 * These types define the interface for running 7B parameter models
 * at 60 FPS in the browser.
 */

/**
 * Model quantization types - different tradeoffs between size and quality
 */
export enum QuantizationType {
  /** 4-bit quantization - best compression, some quality loss */
  Q4_0 = 'q4_0',
  /** 4-bit quantization with different mapping */
  Q4_1 = 'q4_1',
  /** 4-bit quantization with optimized matrix */
  Q4_K = 'q4_k',
  /** 5-bit quantization - balanced */
  Q5_0 = 'q5_0',
  /** 5-bit with different mapping */
  Q5_1 = 'q5_1',
  /** 8-bit quantization - best quality, larger size */
  Q8_0 = 'q8_0',
  /** No quantization - full precision (rarely used) */
  F16 = 'f16',
  /** No quantization - full precision */
  F32 = 'f32'
}

/**
 * Device selection strategy
 */
export enum DeviceType {
  /** Force GPU acceleration (WebGPU required) */
  GPU = 'gpu',
  /** Force CPU fallback (WebGPU Compute Shaders on CPU) */
  CPU = 'cpu',
  /** Automatically select based on hardware detection */
  AUTO = 'auto',
  /** Hybrid mode - GPU for computation, CPU for management */
  HYBRID = 'hybrid'
}

/**
 * Inference strategy for token generation
 */
export enum InferenceStrategy {
  /** Standard greedy decoding */
  GREEDY = 'greedy',
  /** Beam search with multiple candidates */
  BEAM_SEARCH = 'beam_search',
  /** Nucleus sampling (top-p) */
  NUCLEUS = 'nucleus',
  /** Speculative decoding - predict 3-4 tokens ahead */
  SPECULATIVE = 'speculative',
  /** Multinomial sampling */
  MULTINOMIAL = 'multinomial'
}

/**
 * Configuration for NeuralStream initialization
 */
export interface NeuralStreamConfig {
  /** Path to model file (.gguf format) */
  modelPath: string;

  /** Device selection strategy */
  device?: DeviceType;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature for sampling (0.0 = deterministic, 1.0 = creative) */
  temperature?: number;

  /** Top-p sampling threshold */
  topP?: number;

  /** Top-k sampling threshold */
  topK?: number;

  /** Number of beams for beam search */
  numBeams?: number;

  /** Inference strategy */
  strategy?: InferenceStrategy;

  /** Enable speculative decoding (faster, may reduce quality) */
  speculativeDecoding?: boolean;

  /** Number of speculative tokens */
  speculativeTokens?: number;

  /** Enable KV-cache optimization */
  enableKVCache?: boolean;

  /** Batch size for processing */
  batchSize?: number;

  /** Enable progressive refinement */
  progressiveRefinement?: boolean;

  /** Target FPS for token streaming */
  targetFPS?: number;

  /** Memory budget in bytes (0 = auto-detect) */
  memoryBudget?: number;

  /** Enable performance monitoring */
  enableMonitoring?: boolean;

  /** Logging level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

/**
 * Model metadata and capabilities
 */
export interface ModelInfo {
  /** Model name */
  name: string;

  /** Model version */
  version: string;

  /** Total parameters (e.g., "7B") */
  parameterCount: string;

  /** Context window size */
  contextLength: number;

  /** Embedding dimension */
  embeddingDim: number;

  /** Number of layers */
  numLayers: number;

  /** Number of attention heads */
  numAttentionHeads: number;

  /** Number of key-value heads */
  numKVHeads: number;

  /** Hidden dimension */
  hiddenDim: number;

  /** Intermediate dimension (feed-forward) */
  intermediateDim: number;

  /** Vocabulary size */
  vocabSize: number;

  /** Quantization type */
  quantization: QuantizationType;

  /** Model size in bytes */
  modelSize: number;

  /** Supported features */
  features: ModelFeatures;
}

/**
 * Model feature flags
 */
export interface ModelFeatures {
  /** Supports multi-token prediction */
  speculativeDecoding: boolean;

  /** Supports KV-cache optimization */
  kvCache: boolean;

  /** Supports batch processing */
  batching: boolean;

  /** Supports progressive refinement */
  progressiveRefinement: boolean;

  /** Requires GPU acceleration */
  requiresGPU: boolean;
}

/**
 * Token generation stream
 */
export interface TokenStream {
  /** Async generator for tokens */
  [Symbol.asyncIterator]: () => AsyncIterator<TokenResult>;

  /** Abort the generation */
  abort(): void;

  /** Current generation progress */
  getProgress(): GenerationProgress;
}

/**
 * Result of token generation step
 */
export interface TokenResult {
  /** Generated token */
  token: string;

  /** Token ID */
  tokenId: number;

  /** Probability score */
  probability: number;

  /** Time taken to generate this token (ms) */
  generationTime: number;

  /** Current position in sequence */
  position: number;

  /** Is this the final token? */
  isDone: boolean;

  /** Reason for stopping (if done) */
  finishReason?: 'length' | 'eos' | 'abort';
}

/**
 * Generation progress metrics
 */
export interface GenerationProgress {
  /** Total tokens generated so far */
  tokensGenerated: number;

  /** Estimated tokens remaining */
  estimatedRemaining: number;

  /** Current FPS (tokens per second) */
  currentFPS: number;

  /** Average FPS over generation */
  averageFPS: number;

  /** Total generation time (ms) */
  totalTime: number;

  /** Time to first token (ms) */
  timeToFirstToken: number;

  /** Memory usage (bytes) */
  memoryUsed: number;

  /** Cache hit rate */
  cacheHitRate: number;
}

/**
 * Performance metrics for inference
 */
export interface PerformanceMetrics {
  /** Total tokens generated */
  totalTokens: number;

  /** Average time per token (ms) */
  avgTimePerToken: number;

  /** Time to first token (ms) */
  timeToFirstToken: number;

  /** Tokens per second (FPS) */
  tokensPerSecond: number;

  /** Peak memory usage (bytes) */
  peakMemoryUsage: number;

  /** GPU utilization (0-1) */
  gpuUtilization: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;

  /** Speculative decoding success rate (0-1) */
  speculativeSuccessRate: number;

  /** Average batch size */
  avgBatchSize: number;

  /** Pipeline parallelism efficiency (0-1) */
  pipelineEfficiency: number;
}

/**
 * Hardware capabilities detected
 */
export interface HardwareCapabilities {
  /** WebGPU support */
  webGPUSupported: boolean;

  /** GPU adapter info */
  adapter: {
    /** Vendor name */
    vendor: string;

    /** Architecture name */
    architecture: string;

    /** Device description */
    description: string;

    /** Total memory (bytes) */
    totalMemory: number;
  } | null;

  /** Supported features */
  features: {
    /** Supports timestamp queries */
    timestampQueries: boolean;

    /** Supports pipeline statistics */
    pipelineStatistics: boolean;

    /** Supports float16 textures */
    float16Textures: boolean;

    /** Supports float32 textures */
    float32Textures: boolean;

    /** Supports storage buffers */
    storageBuffers: boolean;

    /** Max compute workgroups per dimension */
    maxComputeWorkgroups: number[];
  };

  /** Recommended device type */
  recommendedDevice: DeviceType;

  /** Estimated maximum model size (bytes) */
  maxModelSize: number;
}

/**
 * Memory allocation for GPU
 */
export interface GPUMemoryLayout {
  /** Weights buffer */
  weights: GPUBuffer;

  /** KV-cache buffer */
  kvCache: GPUBuffer;

  /** Attention buffer */
  attention: GPUBuffer;

  /** Feed-forward buffer */
  feedForward: GPUBuffer;

  /** Output buffer */
  output: GPUBuffer;

  /** Temporary computation buffer */
  temp: GPUBuffer;

  /** Total allocated memory (bytes) */
  totalSize: number;
}

/**
 * WebGPU compute pipeline configuration
 */
export interface ComputePipelineConfig {
  /** Vertex/fragment shader for rendering (if needed) */
  renderPipeline?: GPURenderPipeline;

  /** Compute shader for matrix multiplication */
  matmulShader: GPUComputePipeline;

  /** Compute shader for attention */
  attentionShader: GPUComputePipeline;

  /** Compute shader for feed-forward */
  feedForwardShader: GPUComputePipeline;

  /** Bind group layout */
  bindGroupLayout: GPUBindGroupLayout;

  /** Pipeline layout */
  pipelineLayout: GPUPipelineLayout;
}

/**
 * Chat session interface
 */
export interface ChatSession {
  /** Send a message and get streaming response */
  respond(message: string): TokenStream;

  /** Get chat history */
  getHistory(): ChatMessage[];

  /** Clear chat history */
  clearHistory(): void;

  /** Set system prompt */
  setSystemPrompt(prompt: string): void;

  /** Get current configuration */
  getConfig(): NeuralStreamConfig;

  /** Get performance metrics */
  getMetrics(): PerformanceMetrics;
}

/**
 * Chat message
 */
export interface ChatMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant';

  /** Message content */
  content: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Error types
 */
export class NeuralStreamError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'NeuralStreamError';
  }
}

export enum ErrorCode {
  /** WebGPU not supported */
  WEBGPU_NOT_SUPPORTED = 'WEBGPU_NOT_SUPPORTED',

  /** Model loading failed */
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',

  /** Out of memory */
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',

  /** Invalid configuration */
  INVALID_CONFIG = 'INVALID_CONFIG',

  /** Inference failed */
  INFERENCE_FAILED = 'INFERENCE_FAILED',

  /** Device lost */
  DEVICE_LOST = 'DEVICE_LOST',

  /** Timeout */
  TIMEOUT = 'TIMEOUT',

  /** Unsupported operation */
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION'
}
