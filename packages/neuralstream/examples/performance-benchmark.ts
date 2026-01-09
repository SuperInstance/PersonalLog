/**
 * Performance Benchmark Example
 *
 * Comprehensive benchmarking of NeuralStream performance.
 */

import { NeuralStream, InferenceStrategy } from '@superinstance/neuralstream';

interface BenchmarkResult {
  name: string;
  tokens: number;
  totalTime: number;
  timeToFirstToken: number;
  avgTimePerToken: number;
  tokensPerSecond: number;
  peakMemory: number;
  cacheHitRate: number;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  async runBenchmark(name: string, config: any, prompt: string): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Benchmark: ${name}`);
    console.log(`${'='.repeat(60)}\n`);

    const stream = await NeuralStream.create(config);

    // Warm-up run
    console.log('Warm-up run...');
    for await (const token of stream.generate('Hello')) {
      if (token.isDone) break;
    }

    // Actual benchmark
    console.log('Starting benchmark...\n');
    let response = '';
    let tokenCount = 0;

    const startTime = performance.now();
    let firstTokenTime = 0;
    let firstTokenReceived = false;

    for await (const token of stream.generate(prompt)) {
      if (!firstTokenReceived) {
        firstTokenTime = performance.now() - startTime;
        firstTokenReceived = true;
      }

      response += token.token;
      tokenCount = token.position;

      if (token.isDone) break;
    }

    const totalTime = performance.now() - startTime;
    const metrics = stream.getMetrics();

    const result: BenchmarkResult = {
      name,
      tokens: tokenCount,
      totalTime,
      timeToFirstToken: metrics.timeToFirstToken,
      avgTimePerToken: metrics.avgTimePerToken,
      tokensPerSecond: metrics.tokensPerSecond,
      peakMemory: metrics.peakMemoryUsage,
      cacheHitRate: metrics.cacheHitRate
    };

    this.results.push(result);

    // Print results
    console.log('\nResults:');
    console.log(`─`.repeat(60));
    console.log(`Total Tokens:        ${result.tokens}`);
    console.log(`Total Time:          ${result.totalTime.toFixed(2)}ms`);
    console.log(`Time to First Token: ${result.timeToFirstToken.toFixed(2)}ms`);
    console.log(`Avg Time/Token:      ${result.avgTimePerToken.toFixed(2)}ms`);
    console.log(`Tokens/Second:       ${result.tokensPerSecond.toFixed(2)}`);
    console.log(`Peak Memory:         ${(result.peakMemory / 1e9).toFixed(2)} GB`);
    console.log(`Cache Hit Rate:      ${(result.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`─`.repeat(60));

    await stream.dispose();
  }

  compareResults(): void {
    console.log('\n\n' + '='.repeat(60));
    console.log('BENCHMARK COMPARISON');
    console.log('='.repeat(60) + '\n');

    console.table(this.results);

    // Find best performance
    const bestThroughput = this.results.reduce((best, curr) =>
      curr.tokensPerSecond > best.tokensPerSecond ? curr : best
    );

    const bestLatency = this.results.reduce((best, curr) =>
      curr.timeToFirstToken < best.timeToFirstToken ? curr : best
    );

    console.log('\nBest Throughput:', bestThroughput.name);
    console.log(`  ${bestThroughput.tokensPerSecond.toFixed(2)} tokens/sec`);

    console.log('\nBest Latency:', bestLatency.name);
    console.log(`  ${bestLatency.timeToFirstToken.toFixed(2)}ms to first token`);
  }
}

async function runBenchmarks() {
  const benchmark = new PerformanceBenchmark();

  // Benchmark 1: Greedy decoding
  await benchmark.runBenchmark(
    'Greedy Decoding',
    {
      modelPath: '/models/llama-7b-quantized.gguf',
      maxTokens: 512,
      strategy: InferenceStrategy.GREEDY,
      temperature: 0.0
    },
    'Explain the theory of relativity in simple terms'
  );

  // Benchmark 2: Speculative decoding
  await benchmark.runBenchmark(
    'Speculative Decoding (4 tokens)',
    {
      modelPath: '/models/llama-7b-quantized.gguf',
      maxTokens: 512,
      strategy: InferenceStrategy.SPECULATIVE,
      speculativeDecoding: true,
      speculativeTokens: 4
    },
    'Explain the theory of relativity in simple terms'
  );

  // Benchmark 3: Nucleus sampling
  await benchmark.runBenchmark(
    'Nucleus Sampling (top-p=0.9)',
    {
      modelPath: '/models/llama-7b-quantized.gguf',
      maxTokens: 512,
      strategy: InferenceStrategy.NUCLEUS,
      temperature: 0.7,
      topP: 0.9
    },
    'Explain the theory of relativity in simple terms'
  );

  // Benchmark 4: Beam search
  await benchmark.runBenchmark(
    'Beam Search (4 beams)',
    {
      modelPath: '/models/llama-7b-quantized.gguf',
      maxTokens: 512,
      strategy: InferenceStrategy.BEAM_SEARCH,
      numBeams: 4
    },
    'Explain the theory of relativity in simple terms'
  );

  // Compare all results
  benchmark.compareResults();
}

// Run benchmarks
runBenchmarks().catch(console.error);
