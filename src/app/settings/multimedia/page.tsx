'use client'

/**
 * Multi-Media Settings Page
 *
 * Configure multi-modal AI capabilities including images, audio, and video.
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Image as ImageIcon, Mic, Video, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { MultiModalSettings } from '@/lib/multimedia/types'

export default function MultimediaSettingsPage() {
  const [settings, setSettings] = useState<MultiModalSettings>({
    images: {
      generationEnabled: true,
      defaultProvider: 'dalle',
      defaultModel: 'dall-e-3',
      defaultSize: '1024x1024',
      maxFileSize: 10 * 1024 * 1024,
      autoGenerateCaptions: true,
    },
    audio: {
      recordingEnabled: true,
      transcriptionEnabled: true,
      generationEnabled: true,
      defaultVoice: 'alloy',
      defaultProvider: 'whisper',
      maxDuration: 300,
      autoTranscribe: true,
      keepAudio: false,
    },
    video: {
      uploadEnabled: true,
      transcriptionEnabled: true,
      maxFileSize: 100 * 1024 * 1024,
      autoTranscribe: true,
      generateThumbnails: true,
    },
    transcription: {
      enabled: true,
      defaultProvider: 'whisper',
      autoDetectLanguage: true,
      enableDiarization: false,
      includeTimestamps: true,
    },
  })

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('multimedia-settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('multimedia-settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateImageSettings = (key: keyof typeof settings.images, value: any) => {
    setSettings({
      ...settings,
      images: { ...settings.images, [key]: value },
    })
  }

  const updateAudioSettings = (key: keyof typeof settings.audio, value: any) => {
    setSettings({
      ...settings,
      audio: { ...settings.audio, [key]: value },
    })
  }

  const updateVideoSettings = (key: keyof typeof settings.video, value: any) => {
    setSettings({
      ...settings,
      video: { ...settings.video, [key]: value },
    })
  }

  const updateTranscriptionSettings = (key: keyof typeof settings.transcription, value: any) => {
    setSettings({
      ...settings,
      transcription: { ...settings.transcription, [key]: value },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Go back to settings"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Multi-Media Settings
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure images, audio, and video capabilities
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Image Settings */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Image Settings
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure image generation and processing
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Enable generation */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Enable Image Generation
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Allow AI to generate images from text descriptions
                </p>
              </div>
              <button
                onClick={() => updateImageSettings('generationEnabled', !settings.images.generationEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.images.generationEnabled
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.images.generationEnabled}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.images.generationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Provider */}
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 block">
                Default Provider
              </label>
              <select
                value={settings.images.defaultProvider}
                onChange={(e) => updateImageSettings('defaultProvider', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dalle">DALL-E (OpenAI)</option>
                <option value="stable-diffusion">Stable Diffusion</option>
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 block">
                Default Image Size
              </label>
              <select
                value={settings.images.defaultSize}
                onChange={(e) => updateImageSettings('defaultSize', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1024x1024">1024 x 1024 (Square)</option>
                <option value="1792x1024">1792 x 1024 (Landscape)</option>
                <option value="1024x1792">1024 x 1792 (Portrait)</option>
              </select>
            </div>

            {/* Auto-generate captions */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Auto-Generate Captions
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Use AI to describe images automatically
                </p>
              </div>
              <button
                onClick={() => updateImageSettings('autoGenerateCaptions', !settings.images.autoGenerateCaptions)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.images.autoGenerateCaptions
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.images.autoGenerateCaptions}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.images.autoGenerateCaptions ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Audio Settings */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Audio Settings
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure voice recording and text-to-speech
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Enable recording */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Enable Voice Recording
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Allow recording voice messages with speech-to-text
                </p>
              </div>
              <button
                onClick={() => updateAudioSettings('recordingEnabled', !settings.audio.recordingEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.audio.recordingEnabled
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.audio.recordingEnabled}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.audio.recordingEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Enable transcription */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Auto-Transcribe Audio
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Automatically transcribe voice messages
                </p>
              </div>
              <button
                onClick={() => updateAudioSettings('autoTranscribe', !settings.audio.autoTranscribe)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.audio.autoTranscribe
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.audio.autoTranscribe}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.audio.autoTranscribe ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Keep audio */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Keep Audio Files
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Save original audio after transcription
                </p>
              </div>
              <button
                onClick={() => updateAudioSettings('keepAudio', !settings.audio.keepAudio)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.audio.keepAudio
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.audio.keepAudio}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.audio.keepAudio ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Voice selection */}
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 block">
                Default Voice
              </label>
              <select
                value={settings.audio.defaultVoice}
                onChange={(e) => updateAudioSettings('defaultVoice', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>
          </div>
        </section>

        {/* Video Settings */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Video Settings
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure video upload and processing
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Enable uploads */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Enable Video Uploads
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Allow uploading and processing video files
                </p>
              </div>
              <button
                onClick={() => updateVideoSettings('uploadEnabled', !settings.video.uploadEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.video.uploadEnabled
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.video.uploadEnabled}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.video.uploadEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Auto-transcribe */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Auto-Transcribe Videos
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Generate transcripts for uploaded videos
                </p>
              </div>
              <button
                onClick={() => updateVideoSettings('autoTranscribe', !settings.video.autoTranscribe)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.video.autoTranscribe
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.video.autoTranscribe}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.video.autoTranscribe ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Generate thumbnails */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Generate Thumbnails
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create preview thumbnails for videos
                </p>
              </div>
              <button
                onClick={() => updateVideoSettings('generateThumbnails', !settings.video.generateThumbnails)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.video.generateThumbnails
                    ? 'bg-blue-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-pressed={settings.video.generateThumbnails}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.video.generateThumbnails ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Success message */}
        {saved && (
          <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
            Settings saved successfully!
          </div>
        )}
      </main>
    </div>
  )
}
