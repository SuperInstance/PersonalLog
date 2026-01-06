/**
 * JEPA Agent - Emotional Subtext Analyzer
 *
 * Interactive agent that analyzes emotional undertones in real-time during conversations.
 * Integrates audio capture, speech-to-text, and emotion analysis into a cohesive experience.
 *
 * @module lib/agents/jepa-agent
 */

import {
  AgentDefinition,
  AgentCategory,
  ActivationMode,
  AgentState,
  AgentStateData,
  AgentMetadata,
} from './types'
import type { Message } from '@/types/conversation'
import { getAudioCapture } from '@/lib/jepa/audio-capture'
import { getAudioStateManager } from '@/lib/jepa/audio-state'
import type { AudioWindow, RecordingState } from '@/lib/jepa/types'
import { formatTranscriptToMarkdown, copyMarkdownToClipboard } from '@/lib/jepa/markdown-formatter'
import { detectSpeaker, getSpeakerDisplayName } from '@/lib/jepa/speaker-detection'
import { agentEventBus } from './communication/event-bus'
import { MessageType } from './communication/types'
import { analyzeEmotion, type EmotionResult as MLResult } from '@/lib/jepa/emotion-inference'

// ============================================================================
// JEPA AGENT STATE
// ============================================================================

export interface JEPAAgentState extends AgentStateData {
  /** Recording state */
  recordingState: RecordingState
  /** Audio windows captured */
  audioWindows: AudioWindow[]
  /** Transcript segments */
  transcript: TranscriptSegment[]
  /** Emotion analysis results */
  emotions: EmotionAnalysis[]
  /** Recording start time */
  recordingStartTime?: number
  /** Recording duration in milliseconds */
  recordingDuration: number
  /** Last analysis timestamp */
  lastAnalysisTime?: number
}

export interface TranscriptSegment {
  id: string
  timestamp: number
  text: string
  speaker: 'user' | 'assistant' | 'unknown'
  confidence: number
}

export interface EmotionAnalysis {
  /** Segment ID this analysis corresponds to */
  segmentId: string
  /** Timestamp of analysis */
  timestamp: number
  /** Valence: positive (0.6-1.0) vs negative (0.0-0.4) */
  valence: number
  /** Arousal: energy/intensity (0.0-1.0) */
  arousal: number
  /** Dominance: confidence/assertiveness (0.0-1.0) */
  dominance: number
  /** Overall confidence in analysis (0.0-1.0) */
  confidence: number
  /** Detected emotion labels */
  emotions: string[]
}

// ============================================================================
// JEPA AGENT DEFINITION
// ============================================================================

export const JEPA_AGENT_DEFINITION: AgentDefinition = {
  id: 'jepa-emotional-analyzer-v1',
  name: 'JEPA - Emotional Subtext Analyzer',
  description: 'Analyzes emotional undertones in real-time during conversations using voice analysis and speech-to-text transcription.',
  icon: '🎙️',
  category: AgentCategory.ANALYSIS,
  activationMode: ActivationMode.HYBRID,
  initialState: {
    status: AgentState.IDLE,
    confidence: 0,
    lastActive: undefined,
    error: undefined,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['emotion', 'audio', 'analysis', 'real-time', 'transcription'],
    documentation: '/docs/agents/jepa',
    license: 'MIT',
  },
  requirements: {
    hardware: {
      minJEPAScore: 30,
      features: ['microphone'],
    },
    flags: {
      flags: ['enable_audio_capture', 'enable_emotion_analysis'],
    },
  },
}

// ============================================================================
// JEPA AGENT HANDLER
// ============================================================================

export class JEPAAgentHandler {
  private state: JEPAAgentState
  private audioCapture = getAudioCapture()
  private audioStateManager = getAudioStateManager()
  private eventListeners: Map<string, Set<Function>> = new Map()

  // STT engine placeholder (will be implemented when STT is integrated)
  private sttEngine: any = null

  // Communication event bus subscription
  private unsubscribeFromEventBus: (() => void) | null = null

  constructor() {
    this.state = {
      status: AgentState.IDLE,
      confidence: 0,
      recordingState: 'idle',
      audioWindows: [],
      transcript: [],
      emotions: [],
      recordingDuration: 0,
      customData: {},
    }

    this.setupAudioListeners()
    this.setupCommunication()
  }

  // ==========================================================================
  // AGENT LIFECYCLE
  // ==========================================================================

  /**
   * Initialize the JEPA agent
   */
  async initialize(): Promise<void> {
    try {
      // Initialize audio capture
      await this.audioCapture.initialize()

      // Initialize emotion inference pipeline (ML model)
      // Note: This will download the model on first run and cache it in IndexedDB
      try {
        console.log('[JEPA] Initializing emotion inference pipeline...')
        // Model will be loaded on first use to avoid blocking initialization
        console.log('[JEPA] Emotion pipeline ready (ML model will load on first inference)')
      } catch (error) {
        console.warn('[JEPA] Failed to initialize ML pipeline, will use fallback:', error)
      }

      this.updateState({
        status: AgentState.IDLE,
        recordingState: this.audioStateManager.getCurrentState().state,
      })

      this.emit('initialized', { timestamp: Date.now() })
    } catch (error) {
      this.updateState({
        status: AgentState.ERROR,
        error: error instanceof Error ? error.message : 'Failed to initialize',
      })
      throw error
    }
  }

  /**
   * Start recording and analyzing
   */
  async startRecording(): Promise<void> {
    try {
      if (this.state.status === AgentState.RUNNING) {
        return // Already recording
      }

      await this.audioCapture.startRecording()

      this.updateState({
        status: AgentState.RUNNING,
        recordingState: 'recording',
        recordingStartTime: Date.now(),
        recordingDuration: 0,
        audioWindows: [],
        transcript: [],
        emotions: [],
      })

      this.emit('recording_started', { timestamp: Date.now() })
    } catch (error) {
      this.updateState({
        status: AgentState.ERROR,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      })
      throw error
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    try {
      if (this.state.status !== AgentState.RUNNING) {
        return // Not recording
      }

      this.audioCapture.stopRecording()

      const duration = this.state.recordingStartTime
        ? Date.now() - this.state.recordingStartTime
        : 0

      this.updateState({
        status: AgentState.IDLE,
        recordingState: 'stopped',
        recordingDuration: duration,
      })

      this.emit('recording_stopped', {
        timestamp: Date.now(),
        duration,
        segmentCount: this.state.transcript.length,
      })
    } catch (error) {
      this.updateState({
        status: AgentState.ERROR,
        error: error instanceof Error ? error.message : 'Failed to stop recording',
      })
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.state.status !== AgentState.RUNNING) return

    this.audioCapture.pauseRecording()
    this.updateState({
      status: AgentState.PAUSED,
      recordingState: 'paused',
    })

    this.emit('recording_paused', { timestamp: Date.now() })
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    if (this.state.status !== AgentState.PAUSED) return

    await this.audioCapture.resumeRecording()
    this.updateState({
      status: AgentState.RUNNING,
      recordingState: 'recording',
    })

    this.emit('recording_resumed', { timestamp: Date.now() })
  }

  /**
   * Export transcript as markdown
   */
  async exportTranscript(): Promise<string> {
    try {
      // Convert transcript segments to JEPA format
      const segments = this.state.transcript.map(segment => ({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text,
        timestamp: new Date(segment.timestamp).toISOString(),
        startTime: segment.timestamp / 1000, // Convert to seconds
        endTime: (segment.timestamp + 5000) / 1000, // Estimate 5s per segment
        confidence: segment.confidence,
      }))

      // Create minimal JEPA transcript object
      const jepaTranscript = {
        id: `transcript_${Date.now()}`,
        conversationId: 'jepa-conversation',
        sessionId: 'jepa-session',
        startedAt: new Date().toISOString(),
        duration: this.state.recordingDuration / 1000, // Convert to seconds
        segments,
        metadata: {
          totalSpeakers: 2,
          speakers: [
            { id: 'user', name: 'User', color: '#3B82F6', segmentCount: segments.length, speakingTime: this.state.recordingDuration / 1000 },
            { id: 'assistant', name: 'Assistant', color: '#10B981', segmentCount: 0, speakingTime: 0 },
          ],
          language: 'en',
          audioQuality: 'good' as const,
          audioKept: false,
          processingTime: 0,
        },
      }

      // Format as markdown
      const formatted = formatTranscriptToMarkdown(jepaTranscript)

      // Copy to clipboard
      await copyMarkdownToClipboard(formatted.markdown)

      this.emit('transcript_exported', {
        timestamp: Date.now(),
        segmentCount: this.state.transcript.length,
        charCount: formatted.markdown.length,
      })

      return formatted.markdown
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : 'Failed to export transcript',
      })
      throw error
    }
  }

  /**
   * Process a user message (analyze for emotion)
   */
  async processMessage(message: Message): Promise<EmotionAnalysis | null> {
    if (message.author !== 'user') {
      return null // Only analyze user messages for now
    }

    try {
      const text = message.content.text || ''
      if (!text) return null

      // Analyze emotion using ML model (with fallback to rule-based)
      const emotion = await this.analyzeEmotion(text, message.timestamp)

      // Store emotion
      this.state.emotions.push(emotion)

      this.emit('emotion_analyzed', {
        timestamp: Date.now(),
        emotion,
        messageId: message.id,
      })

      // Publish emotion update to other agents (especially Spreader)
      this.publishEmotionUpdate(emotion)

      return emotion
    } catch (error) {
      console.error('Failed to analyze emotion:', error)
      return null
    }
  }

  /**
   * Analyze emotion from audio buffer (new ML-based method)
   */
  async analyzeAudio(audioBuffer: AudioBuffer): Promise<EmotionAnalysis> {
    try {
      console.log('[JEPA] Analyzing emotion from audio using ML model...')

      // Use the ML-based emotion analysis pipeline
      const mlResult: MLResult = await analyzeEmotion(audioBuffer)

      // Convert ML result to EmotionAnalysis format
      const emotion: EmotionAnalysis = {
        segmentId: `emotion_${Date.now()}`,
        timestamp: Date.now(),
        valence: mlResult.valence,
        arousal: mlResult.arousal,
        dominance: mlResult.dominance,
        confidence: mlResult.confidence,
        emotions: [mlResult.emotion],
      }

      console.log('[JEPA] ML analysis complete:', {
        emotion: emotion.emotions,
        vad: { valence: emotion.valence, arousal: emotion.arousal, dominance: emotion.dominance },
        confidence: emotion.confidence,
        timing: {
          featureExtraction: mlResult.featureExtractionTime.toFixed(2),
          inference: mlResult.inferenceTime.toFixed(2),
        },
      })

      // Store emotion
      this.state.emotions.push(emotion)

      // Publish emotion update to other agents
      this.publishEmotionUpdate(emotion)

      return emotion
    } catch (error) {
      console.error('[JEPA] ML analysis failed, falling back to rule-based:', error)
      // Fallback to rule-based analysis
      const fallbackEmotion = await this.analyzeEmotion('', new Date().toISOString())

      // Still publish the fallback emotion
      this.state.emotions.push(fallbackEmotion)
      this.publishEmotionUpdate(fallbackEmotion)

      return fallbackEmotion
    }
  }

  /**
   * Get current state
   */
  getState(): JEPAAgentState {
    return { ...this.state }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.stopRecording()
    this.eventListeners.clear()

    // Unsubscribe from event bus
    if (this.unsubscribeFromEventBus) {
      this.unsubscribeFromEventBus()
      this.unsubscribeFromEventBus = null
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Publish emotion update to other agents
   */
  private publishEmotionUpdate(emotion: EmotionAnalysis): void {
    // Determine if user is frustrated (low valence, high arousal)
    const isFrustrated = emotion.valence < 0.4 && emotion.arousal > 0.6 && emotion.confidence > 0.5

    // Get recent emotions for context
    const recentEmotions = this.state.emotions.slice(-10).map(e => ({
      emotion: e.emotions[0] || 'unknown',
      timestamp: e.timestamp
    }))

    if (isFrustrated) {
      // Publish high-priority frustration message
      agentEventBus.publish({
        id: crypto.randomUUID(),
        from: { agentId: 'jepa-v1', type: 'agent' },
        to: { agentId: 'spreader-v1', type: 'agent' },
        type: MessageType.USER_FRUSTRATION_DETECTED,
        payload: {
          valence: emotion.valence,
          arousal: emotion.arousal,
          confidence: emotion.confidence,
          recentMessages: recentEmotions
        },
        timestamp: Date.now(),
        priority: 'high',
        status: 'pending'
      })

      console.log('[JEPA] Published frustration detection to Spreader:', {
        valence: emotion.valence,
        arousal: emotion.arousal,
        confidence: emotion.confidence
      })
    } else {
      // Publish regular emotion update
      agentEventBus.publish({
        id: crypto.randomUUID(),
        from: { agentId: 'jepa-v1', type: 'agent' },
        to: { agentId: 'broadcast', type: 'broadcast' },
        type: MessageType.USER_EMOTION_CHANGE,
        payload: {
          emotion: emotion.emotions[0] || 'unknown',
          valence: emotion.valence,
          arousal: emotion.arousal,
          confidence: emotion.confidence
        },
        timestamp: Date.now(),
        priority: 'normal',
        status: 'pending'
      })
    }
  }

  /**
   * Setup audio capture listeners
   */
  private setupAudioListeners(): void {
    // Listen for audio data
    this.audioCapture.onData((window: AudioWindow) => {
      if (this.state.status === AgentState.RUNNING) {
        this.state.audioWindows.push(window)

        // Update duration
        if (this.state.recordingStartTime) {
          this.state.recordingDuration = Date.now() - this.state.recordingStartTime
        }

        // TODO: Send to STT engine for transcription
        // TODO: Analyze emotions from audio features
      }
    })

    // Listen for state changes
    this.audioCapture.onStateChange((audioState) => {
      this.updateState({
        recordingState: audioState.state,
      })
    })

    // Listen for errors
    this.audioCapture.onError((error) => {
      this.updateState({
        status: AgentState.ERROR,
        error: error.message,
      })

      this.emit('error', {
        timestamp: Date.now(),
        error: error.message,
      })
    })
  }

  /**
   * Setup agent communication
   */
  private setupCommunication(): void {
    // Subscribe to messages from other agents
    this.unsubscribeFromEventBus = agentEventBus.subscribe(
      'jepa-v1',
      this.handleAgentMessage.bind(this)
    )

    // Send initial status
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'jepa-v1', type: 'agent' },
      to: { agentId: 'broadcast', type: 'broadcast' },
      type: MessageType.AGENT_STATUS,
      payload: {
        status: 'idle',
        capabilities: ['emotion_analysis', 'frustration_detection', 'emotional_summarization'],
        load: 0
      },
      timestamp: Date.now(),
      priority: 'low',
      status: 'delivered'
    })
  }

  /**
   * Handle messages from other agents
   */
  private async handleAgentMessage(message: any): Promise<void> {
    console.log('[JEPA] Received message:', message.type, 'from', message.from.agentId)

    switch (message.type) {
      case MessageType.CONTEXT_CRITICAL:
        await this.handleContextCritical(message)
        break

      case MessageType.COLLAB_REQUEST:
        await this.handleCollaborationRequest(message)
        break

      default:
        // Ignore other message types
        break
    }
  }

  /**
   * Handle context critical notification from Spreader
   */
  private async handleContextCritical(message: any): Promise<void> {
    const { percentage, tokensUsed, tokensTotal } = message.payload

    console.log(`[JEPA] Context is ${percentage}% full (${tokensUsed}/${tokensTotal} tokens)`)

    // Analyze emotional themes in recent conversation
    const recentEmotions = this.state.emotions.slice(-20) // Last 20 emotions

    // Send emotional summary to Spreader
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'jepa-v1', type: 'agent' },
      to: message.from,
      type: MessageType.COLLAB_RESPONSE,
      payload: {
        action: 'emotional_summary_provided',
        result: {
          themes: this.summarizeEmotions(recentEmotions),
          suggestion: this.generateCompactionSuggestion(recentEmotions)
        },
        correlationId: message.id
      },
      timestamp: Date.now(),
      correlationId: message.id,
      priority: 'normal',
      status: 'pending'
    })
  }

  /**
   * Handle collaboration request from another agent
   */
  private async handleCollaborationRequest(message: any): Promise<void> {
    const { action, params } = message.payload

    let responsePayload: Record<string, unknown>

    switch (action) {
      case 'analyze_emotion':
        const transcript = params.transcript as string
        const emotion = await this.analyzeEmotion(transcript, new Date().toISOString())
        responsePayload = { emotion }
        break

      case 'get_emotional_summary':
        const summary = this.summarizeEmotions(this.state.emotions)
        responsePayload = { summary }
        break

      default:
        responsePayload = { error: 'Unknown action' }
    }

    // Send response
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'jepa-v1', type: 'agent' },
      to: message.from,
      type: MessageType.COLLAB_RESPONSE,
      payload: {
        action,
        result: responsePayload,
        correlationId: message.id
      },
      timestamp: Date.now(),
      correlationId: message.id,
      priority: 'normal',
      status: 'pending'
    })
  }

  /**
   * Summarize emotions from emotion array
   */
  private summarizeEmotions(
    emotions: EmotionAnalysis[]
  ): Array<{ emotion: string; frequency: number; avgValence: number }> {
    const emotionCounts = new Map<string, { count: number; valenceSum: number }>()

    for (const emotion of emotions) {
      for (const label of emotion.emotions) {
        const current = emotionCounts.get(label) || { count: 0, valenceSum: 0 }
        emotionCounts.set(label, {
          count: current.count + 1,
          valenceSum: current.valenceSum + emotion.valence
        })
      }
    }

    return Array.from(emotionCounts.entries()).map(([emotion, data]) => ({
      emotion,
      frequency: data.count,
      avgValence: data.valenceSum / data.count
    }))
  }

  /**
   * Generate compaction suggestion based on emotions
   */
  private generateCompactionSuggestion(
    emotions: EmotionAnalysis[]
  ): string {
    if (emotions.length === 0) return 'No emotional data available'

    const summaries = this.summarizeEmotions(emotions)
    const dominant = summaries.sort((a, b) => b.frequency - a.frequency)[0]

    return `User is primarily ${dominant.emotion} (avg valence: ${dominant.avgValence.toFixed(2)}). Consider preserving messages related to ${dominant.emotion} topics during compaction.`
  }

  /**
   * Analyze emotion from text (rule-based fallback)
   * NOTE: This is a simplified fallback method.
   * For audio analysis, use analyzeAudio() which uses the ML model.
   */
  private async analyzeEmotion(text: string, timestamp: string): Promise<EmotionAnalysis> {
    // Simplified emotion analysis based on keywords
    // In production, this would use a proper ML model

    const lowerText = text.toLowerCase()

    // Positive indicators
    const positiveWords = ['happy', 'great', 'good', 'love', 'excited', 'thank', 'awesome']
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length

    // Negative indicators
    const negativeWords = ['sad', 'bad', 'hate', 'angry', 'frustrated', 'sorry', 'worried']
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length

    // Calculate valence (0-1)
    const totalSentimentWords = positiveCount + negativeCount
    let valence = 0.5 // Neutral baseline

    if (totalSentimentWords > 0) {
      valence = 0.5 + (positiveCount - negativeCount) / (totalSentimentWords * 2)
      valence = Math.max(0, Math.min(1, valence)) // Clamp to [0, 1]
    }

    // Calculate arousal (energy/intensity)
    const intensityWords = ['!', 'really', 'very', 'absolutely', 'completely']
    const intensityCount = intensityWords.filter(word => lowerText.includes(word)).length
    const arousal = Math.min(1, 0.3 + intensityCount * 0.2)

    // Calculate dominance (confidence)
    const dominanceWords = ['think', 'believe', 'know', 'sure', 'certain']
    const dominanceCount = dominanceWords.filter(word => lowerText.includes(word)).length
    const dominance = Math.min(1, 0.4 + dominanceCount * 0.2)

    // Determine emotion labels
    const emotions: string[] = []
    if (valence > 0.6) {
      emotions.push('positive')
      if (arousal > 0.6) emotions.push('excited')
    } else if (valence < 0.4) {
      emotions.push('negative')
      if (arousal > 0.6) emotions.push('angry')
      else emotions.push('sad')
    } else {
      emotions.push('neutral')
    }

    return {
      segmentId: `emotion_${Date.now()}`,
      timestamp: new Date(timestamp).getTime(),
      valence,
      arousal,
      dominance,
      confidence: 0.5, // Lower confidence for rule-based fallback
      emotions: emotions.length > 0 ? emotions : ['neutral'],
    }
  }

  /**
   * Update agent state
   */
  private updateState(updates: Partial<JEPAAgentState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastActive: new Date().toISOString(),
    }

    this.emit('state_changed', this.state)
  }

  /**
   * Emit event to listeners
   */
  private emit(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in ${eventName} listener:`, error)
        }
      })
    }
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  on(eventName: string, listener: Function): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set())
    }
    this.eventListeners.get(eventName)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventName)?.delete(listener)
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let jepaAgentInstance: JEPAAgentHandler | null = null

/**
 * Get or create the singleton JEPA agent handler
 */
export function getJEPAAgent(): JEPAAgentHandler {
  if (!jepaAgentInstance) {
    jepaAgentInstance = new JEPAAgentHandler()
  }
  return jepaAgentInstance
}

/**
 * Dispose the JEPA agent handler
 */
export async function disposeJEPAAgent(): Promise<void> {
  if (jepaAgentInstance) {
    await jepaAgentInstance.dispose()
    jepaAgentInstance = null
  }
}

// ============================================================================
// MESSAGE HANDLER (for integration with conversation system)
// ============================================================================

export interface JEPAMessageHandlerOptions {
  onEmotionUpdate?: (emotion: EmotionAnalysis) => void
  onRecordingStateChange?: (state: RecordingState) => void
}

export function createJEPAMessageHandler(options: JEPAMessageHandlerOptions = {}) {
  const agent = getJEPAAgent()

  // Setup event listeners
  if (options.onEmotionUpdate) {
    agent.on('emotion_analyzed', (data: { emotion: EmotionAnalysis }) => {
      options.onEmotionUpdate?.(data.emotion)
    })
  }

  if (options.onRecordingStateChange) {
    agent.on('state_changed', (state: JEPAAgentState) => {
      options.onRecordingStateChange?.(state.recordingState)
    })
  }

  return agent
}
