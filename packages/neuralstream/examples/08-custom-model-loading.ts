/**
 * Example 8: Custom Model Loading
 *
 * Demonstrates loading and using custom-trained models.
 * Support for various model formats and architectures.
 *
 * SEO Keywords:
 * - custom LLM loading
 * - fine-tuned model browser
 * - WebGPU custom models
 * - local model deployment
 * - model inference
 */

async function customModelLoading() {
  // Load custom fine-tuned model
  const customModel = await NeuralStream.loadModel({
    url: './models/my-custom-model.gguf',
    type: 'GGUF',
    architecture: 'llama-2-7b',
  });

  // Initialize with custom model
  const generator = await NeuralStream.init({
    model: customModel,
    quantization: 'int8', // Use INT8 quantization
  });

  // Use custom model
  const response = await generator.generate(
    'Custom model specialized task'
  );

  console.log('Response:', response);

  // Load multiple models
  const models = await Promise.all([
    NeuralStream.loadModel({ url: './models/model1.gguf' }),
    NeuralStream.loadModel({ url: './models/model2.gguf' }),
  ]);

  // Switch between models
  const generator1 = await NeuralStream.init({ model: models[0] });
  const generator2 = await NeuralStream.init({ model: models[1] });
}

// Key features:
// - Custom model loading
// - Multiple format support (GGUF, ONNX, etc.)
// - Quantization options
// - Model switching
// - Fine-tuned model support
