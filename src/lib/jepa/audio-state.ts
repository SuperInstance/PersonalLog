/**
 * JEPA - Audio State Management
 *
 * Manages recording state, transitions, and error handling for audio capture.
 */

import { RecordingState, AudioState, AudioCaptureError, AudioErrorCode } from './types'

// ============================================================================
// AUDIO STATE MANAGER
// ============================================================================

export class AudioStateManager {
  private state: RecordingState = 'idle'
  private error: string | undefined
  private permissionsGranted: boolean = false
  private recordingDuration: number = 0
  private bufferedWindows: number = 0
  private stateListeners: Set<(state: AudioState) => void> = new Set()

  // Duration tracking
  private startTime: number = 0
  private durationInterval: ReturnType<typeof setInterval> | null = null

  // ==========================================================================
  // STATE GETTERS
  // ==========================================================================

  getCurrentState(): AudioState {
    return {
      state: this.state,
      error: this.error,
      permissionsGranted: this.permissionsGranted,
      duration: this.recordingDuration,
      bufferSize: this.bufferedWindows,
    }
  }

  isRecording(): boolean {
    return this.state === 'recording'
  }

  isReady(): boolean {
    return this.state === 'ready' || this.state === 'recording'
  }

  canRecord(): boolean {
    return this.permissionsGranted && (this.state === 'idle' || this.state === 'ready' || this.state === 'stopped')
  }

  // ==========================================================================
  // STATE TRANSITIONS
  // ==========================================================================

  /**
   * Transition to requesting state (when asking for permissions)
   */
  toRequesting(): void {
    this.transitionTo('requesting')
  }

  /**
   * Transition to ready state (permissions granted)
   */
  toReady(): void {
    this.permissionsGranted = true
    this.error = undefined
    this.transitionTo('ready')
  }

  /**
   * Transition to recording state
   */
  toRecording(): void {
    this.error = undefined
    this.transitionTo('recording')
    this.startDurationTracking()
  }

  /**
   * Transition to paused state
   */
  toPaused(): void {
    this.transitionTo('paused')
    this.stopDurationTracking()
  }

  /**
   * Resume from paused to recording
   */
  resume(): void {
    if (this.state !== 'paused') {
      throw new AudioCaptureError(
        'Cannot resume: not in paused state',
        'INVALID_CONFIG'
      )
    }
    this.toRecording()
  }

  /**
   * Transition to stopped state
   */
  toStopped(): void {
    this.transitionTo('stopped')
    this.stopDurationTracking()
  }

  /**
   * Transition to error state
   */
  toError(error: string, errorCode: AudioErrorCode): void {
    this.error = error
    this.transitionTo('error')
    this.stopDurationTracking()
    throw new AudioCaptureError(error, errorCode)
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.stopDurationTracking()
    this.state = 'idle'
    this.error = undefined
    this.recordingDuration = 0
    this.bufferedWindows = 0
    this.notifyListeners()
  }

  // ==========================================================================
  // STATE UPDATE HELPERS
  // ==========================================================================

  /**
   * Update the buffered window count
   */
  updateBufferCount(count: number): void {
    this.bufferedWindows = count
    this.notifyListeners()
  }

  /**
   * Increment the buffered window count
   */
  incrementBufferCount(): void {
    this.bufferedWindows++
    this.notifyListeners()
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private transitionTo(newState: RecordingState): void {
    const oldState = this.state

    // Validate state transitions
    const validTransitions: Record<RecordingState, RecordingState[]> = {
      idle: ['requesting', 'error'],
      requesting: ['ready', 'error'],
      ready: ['recording', 'idle', 'error'],
      recording: ['paused', 'stopped', 'error'],
      paused: ['recording', 'stopped', 'idle'],
      stopped: ['ready', 'idle', 'error'],
      error: ['idle', 'requesting'],
    }

    if (!validTransitions[oldState]?.includes(newState)) {
      throw new AudioCaptureError(
        `Invalid state transition: ${oldState} → ${newState}`,
        'INVALID_CONFIG'
      )
    }

    this.state = newState
    this.notifyListeners()
  }

  private startDurationTracking(): void {
    this.startTime = Date.now()
    this.recordingDuration = 0

    if (this.durationInterval) {
      clearInterval(this.durationInterval)
    }

    this.durationInterval = setInterval(() => {
      this.recordingDuration = Date.now() - this.startTime
      this.notifyListeners()
    }, 100) // Update every 100ms
  }

  private stopDurationTracking(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }
  }

  private notifyListeners(): void {
    const currentState = this.getCurrentState()
    this.stateListeners.forEach(listener => {
      try {
        listener(currentState)
      } catch (error) {
        console.error('Error in state listener:', error)
      }
    })
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: AudioState) => void): () => void {
    this.stateListeners.add(callback)

    // Immediately call with current state
    callback(this.getCurrentState())

    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(callback)
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.stateListeners.clear()
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let stateManagerInstance: AudioStateManager | null = null

export function getAudioStateManager(): AudioStateManager {
  if (!stateManagerInstance) {
    stateManagerInstance = new AudioStateManager()
  }
  return stateManagerInstance
}

export function resetAudioStateManager(): void {
  if (stateManagerInstance) {
    stateManagerInstance.removeAllListeners()
    stateManagerInstance.reset()
  }
  stateManagerInstance = null
}
