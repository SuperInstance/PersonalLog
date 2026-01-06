/**
 * JEPA Emotion Inference Pipeline
 *
 * Complete pipeline for analyzing emotions from audio using the Tiny-JEPA model.
 * Handles feature extraction, model inference, and postprocessing.
 *
 * @module lib/jepa/emotion-inference
 */

import type { AudioFeatures } from './audio-features'
import { extractMFCC, extractSpectralFeatures, extractProsodicFeatures, normalizeFeatures } from './audio-features'
import { JEPAModel, type InferenceResult } from './model-integration'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EmotionResult {
  /** Detected emotion label */
  emotion: string
  /** Valence: positive (0.6-1.0) vs negative (0.0-0.4) */
  valence: number
  /** Arousal: energy/intensity (0.0-1.0) */
  arousal: number
  /** Dominance: confidence/assertiveness (0.0-1.0) */
  dominance: number
  /** Overall confidence in analysis (0.0-1.0) */
  confidence: number
  /** Inference time in milliseconds */
  inferenceTime: number
  /** Feature extraction time in milliseconds */
  featureExtractionTime: number
}

export interface VADScores {
  valence: number
  arousal: number
  dominance: number
}

// ============================================================================
// POSTPROCESSING WEIGHTS
// ============================================================================

/**
 * Projection weights for converting embedding to VAD scores
 * These would be learned during model training
 * For now, using placeholder weights
 */
const VAD_WEIGHTS = {
  valence: new Float32Array([
    0.1, 0.15, -0.05, 0.2, 0.12, -0.08, 0.18, 0.05, -0.1, 0.22, 0.08, -0.03, 0.14, 0.19, -0.06, 0.11, 0.07,
    0.16, -0.04, 0.13, 0.09, 0.21, -0.07, 0.17, 0.06, 0.12, -0.02, 0.2, 0.04, -0.09, 0.15,
  ]),
  arousal: new Float32Array([
    0.18, 0.12, 0.22, 0.08, 0.16, 0.19, 0.05, 0.21, 0.11, 0.14, 0.07, 0.2, 0.09, 0.17, 0.13, 0.06, 0.15,
    0.1, 0.23, 0.04, 0.19, 0.12, 0.08, 0.18, 0.11, 0.16, 0.05, 0.22, 0.09, 0.14, 0.17,
  ]),
  dominance: new Float32Array([
    0.14, 0.19, 0.08, 0.16, 0.11, 0.22, 0.13, 0.07, 0.18, 0.12, 0.15, 0.09, 0.21, 0.06, 0.17, 0.14, 0.1,
    0.2, 0.05, 0.19, 0.11, 0.16, 0.08, 0.23, 0.12, 0.15, 0.07, 0.18, 0.13, 0.09, 0.17,
  ]),
}

const VAD_BIASES = {
  valence: 0.0,
  arousal: 0.0,
  dominance: 0.0,
}

// ============================================================================
// EMOTION INFERENCE PIPELINE
// ============================================================================

export class EmotionInferencePipeline {
  private jepaModel: JEPAModel
  private initialized = false

  constructor() {
    this.jepaModel = new JEPAModel()
  }

  /**
   * Initialize the pipeline
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      await this.jepaModel.load()
      this.initialized = true
      console.log('[JEPA Pipeline] Initialized successfully')
    } catch (error) {
      console.error('[JEPA Pipeline] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Analyze emotion from audio buffer
   *
   * @param audioBuffer - Input audio buffer
   * @returns Emotion analysis result
   */
  async analyzeEmotion(audioBuffer: AudioBuffer): Promise<EmotionResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const featureStartTime = performance.now()

    try {
      // 1. Extract features
      const features = await this.extractFeatures(audioBuffer)

      const featureExtractionTime = performance.now() - featureStartTime

      // 2. Run inference
      const inferenceResult = await this.runInference(features)

      // 3. Postprocess to get VAD scores
      const vad = this.postprocess(inferenceResult.embedding)

      // 4. Determine emotion label
      const emotion = this.determineEmotionLabel(vad)

      // 5. Calculate confidence
      const confidence = this.calculateConfidence(vad, inferenceResult)

      return {
        emotion,
        valence: vad.valence,
        arousal: vad.arousal,
        dominance: vad.dominance,
        confidence,
        inferenceTime: inferenceResult.inferenceTime,
        featureExtractionTime,
      }
    } catch (error) {
      console.error('[JEPA Pipeline] Emotion analysis failed:', error)
      throw new Error(`Emotion analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if pipeline is ready
   */
  isReady(): boolean {
    return this.initialized && this.jepaModel.isLoaded()
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    await this.jepaModel.unload()
    this.initialized = false
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Extract audio features
   */
  private async extractFeatures(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    // Extract MFCC coefficients
    const mfcc = extractMFCC(audioBuffer)

    // Extract spectral features
    const spectral = extractSpectralFeatures(audioBuffer)

    // Extract prosodic features
    const prosodic = extractProsodicFeatures(audioBuffer)

    // Combine features
    const features: AudioFeatures = {
      mfcc,
      spectral,
      prosodic,
    }

    // Normalize features
    const normalized = normalizeFeatures(features)

    return normalized
  }

  /**
   * Run JEPA model inference
   */
  private async runInference(features: AudioFeatures): Promise<InferenceResult> {
    return await this.jepaModel.infer(features)
  }

  /**
   * Postprocess embedding to VAD scores
   */
  private postprocess(embedding: Float32Array): VADScores {
    // Compute dot products with learned weights
    const valenceRaw = this.dotProduct(embedding, VAD_WEIGHTS.valence) + VAD_BIASES.valence
    const arousalRaw = this.dotProduct(embedding, VAD_WEIGHTS.arousal) + VAD_BIASES.arousal
    const dominanceRaw = this.dotProduct(embedding, VAD_WEIGHTS.dominance) + VAD_BIASES.dominance

    // Apply sigmoid to squash to [0, 1]
    return {
      valence: this.sigmoid(valenceRaw),
      arousal: this.sigmoid(arousalRaw),
      dominance: this.sigmoid(dominanceRaw),
    }
  }

  /**
   * Determine emotion label from VAD scores
   */
  private determineEmotionLabel(vad: VADScores): string {
    const { valence, arousal, dominance } = vad

    // Define emotion regions in VAD space
    // Based on psychological emotion models (e.g., PAD model)

    // High valence, high arousal
    if (valence > 0.6 && arousal > 0.6) {
      if (dominance > 0.7) return 'confident'
      if (dominance < 0.3) return 'excited'
      return 'happy'
    }

    // High valence, low arousal
    if (valence > 0.6 && arousal < 0.4) {
      if (dominance > 0.7) return 'content'
      return 'calm'
    }

    // Low valence, high arousal
    if (valence < 0.4 && arousal > 0.6) {
      if (dominance > 0.7) return 'angry'
      if (dominance < 0.3) return 'anxious'
      return 'frustrated'
    }

    // Low valence, low arousal
    if (valence < 0.4 && arousal < 0.4) {
      if (dominance > 0.7) return 'disappointed'
      return 'sad'
    }

    // Mid-range emotions
    if (valence >= 0.4 && valence <= 0.6) {
      if (arousal > 0.6) return 'surprised'
      if (arousal < 0.4) return 'bored'
    }

    // Default neutral
    return 'neutral'
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(vad: VADScores, inferenceResult: InferenceResult): number {
    // Confidence based on distance from neutral (0.5) in VAD space
    const valenceDist = Math.abs(vad.valence - 0.5)
    const arousalDist = Math.abs(vad.arousal - 0.5)
    const dominanceDist = Math.abs(vad.dominance - 0.5)

    // Average distance from neutral
    const avgDist = (valenceDist + arousalDist + dominanceDist) / 3

    // Scale to [0.5, 1.0] range
    const confidence = 0.5 + avgDist

    // Penalize slow inference (might indicate processing issues)
    const timePenalty = Math.min(0.1, inferenceResult.inferenceTime / 100)

    return Math.max(0.5, Math.min(1.0, confidence - timePenalty))
  }

  /**
   * Compute dot product of two vectors
   */
  private dotProduct(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`)
    }

    let sum = 0
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i]
    }
    return sum
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }
}

// ============================================================================
// FALLBACK ANALYZER (Rule-based)
// ============================================================================

/**
 * Fallback emotion analyzer using rule-based heuristics
 * Used when ML model is unavailable or fails
 */
export class FallbackEmotionAnalyzer {
  /**
   * Analyze emotion using simple rules
   */
  async analyzeEmotion(audioBuffer: AudioBuffer): Promise<EmotionResult> {
    const startTime = performance.now()

    // Extract basic features
    const spectral = extractSpectralFeatures(audioBuffer)
    const prosodic = extractProsodicFeatures(audioBuffer)

    // Simple rule-based emotion detection
    const { valence, arousal, dominance } = this.ruleBasedVAD(spectral, prosodic)
    const emotion = this.determineEmotionLabel(valence, arousal, dominance)
    const confidence = 0.6 // Lower confidence for rule-based

    const inferenceTime = performance.now() - startTime

    return {
      emotion,
      valence,
      arousal,
      dominance,
      confidence,
      inferenceTime,
      featureExtractionTime: 0,
    }
  }

  private ruleBasedVAD(
    spectral: ReturnType<typeof extractSpectralFeatures>,
    prosodic: ReturnType<typeof extractProsodicFeatures>
  ): VADScores {
    // Simplified rule-based VAD estimation
    let valence = 0.5
    let arousal = 0.5
    let dominance = 0.5

    // High energy → high arousal
    if (prosodic.energy > 0.15) {
      arousal += 0.2
    } else if (prosodic.energy < 0.05) {
      arousal -= 0.2
    }

    // High pitch → likely high arousal
    if (prosodic.pitch > 200) {
      arousal += 0.1
    }

    // Low pitch variation → low arousal
    if (prosodic.jitter < 1) {
      arousal -= 0.1
    }

    // Bright spectral centroid → positive valence
    if (spectral.centroid > 2500) {
      valence += 0.1
    } else if (spectral.centroid < 1500) {
      valence -= 0.1
    }

    // High flux → high arousal
    if (spectral.flux > 0.7) {
      arousal += 0.15
    }

    // Normalize to [0, 1]
    valence = Math.max(0, Math.min(1, valence))
    arousal = Math.max(0, Math.min(1, arousal))
    dominance = Math.max(0, Math.min(1, dominance))

    return { valence, arousal, dominance }
  }

  private determineEmotionLabel(valence: number, arousal: number, dominance: number): string {
    if (valence > 0.6 && arousal > 0.6) return 'happy'
    if (valence > 0.6 && arousal < 0.4) return 'calm'
    if (valence < 0.4 && arousal > 0.6) return 'angry'
    if (valence < 0.4 && arousal < 0.4) return 'sad'
    return 'neutral'
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let pipelineInstance: EmotionInferencePipeline | null = null

/**
 * Get or create the singleton emotion inference pipeline
 */
export async function getEmotionPipeline(): Promise<EmotionInferencePipeline> {
  if (!pipelineInstance) {
    pipelineInstance = new EmotionInferencePipeline()
    await pipelineInstance.initialize()
  }
  return pipelineInstance
}

/**
 * Dispose the emotion inference pipeline
 */
export async function disposeEmotionPipeline(): Promise<void> {
  if (pipelineInstance) {
    await pipelineInstance.dispose()
    pipelineInstance = null
  }
}

/**
 * Analyze emotion from audio buffer (convenience function)
 * Automatically falls back to rule-based analysis if ML model fails
 */
export async function analyzeEmotion(audioBuffer: AudioBuffer): Promise<EmotionResult> {
  try {
    const pipeline = await getEmotionPipeline()
    return await pipeline.analyzeEmotion(audioBuffer)
  } catch (error) {
    console.warn('[JEPA] ML model unavailable, falling back to rule-based analysis:', error)
    const fallback = new FallbackEmotionAnalyzer()
    return await fallback.analyzeEmotion(audioBuffer)
  }
}
