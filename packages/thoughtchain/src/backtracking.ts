/**
 * Backtracking Engine
 *
 * Handles automatic backtracking on low confidence steps,
 * implements retry strategies, and manages alternative reasoning paths.
 */

import type {
  ReasoningStep,
  BacktrackingEvent,
  ThoughtChainConfig,
  VerificationInput,
} from './types.js';
import { VerifierManager } from './verifiers.js';

export class BacktrackingEngine {
  private config: ThoughtChainConfig;
  private verifierManager: VerifierManager;
  private backtrackingEvents: BacktrackingEvent[] = [];

  constructor(verifierManager: VerifierManager, config: ThoughtChainConfig = {}) {
    this.verifierManager = verifierManager;
    this.config = config;
  }

  /**
   * Check if a step should be backtracked
   */
  shouldBacktrack(step: ReasoningStep): boolean {
    if (!this.config.backtrackOnLowConfidence) {
      return false;
    }

    const threshold = this.config.confidenceThreshold || 0.90;
    return step.confidence < threshold;
  }

  /**
   * Perform backtracking for a step
   */
  async backtrack(
    step: ReasoningStep,
    input: VerificationInput,
    attempt: number = 1
  ): Promise<{ success: boolean; newStep?: ReasoningStep; event?: BacktrackingEvent }> {
    const maxAttempts = this.config.maxBacktrackAttempts || 3;

    if (attempt > maxAttempts) {
      return { success: false };
    }

    // Choose retry strategy
    const strategy = this.chooseRetryStrategy(step, attempt);

    // Execute retry with strategy
    const retryResult = await this.executeRetry(step, input, strategy, attempt);

    // Record event
    if (retryResult.event) {
      this.backtrackingEvents.push(retryResult.event);
    }

    return retryResult;
  }

  /**
   * Choose retry strategy based on step and attempt number
   */
  private chooseRetryStrategy(
    step: ReasoningStep,
    attempt: number
  ): 'more-verbatim' | 'different-path' | 'decompose-further' | 'increase-verifiers' {
    // Strategy progression based on attempt number
    switch (attempt) {
      case 1:
        // First attempt: be more explicit and verbatim
        return 'more-verbatim';
      case 2:
        // Second attempt: try different reasoning path
        return 'different-path';
      case 3:
        // Third attempt: decompose further or increase verifiers
        return step.verifierVotes.length < 5 ? 'increase-verifiers' : 'decompose-further';
      default:
        return 'different-path';
    }
  }

  /**
   * Execute retry with chosen strategy
   */
  private async executeRetry(
    step: ReasoningStep,
    input: VerificationInput,
    strategy: 'more-verbatim' | 'different-path' | 'decompose-further' | 'increase-verifiers',
    attempt: number
  ): Promise<{ success: boolean; newStep?: ReasoningStep; event?: BacktrackingEvent }> {
    const startTime = Date.now();

    try {
      let modifiedInput = { ...input };

      switch (strategy) {
        case 'more-verbatim':
          modifiedInput = this.makeMoreVerbatim(input, step);
          break;

        case 'different-path':
          modifiedInput = this.tryDifferentPath(input, step);
          break;

        case 'decompose-further':
          modifiedInput = this.decomposeFurther(input, step);
          break;

        case 'increase-verifiers':
          // Increase verifier count is handled by the verifier manager
          break;
      }

      // Run verification with modified input
      const verificationResults = await this.verifierManager.verifyInParallel(modifiedInput);
      const ensembleResult = this.verifierManager.aggregateResults(verificationResults);

      // Create new step with improved reasoning
      const newStep: ReasoningStep = {
        ...step,
        thought: ensembleResult.answer,
        confidence: ensembleResult.confidence,
        verifierVotes: verificationResults.map(r => r.confidence),
        alternatives: step.alternatives || [
          {
            thought: step.thought,
            confidence: step.confidence,
            reason: 'Original reasoning that triggered backtracking',
            verifierVotes: step.verifierVotes,
          },
        ],
        timing: {
          started: startTime,
          completed: Date.now(),
          duration: Date.now() - startTime,
        },
      };

      // Create backtracking event
      const event: BacktrackingEvent = {
        step: step.step,
        originalConfidence: step.confidence,
        attempt,
        newThought: newStep.thought,
        newConfidence: newStep.confidence,
        reason: `Confidence ${step.confidence.toFixed(2)} below threshold ${(this.config.confidenceThreshold || 0.90).toFixed(2)}`,
        strategy,
      };

      // Check if backtracking improved confidence
      const improved = newStep.confidence > step.confidence;
      const meetsThreshold = newStep.confidence >= (this.config.confidenceThreshold || 0.90);

      return {
        success: improved && meetsThreshold,
        newStep,
        event,
      };
    } catch (error) {
      console.error(`Backtracking attempt ${attempt} failed:`, error);

      const event: BacktrackingEvent = {
        step: step.step,
        originalConfidence: step.confidence,
        attempt,
        newThought: '',
        newConfidence: 0,
        reason: `Error during backtracking: ${error}`,
        strategy,
      };

      return { success: false, event };
    }
  }

  /**
   * Make input more verbatim and explicit
   */
  private makeMoreVerbatim(input: VerificationInput, step: ReasoningStep): VerificationInput {
    return {
      ...input,
      currentQuestion: `Let me think through this very carefully and explicitly. ${input.currentQuestion}

Previous reasoning (confidence: ${step.confidence.toFixed(2)}): "${step.thought}"

Please provide a more detailed, step-by-step reasoning that explicitly shows your work.`,
    };
  }

  /**
   * Try a different reasoning path
   */
  private tryDifferentPath(input: VerificationInput, step: ReasoningStep): VerificationInput {
    return {
      ...input,
      currentQuestion: `Let me approach this from a different angle. ${input.currentQuestion}

Previous approach (confidence: ${step.confidence.toFixed(2)}): "${step.thought}"

Please try a different reasoning approach or perspective.`,
    };
  }

  /**
   * Decompose the step further into smaller sub-steps
   */
  private decomposeFurther(input: VerificationInput, step: ReasoningStep): VerificationInput {
    return {
      ...input,
      currentQuestion: `Let me break this down into smaller, more manageable pieces. ${input.currentQuestion}

Previous attempt (confidence: ${step.confidence.toFixed(2)}): "${step.thought}"

Please:
1. Identify the sub-components of this question
2. Address each component separately
3. Then synthesize the results`,
    };
  }

  /**
   * Get all backtracking events
   */
  getBacktrackingEvents(): BacktrackingEvent[] {
    return [...this.backtrackingEvents];
  }

  /**
   * Clear backtracking events
   */
  clearBacktrackingEvents(): void {
    this.backtrackingEvents = [];
  }

  /**
   * Get backtracking statistics
   */
  getBacktrackingStats(): {
    totalEvents: number;
    eventsByStep: Record<number, number>;
    eventsByStrategy: Record<string, number>;
    successRate: number;
    avgImprovement: number;
  } {
    const eventsByStep: Record<number, number> = {};
    const eventsByStrategy: Record<string, number> = {};
    let successfulImprovements = 0;
    let totalImprovement = 0;

    for (const event of this.backtrackingEvents) {
      // Count by step
      eventsByStep[event.step] = (eventsByStep[event.step] || 0) + 1;

      // Count by strategy
      eventsByStrategy[event.strategy] = (eventsByStrategy[event.strategy] || 0) + 1;

      // Calculate improvement
      if (event.newConfidence > event.originalConfidence) {
        successfulImprovements++;
        totalImprovement += event.newConfidence - event.originalConfidence;
      }
    }

    return {
      totalEvents: this.backtrackingEvents.length,
      eventsByStep,
      eventsByStrategy,
      successRate: this.backtrackingEvents.length > 0
        ? successfulImprovements / this.backtrackingEvents.length
        : 0,
      avgImprovement: successfulImprovements > 0
        ? totalImprovement / successfulImprovements
        : 0,
    };
  }
}
