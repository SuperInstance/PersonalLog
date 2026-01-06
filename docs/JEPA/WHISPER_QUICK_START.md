# Whisper STT Quick Start Guide

## Installation

No additional installation required - the Whisper STT integration is included in the JEPA module.

## Basic Usage

### 1. Simple Transcription

```typescript
import { STTEngine } from '@/lib/jepa/stt-engine'

// Create engine
const engine = new STTEngine({
  config: {
    backend: 'whisper-local',
    modelSize: 'tiny', // Use 'tiny' for fastest performance
    language: 'en',
    enableTimestamps: true,
  },
  onProgress: (progress) => {
    console.log(`Progress: ${progress.progress * 100}%`)
  }
})

// Initialize
await engine.initialize()

// Transcribe audio
const result = await engine.transcribe({
  id: 'recording-1',
  audioData: audioArrayBuffer,
  format: 'wav',
  sampleRate: 44100,
})

console.log(result.text)
```

### 2. Language Auto-Detection

```typescript
const engine = new STTEngine({
  config: {
    backend: 'whisper-local',
    modelSize: 'base',
    language: 'auto', // Auto-detect language
  }
})

await engine.initialize()

const transcript = await engine.transcribe({
  id: 'recording-2',
  audioData: audioArrayBuffer,
  format: 'wav',
  sampleRate: 44100,
  language: 'auto', // Let Whisper detect
})

console.log(`Detected language: ${transcript.language}`)
console.log(`Text: ${transcript.text}`)
```

### 3. Word-Level Timestamps

```typescript
const transcript = await engine.transcribe({
  id: 'recording-3',
  audioData: audioArrayBuffer,
  format: 'wav',
  sampleRate: 44100,
  enableTimestamps: true,
  enableWordTimestamps: true, // Get word-level timestamps
})

// Access segments
transcript.segments.forEach(segment => {
  console.log(`[${segment.startTime}ms - ${segment.endTime}ms]: ${segment.text}`)

  // Access word timestamps if available
  if (segment.words) {
    segment.words.forEach(word => {
      console.log(`  ${word.start}ms: ${word.word}`)
    })
  }
})
```

## Model Selection

Choose the right model size for your needs:

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| tiny | 40MB | 32x | Good | Real-time, low-end devices |
| base | 80MB | 16x | Better | General use |
| small | 250MB | 8x | Very Good | High accuracy |
| medium | 520MB | 5x | Excellent | Production apps |
| large | 1GB | 3x | Best | Multilingual, best accuracy |

**Example:**
```typescript
// For real-time transcription
const realtimeEngine = new STTEngine({
  config: {
    backend: 'whisper-local',
    modelSize: 'tiny', // Fastest
  }
})

// For production accuracy
const productionEngine = new STTEngine({
  config: {
    backend: 'whisper-local',
    modelSize: 'medium', // Best balance
  }
})
```

## Audio Input Formats

### From Microphone Recording

```typescript
import { getAudioCapture } from '@/lib/jepa/audio-capture'

const audioCapture = getAudioCapture()
await audioCapture.initialize()
await audioCapture.startRecording()

// ... record audio ...

const audioBuffer = audioCapture.getBuffer().getAudioBuffer()

// Convert to Float32Array
const audioData = audioBuffer.getChannelData(0)

// Transcribe
const transcript = await engine.transcribe({
  id: 'mic-recording',
  audioData: audioData,
  format: 'wav',
  sampleRate: audioBuffer.sampleRate,
})
```

### From Audio File

```typescript
async function transcribeFile(file: File) {
  const arrayBuffer = await file.arrayBuffer()

  const transcript = await engine.transcribe({
    id: file.name,
    audioData: arrayBuffer,
    format: 'wav', // or 'mp3', 'webm', etc.
    sampleRate: 44100,
  })

  return transcript
}
```

## Progress Tracking

### Model Download Progress

```typescript
const engine = new STTEngine({
  config: {
    backend: 'whisper-local',
    modelSize: 'tiny',
  }
})

// Initialize will trigger download if needed
await engine.initialize()
```

### Transcription Progress

```typescript
const engine = new STTEngine({
  onProgress: (progress) => {
    switch (progress.status) {
      case 'loading-model':
        console.log('Loading model...')
        break
      case 'transcribing':
        console.log(`Transcribing: ${progress.progress * 100}%`)
        console.log(`Segment ${progress.currentSegment}/${progress.totalSegments}`)
        console.log(`Partial: ${progress.partialText}`)
        break
      case 'ready':
        console.log('Complete!')
        break
    }
  }
})

await engine.transcribe(request)
```

## Error Handling

```typescript
try {
  const transcript = await engine.transcribe(request)
} catch (error) {
  if (error.type === 'model-not-found') {
    console.error('Model not downloaded. Initializing...')
    await engine.initialize()
  } else if (error.type === 'transcription-failed') {
    console.error('Transcription failed:', error.message)
    // Try fallback backend
    const fallbackEngine = new STTEngine({
      config: { backend: 'whisper-openai' }
    })
    const transcript = await fallbackEngine.transcribe(request)
  }
}
```

## Working with Results

### Full Transcript

```typescript
const transcript = await engine.transcribe(request)

console.log('Full Text:', transcript.text)
console.log('Language:', transcript.language)
console.log('Duration:', transcript.duration / 1000, 'seconds')
console.log('Confidence:', transcript.confidence)
```

### Segments

```typescript
transcript.segments.forEach(segment => {
  console.log(`Segment ${segment.id}:`)
  console.log(`  Time: ${segment.startTime}ms - ${segment.endTime}ms`)
  console.log(`  Text: ${segment.text}`)
  console.log(`  Confidence: ${segment.confidence}`)
})
```

### Export to Markdown

```typescript
import { formatTranscriptAsMarkdown } from '@/lib/jepa/markdown-formatter'

const markdown = formatTranscriptAsMarkdown(transcript)
console.log(markdown)
```

### Export with Timestamps

```typescript
import { formatTranscriptWithTimestamps } from '@/lib/jepa/timestamp-formatter'

const withTimestamps = formatTranscriptWithTimestamps(transcript)
console.log(withTimestamps)
```

## Configuration Options

### STT Engine Config

```typescript
const config = {
  // Backend selection
  backend: 'whisper-local',

  // Model settings
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large',

  // Language settings
  language: 'en' | 'es' | 'fr' | 'auto' | // ... 99 languages

  // Feature flags
  enableTimestamps: true,    // Include timestamps
  enableTranslation: false,  // Enable translation
  enableWordTimestamps: false, // Word-level timestamps

  // Limits
  maxAudioLength: 300, // Maximum audio length in seconds
}
```

### Fallback Strategy

```typescript
const fallback = {
  enabled: true,
  backends: [
    'whisper-local',      // Try local first
    'whisper-cloudflare', // Then Cloudflare
    'whisper-openai',     // Then OpenAI
    'deepgram',           // Finally Deepgram
  ],
  retryOnFailure: true,
  maxRetries: 2,
  timeout: 30000, // 30 seconds
}
```

## Performance Tips

1. **Use appropriate model size:**
   - `tiny` for real-time applications
   - `base` or `small` for general use
   - `medium` or `large` for production

2. **Preload models:**
   ```typescript
   // Initialize early
   await engine.initialize()
   ```

3. **Batch processing:**
   ```typescript
   const audioFiles = ['file1.wav', 'file2.wav', 'file3.wav']

   const transcripts = await Promise.all(
     audioFiles.map(file => engine.transcribe({...}))
   )
   ```

4. **Clean up when done:**
   ```typescript
   await engine.cleanup()
   ```

## Supported Languages

Full list of 99 supported languages available in `WHISPER_LANGUAGES`:

```typescript
import { WHISPER_LANGUAGES } from '@/lib/jepa/whisper-wasm'

Object.entries(WHISPER_LANGUAGES).forEach(([code, name]) => {
  console.log(`${code}: ${name}`)
})
```

Common languages:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)
- Hindi (hi)

## Troubleshooting

### Model Not Downloading

```typescript
// Check model state
const engine = new STTEngine({
  config: { backend: 'whisper-local' }
})

// Force model download
const whisperEngine = engine.backends.get('whisper-local')
await whisperEngine.downloadModel('tiny', (progress) => {
  console.log(`Download: ${progress.percentage}%`)
})
```

### Slow Transcription

```typescript
// Use smaller model
const config = {
  backend: 'whisper-local',
  modelSize: 'tiny', // Instead of 'large'
}

// Or use cloud backend for faster processing
const config = {
  backend: 'whisper-openai',
}
```

### Out of Memory

```typescript
// Use smaller model
const config = {
  backend: 'whisper-local',
  modelSize: 'tiny', // Uses less memory
}

// Clean up between transcriptions
await engine.cleanup()
```

## Advanced: Direct Whisper STT Usage

For more control, use the WhisperSTT class directly:

```typescript
import { WhisperSTT } from '@/lib/jepa/whisper-wasm'

const whisper = new WhisperSTT({
  backend: 'whisper-local',
  modelSize: 'base',
  language: 'en',
  enableTimestamps: true,
  enableTranslation: false,
  maxAudioLength: 300,
})

// Load model
await whisper.load((progress) => {
  console.log(`Loading: ${progress.percentage}%`)
})

// Detect language
const language = await whisper.detectLanguage(audioBuffer)

// Transcribe
const result = await whisper.transcribe(audioBuffer, {
  language: undefined, // Auto-detect
  enableWordTimestamps: true,
})

console.log(result.text)
console.log(result.segments)

// Clean up
await whisper.cleanup()
```

## Next Steps

1. Explore the full API in the source files
2. Check out the test files for more examples
3. Read the full integration documentation
4. Build the WASM module for local deployment

## Resources

- Full Documentation: `/docs/jepa/WHISPER_CPP_INTEGRATION.md`
- Source Code: `/src/lib/jepa/whisper-wasm.ts`
- Tests: `/src/lib/jepa/__tests__/whisper-wasm.test.ts`
- Whisper.cpp: https://github.com/ggerganov/whisper.cpp
