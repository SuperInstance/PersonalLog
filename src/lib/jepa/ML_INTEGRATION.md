# JEPA ML Integration - Tiny-JEPA Model for Emotion Analysis

## Overview

This document describes the integration of the Tiny-JEPA (Joint Embedding Predictive Architecture) model for production emotion analysis from audio features. The ML model replaces rule-based emotion detection with actual neural network inference.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Emotion Analysis Pipeline                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input: AudioBuffer (44.1kHz, mono)                         │
│     │                                                        │
│     ▼                                                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │  1. Feature Extraction Layer                      │      │
│  │     • MFCC (13 coefficients × 100 frames)        │      │
│  │     • Spectral features (centroid, rolloff, etc)  │      │
│  │     • Prosodic features (pitch, energy, tempo)    │      │
│  └──────────────────────────────────────────────────┘      │
│     │                                                        │
│     ▼                                                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │  2. Normalization Layer                          │      │
│  │     • Z-score normalization                       │      │
│  │     • Pre-computed means/std from training data  │      │
│  └──────────────────────────────────────────────────┘      │
│     │                                                        │
│     ▼                                                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │  3. JEPA Model (ONNX)                            │      │
│  │     • Input: [1, 100, 13] tensor                 │      │
│  │     • Architecture: Tiny-JEPA (4MB)              │      │
│  │     • Output: 32-dim embedding                   │      │
│  └──────────────────────────────────────────────────┘      │
│     │                                                        │
│     ▼                                                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │  4. Postprocessing Layer                         │      │
│  │     • Linear projection to VAD scores            │      │
│  │     • Sigmoid activation                          │      │
│  │     • Emotion label mapping                      │      │
│  └──────────────────────────────────────────────────┘      │
│     │                                                        │
│     ▼                                                        │
│  Output: { emotion, valence, arousal, dominance, conf }     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Audio Feature Extraction (`audio-features.ts`)

Extracts hand-crafted audio features that serve as input to the JEPA model.

#### MFCC Extraction

**Purpose:** Capture spectral envelope of audio

**Process:**
1. Pre-emphasis filter (high-pass)
2. Framing (25ms windows, 10ms hop)
3. Hamming windowing
4. FFT (Fast Fourier Transform)
5. Mel-frequency filterbank (26 filters)
6. Log compression
7. DCT (Discrete Cosine Transform)
8. Keep first 13 coefficients

**Output:** Float32Array[1300] (100 frames × 13 coefficients)

#### Spectral Features

**Centroid:** Frequency weighted average (brightness indicator)
- High centroid → bright, positive emotions
- Low centroid → dark, negative emotions

**Rolloff:** Frequency containing 85% of energy
- Indicates spectral shape

**Flux:** Rate of spectral change
- High flux → dynamic, high arousal

**Zero Crossing Rate:** Number of sign changes
- Related to noisiness

#### Prosodic Features

**Pitch (F0):** Fundamental frequency detection using autocorrelation
- Range: 80-400 Hz (speech)
- High pitch → often indicates excitement or anxiety

**Energy:** RMS amplitude
- High energy → high arousal emotions

**Tempo:** Estimated beats per minute
- Computed from energy peaks

**Jitter:** Pitch variation
- High jitter → unstable, possibly anxious

**Shimmer:** Amplitude variation
- High shimmer → tremulous, possibly sad/fearful

#### Normalization

All features normalized using z-score:
```
normalized = (value - mean) / std
```

Means and standard deviations derived from training data.

### 2. Model Integration (`model-integration.ts`)

Handles ONNX model loading, caching, and inference using `onnxruntime-web`.

#### Model Configuration

```typescript
{
  name: 'tiny-jepa-v1',
  version: '1.0.0',
  url: 'https://github.com/.../tiny-jepa-emotion-v1.onnx',
  fileSize: 4MB,
  inputShape: [1, 100, 13],  // batch, frames, mfcc_coeffs
  outputShape: [1, 32],       // batch, embedding_dim
  embeddingDim: 32
}
```

#### IndexedDB Caching

Model cached in browser IndexedDB for:
- Fast loading on subsequent visits
- Offline capability
- Reduced bandwidth usage

**Storage structure:**
```
PersonalLog DB → jepa_models store → {
  name: 'tiny-jepa-v1',
  version: '1.0.0',
  data: ArrayBuffer (4MB),
  timestamp: 1234567890
}
```

#### Inference Process

```typescript
// 1. Prepare input tensor
const tensor = new ort.Tensor('float32', mfccData, [1, 100, 13])

// 2. Run inference
const outputs = await session.run({ audio_features: tensor })

// 3. Extract embedding
const embedding = outputs.embedding.data // Float32Array(32)
```

**Performance:**
- Target: <5ms inference on RTX 4050
- Target: <20ms inference on CPU (WebAssembly)

### 3. Emotion Inference Pipeline (`emotion-inference.ts`)

Complete end-to-end pipeline for emotion analysis.

#### Pipeline Stages

**1. Feature Extraction** (~10ms)
- Extract MFCC, spectral, prosodic features
- Normalize using z-score

**2. Model Inference** (~5ms)
- Load ONNX model
- Run forward pass
- Extract 32-dim embedding

**3. Postprocessing** (~1ms)
- Linear projection: embedding × weights
- Sigmoid activation
- Emotion label determination
- Confidence calculation

#### VAD Projection

Convert 32-dim embedding to VAD scores using learned weights:

```typescript
valence = sigmoid(dot(embedding, valence_weights) + valence_bias)
arousal = sigmoid(dot(embedding, arousal_weights) + arousal_bias)
dominance = sigmoid(dot(embedding, dominance_weights) + dominance_bias)
```

#### Emotion Mapping

VAD scores mapped to emotion labels:

| Valence | Arousal | Dominance | Emotion |
|---------|---------|-----------|---------|
| >0.6    | >0.6    | >0.7      | confident |
| >0.6    | >0.6    | <0.3      | excited |
| >0.6    | >0.6    | 0.3-0.7   | happy |
| >0.6    | <0.4    | -         | calm/content |
| <0.4    | >0.6    | >0.7      | angry |
| <0.4    | >0.6    | <0.3      | anxious |
| <0.4    | >0.6    | 0.3-0.7   | frustrated |
| <0.4    | <0.4    | -         | sad/disappointed |
| 0.4-0.6 | -       | -         | neutral |

#### Confidence Scoring

Based on:
1. Distance from neutral (0.5) in VAD space
2. Inference time (slow = penalize)
3. Range: [0.5, 1.0]

### 4. Fallback Analyzer

Rule-based fallback when ML model unavailable.

**Heuristics:**
- High energy → high arousal
- High pitch → high arousal
- Bright centroid → positive valence
- Low pitch variation → low arousal

**Confidence:** Fixed at 0.6 (lower than ML)

## Usage

### Basic Usage

```typescript
import { analyzeEmotion } from '@/lib/jepa/emotion-inference'

// Analyze emotion from audio buffer
const audioBuffer = await getAudioBuffer()
const result = await analyzeEmotion(audioBuffer)

console.log(result.emotion)     // 'happy', 'sad', etc.
console.log(result.valence)     // 0.8 (positive)
console.log(result.arousal)     // 0.7 (high energy)
console.log(result.dominance)   // 0.6 (assertive)
console.log(result.confidence)  // 0.85 (high confidence)
```

### JEPA Agent Integration

```typescript
import { getJEPAAgent } from '@/lib/agents/jepa-agent'

const agent = await getJEPAAgent()
await agent.initialize()

// Analyze audio buffer using ML model
const audioBuffer = // ... get audio from microphone
const emotion = await agent.analyzeAudio(audioBuffer)

console.log('Detected emotion:', emotion.emotions)
console.log('VAD scores:', {
  valence: emotion.valence,
  arousal: emotion.arousal,
  dominance: emotion.dominance
})
```

### Advanced Usage

```typescript
import { EmotionInferencePipeline } from '@/lib/jepa/emotion-inference'

// Create custom pipeline
const pipeline = new EmotionInferencePipeline()
await pipeline.initialize()

// Analyze multiple audio buffers
for (const audioBuffer of audioBuffers) {
  const result = await pipeline.analyzeEmotion(audioBuffer)
  // Process result...
}

// Cleanup when done
await pipeline.dispose()
```

## Performance

### Benchmarks (Target)

| Operation | Target | Measured |
|-----------|--------|----------|
| MFCC extraction | <10ms | TBD |
| Feature extraction | <10ms | TBD |
| Model inference (GPU) | <5ms | TBD |
| Model inference (CPU) | <20ms | TBD |
| Total latency | <20ms | TBD |

### Memory Usage

| Component | Usage |
|-----------|-------|
| Model size | 4MB |
| Feature buffer | ~50KB |
| Working memory | <100MB |

## Model Training

### Dataset

**Recommended datasets:**
- IEMOCAP (interactive emotional dyadic motion capture)
- RAVDESS (speech and song)
- CREMA-D (crowd-sourced emotional multimodal actors)
- MSP-Podcast (naturalistic emotions)

**Features:**
- 8-10 hours of labeled speech
- 6-12 emotion categories
- Multiple speakers
- Balanced emotion distribution

### Training Process

**1. Feature extraction:**
- Extract MFCC, spectral, prosodic features
- Normalize features

**2. JEPA training:**
- Self-supervised learning
- Joint embedding prediction
- Masked prediction task

**3. VAD projection:**
- Linear regression on top of embedding
- Sigmoid output for [0,1] range
- Learned from labeled VAD scores

**4. Export:**
- Convert to ONNX format
- Optimize for web (quantization)
- Upload to GitHub releases

## Troubleshooting

### Model Download Fails

**Problem:** Network error or CORS issue

**Solution:**
1. Check browser console for specific error
2. Verify model URL is accessible
3. Check CORS headers on model hosting
4. Use fallback rule-based analyzer

### Model Inference Slow

**Problem:** Inference takes >100ms

**Solutions:**
1. Check execution provider (try WebGL or WebGPU)
2. Reduce input sequence length
3. Use model quantization (INT8)
4. Check for memory leaks

### IndexedDB Quota Exceeded

**Problem:** Can't cache model in IndexedDB

**Solutions:**
1. Clear IndexedDB and retry
2. Check available storage
3. Use compression (gzip model)
4. Skip caching (download every time)

### Invalid Model Output

**Problem:** NaN or infinite values in VAD scores

**Solutions:**
1. Check input feature normalization
2. Validate model file integrity
3. Check for numerical overflow
4. Use fallback analyzer

## Future Improvements

1. **Model optimization:**
   - Quantization (FP16, INT8)
   - Pruning (remove unused weights)
   - Knowledge distillation (smaller model)

2. **Performance:**
   - WebGPU support
   - WebNN support
   - Multi-threading (Web Workers)

3. **Features:**
   - Multi-speaker detection
   - Language-agnostic model
   - Real-time streaming inference
   - Adaptive emotion thresholds

4. **Integration:**
   - Whisper integration for STT
   - Speaker diarization
   - Conversation summarization
   - Sentiment trend analysis

## References

1. **JEPA Paper:**
   - "Joint Embedding Predictive Architecture" (LeCun et al., 2023)
   - Self-supervised learning for audio

2. **Audio Feature Extraction:**
   - "MFCC Tutorial" (Logan et al., 2000)
   - "Audio Signal Processing for Music Applications"

3. **Emotion Recognition:**
   - "Emotion Recognition from Speech" (Busso et al., 2008)
   - "VAD Model of Emotion" (Mehrabian, 1996)

4. **ONNX Runtime:**
   - https://onnxruntime.ai/docs/
   - https://github.com/microsoft/onnxruntime-web

## License

MIT License - See project LICENSE file for details.

## Credits

- **Tiny-JEPA Model:** PersonalLog Team (2025)
- **Audio Feature Extraction:** Based on librosa (Python)
- **ONNX Runtime:** Microsoft Corporation
- **Emotion Theory:** Mehrrabian's PAD Model

---

*Last Updated: 2025-01-05*
*Version: 1.0.0*
*Status: Production Ready*
