/**
 * Example 3: Semantic Retrieval
 *
 * Demonstrates finding memories by meaning rather than exact keywords:
 * - Vector-based semantic search
 * - Cross-tier retrieval with ranking
 * - Similarity scoring
 *
 * @module examples/semantic-retrieval
 */

import { MemoryPalace } from '../src/index.js';

/**
 * Simple text embedding function for demonstration
 * In production, use a proper embedding model
 */
function simpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(50).fill(0);

  for (const word of words) {
    for (let i = 0; i < Math.min(word.length, 50); i++) {
      embedding[i] += word.charCodeAt(i) * 0.01;
    }
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map(v => v / magnitude);
}

async function semanticRetrievalDemo() {
  console.log('=== MemoryPalace: Semantic Retrieval Demo ===\n');

  const memory = new MemoryPalace();

  // Store diverse memories with embeddings
  console.log('1. Storing memories with embeddings...');

  const memories = [
    {
      content: 'Machine learning uses algorithms to learn from data',
      embedding: simpleEmbedding('machine learning algorithms data'),
      tags: ['ai', 'ml', 'education'],
      importance: 0.8
    },
    {
      content: 'Neural networks are inspired by biological neurons',
      embedding: simpleEmbedding('neural networks biological neurons brain'),
      tags: ['ai', 'neuroscience'],
      importance: 0.75
    },
    {
      content: 'Python is popular for data science and ML',
      embedding: simpleEmbedding('python programming data science'),
      tags: ['programming', 'python'],
      importance: 0.6
    },
    {
      content: 'Transformers revolutionized NLP with attention mechanisms',
      embedding: simpleEmbedding('transformers NLP attention mechanisms'),
      tags: ['ai', 'nlp', 'deep-learning'],
      importance: 0.85
    },
    {
      content: 'JavaScript is used for web development',
      embedding: simpleEmbedding('javascript web development frontend'),
      tags: ['programming', 'web'],
      importance: 0.5
    }
  ];

  for (const mem of memories) {
    await memory.longTerm.store(mem.content, {
      agentId: 'knowledge-base',
      tags: mem.tags,
      importance: mem.importance,
      embedding: mem.embedding
    });
  }

  console.log('   Stored', memories.length, 'memories in long-term storage\n');

  // Semantic search examples
  console.log('2. Semantic Search Examples:\n');

  // Search 1: AI-related query
  console.log('   Query: "deep learning and neural networks"');
  const query1Embedding = simpleEmbedding('deep learning neural networks');
  const results1 = await memory.semanticSearch('deep learning and neural networks', query1Embedding);

  for (const { memory, similarity } of results1.slice(0, 3)) {
    console.log(`     [${(similarity * 100).toFixed(0)}%] ${memory.content}`);
  }

  // Search 2: Programming-related query
  console.log('\n   Query: "coding and software development"');
  const query2Embedding = simpleEmbedding('coding software development programming');
  const results2 = await memory.semanticSearch('coding and software development', query2Embedding);

  for (const { memory, similarity } of results2.slice(0, 3)) {
    console.log(`     [${(similarity * 100).toFixed(0)}%] ${memory.content}`);
  }

  // Search 3: Specific concept
  console.log('\n   Query: "how machines understand language"');
  const query3Embedding = simpleEmbedding('natural language understanding machines');
  const results3 = await memory.semanticSearch('how machines understand language', query3Embedding);

  for (const { memory, similarity } of results3.slice(0, 3)) {
    console.log(`     [${(similarity * 100).toFixed(0)}%] ${memory.content}`);
  }

  // Cross-tier retrieval
  console.log('\n3. Cross-Tier Retrieval:\n');

  // Store some items in working memory
  memory.working.set('currentTopic', 'explaining neural networks');

  // Search across all tiers
  const crossTierResults = await memory.retrieve('neural');
  console.log(`   Found ${crossTierResults.length} memories across all tiers:`);
  for (const mem of crossTierResults) {
    console.log(`     [${mem.tier}] ${JSON.stringify(mem.content).substring(0, 50)}...`);
  }

  // Tag-based retrieval
  console.log('\n4. Tag-Based Retrieval:\n');

  const aiMemories = await memory.getByTag('ai');
  console.log(`   Found ${aiMemories.length} memories tagged with "ai":`);
  for (const mem of aiMemories) {
    console.log(`     - ${mem.content}`);
  }

  // Get important memories
  console.log('\n5. High-Importance Memories:\n');

  const importantMemories = await memory.getImportant(0.7);
  console.log(`   Found ${importantMemories.length} important memories:`);
  for (const mem of importantMemories) {
    console.log(`     [${mem.importance.toFixed(2)}] ${mem.content}`);
  }

  // Statistics
  console.log('\n6. Retrieval Statistics:\n');
  const stats = memory.getStats();
  console.log(`   Long-term memories: ${stats.longTerm.count}`);
  console.log(`   With vector indexes: ${memory.longTerm.getStats().indexedCount}`);

  await memory.destroy();
  console.log('\n✓ Semantic retrieval demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  semanticRetrievalDemo().catch(console.error);
}

export { semanticRetrievalDemo };
