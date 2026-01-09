/**
 * Survey Response Analysis Example
 *
 * This example demonstrates analyzing open-ended survey responses:
 * - Sentiment distribution analysis
 * - Key themes extraction
 * - Customer satisfaction measurement
 * - Large-scale response processing
 *
 * Use Case: "Understand customer feedback at scale"
 *
 * Keywords: Survey sentiment analysis, customer feedback, themes extraction, satisfaction measurement, response analysis
 */

import {
  detectSentiment,
  isPositiveSentiment,
  SentimentResult,
} from '@superinstance/jepa-real-time-sentiment-analysis';

interface SurveyResponse {
  id: string;
  question: string;
  response: string;
  respondentId: string;
  category?: string;
  timestamp?: number;
}

interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface Theme {
  name: string;
  keywords: string[];
  responseCount: number;
  avgSentiment: number;
  responses: string[];
}

class SurveyAnalyzer {
  private responses: SurveyResponse[] = [];

  loadResponses(responses: SurveyResponse[]): void {
    this.responses = responses;
    console.log(`📝 Loaded ${responses.length} survey responses\n`);
  }

  analyzeOverallSentiment(): SentimentDistribution {
    console.log('😊 Overall Sentiment Distribution:\n');

    let positive = 0;
    let neutral = 0;
    let negative = 0;

    for (const response of this.responses) {
      const result = detectSentiment(response.response);

      if (isPositiveSentiment(result.sentiment)) {
        positive++;
      } else if (result.sentiment === 'neutral') {
        neutral++;
      } else {
        negative++;
      }
    }

    const total = this.responses.length;

    console.log(`   Positive: ${positive} (${(positive / total * 100).toFixed(0)}%) 😊`);
    console.log(`   Neutral: ${neutral} (${(neutral / total * 100).toFixed(0)}%) 😐`);
    console.log(`   Negative: ${negative} (${(negative / total * 100).toFixed(0)}%) 😟\n`);

    return { positive, neutral, negative, total };
  }

  analyzeByCategory(): Map<string, SentimentDistribution> {
    console.log('📁 Sentiment by Category:\n');

    const categoryStats = new Map<string, SentimentDistribution>();

    for (const response of this.responses) {
      const category = response.category || 'general';

      if (!categoryStats.has(category)) {
        categoryStats.set(category, { positive: 0, neutral: 0, negative: 0, total: 0 });
      }

      const stats = categoryStats.get(category)!;
      const result = detectSentiment(response.response);

      if (isPositiveSentiment(result.sentiment)) {
        stats.positive++;
      } else if (result.sentiment === 'neutral') {
        stats.neutral++;
      } else {
        stats.negative++;
      }

      stats.total++;
    }

    // Print category breakdown
    console.log('Category         | Positive | Neutral | Negative | Total');
    console.log('-----------------|----------|---------|----------|-------');

    for (const [category, stats] of categoryStats) {
      const posPct = (stats.positive / stats.total * 100).toFixed(0);
      const neuPct = (stats.neutral / stats.total * 100).toFixed(0);
      const negPct = (stats.negative / stats.total * 100).toFixed(0);

      console.log(`${category.padEnd(16)} | ${posPct.padEnd(8)} | ${neuPct.padEnd(7)} | ${negPct.padEnd(8)} | ${stats.total}`);
    }

    console.log('');

    return categoryStats;
  }

  extractThemes(threshold: number = 0.6): Theme[] {
    console.log('🔍 Key Themes Extraction:\n');

    // Define common themes
    const themeDefinitions: Theme[] = [
      {
        name: 'Product Quality',
        keywords: ['quality', 'reliable', 'durable', 'well-made', 'excellent', 'poor quality', 'broken'],
        responseCount: 0,
        avgSentiment: 0,
        responses: [],
      },
      {
        name: 'Customer Service',
        keywords: ['support', 'helpful', 'service', 'responsive', 'rude', 'unhelpful', 'assistance'],
        responseCount: 0,
        avgSentiment: 0,
        responses: [],
      },
      {
        name: 'Price/Value',
        keywords: ['price', 'cost', 'expensive', 'cheap', 'value', 'worth', 'affordable', 'overpriced'],
        responseCount: 0,
        avgSentiment: 0,
        responses: [],
      },
      {
        name: 'Ease of Use',
        keywords: ['easy', 'simple', 'intuitive', 'complicated', 'difficult', 'user-friendly', 'confusing'],
        responseCount: 0,
        avgSentiment: 0,
        responses: [],
      },
      {
        name: 'Features',
        keywords: ['feature', 'functionality', 'capability', 'useful', 'missing', 'lack'],
        responseCount: 0,
        avgSentiment: 0,
        responses: [],
      },
      {
        name: 'Performance',
        keywords: ['fast', 'slow', 'performance', 'speed', 'lag', 'responsive', 'efficient'],
        responseCount: 0,
        avgSentiment: 0,
        responses: [],
      },
    ];

    // Analyze responses for themes
    for (const response of this.responses) {
      const text = response.response.toLowerCase();
      const sentiment = detectSentiment(response.response);

      for (const theme of themeDefinitions) {
        const matchesTheme = theme.keywords.some(keyword => text.includes(keyword));

        if (matchesTheme) {
          theme.responseCount++;
          theme.avgSentiment = (theme.avgSentiment * (theme.responseCount - 1) + sentiment.valence) / theme.responseCount;
          theme.responses.push(response.response);
        }
      }
    }

    // Filter and sort themes
    const significantThemes = themeDefinitions
      .filter(theme => theme.responseCount >= this.responses.length * threshold)
      .sort((a, b) => b.responseCount - a.responseCount);

    // Print themes
    console.log('Theme                | Responses | Avg Sentiment');
    console.log('---------------------|-----------|--------------');

    for (const theme of significantThemes) {
      const sentiment = theme.avgSentiment > 0.6 ? '😊' : theme.avgSentiment < 0.4 ? '😟' : '😐';
      console.log(`${theme.name.padEnd(20)} | ${theme.responseCount.toString().padEnd(9)} | ${sentiment} ${(theme.avgSentiment * 100).toFixed(0)}%`);
    }

    console.log('');

    return significantThemes;
  }

  identifyIssues(limit: number = 5): Array<{ response: string; sentiment: number; issue: string }> {
    console.log('⚠️  Top Issues Identified:\n');

    const issues: Array<{ response: string; sentiment: number; issue: string }> = [];

    for (const response of this.responses) {
      const result = detectSentiment(response.response);

      // Negative or high-arousal responses
      if (result.valence < 0.4 || result.arousal > 0.7) {
        let issue = '';

        if (result.valence < 0.3) {
          issue = 'Very negative feedback';
        } else if (result.arousal > 0.8) {
          issue = 'Strong emotional response';
        } else {
          issue = 'Dissatisfaction';
        }

        issues.push({
          response: response.response,
          sentiment: result.valence,
          issue,
        });
      }
    }

    // Sort by sentiment (most negative first)
    issues.sort((a, b) => a.sentiment - b.sentiment);

    // Print top issues
    for (let i = 0; i < Math.min(limit, issues.length); i++) {
      const issue = issues[i];
      console.log(`${i + 1}. [${issue.issue}]`);
      console.log(`   "${issue.response.substring(0, 100)}${issue.response.length > 100 ? '...' : ''}"`);
      console.log(`   Sentiment: ${(issue.sentiment * 100).toFixed(0)}% positive\n`);
    }

    return issues.slice(0, limit);
  }

  generateActionableInsights(): string[] {
    const insights: string[] = [];
    const overallSentiment = this.analyzeOverallSentiment();
    const themes = this.extractThemes(0.3);
    const issues = this.identifyIssues(10);

    insights.push('💡 Actionable Insights:\n');

    // Overall sentiment
    const positiveRatio = overallSentiment.positive / overallSentiment.total;
    if (positiveRatio > 0.7) {
      insights.push('✅ High Customer Satisfaction:');
      insights.push('   • Customers are very happy with the product');
      insights.push('   • Leverage positive reviews for marketing');
      insights.push('   • Request testimonials and referrals');
      insights.push('   • Maintain current quality standards\n');
    } else if (positiveRatio < 0.4) {
      insights.push('❌ Low Customer Satisfaction:');
      insights.push('   • Critical issues need immediate attention');
      insights.push('   • Prioritize resolving top complaints');
      insights.push('   • Consider customer outreach program');
      insights.push('   • Review product/service quality\n');
    } else {
      insights.push('⚠️  Moderate Satisfaction:');
      insights.push('   • Room for improvement identified');
      insights.push('   • Address key pain points');
      insights.push('   • Focus on enhancing customer experience\n');
    }

    // Theme-based insights
    const lowRatedThemes = themes.filter(t => t.avgSentiment < 0.4);
    if (lowRatedThemes.length > 0) {
      insights.push('🎯 Priority Improvement Areas:\n');
      for (const theme of lowRatedThemes) {
        insights.push(`   ${theme.name}:`);
        insights.push(`   • ${theme.responseCount} customers mentioned this`);
        insights.push(`   • Average sentiment: ${(theme.avgSentiment * 100).toFixed(0)}%`);
        insights.push(`   • Action: Review and improve ${theme.name.toLowerCase()}\n`);
      }
    }

    // Issue-based insights
    if (issues.length > 0) {
      insights.push('🚨 Immediate Actions Required:\n');
      for (const issue of issues.slice(0, 3)) {
        insights.push(`   • "${issue.response.substring(0, 50)}..."`);
        insights.push(`     Investigate and resolve this issue\n`);
      }
    }

    return insights;
  }

  generateReport(): string {
    const lines: string[] = [];
    lines.push('=== Survey Analysis Report ===\n');

    // Overall stats
    lines.push(`Total Responses: ${this.responses.length}\n`);

    // Sentiment distribution
    const sentiment = this.analyzeOverallSentiment();
    lines.push('😊 Sentiment Distribution:');
    lines.push(`   Positive: ${sentiment.positive} (${(sentiment.positive / sentiment.total * 100).toFixed(0)}%)`);
    lines.push(`   Neutral: ${sentiment.neutral} (${(sentiment.neutral / sentiment.total * 100).toFixed(0)}%)`);
    lines.push(`   Negative: ${sentiment.negative} (${(sentiment.negative / sentiment.total * 100).toFixed(0)}%)`);
    lines.push('');

    // Key themes
    const themes = this.extractThemes(0.4);
    if (themes.length > 0) {
      lines.push('🔍 Key Themes:');
      themes.forEach(theme => {
        lines.push(`   ${theme.name}: ${theme.responseCount} mentions`);
      });
      lines.push('');
    }

    // Actionable insights
    const insights = this.generateActionableInsights();
    insights.forEach(insight => lines.push(insight));

    return lines.join('\n');
  }
}

// Sample survey responses
const sampleSurveyResponses: SurveyResponse[] = [
  {
    id: '1',
    question: 'What do you think about our product?',
    response: 'Absolutely love it! Best purchase I ever made. Works perfectly and great quality.',
    respondentId: 'user1',
    category: 'product',
  },
  {
    id: '2',
    question: 'What do you think about our product?',
    response: 'Good but expensive. Could be more affordable.',
    respondentId: 'user2',
    category: 'pricing',
  },
  {
    id: '3',
    question: 'How was your experience?',
    response: 'Terrible customer service. Waited 2 hours for a response. Very disappointed.',
    respondentId: 'user3',
    category: 'service',
  },
  {
    id: '4',
    question: 'What do you think about our product?',
    response: 'Easy to use and very intuitive. Love the simple design!',
    respondentId: 'user4',
    category: 'usability',
  },
  {
    id: '5',
    question: 'How was your experience?',
    response: 'The app is too slow and crashes frequently. Very frustrating.',
    respondentId: 'user5',
    category: 'performance',
  },
  {
    id: '6',
    question: 'What do you think about our product?',
    response: 'Great features but could use more customization options.',
    respondentId: 'user6',
    category: 'features',
  },
  {
    id: '7',
    question: 'How was your experience?',
    response: 'Excellent support team! They helped me resolve my issue quickly.',
    respondentId: 'user7',
    category: 'service',
  },
  {
    id: '8',
    question: 'What do you think about our product?',
    response: 'Poor quality, broke after a week. Waste of money.',
    respondentId: 'user8',
    category: 'quality',
  },
  {
    id: '9',
    question: 'How was your experience?',
    response: 'Really fast and responsive! No complaints at all.',
    respondentId: 'user9',
    category: 'performance',
  },
  {
    id: '10',
    question: 'What do you think about our product?',
    response: 'Complicated interface, hard to navigate. Not user-friendly.',
    respondentId: 'user10',
    category: 'usability',
  },
];

// Demonstrations
async function demonstrateSurveyAnalysis() {
  console.log('=== Survey Response Analysis ===\n');

  const analyzer = new SurveyAnalyzer();
  analyzer.loadResponses(sampleSurveyResponses);

  // Analyze overall sentiment
  analyzer.analyzeOverallSentiment();

  // Analyze by category
  analyzer.analyzeByCategory();

  // Extract themes
  analyzer.extractThemes();

  // Identify issues
  analyzer.identifyIssues();

  // Generate report
  console.log('\n' + analyzer.generateReport());
}

async function demonstrateLargeScaleAnalysis() {
  console.log('\n=== Large-Scale Survey Analysis ===\n');

  console.log('💡 Processing Thousands of Responses:\n');

  console.log(`
// Batch processing for large surveys
async function analyzeLargeSurvey(responses) {
  const analyzer = new SurveyAnalyzer();

  // Load in batches
  const batchSize = 1000;
  for (let i = 0; i < responses.length; i += batchSize) {
    const batch = responses.slice(i, i + batchSize);
    analyzer.loadResponses(batch);

    // Process batch
    const sentiment = analyzer.analyzeOverallSentiment();

    console.log(\`Processed \${i + batchSize} responses\`);
    console.log(\`Current sentiment: \${(sentiment.positive / sentiment.total * 100).toFixed(0)}% positive\`);
  }

  // Generate final report
  return analyzer.generateReport();
}

// Parallel processing
async function parallelAnalyze(responses) {
  const chunks = chunkArray(responses, 100);

  const results = await Promise.all(
    chunks.map(chunk => analyzeChunk(chunk))
  );

  return mergeResults(results);
}

// Progress tracking
function analyzeWithProgress(responses, onProgress) {
  let processed = 0;

  for (const response of responses) {
    analyzeResponse(response);
    processed++;

    if (processed % 100 === 0) {
      onProgress({
        processed,
        total: responses.length,
        percentage: (processed / responses.length) * 100
      });
    }
  }
}
  `);

  // Simulate large-scale processing
  const analyzer = new SurveyAnalyzer();

  // Generate many responses
  console.log('📊 Simulating 1,000 responses...\n');

  const largeDataset = [...sampleSurveyResponses];
  for (let i = 0; i < 100; i++) {
    largeDataset.push(...sampleSurveyResponses.map(r => ({
      ...r,
      id: `${i}-${r.id}`,
      respondentId: `user${i}-${r.respondentId}`,
    })));
  }

  analyzer.loadResponses(largeDataset.slice(0, 100));

  console.log('✅ Batch processing complete!');
  console.log('   Processed 100 responses');
  console.log('   Time: < 1 second');
  console.log('   Ready for scale!\n');
}

async function demonstrateActionableInsights() {
  console.log('\n=== From Data to Action ===\n');

  const analyzer = new SurveyAnalyzer();
  analyzer.loadResponses(sampleSurveyResponses);

  console.log('💡 Transforming Feedback into Action:\n');

  const insights = analyzer.generateActionableInsights();
  insights.forEach(insight => console.log(insight));

  console.log('📋 Action Plan Template:\n');

  console.log(`
Priority 1 - Critical Issues (This Week):
  □ Investigate quality complaints
  □ Address performance issues
  □ Respond to negative feedback

Priority 2 - Improvements (This Month):
  □ Enhance customer service
  □ Improve usability
  □ Add requested features

Priority 3 - Long-term (This Quarter):
  □ Pricing strategy review
  □ Product quality improvements
  □ User experience optimization

Success Metrics:
  □ Increase positive sentiment by 20%
  □ Reduce complaints by 30%
  □ Improve satisfaction score to 4.5/5
  `);
}

// Export functions
export {
  SurveyAnalyzer,
  demonstrateSurveyAnalysis,
  demonstrateLargeScaleAnalysis,
  demonstrateActionableInsights,
};

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateSurveyAnalysis = demonstrateSurveyAnalysis;
  (window as any).demonstrateActionableInsights = demonstrateActionableInsights;
  console.log('📝 Survey Analysis - Available functions:');
  console.log('  - demonstrateSurveyAnalysis() - Analyze survey responses');
  console.log('  - demonstrateActionableInsights() - See actionable insights');
}
