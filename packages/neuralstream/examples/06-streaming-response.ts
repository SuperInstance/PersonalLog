/**
 * Example 6: Streaming Response
 *
 * Demonstrates streaming token generation for real-time user experience.
 * Shows progress as text is generated, token by token.
 *
 * SEO Keywords:
 * - streaming text generation
 * - real-time AI streaming
 * - token-by-token output
 * - progressive generation
 * - 60 FPS streaming
 */

async function streamingResponse() {
  const generator = await NeuralStream.init({
    model: 'streaming-model',
    streaming: true,
  });

  const prompt = 'Write a short story about a robot learning to paint';

  // Stream generation
  const stream = await generator.stream(prompt, {
    onToken: (token, index) => {
      console.log(`Token ${index}:`, token);
      // Update UI in real-time
      updateDisplay(token);
    },
    onProgress: (progress) => {
      console.log(`Progress: ${progress.percentage.toFixed(1)}%`);
    },
  });

  console.log('Complete story:', stream.fullText);
}

// Example output:
// Token 0: Once
// Token 1: upon
// Token 2: a
// Token 3: time,
// Token 4: there
// Token 5: was
// Token 6: a
// Token 7: robot
// ...

// Key features:
// - Real-time token streaming
// - Progress callbacks
// - Smooth 60 FPS rendering
// - Low latency updates
// - Cancelable streams
