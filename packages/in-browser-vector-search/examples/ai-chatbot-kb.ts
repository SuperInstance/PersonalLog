/**
 * AI CHATBOT KNOWLEDGE BASE
 *
 * Real-world scenario: Customer service chatbot that needs accurate information
 * Problem: Chatbot gives wrong answers because it can't find relevant knowledge articles
 * Solution: Retrieve relevant knowledge for AI responses using semantic search
 *
 * Features:
 * - Context-aware responses (retrieves relevant knowledge)
 * - Fast retrieval (sub-100ms for 100K articles)
 * - Citations (shows source articles)
 * - Confidence scoring (knows when it doesn't know)
 * - Works completely offline
 *
 * Business Value:
 * - Accurate AI responses (reduces hallucinations)
 * - Reduced support costs (automated responses)
 * - 24/7 availability (no human needed)
 * - Scalable (handles unlimited queries)
 * - Lower API costs (smaller context = fewer tokens)
 *
 * @example
 * // User asks: "How do I reset my password?"
 * // Bot retrieves: "Password Reset Guide", "Account Security FAQ"
 * // Bot generates accurate response with citations
 */

import { VectorStore, WebGPUVectorSearch } from '@superinstance/in-browser-vector-search'

// ============================================================================
// TYPES
// ============================================================================

interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  lastUpdated: string
  helpfulRating: number  // 0-1, based on user feedback
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatbotResponse {
  answer: string
  sources: Array<{
    articleId: string
    title: string
    relevance: number
    excerpt: string
  }>
  confidence: number
  needsHuman: boolean
}

// ============================================================================
// AI CHATBOT WITH KNOWLEDGE BASE
// ============================================================================

class AIChatbot {
  private knowledgeBase: VectorStore
  private gpuSearch?: WebGPUVectorSearch
  private conversationHistory: ChatMessage[] = []
  private initialized = false

  constructor(useGPU: boolean = true) {
    this.knowledgeBase = new VectorStore()

    if (useGPU && WebGPUVectorSearch.isBrowserSupported()) {
      this.gpuSearch = new WebGPUVectorSearch(384, {
        useGPU: true,
        batchSize: 128
      })
    }
  }

  /**
   * Initialize the chatbot with knowledge articles
   */
  async initialize(articles: KnowledgeArticle[]): Promise<void> {
    console.log('🤖 Initializing AI Chatbot...')

    // Initialize vector store
    await this.knowledgeBase.init()

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

    // Index knowledge articles
    console.log(`📚 Indexing ${articles.length} knowledge articles...`)

    const entries = articles.map(article => ({
      type: 'document' as const,
      sourceId: article.id,
      content: `${article.title}\n\n${article.content}`,
      metadata: {
        timestamp: article.lastUpdated,
        tags: [...article.tags, article.category],
        title: article.title,
        category: article.category,
        helpfulRating: article.helpfulRating
      },
      editable: false
    }))

    await this.knowledgeBase.addEntries(entries)

    this.initialized = true
    console.log('✅ AI Chatbot ready!')
  }

  /**
   * Process user message and generate response
   *
   * @example
   * const response = await chatbot.processMessage("How do I reset my password?")
   * console.log(response.answer)
   * // "To reset your password, go to Settings > Security..."
   * console.log(response.sources)
   * // [{ title: "Password Reset Guide", relevance: 0.95 }]
   */
  async processMessage(userMessage: string): Promise<ChatbotResponse> {
    if (!this.initialized) {
      throw new Error('Chatbot not initialized. Call initialize() first.')
    }

    console.log(`\n👤 User: "${userMessage}"`)

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    })

    // Retrieve relevant knowledge (fast!)
    const startTime = Date.now()
    const relevantArticles = await this.retrieveRelevantKnowledge(userMessage)
    const retrievalTime = Date.now() - startTime

    console.log(`🔍 Retrieved ${relevantArticles.length} articles in ${retrievalTime}ms`)

    // Generate response using AI (with retrieved context)
    const response = await this.generateResponse(userMessage, relevantArticles)

    // Add to conversation history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.answer,
      timestamp: new Date().toISOString()
    })

    console.log(`🤖 Bot: "${response.answer.substring(0, 100)}..."`)
    console.log(`   Confidence: ${(response.confidence * 100).toFixed(0)}%`)

    return response
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory]
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = []
    console.log('🗑️  Conversation history cleared')
  }

  /**
   * Rate the last response (for feedback loop)
   */
  async rateLastResponse(helpful: boolean): Promise<void> {
    const lastAssistantMessage = [...this.conversationHistory]
      .reverse()
      .find(m => m.role === 'assistant')

    if (!lastAssistantMessage) {
      console.log('No assistant message to rate')
      return
    }

    // In production, you'd update the article's helpfulRating
    // based on this feedback

    console.log(`📊 Response rated as: ${helpful ? 'helpful' : 'not helpful'}`)
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Retrieve relevant knowledge articles for user query
   */
  private async retrieveRelevantKnowledge(
    query: string,
    maxArticles: number = 5
  ): Promise<Array<{ article: KnowledgeArticle; relevance: number }>> {
    // Semantic search
    const results = await this.knowledgeBase.search(query, {
      limit: maxArticles,
      threshold: 0.65  // Include somewhat relevant articles
    })

    return results.map(r => ({
      article: this.articleFromEntry(r.entry),
      relevance: r.similarity
    }))
  }

  /**
   * Generate AI response using retrieved knowledge
   *
   * In production, you'd call OpenAI API, Anthropic API, etc.
   * Here we simulate it with template-based response
   */
  private async generateResponse(
    userMessage: string,
    relevantArticles: Array<{ article: KnowledgeArticle; relevance: number }>
  ): Promise<ChatbotResponse> {
    // Check if we have relevant knowledge
    const topArticle = relevantArticles[0]

    if (!topArticle || topArticle.relevance < 0.7) {
      // Low confidence - escalate to human
      return {
        answer: "I'm not confident I can answer that accurately. Let me connect you with a human agent who can help better.",
        sources: [],
        confidence: 0.3,
        needsHuman: true
      }
    }

    // Generate response using top article(s)
    const sources = relevantArticles.slice(0, 3).map(r => ({
      articleId: r.article.id,
      title: r.article.title,
      relevance: r.relevance,
      excerpt: this.extractExcerpt(userMessage, r.article.content)
    }))

    // Simulate AI-generated response
    // In production, use: OpenAI, Anthropic, or local LLM
    const answer = this.simulateAIResponse(userMessage, sources)

    // Calculate confidence
    const confidence = this.calculateConfidence(relevantArticles)

    return {
      answer,
      sources,
      confidence,
      needsHuman: confidence < 0.5
    }
  }

  /**
   * Simulate AI-generated response (replace with real AI in production)
   */
  private simulateAIResponse(
    userMessage: string,
    sources: Array<{ articleId: string; title: string; relevance: number; excerpt: string }>
  ): string {
    // Simple template-based response
    const topSource = sources[0]

    if (userMessage.toLowerCase().includes('password')) {
      return `To reset your password, follow these steps:\n\n${topSource.excerpt}\n\nIf you continue to have issues, please contact our support team.`
    }

    if (userMessage.toLowerCase().includes('refund')) {
      return `Regarding refunds: ${topSource.excerpt}\n\nOur refund policy allows returns within 30 days of purchase.`
    }

    // Generic response
    return `Based on our knowledge base, here's what I found:\n\n${topSource.excerpt}\n\nDoes this help answer your question?`
  }

  /**
   * Extract relevant excerpt from article content
   */
  private extractExcerpt(query: string, content: string): string {
    // Find most relevant paragraph
    const paragraphs = content.split('\n\n')

    let bestParagraph = paragraphs[0]
    let bestScore = 0

    const queryWords = query.toLowerCase().split(/\s+/)

    paragraphs.forEach(para => {
      const paraLower = para.toLowerCase()
      const score = queryWords.filter(word => word.length > 3 && paraLower.includes(word)).length

      if (score > bestScore) {
        bestScore = score
        bestParagraph = para
      }
    })

    return bestParagraph.slice(0, 200) + '...'
  }

  /**
   * Calculate confidence based on retrieved articles
   */
  private calculateConfidence(
    relevantArticles: Array<{ article: KnowledgeArticle; relevance: number }>
  ): number {
    if (relevantArticles.length === 0) {
      return 0
    }

    // Weight top articles more heavily
    const topRelevance = relevantArticles[0].relevance
    const avgRelevance = relevantArticles.reduce((sum, r) => sum + r.relevance, 0) / relevantArticles.length

    return (topRelevance * 0.7 + avgRelevance * 0.3)
  }

  /**
   * Convert knowledge entry to article
   */
  private articleFromEntry(entry: any): KnowledgeArticle {
    return {
      id: entry.sourceId,
      title: entry.metadata?.title || 'Untitled',
      content: entry.content,
      category: entry.metadata?.category || 'general',
      tags: entry.metadata?.tags?.filter((t: string) =>
        !['getting-started', 'troubleshooting', 'general'].includes(t)
      ) || [],
      lastUpdated: entry.metadata?.timestamp || new Date().toISOString(),
      helpfulRating: entry.metadata?.helpfulRating || 0.5
    }
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

async function setupAIChatbot() {
  // Sample knowledge articles (in production, load from CMS/DB)
  const knowledgeBase: KnowledgeArticle[] = [
    {
      id: 'kb-1',
      title: 'Password Reset Guide',
      content: `
        How to Reset Your Password
        =============================

        If you've forgotten your password, you can reset it in a few simple steps:

        1. Go to the login page
        2. Click "Forgot Password"
        3. Enter your email address
        4. Check your email for reset link
        5. Create a new password

        Your new password must be at least 8 characters long and include
        both letters and numbers.
      `,
      category: 'account',
      tags: ['password', 'reset', 'account', 'security'],
      lastUpdated: '2024-01-15',
      helpfulRating: 0.92
    },
    {
      id: 'kb-2',
      title: 'Account Security Best Practices',
      content: `
        Keep Your Account Secure
        ==========================

        Follow these best practices to protect your account:

        • Use a strong, unique password
        • Enable two-factor authentication
        • Don't share your password with anyone
        • Update your password regularly
        • Be careful of phishing attempts

        If you suspect unauthorized access, change your password immediately
        and contact support.
      `,
      category: 'account',
      tags: ['security', 'account', 'password', '2fa'],
      lastUpdated: '2024-01-10',
      helpfulRating: 0.88
    },
    {
      id: 'kb-3',
      title: 'Refund Policy',
      content: `
        Our Refund Policy
        ==================

        We offer a 30-day money-back guarantee on all purchases.

        To request a refund:
        1. Go to My Orders
        2. Find the order you want to refund
        3. Click "Request Refund"
        4. Select a reason
        5. Submit your request

        Refunds are processed within 5-7 business days.
      `,
      category: 'billing',
      tags: ['refund', 'return', 'money-back', 'policy'],
      lastUpdated: '2024-01-12',
      helpfulRating: 0.85
    },
    {
      id: 'kb-4',
      title: 'Troubleshooting Login Issues',
      content: `
        Can't Log In?
        ==============

        If you're having trouble logging in, try these solutions:

        1. Check your caps lock - passwords are case-sensitive
        2. Clear your browser cache and cookies
        3. Try a different browser
        4. Reset your password if you've forgotten it
        5. Make sure you're using the correct email address

        Contact support if the issue persists.
      `,
      category: 'troubleshooting',
      tags: ['login', 'troubleshooting', 'account'],
      lastUpdated: '2024-01-08',
      helpfulRating: 0.90
    },
    {
      id: 'kb-5',
      title: 'Billing Questions',
      content: `
        Common Billing Questions
        =========================

        Q: When will I be charged?
        A: You'll be charged on the same date each month as your sign-up date.

        Q: Can I change my plan?
        A: Yes, you can upgrade or downgrade anytime from your account settings.

        Q: Do you offer refunds?
        A: Yes, we offer a 30-day money-back guarantee.

        Q: What payment methods do you accept?
        A: We accept all major credit cards and PayPal.
      `,
      category: 'billing',
      tags: ['billing', 'payment', 'faq'],
      lastUpdated: '2024-01-05',
      helpfulRating: 0.82
    }
  ]

  // Initialize chatbot
  const chatbot = new AIChatbot(true)  // Enable GPU acceleration
  await chatbot.initialize(knowledgeBase)

  console.log('\n=== Chatbot Demo ===\n')

  // Simulate conversation
  const response1 = await chatbot.processMessage('How do I reset my password?')
  console.log('\nSources:', response1.sources.map(s => s.title))

  const response2 = await chatbot.processMessage('What is your refund policy?')
  console.log('\nSources:', response2.sources.map(s => s.title))

  const response3 = await chatbot.processMessage('I keep getting logged out')
  console.log('\nSources:', response3.sources.map(s => s.title))

  return chatbot
}

// ============================================================================
// PRODUCTION INTEGRATION (OpenAI Example)
// ============================================================================

/**
 * Real AI Integration with OpenAI
 *
 * This shows how to integrate with a real AI service in production
 */
/*
import OpenAI from 'openai'

class ProductionAIChatbot extends AIChatbot {
  private openai: OpenAI

  constructor(apiKey: string) {
    super(true)
    this.openai = new OpenAI({ apiKey })
  }

  protected async generateResponse(
    userMessage: string,
    relevantArticles: Array<{ article: KnowledgeArticle; relevance: number }>
  ): Promise<ChatbotResponse> {
    // Build context from retrieved articles
    const context = relevantArticles
      .slice(0, 3)
      .map(r => `
        Article: ${r.article.title}
        Content: ${r.article.content}
        Relevance: ${r.relevance}
      `)
      .join('\n')

    // Generate response with OpenAI
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful customer service chatbot.
                     Use the provided knowledge articles to answer questions accurately.
                     If you're not confident, say so and offer to connect with a human.
                     Always cite your sources.`
        },
        {
          role: 'user',
          content: `Knowledge Base:\n${context}\n\nUser Question: ${userMessage}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })

    const answer = completion.choices[0].message.content || 'I apologize, but I cannot provide an answer at this time.'

    const sources = relevantArticles.slice(0, 3).map(r => ({
      articleId: r.article.id,
      title: r.article.title,
      relevance: r.relevance,
      excerpt: r.article.content.slice(0, 200) + '...'
    }))

    return {
      answer,
      sources,
      confidence: this.calculateConfidence(relevantArticles),
      needsHuman: false
    }
  }
}
*/

// Export for use
export {
  AIChatbot,
  KnowledgeArticle,
  ChatMessage,
  ChatbotResponse,
  setupAIChatbot
}
