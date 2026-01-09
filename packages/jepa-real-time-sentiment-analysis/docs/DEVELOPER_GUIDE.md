# JEPA Real-Time Sentiment Analysis - Developer Guide

> Complete API reference, integration examples, and best practices for developers

## Table of Contents

- [Getting Started](#getting-started)
- [Complete API Reference](#complete-api-reference)
- [VAD Scoring Guide](#vad-scoring-guide)
- [Real-Time Streaming](#real-time-streaming)
- [Batch Processing](#batch-processing)
- [WebGPU Setup](#webgpu-setup)
- [Custom Sentiment Patterns](#custom-sentiment-patterns)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

```bash
npm install @superinstance/jepa-real-time-sentiment-analysis
```

### Basic Setup

```typescript
// TypeScript/JavaScript
import {
  detectSentiment,
  detectSentimentsBatch,
  createWebGPUSentimentAnalyzer
} from '@superinstance/jepa-real-time-sentiment-analysis'

// CommonJS
const {
  detectSentiment,
  detectSentimentsBatch,
  createWebGPUSentimentAnalyzer
} = require('@superinstance/jepa-real-time-sentiment-analysis')
```

### First Analysis

```typescript
const result = detectSentiment("I'm so excited about this! 🎉")

console.log(result)
// {
//   sentiment: 'excited',
//   valence: 0.85,
//   arousal: 0.90,
//   dominance: 0.70,
//   confidence: 0.92,
//   evidence: ['Keywords: "excited"', 'Emojis: 🎉']
// }
```

---

## Complete API Reference

### Core Functions

#### `detectSentiment(text, context?)`

Analyzes sentiment from a single text message.

**Signature:**
```typescript
function detectSentiment(
  text: string,
  context?: TextContextWindow
): TextSentimentDetection
```

**Parameters:**
- `text` (string) - The text to analyze
- `context` (optional) - Conversation context for improved accuracy

**Returns:** `TextSentimentDetection`

**Example:**
```typescript
const result = detectSentiment("This is amazing! 😍")

console.log(result.sentiment)        // 'happy'
console.log(result.valence)          // 0.85
console.log(result.confidence)       // 0.90
```

**With Context:**
```typescript
const context = {
  previousMessages: [
    { text: "I'm worried", sentiment: 'anxious' }
  ],
  speaker: 'user',
  topic: 'project status'
}

const result = detectSentiment("Everything is fine now", context)
// More accurate with context
```

---

#### `detectSentimentsBatch(messages)`

Analyzes sentiment from multiple messages with context awareness.

**Signature:**
```typescript
function detectSentimentsBatch(
  messages: Array<{ text: string; speaker?: string }>
): TextSentimentDetection[]
```

**Parameters:**
- `messages` - Array of messages with optional speaker identification

**Returns:** `Array<TextSentimentDetection>`

**Example:**
```typescript
const messages = [
  { speaker: 'Alice', text: "How are you?" },
  { speaker: 'Bob', text: "I'm doing great! 😊" },
  { speaker: 'Alice', text: "That's wonderful!" }
]

const results = detectSentimentsBatch(messages)

results.forEach((result, i) => {
  console.log(`${messages[i].speaker}: ${result.sentiment}`)
})
```

---

#### `isPositiveSentiment(sentiment)`

Checks if a sentiment is positive (valence > 0.5).

**Signature:**
```typescript
function isPositiveSentiment(sentiment: SentimentCategory): boolean
```

**Parameters:**
- `sentiment` - Sentiment category to check

**Returns:** `boolean`

**Example:**
```typescript
isPositiveSentiment('happy')    // true
isPositiveSentiment('excited')  // true
isPositiveSentiment('sad')      // false
isPositiveSentiment('angry')    // false
```

---

#### `isHighArousal(sentiment)`

Checks if a sentiment is high energy (arousal > 0.5).

**Signature:**
```typescript
function isHighArousal(sentiment: SentimentCategory): boolean
```

**Parameters:**
- `sentiment` - Sentiment category to check

**Returns:** `boolean`

**Example:**
```typescript
isHighArousal('excited')  // true
isHighArousal('angry')    // true
isHighArousal('calm')     // false
isHighArousal('sad')      // false
```

---

#### `getSentimentIntensity(sentiment)`

Gets the intensity level of a sentiment.

**Signature:**
```typescript
function getSentimentIntensity(sentiment: SentimentCategory): 'low' | 'medium' | 'high'
```

**Parameters:**
- `sentiment` - Sentiment category

**Returns:** `'low' | 'medium' | 'high'`

**Example:**
```typescript
getSentimentIntensity('excited')  // 'high'
getSentimentIntensity('happy')    // 'medium'
getSentimentIntensity('bored')    // 'low'
```

---

#### `extractEmojis(text)`

Extracts all emojis from text.

**Signature:**
```typescript
function extractEmojis(text: string): string[]
```

**Parameters:**
- `text` - Text to extract emojis from

**Returns:** `Array<string>` - Array of emoji characters

**Example:**
```typescript
const emojis = extractEmojis("I'm so excited! 🎉🔥✨")
// ['🎉', '🔥', '✨']
```

---

#### `getSentimentTypes()`

Returns all available sentiment categories.

**Signature:**
```typescript
function getSentimentTypes(): SentimentCategory[]
```

**Returns:** `Array<SentimentCategory>`

**Example:**
```typescript
const types = getSentimentTypes()
// ['excited', 'happy', 'calm', 'relaxed', 'neutral',
//  'bored', 'sad', 'angry', 'anxious', 'tense']
```

---

### WebGPU Functions

#### `isWebGPUAvailable()`

Checks if WebGPU is available in the current browser.

**Signature:**
```typescript
function isWebGPUAvailable(): boolean
```

**Returns:** `boolean`

**Example:**
```typescript
if (isWebGPUAvailable()) {
  console.log('✅ WebGPU available')
} else {
  console.log('⚠️ WebGPU not available, will use CPU')
}
```

---

#### `detectSentimentGPU(text, config?)`

Quick GPU-accelerated sentiment analysis with automatic fallback.

**Signature:**
```typescript
function detectSentimentGPU(
  text: string,
  config?: WebGPUConfig
): Promise<WebGPUInferenceResult>
```

**Parameters:**
- `text` - The text to analyze
- `config` - Optional WebGPU configuration

**Returns:** `Promise<WebGPUInferenceResult>`

**Example:**
```typescript
const result = await detectSentimentGPU("I'm so excited!")

console.log(result.sentiment)              // 'excited'
console.log(result.usedGPU)                // true
console.log(result.performance?.speedupFactor)  // 7.5
```

---

#### `createWebGPUSentimentAnalyzer(config?)`

Creates a WebGPU analyzer instance for better performance with multiple texts.

**Signature:**
```typescript
function createWebGPUSentimentAnalyzer(
  config?: WebGPUConfig
): Promise<WebGPUSentimentAnalyzer>
```

**Parameters:**
- `config` - Optional WebGPU configuration

**Returns:** `Promise<WebGPUSentimentAnalyzer>`

**Example:**
```typescript
const analyzer = await createWebGPUSentimentAnalyzer({
  enableTimestamps: true,
  useMappedBuffers: true,
  maxBufferSize: 256 * 1024 * 1024  // 256MB
})

// Use analyzer
const result = await analyzer.analyze("This is great!")

// Cleanup when done
await analyzer.cleanup()
```

---

### WebGPUConfig

Configuration options for WebGPU acceleration.

```typescript
interface WebGPUConfig {
  /** Preferred device type (default: first available) */
  devicePreference?: 'discrete-gpu' | 'integrated-gpu' | 'cpu'

  /** Enable timestamp queries for performance tracking (default: false) */
  enableTimestamps?: boolean

  /** Maximum buffer size in bytes (default: 256MB) */
  maxBufferSize?: number

  /** Enable memory mapping for faster transfers (default: true) */
  useMappedBuffers?: boolean

  /** Force CPU fallback even if WebGPU is available (default: false) */
  forceCPUFallback?: boolean
}
```

**Example:**
```typescript
const config: WebGPUConfig = {
  devicePreference: 'discrete-gpu',
  enableTimestamps: true,
  useMappedBuffers: true,
  maxBufferSize: 512 * 1024 * 1024  // 512MB
}

const analyzer = await createWebGPUSentimentAnalyzer(config)
```

---

### WebGPUSentimentAnalyzer Class

Main class for GPU-accelerated sentiment analysis.

#### Methods

##### `initialize()`

Initialize the analyzer (called automatically).

```typescript
async initialize(): Promise<void>
```

##### `analyze(text)`

Analyze a single text.

```typescript
async analyze(text: string): Promise<WebGPUInferenceResult>
```

**Example:**
```typescript
const result = await analyzer.analyze("This is amazing!")

console.log(result.sentiment)          // 'happy'
console.log(result.performance?.gpuExecutionTime)  // 0.2ms
```

##### `analyzeBatch(texts)`

Analyze multiple texts in parallel.

```typescript
async analyzeBatch(texts: string[]): Promise<WebGPUInferenceResult[]>
```

**Example:**
```typescript
const texts = [
  "This is great!",
  "I'm so sad...",
  "Whatever..."
]

const results = await analyzer.analyzeBatch(texts)

results.forEach((result, i) => {
  console.log(`${texts[i]} -> ${result.sentiment}`)
})
```

##### `getPerformanceStats()`

Get performance statistics.

```typescript
getPerformanceStats(): {
  averageSpeedup: number
  averageThroughput: number
  gpuUtilizationRate: number
  totalInferences: number
}
```

**Example:**
```typescript
const stats = analyzer.getPerformanceStats()

console.log(`Average speedup: ${stats.averageSpeedup.toFixed(2)}x`)
console.log(`Throughput: ${stats.averageThroughput.toFixed(0)} msg/sec`)
console.log(`GPU utilization: ${(stats.gpuUtilizationRate * 100).toFixed(0)}%`)
console.log(`Total inferences: ${stats.totalInferences}`)
```

##### `getDeviceInfo()`

Get GPU device information.

```typescript
getDeviceInfo(): WebGPUDeviceInfo | null
```

**Returns:** Device information if GPU is being used, `null` otherwise

**Example:**
```typescript
const device = analyzer.getDeviceInfo()

if (device) {
  console.log(`GPU: ${device.vendor} ${device.adapter}`)
  console.log(`Memory: ${(device.availableMemory / 1024 / 1024).toFixed(0)}MB`)
  console.log(`Features: ${device.features.join(', ')}`)
}
```

##### `isUsingGPU()`

Check if using GPU acceleration.

```typescript
isUsingGPU(): boolean
```

**Example:**
```typescript
if (analyzer.isUsingGPU()) {
  console.log('✅ GPU acceleration enabled')
} else {
  console.log('⚠️ Using CPU fallback')
}
```

##### `cleanup()`

Cleanup resources.

```typescript
async cleanup(): Promise<void>
```

**Example:**
```typescript
// Always cleanup when done
await analyzer.cleanup()
```

---

### Type Definitions

#### SentimentCategory

The 10 sentiment categories:

```typescript
type SentimentCategory =
  | 'excited'    // High valence, high arousal
  | 'happy'      // High valence, medium arousal
  | 'calm'       // High valence, low arousal
  | 'relaxed'    // Medium valence, low arousal
  | 'neutral'    // Medium valence, medium arousal
  | 'bored'      // Low valence, low arousal
  | 'sad'        // Low valence, medium arousal
  | 'angry'      // Low valence, high arousal
  | 'anxious'    // Medium valence, high arousal
  | 'tense'      // Low valence, high arousal
```

#### VADCoordinates

Three-dimensional sentiment representation:

```typescript
interface VADCoordinates {
  valence: number    // 0 = negative, 1 = positive
  arousal: number    // 0 = calm, 1 = excited
  dominance: number  // 0 = submissive, 1 = dominant
}
```

#### TextSentimentDetection

Sentiment detection result:

```typescript
interface TextSentimentDetection {
  /** Primary sentiment detected */
  sentiment: SentimentCategory

  /** Secondary sentiments detected (if any) */
  secondarySentiments?: Array<{
    sentiment: SentimentCategory
    confidence: number
  }>

  /** Valence: positive (0.6-1.0) vs negative (0.0-0.4) */
  valence: number

  /** Arousal: energy/intensity (0.0-1.0) */
  arousal: number

  /** Dominance: confidence/assertiveness (0.0-1.0) */
  dominance: number

  /** Overall confidence in detection (0.0-1.0) */
  confidence: number

  /** Evidence supporting this detection */
  evidence: string[]
}
```

#### WebGPUInferenceResult

GPU inference result with performance data:

```typescript
interface WebGPUInferenceResult extends TextSentimentDetection {
  /** Performance metrics */
  performance?: WebGPUPerformanceMetrics

  /** Whether GPU was used for this inference */
  usedGPU: boolean

  /** Device information (if GPU was used) */
  deviceInfo?: WebGPUDeviceInfo
}
```

#### WebGPUPerformanceMetrics

Performance metrics for GPU inference:

```typescript
interface WebGPUPerformanceMetrics {
  /** Total GPU execution time in milliseconds */
  gpuExecutionTime: number

  /** Total CPU execution time in milliseconds */
  cpuExecutionTime: number

  /** Memory transfer time in milliseconds */
  memoryTransferTime: number

  /** Speedup factor (GPU time / CPU time) */
  speedupFactor: number

  /** Peak memory usage in bytes */
  peakMemoryUsage: number

  /** Average throughput (samples per second) */
  throughput: number

  /** Device utilization (0-1) */
  deviceUtilization: number
}
```

#### TextContextWindow

Context window for text sentiment analysis:

```typescript
interface TextContextWindow {
  /** Previous messages in conversation */
  previousMessages: Array<{
    text: string
    sentiment?: SentimentCategory
    speaker?: string
  }>

  /** Current speaker */
  speaker: string

  /** Conversation topic (if known) */
  topic?: string
}
```

---

## VAD Scoring Guide

### Understanding VAD Scores

VAD scores range from 0.0 to 1.0 for each dimension:

#### Valence (Positive ↔ Negative)

```typescript
// Very Positive (0.8-1.0)
"I love this! 😍"              // valence: 0.95
"This is amazing!"             // valence: 0.88
"Best day ever!"               // valence: 0.92

// Positive (0.6-0.8)
"This is great!"               // valence: 0.75
"I'm happy with this"          // valence: 0.68
"Pretty good"                  // valence: 0.62

// Neutral (0.4-0.6)
"It's okay"                    // valence: 0.50
"Whatever"                     // valence: 0.45
"Not bad"                      // valence: 0.55

// Negative (0.2-0.4)
"I'm not happy"                // valence: 0.35
"This isn't great"             // valence: 0.28
"Could be better"              // valence: 0.32

// Very Negative (0.0-0.2)
"I hate this!"                 // valence: 0.10
"This is terrible"             // valence: 0.15
"Absolutely awful"             // valence: 0.08
```

#### Arousal (Calm ↔ Excited)

```typescript
// Very High Energy (0.8-1.0)
"I'M SO EXCITED!!!"            // arousal: 0.95
"This is frustrating!!!"       // arousal: 0.88
"CAN'T BELIEVE THIS!"          // arousal: 0.92

// High Energy (0.6-0.8)
"This is great!"               // arousal: 0.70
"I'm so happy!"                // arousal: 0.75
"Feeling anxious"              // arousal: 0.68

// Medium Energy (0.4-0.6)
"How are you?"                 // arousal: 0.50
"It's fine"                    // arousal: 0.45
"I guess so"                   // arousal: 0.52

// Low Energy (0.2-0.4)
"I'm feeling calm"             // arousal: 0.30
"Just chilling"                // arousal: 0.25
"A bit tired"                  // arousal: 0.35

// Very Low Energy (0.0-0.2)
"Whatever..."                  // arousal: 0.10
"I don't care"                 // arousal: 0.15
"Bored"                        // arousal: 0.12
```

#### Dominance (Submissive ↔ Dominant)

```typescript
// Very Dominant (0.8-1.0)
"Do this NOW!"                 // dominance: 0.92
"You must do this"             // dominance: 0.85
"I demand an explanation"      // dominance: 0.88

// Dominant (0.6-0.8)
"I'm confident about this"     // dominance: 0.70
"This is what we'll do"        // dominance: 0.65
"I know what I'm doing"        // dominance: 0.72

// Neutral (0.4-0.6)
"Let's work together"          // dominance: 0.50
"What do you think?"           // dominance: 0.48
"We can decide together"       // dominance: 0.52

// Submissive (0.2-0.4)
"I'm not sure..."              // dominance: 0.30
"Maybe you're right"           // dominance: 0.35
"I don't know..."              // dominance: 0.28

// Very Submissive (0.0-0.2)
"Please help me..."            // dominance: 0.15
"I'll do whatever you want"    // dominance: 0.10
"I'm helpless"                 // dominance: 0.08
```

### Interpreting VAD Combinations

```typescript
// High Valence + High Arousal + High Dominance = EXCITED
{ valence: 0.85, arousal: 0.90, dominance: 0.70 }  // "I'm so pumped! 🎉"

// High Valence + Medium Arousal + Medium Dominance = HAPPY
{ valence: 0.75, arousal: 0.65, dominance: 0.60 }  // "This is great! 😊"

// High Valence + Low Arousal + Low Dominance = CALM
{ valence: 0.65, arousal: 0.20, dominance: 0.50 }  // "Everything is fine"

// Low Valence + Medium Arousal + Low Dominance = SAD
{ valence: 0.25, arousal: 0.45, dominance: 0.20 }  // "I'm feeling down 😢"

// Low Valence + High Arousal + High Dominance = ANGRY
{ valence: 0.20, arousal: 0.90, dominance: 0.80 }  // "This is terrible!"

// Medium Valence + High Arousal + Low Dominance = ANXIOUS
{ valence: 0.45, arousal: 0.85, dominance: 0.25 }  // "I'm worried about..."
```

---

## Real-Time Streaming

### Setting Up Real-Time Analysis

```typescript
import { createWebGPUSentimentAnalyzer } from '@superinstance/jepa-real-time-sentiment-analysis'

class RealTimeSentimentStream {
  private analyzer: WebGPUSentimentAnalyzer
  private messageBuffer: string[] = []
  private bufferTimer: NodeJS.Timeout | null = null

  async initialize() {
    this.analyzer = await createWebGPUSentimentAnalyzer({
      enableTimestamps: true,
      useMappedBuffers: true,
    })

    console.log('✅ Real-time sentiment stream ready')
    console.log(`   GPU: ${this.analyzer.isUsingGPU() ? 'enabled' : 'disabled'}`)
  }

  // Called for each incoming message
  async onMessage(text: string) {
    this.messageBuffer.push(text)

    // Process batch when buffer is full or timer expires
    if (this.messageBuffer.length >= 10) {
      await this.processBatch()
    } else {
      // Reset timer
      if (this.bufferTimer) clearTimeout(this.bufferTimer)
      this.bufferTimer = setTimeout(() => this.processBatch(), 100)  // 100ms timeout
    }
  }

  private async processBatch() {
    if (this.messageBuffer.length === 0) return

    const batch = [...this.messageBuffer]
    this.messageBuffer = []

    // GPU-accelerated batch processing
    const startTime = performance.now()
    const results = await this.analyzer.analyzeBatch(batch)
    const processingTime = performance.now() - startTime

    // Emit results in real-time
    for (let i = 0; i < results.length; i++) {
      this.emitSentiment(batch[i], results[i])
    }

    // Log performance
    const stats = this.analyzer.getPerformanceStats()
    console.log(`📊 Processed ${results.length} messages in ${processingTime.toFixed(2)}ms`)
    console.log(`   Throughput: ${stats.averageThroughput.toFixed(0)} msg/sec`)
  }

  private emitSentiment(text: string, result: WebGPUInferenceResult) {
    console.log(`[${result.sentiment}] ${(result.confidence * 100).toFixed(0)}%`)
    console.log(`   "${text.substring(0, 50)}..."`)

    if (result.performance) {
      console.log(`   GPU: ${result.performance.gpuExecutionTime.toFixed(2)}ms`)
      console.log(`   Speedup: ${result.performance.speedupFactor.toFixed(2)}x`)
    }
  }

  async cleanup() {
    if (this.bufferTimer) clearTimeout(this.bufferTimer)
    await this.analyzer.cleanup()
  }
}

// Usage
const stream = new RealTimeSentimentStream()
await stream.initialize()

// Simulate real-time messages
setInterval(() => {
  stream.onMessage(getRandomMessage())
}, 50)  // 20 messages per second
```

### Streaming at 60 FPS

```typescript
class FPS60SentimentAnalyzer {
  private analyzer: WebGPUSentimentAnalyzer
  private frameBudget = 16.67  // 60 FPS = 16.67ms per frame
  private processingFrame = false

  async initialize() {
    this.analyzer = await createWebGPUSentimentAnalyzer()
    console.log('🎯 Target: 60 FPS streaming')
  }

  async processFrame(messages: string[]): Promise<WebGPUInferenceResult[]> {
    if (this.processingFrame) {
      console.warn('⚠️ Frame overrun: previous frame still processing')
      return []
    }

    this.processingFrame = true
    const frameStart = performance.now()

    try {
      // Process all messages for this frame
      const results = await this.analyzer.analyzeBatch(messages)

      const frameTime = performance.now() - frameStart

      if (frameTime > this.frameBudget) {
        console.warn(`⚠️ Frame exceeded budget: ${frameTime.toFixed(2)}ms > ${this.frameBudget}ms`)
      } else {
        console.log(`✅ Frame: ${frameTime.toFixed(2)}ms (budget: ${this.frameBudget}ms)`)
      }

      return results
    } finally {
      this.processingFrame = false
    }
  }

  async cleanup() {
    await this.analyzer.cleanup()
  }
}
```

---

## Batch Processing

### CPU Batch Processing

```typescript
import { detectSentimentsBatch } from '@superinstance/jepa-real-time-sentiment-analysis'

// Process multiple messages (CPU-based)
const messages = [
  { speaker: 'Alice', text: "How are you?" },
  { speaker: 'Bob', text: "I'm doing great!" },
  { speaker: 'Alice', text: "That's wonderful!" },
  { speaker: 'Bob', text: "Thanks!" }
]

const results = detectSentimentsBatch(messages)

results.forEach((result, i) => {
  const msg = messages[i]
  console.log(`${msg.speaker}: ${result.sentiment}`)
  console.log(`  VAD: ${result.valence.toFixed(2)}V/${result.arousal.toFixed(2)}A/${result.dominance.toFixed(2)}D`)
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`)
})
```

### GPU Batch Processing

```typescript
import { createWebGPUSentimentAnalyzer } from '@superinstance/jepa-real-time-sentiment-analysis'

async function batchAnalyzeWithGPU(texts: string[]) {
  const analyzer = await createWebGPUSentimentAnalyzer()

  const startTime = performance.now()
  const results = await analyzer.analyzeBatch(texts)
  const totalTime = performance.now() - startTime

  console.log(`✅ Processed ${texts.length} messages in ${totalTime.toFixed(2)}ms`)
  console.log(`   Average: ${(totalTime / texts.length).toFixed(2)}ms per message`)
  console.log(`   Throughput: ${((texts.length / totalTime) * 1000).toFixed(0)} msg/sec`)

  // Get performance stats
  const stats = analyzer.getPerformanceStats()
  console.log(`   Average speedup: ${stats.averageSpeedup.toFixed(2)}x`)

  await analyzer.cleanup()

  return results
}

// Usage
const texts = Array(1000).fill(0).map((_, i) => `Message ${i}: ${getRandomSentiment()}`)
const results = await batchAnalyzeWithGPU(texts)
```

### Chunked Batch Processing

For very large batches, process in chunks:

```typescript
async function chunkedBatchAnalyze(texts: string[], chunkSize = 100) {
  const analyzer = await createWebGPUSentimentAnalyzer()
  const allResults: WebGPUInferenceResult[] = []

  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize)
    const results = await analyzer.analyzeBatch(chunk)
    allResults.push(...results)

    console.log(`✅ Processed chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(texts.length / chunkSize)}`)
  }

  await analyzer.cleanup()
  return allResults
}
```

---

## WebGPU Setup

### Checking WebGPU Availability

```typescript
import { isWebGPUAvailable } from '@superinstance/jepa-real-time-sentiment-analysis'

if (isWebGPUAvailable()) {
  console.log('✅ WebGPU is available')
} else {
  console.log('⚠️ WebGPU not available, will use CPU fallback')
}
```

### Creating GPU Analyzer

```typescript
import { createWebGPUSentimentAnalyzer } from '@superinstance/jepa-real-time-sentiment-analysis'

// Basic setup
const analyzer = await createWebGPUSentimentAnalyzer()

// With custom configuration
const analyzer = await createWebGPUSentimentAnalyzer({
  devicePreference: 'discrete-gpu',    // Prefer discrete GPU
  enableTimestamps: true,              // Track performance
  useMappedBuffers: true,              // Faster transfers
  maxBufferSize: 256 * 1024 * 1024     // 256MB buffer
})

// Check if GPU is being used
if (analyzer.isUsingGPU()) {
  console.log('✅ GPU acceleration enabled')

  const device = analyzer.getDeviceInfo()
  if (device) {
    console.log(`   GPU: ${device.vendor} ${device.adapter}`)
    console.log(`   Memory: ${(device.availableMemory / 1024 / 1024).toFixed(0)}MB`)
  }
} else {
  console.log('⚠️ Using CPU fallback')
}
```

### Monitoring Performance

```typescript
// Analyze some messages
await analyzer.analyze("This is great!")
await analyzer.analyzeBatch([...100 messages])

// Get performance statistics
const stats = analyzer.getPerformanceStats()

console.log('📊 Performance Statistics:')
console.log(`   Average speedup: ${stats.averageSpeedup.toFixed(2)}x`)
console.log(`   Average throughput: ${stats.averageThroughput.toFixed(0)} msg/sec`)
console.log(`   GPU utilization: ${(stats.gpuUtilizationRate * 100).toFixed(0)}%`)
console.log(`   Total inferences: ${stats.totalInferences}`)
```

### Cleanup

```typescript
// Always cleanup when done to free GPU resources
await analyzer.cleanup()

console.log('✅ GPU resources released')
```

---

## Custom Sentiment Patterns

### Extending Sentiment Patterns

```typescript
import { getSentimentPattern } from '@superinstance/jepa-real-time-sentiment-analysis'

// Get existing pattern
const excitedPattern = getSentimentPattern('excited')

console.log('Excited pattern:')
console.log('  Keywords:', excitedPattern.keywords)
console.log('  Emojis:', excitedPattern.emojis)
console.log('  VAD:', excitedPattern.vad)
```

### Adding Custom Patterns (Future Feature)

Note: Currently, JEPA uses built-in patterns. Custom pattern support is planned for future versions.

For now, you can post-process results to add custom logic:

```typescript
function customSentimentAnalysis(text: string) {
  // Get base sentiment
  const baseResult = detectSentiment(text)

  // Add custom logic
  if (text.includes('bug') || text.includes('error')) {
    // Custom: "bug report" sentiment
    return {
      ...baseResult,
      customType: 'bug-report',
      priority: 'high'
    }
  }

  if (text.includes('feature request') || text.includes('add')) {
    // Custom: "feature request" sentiment
    return {
      ...baseResult,
      customType: 'feature-request',
      priority: 'medium'
    }
  }

  return baseResult
}
```

---

## Integration Examples

### React Integration

```typescript
import React, { useState, useEffect } from 'react'
import { detectSentimentGPU, createWebGPUSentimentAnalyzer } from '@superinstance/jepa-real-time-sentiment-analysis'

function SentimentAnalyzer({ text }: { text: string }) {
  const [sentiment, setSentiment] = useState<WebGPUInferenceResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function analyze() {
      setLoading(true)
      const result = await detectSentimentGPU(text)
      setSentiment(result)
      setLoading(false)
    }

    if (text) {
      analyze()
    }
  }, [text])

  if (loading) return <div>Analyzing...</div>
  if (!sentiment) return <div>Enter text to analyze</div>

  return (
    <div>
      <h2>Sentiment: {sentiment.sentiment}</h2>
      <p>Valence: {sentiment.valence.toFixed(2)}</p>
      <p>Arousal: {sentiment.arousal.toFixed(2)}</p>
      <p>Dominance: {sentiment.dominance.toFixed(2)}</p>
      <p>Confidence: {(sentiment.confidence * 100).toFixed(0)}%</p>
      {sentiment.usedGPU && (
        <p>
          GPU: {sentiment.performance?.gpuExecutionTime.toFixed(2)}ms
          ({sentiment.performance?.speedupFactor.toFixed(2)}x faster)
        </p>
      )}
    </div>
  )
}

export default SentimentAnalyzer
```

### Vue Integration

```typescript
<template>
  <div>
    <div v-if="loading">Analyzing...</div>
    <div v-else-if="sentiment">
      <h2>Sentiment: {{ sentiment.sentiment }}</h2>
      <p>Valence: {{ sentiment.valence.toFixed(2) }}</p>
      <p>Arousal: {{ sentiment.arousal.toFixed(2) }}</p>
      <p>Confidence: {{ (sentiment.confidence * 100).toFixed(0) }}%</p>
      <p v-if="sentiment.usedGPU">
        GPU: {{ sentiment.performance?.gpuExecutionTime.toFixed(2) }}ms
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { detectSentimentGPU } from '@superinstance/jepa-real-time-sentiment-analysis'

const props = defineProps<{
  text: string
}>()

const sentiment = ref<WebGPUInferenceResult | null>(null)
const loading = ref(false)

watch(() => props.text, async (newText) => {
  if (newText) {
    loading.value = true
    sentiment.value = await detectSentimentGPU(newText)
    loading.value = false
  }
})
</script>
```

### Node.js Integration

```typescript
import { detectSentiment, detectSentimentsBatch } from '@superinstance/jepa-real-time-sentiment-analysis'

// Analyze customer feedback
async function analyzeFeedback(feedback: string[]) {
  console.log('Analyzing customer feedback...')

  const results = detectSentimentsBatch(feedback.map(f => ({ text: f })))

  // Calculate metrics
  const avgValence = results.reduce((sum, r) => sum + r.valence, 0) / results.length
  const positiveCount = results.filter(r => r.valence > 0.6).length
  const negativeCount = results.filter(r => r.valence < 0.4).length

  console.log(`\n📊 Sentiment Analysis Results:`)
  console.log(`   Total: ${results.length}`)
  console.log(`   Positive: ${positiveCount} (${(positiveCount / results.length * 100).toFixed(0)}%)`)
  console.log(`   Negative: ${negativeCount} (${(negativeCount / results.length * 100).toFixed(0)}%)`)
  console.log(`   Average Valence: ${avgValence.toFixed(2)}`)

  // Group by sentiment
  const bySentiment = results.reduce((groups, r) => {
    if (!groups[r.sentiment]) groups[r.sentiment] = 0
    groups[r.sentiment]++
    return groups
  }, {} as Record<string, number>)

  console.log(`\n📈 Sentiment Distribution:`)
  Object.entries(bySentiment)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sentiment, count]) => {
      console.log(`   ${sentiment}: ${count} (${(count / results.length * 100).toFixed(0)}%)`)
    })

  return results
}

// Usage
const feedback = [
  "Great product! Love it!",
  "Not happy with this...",
  "Absolutely amazing!",
  "Could be better",
  "Best purchase ever!"
]

await analyzeFeedback(feedback)
```

### Chat Application Integration

```typescript
import { createWebGPUSentimentAnalyzer } from '@superinstance/jepa-real-time-sentiment-analysis'

class ChatSentimentMonitor {
  private analyzer: WebGPUSentimentAnalyzer

  async initialize() {
    this.analyzer = await createWebGPUSentimentAnalyzer()
    console.log('✅ Chat sentiment monitor ready')
  }

  async onMessage(message: { text: string; sender: string }) {
    const result = await this.analyzer.analyze(message.text)

    // Log sentiment
    console.log(`[${message.sender}] ${result.sentiment}`)

    // Alert on frustrated users
    if (result.sentiment === 'angry' && result.confidence > 0.8) {
      console.warn('⚠️ Frustrated user detected!')
      await this.notifySupport({
        user: message.sender,
        message: message.text,
        sentiment: result.sentiment,
        urgency: 'high'
      })
    }

    // Track sentiment over time
    await this.trackSentiment(message.sender, result)

    return result
  }

  private async notifySupport(alert: any) {
    // Send alert to support team
    console.log('🚨 Sending alert to support:', alert)
  }

  private async trackSentiment(user: string, sentiment: WebGPUInferenceResult) {
    // Store sentiment for analytics
    console.log(`📊 Tracking sentiment for ${user}:`, sentiment.sentiment)
  }

  async cleanup() {
    await this.analyzer.cleanup()
  }
}
```

---

## Best Practices

### 1. Always Check Confidence Scores

```typescript
const result = detectSentiment(text)

// Only trust high-confidence detections
if (result.confidence > 0.8) {
  // Take action based on sentiment
  actOnSentiment(result)
} else if (result.confidence > 0.6) {
  // Use with caution
  flagForReview(result)
} else {
  // Low confidence - don't rely on it
  logLowConfidence(result)
}
```

### 2. Handle Edge Cases

```typescript
function robustSentimentAnalysis(text: string) {
  // Handle empty text
  if (!text || text.trim().length === 0) {
    return { error: 'Empty text' }
  }

  // Handle very short text
  if (text.length < 3) {
    console.warn('Text too short for reliable sentiment detection')
  }

  const result = detectSentiment(text)

  // Handle low confidence
  if (result.confidence < 0.5) {
    console.warn('Low confidence detection:', result.confidence)
  }

  // Handle mixed emotions
  if (result.secondarySentiments && result.secondarySentiments.length > 0) {
    console.log('Mixed emotions detected')
    console.log('Primary:', result.sentiment)
    console.log('Secondary:', result.secondarySentiments.map(s => s.sentiment).join(', '))
  }

  return result
}
```

### 3. Use Conversation Context

```typescript
function analyzeWithContext(
  currentMessage: string,
  conversationHistory: Array<{ text: string; speaker: string }>
) {
  const context = {
    previousMessages: conversationHistory.slice(-5).map(msg => ({
      text: msg.text,
      speaker: msg.speaker
    })),
    speaker: 'user',
    topic: 'general'
  }

  return detectSentiment(currentMessage, context)
}
```

### 4. Optimize Batch Sizes

```typescript
// Optimal batch sizes for GPU processing
const BATCH_SIZES = {
  small: 10,    // For low-latency
  medium: 50,   // Balanced
  large: 100,   // For throughput
  xlarge: 1000  // Maximum throughput
}

async function optimizedBatchProcessing(texts: string[]) {
  const analyzer = await createWebGPUSentimentAnalyzer()

  // Choose batch size based on input
  const batchSize = texts.length < 50 ? BATCH_SIZES.small :
                    texts.length < 500 ? BATCH_SIZES.medium :
                    texts.length < 5000 ? BATCH_SIZES.large :
                    BATCH_SIZES.xlarge

  const results: WebGPUInferenceResult[] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize)
    const chunkResults = await analyzer.analyzeBatch(chunk)
    results.push(...chunkResults)
  }

  await analyzer.cleanup()
  return results
}
```

### 5. Monitor Performance

```typescript
class PerformanceMonitoredAnalyzer {
  private analyzer: WebGPUSentimentAnalyzer
  private metrics = {
    totalAnalyses: 0,
    totalTime: 0,
    slowAnalyses: 0
  }

  async analyze(text: string) {
    const start = performance.now()
    const result = await this.analyzer.analyze(text)
    const duration = performance.now() - start

    this.metrics.totalAnalyses++
    this.metrics.totalTime += duration

    if (duration > 5) {
      this.metrics.slowAnalyses++
      console.warn(`⚠️ Slow analysis: ${duration.toFixed(2)}ms`)
    }

    return result
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageTime: this.metrics.totalTime / this.metrics.totalAnalyses,
      slowRate: this.metrics.slowAnalyses / this.metrics.totalAnalyses
    }
  }
}
```

---

## Performance Optimization

### 1. Use WebGPU for Large Batches

```typescript
// ❌ Slow: CPU for large batches
const results = texts.map(t => detectSentiment(t))  // 150ms for 100 texts

// ✅ Fast: GPU for large batches
const analyzer = await createWebGPUSentimentAnalyzer()
const results = await analyzer.analyzeBatch(texts)  // 30ms for 100 texts (5x faster)
```

### 2. Reuse Analyzer Instances

```typescript
// ❌ Bad: Creating new analyzer each time
async function analyze1(text: string) {
  const analyzer = await createWebGPUSentimentAnalyzer()
  const result = await analyzer.analyze(text)
  await analyzer.cleanup()
  return result
}

// ✅ Good: Reuse analyzer
const analyzer = await createWebGPUSentimentAnalyzer()

async function analyze2(text: string) {
  return await analyzer.analyze(text)
}

// Cleanup at the end
await analyzer.cleanup()
```

### 3. Batch Similar Operations

```typescript
// ❌ Bad: Analyzing one by one
for (const text of texts) {
  const result = await analyzer.analyze(text)
  // Process result
}

// ✅ Good: Batch process
const results = await analyzer.analyzeBatch(texts)
for (const result of results) {
  // Process result
}
```

### 4. Enable Performance Monitoring

```typescript
const analyzer = await createWebGPUSentimentAnalyzer({
  enableTimestamps: true  // Enable performance tracking
})

// Get performance stats periodically
setInterval(() => {
  const stats = analyzer.getPerformanceStats()
  console.log('Performance:', stats)
}, 10000)  // Every 10 seconds
```

---

## Testing

### Unit Tests

```typescript
import { detectSentiment, isPositiveSentiment } from '@superinstance/jepa-real-time-sentiment-analysis'

describe('Sentiment Analysis', () => {
  test('detects positive sentiment', () => {
    const result = detectSentiment("I'm so happy! 😊")
    expect(isPositiveSentiment(result.sentiment)).toBe(true)
    expect(result.valence).toBeGreaterThan(0.6)
  })

  test('detects negative sentiment', () => {
    const result = detectSentiment("This is terrible 😠")
    expect(isPositiveSentiment(result.sentiment)).toBe(false)
    expect(result.valence).toBeLessThan(0.4)
  })

  test('detects high arousal', () => {
    const result = detectSentiment("I'M SO EXCITED!!!")
    expect(result.arousal).toBeGreaterThan(0.7)
  })

  test('provides confidence score', () => {
    const result = detectSentiment("This is clearly amazing!")
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })
})
```

### Integration Tests

```typescript
import { createWebGPUSentimentAnalyzer } from '@superinstance/jepa-real-time-sentiment-analysis'

describe('WebGPU Sentiment Analysis', () => {
  test('initializes analyzer', async () => {
    const analyzer = await createWebGPUSentimentAnalyzer()
    expect(analyzer).toBeDefined()

    if (analyzer.isUsingGPU()) {
      const device = analyzer.getDeviceInfo()
      expect(device).toBeDefined()
    }

    await analyzer.cleanup()
  })

  test('analyzes batch of messages', async () => {
    const analyzer = await createWebGPUSentimentAnalyzer()
    const texts = ["Great!", "Terrible...", "Okay"]
    const results = await analyzer.analyzeBatch(texts)

    expect(results).toHaveLength(3)
    expect(results[0].sentiment).toBeDefined()
    expect(results[1].sentiment).toBeDefined()
    expect(results[2].sentiment).toBeDefined()

    await analyzer.cleanup()
  })
})
```

---

## Troubleshooting

### Common Issues

#### Issue: "WebGPU not available"

**Solution:** This is normal on browsers without WebGPU support. JEPA automatically falls back to CPU.

```typescript
if (!isWebGPUAvailable()) {
  console.log('Using CPU fallback (WebGPU not available)')
}

// JEPA works fine with CPU!
const result = detectSentiment("This is great!")
```

#### Issue: Low confidence scores

**Cause:** Very short text or ambiguous language

**Solution:**
```typescript
if (result.confidence < 0.6) {
  console.warn('Low confidence - consider flagging for review')
  // Don't take automated action
  flagForManualReview(result)
}
```

#### Issue: Slow performance

**Solution:** Use WebGPU for better performance

```typescript
// Check if WebGPU is available
if (isWebGPUAvailable()) {
  // Use GPU for faster processing
  const analyzer = await createWebGPUSentimentAnalyzer()
  const results = await analyzer.analyzeBatch(texts)
  await analyzer.cleanup()
} else {
  // CPU is slower but still works
  const results = detectSentimentsBatch(texts)
}
```

#### Issue: Memory leaks

**Solution:** Always cleanup analyzer instances

```typescript
// ❌ Bad: No cleanup
const analyzer = await createWebGPUSentimentAnalyzer()
const results = await analyzer.analyzeBatch(texts)

// ✅ Good: Proper cleanup
const analyzer = await createWebGPUSentimentAnalyzer()
const results = await analyzer.analyzeBatch(texts)
await analyzer.cleanup()  // Always cleanup!
```

---

## Next Steps

- **Explore [examples](../examples/)** for real-world integrations
- **Read the [User Guide](./USER_GUIDE.md)** for use cases
- **Check the [Architecture Guide](./ARCHITECTURE.md)** for technical details
- **Visit [GitHub](https://github.com/SuperInstance/JEPA-Real-Time-Sentiment-Analysis)** for issues and discussions

---

*Last Updated: 2026-01-08*
*Developer Guide Version: 1.0.0*
