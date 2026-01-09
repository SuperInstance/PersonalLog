/**
 * Streaming UI Example
 *
 * Example with real-time UI updates at 60 FPS.
 */

import { NeuralStream } from '@superinstance/neuralstream';

class StreamingUI {
  private outputElement: HTMLElement;
  private metricsElement: HTMLElement;
  private progressBar: HTMLElement;

  constructor() {
    this.outputElement = document.getElementById('output')!;
    this.metricsElement = document.getElementById('metrics')!;
    this.progressBar = document.getElementById('progress')!;
  }

  async startGeneration(prompt: string) {
    const stream = await NeuralStream.create({
      modelPath: '/models/llama-7b-quantized.gguf',
      targetFPS: 60,
      enableMonitoring: true
    });

    const tokenStream = stream.stream(prompt);
    let startTime = performance.now();

    // UI update loop at 60 FPS
    const updateUI = () => {
      const progress = tokenStream.getProgress();

      // Update progress bar
      const percentage = (progress.tokensGenerated / 2048) * 100;
      this.progressBar.style.width = `${percentage}%`;

      // Update metrics
      this.metricsElement.innerHTML = `
        <div>Tokens: ${progress.tokensGenerated}</div>
        <div>FPS: ${progress.currentFPS.toFixed(1)}</div>
        <div>Time: ${progress.totalTime.toFixed(0)}ms</div>
        <div>Cache: ${(progress.cacheHitRate * 100).toFixed(1)}%</div>
      `;

      if (!tokenStream.getProgress().isDone) {
        requestAnimationFrame(updateUI);
      }
    };

    // Stream tokens
    for await (const token of tokenStream) {
      // Update output
      this.outputElement.textContent += token.token;

      // Auto-scroll to bottom
      this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    // Final UI update
    const metrics = stream.getMetrics();
    this.metricsElement.innerHTML += `
      <div class="final-metrics">
        <h3>Final Metrics</h3>
        <div>Total Time: ${metrics.avgTimePerToken * metrics.totalTokens}ms</div>
        <div>Avg/Token: ${metrics.avgTimePerToken.toFixed(2)}ms</div>
        <div>Throughput: ${metrics.tokensPerSecond.toFixed(2)} tokens/sec</div>
      </div>
    `;

    await stream.dispose();
  }
}

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
  const ui = new StreamingUI();
  const generateBtn = document.getElementById('generate')!;
  const promptInput = document.getElementById('prompt')! as HTMLInputElement;

  generateBtn.addEventListener('click', () => {
    const prompt = promptInput.value;
    if (prompt) {
      ui.outputElement.textContent = '';
      ui.startGeneration(prompt);
    }
  });
});
