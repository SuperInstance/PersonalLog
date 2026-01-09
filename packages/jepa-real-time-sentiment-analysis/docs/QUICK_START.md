# 5-Minute Quick Start Guide

Get up and running with JEPA Real-Time Sentiment Analysis in **literally 5 minutes**.

---

## What You'll Learn

- Analyze text sentiment with 10 emotion categories (excited, happy, sad, angry, etc.)
- Get VAD scores (Valence-Arousal-Dominance) for deep emotional insights
- Enable WebGPU acceleration for 5-10x faster performance

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **Modern browser** (Chrome/Edge 90+, Firefox 88+, Safari 14+)
- **Basic TypeScript/JavaScript knowledge**
- **Optional:** Chrome 113+ for WebGPU acceleration (5-10x faster)

---

## 5-Minute Quick Start

### Step 1: Install (30 seconds)

```bash
npm install @superinstance/jepa-real-time-sentiment-analysis
```

### Step 2: Analyze First Sentiment (1 minute)

Create a new file `sentiment.ts`:

```typescript
import { detectSentiment } from '@superinstance/jepa-real-time-sentiment-analysis';

// Analyze sentiment
const result = detectSentiment("I'm so excited about this! 🎉");

console.log('🎭 Sentiment Analysis Results:');
console.log(`Sentiment: ${result.sentiment}`);
console.log(`Valence: ${result.valence.toFixed(2)} (positive/negative)`);
console.log(`Arousal: ${result.arousal.toFixed(2)} (calm/excited)`);
console.log(`Dominance: ${result.dominance.toFixed(2)} (submissive/dominant)`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
```

### Step 3: Try Different Emotions (1 minute)

```typescript
// Test different emotions
const texts = [
  "I'm so excited about this! 🎉",
  "This makes me really angry! 😡",
  "I'm feeling calm and relaxed 😌",
  "I'm so sad and disappointed 😢",
  "I'm worried and anxious about this 😰"
];

console.log('\n📊 Analyzing different emotions:\n');

texts.forEach(text => {
  const result = detectSentiment(text);
  console.log(`"${text}"`);
  console.log(`  → ${result.sentiment} (confidence: ${(result.confidence * 100).toFixed(0)}%)\n`);
});
```

### Step 4: Batch Analysis (1 minute)

```typescript
import { detectSentimentsBatch } from '@superinstance/jepa-real-time-sentiment-analysis';

// Analyze multiple messages at once
const messages = [
  { text: "Love this product!", speaker: "user1" },
  { text: "Terrible experience", speaker: "user2" },
  { text: "It's okay, nothing special", speaker: "user3" }
];

const results = detectSentimentsBatch(messages);

console.log('📦 Batch Analysis Results:');
results.forEach((result, index) => {
  console.log(`\n${messages[index].speaker}:`);
  console.log(`  Text: "${messages[index].text}"`);
  console.log(`  Sentiment: ${result.sentiment}`);
  console.log(`  Positive? ${result.valence > 0.5 ? '✅ Yes' : '❌ No'}`);
});
```

### Step 5: See Results (30 seconds)

```bash
# Run your file
npx tsx sentiment.ts

# Expected output:
# 🎭 Sentiment Analysis Results:
# Sentiment: excited
# Valence: 0.85 (very positive)
# Arousal: 0.90 (high energy)
# Dominance: 0.70 (confident)
# Confidence: 92%
#
# 📊 Analyzing different emotions:
#
# "I'm so excited about this! 🎉"
#   → excited (confidence: 92%)
#
# "This makes me really angry! 😡"
#   → angry (confidence: 89%)
#
# "I'm feeling calm and relaxed 😌"
#   → calm (confidence: 95%)
#
# "I'm so sad and disappointed 😢"
#   → sad (confidence: 91%)
#
# "I'm worried and anxious about this 😰"
#   → anxious (confidence: 88%)
```

### Step 6: Enable WebGPU Acceleration (Optional - 30 seconds)

For **5-10x faster** analysis with WebGPU:

```typescript
import { detectSentimentGPU, isWebGPUAvailable } from '@superinstance/jepa-real-time-sentiment-analysis';

// Check WebGPU support
if (isWebGPUAvailable()) {
  console.log('🚀 WebGPU available! Using GPU acceleration');

  // GPU-accelerated analysis
  const result = await detectSentimentGPU("I'm so excited! 🎉");

  console.log(`Sentiment: ${result.sentiment}`);
  console.log(`Processing time: ${result.processingTime}ms`);
  console.log(`Speedup: ${result.speedup}x faster than CPU`);
} else {
  console.log('⚠️  WebGPU not available, using CPU (still fast!)');
}
```

---

## Complete Working Example

Here's the complete script you can copy-paste:

```typescript
import {
  detectSentiment,
  detectSentimentsBatch,
  isPositiveSentiment,
  isHighArousal
} from '@superinstance/jepa-real-time-sentiment-analysis';

async function main() {
  console.log('🎭 JEPA Sentiment Analysis Demo\n');

  // 1. Single text analysis
  const text = "I'm so excited about this new feature! 🎉";
  const result = detectSentiment(text);

  console.log(`Analyzing: "${text}"\n`);
  console.log('Results:');
  console.log(`  Sentiment: ${result.sentiment}`);
  console.log(`  Valence: ${result.valence.toFixed(2)} (0=negative, 1=positive)`);
  console.log(`  Arousal: ${result.arousal.toFixed(2)} (0=calm, 1=excited)`);
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);

  // 2. Quick checks
  console.log(`\nQuick Checks:`);
  console.log(`  Is positive? ${isPositiveSentiment(result.sentiment) ? '✅ Yes' : '❌ No'}`);
  console.log(`  Is high energy? ${isHighArousal(result.sentiment) ? '✅ Yes' : '❌ No'}`);

  // 3. Batch analysis
  const reviews = [
    "This product is amazing! Best purchase ever!",
    "Terrible quality, waste of money",
    "It's okay, does what it's supposed to do"
  ];

  console.log('\n📦 Analyzing Customer Reviews:\n');
  const batchResults = detectSentimentsBatch(
    reviews.map(text => ({ text, speaker: 'customer' }))
  );

  reviews.forEach((review, i) => {
    const r = batchResults[i];
    console.log(`"${review}"`);
    console.log(`  → ${r.sentiment} (${r.sentiment === 'happy' ? '😊' : r.sentiment === 'angry' ? '😡' : '😐'})`);
    console.log(`  → Positive: ${r.valence > 0.6 ? '✅' : '❌'} (${(r.valence * 100).toFixed(0)}%)\n`);
  });

  console.log('✅ Analysis complete!');
}

main().catch(console.error);
```

---

## Understanding VAD Scores

**VAD (Valence-Arousal-Dominance)** is a psychological model that captures emotion in 3 dimensions:

### 📊 The Three Dimensions

| Dimension | Range | Meaning | Example |
|-----------|-------|---------|---------|
| **Valence** | 0.0 - 1.0 | How positive/negative | 0.9 = joy, 0.1 = sadness |
| **Arousal** | 0.0 - 1.0 | How calm/excited | 0.9 = excited, 0.1 = bored |
| **Dominance** | 0.0 - 1.0 | How submissive/dominant | 0.9 = confident, 0.1 = fearful |

### 🎭 Real-World Examples

```typescript
// Example 1: Excited & Happy
"I'm so excited! 🎉"
// Valence: 0.85 (very positive)
// Arousal: 0.90 (high energy)
// Dominance: 0.70 (confident)
// → Sentiment: excited

// Example 2: Angry & Frustrated
"This makes me so angry! 😡"
// Valence: 0.15 (very negative)
// Arousal: 0.85 (high energy)
// Dominance: 0.60 (assertive)
// → Sentiment: angry

// Example 3: Calm & Relaxed
"I'm feeling peaceful 😌"
// Valence: 0.75 (positive)
// Arousal: 0.20 (low energy)
// Dominance: 0.50 (neutral)
// → Sentiment: calm

// Example 4: Sad & Depressed
"I'm so sad about this 😢"
// Valence: 0.20 (negative)
// Arousal: 0.30 (low energy)
// Dominance: 0.30 (submissive)
// → Sentiment: sad
```

---

## Real-World Example: Customer Support

```typescript
import { detectSentiment, isPositiveSentiment } from '@superinstance/jepa-real-time-sentiment-analysis';

// Monitor customer support messages
function onCustomerMessage(message: string, customerId: string) {
  const sentiment = detectSentiment(message);

  console.log(`Customer ${customerId}: ${message}`);
  console.log(`Sentiment: ${sentiment.sentiment} (${(sentiment.confidence * 100).toFixed(0)}% confident)`);

  // Detect frustrated customers
  if (sentiment.sentiment === 'angry' || sentiment.sentiment === 'anxious') {
    if (sentiment.confidence > 0.8) {
      console.log('🚨 ALERT: Highly frustrated customer!');
      console.log('   Action: Escalate to senior support agent');
      // escalateToSupport(customerId, message);
    }
  }

  // Detect happy customers
  if (isPositiveSentiment(sentiment.sentiment) && sentiment.valence > 0.7) {
    console.log('😊 Happy customer!');
    console.log('   Action: Ask for review or testimonial');
    // requestTestimonial(customerId);
  }
}

// Test it
onCustomerMessage("This is ridiculous! I've been waiting for hours!", "customer-123");
// Output: 🚨 ALERT: Highly frustrated customer!

onCustomerMessage("You guys are amazing! Best support ever! 🎉", "customer-456");
// Output: 😊 Happy customer!
```

---

## Next Steps

### 📖 Learn More

- **[User Guide](./USER_GUIDE.md)** - Complete guide with 15+ real-world use cases
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Full API reference and integration examples
- **[Architecture Guide](./ARCHITECTURE.md)** - Technical deep-dive into VAD model

### 💡 Try Examples

Explore production-ready examples in the `examples/` directory:

- **Real-Time Chat Monitor** - Detect frustrated customers before they leave
- **Social Media Tracker** - Track brand sentiment across millions of posts
- **Review Analyzer** - Understand what customers love/hate
- **Content Moderation** - Detect toxic content automatically
- **Podcast Sentiment** - Track emotional journey through episodes
- **WebGPU Performance** - Process 10,000+ messages per second

### 🎯 Common Use Cases

1. **Customer Support** - Detect frustrated customers in real-time
2. **Social Media Monitoring** - Track brand sentiment at scale
3. **Review Analysis** - Understand customer feedback
4. **Content Moderation** - Detect toxic content automatically
5. **Chat Apps** - Add emotional intelligence to messaging
6. **Podcast Analytics** - Track emotional engagement

---

## Troubleshooting

### Issue: "Sentiment detection seems inaccurate"

**Solution:** Use confidence scores and context:
```typescript
const result = detectSentiment("This is sick!");

// Check confidence
if (result.confidence < 0.7) {
  console.log('⚠️ Low confidence, may need human review');
}

// Check for mixed emotions
if (result.secondarySentiments) {
  console.log('Multiple emotions detected:', result.secondarySentiments);
}

// Provide conversation context for better accuracy
const resultWithContext = detectSentiment(
  "This is sick!",
  { previousMessages: ["I just got the new iPhone"] }
);
```

### Issue: "Batch processing is slow"

**Solution:** Enable WebGPU acceleration:
```typescript
import { createWebGPUSentimentAnalyzer } from '@superinstance/jepa-real-time-sentiment-analysis';

const analyzer = await createWebGPUSentimentAnalyzer();

// Process 10,000 messages
const messages = Array(10000).fill(0).map((_, i) => ({
  text: `Message ${i}`,
  speaker: `user${i}`
}));

const results = await analyzer.analyzeBatch(messages);
// 5-10x faster with WebGPU!
```

### Issue: "Emoji detection not working"

**Solution:** Use the emoji extraction utility:
```typescript
import { extractEmojis, detectSentiment } from '@superinstance/jepa-real-time-sentiment-analysis';

const text = "I love this! 🎉🚀💻";
const emojis = extractEmojis(text);

console.log('Emojis found:', emojis);
// Output: ['🎉', '🚀', '💻']

// Sentiment analysis automatically considers emojis
const sentiment = detectSentiment(text);
console.log('Sentiment:', sentiment.sentiment);
// Output: excited (emojis boost detection)
```

### Issue: "Need to detect sentiment in other languages"

**Solution:** The library works best with English, but can handle basic sentiment in other languages:
```typescript
// Works with basic English
const en = detectSentiment("I am happy");
// Sentiment: happy

// May work with simple other languages
const es = detectSentiment("Estoy muy feliz"); // Spanish for "I'm very happy"
// Sentiment: likely happy, but lower confidence

// For production multi-language, consider translation first:
const translated = await translateToEnglish("Je suis très heureux");
const sentiment = detectSentiment(translated);
```

---

## Get Help

### Documentation

- **[README](../README.md)** - Project overview and features
- **[User Guide](./USER_GUIDE.md)** - Complete user documentation
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - API reference

### Community

- **[GitHub Issues](https://github.com/SuperInstance/JEPA-Real-Time-Sentiment-Analysis/issues)** - Bug reports & feature requests
- **[GitHub Discussions](https://github.com/SuperInstance/JEPA-Real-Time-Sentiment-Analysis/discussions)** - Questions & discussions
- **[NPM Package](https://www.npmjs.com/package/@superinstance/jepa-real-time-sentiment-analysis)** - Package information

### Quick Reference

```typescript
// Import
import {
  detectSentiment,
  detectSentimentsBatch,
  isPositiveSentiment,
  isHighArousal,
  extractEmojis
} from '@superinstance/jepa-real-time-sentiment-analysis';

// Single analysis
const result = detectSentiment("I love this!");

// Batch analysis
const results = detectSentimentsBatch([
  { text: "Great!", speaker: "user1" },
  { text: "Terrible", speaker: "user2" }
]);

// Quick checks
if (isPositiveSentiment(result.sentiment)) {
  console.log('Positive emotion detected');
}

if (isHighArousal(result.sentiment)) {
  console.log('High energy emotion detected');
}

// WebGPU acceleration (optional)
import { detectSentimentGPU, isWebGPUAvailable } from '@superinstance/jepa-real-time-sentiment-analysis';

if (isWebGPUAvailable()) {
  const result = await detectSentimentGPU("I'm so excited!");
  // 5-10x faster!
}
```

---

## Success Checklist ✅

After completing this guide, you should be able to:

- ✅ Install and import the package
- ✅ Analyze text sentiment with 10 emotion categories
- ✅ Understand VAD scores (Valence-Arousal-Dominance)
- ✅ Perform batch sentiment analysis
- ✅ Extract emojis from text
- ✅ Use helper functions (isPositiveSentiment, isHighArousal)
- ✅ Enable WebGPU acceleration for 5-10x speedup

**Did you complete all steps?** You're ready to use JEPA Sentiment Analysis in production!

---

## Where to Go From Here?

### Continue Learning

1. **Read the User Guide** - Learn advanced sentiment patterns and 15+ use cases
2. **Explore Examples** - See real-world implementations
3. **Check API Reference** - Discover all available methods and types
4. **Join Community** - Share your use cases and get feedback

### Build Something Amazing

- 💬 **Customer Support Dashboard** - Real-time frustration alerts
- 📱 **Social Media Monitor** - Track brand sentiment at scale
- ⭐ **Review Analyzer** - Understand customer feedback
- 🛡️ **Content Moderation System** - Auto-detect toxic content
- 🎙️ **Podcast Analytics** - Track emotional engagement
- 📊 **Survey Analysis** - Deep insights from open-ended responses

---

## Key Benefits You Just Discovered

### ✅ Easy to Use
- Simple API
- Zero dependencies
- Works everywhere (browser, Node.js, edge functions)
- TypeScript support

### ✅ Comprehensive Emotions
- 10 emotion categories (excited, happy, calm, sad, angry, etc.)
- VAD scoring for deep insights
- Confidence metrics
- Secondary sentiment detection

### ✅ High Performance
- CPU: ~650 messages/second
- GPU: ~5,000+ messages/second (WebGPU)
- Batch processing
- Real-time streaming (60+ FPS)

### ✅ Privacy-First
- 100% browser-based
- No API calls needed
- GDPR/HIPAA compliant
- Works offline

---

**Ready to dive deeper?** Check out the [User Guide](./USER_GUIDE.md) for comprehensive documentation!

**Made with ❤️ by the SuperInstance team**
