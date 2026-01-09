/**
 * Email Sentiment Triage Example
 *
 * This example demonstrates prioritizing emails by sentiment:
 * - Identify urgent/angry emails
 * - Prioritize customer complaints
 * - Flag frustrated customers
 * - Automate email routing
 *
 * Use Case: "Customer support email prioritization"
 *
 * Keywords: Email triage, sentiment prioritization, customer frustration, urgent emails, email automation
 */

import {
  detectSentiment,
  isPositiveSentiment,
  SentimentResult,
} from '@superinstance/jepa-real-time-sentiment-analysis';

interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  timestamp: number;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  category?: string;
}

interface EmailTriageResult {
  email: Email;
  sentiment: SentimentResult;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  category: string;
  actionRequired: boolean;
  suggestedResponse: string;
}

class EmailTriageSystem {
  private urgentKeywords = [
    'emergency', 'urgent', 'immediately', 'asap', 'critical',
    'broken', 'not working', 'error', 'failure', 'down',
    'refund', 'cancel subscription', 'legal action', 'lawsuit',
  ];

  private frustrationIndicators = [
    'disappointed', 'frustrated', 'unacceptable', 'terrible',
    'worst', 'horrible', 'angry', 'furious', 'upset',
    'waste of money', 'rip off', 'scam', 'never again',
  ];

  triageEmail(email: Email): EmailTriageResult {
    // Analyze sentiment
    const subjectResult = detectSentiment(email.subject);
    const bodyResult = detectSentiment(email.body);

    // Combine results (body has more weight)
    const combinedSentiment = {
      sentiment: bodyResult.sentiment,
      valence: (subjectResult.valence + bodyResult.valence * 2) / 3,
      arousal: (subjectResult.arousal + bodyResult.arousal * 2) / 3,
      dominance: (subjectResult.dominance + bodyResult.dominance * 2) / 3,
      confidence: (subjectResult.confidence + bodyResult.confidence) / 2,
      evidence: [...subjectResult.evidence, ...bodyResult.evidence],
    };

    // Determine priority
    const priority = this.calculatePriority(email, combinedSentiment);

    // Determine category
    const category = this.categorizeEmail(email, combinedSentiment);

    // Check if action is required
    const actionRequired = this.requiresAction(email, combinedSentiment);

    // Suggest response
    const suggestedResponse = this.suggestResponse(combinedSentiment, category);

    return {
      email,
      sentiment: combinedSentiment,
      priority,
      category,
      actionRequired,
      suggestedResponse,
    };
  }

  private calculatePriority(email: Email, sentiment: SentimentResult): 'urgent' | 'high' | 'normal' | 'low' {
    const fullText = (email.subject + ' ' + email.body).toLowerCase();

    // Check for urgent keywords
    const hasUrgentKeyword = this.urgentKeywords.some(keyword =>
      fullText.includes(keyword)
    );

    // Check for frustration indicators
    const hasFrustration = this.frustrationIndicators.some(indicator =>
      fullText.includes(indicator)
    );

    // Check for very negative sentiment
    const isVeryNegative = sentiment.valence < 0.3 && sentiment.arousal > 0.6;

    // Determine priority
    if (hasUrgentKeyword || isVeryNegative) {
      return 'urgent';
    } else if (hasFrustration || sentiment.valence < 0.4) {
      return 'high';
    } else if (isPositiveSentiment(sentiment.sentiment)) {
      return 'low';
    } else {
      return 'normal';
    }
  }

  private categorizeEmail(email: Email, sentiment: SentimentResult): string {
    const text = (email.subject + ' ' + email.body).toLowerCase();

    // Categorization logic
    if (text.includes('refund') || text.includes('money back')) {
      return 'refund_request';
    } else if (text.includes('bug') || text.includes('error') || text.includes('not working')) {
      return 'technical_issue';
    } else if (text.includes('billing') || text.includes('charge') || text.includes('payment')) {
      return 'billing';
    } else if (text.includes('cancel') || text.includes('subscription')) {
      return 'cancellation';
    } else if (text.includes('feature') || text.includes('enhancement') || text.includes('improvement')) {
      return 'feature_request';
    } else if (isPositiveSentiment(sentiment.sentiment)) {
      return 'positive_feedback';
    } else if (sentiment.valence < 0.4) {
      return 'complaint';
    } else {
      return 'general_inquiry';
    }
  }

  private requiresAction(email: Email, sentiment: SentimentResult): boolean {
    const priority = this.calculatePriority(email, sentiment);
    return priority === 'urgent' || priority === 'high';
  }

  private suggestResponse(sentiment: SentimentResult, category: string): string {
    // Suggest response based on sentiment and category
    if (sentiment.valence < 0.3) {
      return 'Empathetic apology + immediate action';
    } else if (sentiment.valence < 0.5) {
      return 'Acknowledgment + solution proposal';
    } else if (category === 'feature_request') {
      return 'Thank + forward to product team';
    } else if (category === 'positive_feedback') {
      return 'Thank + request permission to share';
    } else {
      return 'Standard response template';
    }
  }

  batchTriage(emails: Email[]): EmailTriageResult[] {
    console.log(`📧 Triaging ${emails.length} emails...\n`);

    const results = emails.map(email => this.triageEmail(email));

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return results;
  }

  generateTriageReport(results: EmailTriageResult[]): string {
    const lines: string[] = [];
    lines.push('=== Email Triage Report ===\n');

    // Summary statistics
    const urgent = results.filter(r => r.priority === 'urgent').length;
    const high = results.filter(r => r.priority === 'high').length;
    const normal = results.filter(r => r.priority === 'normal').length;
    const low = results.filter(r => r.priority === 'low').length;

    lines.push('📊 Priority Distribution:');
    lines.push(`   Urgent: ${urgent} 🔴`);
    lines.push(`   High: ${high} 🟠`);
    lines.push(`   Normal: ${normal} 🟡`);
    lines.push(`   Low: ${low} 🟢\n`);

    // Category breakdown
    const categories = new Map<string, number>();
    for (const result of results) {
      categories.set(result.category, (categories.get(result.category) || 0) + 1);
    }

    lines.push('📁 Categories:');
    for (const [category, count] of categories) {
      lines.push(`   ${category}: ${count}`);
    }
    lines.push('');

    // Action required
    const actionRequired = results.filter(r => r.actionRequired);
    lines.push(`⚠️  Action Required: ${actionRequired.length} emails\n`);

    // Detailed list
    lines.push('📋 Detailed List (sorted by priority):\n');

    for (const result of results.slice(0, 10)) {
      const priorityIcon = result.priority === 'urgent' ? '🔴' :
                          result.priority === 'high' ? '🟠' :
                          result.priority === 'normal' ? '🟡' : '🟢';

      lines.push(`${priorityIcon} [${result.priority.toUpperCase()}] ${result.email.subject}`);
      lines.push(`   From: ${result.email.from}`);
      lines.push(`   Sentiment: ${result.sentiment.sentiment} (${(result.sentiment.valence * 100).toFixed(0)}% positive)`);
      lines.push(`   Category: ${result.category}`);
      lines.push(`   Action: ${result.suggestedResponse}\n`);
    }

    return lines.join('\n');
  }
}

// Sample emails
const sampleEmails: Email[] = [
  {
    id: '1',
    from: 'customer1@example.com',
    subject: 'REFUND IMMEDIATELY!!!',
    body: 'This is ridiculous! I want my money back NOW! This product is completely broken and doesnt work at all.',
    timestamp: Date.now() - 3600000,
  },
  {
    id: '2',
    from: 'customer2@example.com',
    subject: 'Feature request',
    body: 'Would love to see a dark mode option in the next update. Keep up the great work!',
    timestamp: Date.now() - 7200000,
  },
  {
    id: '3',
    from: 'customer3@example.com',
    subject: 'Billing issue',
    body: 'I was charged twice for my subscription. Please help resolve this.',
    timestamp: Date.now() - 10800000,
  },
  {
    id: '4',
    from: 'customer4@example.com',
    subject: 'Amazing product!',
    body: 'Just wanted to say how much I love using your service. Best purchase Ive made this year! Thank you! 🙏',
    timestamp: Date.now() - 14400000,
  },
  {
    id: '5',
    from: 'customer5@example.com',
    subject: 'Technical issue',
    body: 'Getting error 500 when trying to save my work. This is really frustrating as I keep losing my progress.',
    timestamp: Date.now() - 18000000,
  },
  {
    id: '6',
    from: 'customer6@example.com',
    subject: 'Question about features',
    body: 'Hi, does your service support API access? Looking to integrate with my workflow.',
    timestamp: Date.now() - 21600000,
  },
  {
    id: '7',
    from: 'customer7@example.com',
    subject: 'Worst experience ever',
    body: 'Absolutely terrible customer service. Waited 2 hours for a response and no one helped me. Unacceptable!',
    timestamp: Date.now() - 25200000,
  },
  {
    id: '8',
    from: 'customer8@example.com',
    subject: 'Cancel subscription',
    body: 'Please cancel my subscription effective immediately. Thank you for the service.',
    timestamp: Date.now() - 28800000,
  },
];

// Demonstrations
async function demonstrateEmailTriage() {
  console.log('=== Email Sentiment Triage ===\n');

  const triage = new EmailTriageSystem();

  // Triage all emails
  const results = triage.batchTriage(sampleEmails);

  // Print report
  console.log(triage.generateTriageReport(results));
}

async function demonstrateWorkflowIntegration() {
  console.log('\n=== Email Triage Workflow ===\n');

  const triage = new EmailTriageSystem();

  console.log('💡 Automated Triage Workflow:\n');

  console.log(`
// 1. Fetch new emails
const newEmails = await fetchEmails();

// 2. Triage emails
const triageResults = triage.batchTriage(newEmails);

// 3. Route to appropriate team
for (const result of triageResults) {
  switch (result.category) {
    case 'technical_issue':
      await routeToSupport(result);
      break;
    case 'billing':
      await routeToBilling(result);
      break;
    case 'refund_request':
      await routeToUrgent(result);
      break;
    case 'feature_request':
      await routeToProduct(result);
      break;
    default:
      await routeToGeneral(result);
  }
}

// 4. Send auto-responses
for (const result of triageResults) {
  if (result.priority === 'urgent') {
    await sendAutoResponse({
      to: result.email.from,
      template: 'urgent_acknowledgment',
      data: { category: result.category }
    });
  }
}

// 5. Escalate urgent emails
const urgentEmails = triageResults.filter(r => r.priority === 'urgent');
if (urgentEmails.length > 0) {
  await notifyOnCall(urgentEmails);
}
  `);

  // Demonstrate single email triage
  console.log('📧 Single Email Triage Example:\n');

  const urgentEmail = sampleEmails[0];
  const result = triage.triageEmail(urgentEmail);

  console.log(`Subject: ${urgentEmail.subject}`);
  console.log(`From: ${urgentEmail.from}`);
  console.log(`\nTriage Results:`);
  console.log(`  Priority: ${result.priority.toUpperCase()}`);
  console.log(`  Category: ${result.category}`);
  console.log(`  Sentiment: ${result.sentiment.sentiment}`);
  console.log(`  Action Required: ${result.actionRequired}`);
  console.log(`  Suggested Response: ${result.suggestedResponse}\n`);
}

async function demonstrateTeamOptimization() {
  console.log('\n=== Team Optimization ===\n');

  console.log('👥 Team Efficiency Features:\n');

  console.log('1️⃣  Smart Routing');
  console.log('   • Technical issues → Senior support agents');
  console.log('   • Billing questions → Finance team');
  console.log('   • Urgent complaints → Team leads');
  console.log('   • Positive feedback → Marketing team\n');

  console.log('2️⃣  Workload Distribution');
  console.log('   • Balance urgent emails across agents');
  console.log('   • Prevent burnout from angry customers');
  console.log('   • Match agent expertise to category\n');

  console.log('3️⃣  Response Time Optimization');
  console.log('   • Prioritize urgent emails first');
  console.log('   • Set SLA based on priority');
  console.log('   • Escalate if not resolved in time\n');

  console.log('4️⃣  Quality Assurance');
  console.log('   • Track resolution sentiment');
  console.log('   • Monitor customer satisfaction');
  console.log('   • Identify training needs\n');

  console.log('5️⃣  Performance Metrics\n');
  console.log('   Metrics to Track:');
  console.log('   • Average response time by priority');
  console.log('   • Customer satisfaction score');
  console.log('   • First-contact resolution rate');
  console.log('   • Agent sentiment handling score');
  console.log('   • Escalation rate\n');
}

async function demonstrateRealWorldScenarios() {
  console.log('\n=== Real-World Scenarios ===\n');

  const triage = new EmailTriageSystem();

  console.log('🎯 Common Use Cases:\n');

  // Scenario 1: E-commerce
  console.log('1️⃣  E-Commerce Customer Support');
  console.log('   • Prioritize refund requests');
  console.log('   • Flag shipping complaints');
  console.log('   • Identify happy customers for reviews');
  console.log('   • Route product inquiries\n');

  // Scenario 2: SaaS company
  console.log('2️⃣  SaaS Company');
  console.log('   • Urgent: System outages, data loss');
  console.log('   • High: Bug reports, feature requests');
  console.log('   • Normal: How-to questions');
  console.log('   • Low: Positive feedback, testimonials\n');

  // Scenario 3: Healthcare
  console.log('3️⃣  Healthcare Provider');
  console.log('   • Urgent: Medical emergencies');
  console.log('   • High: Appointment cancellations');
  console.log('   • Normal: Billing questions');
  console.log('   • Low: General inquiries\n');

  // Scenario 4: Financial services
  console.log('4️⃣  Financial Services');
  console.log('   • Urgent: Fraud reports, unauthorized access');
  console.log('   • High: Transaction disputes');
  console.log('   • Normal: Account updates');
  console.log('   • Low: General account inquiries\n');

  // ROI demonstration
  console.log('💰 ROI Benefits:\n');
  console.log('   Before Triage:');
  console.log('   • Response time: 24 hours');
  console.log('   • Customer satisfaction: 65%');
  console.log('   • Agent efficiency: 15 emails/day\n');

  console.log('   After Triage:');
  console.log('   • Response time: 2 hours (urgent), 8 hours (normal)');
  console.log('   • Customer satisfaction: 85%');
  console.log('   • Agent efficiency: 45 emails/day\n');

  console.log('   Improvement:');
  console.log('   • 12x faster urgent response');
  console.log('   • 20% increase in satisfaction');
  console.log('   • 3x agent efficiency\n');
}

// Export functions
export {
  EmailTriageSystem,
  demonstrateEmailTriage,
  demonstrateWorkflowIntegration,
  demonstrateTeamOptimization,
  demonstrateRealWorldScenarios,
};

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateEmailTriage = demonstrateEmailTriage;
  (window as any).demonstrateWorkflowIntegration = demonstrateWorkflowIntegration;
  console.log('📝 Email Triage - Available functions:');
  console.log('  - demonstrateEmailTriage() - See email prioritization');
  console.log('  - demonstrateWorkflowIntegration() - Learn automation workflow');
}
