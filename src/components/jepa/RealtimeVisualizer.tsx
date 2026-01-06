/**
 * JEPA - Realtime Visualizer Component
 *
 * Live waveform visualization during audio recording.
 * Uses Web Audio API analyser node for real-time data.
 */

'use client'

import { useRef, useEffect, useState } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface RealtimeVisualizerProps {
  /** Whether currently recording */
  isRecording: boolean

  /** Canvas width (default: 400) */
  width?: number

  /** Canvas height (default: 100) */
  height?: number

  /** Visualization type (default: 'waveform') */
  type?: 'waveform' | 'frequency' | 'both'

  /** Additional CSS classes */
  className?: string

  /** Waveform color (default: #3b82f6) */
  waveColor?: string

  /** Background color (default: #1f2937) */
  backgroundColor?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RealtimeVisualizer({
  isRecording,
  width = 400,
  height = 100,
  type = 'waveform',
  className = '',
  waveColor = '#3b82f6',
  backgroundColor = '#1f2937',
}: RealtimeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize audio context and analyser
  useEffect(() => {
    if (!isRecording) {
      // Cleanup when not recording
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }
      analyserRef.current = null
      dataArrayRef.current = null
      setIsInitialized(false)
      return
    }

    // Initialize audio context
    let audioContext: AudioContext | null = null
    let stream: MediaStream | null = null

    const initialize = async () => {
      try {
        // Get microphone stream
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // Create audio context
        audioContext = new AudioContext({ sampleRate: 44100 })

        // Create analyser
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0.8

        // Connect source
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        // Store references
        analyserRef.current = analyser
        sourceRef.current = source

        // Create data array
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        dataArrayRef.current = dataArray

        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize realtime visualizer:', error)
      }
    }

    initialize()

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isRecording])

  // Animation loop
  useEffect(() => {
    if (!isInitialized || !isRecording || !analyserRef.current || !dataArrayRef.current) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current

    const draw = () => {
      if (!isRecording) return

      animationRef.current = requestAnimationFrame(draw)

      // Clear canvas
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (type === 'waveform' || type === 'both') {
        // Get time domain data (waveform)
        const waveformArray = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(waveformArray)

        // Draw waveform
        ctx.lineWidth = 2
        ctx.strokeStyle = waveColor
        ctx.beginPath()

        const sliceWidth = canvas.width * 1.0 / waveformArray.length
        let x = 0

        for (let i = 0; i < waveformArray.length; i++) {
          const v = waveformArray[i] / 128.0
          const y = (v * canvas.height) / 2

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }

          x += sliceWidth
        }

        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
      }

      if (type === 'frequency' || type === 'both') {
        // Get frequency data
        const frequencyArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(frequencyArray)

        // Draw frequency bars
        const barWidth = (canvas.width / frequencyArray.length) * 2.5
        let barX = 0

        for (let i = 0; i < frequencyArray.length; i++) {
          const barHeight = (frequencyArray[i] / 255) * canvas.height

          // Color based on frequency
          const hue = (i / frequencyArray.length) * 360
          ctx.fillStyle = `hsl(${hue}, 70%, 50%)`

          if (type === 'both') {
            // Draw at bottom when showing both
            ctx.fillRect(barX, canvas.height - barHeight, barWidth, barHeight)
          } else {
            // Draw from top when only frequency
            ctx.fillRect(barX, canvas.height - barHeight, barWidth, barHeight)
          }

          barX += barWidth + 1
        }
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isInitialized, isRecording, type, waveColor, backgroundColor])

  if (!isRecording) {
    return null
  }

  return (
    <div className={`realtime-visualizer ${className}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-lg border border-slate-200 dark:border-slate-700"
        />

        {/* Recording indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-500 font-medium">LIVE</span>
        </div>
      </div>

      {/* Type label */}
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
        {type === 'waveform' && 'Waveform'}
        {type === 'frequency' && 'Frequency Spectrum'}
        {type === 'both' && 'Waveform + Frequency'}
      </div>
    </div>
  )
}

// ============================================================================
// COMPACT REALTIME VISUALIZER
// ============================================================================

export interface CompactRealtimeVisualizerProps {
  /** Whether currently recording */
  isRecording: boolean

  /** Visualization type (default: 'waveform') */
  type?: 'waveform' | 'frequency'

  /** Additional CSS classes */
  className?: string
}

/**
 * Compact version for embedding in small spaces
 */
export function CompactRealtimeVisualizer({
  isRecording,
  type = 'waveform',
  className = '',
}: CompactRealtimeVisualizerProps) {
  return (
    <RealtimeVisualizer
      isRecording={isRecording}
      width={200}
      height={60}
      type={type}
      className={className}
      waveColor="#10b981"
      backgroundColor="transparent"
    />
  )
}
