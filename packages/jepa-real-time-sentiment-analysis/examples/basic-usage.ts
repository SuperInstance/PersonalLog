/**
 * Basic Usage Example
 *
 * This example demonstrates the basic functionality of the JEPA
 * Real-Time Sentiment Analysis library.
 */

import {
  detectSentiment,
  isPositiveSentiment,
  getSentimentTypes,
  extractEmojis,
} from '@superinstance/jepa-real-time-sentiment-analysis'

// Example 1: Simple sentiment detection
console.log('=== Example 1: Simple Sentiment Detection ===\n')

const messages = [
  "I'm so happy today!",
  "This is really frustrating...",
  "Just finished a big project 🎉",
  "I'm feeling a bit anxious about the presentation",
  "Everything is going well, thanks for asking!",
]

messages.forEach((message) => {
  const result = detectSentiment(message)

  console.log(`Message: "${message}"`)
  console.log(`  Sentiment: ${result.sentiment}`)
  console.log(`  Positive: ${isPositiveSentiment(result.sentiment)}`)
  console.log(`  VAD Scores:`)
  console.log(`    - Valence:   ${result.valence.toFixed(2)} (positive/negative)`)
  console.log(`    - Arousal:   ${result.arousal.toFixed(2)} (energy/intensity)`)
  console.log(`    - Dominance: ${result.dominance.toFixed(2)} (control/power)`)
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`)
  console.log(`  Evidence: ${result.evidence.join(', ')}`)
  console.log('')
})

// Example 2: Emoji extraction and analysis
console.log('\n=== Example 2: Emoji Analysis ===\n')

const emojiMessages = [
  "I'm so happy! 😊😊😊",
  "This is terrible 😭",
  "Excited about the news! 🎉🔥⚡",
  "Feeling calm and peaceful 😌🕊️",
]

emojiMessages.forEach((message) => {
  const emojis = extractEmojis(message)
  const result = detectSentiment(message)

  console.log(`Message: "${message}"`)
  console.log(`  Emojis found: ${emojis.join(' ')}`)
  console.log(`  Sentiment: ${result.sentiment}`)
  console.log('')
})

// Example 3: Available sentiment types
console.log('\n=== Example 3: All Available Sentiment Types ===\n')

const sentimentTypes = getSentimentTypes()
console.log(`Total sentiment categories: ${sentimentTypes.length}`)
console.log('Categories:')
sentimentTypes.forEach((sentiment) => {
  const result = detectSentiment(`I'm feeling ${sentiment}`)
  const intensity = result.arousal > 0.6 ? 'high' : result.arousal > 0.4 ? 'medium' : 'low'
  const polarity = isPositiveSentiment(sentiment) ? 'positive' : 'negative'
  console.log(`  - ${sentiment.padEnd(12)} (${polarity}, ${intensity} arousal)`)
})

// Example 4: Understanding VAD scores
console.log('\n=== Example 4: Understanding VAD Scores ===\n')

const vadExamples = [
  { text: "I'm absolutely furious!", expected: { valence: 'low', arousal: 'high' } },
  { text: "Feeling peaceful and relaxed", expected: { valence: 'high', arousal: 'low' } },
  { text: "Just neutral, nothing special", expected: { valence: 'mid', arousal: 'mid' } },
  { text: "So excited and thrilled!", expected: { valence: 'high', arousal: 'high' } },
]

vadExamples.forEach(({ text, expected }) => {
  const result = detectSentiment(text)

  const valence = result.valence < 0.4 ? 'low' : result.valence > 0.6 ? 'high' : 'mid'
  const arousal = result.arousal < 0.4 ? 'low' : result.arousal > 0.6 ? 'high' : 'mid'

  console.log(`Message: "${text}"`)
  console.log(`  Expected: valence=${expected.valence}, arousal=${expected.arousal}`)
  console.log(`  Detected: valence=${valence}, arousal=${aroussal}`)
  console.log(`  Match: ${valence === expected.valence && arousal === expected.arousal ? '✅' : '❌'}`)
  console.log('')
})

// Example 5: Sentiment filtering
console.log('\n=== Example 5: Filtering Messages by Sentiment ===\n')

const allMessages = [
  "I love this product!",
  "This is broken and useless",
  "It's okay, nothing special",
  "Absolutely fantastic! 👍",
  "Really disappointed with this",
]

console.log('Positive messages:')
allMessages
  .map(msg => ({ text: msg, result: detectSentiment(msg) }))
  .filter(({ result }) => isPositiveSentiment(result.sentiment))
  .forEach(({ text, result }) => {
    console.log(`  ✅ "${text}" (${result.sentiment}, ${(result.confidence * 100).toFixed(0)}% confidence)`)
  })

console.log('\nNegative messages:')
allMessages
  .map(msg => ({ text: msg, result: detectSentiment(msg) }))
  .filter(({ result }) => !isPositiveSentiment(result.sentiment) && result.sentiment !== 'neutral')
  .forEach(({ text, result }) => {
    console.log(`  ❌ "${text}" (${result.sentiment}, ${(result.confidence * 100).toFixed(0)}% confidence)`)
  })
