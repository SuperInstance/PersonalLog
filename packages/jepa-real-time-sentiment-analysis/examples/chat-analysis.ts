/**
 * Chat Sentiment Analysis Example
 *
 * This example demonstrates how to analyze sentiment in a multi-person
 * chat conversation with context awareness.
 */

import {
  detectSentimentsBatch,
  detectSentiment,
  isPositiveSentiment,
  getSentimentIntensity,
} from '@superinstance/jepa-real-time-sentiment-analysis'

// Example 1: Analyze a full chat conversation
console.log('=== Example 1: Chat Conversation Analysis ===\n')

const chatConversation = [
  { speaker: 'Alice', text: "Hey! How's it going?" },
  { speaker: 'Bob', text: "Pretty good! Just finished a big project 🎉" },
  { speaker: 'Alice', text: "That's awesome! Congrats!" },
  { speaker: 'Bob', text: "Thanks! I'm so relieved it's done" },
  { speaker: 'Alice', text: "Must have been a lot of work" },
  { speaker: 'Bob', text: "Yeah, really stressful but worth it" },
  { speaker: 'Alice', text: "You should celebrate!" },
  { speaker: 'Bob', text: "Planning to! 😊" },
]

// Analyze the entire conversation with context
const results = detectSentimentsBatch(chatConversation)

results.forEach((result, i) => {
  const msg = chatConversation[i]
  const intensity = getSentimentIntensity(result.sentiment)
  const positive = isPositiveSentiment(result.sentiment)

  console.log(`${msg.speaker}: "${msg.text}"`)
  console.log(`  Sentiment: ${result.sentiment} (${intensity} intensity, ${positive ? 'positive' : 'negative'})`)
  console.log(`  VAD: ${result.valence.toFixed(2)}V/${result.arousal.toFixed(2)}A/${result.dominance.toFixed(2)}D`)

  // Show secondary sentiments if detected
  if (result.secondarySentiments && result.secondarySentiments.length > 0) {
    const secondary = result.secondarySentiments.map(s => `${s.sentiment} (${(s.confidence * 100).toFixed(0)}%)`).join(', ')
    console.log(`  Also detected: ${secondary}`)
  }
  console.log('')
})

// Example 2: Sentiment trends per speaker
console.log('\n=== Example 2: Per-Speaker Sentiment Analysis ===\n')

function analyzeSpeakerSentiment(messages: Array<{ speaker: string; text: string }>) {
  const speakerStats: Record<
    string,
    { messages: number; avgValence: number; avgArousal: number; sentiments: string[] }
  > = {}

  // Group by speaker
  messages.forEach((msg) => {
    if (!speakerStats[msg.speaker]) {
      speakerStats[msg.speaker] = { messages: 0, avgValence: 0, avgArousal: 0, sentiments: [] }
    }
    const result = detectSentiment(msg.text)
    speakerStats[msg.speaker].messages++
    speakerStats[msg.speaker].avgValence += result.valence
    speakerStats[msg.speaker].avgArousal += result.arousal
    speakerStats[msg.speaker].sentiments.push(result.sentiment)
  })

  // Calculate averages
  Object.entries(speakerStats).forEach(([speaker, stats]) => {
    stats.avgValence /= stats.messages
    stats.avgArousal /= stats.messages
  })

  return speakerStats
}

const speakerStats = analyzeSpeakerSentiment(chatConversation)

Object.entries(speakerStats).forEach(([speaker, stats]) => {
  console.log(`${speaker}:`)
  console.log(`  Messages: ${stats.messages}`)
  console.log(`  Average Valence: ${stats.avgValence.toFixed(2)} (${stats.avgValence > 0.5 ? 'positive' : 'negative'})`)
  console.log(`  Average Arousal: ${stats.avgArousal.toFixed(2)} (${stats.avgArousal > 0.5 ? 'high energy' : 'low energy'})`)
  console.log(`  Most common sentiment: ${getMostCommon(stats.sentiments)}`)
  console.log('')
})

function getMostCommon(arr: string[]): string {
  const counts: Record<string, number> = {}
  arr.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

// Example 3: Detect conversation turning points
console.log('\n=== Example 3: Conversation Turning Points ===\n')

function detectTurningPoints(messages: Array<{ text: string }>) {
  const turningPoints: Array<{ index: number; from: string; to: string; text: string }> = []

  for (let i = 1; i < messages.length; i++) {
    const prevResult = detectSentiment(messages[i - 1].text)
    const currResult = detectSentiment(messages[i].text)

    const prevValence = prevResult.valence
    const currValence = currResult.valence

    // Significant valence shift (> 0.3)
    if (Math.abs(currValence - prevValence) > 0.3) {
      turningPoints.push({
        index: i,
        from: prevResult.sentiment,
        to: currResult.sentiment,
        text: messages[i].text,
      })
    }
  }

  return turningPoints
}

const turningPoints = detectTurningPoints(chatConversation)

if (turningPoints.length > 0) {
  console.log(`Detected ${turningPoints.length} sentiment turning points:\n`)
  turningPoints.forEach((tp) => {
    const direction = detectSentiment(chatConversation[tp.index].text).valence > detectSentiment(chatConversation[tp.index - 1].text).valence ? '↑' : '↓'
    console.log(`  Message ${tp.index + 1}: "${tp.text}"`)
    console.log(`    ${direction} Sentiment shifted from ${tp.from} to ${tp.to}`)
    console.log('')
  })
} else {
  console.log('No significant sentiment turning points detected.')
}

// Example 4: Conflict detection
console.log('\n=== Example 4: Conflict Detection ===\n')

const conflictConversation = [
  { speaker: 'Alice', text: "I don't think that's the right approach" },
  { speaker: 'Bob', text: "Well, I disagree. This is the best way" },
  { speaker: 'Alice', text: "But we tried that before and it didn't work" },
  { speaker: 'Bob', text: "You're not listening to my point!" },
  { speaker: 'Alice', text: "I am listening! I just have concerns" },
  { speaker: 'Bob', text: "This is frustrating! Let's just move on" },
]

function detectConflict(messages: Array<{ speaker: string; text: string }>) {
  const conflicts: Array<{ index: number; speaker: string; sentiment: string; confidence: number }> = []

  messages.forEach((msg, i) => {
    const result = detectSentiment(msg.text)
    // Check for negative, high-arousal sentiments (angry, tense, frustrated)
    if ((result.sentiment === 'angry' || result.sentiment === 'tense') && result.confidence > 0.7) {
      conflicts.push({ index: i, speaker: msg.speaker, sentiment: result.sentiment, confidence: result.confidence })
    }
  })

  return conflicts
}

const conflicts = detectConflict(conflictConversation)

if (conflicts.length > 0) {
  console.log(`⚠️  Potential conflict detected (${conflicts.length} high-tension messages):\n`)
  conflicts.forEach((c) => {
    console.log(`  Message ${c.index + 1} (${c.speaker}):`)
    console.log(`    "${conflictConversation[c.index].text}"`)
    console.log(`    Sentiment: ${c.sentiment} (${(c.confidence * 100).toFixed(0)}% confidence)`)
    console.log('')
  })
} else {
  console.log('✅ No conflicts detected')
}

// Example 5: Sentiment timeline visualization
console.log('\n=== Example 5: Sentiment Timeline ===\n')

function visualizeSentimentTimeline(messages: Array<{ text: string }>) {
  const results = messages.map((msg) => detectSentiment(msg.text))

  console.log('Sentiment over time:')
  console.log('')

  results.forEach((result, i) => {
    const valenceBar = '█'.repeat(Math.round(result.valence * 20))
    const arousalBar = '█'.repeat(Math.round(result.arousal * 20))

    console.log(`${(i + 1).toString().padStart(2)} | ${result.sentiment.padEnd(10)} | V:${valenceBar.padEnd(20)} | A:${arousalBar.padEnd(20)}`)
  })
}

visualizeSentimentTimeline(chatConversation)

console.log('')
console.log('Legend:')
console.log('  V = Valence (positive/negative)')
console.log('  A = Arousal (energy/intensity)')
console.log('  █ = magnitude')
