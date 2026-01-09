/**
 * Mock Verifier Model
 *
 * A simulated verifier for testing and development.
 * In production, this would be replaced with actual LLM models.
 */

import type {
  VerifierModel,
  VerificationInput,
  VerificationResult,
  ModelCapabilities,
} from './types.js';

export interface MockVerifierConfig {
  /** Base response time in milliseconds */
  baseResponseTime?: number;

  /** Base confidence score */
  baseConfidence?: number;

  /** Confidence variance (randomness) */
  confidenceVariance?: number;

  /** Error rate (0-1) */
  errorRate?: number;

  /** Capability score */
  capabilityScore?: number;
}

export class MockVerifier implements VerifierModel {
  id: string;
  name: string;
  private config: Required<MockVerifierConfig>;

  constructor(id: string, name: string, config: MockVerifierConfig = {}) {
    this.id = id;
    this.name = name;
    this.config = {
      baseResponseTime: config.baseResponseTime || 1000,
      baseConfidence: config.baseConfidence || 0.85,
      confidenceVariance: config.confidenceVariance || 0.10,
      errorRate: config.errorRate || 0.05,
      capabilityScore: config.capabilityScore || 0.8,
    };
  }

  /**
   * Simulate verification
   */
  async verify(input: VerificationInput): Promise<VerificationResult> {
    const startTime = Date.now();

    // Simulate processing time
    await this.simulateProcessing();

    // Check for random errors
    if (Math.random() < this.config.errorRate) {
      return {
        modelId: this.id,
        reasoning: '',
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'Simulated verification error',
      };
    }

    // Generate mock reasoning based on input
    const reasoning = this.generateMockReasoning(input);

    // Calculate confidence with some variance
    const confidenceVariance = (Math.random() - 0.5) * 2 * this.config.confidenceVariance;
    const confidence = Math.max(0, Math.min(1, this.config.baseConfidence + confidenceVariance));

    return {
      modelId: this.id,
      reasoning,
      confidence,
      duration: Date.now() - startTime,
      tokens: {
        input: Math.floor(input.currentQuestion.length / 4),
        output: Math.floor(reasoning.length / 4),
        total: 0,
      },
    };
  }

  /**
   * Get model capabilities
   */
  getCapabilities(): ModelCapabilities {
    return {
      maxTokens: 4096,
      supportsParallel: true,
      typicalResponseTime: this.config.baseResponseTime,
      capabilityScore: this.config.capabilityScore,
      costPerToken: 0.0001,
    };
  }

  /**
   * Simulate processing time
   */
  private async simulateProcessing(): Promise<void> {
    const variance = (Math.random() - 0.5) * this.config.baseResponseTime * 0.5;
    const delay = Math.max(0, this.config.baseResponseTime + variance);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generate mock reasoning based on input
   */
  private generateMockReasoning(input: VerificationInput): string {
    const { query, step, totalSteps, currentQuestion } = input;

    // Generate context-aware reasoning
    const reasoningParts: string[] = [];

    if (step === 1) {
      reasoningParts.push(
        `I'm analyzing the query: "${query}"`,
        `The key components of this question involve understanding the main topic and what is being asked.`,
        `I'll break this down systematically to ensure I address all aspects.`
      );
    } else if (step === totalSteps) {
      reasoningParts.push(
        `Based on my analysis in the previous steps, I can now synthesize a comprehensive answer.`,
        `The key points to consider are the relationships and patterns identified earlier.`,
        `Putting it all together, I can now provide a well-reasoned conclusion.`
      );
    } else {
      reasoningParts.push(
        `For step ${step}, I'm focusing on: ${currentQuestion}`,
        `Building on the previous context, I can see that this requires careful consideration of the relationships between concepts.`,
        `I'm evaluating the evidence and reasoning through the implications systematically.`
      );
    }

    return reasoningParts.join(' ');
  }

  /**
   * Initialize model (no-op for mock)
   */
  async initialize(): Promise<void> {
    // No initialization needed for mock
  }

  /**
   * Cleanup model (no-op for mock)
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for mock
  }
}

/**
 * Create multiple mock verifiers with different characteristics
 */
export function createMockVerifiers(count: number = 3): MockVerifier[] {
  const verifiers: MockVerifier[] = [];

  for (let i = 0; i < count; i++) {
    const verifier = new MockVerifier(
      `mock-verifier-${i + 1}`,
      `Mock Verifier ${i + 1}`,
      {
        baseResponseTime: 800 + i * 200, // Varied response times
        baseConfidence: 0.80 + i * 0.05, // Varied confidence
        confidenceVariance: 0.08,
        errorRate: 0.03,
        capabilityScore: 0.75 + i * 0.05,
      }
    );
    verifiers.push(verifier);
  }

  return verifiers;
}
