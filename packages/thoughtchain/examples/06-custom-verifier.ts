/**
 * Example 6: Custom Verifier Implementation
 *
 * Shows how to implement a custom verifier model.
 */

import {
  VerifierModel,
  VerificationInput,
  VerificationResult,
  ModelCapabilities,
  ThoughtChain,
} from '@superinstance/thoughtchain';

/**
 * Custom verifier that uses a simple keyword-based approach
 * (In production, this would call an actual LLM API)
 */
class CustomKeywordVerifier implements VerifierModel {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async verify(input: VerificationInput): Promise<VerificationResult> {
    const startTime = Date.now();

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simple keyword-based reasoning
    const keywords = this.extractKeywords(input.currentQuestion);
    const reasoning = this.generateReasoning(input, keywords);

    // Calculate confidence based on keyword match
    const confidence = this.calculateConfidence(input, keywords);

    return {
      modelId: this.id,
      reasoning,
      confidence,
      duration: Date.now() - startTime,
      tokens: {
        input: input.currentQuestion.length / 4,
        output: reasoning.length / 4,
        total: 0,
      },
    };
  }

  getCapabilities(): ModelCapabilities {
    return {
      maxTokens: 2048,
      supportsParallel: true,
      typicalResponseTime: 500,
      capabilityScore: 0.6, // Lower score for simple keyword approach
      costPerToken: 0,
    };
  }

  private extractKeywords(question: string): string[] {
    const words = question.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 4); // Only long words
  }

  private generateReasoning(input: VerificationInput, keywords: string[]): string {
    const parts: string[] = [];

    parts.push(`Analyzing the query based on key concepts: ${keywords.slice(0, 3).join(', ')}`);

    if (input.step === 1) {
      parts.push('This appears to be a question that requires understanding the main topic and breaking it down into components.');
    } else if (input.step === input.totalSteps) {
      parts.push('Based on the previous analysis, I can now synthesize a comprehensive answer that addresses all aspects of the question.');
    } else {
      parts.push(`Building on the previous context, I need to examine the relationships between the identified concepts and apply logical reasoning.`);
    }

    parts.push(`The key considerations involve: ${keywords.slice(0, 5).join(', ')}`);

    return parts.join(' ');
  }

  private calculateConfidence(input: VerificationInput, keywords: string[]): number {
    // Base confidence
    let confidence = 0.75;

    // Increase confidence if we have good keywords
    if (keywords.length >= 3) {
      confidence += 0.10;
    }

    // Increase confidence for later steps (assuming better context)
    if (input.step > 1) {
      confidence += 0.05;
    }

    // Add some variance
    confidence += (Math.random() - 0.5) * 0.10;

    return Math.max(0.5, Math.min(0.95, confidence));
  }
}

/**
 * Another custom verifier using pattern matching
 */
class CustomPatternVerifier implements VerifierModel {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async verify(input: VerificationInput): Promise<VerificationResult> {
    const startTime = Date.now();

    await new Promise(resolve => setTimeout(resolve, 700));

    const pattern = this.identifyPattern(input.currentQuestion);
    const reasoning = this.generatePatternReasoning(input, pattern);
    const confidence = 0.80 + Math.random() * 0.15;

    return {
      modelId: this.id,
      reasoning,
      confidence,
      duration: Date.now() - startTime,
      tokens: {
        input: input.currentQuestion.length / 4,
        output: reasoning.length / 4,
        total: 0,
      },
    };
  }

  getCapabilities(): ModelCapabilities {
    return {
      maxTokens: 4096,
      supportsParallel: true,
      typicalResponseTime: 700,
      capabilityScore: 0.7,
      costPerToken: 0,
    };
  }

  private identifyPattern(question: string): string {
    const lower = question.toLowerCase();

    if (lower.includes('what is') || lower.includes('define')) {
      return 'definition';
    } else if (lower.includes('why') || lower.includes('how')) {
      return 'explanation';
    } else if (lower.includes('compare') || lower.includes('difference')) {
      return 'comparison';
    } else if (lower.includes('analyze') || lower.includes('explain')) {
      return 'analysis';
    } else {
      return 'general';
    }
  }

  private generatePatternReasoning(input: VerificationInput, pattern: string): string {
    const patternReasoning: Record<string, string> = {
      definition: 'This question requires a clear, concise definition of the concept, including its key characteristics and examples.',
      explanation: 'This requires explaining the underlying mechanisms, causes, or processes step by step.',
      comparison: 'This involves identifying similarities and differences between the subjects being compared.',
      analysis: 'This requires breaking down the topic into components and examining relationships between them.',
      general: 'This requires a comprehensive approach addressing multiple aspects of the question.',
    };

    return `Pattern identified: ${pattern}. ${patternReasoning[pattern]}`;
  }
}

async function customVerifierExample() {
  console.log('=== Custom Verifier Implementation ===\n');

  // Create custom verifiers
  const verifiers: VerifierModel[] = [
    new CustomKeywordVerifier('keyword-verifier-1', 'Keyword Analyzer 1'),
    new CustomKeywordVerifier('keyword-verifier-2', 'Keyword Analyzer 2'),
    new CustomPatternVerifier('pattern-verifier', 'Pattern Matcher'),
  ];

  // Create ThoughtChain with custom verifiers
  const tc = new ThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
    confidenceThreshold: 0.85,
    backtrackOnLowConfidence: true,
  });

  // Test with different query types
  const queries = [
    'What is machine learning?',
    'Why is the sky blue?',
    'Compare Python and JavaScript.',
    'Analyze the impact of social media on society.',
  ];

  for (const query of queries) {
    console.log(`\n--- Query: ${query} ---`);

    const result = await tc.reason(query);

    console.log(`Answer: ${result.answer.substring(0, 200)}...`);
    console.log(`Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
    console.log(`Backtracks: ${result.stepsBacktracked}`);
  }

  console.log('\n=== Verifier Capabilities ===');
  for (const verifier of verifiers) {
    const capabilities = verifier.getCapabilities();
    console.log(`\n${verifier.name}:`);
    console.log(`  Max Tokens: ${capabilities.maxTokens}`);
    console.log(`  Parallel Support: ${capabilities.supportsParallel}`);
    console.log(`  Response Time: ${capabilities.typicalResponseTime}ms`);
    console.log(`  Capability Score: ${capabilities.capabilityScore}`);
  }
}

// Run the example
customVerifierExample().catch(console.error);
