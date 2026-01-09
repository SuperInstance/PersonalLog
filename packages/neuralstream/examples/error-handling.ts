/**
 * Error Handling Example
 *
 * Demonstrates proper error handling and recovery.
 */

import {
  NeuralStream,
  NeuralStreamError,
  ErrorCode,
  InferenceStrategy
} from '@superinstance/neuralstream';

async function errorHandlingExample() {
  try {
    // 1. Check WebGPU support
    const capabilities = await NeuralStream.detectHardware();

    if (!capabilities.webGPUSupported) {
      console.error('WebGPU not supported!');
      console.log('Please use:');
      console.log('  - Chrome 113+');
      console.log('  - Edge 113+');
      console.log('  - Firefox Nightly');
      return;
    }

    console.log('✓ WebGPU supported');

    // 2. Check memory availability
    const requiredMemory = 4_000_000_000; // 4GB
    if (capabilities.maxModelSize < requiredMemory) {
      console.warn('⚠ Warning: Insufficient GPU memory');
      console.log(`Required: ${(requiredMemory / 1e9).toFixed(2)} GB`);
      console.log(`Available: ${(capabilities.maxModelSize / 1e9).toFixed(2)} GB`);
      console.log('Falling back to CPU/Hybrid mode...');
    }

    // 3. Initialize with error handling
    let stream;
    try {
      stream = await NeuralStream.create({
        modelPath: '/models/llama-7b-quantized.gguf',
        maxTokens: 2048,
        memoryBudget: capabilities.maxModelSize * 0.9, // 90% of available
        device: capabilities.maxModelSize >= requiredMemory ? 'gpu' : 'hybrid'
      });
      console.log('✓ NeuralStream initialized');
    } catch (error) {
      if (error instanceof NeuralStreamError) {
        if (error.code === ErrorCode.OUT_OF_MEMORY) {
          console.error('❌ Out of memory error');
          console.log('Try:');
          console.log('  - Reducing memory budget');
          console.log('  - Using a smaller model');
          console.log('  - Closing other browser tabs');
        } else if (error.code === ErrorCode.MODEL_LOAD_FAILED) {
          console.error('❌ Failed to load model');
          console.log('Check:');
          console.log('  - Model file exists');
          console.log('  - File format is valid (GGUF)');
          console.log('  - Sufficient disk space');
        }
      }
      throw error;
    }

    // 4. Handle generation errors
    const prompt = 'Explain machine learning';

    try {
      const tokenStream = stream.stream(prompt);
      let tokensGenerated = 0;

      for await (const token of tokenStream) {
        tokensGenerated++;

        process.stdout.write(token.token);

        // Check for errors in token stream
        if (token.isDone && token.finishReason === 'abort') {
          console.log('\n⚠ Generation was aborted');
          break;
        }

        if (tokensGenerated > 100) {
          // Manually abort if taking too long
          console.log('\n⚠ Taking too long, aborting...');
          tokenStream.abort();
          break;
        }
      }
    } catch (error) {
      if (error instanceof NeuralStreamError) {
        if (error.code === ErrorCode.DEVICE_LOST) {
          console.error('❌ GPU device lost');
          console.log('Possible causes:');
          console.log('  - GPU driver crashed');
          console.log('  - System sleep/hibernate');
          console.log('  - Hardware failure');
          console.log('\nTry reloading the page');
        } else if (error.code === ErrorCode.TIMEOUT) {
          console.error('❌ Operation timed out');
          console.log('Try:');
          console.log('  - Reducing maxTokens');
          console.log('  - Using smaller model');
          console.log('  - Checking system performance');
        }
      }
      throw error;
    }

    // 5. Resource cleanup
    try {
      await stream.dispose();
      console.log('\n✓ Resources cleaned up');
    } catch (error) {
      console.error('❌ Failed to dispose resources:', error);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run example
errorHandlingExample().catch(console.error);
