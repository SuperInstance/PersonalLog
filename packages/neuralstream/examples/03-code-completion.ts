/**
 * Example 3: Code Completion
 *
 * Demonstrates intelligent code completion using local LLM inference.
 * Provides context-aware suggestions for developers.
 *
 * SEO Keywords:
 * - AI code completion
 * - local code suggestions
 * - browser code completion
 * - WebGPU autocomplete
 * - offline coding assistant
 */

async function codeCompletion() {
  const completer = await NeuralStream.init({
    model: 'code-completion-model',
    maxTokens: 100,
  });

  // Get code context
  const code = `
function calculateSum(a, b) {
  // User cursor is here
  return a
}
  `.trim();

  // Generate completions
  const suggestions = await completer.complete(code, {
    numSuggestions: 3,
    temperature: 0.2, // Low temperature for code
  });

  console.log('Suggestions:', suggestions);
  // Output: [
  //   ' + b;',
  //   ' + b + c;',
  //   ' + b * 2;'
  // ]
}

// Key features:
// - Context-aware code completion
// - Multiple suggestions
// - Low temperature for deterministic output
// - Fast inference for real-time editing
