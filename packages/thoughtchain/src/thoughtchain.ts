/**
 * ThoughtChain - Main Orchestrator
 *
 * Coordinates reasoning decomposition, parallel verification,
 * confidence scoring, and backtracking for reliable AI reasoning.
 */

import type {
  ReasoningResult,
  ReasoningStep,
  ThoughtChainConfig,
  VerifierModel,
  PerformanceMetrics,
} from './types.js';
import { QueryDecomposer } from './decomposition.js';
import { VerifierManager } from './verifiers.js';
import { BacktrackingEngine } from './backtracking.js';
import { EventEmitter } from 'eventemitter3';

export class ThoughtChain extends EventEmitter {
  private verifierManager: VerifierManager;
  private backtrackingEngine: BacktrackingEngine;
  private config: ThoughtChainConfig;

  constructor(verifiers: VerifierModel[], config: ThoughtChainConfig = {}) {
    super();
    this.config = {
      steps: 5,
      verifiers: 3,
      confidenceThreshold: 0.90,
      backtrackOnLowConfidence: true,
      maxBacktrackAttempts: 3,
      explainReasoning: true,
      timeout: 30000,
      aggregationStrategy: 'mean',
      ...config,
    };

    this.verifierManager = new VerifierManager(verifiers, this.config);
    this.backtrackingEngine = new BacktrackingEngine(this.verifierManager, this.config);
  }

  /**
   * Main reasoning method
   */
  static async reason(
    _query: string,
    _config: ThoughtChainConfig = {}
  ): Promise<ReasoningResult> {
    // Note: This static method is a convenience wrapper.
    // In practice, you need to provide verifier models.
    throw new Error(
      'Please use ThoughtChain class directly with verifier models. ' +
      'Example: const tc = new ThoughtChain(verifiers, config); const result = await tc.reason(query);'
    );
  }

  /**
   * Instance reasoning method
   */
  async reason(query: string): Promise<ReasoningResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Emit start event
      this.emit('start', { query, config: this.config });

      // Initialize verifiers
      await this.verifierManager.initializeAll();

      // Step 1: Decompose query
      this.emitProgress(0, this.config.steps!, 'decomposing', 'Decomposing query into reasoning steps');
      const decomposition = QueryDecomposer.decompose(query, this.config);

      // Step 2: Execute reasoning steps
      const reasoningSteps: ReasoningStep[] = [];
      let totalTokens = { input: 0, output: 0, total: 0 };

      for (let i = 0; i < decomposition.executionOrder.length; i++) {
        const stepNum = decomposition.executionOrder[i];
        const stepInfo = decomposition.steps.find(s => s.step === stepNum);

        if (!stepInfo) continue;

        this.emitProgress(
          i,
          decomposition.steps.length,
          'verifying',
          `Executing reasoning step ${stepNum}: ${stepInfo.question}`
        );

        // Create verification input
        const input = {
          query,
          step: stepNum,
          totalSteps: decomposition.steps.length,
          previousSteps: reasoningSteps,
          currentQuestion: stepInfo.question,
          context: QueryDecomposer.generateContext(reasoningSteps),
        };

        // Run verification
        const stepResult = await this.executeStep(input, stepNum);
        reasoningSteps.push(stepResult);

        // Accumulate tokens
        if (stepResult.tokens) {
          totalTokens.input += stepResult.tokens.input;
          totalTokens.output += stepResult.tokens.output;
          totalTokens.total += stepResult.tokens.total;
        }

        // Emit step complete event
        this.emit('stepComplete', stepResult);
        if (this.config.onStepComplete) {
          this.config.onStepComplete(stepResult);
        }
      }

      // Step 3: Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(reasoningSteps);

      // Step 4: Generate explanation
      const explanation = this.config.explainReasoning
        ? this.generateExplanation(query, reasoningSteps)
        : '';

      // Step 5: Compile final result
      const duration = Date.now() - startTime;
      const backtrackingEvents = this.backtrackingEngine.getBacktrackingEvents();

      const result: ReasoningResult = {
        answer: this.synthesizeAnswer(reasoningSteps),
        reasoning: reasoningSteps,
        overallConfidence,
        backtrackingEvents,
        explanation,
        duration,
        tokens: totalTokens,
        stepsCompleted: reasoningSteps.length,
        stepsBacktracked: backtrackingEvents.length,
        success: overallConfidence >= (this.config.confidenceThreshold || 0.90),
        errors: errors.length > 0 ? errors : undefined,
      };

      // Emit complete event
      this.emit('complete', result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      this.emit('error', error);

      return {
        answer: '',
        reasoning: [],
        overallConfidence: 0,
        backtrackingEvents: [],
        explanation: '',
        duration: Date.now() - startTime,
        tokens: { input: 0, output: 0, total: 0 },
        stepsCompleted: 0,
        stepsBacktracked: 0,
        success: false,
        errors,
      };
    } finally {
      // Cleanup verifiers
      await this.verifierManager.cleanupAll();
    }
  }

  /**
   * Execute a single reasoning step
   */
  private async executeStep(
    input: any,
    stepNum: number
  ): Promise<ReasoningStep> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = this.config.maxBacktrackAttempts || 3;

    // Run verification
    const verificationResults = await this.verifierManager.verifyInParallel(input);
    const ensembleResult = this.verifierManager.aggregateResults(verificationResults);

    // Create initial step
    let step: ReasoningStep = {
      step: stepNum,
      thought: ensembleResult.answer,
      confidence: ensembleResult.confidence,
      verifierVotes: verificationResults.map(r => r.confidence),
      subQuestion: input.currentQuestion,
      tokens: this.sumTokens(verificationResults),
      timing: {
        started: startTime,
        completed: Date.now(),
        duration: Date.now() - startTime,
      },
    };

    // Check if backtracking is needed
    while (this.backtrackingEngine.shouldBacktrack(step) && attempts < maxAttempts) {
      attempts++;
      this.emitProgress(
        stepNum - 1,
        this.config.steps!,
        'backtracking',
        `Backtracking on step ${stepNum} (attempt ${attempts})`
      );

      const backtrackResult = await this.backtrackingEngine.backtrack(step, input, attempts);

      if (backtrackResult.success && backtrackResult.newStep) {
        step = backtrackResult.newStep;

        // Emit backtrack event
        this.emit('backtrack', backtrackResult.event);
        if (this.config.onBacktrack && backtrackResult.event) {
          this.config.onBacktrack(backtrackResult.event);
        }
      } else {
        break;
      }
    }

    return step;
  }

  /**
   * Calculate overall confidence from all steps
   */
  private calculateOverallConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0;

    // Weight later steps more heavily (they build on earlier reasoning)
    let totalWeight = 0;
    let weightedSum = 0;

    for (const step of steps) {
      const weight = step.step; // Later steps have higher weight
      totalWeight += weight;
      weightedSum += step.confidence * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate explanation of reasoning
   */
  private generateExplanation(query: string, steps: ReasoningStep[]): string {
    const parts: string[] = [];

    parts.push(`I analyzed the query: "${query}"\n`);

    if (steps.length > 0) {
      parts.push('Reasoning process:\n');

      for (const step of steps) {
        parts.push(
          `Step ${step.step} (confidence: ${(step.confidence * 100).toFixed(1)}%): ${step.thought}`
        );

        if (step.alternatives && step.alternatives.length > 0) {
          parts.push(`  → Considered ${step.alternatives.length} alternative approaches`);
        }
      }

      // Check for backtracking
      const backtrackEvents = this.backtrackingEngine.getBacktrackingEvents();
      if (backtrackEvents.length > 0) {
        parts.push(`\nRefinement: I refined ${backtrackEvents.length} reasoning steps to improve confidence.`);
      }
    }

    parts.push('\nConclusion: Based on this step-by-step reasoning, I arrived at the answer above.');

    return parts.join('\n');
  }

  /**
   * Synthesize final answer from reasoning steps
   */
  private synthesizeAnswer(steps: ReasoningStep[]): string {
    if (steps.length === 0) return '';

    // Use the last step's thought as the final answer
    // (In practice, this might need more sophisticated synthesis)
    const lastStep = steps[steps.length - 1];
    return lastStep.thought;
  }

  /**
   * Sum token usage from verification results
   */
  private sumTokens(results: Array<{ tokens?: { input: number; output: number; total: number } }>): {
    input: number;
    output: number;
    total: number;
  } {
    return results.reduce(
      (sum, r) => ({
        input: sum.input + (r.tokens?.input || 0),
        output: sum.output + (r.tokens?.output || 0),
        total: sum.total + (r.tokens?.total || 0),
      }),
      { input: 0, output: 0, total: 0 }
    );
  }

  /**
   * Emit progress update
   */
  private emitProgress(
    currentStep: number,
    totalSteps: number,
    status: 'decomposing' | 'verifying' | 'aggregating' | 'backtracking' | 'complete',
    currentStepDescription?: string
  ): void {
    const progress = {
      currentStep: currentStep + 1,
      totalSteps,
      percentage: Math.round(((currentStep + 1) / totalSteps) * 100),
      status,
      currentStepDescription,
    };

    this.emit('progress', progress);
    if (this.config.onProgress) {
      this.config.onProgress(progress);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      totalTime: 0, // Would need to track across reasonings
      avgTimePerStep: 0, // Would need to track
      avgConfidence: 0, // Would need to track
      backtrackRate: 0, // Would need to track
      verifierAgreementRate: 0, // Would need to track
      tokenEfficiency: 0, // Would need to track
      parallelEfficiency: 0, // Would need to track
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ThoughtChainConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ThoughtChainConfig {
    return { ...this.config };
  }
}
