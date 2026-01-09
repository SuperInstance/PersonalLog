/**
 * SEMANTIC DOCUMENTATION SEARCH
 *
 * Real-world scenario: Tech company with thousands of documentation pages
 * Problem: Users can't find docs because they don't know exact technical terms
 * Solution: Smart search that understands meaning, not just keywords
 *
 * Features:
 * - Semantic search (finds docs by meaning)
 * - Relevance scoring with highlights
 * - Category filtering
 * - Real-time search as you type
 * - Works completely offline
 *
 * Business Value:
 * - Reduced support tickets (users find answers themselves)
 * - Better user experience (find docs with plain English)
 * - Lower customer support costs
 * - Improved product adoption
 *
 * @example
 * // User searches: "how to make text bold"
 * // Finds: "Text Formatting Guide", "Markdown Syntax", "Styling Reference"
 * // Even though none of those contain "bold" in the title!
 */

import { VectorStore } from '@superinstance/in-browser-vector-search'

// ============================================================================
// TYPES
// ============================================================================

interface DocumentationPage {
  id: string
  title: string
  content: string
  category: 'getting-started' | 'api-reference' | 'tutorials' | 'guides' | 'troubleshooting'
  tags: string[]
  lastUpdated: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface SearchResult {
  page: DocumentationPage
  relevanceScore: number
  matchedSections: string[]
  categoryMatch: boolean
}

// ============================================================================
// DOCUMENTATION SEARCH ENGINE
// ============================================================================

class DocumentationSearchEngine {
  private store: VectorStore
  private initialized = false

  constructor() {
    this.store = new VectorStore()
  }

  /**
   * Initialize the search engine
   * Loads documentation from API or file
   */
  async initialize(docs: DocumentationPage[]): Promise<void> {
    console.log('🔍 Initializing Documentation Search Engine...')

    // Initialize vector store
    await this.store.init()

    // Index all documentation pages
    console.log(`📄 Indexing ${docs.length} documentation pages...`)

    // Add entries efficiently in batch
    const entries = docs.map(doc => ({
      type: 'document' as const,
      sourceId: doc.id,
      content: `${doc.title}\n\n${doc.content}`,
      metadata: {
        timestamp: doc.lastUpdated,
        tags: [...doc.tags, doc.category, doc.difficulty],
        title: doc.title,
        category: doc.category,
        difficulty: doc.difficulty
      },
      editable: false
    }))

    await this.store.addEntries(entries)

    this.initialized = true
    console.log('✅ Documentation search engine ready!')
  }

  /**
   * Search documentation by meaning
   *
   * @example
   * const results = await searchEngine.search('how to make text bold')
   * // Finds: "Text Formatting Guide" (relevance: 0.92)
   */
  async search(
    query: string,
    options: {
      category?: DocumentationPage['category']
      difficulty?: DocumentationPage['difficulty']
      limit?: number
      minRelevance?: number
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('Search engine not initialized. Call initialize() first.')
    }

    console.log(`🔎 Searching for: "${query}"`)

    // Build search filters
    const filters: any = {
      limit: options.limit || 10,
      threshold: options.minRelevance || 0.6  // Include somewhat relevant results
    }

    // Add category filter if specified
    if (options.category) {
      filters.tags = [options.category]
    }

    // Add difficulty filter if specified
    if (options.difficulty) {
      filters.tags = [...(filters.tags || []), options.difficulty]
    }

    // Perform semantic search
    const semanticResults = await this.store.search(query, filters)

    // Transform to search results
    const results: SearchResult[] = semanticResults.map(result => {
      const page = this.docFromEntry(result.entry)

      return {
        page,
        relevanceScore: result.similarity,
        matchedSections: this.extractMatchedSections(query, page.content),
        categoryMatch: !options.category || page.category === options.category
      }
    })

    console.log(`✨ Found ${results.length} relevant pages`)

    return results
  }

  /**
   * Get similar documentation pages
   * Useful for "Related Documentation" sections
   */
  async getSimilarPages(pageId: string, limit: number = 5): Promise<DocumentationPage[]> {
    // Get the page
    const entry = await this.store.getEntry(pageId)
    if (!entry) {
      return []
    }

    // Search for similar content
    const similar = await this.store.search(entry.content, {
      limit: limit + 1  // +1 because it will find itself
    })

    // Remove the page itself and convert to DocumentationPage
    return similar
      .filter(r => r.entry.id !== pageId)
      .slice(0, limit)
      .map(r => this.docFromEntry(r.entry))
  }

  /**
   * Get trending documentation (most frequently accessed)
   * Implementation: Track search frequency
   */
  async getTrendingDocs(limit: number = 10): Promise<DocumentationPage[]> {
    // In production, you'd track access frequency
    // For now, return most recently updated
    const entries = await this.store.getEntries({
      limit,
      types: ['document']
    })

    return entries.map(e => this.docFromEntry(e))
  }

  /**
   * Suggest search completions
   * Based on common search patterns
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    // Simple implementation: search and extract key terms
    const results = await this.search(partialQuery, { limit: 20 })

    // Extract unique keywords from top results
    const keywords = new Set<string>()

    results.forEach(result => {
      // Add title words
      result.page.title.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) {
          keywords.add(word)
        }
      })

      // Add tags
      result.page.tags.forEach(tag => keywords.add(tag))
    })

    return Array.from(keywords).slice(0, 10)
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private docFromEntry(entry: any): DocumentationPage {
    return {
      id: entry.sourceId,
      title: entry.metadata?.title || 'Untitled',
      content: entry.content,
      category: entry.metadata?.category || 'guides',
      tags: entry.metadata?.tags?.filter((t: string) =>
        !['getting-started', 'api-reference', 'tutorials', 'guides', 'troubleshooting',
          'beginner', 'intermediate', 'advanced'].includes(t)
      ) || [],
      lastUpdated: entry.metadata?.timestamp || new Date().toISOString(),
      difficulty: entry.metadata?.difficulty || 'intermediate'
    }
  }

  private extractMatchedSections(query: string, content: string): string[] {
    const sections: string[] = []
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)

    // Split content into sections (by headers or paragraphs)
    const contentSections = content.split(/\n\n+/)

    contentSections.forEach(section => {
      const sectionLower = section.toLowerCase()

      // Check if section contains relevant keywords
      const matches = queryWords.filter(word => sectionLower.includes(word))

      if (matches.length >= 2) {
        // Return first 150 chars of matching section
        sections.push(section.slice(0, 150) + '...')
      }
    })

    return sections.slice(0, 3)  // Max 3 sections
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example: Setting up documentation search for a tech company
 */
async function setupDocumentationSearch() {
  // Sample documentation (in production, load from API/CMS)
  const documentation: DocumentationPage[] = [
    {
      id: 'doc-1',
      title: 'Getting Started with JavaScript',
      content: `
        JavaScript is a programming language that allows you to implement complex
        features on web pages. Every time a web page does more than just sit there
        and display static information, you can bet that JavaScript is probably involved.

        This guide will help you understand the basics of JavaScript programming,
        including variables, functions, and control flow.
      `,
      category: 'getting-started',
      tags: ['javascript', 'basics', 'programming'],
      lastUpdated: '2024-01-15',
      difficulty: 'beginner'
    },
    {
      id: 'doc-2',
      title: 'Text Formatting in Markdown',
      content: `
        Markdown provides a simple way to format text without using complex HTML.
        You can make text bold, italic, or create links and lists.

        To make text bold, wrap it in double asterisks: **bold text**
        To make text italic, wrap it in single asterisks: *italic text*

        This makes writing documentation much faster and more readable.
      `,
      category: 'guides',
      tags: ['markdown', 'formatting', 'text', 'documentation'],
      lastUpdated: '2024-01-10',
      difficulty: 'beginner'
    },
    {
      id: 'doc-3',
      title: 'API Reference: Fetch',
      content: `
        The Fetch API provides an interface for fetching resources across the network.
        It provides a global fetch() method that provides an easy, logical way to
        fetch resources asynchronously across the network.

        This modern API replaces XMLHttpRequest and provides better error handling
        and streaming capabilities.
      `,
      category: 'api-reference',
      tags: ['api', 'fetch', 'http', 'network', 'async'],
      lastUpdated: '2024-01-12',
      difficulty: 'intermediate'
    },
    {
      id: 'doc-4',
      title: 'Building REST APIs with Node.js',
      content: `
        Node.js is an excellent choice for building REST APIs due to its
        non-blocking I/O and extensive npm ecosystem.

        This tutorial covers building a complete REST API with Express.js,
        including routing, middleware, error handling, and database integration.
      `,
      category: 'tutorials',
      tags: ['nodejs', 'api', 'rest', 'express', 'backend'],
      lastUpdated: '2024-01-08',
      difficulty: 'advanced'
    },
    {
      id: 'doc-5',
      title: 'Troubleshooting Common Errors',
      content: `
        This guide helps you diagnose and fix common errors in JavaScript.
        Covers TypeError, ReferenceError, and SyntaxError with practical examples.

        Learn how to read error messages, use browser dev tools, and debug
        your code effectively.
      `,
      category: 'troubleshooting',
      tags: ['errors', 'debugging', 'troubleshooting'],
      lastUpdated: '2024-01-05',
      difficulty: 'intermediate'
    }
  ]

  // Initialize search engine
  const searchEngine = new DocumentationSearchEngine()
  await searchEngine.initialize(documentation)

  console.log('\n=== Example Searches ===\n')

  // Example 1: User searches for "how to make text bold"
  console.log('Search: "how to make text bold"')
  const results1 = await searchEngine.search('how to make text bold')

  results1.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.page.title}`)
    console.log(`   Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`)
    console.log(`   Category: ${result.page.category}`)
    console.log(`   Difficulty: ${result.page.difficulty}`)
  })

  // Example 2: Filter by category
  console.log('\n---\n')
  console.log('Search: "javascript" (filter: API reference only)')
  const results2 = await searchEngine.search('javascript', {
    category: 'api-reference'
  })

  results2.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.page.title}`)
    console.log(`   Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`)
  })

  // Example 3: Get similar pages
  console.log('\n---\n')
  console.log('Similar pages to: "Getting Started with JavaScript"')
  const similar = await searchEngine.getSimilarPages('doc-1', 3)

  similar.forEach((page, i) => {
    console.log(`\n${i + 1}. ${page.title}`)
  })

  return searchEngine
}

// ============================================================================
// INTEGRATION WITH WEB FRAMEWORKS
// ============================================================================

/**
 * React Integration Example
 */
/*
import { useState, useEffect } from 'react'

function DocumentationSearch() {
  const [searchEngine, setSearchEngine] = useState<DocumentationSearchEngine | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    // Initialize on mount
    setupDocumentationSearch().then(setSearchEngine)
  }, [])

  useEffect(() => {
    // Search as user types (debounced)
    const timeoutId = setTimeout(async () => {
      if (searchEngine && query.length > 2) {
        const searchResults = await searchEngine.search(query)
        setResults(searchResults)
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, searchEngine])

  return (
    <div className="documentation-search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documentation..."
        className="search-input"
      />

      <div className="search-results">
        {results.map((result, i) => (
          <div key={i} className="result-card">
            <h3>{result.page.title}</h3>
            <div className="relevance-badge">
              {(result.relevanceScore * 100).toFixed(0)}% match
            </div>
            <p className="category">{result.page.category}</p>
            <div className="matched-sections">
              {result.matchedSections.map((section, j) => (
                <p key={j}>{section}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
*/

// Export for use
export { DocumentationSearchEngine, DocumentationPage, SearchResult, setupDocumentationSearch }
