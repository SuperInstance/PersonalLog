/**
 * WebGPU Quick Start Example
 *
 * This example demonstrates how to use WebGPU-accelerated sentiment analysis
 * for high-performance emotion detection in the browser.
 */

import {
  detectSentimentGPU,
  isWebGPUAvailable,
  createWebGPUSentimentAnalyzer,
} from '@superinstance/jepa-real-time-sentiment-analysis'

// ============================================================================
// EXAMPLE 1: Quick GPU-Accelerated Analysis
// ============================================================================

async function quickGPUAnalysis() {
  console.log('=== Quick GPU-Accelerated Sentiment Analysis ===\n')

  // Check if WebGPU is available
  if (!isWebGPUAvailable()) {
    console.log('⚠️  WebGPU is not available in this browser')
    console.log('The library will automatically fall back to CPU-based analysis\n')
  } else {
    console.log('✅ WebGPU is available! GPU acceleration will be used.\n')
  }

  // Analyze sentiment with GPU acceleration
  const result = await detectSentimentGPU(
    "I'm so excited about this project! This is going to be amazing! 🚀"
  )

  console.log('Text: "I\'m so excited about this project! This is going to be amazing! 🚀"')
  console.log(`Sentiment: ${result.sentiment}`)
  console.log(`Valence: ${result.valence.toFixed(2)}`)
  console.log(`Arousal: ${result.arousal.toFixed(2)}`)
  console.log(`Dominance: ${result.dominance.toFixed(2)}`)
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`)

  // Performance metrics
  if (result.performance) {
    console.log('\n--- Performance Metrics ---')
    console.log(`Used GPU: ${result.usedGPU ? '✅ Yes' : '❌ No (CPU fallback)'}`)

    if (result.usedGPU && result.deviceInfo) {
      console.log(`GPU Device: ${result.deviceInfo.vendor} ${result.deviceInfo.adapter}`)
    }

    console.log(`GPU Execution Time: ${result.performance.gpuExecutionTime.toFixed(2)}ms`)
    console.log(`CPU Execution Time: ${result.performance.cpuExecutionTime.toFixed(2)}ms`)
    console.log(`Total Time: ${(result.performance.gpuExecutionTime + result.performance.cpuExecutionTime).toFixed(2)}ms`)
    console.log(`Speedup Factor: ${result.performance.speedupFactor.toFixed(2)}x`)
    console.log(`Throughput: ${result.performance.throughput.toFixed(0)} samples/sec`)
  }

  console.log('\nEvidence:', result.evidence.join(', '))
}

// ============================================================================
// EXAMPLE 2: Batch Processing with GPU
// ============================================================================

async function batchGPUProcessing() {
  console.log('\n\n=== Batch GPU Processing ===\n')

  // Create analyzer instance for better performance with multiple texts
  const analyzer = await createWebGPUSentimentAnalyzer({
    enableTimestamps: true,
    useMappedBuffers: true,
  })

  const messages = [
    "This is absolutely fantastic! I love it! 😍",
    "I'm really worried about the deadline...",
    "Pretty good, just finishing up some tasks",
    "This makes me so angry!!! 😡",
    "Feeling calm and relaxed today 😌",
  ]

  console.log(`Processing ${messages.length} messages in parallel...\n`)

  const startTime = performance.now()

  // Process all messages in parallel
  const results = await analyzer.analyzeBatch(messages)

  const totalTime = performance.now() - startTime

  // Display results
  results.forEach((result, i) => {
    console.log(`${i + 1}. "${messages[i]}"`)
    console.log(`   → ${result.sentiment} (${(result.confidence * 100).toFixed(0)}% confidence)`)
  })

  console.log(`\nTotal time: ${totalTime.toFixed(2)}ms`)
  console.log(`Average time per message: ${(totalTime / messages.length).toFixed(2)}ms`)

  // Get overall performance statistics
  const stats = analyzer.getPerformanceStats()
  console.log('\n--- Overall Statistics ---')
  console.log(`Total inferences: ${stats.totalInferences}`)
  console.log(`Average speedup: ${stats.averageSpeedup.toFixed(2)}x`)
  console.log(`GPU utilization: ${(stats.gpuUtilizationRate * 100).toFixed(0)}%`)
  console.log(`Average throughput: ${stats.averageThroughput.toFixed(0)} samples/sec`)

  // Cleanup
  await analyzer.cleanup()
}

// ============================================================================
// EXAMPLE 3: GPU vs CPU Comparison
// ============================================================================

async function compareGPUvsCPU() {
  console.log('\n\n=== GPU vs CPU Performance Comparison ===\n')

  const testMessages = [
    "I'm so happy and excited! 🎉",
    "This is really frustrating and annoying",
    "Just a neutral message here",
    "Feeling anxious about the presentation",
    "Absolutely thrilled with the results!",
  ]

  // Test with GPU
  console.log('Testing with GPU acceleration...')
  const gpuAnalyzer = await createWebGPUSentimentAnalyzer()

  const gpuStart = performance.now()
  const gpuResults = await gpuAnalyzer.analyzeBatch(testMessages)
  const gpuTime = performance.now() - gpuStart

  // Test with CPU (force fallback)
  console.log('Testing with CPU (forced fallback)...')
  const cpuAnalyzer = await createWebGPUSentimentAnalyzer({
    forceCPUFallback: true,
  })

  const cpuStart = performance.now()
  const cpuResults = await cpuAnalyzer.analyzeBatch(testMessages)
  const cpuTime = performance.now() - cpuStart

  // Display comparison
  console.log('\n--- Performance Comparison ---')
  console.log(`GPU Total Time: ${gpuTime.toFixed(2)}ms`)
  console.log(`CPU Total Time: ${cpuTime.toFixed(2)}ms`)
  console.log(`Speedup: ${(cpuTime / gpuTime).toFixed(2)}x faster`)
  console.log(`Time saved per message: ${((cpuTime - gpuTime) / testMessages.length).toFixed(2)}ms`)

  console.log('\n--- Results Verification ---')
  console.log('Both methods should produce identical sentiment classifications:')
  testMessages.forEach((msg, i) => {
    const gpuResult = gpuResults[i]
    const cpuResult = cpuResults[i]
    const match = gpuResult.sentiment === cpuResult.sentiment ? '✅' : '❌'
    console.log(`${match} "${msg}": GPU=${gpuResult.sentiment}, CPU=${cpuResult.sentiment}`)
  })

  // Cleanup
  await gpuAnalyzer.cleanup()
  await cpuAnalyzer.cleanup()
}

// ============================================================================
// EXAMPLE 4: Real-Time Streaming Analysis
// ============================================================================

async function realTimeStreaming() {
  console.log('\n\n=== Real-Time Streaming Analysis ===\n')

  const analyzer = await createWebGPUSentimentAnalyzer({
    enableTimestamps: true,
  })

  // Simulate real-time message stream
  const messageStream = [
    { time: 0, text: "Hey, how's it going?" },
    { time: 500, text: "Pretty good! Working on a cool project 🚀" },
    { time: 1000, text: "That's awesome! What kind of project?" },
    { time: 1500, text: "Building a sentiment analyzer with WebGPU!" },
    { time: 2000, text: "Wow, that sounds really exciting!" },
    { time: 2500, text: "Yeah! It's 5-10x faster than CPU-based analysis" },
    { time: 3000, text: "Incredible! Keep up the great work! 💪" },
  ]

  console.log('Processing message stream in real-time...\n')

  for (const message of messageStream) {
    const result = await analyzer.analyze(message.text)

    console.log(`[+${message.time}ms] "${message.text}"`)
    console.log(`           → ${result.sentiment} (V:${result.valence.toFixed(2)} A:${result.arousal.toFixed(2)})`)

    if (result.performance && result.usedGPU) {
      console.log(`           → GPU: ${result.performance.gpuExecutionTime.toFixed(2)}ms`)
    }
  }

  // Get streaming statistics
  const stats = analyzer.getPerformanceStats()
  console.log('\n--- Stream Statistics ---')
  console.log(`Total messages: ${stats.totalInferences}`)
  console.log(`Average throughput: ${stats.averageThroughput.toFixed(0)} msg/sec`)
  console.log(`GPU utilization: ${(stats.gpuUtilizationRate * 100).toFixed(0)}%`)

  await analyzer.cleanup()
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function main() {
  try {
    await quickGPUAnalysis()
    await batchGPUProcessing()
    await compareGPUvsCPU()
    await realTimeStreaming()

    console.log('\n\n✅ All examples completed successfully!')
  } catch (error) {
    console.error('Error running examples:', error)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}
