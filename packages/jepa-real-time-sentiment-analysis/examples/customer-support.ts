/**
 * Customer Support Sentiment Analysis Example
 *
 * This example demonstrates how to use sentiment analysis for customer
 * support applications, including issue escalation, satisfaction tracking,
 * and agent performance metrics.
 */

import {
  detectSentiment,
  detectSentimentsBatch,
  isPositiveSentiment,
} from '@superinstance/jepa-real-time-sentiment-analysis'

// ============================================================================
// EXAMPLE 1: CUSTOMER SUPPORT TICKET ANALYSIS
// ============================================================================

console.log('=== Example 1: Customer Support Ticket Analysis ===\n')

interface SupportTicket {
  id: string
  customer: string
  messages: Array<{ text: string; timestamp: number; from: 'customer' | 'agent' }>
  status: 'open' | 'pending' | 'resolved'
}

const supportTicket: SupportTicket = {
  id: 'TICKET-12345',
  customer: 'john@example.com',
  status: 'open',
  messages: [
    { text: "I can't access my account", timestamp: Date.now() - 3600000, from: 'customer' },
    { text: "I'm sorry to hear that. Let me help you", timestamp: Date.now() - 3500000, from: 'agent' },
    { text: "It's really frustrating, I need to get in now!", timestamp: Date.now() - 3400000, from: 'customer' },
    { text: "I understand. Can you try resetting your password?", timestamp: Date.now() - 3300000, from: 'agent' },
    { text: "That didn't work!!! This is unacceptable", timestamp: Date.now() - 3200000, from: 'customer' },
    { text: "I apologize for the inconvenience. Let me escalate this", timestamp: Date.now() - 3100000, from: 'agent' },
  ],
}

function analyzeTicketSentiment(ticket: SupportTicket) {
  const customerMessages = ticket.messages.filter(m => m.from === 'customer')

  console.log(`Analyzing ticket ${ticket.id} for customer ${ticket.customer}`)
  console.log(`Status: ${ticket.status}`)
  console.log(`Messages: ${ticket.messages.length}\n`)

  // Analyze customer sentiment over time
  const sentimentHistory = customerMessages.map(msg => ({
    message: msg.text,
    result: detectSentiment(msg.text),
  }))

  console.log('Customer Sentiment Timeline:')
  sentimentHistory.forEach(({ message, result }, i) => {
    console.log(`  ${i + 1}. "${message}"`)
    console.log(`     Sentiment: ${result.sentiment} (${isPositiveSentiment(result.sentiment) ? 'positive' : 'negative'})`)
    console.log(`     Valence: ${result.valence.toFixed(2)} | Arousal: ${result.arousal.toFixed(2)}`)
    console.log(`     Confidence: ${(result.confidence * 100).toFixed(0)}%`)
    console.log('')
  })

  // Determine if escalation is needed
  const latestSentiment = sentimentHistory[sentimentHistory.length - 1]?.result
  const needsEscalation =
    latestSentiment &&
    (latestSentiment.sentiment === 'angry' || latestSentiment.sentiment === 'tense') &&
    latestSentiment.confidence > 0.7

  console.log(`Needs Escalation: ${needsEscalation ? '⚠️  YES' : '✅ NO'}`)

  if (needsEscalation) {
    console.log(`Reason: Customer is showing ${latestSentiment.sentiment} sentiment with ${(latestSentiment.confidence * 100).toFixed(0)}% confidence`)
  }

  return { sentimentHistory, needsEscalation }
}

analyzeTicketSentiment(supportTicket)

// ============================================================================
// EXAMPLE 2: CUSTOMER SATISFACTION SCORING
// ============================================================================

console.log('\n\n=== Example 2: Customer Satisfaction Scoring ===\n')

interface CustomerSatisfaction {
  customerId: string
  tickets: SupportTicket[]
  satisfactionScore: number
  sentimentTrend: 'improving' | 'declining' | 'stable'
}

function calculateSatisfactionScore(tickets: SupportTicket[]): CustomerSatisfaction {
  const allMessages = tickets.flatMap(ticket =>
    ticket.messages.filter(m => m.from === 'customer').map(m => m.text)
  )

  const sentimentResults = allMessages.map(text => detectSentiment(text))

  // Calculate average valence (satisfaction score)
  const avgValence = sentimentResults.reduce((sum, r) => sum + r.valence, 0) / sentimentResults.length

  // Determine sentiment trend
  const firstHalf = sentimentResults.slice(0, Math.floor(sentimentResults.length / 2))
  const secondHalf = sentimentResults.slice(Math.floor(sentimentResults.length / 2))

  const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.valence, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.valence, 0) / secondHalf.length

  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (secondHalfAvg - firstHalfAvg > 0.1) trend = 'improving'
  else if (firstHalfAvg - secondHalfAvg > 0.1) trend = 'declining'

  return {
    customerId: tickets[0].customer,
    tickets,
    satisfactionScore: avgValence,
    sentimentTrend: trend,
  }
}

const customerTickets: SupportTicket[] = [
  {
    id: 'TICKET-1',
    customer: 'customer1@example.com',
    status: 'resolved',
    messages: [
      { text: "Having trouble with my account", timestamp: Date.now(), from: 'customer' },
      { text: "Thanks for the help!", timestamp: Date.now(), from: 'customer' },
    ],
  },
  {
    id: 'TICKET-2',
    customer: 'customer1@example.com',
    status: 'resolved',
    messages: [
      { text: "One more question", timestamp: Date.now(), from: 'customer' },
      { text: "Perfect, that worked!", timestamp: Date.now(), from: 'customer' },
    ],
  },
]

const satisfaction = calculateSatisfactionScore(customerTickets)

console.log(`Customer Satisfaction Report for ${satisfaction.customerId}`)
console.log(`Satisfaction Score: ${(satisfaction.satisfactionScore * 100).toFixed(0)}/100`)
console.log(`Trend: ${satisfaction.sentimentTrend === 'improving' ? '📈 Improving' : satisfaction.sentimentTrend === 'declining' ? '📉 Declining' : '➡️ Stable'}`)

// ============================================================================
// EXAMPLE 3: AGENT PERFORMANCE METRICS
// ============================================================================

console.log('\n\n=== Example 3: Agent Performance Metrics ===\n')

interface AgentPerformance {
  agentId: string
  ticketsResolved: number
  avgCustomerSatisfaction: number
  escalationRate: number
  avgResponseSentiment: number
}

function analyzeAgentPerformance(agentId: string, tickets: SupportTicket[]): AgentPerformance {
  const agentTickets = tickets.filter(t => t.messages.some(m => m.from === 'agent'))

  let totalCustomerSatisfaction = 0
  let escalations = 0
  let totalAgentSentiment = 0

  agentTickets.forEach(ticket => {
    const customerMessages = ticket.messages.filter(m => m.from === 'customer')
    const agentMessages = ticket.messages.filter(m => m.from === 'agent')

    const customerSentiments = customerMessages.map(m => detectSentiment(m.text))
    const agentSentiments = agentMessages.map(m => detectSentiment(m.text))

    totalCustomerSatisfaction += customerSentiments.reduce((sum, s) => sum + s.valence, 0) / customerSentiments.length

    const lastCustomerSentiment = customerSentiments[customerSentiments.length - 1]
    if (lastCustomerSentiment && (lastCustomerSentiment.sentiment === 'angry' || lastCustomerSentiment.sentiment === 'tense')) {
      escalations++
    }

    totalAgentSentiment += agentSentiments.reduce((sum, s) => sum + s.valence, 0) / agentSentiments.length
  })

  return {
    agentId,
    ticketsResolved: agentTickets.length,
    avgCustomerSatisfaction: totalCustomerSatisfaction / agentTickets.length,
    escalationRate: escalations / agentTickets.length,
    avgResponseSentiment: totalAgentSentiment / agentTickets.length,
  }
}

const allTickets: SupportTicket[] = [supportTicket, ...customerTickets]
const performance = analyzeAgentPerformance('AGENT-123', allTickets)

console.log(`Performance Report for ${performance.agentId}`)
console.log(`Tickets Resolved: ${performance.ticketsResolved}`)
console.log(`Avg Customer Satisfaction: ${(performance.avgCustomerSatisfaction * 100).toFixed(0)}/100`)
console.log(`Escalation Rate: ${(performance.escalationRate * 100).toFixed(0)}%`)
console.log(`Avg Response Sentiment: ${(performance.avgResponseSentiment * 100).toFixed(0)}/100`)

// ============================================================================
// EXAMPLE 4: REAL-TIME SENTIMENT MONITORING
// ============================================================================

console.log('\n\n=== Example 4: Real-Time Sentiment Monitoring ===\n')

class SentimentMonitor {
  private alertThreshold = 0.4 // Alert if valence drops below 0.4
  private alertCount = 0
  private maxAlerts = 3

  monitorMessage(message: string, customerName: string): void {
    const result = detectSentiment(message)

    console.log(`[${new Date().toLocaleTimeString()}] ${customerName}: "${message}"`)
    console.log(`  Sentiment: ${result.sentiment} (Valence: ${result.valence.toFixed(2)})`)

    // Check for alert conditions
    if (result.valence < this.alertThreshold && result.confidence > 0.7) {
      this.alertCount++

      console.log(`  ⚠️  ALERT #${this.alertCount}: Customer sentiment is negative!`)
      console.log(`  Action: Recommend supervisor intervention`)

      if (this.alertCount >= this.maxAlerts) {
        console.log(`  🚨 CRITICAL: Maximum alerts reached. Escalating immediately.`)
      }
    } else {
      // Reset alert count if sentiment improves
      if (this.alertCount > 0 && result.valence > 0.6) {
        console.log(`  ✅ Sentiment improved. Resetting alert count.`)
        this.alertCount = 0
      }
    }

    console.log('')
  }
}

const monitor = new SentimentMonitor()

// Simulate a difficult customer interaction
monitor.monitorMessage("I'm having trouble with my order", "Customer A")
monitor.monitorMessage("It's been two weeks and nothing!", "Customer A")
monitor.monitorMessage("This is unacceptable service!!!", "Customer A")
monitor.monitorMessage("I want to speak to a manager right now", "Customer A")

// ============================================================================
// EXAMPLE 5: PRIORITY QUEUE BASED ON SENTIMENT
// ============================================================================

console.log('=== Example 5: Priority Queue Based on Sentiment ===\n')

interface QueuedTicket {
  id: string
  customerMessage: string
  priority: number
  reason: string
}

function prioritizeTickets(tickets: Array<{ id: string; message: string }>): QueuedTicket[] {
  return tickets
    .map(ticket => {
      const result = detectSentiment(ticket.message)

      let priority = 0
      let reason = 'Normal queue'

      // High priority: angry customers with high confidence
      if (result.sentiment === 'angry' && result.confidence > 0.7) {
        priority = 3
        reason = 'High urgency: Angry customer'
      }
      // Medium priority: anxious or tense customers
      else if ((result.sentiment === 'anxious' || result.sentiment === 'tense') && result.confidence > 0.6) {
        priority = 2
        reason = 'Medium urgency: Concerned customer'
      }
      // Low priority: calm or positive customers
      else if (result.sentiment === 'calm' || result.sentiment === 'happy') {
        priority = 0
        reason = 'Low urgency: Satisfied customer'
      }

      return {
        id: ticket.id,
        customerMessage: ticket.message,
        priority,
        reason,
      }
    })
    .sort((a, b) => b.priority - a.priority)
}

const incomingTickets = [
  { id: 'TICKET-1', message: "Just have a quick question" },
  { id: 'TICKET-2', message: "This is ridiculous! I'm furious!" },
  { id: 'TICKET-3', message: "I'm worried about my order status" },
  { id: 'TICKET-4', message: "Thanks for the great service!" },
  { id: 'TICKET-5', message: "I can't believe you guys did this!!! So angry right now" },
]

const prioritized = prioritizeTickets(incomingTickets)

console.log('Prioritized Ticket Queue:\n')
prioritized.forEach((ticket, i) => {
  const priorityLabel = ticket.priority === 3 ? '🔴 HIGH' : ticket.priority === 2 ? '🟡 MEDIUM' : '🟢 LOW'
  console.log(`${i + 1}. ${ticket.id} - ${priorityLabel} PRIORITY`)
  console.log(`   Message: "${ticket.customerMessage}"`)
  console.log(`   Reason: ${ticket.reason}`)
  console.log('')
})
