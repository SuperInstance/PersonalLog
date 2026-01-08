/**
 * Basic Usage Example
 *
 * Demonstrates basic setup and usage of the vector store.
 */

import { VectorStore } from '../src'

async function basicUsage() {
  // Initialize the store
  const store = new VectorStore()
  await store.init()

  console.log('✅ Vector store initialized')

  // Add some knowledge entries
  const entry1 = await store.addEntry({
    id: 'doc1',
    type: 'document',
    sourceId: 'doc1',
    content: 'Vector search enables finding semantically similar content using embeddings',
    metadata: {
      timestamp: new Date().toISOString(),
      tags: ['search', 'vectors', 'embeddings']
    },
    editable: true
  })

  const entry2 = await store.addEntry({
    id: 'doc2',
    type: 'document',
    sourceId: 'doc2',
    content: 'Machine learning models can be fine-tuned with custom datasets',
    metadata: {
      timestamp: new Date().toISOString(),
      tags: ['ml', 'training', 'fine-tuning']
    },
    editable: true
  })

  const entry3 = await store.addEntry({
    id: 'doc3',
    type: 'document',
    sourceId: 'doc3',
    content: 'JavaScript is a versatile programming language for web development',
    metadata: {
      timestamp: new Date().toISOString(),
      tags: ['javascript', 'web', 'programming']
    },
    editable: true
  })

  console.log('✅ Added 3 entries')

  // Search for similar content
  console.log('\n🔍 Searching for "AI and machine learning"...')

  const results = await store.search('AI and machine learning', {
    limit: 3,
    threshold: 0.5
  })

  results.forEach((result: any, index: number) => {
    console.log(`\n${index + 1}. Similarity: ${result.similarity.toFixed(3)}`)
    console.log(`   Content: ${result.entry.content}`)
    console.log(`   Tags: ${result.entry.metadata.tags?.join(', ')}`)
  })

  // Try hybrid search (semantic + keyword)
  console.log('\n🔍 Hybrid search for "JavaScript programming"...')

  const hybridResults = await store.hybridSearch('JavaScript programming', {
    limit: 3
  })

  hybridResults.forEach((result: any, index: number) => {
    console.log(`\n${index + 1}. Similarity: ${result.similarity.toFixed(3)}`)
    console.log(`   Content: ${result.entry.content}`)
  })

  // Get all entries
  console.log('\n📦 All entries:')
  const allEntries = await store.getEntries()
  console.log(`Total entries: ${allEntries.length}`)

  // Update an entry
  console.log('\n✏️  Updating entry doc1...')
  const updated = await store.updateEntry('doc1', {
    content: 'Vector search finds similar content using semantic embeddings and similarity metrics'
  })
  console.log(`Updated: ${updated.editedContent}`)

  console.log('\n✅ Example complete!')
}

// Run the example
basicUsage().catch(console.error)
