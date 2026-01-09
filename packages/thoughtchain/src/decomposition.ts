/**
 * Query Decomposition Engine
 *
 * Breaks complex queries into reasoning steps, identifies dependencies,
 * and plans execution order.
 */

import type { QueryDecomposition, ThoughtChainConfig } from './types.js';

export class QueryDecomposer {
  /**
   * Decompose a complex query into reasoning steps
   */
  static decompose(query: string, config: ThoughtChainConfig = {}): QueryDecomposition {
    const steps = config.steps || 5;

    // Analyze query complexity
    const complexity = this.analyzeComplexity(query);

    // Generate sub-questions based on query type
    const subQuestions = this.generateSubQuestions(query, steps, complexity);

    // Identify dependencies between steps
    const stepsWithDependencies = this.identifyDependencies(subQuestions);

    // Determine execution order
    const executionOrder = this.determineExecutionOrder(stepsWithDependencies);

    return {
      originalQuery: query,
      steps: stepsWithDependencies,
      executionOrder,
      totalSteps: stepsWithDependencies.length,
    };
  }

  /**
   * Analyze query complexity
   */
  private static analyzeComplexity(query: string): 'low' | 'medium' | 'high' {
    const indicators = {
      low: ['what is', 'define', 'simple', 'basic'],
      medium: ['explain', 'describe', 'compare', 'analyze'],
      high: ['why is', 'how does', 'complex', 'relationship between', 'evaluate', 'synthesize'],
    };

    const lowerQuery = query.toLowerCase();

    for (const [level, words] of Object.entries(indicators)) {
      if (words.some(word => lowerQuery.includes(word))) {
        return level as 'low' | 'medium' | 'high';
      }
    }

    return 'medium';
  }

  /**
   * Generate sub-questions for reasoning steps
   */
  private static generateSubQuestions(
    query: string,
    steps: number,
    complexity: 'low' | 'medium' | 'high'
  ): Array<{ step: number; question: string; dependencies: number[]; complexity: 'low' | 'medium' | 'high' }> {
    const subQuestions: Array<{
      step: number;
      question: string;
      dependencies: number[];
      complexity: 'low' | 'medium' | 'high';
    }> = [];

    // Step 1: Understand the query
    subQuestions.push({
      step: 1,
      question: `Understand what is being asked: "${query}"`,
      dependencies: [],
      complexity: 'low',
    });

    // Step 2: Identify key entities and concepts
    subQuestions.push({
      step: 2,
      question: 'Identify key entities, concepts, and relationships in the query',
      dependencies: [1],
      complexity: 'low',
    });

    // Step 3: Retrieve relevant knowledge
    subQuestions.push({
      step: 3,
      question: 'Retrieve relevant knowledge and context about the key concepts',
      dependencies: [2],
      complexity: complexity,
    });

    // Step 4: Analyze and reason
    if (steps >= 4) {
      subQuestions.push({
        step: 4,
        question: 'Analyze the relationships and apply reasoning',
        dependencies: [3],
        complexity: complexity,
      });
    }

    // Step 5: Synthesize answer
    if (steps >= 5) {
      subQuestions.push({
        step: 5,
        question: 'Synthesize findings into a coherent answer',
        dependencies: steps >= 4 ? [4] : [3],
        complexity: 'medium',
      });
    }

    // Additional steps for high complexity
    if (complexity === 'high' && steps > 5) {
      for (let i = 6; i <= steps; i++) {
        subQuestions.push({
          step: i,
          question: `Deepen analysis and explore additional aspects (step ${i})`,
          dependencies: [i - 1],
          complexity: 'high',
        });
      }
    }

    return subQuestions;
  }

  /**
   * Identify dependencies between steps
   */
  private static identifyDependencies(
    steps: Array<{ step: number; question: string; dependencies: number[]; complexity: 'low' | 'medium' | 'high' }>
  ): Array<{ step: number; question: string; dependencies: number[]; complexity: 'low' | 'medium' | 'high' }> {
    // Dependencies are already set in generateSubQuestions
    // This method can be enhanced to analyze and add implicit dependencies
    return steps;
  }

  /**
   * Determine optimal execution order
   */
  private static determineExecutionOrder(
    steps: Array<{ step: number; question: string; dependencies: number[]; complexity: 'low' | 'medium' | 'high' }>
  ): number[] {
    const order: number[] = [];
    const visited = new Set<number>();

    // Topological sort respecting dependencies
    const visit = (stepNum: number) => {
      if (visited.has(stepNum)) return;

      const step = steps.find(s => s.step === stepNum);
      if (!step) return;

      // Visit dependencies first
      for (const dep of step.dependencies) {
        visit(dep);
      }

      visited.add(stepNum);
      order.push(stepNum);
    };

    // Visit all steps
    for (const step of steps) {
      visit(step.step);
    }

    return order;
  }

  /**
   * Optimize decomposition for parallel execution
   */
  static optimizeForParallel(decomposition: QueryDecomposition): {
    parallelGroups: number[][];
    estimatedSpeedup: number;
  } {
    const groups: number[][] = [];
    const processed = new Set<number>();

    // Group steps that can run in parallel (no dependencies)
    for (const stepNum of decomposition.executionOrder) {
      if (processed.has(stepNum)) continue;

      const step = decomposition.steps.find(s => s.step === stepNum);
      if (!step) continue;

      // Find all steps that can run in parallel with this step
      const parallelGroup = [stepNum];
      processed.add(stepNum);

      for (const otherStep of decomposition.steps) {
        if (processed.has(otherStep.step)) continue;

        // Check if otherStep has no dependencies on unprocessed steps
        const canRunInParallel = otherStep.dependencies.every(dep => processed.has(dep));

        if (canRunInParallel) {
          parallelGroup.push(otherStep.step);
          processed.add(otherStep.step);
        }
      }

      groups.push(parallelGroup);
    }

    // Estimate speedup (simplified Amdahl's law)
    const sequentialSteps = groups.filter(g => g.length === 1).length;
    const parallelSteps = decomposition.totalSteps - sequentialSteps;
    const estimatedSpeedup = 1 + (parallelSteps / decomposition.totalSteps) * 0.7;

    return {
      parallelGroups: groups,
      estimatedSpeedup,
    };
  }

  /**
   * Generate context string from completed steps
   */
  static generateContext(
    completedSteps: Array<{
      step: number;
      thought: string;
      confidence: number;
    }>
  ): string {
    if (completedSteps.length === 0) {
      return '';
    }

    const contextParts = completedSteps
      .sort((a, b) => a.step - b.step)
      .map(step => `Step ${step.step} (confidence: ${step.confidence.toFixed(2)}): ${step.thought}`);

    return 'Previous reasoning steps:\n' + contextParts.join('\n');
  }
}
