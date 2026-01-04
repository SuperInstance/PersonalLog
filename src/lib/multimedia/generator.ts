/**
 * Media Generation Service
 *
 * Generates images, audio, and processes video using various AI providers.
 */

import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  AudioGenerationRequest,
  AudioGenerationResponse,
  TranscriptionRequest,
  TranscriptionResponse,
  VisionRequest,
  VisionResponse,
  MediaError,
  MediaErrorCode,
  Voice,
} from './types'

// ============================================================================
// IMAGE GENERATION (DALL-E)
// ============================================================================

export async function generateImage(
  request: ImageGenerationRequest,
  apiKey: string
): Promise<ImageGenerationResponse> {
  if (request.provider === 'dalle') {
    return generateImageDALLE(request, apiKey)
  } else if (request.provider === 'stable-diffusion') {
    return generateImageStableDiffusion(request, apiKey)
  } else {
    throw new MediaError('Unsupported image generation provider', 'UNSUPPORTED_MEDIA_TYPE')
  }
}

async function generateImageDALLE(
  request: ImageGenerationRequest,
  apiKey: string
): Promise<ImageGenerationResponse> {
  const model = request.model || 'dall-e-3'
  const size = request.size || '1024x1024'

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        n: request.numberOfImages || 1,
        size,
        quality: request.quality || 'standard',
        style: (request as any).style || 'vivid',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new MediaError(
        error.error?.message || 'DALL-E generation failed',
        'GENERATION_FAILED',
        error
      )
    }

    const data = await response.json()

    return {
      images: data.data.map((item: any) => ({
        url: item.url,
        revisedPrompt: item.revised_prompt,
      })),
      provider: 'dalle',
      model,
    }
  } catch (error) {
    if (error instanceof MediaError) throw error

    throw new MediaError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_ERROR'
    )
  }
}

async function generateImageStableDiffusion(
  request: ImageGenerationRequest,
  apiKey: string
): Promise<ImageGenerationResponse> {
  // Stable Diffusion API implementation
  // This would connect to Stability AI or a self-hosted SD instance

  try {
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: request.prompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: request.numberOfImages || 1,
      }),
    })

    if (!response.ok) {
      throw new MediaError('Stable Diffusion generation failed', 'GENERATION_FAILED')
    }

    const data = await response.json()

    return {
      images: data.artifacts.map((artifact: any) => ({
        url: `data:image/png;base64,${artifact.base64}`,
      })),
      provider: 'stable-diffusion',
      model: 'sdxl',
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('Stable Diffusion generation failed', 'GENERATION_FAILED')
  }
}

// ============================================================================
// AUDIO GENERATION (TEXT-TO-SPEECH)
// ============================================================================

export async function generateAudio(
  request: AudioGenerationRequest,
  apiKey: string
): Promise<AudioGenerationResponse> {
  if (request.provider === 'openai') {
    return generateAudioOpenAI(request, apiKey)
  } else if (request.provider === 'elevenlabs') {
    return generateAudioElevenLabs(request, apiKey)
  } else if (request.provider === 'google') {
    return generateAudioGoogle(request, apiKey)
  } else {
    throw new MediaError('Unsupported audio generation provider', 'UNSUPPORTED_MEDIA_TYPE')
  }
}

async function generateAudioOpenAI(
  request: AudioGenerationRequest,
  apiKey: string
): Promise<AudioGenerationResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: request.text,
        voice: request.voice,
        speed: request.speed || 1.0,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new MediaError(
        error.error?.message || 'OpenAI TTS failed',
        'GENERATION_FAILED',
        error
      )
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    // Get duration
    const duration = await getAudioDuration(audioUrl)

    return {
      audioUrl,
      duration,
      provider: 'openai',
      voice: request.voice,
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('OpenAI audio generation failed', 'GENERATION_FAILED')
  }
}

async function generateAudioElevenLabs(
  request: AudioGenerationRequest,
  apiKey: string
): Promise<AudioGenerationResponse> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${request.voice}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: request.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    })

    if (!response.ok) {
      throw new MediaError('ElevenLabs generation failed', 'GENERATION_FAILED')
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    const duration = await getAudioDuration(audioUrl)

    return {
      audioUrl,
      duration,
      provider: 'elevenlabs',
      voice: request.voice,
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('ElevenLabs audio generation failed', 'GENERATION_FAILED')
  }
}

async function generateAudioGoogle(
  request: AudioGenerationRequest,
  apiKey: string
): Promise<AudioGenerationResponse> {
  // Google Cloud Text-to-Speech implementation
  try {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: request.text },
        voice: {
          languageCode: 'en-US',
          name: request.voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: request.speed || 1.0,
        },
      }),
    })

    if (!response.ok) {
      throw new MediaError('Google TTS generation failed', 'GENERATION_FAILED')
    }

    const data = await response.json()
    const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3')
    const audioUrl = URL.createObjectURL(audioBlob)

    const duration = await getAudioDuration(audioUrl)

    return {
      audioUrl,
      duration,
      provider: 'google',
      voice: request.voice,
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('Google audio generation failed', 'GENERATION_FAILED')
  }
}

// ============================================================================
// AUDIO TRANSCRIPTION (SPEECH-TO-TEXT)
// ============================================================================

export async function transcribeAudio(
  request: TranscriptionRequest,
  apiKey: string
): Promise<TranscriptionResponse> {
  if (request.provider === 'whisper') {
    return transcribeAudioWhisper(request, apiKey)
  } else if (request.provider === 'google') {
    return transcribeAudioGoogle(request, apiKey)
  } else if (request.provider === 'deepgram') {
    return transcribeAudioDeepgram(request, apiKey)
  } else {
    throw new MediaError('Unsupported transcription provider', 'UNSUPPORTED_MEDIA_TYPE')
  }
}

async function transcribeAudioWhisper(
  request: TranscriptionRequest,
  apiKey: string
): Promise<TranscriptionResponse> {
  try {
    // Fetch the audio file
    const audioResponse = await fetch(request.audioUrl)
    const audioBlob = await audioResponse.blob()

    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')

    if (request.language) {
      formData.append('language', request.language)
    }

    if (request.timestamps) {
      // Whisper v1 doesn't support detailed timestamps in basic API
      // Would need to use verbose_json option
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new MediaError(
        error.error?.message || 'Whisper transcription failed',
        'TRANSCRIPTION_FAILED',
        error
      )
    }

    const data = await response.json()

    return {
      text: data.text,
      provider: 'whisper',
      language: data.language || request.language || 'en',
      duration: data.duration || 0,
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('Whisper transcription failed', 'TRANSCRIPTION_FAILED')
  }
}

async function transcribeAudioGoogle(
  request: TranscriptionRequest,
  apiKey: string
): Promise<TranscriptionResponse> {
  // Google Cloud Speech-to-Text implementation
  try {
    const audioResponse = await fetch(request.audioUrl)
    const audioContent = await audioResponse.blob()
    const audioBase64 = await blobToBase64(audioContent)

    const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: {
          content: audioBase64,
        },
        config: {
          encoding: 'WEBM_OPUS',
          languageCode: request.language || 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: request.timestamps,
          diarizationConfig: request.diarization
            ? {
                enableSpeakerDiarization: true,
                minSpeakerCount: 2,
                maxSpeakerCount: 6,
              }
            : undefined,
        },
      }),
    })

    if (!response.ok) {
      throw new MediaError('Google transcription failed', 'TRANSCRIPTION_FAILED')
    }

    const data = await response.json()

    // Combine all transcript segments
    const text = data.results
      ?.map((result: any) => result.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(' ') || ''

    const segments = data.results?.map((result: any) => {
      const alt = result.alternatives?.[0]
      return {
        text: alt.transcript,
        speaker: alt.words?.[0]?.speaker,
        startTime: alt.words?.[0]?.startTime?.seconds || 0,
        endTime: alt.words?.[alt.words.length - 1]?.endTime?.seconds || 0,
        confidence: alt.confidence || 0,
      }
    })

    return {
      text,
      provider: 'google',
      language: request.language || 'en',
      duration: 0,
      segments,
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('Google transcription failed', 'TRANSCRIPTION_FAILED')
  }
}

async function transcribeAudioDeepgram(
  request: TranscriptionRequest,
  apiKey: string
): Promise<TranscriptionResponse> {
  try {
    const response = await fetch(request.audioUrl)
    const audioBlob = await response.blob()

    const formData = new FormData()
    formData.append('audio', audioBlob)

    const queryParams = new URLSearchParams({
      model: 'nova-2',
      language: request.language || 'en',
      smart_vocab: 'true',
      ...(request.diarization && { diarize: 'true' }),
      ...(request.timestamps && { timestamps: 'true' }),
    })

    const apiResponse = await fetch(`https://api.deepgram.com/v1/listen?${queryParams}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
      body: formData,
    })

    if (!apiResponse.ok) {
      throw new MediaError('Deepgram transcription failed', 'TRANSCRIPTION_FAILED')
    }

    const data = await apiResponse.json()

    const segments = data.results?.channels?.[0]?.alternatives?.[0]?.words?.map((word: any) => ({
      text: word.punctuated_word || word.word,
      speaker: word.speaker,
      startTime: word.start,
      endTime: word.end,
      confidence: word.confidence,
    }))

    const text = segments?.map((s: any) => s.text).join(' ') || ''

    return {
      text,
      provider: 'deepgram',
      language: request.language || 'en',
      duration: data.metadata?.duration || 0,
      segments,
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('Deepgram transcription failed', 'TRANSCRIPTION_FAILED')
  }
}

// ============================================================================
// VISION (IMAGE ANALYSIS)
// ============================================================================

export async function analyzeImage(
  request: VisionRequest,
  apiKey: string
): Promise<VisionResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: request.prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: request.imageUrl,
                  detail: request.detail || 'auto',
                },
              },
            ],
          },
        ],
        max_tokens: request.maxTokens || 500,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new MediaError(
        error.error?.message || 'Vision analysis failed',
        'GENERATION_FAILED',
        error
      )
    }

    const data = await response.json()

    return {
      description: data.choices[0].message.content,
      model: 'gpt-4o',
      tokensUsed: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      },
    }
  } catch (error) {
    if (error instanceof MediaError) throw error
    throw new MediaError('Vision analysis failed', 'GENERATION_FAILED')
  }
}

// ============================================================================
// VOICE MANAGEMENT
// ============================================================================

export async function getAvailableVoices(provider: 'openai' | 'elevenlabs' | 'google'): Promise<Voice[]> {
  if (provider === 'openai') {
    return [
      { id: 'alloy', name: 'Alloy', provider: 'openai', language: 'en-US', gender: 'female' },
      { id: 'echo', name: 'Echo', provider: 'openai', language: 'en-US', gender: 'male' },
      { id: 'fable', name: 'Fable', provider: 'openai', language: 'en-US', gender: 'neutral' },
      { id: 'onyx', name: 'Onyx', provider: 'openai', language: 'en-US', gender: 'male' },
      { id: 'nova', name: 'Nova', provider: 'openai', language: 'en-US', gender: 'female' },
      { id: 'shimmer', name: 'Shimmer', provider: 'openai', language: 'en-US', gender: 'female' },
    ]
  } else if (provider === 'elevenlabs') {
    // Would fetch from ElevenLabs API
    return []
  } else if (provider === 'google') {
    return [
      { id: 'en-US-Neural2-A', name: 'US Neural A', provider: 'google', language: 'en-US', gender: 'male' },
      { id: 'en-US-Neural2-C', name: 'US Neural C', provider: 'google', language: 'en-US', gender: 'female' },
      { id: 'en-GB-Neural2-B', name: 'UK Neural B', provider: 'google', language: 'en-GB', gender: 'male' },
    ]
  }

  return []
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl)

    audio.onloadedmetadata = () => {
      resolve(audio.duration)
    }

    audio.onerror = () => {
      resolve(0)
    }
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  return new Blob(byteArrays, { type: mimeType })
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
