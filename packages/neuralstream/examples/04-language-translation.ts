/**
 * Example 4: Language Translation
 *
 * Demonstrates offline language translation using local LLM inference.
 * No API calls required - everything runs in the browser.
 *
 * SEO Keywords:
 * - offline translation
 * - browser language translation
 * - local AI translator
 * - WebGPU translation
 * - privacy-preserving translation
 */

async function languageTranslation() {
  const translator = await NeuralStream.init({
    model: 'translation-model',
    sourceLanguage: 'en',
    targetLanguage: 'es',
  });

  const texts = [
    'Hello, how are you?',
    'The weather is beautiful today.',
    'I love learning new languages.',
  ];

  // Translate all texts
  const translations = await Promise.all(
    texts.map(text => translator.translate(text))
  );

  console.log('Translations:', translations);
  // Output: [
  //   '¡Hola, cómo estás?',
  //   'El clima está hermoso hoy.',
  //   'Me encanta aprender nuevos idiomas.'
  // ]
}

// Key features:
// - Batch translation
// - Parallel processing
// - Offline operation
// - Privacy-preserving (no data sent to server)
// - Fast local inference
