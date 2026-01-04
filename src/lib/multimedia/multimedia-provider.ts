/**
 * Multi-Modal AI Provider Extension
 *
 * Extends the AI provider system with multi-modal capabilities.
 */

import type {
  ChatRequest,
  ChatResponse,
  Message,
  MessageContent,
} from '@/types/conversation'
import type {
  MediaAttachment,
  VisionRequest,
  VisionResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  AudioGenerationRequest,
  AudioGenerationResponse,
  TranscriptionRequest,
  TranscriptionResponse,
  Voice,
} from './types'
import {
  generateImage,
  generateAudio,
  transcribeAudio,
  analyzeImage,
  getAvailableVoices,
} from './generator'

// ============================================================================
// MULTI-MODAL CHAT REQUEST
// ============================================================================

export interface MultiModalChatRequest {
  conversationId: string
  agentId: string
  messages: Message[]
  prompt: string
  attachments?: MediaAttachment[]
  enableVision?: boolean
  stream?: boolean
}

// ============================================================================
// MULTI-MODAL PROVIDER INTERFACE
// ============================================================================

export interface MultiModalProvider {
  /**
   * Send a chat request with media attachments
   */
  chatWithMedia(request: MultiModalChatRequest): Promise<ChatResponse>

  /**
   * Generate an image from text
   */
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>

  /**
   * Generate audio from text (text-to-speech)
   */
  generateAudio(request: AudioGenerationRequest): Promise<AudioGenerationResponse>

  /**
   * Transcribe audio to text (speech-to-text)
   */
  transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse>

  /**
   * Analyze an image with vision
   */
  analyzeImage(request: VisionRequest): Promise<VisionResponse>

  /**
   * Get available voices for TTS
   */
  getVoices(): Promise<Voice[]>
}

// ============================================================================
// OPENAI MULTI-MODAL PROVIDER
// ============================================================================

export class OpenAIMultiModalProvider implements MultiModalProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chatWithMedia(request: MultiModalChatRequest): Promise<ChatResponse> {
    // Convert attachments to format expected by OpenAI
    const messages = this.buildMessages(request)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokens: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      },
      finishReason: data.choices[0].finish_reason,
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    return generateImage({ ...request, provider: 'dalle' }, this.apiKey)
  }

  async generateAudio(request: AudioGenerationRequest): Promise<AudioGenerationResponse> {
    return generateAudio({ ...request, provider: 'openai' }, this.apiKey)
  }

  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    return transcribeAudio({ ...request, provider: 'whisper' }, this.apiKey)
  }

  async analyzeImage(request: VisionRequest): Promise<VisionResponse> {
    return analyzeImage(request, this.apiKey)
  }

  async getVoices(): Promise<Voice[]> {
    return getAvailableVoices('openai')
  }

  private buildMessages(request: MultiModalChatRequest): any[] {
    const messages: any[] = []

    // Add context messages (text only)
    for (const msg of request.messages.slice(-10)) {
      messages.push({
        role: msg.author === 'user' ? 'user' : 'assistant',
        content: msg.content.text || '',
      })
    }

    // Build current message with attachments
    const content: any[] = []

    // Add text prompt
    content.push({
      type: 'text',
      text: request.prompt,
    })

    // Add image attachments (for vision)
    if (request.attachments && request.attachments.length > 0) {
      for (const attachment of request.attachments) {
        if (attachment.type === 'image') {
          content.push({
            type: 'image_url',
            image_url: {
              url: attachment.url,
              detail: 'auto',
            },
          })
        }
      }
    }

    messages.push({
      role: 'user',
      content,
    })

    return messages
  }
}

// ============================================================================
// ANTHROPIC MULTI-MODAL PROVIDER (Claude with Vision)
// ============================================================================

export class AnthropicMultiModalProvider implements MultiModalProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chatWithMedia(request: MultiModalChatRequest): Promise<ChatResponse> {
    const messages = this.buildMessages(request)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Anthropic error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.content[0].text,
      model: data.model,
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finishReason: data.stop_reason,
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    // Anthropic doesn't support image generation, throw error
    throw new Error('Anthropic does not support image generation')
  }

  async generateAudio(request: AudioGenerationRequest): Promise<AudioGenerationResponse> {
    // Anthropic doesn't support audio generation
    throw new Error('Anthropic does not support audio generation')
  }

  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    // Anthropic doesn't support transcription
    throw new Error('Anthropic does not support audio transcription')
  }

  async analyzeImage(request: VisionRequest): Promise<VisionResponse> {
    // Use Claude's vision capabilities
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: request.maxTokens || 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: request.imageUrl.split(',')[1], // Remove data:image/jpeg;base64, prefix
                },
              },
              {
                type: 'text',
                text: request.prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Anthropic error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()

    return {
      description: data.content[0].text,
      model: 'claude-3-5-sonnet',
      tokensUsed: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    }
  }

  async getVoices(): Promise<Voice[]> {
    return []
  }

  private buildMessages(request: MultiModalChatRequest): any[] {
    const messages: any[] = []

    // Add context messages
    for (const msg of request.messages.slice(-10)) {
      messages.push({
        role: msg.author === 'user' ? 'user' : 'assistant',
        content: msg.content.text || '',
      })
    }

    // Build current message with attachments
    const content: any[] = [
      {
        type: 'text',
        text: request.prompt,
      },
    ]

    // Add image attachments
    if (request.attachments && request.attachments.length > 0) {
      for (const attachment of request.attachments) {
        if (attachment.type === 'image') {
          // Convert image URL to base64 if needed
          let base64Data = attachment.url
          if (attachment.url.startsWith('blob:') || attachment.url.startsWith('http')) {
            // In production, you'd fetch and convert to base64
            continue
          }

          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: base64Data.split(',')[1],
            },
          })
        }
      }
    }

    messages.push({
      role: 'user',
      content,
    })

    return messages
  }
}

// ============================================================================
// MULTI-MODAL PROVIDER FACTORY
// ============================================================================

export class MultiModalProviderFactory {
  static create(provider: 'openai' | 'anthropic', apiKey: string): MultiModalProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIMultiModalProvider(apiKey)
      case 'anthropic':
        return new AnthropicMultiModalProvider(apiKey)
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  static fromAIProvider(provider: any, apiKey: string): MultiModalProvider | null {
    if (!provider.type) return null

    if (provider.type === 'openai') {
      return new OpenAIMultiModalProvider(apiKey)
    } else if (provider.type === 'anthropic') {
      return new AnthropicMultiModalProvider(apiKey)
    }

    return null
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function hasVisionCapabilities(provider: any): boolean {
  return provider.type === 'openai' || provider.type === 'anthropic'
}

export function hasImageGeneration(provider: any): boolean {
  return provider.type === 'openai' // DALL-E
}

export function hasAudioCapabilities(provider: any): boolean {
  return provider.type === 'openai' // Whisper + TTS
}

export function supportsMultiModal(provider: any): boolean {
  return hasVisionCapabilities(provider)
}
