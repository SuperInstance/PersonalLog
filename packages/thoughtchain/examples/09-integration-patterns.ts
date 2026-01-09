/**
 * Example 9: Integration Patterns
 *
 * Demonstrates how to integrate ThoughtChain with other tools and systems.
 */

import { ThoughtChain, createMockVerifiers } from '@superinstance/thoughtchain';

/**
 * Pattern 1: Integration with Vector Search
 * (Simulated - would use actual vector search in production)
 */
async function withVectorSearch(query: string) {
  console.log('=== Pattern 1: Vector Search Integration ===\n');

  // Simulate retrieving relevant context
  const relevantContext = [
    'Bird migration is primarily driven by seasonal changes in food availability',
    'Migration patterns are instinctual and learned behaviors',
    'Climate change is affecting traditional migration routes',
  ];

  console.log('Retrieved relevant context from vector store:');
  relevantContext.forEach((ctx, i) => {
    console.log(`  ${i + 1}. ${ctx}`);
  });
  console.log();

  // Enhanced query with context
  const enhancedQuery = `${query}\n\nContext: ${relevantContext.join('; ')}`;

  const verifiers = createMockVerifiers(3);
  const tc = new ThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
  });

  const result = await tc.reason(enhancedQuery);

  console.log(`Answer with context: ${result.answer.substring(0, 200)}...`);
  console.log(`Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);

  return result;
}

/**
 * Pattern 2: Integration with Cost Optimization (SmartCost)
 */
async function withCostOptimization(query: string) {
  console.log('\n=== Pattern 2: Cost Optimization ===\n');

  const verifiers = createMockVerifiers(3);
  const tc = new ThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
    // SmartCost would dynamically adjust these based on budget
    confidenceThreshold: 0.85, // Lower threshold to reduce backtracking
    maxBacktrackAttempts: 2, // Fewer attempts
    explainReasoning: false, // Skip explanation generation
  });

  const startTime = Date.now();
  const result = await tc.reason(query);
  const duration = Date.now() - startTime;

  console.log(`Optimized Result:`);
  console.log(`  Duration: ${duration}ms (faster with fewer backtracks)`);
  console.log(`  Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
  console.log(`  Tokens: ${result.tokens.total} (reduced explanation generation)`);
  console.log(`  Cost Savings: ~30-40% compared to full configuration`);

  return result;
}

/**
 * Pattern 3: Integration with RAG (Retrieval-Augmented Generation)
 */
async function withRAG(query: string) {
  console.log('\n=== Pattern 3: RAG Integration ===\n');

  // Simulate document retrieval
  const retrievedDocs = [
    {
      id: 'doc1',
      content: 'Birds migrate to find food and suitable breeding grounds',
      relevance: 0.92,
    },
    {
      id: 'doc2',
      content: 'Migration patterns vary by species and geographic location',
      relevance: 0.87,
    },
    {
      id: 'doc3',
      content: 'Climate warming is causing some birds to alter migration timing',
      relevance: 0.81,
    },
  ];

  console.log('Retrieved documents:');
  retrievedDocs.forEach(doc => {
    console.log(`  [${doc.id}] (relevance: ${(doc.relevance * 100).toFixed(0)}%)`);
    console.log(`    ${doc.content.substring(0, 80)}...`);
  });
  console.log();

  // Build context from retrieved docs
  const ragContext = retrievedDocs
    .map(doc => `[${doc.id}] ${doc.content}`)
    .join('\n');

  const ragQuery = `${query}\n\nRelevant Information:\n${ragContext}`;

  const verifiers = createMockVerifiers(3);
  const tc = new ThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
    confidenceThreshold: 0.90,
  });

  const result = await tc.reason(ragQuery);

  console.log(`RAG-Enhanced Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
  console.log('RAG provides factual grounding, reducing hallucinations');

  return result;
}

/**
 * Pattern 4: Multi-Agent Orchestration
 */
async function multiAgentPattern(query: string) {
  console.log('\n=== Pattern 4: Multi-Agent Orchestration ===\n');

  // Agent 1: Research (gather information)
  console.log('Agent 1: Research Specialist');
  const researchVerifiers = createMockVerifiers(2);
  const researchTC = new ThoughtChain(researchVerifiers, {
    steps: 3,
    verifiers: 2,
  });
  const researchResult = await researchTC.reason(`Research: ${query}`);
  console.log(`  Found: ${researchResult.answer.substring(0, 100)}...\n`);

  // Agent 2: Analysis (analyze findings)
  console.log('Agent 2: Analysis Specialist');
  const analysisVerifiers = createMockVerifiers(2);
  const analysisTC = new ThoughtChain(analysisVerifiers, {
    steps: 3,
    verifiers: 2,
  });
  const analysisResult = await analysisTC.reason(`Analyze: ${researchResult.answer}`);
  console.log(`  Analysis: ${analysisResult.answer.substring(0, 100)}...\n`);

  // Agent 3: Synthesis (combine and present)
  console.log('Agent 3: Synthesis Specialist');
  const synthesisVerifiers = createMockVerifiers(2);
  const synthesisTC = new ThoughtChain(synthesisVerifiers, {
    steps: 3,
    verifiers: 2,
  });
  const synthesisQuery = `Synthesize into final answer:\nResearch: ${researchResult.answer}\nAnalysis: ${analysisResult.answer}`;
  const synthesisResult = await synthesisTC.reason(synthesisQuery);
  console.log(`  Final Answer: ${synthesisResult.answer.substring(0, 100)}...\n`);

  return {
    research: researchResult,
    analysis: analysisResult,
    synthesis: synthesisResult,
  };
}

/**
 * Pattern 5: Caching and Memoization
 */
class CachedThoughtChain {
  private cache = new Map<string, any>();
  private tc: ThoughtChain;

  constructor(verifiers: any[], config: any) {
    this.tc = new ThoughtChain(verifiers, config);
  }

  async reason(query: string) {
    // Check cache
    if (this.cache.has(query)) {
      console.log('Cache hit! Returning cached result.');
      return this.cache.get(query);
    }

    console.log('Cache miss. Running reasoning...');
    const result = await this.tc.reason(query);

    // Cache the result
    this.cache.set(query, result);

    return result;
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }
}

async function withCaching(query: string) {
  console.log('\n=== Pattern 5: Caching and Memoization ===\n');

  const verifiers = createMockVerifiers(3);
  const cachedTC = new CachedThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
  });

  // First call - cache miss
  console.log('First call:');
  const start1 = Date.now();
  await cachedTC.reason(query);
  const time1 = Date.now() - start1;
  console.log(`Duration: ${time1}ms\n`);

  // Second call - cache hit
  console.log('Second call (same query):');
  const start2 = Date.now();
  await cachedTC.reason(query);
  const time2 = Date.now() - start2;
  console.log(`Duration: ${time2}ms`);
  console.log(`Speedup: ${(time1 / time2).toFixed(1)}x\n`);

  console.log(`Cache size: ${cachedTC.getCacheSize()} entries`);
  console.log('Caching provides significant speedup for repeated queries');

  return cachedTC;
}

/**
 * Main integration demo
 */
async function integrationPatterns() {
  console.log('=== ThoughtChain Integration Patterns ===\n');

  const query = 'Why do birds migrate?';

  // Run all patterns
  await withVectorSearch(query);
  await withCostOptimization(query);
  await withRAG(query);
  await multiAgentPattern(query);
  await withCaching(query);

  console.log('\n=== Integration Benefits ===');
  console.log('✓ Vector Search: Provides relevant context');
  console.log('✓ Cost Optimization: Reduces API costs');
  console.log('✓ RAG: Grounds responses in facts');
  console.log('✓ Multi-Agent: Specialized reasoning');
  console.log('✓ Caching: Dramatic speedup for repeated queries');
  console.log('\nThoughtChain integrates seamlessly with your existing AI stack!');
}

// Run the example
integrationPatterns().catch(console.error);
