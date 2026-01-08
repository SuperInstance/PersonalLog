/**
 * Custom Embeddings Example
 *
 * Demonstrates using a custom embedding generation function.
 * This example uses a mock embedding function, but in production
 * you would use a real embedding model or API.
 */

import { VectorStore, EmbeddingGenerator } from '@superinstance/in-browser-vector-search'

// Mock embedding generator (replace with real implementation)
async function mockEmbeddingGenerator(text: string): Promise<number[]> {
  // In production, this would call a real embedding model
  // For example:
  // - WebLLM for in-browser embeddings
  // - OpenAI API for embeddings
  // - Cohere API
  // - Your own custom model

  console.log(`Generating embedding for: "${text.substring(0, 50)}..."`)

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))

  // Mock: generate a pseudo-random embedding based on text
  const dimensions = 384
  const embedding: number[] = []

  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash = hash & hash
  }

  let seed = Math.abs(hash)
  for (let i = 0; i < dimensions; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    embedding.push((seed % 1000) / 1000)
  }

  return embedding
}

// Example with a real embedding service (commented out)
/*
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

async function openAIEmbeddingGenerator(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })

  return response.data[0].embedding
}
*/

async function customEmbeddingsExample() {
  console.log('🤖 Using custom embedding generator...')

  // Create store with custom embedding generator
  const store = new VectorStore({
    embeddingGenerator: mockEmbeddingGenerator
  })

  await store.init()
  console.log('✅ Vector store initialized with custom embeddings')

  // Add entries (will use custom embedding generator)
  console.log('\n📝 Adding entries with custom embeddings...')

  const entries = await store.addEntries([
    {
      type: 'document',
      sourceId: 'doc1',
      content: 'Artificial intelligence is transforming technology',
      metadata: { timestamp: new Date().toISOString() },
      editable: true
    },
    {
      type: 'document',
      sourceId: 'doc2',
      content: 'Machine learning models learn patterns from data',
      metadata: { timestamp: new Date().toISOString() },
      editable: true
    },
    {
      type: 'document',
      sourceId: 'doc3',
      content: 'Neural networks are inspired by biological brains',
      metadata: { timestamp: new Date().toISOString() },
      editable: true
    }
  ])

  console.log(`✅ Added ${entries.length} entries with custom embeddings`)

  // Search (will also use custom embedding generator)
  console.log('\n🔍 Searching for "deep learning and AI"...')
  const results = await store.search('deep learning and AI', {
    limit: 3
  })

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. Similarity: ${result.similarity.toFixed(3)}`)
    console.log(`   Content: ${result.entry.content}`)
  })

  // Check that embeddings were generated
  console.log('\n📊 Checking embedding dimensions...')
  const entry = await store.getEntry('doc1')
  if (entry?.embedding) {
    console.log(`Embedding dimension: ${entry.embedding.length}`)
    console.log(`First 5 values: ${entry.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}`)
  }

  console.log('\n✅ Example complete!')
  console.log('\n💡 Tip: Replace mockEmbeddingGenerator with a real embedding service')
  console.log('   - WebLLM for in-browser embeddings')
  console.log('   - OpenAI API (text-embedding-3-small)')
  console.log('   - Cohere API')
  console.log('   - Your own custom model')
}

// Run the example
customEmbeddingsExample().catch(console.error)
