/**
 * JEPA - Audio Capture System
 *
 * Captures audio from the microphone using Web Audio API.
 * Buffers audio in 64ms windows for JEPA processing.
 */

import {
  AUDIO_CONFIG,
  AudioWindow,
  AudioDataCallback,
  RecordingStateCallback,
  ErrorCallback,
  AudioCaptureError,
  AudioErrorCode,
  MicrophoneDevice,
  createRecordingId,
  RecordingId,
} from './types'
import { AudioBuffer } from './audio-buffer'
import { getAudioStateManager } from './audio-state'

// ============================================================================
// AUDIO CAPTURE CLASS
// ============================================================================

export class AudioCapture {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private analyserNode: AnalyserNode | null = null

  private buffer: AudioBuffer
  private stateManager = getAudioStateManager()
  private recordingId: RecordingId | null = null

  // Temporary buffer for collecting samples
  private tempBuffer: Float32Array | null = null
  private tempBufferOffset: number = 0

  // Event listeners
  private onDataCallbacks: Set<AudioDataCallback> = new Set()
  private onErrorCallbacks: Set<ErrorCallback> = new Set()

  constructor() {
    this.buffer = new AudioBuffer(1500) // ~96 seconds of audio
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the audio system and request microphone permissions
   */
  async initialize(): Promise<void> {
    try {
      this.stateManager.toRequesting()

      // Check browser support
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        this.stateManager.toError(
          'Web Audio API is not supported in this browser',
          'UNSUPPORTED_BROWSER'
        )
        return
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          channelCount: AUDIO_CONFIG.CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      this.mediaStream = stream
      this.stateManager.toReady()

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          this.stateManager.toError(
            'Microphone permission denied',
            'PERMISSION_DENIED'
          )
        } else if (error.name === 'NotFoundError') {
          this.stateManager.toError(
            'No microphone found',
            'DEVICE_NOT_FOUND'
          )
        } else {
          this.stateManager.toError(
            `Failed to initialize audio: ${error.message}`,
            'INITIALIZATION_FAILED'
          )
        }
      }
    }
  }

  /**
   * Initialize AudioContext with optimal settings
   */
  private async initAudioContext(): Promise<void> {
    // Create AudioContext
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext
    this.audioContext = new AudioContextConstructor({
      sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
      latencyHint: 'interactive',
    })

    // Resume if suspended (some browsers require user gesture)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // Create source from media stream
    if (!this.mediaStream) {
      throw new AudioCaptureError('No media stream available', 'INITIALIZATION_FAILED')
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
  }

  // ==========================================================================
  // RECORDING CONTROL
  // ==========================================================================

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      if (!this.stateManager.canRecord()) {
        throw new AudioCaptureError(
          'Cannot start recording in current state',
          'INVALID_CONFIG'
        )
      }

      // Initialize audio context if needed
      if (!this.audioContext) {
        await this.initAudioContext()
      }

      // Prepare buffers
      this.buffer.start()
      this.recordingId = createRecordingId()
      this.tempBuffer = new Float32Array(AUDIO_CONFIG.BUFFER_WINDOW_SAMPLES)
      this.tempBufferOffset = 0

      // Setup audio processing
      await this.setupAudioProcessing()

      // Update state
      this.stateManager.toRecording()

    } catch (error) {
      if (error instanceof AudioCaptureError) {
        throw error
      }
      this.stateManager.toError(
        `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RECORDING_FAILED'
      )
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (!this.stateManager.isRecording()) {
      return
    }

    this.stateManager.toPaused()

    // Suspend audio context to pause processing
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend()
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    if (this.stateManager.getCurrentState().state !== 'paused') {
      return
    }

    // Resume audio context
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    this.stateManager.resume()
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.stateManager.isRecording() && this.stateManager.getCurrentState().state !== 'paused') {
      return
    }

    this.stateManager.toStopped()

    // Disconnect audio nodes
    this.cleanupAudioProcessing()
  }

  /**
   * Reset the recording system
   */
  reset(): void {
    this.stopRecording()
    this.buffer.clear()
    this.stateManager.reset()
    this.recordingId = null
    this.tempBuffer = null
    this.tempBufferOffset = 0
  }

  // ==========================================================================
  // AUDIO PROCESSING SETUP
  // ==========================================================================

  private async setupAudioProcessing(): Promise<void> {
    if (!this.audioContext || !this.sourceNode) {
      throw new AudioCaptureError('Audio context not initialized', 'INITIALIZATION_FAILED')
    }

    // Calculate buffer size for ScriptProcessor
    // We want ~64ms windows: 2822 samples at 44.1kHz
    // ScriptProcessor buffer size must be power of 2: 4096 is close
    const bufferSize = 4096

    try {
      // Create analyser for visualization
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 2048
      this.analyserNode.smoothingTimeConstant = 0.8

      // Try ScriptProcessorNode (more widely supported)
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        AUDIO_CONFIG.CHANNELS,
        AUDIO_CONFIG.CHANNELS
      )

      this.processorNode.onaudioprocess = (event) => {
        this.processAudioData(event.inputBuffer)
      }

      // Connect nodes: source -> analyser -> processor -> destination
      this.sourceNode.connect(this.analyserNode)
      this.analyserNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)

    } catch (error) {
      throw new AudioCaptureError(
        `Failed to setup audio processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_FAILED'
      )
    }
  }

  /**
   * Process incoming audio data
   */
  private processAudioData(inputBuffer: globalThis.AudioBuffer): void {
    if (!this.tempBuffer) return

    // Get mono channel data
    const inputData = inputBuffer.getChannelData(0)

    // Process samples and split into 64ms windows
    for (let i = 0; i < inputData.length; i++) {
      this.tempBuffer[this.tempBufferOffset] = inputData[i]
      this.tempBufferOffset++

      // When we have a full window, emit it
      if (this.tempBufferOffset >= AUDIO_CONFIG.BUFFER_WINDOW_SAMPLES) {
        // Create window
        const samples = new Float32Array(this.tempBuffer)
        const window: AudioWindow = {
          samples,
          timestamp: Date.now(),
          index: this.buffer.getWindowCount(),
        }

        // Add to buffer
        this.buffer.addWindow(samples)

        // Update state
        this.stateManager.incrementBufferCount()

        // Notify listeners
        this.notifyDataListeners(window)

        // Reset temp buffer
        this.tempBuffer = new Float32Array(AUDIO_CONFIG.BUFFER_WINDOW_SAMPLES)
        this.tempBufferOffset = 0
      }
    }
  }

  private cleanupAudioProcessing(): void {
    // Disconnect nodes
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
  }

  // ==========================================================================
  // DATA ACCESS
  // ==========================================================================

  /**
   * Get all buffered audio windows
   */
  getWindows(): AudioWindow[] {
    return this.buffer.getWindows()
  }

  /**
   * Get the current audio buffer
   */
  getBuffer(): AudioBuffer {
    return this.buffer
  }

  /**
   * Get the recording ID
   */
  getRecordingId(): RecordingId | null {
    return this.recordingId
  }

  /**
   * Get current audio level for visualization
   */
  getCurrentAudioLevel(): number {
    return this.buffer.getCurrentLevel()
  }

  /**
   * Get all audio levels for the entire recording
   */
  getAudioLevels() {
    return this.buffer.calculateLevels()
  }

  /**
   * Get the analyser node for visualization
   * Returns null if not currently recording or not initialized
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode
  }

  /**
   * Get current playback position in seconds
   */
  getCurrentPosition(): number {
    const state = this.stateManager.getCurrentState()
    return state.duration / 1000 // Convert ms to seconds
  }

  /**
   * Get total duration in seconds
   */
  getTotalDuration(): number {
    const windowCount = this.buffer.getWindowCount()
    return (windowCount * AUDIO_CONFIG.BUFFER_WINDOW_MS) / 1000
  }

  /**
   * Seek to a specific time position (for playback)
   * Note: This is for future playback functionality
   */
  seekTo(timeInSeconds: number): void {
    const totalDuration = this.getTotalDuration()

    if (timeInSeconds < 0 || timeInSeconds > totalDuration) {
      throw new AudioCaptureError(
        `Invalid seek position: ${timeInSeconds}s. Total duration: ${totalDuration}s`,
        'INVALID_CONFIG'
      )
    }

    // Calculate which window to seek to
    const targetWindow = Math.floor((timeInSeconds * 1000) / AUDIO_CONFIG.BUFFER_WINDOW_MS)

    // Update state manager to reflect seek position
    this.stateManager.updateDuration(Math.floor(timeInSeconds * 1000))

    // In a full implementation, this would:
    // 1. Move the playback head to the target window
    // 2. Update any audio playback nodes
    // 3. Notify listeners of position change
  }

  /**
   * Get audio windows for a specific time range
   * Useful for extracting features for emotion analysis
   */
  getWindowsInRange(startTime: number, endTime: number): AudioWindow[] {
    const allWindows = this.buffer.getWindows()
    const startWindow = Math.floor((startTime * 1000) / AUDIO_CONFIG.BUFFER_WINDOW_MS)
    const endWindow = Math.ceil((endTime * 1000) / AUDIO_CONFIG.BUFFER_WINDOW_MS)

    return allWindows.slice(startWindow, endWindow + 1)
  }

  // ==========================================================================
  // MICROPHONE DEVICES
  // ==========================================================================

  /**
   * Get list of available microphone devices
   */
  async getMicrophones(): Promise<MicrophoneDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          groupId: device.groupId,
        }))
    } catch (error) {
      console.error('Failed to enumerate microphones:', error)
      return []
    }
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  /**
   * Subscribe to audio data events (called for each 64ms window)
   */
  onData(callback: AudioDataCallback): () => void {
    this.onDataCallbacks.add(callback)
    return () => this.onDataCallbacks.delete(callback)
  }

  /**
   * Subscribe to error events
   */
  onError(callback: ErrorCallback): () => void {
    this.onErrorCallbacks.add(callback)
    return () => this.onErrorCallbacks.delete(callback)
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: RecordingStateCallback): () => void {
    return this.stateManager.onStateChange(callback)
  }

  private notifyDataListeners(window: AudioWindow): void {
    this.onDataCallbacks.forEach(callback => {
      try {
        callback(window)
      } catch (error) {
        console.error('Error in audio data callback:', error)
      }
    })
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.reset()

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close()
      this.audioContext = null
    }

    // Clear all listeners
    this.onDataCallbacks.clear()
    this.onErrorCallbacks.clear()
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let audioCaptureInstance: AudioCapture | null = null

/**
 * Get or create the singleton AudioCapture instance
 */
export function getAudioCapture(): AudioCapture {
  if (!audioCaptureInstance) {
    audioCaptureInstance = new AudioCapture()
  }
  return audioCaptureInstance
}

/**
 * Dispose the singleton AudioCapture instance
 */
export async function disposeAudioCapture(): Promise<void> {
  if (audioCaptureInstance) {
    await audioCaptureInstance.dispose()
    audioCaptureInstance = null
  }
}
