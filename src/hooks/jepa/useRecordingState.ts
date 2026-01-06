/**
 * JEPA useRecordingState Hook
 *
 * React hook for managing audio recording state.
 * Integrates with AudioStateManager for persistent state.
 *
 * @module hooks/jepa/useRecordingState
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AudioStateManager, getAudioStateManager } from '@/lib/jepa/audio-state'
import type { AudioState, RecordingState as RecordingStateType } from '@/lib/jepa/types'

export interface UseRecordingStateOptions {
  /**
   * Whether to automatically request microphone permission on mount
   * @default false
   */
  requestPermissionOnMount?: boolean

  /**
   * Callback when recording starts
   */
  onRecordingStart?: () => void

  /**
   * Callback when recording stops
   */
  onRecordingStop?: () => void

  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void
}

export interface UseRecordingStateReturn {
  /**
   * Current recording state
   */
  state: AudioState

  /**
   * Whether currently recording
   */
  isRecording: boolean

  /**
   * Whether currently paused
   */
  isPaused: boolean

  /**
   * Whether in error state
   */
  hasError: boolean

  /**
   * Whether microphone permission has been granted
   */
  hasPermission: boolean

  /**
   * Current error message (if any)
   */
  error: string | undefined

  /**
   * Current recording duration in milliseconds
   */
  duration: number

  /**
   * Start recording
   */
  startRecording: () => Promise<void>

  /**
   * Stop recording
   */
  stopRecording: () => void

  /**
   * Pause recording
   */
  pauseRecording: () => void

  /**
   * Resume recording
   */
  resumeRecording: () => void

  /**
   * Clear error and reset to idle
   */
  clearError: () => void

  /**
   * Reset all state
   */
  reset: () => void

  /**
   * Request microphone permission
   */
  requestPermission: () => Promise<boolean>
}

/**
 * Hook for managing audio recording state
 *
 * @example
 * ```tsx
 * function RecordingComponent() {
 *   const {
 *     state,
 *     isRecording,
 *     startRecording,
 *     stopRecording,
 *   } = useRecordingState()
 *
 *   return (
 *     <div>
 *       <RecordingStatus state={state.state} />
 *       <RecordingControls
 *         state={state.state}
 *         onStart={startRecording}
 *         onStop={stopRecording}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useRecordingState(
  options: UseRecordingStateOptions = {}
): UseRecordingStateReturn {
  const {
    requestPermissionOnMount = false,
    onRecordingStart,
    onRecordingStop,
    onError,
  } = options

  // State manager reference (uses singleton)
  const stateManagerRef = useRef<AudioStateManager | null>(null)

  // Local state
  const [audioState, setAudioState] = useState<AudioState>({
    state: 'idle',
    permissionsGranted: false,
    duration: 0,
    bufferSize: 0,
  })

  // Initialize state manager on mount
  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | null = null

    const initialize = async () => {
      try {
        // Get singleton state manager
        if (!stateManagerRef.current) {
          stateManagerRef.current = getAudioStateManager()
        }

        const manager = stateManagerRef.current

        // Subscribe to state changes
        if (mounted) {
          unsubscribe = manager.onStateChange((newState) => {
            setAudioState(newState)
          })
        }

        // Request permission on mount if requested
        if (requestPermissionOnMount && mounted) {
          await requestPermission()
        }
      } catch (error) {
        console.error('Failed to initialize recording state:', error)
        if (mounted) {
          setAudioState((prev) => ({
            ...prev,
            state: 'error',
            error: 'Failed to initialize recording system',
          }))
        }
      }
    }

    initialize()

    return () => {
      mounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [requestPermissionOnMount])

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Media devices not available')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Permission granted - stop the stream immediately
      stream.getTracks().forEach((track) => track.stop())

      const manager = stateManagerRef.current
      if (manager) {
        manager.toReady()
      }

      return true
    } catch (error) {
      console.error('Microphone permission denied:', error)

      const errorMessage =
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please grant access in your browser settings.'
          : 'Failed to access microphone. Please check your device settings.'

      setAudioState((prev) => ({
        ...prev,
        state: 'error',
        error: errorMessage,
      }))

      onError?.(errorMessage)

      return false
    }
  }, [onError])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const manager = stateManagerRef.current
      if (!manager) {
        throw new Error('State manager not initialized')
      }

      // Request permission if not granted
      if (!audioState.permissionsGranted) {
        const granted = await requestPermission()
        if (!granted) {
          return
        }
      }

      manager.toRecording()

      onRecordingStart?.()
    } catch (error) {
      console.error('Failed to start recording:', error)
      const errorMessage = 'Failed to start recording. Please try again.'

      setAudioState((prev) => ({
        ...prev,
        state: 'error',
        error: errorMessage,
      }))

      onError?.(errorMessage)
    }
  }, [audioState.permissionsGranted, requestPermission, onRecordingStart, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      const manager = stateManagerRef.current
      if (!manager) {
        throw new Error('State manager not initialized')
      }

      manager.toStopped()

      onRecordingStop?.()
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }, [onRecordingStop])

  // Pause recording
  const pauseRecording = useCallback(() => {
    try {
      const manager = stateManagerRef.current
      if (!manager) {
        throw new Error('State manager not initialized')
      }

      manager.toPaused()
    } catch (error) {
      console.error('Failed to pause recording:', error)
    }
  }, [])

  // Resume recording
  const resumeRecording = useCallback(() => {
    try {
      const manager = stateManagerRef.current
      if (!manager) {
        throw new Error('State manager not initialized')
      }

      manager.resume()
    } catch (error) {
      console.error('Failed to resume recording:', error)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    const manager = stateManagerRef.current
    if (manager) {
      manager.reset()
    }

    setAudioState({
      state: 'idle',
      permissionsGranted: audioState.permissionsGranted,
      duration: 0,
      bufferSize: 0,
    })
  }, [audioState.permissionsGranted])

  // Reset all state
  const reset = useCallback(() => {
    const manager = stateManagerRef.current
    if (manager) {
      manager.reset()
    }

    setAudioState({
      state: 'idle',
      permissionsGranted: false,
      duration: 0,
      bufferSize: 0,
    })
  }, [])

  return {
    state: audioState,
    isRecording: audioState.state === 'recording',
    isPaused: audioState.state === 'paused',
    hasError: audioState.state === 'error',
    hasPermission: audioState.permissionsGranted,
    error: audioState.error,
    duration: audioState.duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearError,
    reset,
    requestPermission,
  }
}
