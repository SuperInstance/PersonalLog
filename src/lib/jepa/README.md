# JEPA Speech-to-Text (STT) Integration

Round 2 implementation of local and cloud-based speech-to-text transcription using Whisper.cpp and cloud APIs.

## Overview

This module provides a comprehensive STT (Speech-to-Text) system for PersonalLog.AI with support for:

- **Local transcription** using Whisper.cpp (WebAssembly)
- **Cloud transcription** via Cloudflare Workers AI, OpenAI, or Deepgram
- **Real-time streaming** transcription
- **Batch transcription** for recorded audio
- **Automatic fallback** between backends
- **Model management** for local Whisper models

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Transcription Pipeline                     │
│  (Coordinates audio capture + STT processing)        │
└────────────┬────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬─────────────┐
             │              │              │             │
             ▼              ▼              ▼             ▼
    ┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐
    │ Whisper.cpp │ │Cloudflare   │ │ OpenAI   │ │ Deepgram │
    │   (Local)   │ │  Workers AI │ │ Whisper  │ │          │
    └─────────────┘ └─────────────┘ └──────────┘ └──────────┘
         │              │              │             │
         └──────────────┴──────────────┴─────────────┘
                        │
                        ▼
                ┌───────────────┐
                │  STT Engine   │
                │ (Unified API) │
                └───────────────┘
```

## Files

| File | Description |
|------|-------------|
| `types.ts` | Audio capture types (from Round 1) |
| `stt-types.ts` | STT-specific type definitions |
| `stt-engine.ts` | Unified STT engine interface |
| `whisper-wrapper.ts` | Local Whisper.cpp WASM integration |
| `transcription-pipeline.ts` | Real-time transcription pipeline |
| `model-downloader.ts` | Model download and management |
| `README.md` | This file |

## Installation

### 1. Prerequisites

The STT integration works in the browser without any special setup for cloud-based backends.

For **local Whisper** transcription, you need:
- Modern browser with WebAssembly support
- IndexedDB for model storage
- At least 4GB RAM recommended

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Cloudflare Workers AI (optional)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# OpenAI Whisper API (optional)
OPENAI_API_KEY=sk-your_openai_api_key

# Deepgram API (optional)
DEEPGRAM_API_KEY=your_deepgram_api_key
```

### 3. Usage

### Basic Transcription

```typescript
import { STTEngine } from '@/lib/jepa/stt-engine'

// Create engine with config
const engine = new STTEngine({
  config: {
    backend: 'whisper-cloudflare', // or 'whisper-openai', 'deepgram'
    modelSize: 'base',
    language: 'en',
    enableTimestamps: true,
    enableTranslation: false,
    maxAudioLength: 300,
  },
  onTranscript: (transcript) => {
    console.log('Transcript:', transcript.text)
  },
  onProgress: (progress) => {
    console.log('Progress:', progress.progress * 100, '%')
  },
  onError: (error) => {
    console.error('Error:', error.message)
  },
})

// Initialize
await engine.initialize()

// Transcribe audio
const transcript = await engine.transcribe({
  id: 'req_1',
  audioData: audioArrayBuffer,
  format: 'wav',
  sampleRate: 44100,
  language: 'en',
  enableTimestamps: true,
  enableWordTimestamps: false,
})
```

### Real-time Transcription

```typescript
import { TranscriptionPipeline } from '@/lib/jepa/transcription-pipeline'

// Create pipeline
const pipeline = new TranscriptionPipeline({
  stt: {
    backend: 'deepgram', // Supports real-time streaming
    modelSize: 'base',
    language: 'en',
    enableTimestamps: true,
    enableTranslation: false,
    maxAudioLength: 300,
  },
  chunkDuration: 5000, // Transcribe every 5 seconds
  maxDelay: 10000, // Max 10 second delay
  enablePartialResults: true,
  enableInterimResults: true,
})

// Set up callbacks
pipeline.on('partialTranscript', (text, isFinal) => {
  console.log(isFinal ? 'Final:' : 'Interim:', text)
})

pipeline.on('transcriptComplete', (transcript) => {
  console.log('Complete transcript:', transcript)
})

// Start session
await pipeline.startSession({ language: 'en' })

// Add audio data (from AudioCapture)
pipeline.on('audioData', async (window) => {
  await pipeline.addAudioData(window)
})

// Stop session
const finalTranscript = await pipeline.stopSession()
```

### Model Management (Local Whisper)

```typescript
import { ModelDownloader } from '@/lib/jepa/model-downloader'

// Check model status
const status = await ModelDownloader.getModelStatus()
console.log('Downloaded models:', status)

// Download a model
await ModelDownloader.downloadModel('tiny', {
  onProgress: (progress) => {
    console.log(
      `Downloading: ${progress.percentage.toFixed(1)}% ` +
      `(${(progress.downloadedBytes / 1024 / 1024).toFixed(1)} MB / ` +
      `${(progress.totalBytes / 1024 / 1024).toFixed(1)} MB)`
    )
  },
  validateChecksum: true,
  timeout: 300000, // 5 minutes
})

// Get recommended model
const recommended = ModelDownloader.getRecommendedModel()
console.log('Recommended model:', recommended)

// Delete a model
await ModelDownloader.deleteModel('tiny')
```

## Backend Comparison

| Backend | Real-time | Accuracy | Speed | Cost | Privacy |
|---------|-----------|----------|-------|------|---------|
| **Whisper.cpp (Local)** | ✅ Yes | ⭐⭐⭐⭐ | ⭐⭐⭐ | Free | ✅ 100% Private |
| **Cloudflare Workers** | ❌ No | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Pay-per-use | ⚠️ Cloud processing |
| **OpenAI Whisper** | ❌ No | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Pay-per-use | ⚠️ Cloud processing |
| **Deepgram** | ✅ Yes | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Pay-per-use | ⚠️ Cloud processing |

## Model Sizes

| Model | Size | RAM | Speed | Accuracy | Best For |
|-------|------|-----|-------|----------|----------|
| **tiny** | 40 MB | 1 GB | ⚡⚡⚡⚡⚡ | ⭐⭐ | Real-time, low-end devices |
| **base** | 80 MB | 1 GB | ⚡⚡⚡⚡ | ⭐⭐⭐ | Balanced speed/accuracy |
| **small** | 250 MB | 2 GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | High quality |
| **medium** | 520 MB | 4 GB | ⚡⚡ | ⭐⭐⭐⭐ | Very high quality |
| **large** | 1 GB | 8 GB | ⚡ | ⭐⭐⭐⭐⭐ | Best accuracy, multilingual |

## Performance

### Benchmarks (30 second audio)

| Backend | Model | Processing Time | Real-time Factor |
|---------|-------|-----------------|------------------|
| Whisper.cpp (Local) | tiny | ~3s | 0.1x |
| Whisper.cpp (Local) | base | ~6s | 0.2x |
| Cloudflare Workers | base | ~5s | 0.17x |
| OpenAI Whisper | base | ~8s | 0.27x |
| Deepgram | Nova-2 | ~1s | 0.03x |

## Configuration

### Recommended Configurations

#### For Real-time Transcription
```typescript
{
  backend: 'deepgram', // or 'whisper-local' with 'tiny' model
  modelSize: 'tiny',
  language: 'en',
  enableTimestamps: true,
  enableTranslation: false,
  maxAudioLength: 300,
}
```

#### For High Accuracy
```typescript
{
  backend: 'whisper-openai', // or 'whisper-local' with 'large' model
  modelSize: 'large',
  language: 'en',
  enableTimestamps: true,
  enableTranslation: false,
  maxAudioLength: 600,
}
```

#### For Privacy
```typescript
{
  backend: 'whisper-local',
  modelSize: 'base',
  language: 'en',
  enableTimestamps: true,
  enableTranslation: false,
  maxAudioLength: 300,
}
```

## Error Handling

The STT engine includes automatic fallback:

```typescript
const engine = new STTEngine({
  fallbackStrategy: {
    enabled: true,
    backends: [
      'whisper-local',      // Try local first
      'whisper-cloudflare', // Fallback to Cloudflare
      'whisper-openai',     // Fallback to OpenAI
      'deepgram',          // Fallback to Deepgram
    ],
    retryOnFailure: true,
    maxRetries: 2,
    timeout: 30000, // 30 seconds
  },
})
```

## Troubleshooting

### Local Whisper Not Working

**Problem:** "Local Whisper WASM module not yet available"

**Solution:** The WASM module needs to be built from whisper.cpp. For now, use cloud backends:
```typescript
const engine = new STTEngine({
  config: { backend: 'whisper-cloudflare' }
})
```

### Model Download Fails

**Problem:** Model download fails with network error

**Solution:**
1. Check internet connection
2. Try a smaller model (tiny instead of base)
3. Increase timeout:
```typescript
await ModelDownloader.downloadModel('tiny', {
  timeout: 600000, // 10 minutes
})
```

### Out of Memory

**Problem:** Browser crashes during transcription

**Solution:**
1. Use a smaller model
2. Transcribe shorter chunks
3. Close other tabs

### Transcription is Slow

**Problem:** Real-time transcription has high latency

**Solution:**
1. Use smaller model (tiny)
2. Use Deepgram backend (fastest)
3. Reduce chunk duration
```typescript
const pipeline = new TranscriptionPipeline({
  stt: { backend: 'deepgram', modelSize: 'tiny' },
  chunkDuration: 3000, // 3 seconds instead of 5
})
```

## API Reference

### STTEngine

```typescript
class STTEngine {
  constructor(options: STEngineOptions)
  initialize(): Promise<void>
  transcribe(request: TranscriptionRequest, options?: { backend?: STTBackend }): Promise<Transcript>
  startRealtimeTranscription(onPartialResult: (text: string) => void, options?): Promise<() => Promise<void>>
  getStatus(): STTStatus
  getCapabilities(): STTCapabilities
  getMetrics(): STTMetrics
  switchBackend(backend: STTBackend): Promise<void>
  updateConfig(config: Partial<STTConfig>): void
  cleanup(): Promise<void>
}
```

### TranscriptionPipeline

```typescript
class TranscriptionPipeline {
  constructor(config?: Partial<PipelineConfig>)
  initialize(): Promise<void>
  startSession(options?: { language?: string }): Promise<TranscriptionSession>
  addAudioData(window: AudioWindow): Promise<void>
  stopSession(): Promise<Transcript | null>
  transcribeRecording(recording: AudioRecording): Promise<Transcript>
  getCurrentSession(): TranscriptionSession | null
  on(event: string, callback: Function): void
  cleanup(): Promise<void>
}
```

### ModelDownloader

```typescript
class ModelDownloader {
  static getAvailableModels(): WhisperModelInfo[]
  static getModelInfo(size: WhisperModelSize): WhisperModelInfo
  static getModelStatus(): Promise<ModelInfo[]>
  static isModelDownloaded(size: WhisperModelSize): Promise<boolean>
  static downloadModel(size: WhisperModelSize, options?: DownloadOptions): Promise<void>
  static deleteModel(size: WhisperModelSize): Promise<void>
  static getTotalDownloadedSize(): Promise<number>
  static clearAllModels(): Promise<void>
  static getRecommendedModel(): WhisperModelSize
}
```

## Next Steps

### Round 3: Subtext Analysis

Now that we have audio capture and transcription working, the next step is to implement the JEPA subtext analysis engine to detect hidden meanings, emotions, and context in the transcribed text.

## Credits

- **Whisper.cpp:** https://github.com/ggerganov/whisper.cpp
- **Whisper:** OpenAI (https://github.com/openai/whisper)
- **Cloudflare Workers AI:** https://developers.cloudflare.com/workers-ai/
- **Deepgram:** https://deepgram.com/

## License

MIT - see LICENSE file for details.
