/**
 * Example 9: Performance Tuning
 *
 * Demonstrates optimizing performance for different use cases.
 * Balance between speed, quality, and resource usage.
 *
 * SEO Keywords:
 * - LLM performance optimization
 * - browser AI speed
 * - WebGPU tuning
 * - inference optimization
 * - 60 FPS generation
 */

async function performanceTuning() {
  // High performance mode (speed priority)
  const fastModel = await NeuralStream.init({
    model: 'fast-model',
    quantization: 'int4', // Aggressive quantization
    maxTokens: 50,
    temperature: 0.5,
  });

  // High quality mode (accuracy priority)
  const qualityModel = await NeuralStream.init({
    model: 'quality-model',
    quantization: 'fp16', // Higher precision
    maxTokens: 200,
    temperature: 0.8,
  });

  // Balanced mode
  const balancedModel = await NeuralStream.init({
    model: 'balanced-model',
    quantization: 'int8',
    maxTokens: 100,
    temperature: 0.7,
  });

  // Benchmark
  const results = await NeuralStream.benchmark({
    prompt: 'Test prompt',
    iterations: 100,
    metrics: ['latency', 'throughput', 'memory'],
  });

  console.log('Benchmark results:', results);
  // {
  //   avgLatency: 15.2, // ms (60 FPS = 16.67ms)
  //   throughput: 65.8, // tokens/second
  //   memory: 450, // MB
  // }
}

// Key features:
// - Performance modes
// - Quantization options
// - Benchmarking tools
// - Memory profiling
// - Latency optimization
