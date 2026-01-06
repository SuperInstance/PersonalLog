/**
 * JEPA Audio Capture Test Page
 *
 * Demo page for testing the audio capture functionality.
 */

'use client'

import { useState } from 'react'
import { AudioControls } from '@/components/jepa/AudioControls'
import { AudioWindow, AudioState } from '@/lib/jepa/types'

export default function JEPATestPage() {
  const [windows, setWindows] = useState<AudioWindow[]>([])
  const [latestWindow, setLatestWindow] = useState<AudioWindow | null>(null)
  const [audioState, setAudioState] = useState<AudioState | null>(null)

  const handleData = (window: AudioWindow) => {
    setLatestWindow(window)
    setWindows(prev => [...prev, window])
  }

  const handleStateChange = (state: AudioState) => {
    setAudioState(state)
  }

  const handleComplete = (completedWindows: AudioWindow[], duration: number) => {
    // eslint-disable-next-line no-console
    console.log('Recording complete:', {
      windowCount: completedWindows.length,
      duration,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            JEPA Audio Capture Test
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Test the audio capture system with microphone recording, buffering in 64ms windows.
          </p>
        </div>

        {/* Audio Controls */}
        <AudioControls
          onData={handleData}
          onStateChange={handleStateChange}
          onComplete={handleComplete}
          showTimer
          showLevel
        />

        {/* State Display */}
        {audioState && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Recording State
            </h2>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">State:</span>
                <span className="text-slate-900 dark:text-slate-100">{audioState.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Permissions Granted:</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {audioState.permissionsGranted ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Duration:</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {(audioState.duration / 1000).toFixed(2)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Buffered Windows:</span>
                <span className="text-slate-900 dark:text-slate-100">{audioState.bufferSize}</span>
              </div>
              {audioState.error && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Error:</span>
                  <span>{audioState.error}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Latest Window Data */}
        {latestWindow && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Latest Audio Window
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Index:</span>
                <span className="text-slate-900 dark:text-slate-100 font-mono">
                  {latestWindow.index}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Timestamp:</span>
                <span className="text-slate-900 dark:text-slate-100 font-mono">
                  {latestWindow.timestamp}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Sample Count:</span>
                <span className="text-slate-900 dark:text-slate-100 font-mono">
                  {latestWindow.samples.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">First 10 Samples:</span>
                <span className="text-slate-900 dark:text-slate-100 font-mono text-xs">
                  {Array.from(latestWindow.samples.slice(0, 10))
                    .map(s => s.toFixed(4))
                    .join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {windows.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Session Statistics
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Total Windows:</span>
                <span className="ml-2 text-slate-900 dark:text-slate-100 font-mono text-lg">
                  {windows.length}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Total Duration:</span>
                <span className="ml-2 text-slate-900 dark:text-slate-100 font-mono text-lg">
                  {((windows.length * 64) / 1000).toFixed(2)}s
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Total Samples:</span>
                <span className="ml-2 text-slate-900 dark:text-slate-100 font-mono text-lg">
                  {(windows.length * 2822).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Estimated Size:</span>
                <span className="ml-2 text-slate-900 dark:text-slate-100 font-mono text-lg">
                  {((windows.length * 2822 * 4) / 1024).toFixed(2)} KB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to Test
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Click &quot;Enable Microphone&quot; and grant permission when prompted</li>
            <li>Click &quot;Start Recording&quot; to begin capturing audio</li>
            <li>Speak into your microphone and watch the audio level meter</li>
            <li>Observe the windows being captured (64ms each)</li>
            <li>Click &quot;Pause&quot; to pause recording</li>
            <li>Click &quot;Stop Recording&quot; to end the session</li>
            <li>Click &quot;Reset&quot; to clear all buffered data</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
