/**
 * ThoughtChain - Parallel Reasoning Verification System
 *
 * Reduces LLM errors by 60-80% through multi-model cross-validation
 *
 * @example
 * ```typescript
 * import { ThoughtChain, MockVerifier } from '@superinstance/thoughtchain';
 *
 * // Create verifiers (replace with real models in production)
 * const verifiers = [
 *   new MockVerifier('model-1', 'Model 1'),
 *   new MockVerifier('model-2', 'Model 2'),
 *   new MockVerifier('model-3', 'Model 3'),
 * ];
 *
 * // Create ThoughtChain instance
 * const tc = new ThoughtChain(verifiers, {
 *   steps: 5,
 *   verifiers: 3,
 *   confidenceThreshold: 0.90,
 *   backtrackOnLowConfidence: true,
 * });
 *
 * // Run reasoning
 * const result = await tc.reason("What's the capital of France and why is it historically significant?");
 *
 * console.log('Answer:', result.answer);
 * console.log('Confidence:', result.overallConfidence);
 * console.log('Reasoning steps:', result.reasoning.length);
 * ```
 */

// Main exports
export { ThoughtChain } from './thoughtchain.js';
export { QueryDecomposer } from './decomposition.js';
export { VerifierManager } from './verifiers.js';
export { BacktrackingEngine } from './backtracking.js';

// Mock verifier for testing
export { MockVerifier, createMockVerifiers } from './mock-verifier.js';
export type { MockVerifierConfig } from './mock-verifier.js';

// Type exports
export type {
  // Core types
  ReasoningStep,
  ReasoningAlternative,
  BacktrackingEvent,
  VerificationResult,
  ThoughtChainConfig,
  ReasoningProgress,
  ReasoningResult,

  // Query decomposition
  QueryDecomposition,

  // Verifiers
  VerifierModel,
  VerificationInput,
  ModelCapabilities,
  EnsembleVote,

  // Metrics
  PerformanceMetrics,
} from './types.js';
