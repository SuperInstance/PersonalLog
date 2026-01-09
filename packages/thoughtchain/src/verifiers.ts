/**
 * Parallel Verifier Manager
 *
 * Coordinates multiple verifier models running in parallel,
 * aggregates results, and manages ensemble voting.
 */

import type {
  VerifierModel,
  VerificationInput,
  VerificationResult,
  EnsembleVote,
  ThoughtChainConfig,
} from './types.js';
import { EventEmitter } from 'eventemitter3';

export class VerifierManager extends EventEmitter {
  private verifiers: VerifierModel[] = [];
  private config: ThoughtChainConfig;

  constructor(verifiers: VerifierModel[], config: ThoughtChainConfig = {}) {
    super();
    this.verifiers = verifiers;
    this.config = config;
  }

  /**
   * Run verifiers in parallel for a step
   */
  async verifyInParallel(input: VerificationInput): Promise<VerificationResult[]> {
    const timeout = this.config.timeout || 30000;

    // Run all verifiers in parallel
    const promises = this.verifiers.map(verifier =>
      Promise.race([
        verifier.verify(input),
        new Promise<VerificationResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Verifier ${verifier.id} timed out`)), timeout)
        ) as Promise<VerificationResult>,
      ])
    );

    try {
      const results = await Promise.all(promises);
      return results.filter(r => !r.error); // Filter out failed verifications
    } catch (error) {
      console.error('Parallel verification error:', error);
      // Return whatever results we got
      return [];
    }
  }

  /**
   * Aggregate verification results using configured strategy
   */
  aggregateResults(results: VerificationResult[]): EnsembleVote {
    if (results.length === 0) {
      return {
        answer: '',
        confidence: 0,
        agreement: 0,
        total: this.verifiers.length,
        disagreements: [],
        method: 'none',
      };
    }

    const strategy = this.config.aggregationStrategy || 'mean';

    switch (strategy) {
      case 'mean':
        return this.aggregateMean(results);
      case 'median':
        return this.aggregateMedian(results);
      case 'weighted':
        return this.aggregateWeighted(results);
      case 'voting':
        return this.aggregateVoting(results);
      case 'confidence-weighted':
        return this.aggregateConfidenceWeighted(results);
      default:
        return this.aggregateMean(results);
    }
  }

  /**
   * Mean aggregation
   */
  private aggregateMean(results: VerificationResult[]): EnsembleVote {
    const avgConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    // Use the reasoning from the highest confidence result
    const bestResult = results.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return {
      answer: bestResult.reasoning,
      confidence: avgConfidence,
      agreement: results.length,
      total: this.verifiers.length,
      disagreements: [],
      method: 'mean',
    };
  }

  /**
   * Median aggregation
   */
  private aggregateMedian(results: VerificationResult[]): EnsembleVote {
    const sorted = [...results].sort((a, b) => a.confidence - b.confidence);
    const medianConfidence =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1].confidence + sorted[sorted.length / 2].confidence) / 2
        : sorted[Math.floor(sorted.length / 2)].confidence;

    const bestResult = sorted[sorted.length - 1];

    return {
      answer: bestResult.reasoning,
      confidence: medianConfidence,
      agreement: results.length,
      total: this.verifiers.length,
      disagreements: [],
      method: 'median',
    };
  }

  /**
   * Weighted aggregation (by model capability)
   */
  private aggregateWeighted(results: VerificationResult[]): EnsembleVote {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of results) {
      const capabilities = result.modelId ? this.getVerifierWeight(result.modelId) : 1;
      totalWeight += capabilities;
      weightedSum += result.confidence * capabilities;
    }

    const weightedConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const bestResult = results.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return {
      answer: bestResult.reasoning,
      confidence: weightedConfidence,
      agreement: results.length,
      total: this.verifiers.length,
      disagreements: [],
      method: 'weighted',
    };
  }

  /**
   * Voting aggregation
   */
  private aggregateVoting(results: VerificationResult[]): EnsembleVote {
    // Group similar answers
    const groups = this.groupSimilarAnswers(results);

    // Find the largest group
    const largestGroup = groups.reduce((largest, current) =>
      current.members.length > largest.members.length ? current : largest
    );

    const disagreements = groups
      .filter(g => g !== largestGroup)
      .flatMap(g =>
        g.members.map(m => ({
          verifierId: m.modelId,
          answer: m.reasoning,
          confidence: m.confidence,
        }))
      );

    return {
      answer: largestGroup.answer,
      confidence: largestGroup.avgConfidence,
      agreement: largestGroup.members.length,
      total: results.length,
      disagreements,
      method: 'voting',
    };
  }

  /**
   * Confidence-weighted aggregation
   */
  private aggregateConfidenceWeighted(results: VerificationResult[]): EnsembleVote {
    let totalConfidence = 0;
    let weightedSum = 0;

    for (const result of results) {
      totalConfidence += result.confidence;
      weightedSum += result.confidence * result.confidence;
    }

    const finalConfidence = totalConfidence > 0 ? weightedSum / totalConfidence : 0;

    const bestResult = results.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return {
      answer: bestResult.reasoning,
      confidence: finalConfidence,
      agreement: results.length,
      total: this.verifiers.length,
      disagreements: [],
      method: 'confidence-weighted',
    };
  }

  /**
   * Group similar answers for voting
   */
  private groupSimilarAnswers(results: VerificationResult[]): Array<{
    answer: string;
    avgConfidence: number;
    members: VerificationResult[];
  }> {
    const groups: Array<{
      answer: string;
      avgConfidence: number;
      members: VerificationResult[];
    }> = [];

    for (const result of results) {
      // Try to find a similar group
      const similarGroup = groups.find(g => this.areAnswersSimilar(g.answer, result.reasoning));

      if (similarGroup) {
        similarGroup.members.push(result);
        similarGroup.avgConfidence =
          similarGroup.members.reduce((sum, m) => sum + m.confidence, 0) /
          similarGroup.members.length;
      } else {
        groups.push({
          answer: result.reasoning,
          avgConfidence: result.confidence,
          members: [result],
        });
      }
    }

    return groups;
  }

  /**
   * Check if two answers are similar (simple implementation)
   */
  private areAnswersSimilar(answer1: string, answer2: string): boolean {
    // Simple similarity check: answers are similar if they share many words
    const words1 = new Set(answer1.toLowerCase().split(/\s+/));
    const words2 = new Set(answer2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    const similarity = intersection.size / union.size;

    return similarity > 0.5; // 50% similarity threshold
  }

  /**
   * Get verifier weight for weighted aggregation
   */
  private getVerifierWeight(verifierId: string): number {
    const verifier = this.verifiers.find(v => v.id === verifierId);
    if (!verifier) return 1;

    const capabilities = verifier.getCapabilities();
    return capabilities.capabilityScore;
  }

  /**
   * Calculate verifier agreement rate
   */
  calculateAgreementRate(results: VerificationResult[]): number {
    if (results.length < 2) return 1;

    const groups = this.groupSimilarAnswers(results);
    const largestGroup = groups.reduce((largest, current) =>
      current.members.length > largest.members.length ? current : largest
    );

    return largestGroup.members.length / results.length;
  }

  /**
   * Add a verifier to the manager
   */
  addVerifier(verifier: VerifierModel): void {
    this.verifiers.push(verifier);
  }

  /**
   * Remove a verifier from the manager
   */
  removeVerifier(verifierId: string): void {
    this.verifiers = this.verifiers.filter(v => v.id !== verifierId);
  }

  /**
   * Get all verifiers
   */
  getVerifiers(): VerifierModel[] {
    return [...this.verifiers];
  }

  /**
   * Initialize all verifiers
   */
  async initializeAll(): Promise<void> {
    await Promise.all(
      this.verifiers
        .filter(v => v.initialize)
        .map(v => v.initialize!())
    );
  }

  /**
   * Cleanup all verifiers
   */
  async cleanupAll(): Promise<void> {
    await Promise.all(
      this.verifiers
        .filter(v => v.cleanup)
        .map(v => v.cleanup!())
    );
  }
}
