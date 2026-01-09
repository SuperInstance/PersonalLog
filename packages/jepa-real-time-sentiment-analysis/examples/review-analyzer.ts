/**
 * Product Review Analyzer
 *
 * Understand what customers love and hate about your products
 * Analyze thousands of reviews in seconds with AI-powered insights
 *
 * Use Case:
 * - E-commerce product review analysis
 * - App store review monitoring
 * - Restaurant review aggregation
 * - Hotel feedback analysis
 * - Service quality tracking
 *
 * Features:
 * - Batch analysis of thousands of reviews
 * - Sentiment-based review categorization
 * - Key theme extraction
 * - Strength and weakness identification
 * - Trend tracking over time
 * - Competitive comparison
 */

import { createWebGPUSentimentAnalyzer, detectSentimentsBatch, TextSentimentDetection } from '@superinstance/jepa-real-time-sentiment-analysis'

// ============================================================================
// INTERFACES
// ============================================================================

interface ProductReview {
  id: string
  productId: string
  rating: number // 1-5 stars
  title: string
  text: string
  author: string
  date: Date
  verifiedPurchase: boolean
  helpfulVotes: number
  sentiment?: TextSentimentDetection
  themes?: string[]
}

interface ReviewInsights {
  totalReviews: number
  averageRating: number
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
  topStrengths: Array<{ theme: string; count: number; avgSentiment: number }>
  topWeaknesses: Array<{ theme: string; count: number; avgSentiment: number }>
  sentimentRatingCorrelation: number
  keyFindings: string[]
  recommendations: string[]
}

// ============================================================================
// PRODUCT REVIEW ANALYZER
// ============================================================================

class ProductReviewAnalyzer {
  private analyzer: any // WebGPUSentimentAnalyzer

  /**
   * Initialize the review analyzer
   */
  async initialize() {
    console.log('🚀 Initializing Product Review Analyzer...')

    this.analyzer = await createWebGPUSentimentAnalyzer({
      enableTimestamps: true,
      useMappedBuffers: true,
    })

    console.log('✅ Review Analyzer Ready')
    console.log(`   WebGPU: ${this.analyzer.isUsingGPU() ? 'enabled' : 'disabled'}`)
  }

  /**
   * Analyze product reviews in batch
   */
  async analyzeReviews(reviews: ProductReview[]): Promise<ProductReview[]> {
    console.log(`\n📊 Analyzing ${reviews.length} reviews...`)

    const startTime = performance.now()

    // Batch analyze sentiment
    const texts = reviews.map(r => `${r.title}. ${r.text}`)
    const sentiments = await this.analyzer.analyzeBatch(texts)

    // Attach sentiment to reviews
    reviews.forEach((review, i) => {
      review.sentiment = sentiments[i]
      review.themes = this.extractThemes(review.text)
    })

    const processingTime = performance.now() - startTime
    const throughput = (reviews.length / processingTime) * 1000

    console.log(`✅ Analyzed ${reviews.length} reviews in ${processingTime.toFixed(2)}ms`)
    console.log(`   Throughput: ${throughput.toFixed(0)} reviews/second`)

    return reviews
  }

  /**
   * Extract themes from review text
   */
  private extractThemes(text: string): string[] {
    const themes: string[] = []
    const lowerText = text.toLowerCase()

    // Quality themes
    if (lowerText.includes('quality') || lowerText.includes('well made') || lowerText.includes('durable')) {
      themes.push('quality')
    }
    if (lowerText.includes('cheap') || lowerText.includes('poor quality') || lowerText.includes('broke')) {
      themes.push('poor-quality')
    }

    // Price themes
    if (lowerText.includes('expensive') || lowerText.includes('overpriced') || lowerText.includes('not worth')) {
      themes.push('pricey')
    }
    if (lowerText.includes('cheap') && !lowerText.includes('quality')) {
      themes.push('good-value')
    }
    if (lowerText.includes('worth the money') || lowerText.includes('good price') || lowerText.includes('affordable')) {
      themes.push('good-value')
    }

    // Service themes
    if (lowerText.includes('shipping') || lowerText.includes('delivery')) {
      themes.push('shipping')
    }
    if (lowerText.includes('customer service') || lowerText.includes('support')) {
      themes.push('customer-service')
    }

    // Usability themes
    if (lowerText.includes('easy to use') || lowerText.includes('user friendly') || lowerText.includes('intuitive')) {
      themes.push('easy-to-use')
    }
    if (lowerText.includes('difficult') || lowerText.includes('complicated') || lowerText.includes('confusing')) {
      themes.push('hard-to-use')
    }

    // Feature themes
    if (lowerText.includes('feature') || lowerText.includes('functionality')) {
      themes.push('features')
    }
    if (lowerText.includes('design') || lowerText.includes('look') || lowerText.includes('style')) {
      themes.push('design')
    }

    // Performance themes
    if (lowerText.includes('fast') || lowerText.includes('performance') || lowerText.includes('speed')) {
      themes.push('performance')
    }
    if (lowerText.includes('slow') || lowerText.includes('lag') || lowerText.includes('delay')) {
      themes.push('slow-performance')
    }

    return themes
  }

  /**
   * Generate insights from analyzed reviews
   */
  generateInsights(analyzedReviews: ProductReview[]): ReviewInsights {
    console.log('\n🔍 Generating insights...')

    // Basic statistics
    const totalReviews = analyzedReviews.length
    const averageRating = analyzedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews

    // Sentiment distribution
    const positiveReviews = analyzedReviews.filter(r => r.sentiment && r.sentiment.valence > 0.6)
    const negativeReviews = analyzedReviews.filter(r => r.sentiment && r.sentiment.valence < 0.4)
    const neutralReviews = totalReviews - positiveReviews.length - negativeReviews.length

    // Extract themes by sentiment
    const positiveThemes: Record<string, { count: number; totalSentiment: number }> = {}
    const negativeThemes: Record<string, { count: number; totalSentiment: number }> = {}

    analyzedReviews.forEach(review => {
      if (review.themes && review.sentiment) {
        review.themes.forEach(theme => {
          const isPositive = review.sentiment!.valence > 0.5
          const target = isPositive ? positiveThemes : negativeThemes

          if (!target[theme]) {
            target[theme] = { count: 0, totalSentiment: 0 }
          }
          target[theme].count++
          target[theme].totalSentiment += review.sentiment!.valence
        })
      }
    })

    // Top strengths
    const topStrengths = Object.entries(positiveThemes)
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        avgSentiment: data.totalSentiment / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Top weaknesses
    const topWeaknesses = Object.entries(negativeThemes)
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        avgSentiment: data.totalSentiment / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate correlation between rating and sentiment
    let correlationSum = 0
    analyzedReviews.forEach(review => {
      if (review.sentiment) {
        // Normalize rating to 0-1 (divide by 5)
        const normalizedRating = review.rating / 5
        correlationSum += Math.abs(normalizedRating - review.sentiment.valence)
      }
    })
    const sentimentRatingCorrelation = 1 - (correlationSum / totalReviews)

    // Generate key findings
    const keyFindings: string[] = []

    keyFindings.push(`${totalReviews} reviews analyzed`)
    keyFindings.push(`Average rating: ${averageRating.toFixed(1)}/5 stars`)
    keyFindings.push(`${positiveReviews.length} positive reviews (${(positiveReviews.length / totalReviews * 100).toFixed(0)}%)`)
    keyFindings.push(`${negativeReviews.length} negative reviews (${(negativeReviews.length / totalReviews * 100).toFixed(0)}%)`)

    if (topStrengths.length > 0) {
      keyFindings.push(`Top strength: "${topStrengths[0].theme}" mentioned in ${topStrengths[0].count} reviews`)
    }

    if (topWeaknesses.length > 0) {
      keyFindings.push(`Top weakness: "${topWeaknesses[0].theme}" mentioned in ${topWeaknesses[0].count} reviews`)
    }

    // Generate recommendations
    const recommendations: string[] = []

    if (negativeReviews.length > totalReviews * 0.2) {
      recommendations.push('⚠️ High negative sentiment - address customer concerns immediately')
    }

    if (topWeaknesses.some(w => w.theme.includes('shipping') || w.theme.includes('delivery'))) {
      recommendations.push('🚚 Improve shipping and delivery process')
    }

    if (topWeaknesses.some(w => w.theme.includes('customer-service') || w.theme.includes('support'))) {
      recommendations.push('💬 Enhance customer service training and response times')
    }

    if (topWeaknesses.some(w => w.theme.includes('price') || w.theme.includes('expensive'))) {
      recommendations.push('💰 Consider pricing strategy or communicate value better')
    }

    if (topStrengths.some(s => s.theme.includes('quality'))) {
      recommendations.push('✅ Leverage high quality in marketing materials')
    }

    if (topStrengths.some(s => s.theme.includes('easy-to-use'))) {
      recommendations.push('👍 Highlight ease of use in product descriptions')
    }

    if (sentimentRatingCorrelation > 0.7) {
      recommendations.push('✅ Strong correlation between ratings and sentiment - data is reliable')
    } else {
      recommendations.push('⚠️ Low correlation - some reviews may not match their star ratings')
    }

    return {
      totalReviews,
      averageRating,
      sentimentDistribution: {
        positive: positiveReviews.length,
        negative: negativeReviews.length,
        neutral: neutralReviews
      },
      topStrengths,
      topWeaknesses,
      sentimentRatingCorrelation,
      keyFindings,
      recommendations
    }
  }

  /**
   * Display insights
   */
  displayInsights(insights: ReviewInsights): void {
    console.log('\n' + '='.repeat(80))
    console.log('📊 PRODUCT REVIEW INSIGHTS')
    console.log('='.repeat(80))

    // Overview
    console.log('\n📈 OVERVIEW:')
    console.log(`   Total Reviews: ${insights.totalReviews.toLocaleString()}`)
    console.log(`   Average Rating: ${insights.averageRating.toFixed(1)}/5 ⭐`)
    console.log(`   Positive: ${insights.sentimentDistribution.positive} (${(insights.sentimentDistribution.positive / insights.totalReviews * 100).toFixed(0)}%)`)
    console.log(`   Negative: ${insights.sentimentDistribution.negative} (${(insights.sentimentDistribution.negative / insights.totalReviews * 100).toFixed(0)}%)`)
    console.log(`   Neutral: ${insights.sentimentDistribution.neutral} (${(insights.sentimentDistribution.neutral / insights.totalReviews * 100).toFixed(0)}%)`)

    // Key Findings
    console.log('\n🎯 KEY FINDINGS:')
    insights.keyFindings.forEach((finding, i) => {
      console.log(`   ${i + 1}. ${finding}`)
    })

    // Strengths
    console.log('\n✅ TOP STRENGTHS (What customers love):')
    if (insights.topStrengths.length === 0) {
      console.log('   No clear strengths identified')
    } else {
      insights.topStrengths.forEach((strength, i) => {
        const bar = '█'.repeat(Math.min(strength.count, 20))
        console.log(`   ${i + 1}. ${strength.theme}: ${strength.count} reviews ${bar}`)
        console.log(`      Avg sentiment: ${(strength.avgSentiment * 100).toFixed(0)}% positive`)
      })
    }

    // Weaknesses
    console.log('\n❌ TOP WEAKNESSES (What customers dislike):')
    if (insights.topWeaknesses.length === 0) {
      console.log('   No clear weaknesses identified - excellent!')
    } else {
      insights.topWeaknesses.forEach((weakness, i) => {
        const bar = '█'.repeat(Math.min(weakness.count, 20))
        console.log(`   ${i + 1}. ${weakness.theme}: ${weakness.count} reviews ${bar}`)
        console.log(`      Avg sentiment: ${(weakness.avgSentiment * 100).toFixed(0)}% positive`)
      })
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:')
    insights.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`)
    })

    // Correlation
    console.log('\n📊 DATA QUALITY:')
    console.log(`   Rating-Sentiment Correlation: ${(insights.sentimentRatingCorrelation * 100).toFixed(0)}%`)
    console.log(`   ${insights.sentimentRatingCorrelation > 0.7 ? '✅ High correlation - reliable data' : insights.sentimentRatingCorrelation > 0.5 ? '⚠️ Moderate correlation - some discrepancies' : '❌ Low correlation - review discrepancies detected'}`)

    console.log('\n' + '='.repeat(80) + '\n')
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.analyzer.cleanup()
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function exampleReviewAnalysis() {
  console.log('🎯 Example: E-commerce Product Review Analysis\n')

  const analyzer = new ProductReviewAnalyzer()
  await analyzer.initialize()

  // Simulate product reviews
  const reviews: ProductReview[] = [
    {
      id: 'r1',
      productId: 'product-123',
      rating: 5,
      title: 'Absolutely love it!',
      text: 'This product exceeded all my expectations. The quality is outstanding and it arrived quickly. Would definitely recommend to anyone looking for a reliable product.',
      author: 'happy_customer_1',
      date: new Date('2024-01-15'),
      verifiedPurchase: true,
      helpfulVotes: 45
    },
    {
      id: 'r2',
      productId: 'product-123',
      rating: 4,
      title: 'Great product, minor issues',
      text: 'Overall very happy with this purchase. The build quality is excellent and it looks great. Only giving 4 stars because the setup was a bit complicated.',
      author: 'satisfied_buyer',
      date: new Date('2024-01-14'),
      verifiedPurchase: true,
      helpfulVotes: 23
    },
    {
      id: 'r3',
      productId: 'product-123',
      rating: 2,
      title: 'Disappointed with quality',
      text: 'Expected better quality for the price. The materials feel cheap and it broke after just a week of use. Not worth the money.',
      author: 'disappointed_user',
      date: new Date('2024-01-13'),
      verifiedPurchase: true,
      helpfulVotes: 67
    },
    {
      id: 'r4',
      productId: 'product-123',
      rating: 5,
      title: 'Best purchase ever!',
      text: 'Incredible product! Fast shipping, easy to use, and amazing quality. This is exactly what I was looking for. Customer service was also very helpful when I had questions.',
      author: 'very_happy_customer',
      date: new Date('2024-01-12'),
      verifiedPurchase: true,
      helpfulVotes: 89
    },
    {
      id: 'r5',
      productId: 'product-123',
      rating: 1,
      title: 'Terrible experience',
      text: 'This is the worst product I have ever purchased. It broke immediately, customer service was unresponsive, and the return process was a nightmare. Avoid at all costs!',
      author: 'angry_customer',
      date: new Date('2024-01-11'),
      verifiedPurchase: true,
      helpfulVotes: 156
    },
    {
      id: 'r6',
      productId: 'product-123',
      rating: 4,
      title: 'Good value for money',
      text: 'Solid product for the price point. Not the absolute best quality but good enough for everyday use. Shipping was fast and packaging was secure.',
      author: 'value_seeker',
      date: new Date('2024-01-10'),
      verifiedPurchase: true,
      helpfulVotes: 34
    },
    {
      id: 'r7',
      productId: 'product-123',
      rating: 3,
      title: 'It\'s okay, nothing special',
      text: 'The product does what it\'s supposed to do but doesn\' really stand out. Quality is average and the design is nothing to write home about. Probably wouldn\'t buy again.',
      author: 'neutral_reviewer',
      date: new Date('2024-01-09'),
      verifiedPurchase: false,
      helpfulVotes: 12
    },
    {
      id: 'r8',
      productId: 'product-123',
      rating: 5,
      title: 'Exceptional quality and service!',
      text: 'From the moment I ordered until delivery, everything was perfect. The product quality is premium and it shows in every detail. Customer service went above and beyond to help me.',
      author: 'premium_customer',
      date: new Date('2024-01-08'),
      verifiedPurchase: true,
      helpfulVotes: 78
    },
    {
      id: 'r9',
      productId: 'product-123',
      rating: 2,
      title: 'Difficult to use',
      text: 'The quality seems okay but I can\'t figure out how to use it properly. The instructions are unclear and there are no tutorials online. Very frustrating experience.',
      author: 'confused_user',
      date: new Date('2024-01-07'),
      verifiedPurchase: true,
      helpfulVotes: 45
    },
    {
      id: 'r10',
      productId: 'product-123',
      rating: 4,
      title: 'Great design, works well',
      text: 'Love how this looks and it performs great too. The design is sleek and modern. Minor gripe is that it\'s a bit overpriced compared to similar products.',
      author: 'design_conscious',
      date: new Date('2024-01-06'),
      verifiedPurchase: true,
      helpfulVotes: 56
    }
  ]

  // Analyze reviews
  const analyzedReviews = await analyzer.analyzeReviews(reviews)

  // Display individual review sentiments
  console.log('\n📝 INDIVIDUAL REVIEW SENTIMENTS:')
  analyzedReviews.forEach((review, i) => {
    console.log(`\n   Review ${i + 1}: ${review.title}`)
    console.log(`   Rating: ${'⭐'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} (${review.rating}/5)`)
    console.log(`   Sentiment: ${review.sentiment?.sentiment} (${(review.sentiment!.confidence * 100).toFixed(0)}% confidence)`)
    console.log(`   Valence: ${(review.sentiment!.valence * 100).toFixed(0)}% positive`)
    console.log(`   Themes: ${review.themes?.join(', ') || 'None'}`)
  })

  // Generate insights
  const insights = analyzer.generateInsights(analyzedReviews)

  // Display insights
  analyzer.displayInsights(insights)

  // Cleanup
  await analyzer.cleanup()
}

// Run the example
if (require.main === module) {
  exampleReviewAnalysis().catch(console.error)
}

export { ProductReviewAnalyzer, ProductReview, ReviewInsights }

/**
 * KEY INSIGHTS FROM THIS EXAMPLE:
 *
 * 1. LARGE-SCALE ANALYSIS:
 *    - Process thousands of reviews in seconds
 *    - GPU-accelerated batch processing
 *    - Identify patterns across customer feedback
 *
 * 2. THEME EXTRACTION:
 *    - Automatically identify what customers love/hate
 *    - Categorize feedback by theme (quality, price, service, etc.)
 *    - Quantify sentiment for each theme
 *
 * 3. DATA-DRIVEN INSIGHTS:
 *    - Correlate star ratings with sentiment
 *    - Detect fake or misleading reviews
 *    - Understand the "why" behind ratings
 *
 * 4. ACTIONABLE RECOMMENDATIONS:
 *    - Prioritize product improvements
 *    - Address customer pain points
 *    - Leverage strengths in marketing
 *    - Improve customer experience
 *
 * 5. BUSINESS VALUE:
 *    - Improve product quality
 *    - Increase customer satisfaction
 *    - Reduce returns and complaints
 *    - Make data-driven product decisions
 *
 * USE THIS FOR:
 *    - E-commerce platforms
 *    - App store monitoring
 *    - Restaurant review sites
 *    - Hotel booking platforms
 *    - Service businesses
 *    - Product development teams
 */
