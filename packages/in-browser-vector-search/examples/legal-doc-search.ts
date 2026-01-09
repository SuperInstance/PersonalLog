/**
 * LEGAL DOCUMENT SEARCH
 *
 * Real-world scenario: Law firm with thousands of case documents and precedents
 * Problem: Lawyers need to find relevant cases but don't know exact citations
 * Solution: Semantic search to find cases by legal concepts and meaning
 *
 * Features:
 * - Semantic case search (find cases by legal concepts)
 * - Relevance ranking (most relevant precedents first)
 * - Citation matching (find related cases)
 * - Filter by court, date, practice area
 * - Natural language search (search in plain English)
 *
 * Business Value:
 * - Faster legal research (hours instead of days)
 * - Better case preparation (find non-obvious precedents)
 * - Reduced research costs (less billable time)
 * - Improved outcomes (stronger arguments)
 * - Knowledge capture (junior lawyers can find firm's expertise)
 *
 * @example
 * // Lawyer searches: "breach of contract due to force majeure"
 * // Finds: 15 relevant cases with citations and relevance scores
 * // Even cases that don't mention "force majeure" directly!
 */

import { VectorStore, WebGPUVectorSearch } from '@superinstance/in-browser-vector-search'

// ============================================================================
// TYPES
// ============================================================================

interface LegalDocument {
  id: string
  title: string
  caseNumber: string
  court: 'supreme' | 'appeals' | 'district' | 'state'
  year: number
  practiceArea: string
  summary: string
  fullText: string
  citations: string[]  // Case citations
  keyHolding: string  // Main legal principle
  tags: string[]
}

interface SearchResult {
  document: LegalDocument
  relevanceScore: number
  matchedHolding: string
  citedBy: number  // How many times this case is cited
}

interface SearchFilter {
  court?: LegalDocument['court']
  practiceArea?: string
  yearRange?: { min: number; max: number }
  minCitations?: number
}

// ============================================================================
// LEGAL DOCUMENT SEARCH ENGINE
// ============================================================================

class LegalDocumentSearch {
  private documentStore: VectorStore
  private gpuSearch?: WebGPUVectorSearch
  private citationGraph: Map<string, string[]> = new Map()
  private initialized = false

  constructor(useGPU: boolean = true) {
    this.documentStore = new VectorStore()

    if (useGPU && WebGPUVectorSearch.isBrowserSupported()) {
      this.gpuSearch = new WebGPUVectorSearch(384, {
        useGPU: true,
        batchSize: 128
      })
    }
  }

  /**
   * Initialize the legal document search
   */
  async initialize(documents: LegalDocument[]): Promise<void> {
    console.log('⚖️  Initializing Legal Document Search...')

    // Initialize store
    await this.documentStore.init()

    // Initialize GPU if available
    if (this.gpuSearch) {
      try {
        await this.gpuSearch.initializeGPU()
        console.log('🚀 GPU acceleration enabled')
      } catch (error) {
        console.log('⚠️  GPU not available, using CPU')
        this.gpuSearch = undefined
      }
    }

    // Index documents
    console.log(`📜 Indexing ${documents.length} legal documents...`)

    // Build citation graph
    documents.forEach(doc => {
      this.citationGraph.set(doc.id, doc.citations)
    })

    const entries = documents.map(doc => ({
      type: 'document' as const,
      sourceId: doc.id,
      content: `${doc.title}\n\n${doc.summary}\n\nKey Holding: ${doc.keyHolding}\n\n${doc.fullText}`,
      metadata: {
        timestamp: new Date(doc.year, 0, 1).toISOString(),
        tags: [...doc.tags, doc.practiceArea, doc.court],
        title: doc.title,
        caseNumber: doc.caseNumber,
        court: doc.court,
        year: doc.year,
        practiceArea: doc.practiceArea,
        citations: doc.citations
      },
      editable: false
    }))

    await this.documentStore.addEntries(entries)

    this.initialized = true
    console.log('✅ Legal document search ready!')
  }

  /**
   * Search legal documents by meaning
   *
   * @example
   * const results = await legalSearch.search('breach of contract due to force majeure')
   */
  async search(
    query: string,
    filters?: SearchFilter,
    limit: number = 20
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('Search engine not initialized')
    }

    console.log(`\n⚖️  Legal Search: "${query}"`)

    // Build search options
    const searchOptions: any = {
      limit: limit * 2,  // Get more, then filter
      threshold: 0.6
    }

    // Add filters
    if (filters?.court || filters?.practiceArea) {
      searchOptions.tags = []
      if (filters.court) searchOptions.tags.push(filters.court)
      if (filters.practiceArea) searchOptions.tags.push(filters.practiceArea)
    }

    // Perform semantic search
    const results = await this.documentStore.search(query, searchOptions)

    // Transform to search results
    const searchResults: SearchResult[] = []

    for (const result of results) {
      const doc = this.documentFromEntry(result.entry)

      // Apply additional filters
      if (filters?.yearRange) {
        if (doc.year < filters.yearRange.min || doc.year > filters.yearRange.max) {
          continue
        }
      }

      if (filters?.minCitations) {
        const citedBy = this.countCitations(doc.id)
        if (citedBy < filters.minCitations) {
          continue
        }
      }

      searchResults.push({
        document: doc,
        relevanceScore: result.similarity,
        matchedHolding: this.extractMatchingHolding(query, doc),
        citedBy: this.countCitations(doc.id)
      })

      if (searchResults.length >= limit) {
        break
      }
    }

    // Sort by relevance score and citation count
    searchResults.sort((a, b) => {
      const scoreA = a.relevanceScore * 0.7 + Math.min(a.citedBy / 100, 1) * 0.3
      const scoreB = b.relevanceScore * 0.7 + Math.min(b.citedBy / 100, 1) * 0.3
      return scoreB - scoreA
    })

    console.log(`✨ Found ${searchResults.length} relevant cases`)

    return searchResults
  }

  /**
   * Find related cases (citation network)
   *
   * @example
   * const related = await legalSearch.findRelatedCases(caseId)
   */
  async findRelatedCases(caseId: string, limit: number = 10): Promise<SearchResult[]> {
    console.log(`\n🔗 Finding cases related to: ${caseId}`)

    // Get the case
    const caseEntry = await this.documentStore.getEntry(caseId)
    if (!caseEntry) {
      return []
    }

    // Find cases that cite this case
    const citingCases = await this.documentStore.getEntries({
      types: ['document']
    })

    const related: SearchResult[] = []

    for (const entry of citingCases) {
      const citations = entry.metadata?.citations || []

      if (citations.includes(caseId)) {
        const doc = this.documentFromEntry(entry)

        related.push({
          document: doc,
          relevanceScore: 0.8,  // Base score for citation
          matchedHolding: `Cites ${caseId}`,
          citedBy: this.countCitations(doc.id)
        })
      }
    }

    return related.slice(0, limit)
  }

  /**
   * Get case analysis (precedent strength, related cases)
   */
  async analyzeCase(caseId: string): Promise<{
    case: LegalDocument
    precedentStrength: 'strong' | 'moderate' | 'weak'
    citedBy: number
    relatedCases: LegalDocument[]
    keyHolding: string
  }> {
    console.log(`\n📊 Analyzing case: ${caseId}`)

    // Get the case
    const entry = await this.documentStore.getEntry(caseId)
    if (!entry) {
      throw new Error(`Case not found: ${caseId}`)
    }

    const caseDoc = this.documentFromEntry(entry)

    // Count citations
    const citedBy = this.countCitations(caseId)

    // Determine precedent strength
    let precedentStrength: 'strong' | 'moderate' | 'weak'
    if (citedBy >= 50) {
      precedentStrength = 'strong'
    } else if (citedBy >= 10) {
      precedentStrength = 'moderate'
    } else {
      precedentStrength = 'weak'
    }

    // Find related cases
    const relatedResults = await this.findRelatedCases(caseId, 5)
    const relatedCases = relatedResults.map(r => r.document)

    return {
      case: caseDoc,
      precedentStrength,
      citedBy,
      relatedCases,
      keyHolding: caseDoc.keyHolding
    }
  }

  /**
   * Search by legal concept (not specific terms)
   *
   * @example
   * const results = await legalSearch.searchByConcept('piercing the corporate veil')
   */
  async searchByConcept(concept: string, limit: number = 20): Promise<SearchResult[]> {
    console.log(`\n💡 Searching by concept: "${concept}"`)

    // Use semantic search
    return this.search(concept, {}, limit)
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private countCitations(caseId: string): number {
    let count = 0

    for (const [, citations] of this.citationGraph) {
      if (citations.includes(caseId)) {
        count++
      }
    }

    return count
  }

  private extractMatchingHolding(query: string, doc: LegalDocument): string {
    // Simple extraction - in production, use more sophisticated NLP
    const holding = doc.keyHolding

    // Return first 200 chars of holding
    if (holding.length <= 200) {
      return holding
    }

    return holding.slice(0, 200) + '...'
  }

  private documentFromEntry(entry: any): LegalDocument {
    return {
      id: entry.sourceId,
      title: entry.metadata?.title || 'Unknown Case',
      caseNumber: entry.metadata?.caseNumber || '',
      court: entry.metadata?.court || 'district',
      year: parseInt(entry.metadata?.year || '0'),
      practiceArea: entry.metadata?.practiceArea || 'general',
      summary: entry.content.split('\n\n')[1] || '',
      fullText: entry.content,
      citations: entry.metadata?.citations || [],
      keyHolding: entry.content.includes('Key Holding:')
        ? entry.content.split('Key Holding:')[1].split('\n\n')[0].trim()
        : '',
      tags: entry.metadata?.tags?.filter((t: string) =>
        !['supreme', 'appeals', 'district', 'state'].includes(t)
      ) || []
    }
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

async function setupLegalDocumentSearch() {
  // Sample legal documents
  const legalDocuments: LegalDocument[] = [
    {
      id: 'case-1',
      title: 'Smith v. Jones Enterprises',
      caseNumber: '2024-SC-12345',
      court: 'supreme',
      year: 2024,
      practiceArea: 'contract law',
      summary: `
        This case addresses whether force majeure clauses can be invoked
        during a global pandemic. The court ruled that unforeseen circumstances
        beyond reasonable control may excuse performance.
      `,
      fullText: `
        The plaintiff argues that the pandemic was foreseeable and should not
        excuse performance. The defendant claims that government-mandated
        shutdowns constitute force majeure events.

        The court held that while pandemics are not uncommon, the specific
        government response and its impact on business operations were
        unforeseeable and qualify as force majeure.
      `,
      citations: ['case-2', 'case-3'],
      keyHolding: 'Force majeure clauses can be invoked when government action makes performance impossible, even if the underlying cause (pandemic) was known.',
      tags: ['force majeure', 'contract', 'pandemic', 'performance']
    },
    {
      id: 'case-2',
      title: 'Williams v. ABC Corp',
      caseNumber: '2023-AC-67890',
      court: 'appeals',
      year: 2023,
      practiceArea: 'contract law',
      summary: `
        This case considers whether material changes in market conditions
        constitute frustration of purpose.
      `,
      fullText: `
        The plaintiff seeks to terminate a contract due to drastic changes
        in market conditions post-pandemic. The defendant argues that
        market fluctuations are ordinary business risks.

        The court ruled that the changes must be so severe that the
        fundamental purpose of the contract is destroyed, not merely
        that the contract has become less profitable.
      `,
      citations: ['case-1'],
      keyHolding: 'Frustration of purpose requires destruction of the contract\'s fundamental purpose, not mere economic hardship.',
      tags: ['frustration of purpose', 'contract', 'market conditions']
    },
    {
      id: 'case-3',
      title: 'Johnson v. Tech Solutions Inc',
      caseNumber: '2024-DC-11111',
      court: 'district',
      year: 2024,
      practiceArea: 'employment law',
      summary: `
        This case examines whether remote work arrangements constitute
        a material change in employment terms.
      `,
      fullText: `
        The employee argues that mandatory remote work constitutes a
        constructive discharge. The employer claims it's a reasonable
        accommodation during public health emergencies.

        The court held that temporary remote work orders do not constitute
        a material change in employment terms, especially when justified
        by health concerns.
      `,
      citations: [],
      keyHolding: 'Temporary remote work mandates during public health emergencies do not constitute constructive discharge or material changes to employment terms.',
      tags: ['employment', 'remote work', 'constructive discharge']
    },
    {
      id: 'case-4',
      title: 'Brown v. Manufacturing Co',
      caseNumber: '2023-SC-22222',
      court: 'supreme',
      year: 2023,
      practiceArea: 'tort law',
      summary: `
        This case addresses employer liability for workplace exposure
        during health emergencies.
      `,
      fullText: `
        The plaintiff claims the employer failed to provide adequate
        protection against workplace hazards. The employer argues that
        they followed all available guidelines.

        The court established that employers have a duty of care to
        provide reasonable protection, even during emergencies, and
        cannot simply rely on government guidelines as a complete defense.
      `,
      citations: ['case-1', 'case-3'],
      keyHolding: 'Employers have an independent duty of care to protect workers, beyond mere compliance with government guidelines.',
      tags: ['tort', 'workplace safety', 'employer liability', 'duty of care']
    },
    {
      id: 'case-5',
      title: 'Davis v. Retail Chain LLC',
      caseNumber: '2024-AC-33333',
      court: 'appeals',
      year: 2024,
      practiceArea: 'contract law',
      summary: `
        This case considers whether supply chain disruptions justify
        non-performance under force majeure provisions.
      `,
      fullText: `
        The plaintiff cannot deliver goods due to supply chain disruptions.
        The defendant argues this is a normal business risk.

        The court held that supply chain disruptions specifically caused
        by government actions (border closures, export restrictions) may
        qualify as force majeure events, but general market shortages do not.
      `,
      citations: ['case-1'],
      keyHolding: 'Supply chain disruptions caused by specific government actions may qualify as force majeure, but general market shortages do not.',
      tags: ['force majeure', 'supply chain', 'contract performance']
    }
  ]

  // Initialize search engine
  const legalSearch = new LegalDocumentSearch(true)
  await legalSearch.initialize(legalDocuments)

  console.log('\n=== Legal Document Search Demo ===\n')

  // Example 1: Search by legal concept
  console.log('Search: "breach of contract due to unforeseen circumstances"')
  const results1 = await legalSearch.search(
    'breach of contract due to unforeseen circumstances',
    {},
    5
  )

  results1.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.document.title}`)
    console.log(`   Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`)
    console.log(`   Citations: ${result.citedBy}`)
    console.log(`   Holding: ${result.matchedHolding}`)
  })

  // Example 2: Filter by court
  console.log('\n---\n')
  console.log('Search: "force majeure" (Supreme Court only)')
  const results2 = await legalSearch.search(
    'force majeure',
    { court: 'supreme' },
    5
  )

  results2.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.document.title}`)
    console.log(`   Court: ${result.document.court}`)
    console.log(`   Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`)
  })

  // Example 3: Find related cases
  console.log('\n---\n')
  console.log('Find cases related to: "Smith v. Jones Enterprises"')
  const related = await legalSearch.findRelatedCases('case-1', 3)

  related.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.document.title}`)
    console.log(`   Relation: ${result.matchedHolding}`)
  })

  // Example 4: Case analysis
  console.log('\n---\n')
  console.log('Case analysis: "Smith v. Jones Enterprises"')
  const analysis = await legalSearch.analyzeCase('case-1')

  console.log(`\nPrecedent Strength: ${analysis.precedentStrength}`)
  console.log(`Cited by: ${analysis.citedBy} cases`)
  console.log(`Key Holding: ${analysis.keyHolding}`)

  return legalSearch
}

// Export for use
export {
  LegalDocumentSearch,
  LegalDocument,
  SearchResult,
  SearchFilter,
  setupLegalDocumentSearch
}
