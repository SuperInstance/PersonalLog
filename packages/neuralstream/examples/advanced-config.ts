/**
 * Advanced Configuration Example
 *
 * Demonstrates advanced features and configuration options.
 */

import { NeuralStream, InferenceStrategy, DeviceType } from '@superinstance/neuralstream';

async function advancedExample() {
  // 1. Hardware Detection
  const capabilities = await NeuralStream.detectHardware();
  console.log('Hardware Capabilities:', capabilities);

  if (!capabilities.webGPUSupported) {
    console.error('WebGPU not supported. Please use Chrome 113+ or Edge 113+');
    return;
  }

  console.log(`\nGPU: ${capabilities.adapter?.description}`);
  console.log(`Max Model Size: ${(capabilities.maxModelSize / 1e9).toFixed(2)} GB`);

  // 2. Initialize with advanced config
  const stream = await NeuralStream.create({
    modelPath: '/models/llama-7b-quantized.gguf',

    // Device configuration
    device: capabilities.recommendedDevice,

    // Generation parameters
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,

    // Inference strategy
    strategy: InferenceStrategy.SPECULATIVE,
    speculativeDecoding: true,
    speculativeTokens: 4,

    // Performance optimization
    enableKVCache: true,
    batchSize: 8,
    progressiveRefinement: true,

    // Target performance
    targetFPS: 60,
    memoryBudget: capabilities.maxModelSize * 0.8, // Use 80% of available memory

    // Monitoring
    enableMonitoring: true,
    logLevel: 'info'
  });

  // 3. Get model information
  const modelInfo = stream.getModelInfo();
  console.log('\nModel Information:');
  console.log(`Name: ${modelInfo.name}`);
  console.log(`Parameters: ${modelInfo.parameterCount}`);
  console.log(`Layers: ${modelInfo.numLayers}`);
  console.log(`Attention Heads: ${modelInfo.numAttentionHeads}`);
  console.log(`Context Length: ${modelInfo.contextLength}`);
  console.log(`Quantization: ${modelInfo.quantization}`);

  // 4. Monitor generation in real-time
  console.log('\nStarting generation...\n');

  const tokenStream = stream.stream('Write a short story about AI');

  // Update loop for monitoring
  const monitorInterval = setInterval(() => {
    const progress = tokenStream.getProgress();
    const fps = progress.currentFPS;
    const tokens = progress.tokensGenerated;

    process.stdout.write(`\r[FPS: ${fps.toFixed(1)} | Tokens: ${tokens}]`);
  }, 100);

  // Generate tokens
  let fullResponse = '';
  for await (const token of tokenStream) {
    fullResponse += token.token;
    process.stdout.write(token.token);

    if (token.isDone) {
      clearInterval(monitorInterval);
      console.log('\n\nGeneration complete!');
      break;
    }
  }

  // 5. Analyze performance
  const metrics = stream.getMetrics();
  console.log('\nPerformance Metrics:');
  console.log(`─`.repeat(50));
  console.log(`Total Tokens: ${metrics.totalTokens}`);
  console.log(`Time to First Token: ${metrics.timeToFirstToken}ms`);
  console.log(`Avg Time/Token: ${metrics.avgTimePerToken.toFixed(2)}ms`);
  console.log(`Throughput: ${metrics.tokensPerSecond.toFixed(2)} tokens/sec`);
  console.log(`Peak Memory: ${(metrics.peakMemoryUsage / 1e9).toFixed(2)} GB`);
  console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`Speculative Success: ${(metrics.speculativeSuccessRate * 100).toFixed(1)}%`);

  // 6. Dynamic configuration update
  console.log('\nUpdating configuration for faster generation...');
  stream.updateConfig({
    temperature: 0.5,
    topP: 0.8,
    strategy: InferenceStrategy.GREEDY
  });

  // Generate again with new config
  console.log('\nSecond generation with new config:\n');
  for await (const token of stream.generate('Summarize in one sentence')) {
    process.stdout.write(token.token);
    if (token.isDone) break;
  }

  // Clean up
  await stream.dispose();
  console.log('\n\nResources disposed');
}

// Run example
advancedExample().catch(console.error);
