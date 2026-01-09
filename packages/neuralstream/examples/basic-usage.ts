/**
 * Basic Usage Example
 *
 * Simple example of generating text with NeuralStream.
 */

import { NeuralStream } from '@superinstance/neuralstream';

async function basicExample() {
  // Initialize NeuralStream
  const stream = await NeuralStream.create({
    modelPath: '/models/llama-7b-quantized.gguf',
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    device: 'auto' // Auto-detect GPU/CPU
  });

  // Generate text from prompt
  const prompt = 'Explain quantum computing in simple terms';

  console.log('Prompt:', prompt);
  console.log('Response:');

  let response = '';

  // Stream tokens at 60 FPS
  for await (const token of stream.generate(prompt)) {
    process.stdout.write(token.token);
    response += token.token;

    if (token.isDone) {
      console.log('\n\nGeneration complete!');
      console.log(`Generated ${token.position} tokens`);
      console.log(`Time to first token: ${stream.getMetrics().timeToFirstToken}ms`);
      console.log(`Average: ${stream.getMetrics().avgTimePerToken.toFixed(2)}ms per token`);
      console.log(`FPS: ${stream.getMetrics().tokensPerSecond.toFixed(2)}`);
      break;
    }
  }

  // Clean up
  await stream.dispose();
}

// Run example
basicExample().catch(console.error);
