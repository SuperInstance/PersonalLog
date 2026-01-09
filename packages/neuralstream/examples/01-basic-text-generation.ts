/**
 * Example 1: Basic Text Generation
 *
 * Demonstrates simple text generation using WebGPU-accelerated LLM inference.
 * This is the "Hello World" of browser LLM inference.
 *
 * SEO Keywords:
 * - browser LLM text generation
 * - WebGPU inference
 * - local AI generation
 * - offline text generation
 * - 60 FPS generation
 */

// Example usage (conceptual API)
async function basicTextGeneration() {
  // Initialize NeuralStream with WebGPU
  const neuralStream = await NeuralStream.init({
    model: 'llm-model',
    device: await navigator.gpu.requestAdapter(),
  });

  // Generate text from prompt
  const prompt = 'The future of AI is';
  const response = await neuralStream.generate(prompt, {
    maxTokens: 50,
    temperature: 0.7,
  });

  console.log('Generated text:', response.text);
  // Output: "The future of AI is incredibly promising, with advances in..."
}

// Key features demonstrated:
// - WebGPU initialization
// - Basic text generation
// - Configurable parameters (maxTokens, temperature)
// - Simple API for easy integration
