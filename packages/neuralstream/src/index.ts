/**
 * NeuralStream - 60 FPS Browser LLM Inference
 *
 * Revolutionary browser AI that runs 7B parameter models at 60 FPS
 * using WebGPU acceleration. Zero API costs, complete privacy.
 *
 * @example
 * ```typescript
 * import { NeuralStream } from '@superinstance/neuralstream';
 *
 * const stream = await NeuralStream.create({
 *   modelPath: '/models/llama-7b-quantized.gguf',
 *   maxTokens: 2048,
 *   temperature: 0.7
 * });
 *
 * for await (const token of stream.generate("Explain quantum computing")) {
 *   console.log(token.token); // Smooth 60 FPS updates
 * }
 * ```
 */

// Main exports
export { NeuralStream, ChatSessionImpl } from './core/NeuralStream.js';

// Type exports
export * from './types/index.js';

// Re-export for convenience
export type { TokenStream, TokenResult, ModelInfo, PerformanceMetrics, HardwareCapabilities, NeuralStreamConfig, ChatSession };
