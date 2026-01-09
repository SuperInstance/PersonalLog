/**
 * Example 5: Text Summarization
 *
 * Demonstrates efficient text summarization using WebGPU acceleration.
 * Process long documents and generate concise summaries.
 *
 * SEO Keywords:
 * - AI text summarization
 * - browser summarization
 * - local document summary
 * - WebGPU summarization
 * - fast text analysis
 */

async function textSummarization() {
  const summarizer = await NeuralStream.init({
    model: 'summarization-model',
    maxLength: 200, // Maximum summary length
  });

  const longText = `
    Artificial intelligence (AI) is intelligence demonstrated by machines,
    as opposed to the natural intelligence displayed by humans or animals.
    Leading AI textbooks define the field as the study of "intelligent agents":
    any system that perceives its environment and takes actions that maximize
    its chance of achieving its goals...
  `; // [Imagine 2000+ words of text]

  // Generate summary
  const summary = await summarizer.summarize(longText, {
    compressionRatio: 0.3, // Compress to 30% of original
    style: 'concise',
  });

  console.log('Summary:', summary);
  // Output: "AI is machine intelligence that perceives environments and
  //         takes actions to achieve goals, distinct from natural intelligence."
}

// Key features:
// - Long document processing
// - Configurable compression ratio
// - Different summary styles
// - GPU-accelerated processing
// - Memory-efficient chunking
