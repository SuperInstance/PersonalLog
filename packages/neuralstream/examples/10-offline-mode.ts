/**
 * Example 10: Offline Mode
 *
 * Demonstrates fully offline operation after initial model download.
 * Perfect for privacy-sensitive applications and offline scenarios.
 *
 * SEO Keywords:
 * - offline AI inference
 * - privacy-preserving AI
 * - browser offline mode
 * - local LLM
 * - no-server AI
 */

async function offlineMode() {
  // Initial setup (requires internet)
  console.log('Downloading model...');
  const offlineModel = await NeuralStream.downloadModel({
    url: 'https://example.com/model.gguf',
    cache: 'indexedDB', // Cache for offline use
    progressCallback: (progress) => {
      console.log(`Download: ${(progress * 100).toFixed(1)}%`);
    },
  });

  console.log('Model downloaded. Ready for offline use.');

  // Now fully offline
  const generator = await NeuralStream.init({
    model: offlineModel,
    offline: true,
  });

  // Use offline
  const isOffline = !navigator.onLine;
  if (isOffline) {
    console.log('Working offline...');

    const response = await generator.generate(
      'Generate text without internet'
    );

    console.log('Generated:', response.text);
    // Works perfectly without any network connection!
  }

  // Progressive Web App support
  if ('serviceWorker' in navigator) {
    // Register service worker for full offline capability
    await navigator.serviceWorker.register('/sw.js');
  }
}

// Key features:
// - Full offline operation
// - IndexedDB caching
// - Progressive Web App
// - Privacy-preserving
// - Zero server dependency
// - Works without internet
