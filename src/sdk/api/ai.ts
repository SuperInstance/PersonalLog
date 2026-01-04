/**
 * PersonalLog Plugin SDK - AI API Implementation
 *
 * Provides AI provider interaction capabilities for plugins.
 *
 * @packageDocumentation
 */

import type {
  AIAPI,
  AIProviderInfo,
  AIModelInfo,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  CustomAIProvider,
} from '../types';

// Import AI provider system
import { ProviderFactory } from '@/lib/ai/provider';

// Helper function to get provider
function getProvider(id: string) {
  return ProviderFactory.get(id);
}

function listAIProviders() {
  // Return all registered providers
  const providers = ProviderFactory['providers'] as Map<string, any>;
  return Array.from(providers.values()).map(p => ({
    id: p.id,
    name: p.name,
    models: p.models || [],
  }));
}

// ============================================================================
// AI API IMPLEMENTATION
// ============================================================================

/**
 * AI API implementation
 *
 * Provides methods for interacting with AI providers.
 */
class AIAPIImpl implements AIAPI {
  private customProviders: Map<string, CustomAIProvider> = new Map();

  // ========================================================================
  // PROVIDER MANAGEMENT
  // ========================================================================

  listProviders(): AIProviderInfo[] {
    const providers: AIProviderInfo[] = [];

    // List built-in providers
    const builtinProviders = listAIProviders();
    for (const provider of builtinProviders) {
      providers.push({
        id: provider.id,
        name: provider.name,
        type: 'local',
        capabilities: {
          streaming: true,
          images: false,
          files: false,
          webSearch: false,
        },
        models: provider.models.map((m: any) => ({
          id: m.id,
          name: m.name,
          contextWindow: m.contextWindow || 4096,
          maxTokens: m.maxTokens,
        })),
      });
    }

    // Add custom providers
    for (const provider of this.customProviders.values()) {
      providers.push({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        capabilities: {
          streaming: !!provider.chatStream,
        },
        models: provider.models,
      });
    }

    return providers;
  }

  getProvider(id: string): AIProviderInfo | null {
    const providers = this.listProviders();
    return providers.find(p => p.id === id) || null;
  }

  // ========================================================================
  // CHAT
  // ========================================================================

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Check if it's a custom provider
    if (this.customProviders.has(request.providerId)) {
      const provider = this.customProviders.get(request.providerId)!;
      return provider.chat(request);
    }

    // Use built-in provider
    try {
      const provider = getProvider(request.providerId);
      if (!provider) {
        throw new Error(`Provider ${request.providerId} not found`);
      }

      // Convert chat request to provider format
      const response = await provider.chat({
        conversationId: 'sdk_chat',
        agentId: request.providerId,
        prompt: request.messages.map(m => m.content).join('\n'),
        stream: false,
      } as any);

      return {
        content: response.content,
        model: response.model,
        tokens: response.tokens,
        finishReason: response.finishReason === 'escalated' ? 'stop' : response.finishReason as any,
      };
    } catch (error) {
      throw new Error(`Chat request failed: ${error}`);
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    // Check if it's a custom provider
    if (this.customProviders.has(request.providerId)) {
      const provider = this.customProviders.get(request.providerId)!;
      if (provider.chatStream) {
        yield* provider.chatStream(request);
        return;
      }
    }

    // Use built-in provider
    try {
      const provider = getProvider(request.providerId);
      if (!provider) {
        throw new Error(`Provider ${request.providerId} not found`);
      }

      // Stream if provider supports it
      if (provider.chatStream) {
        for await (const chunk of provider.chatStream({
          messages: request.messages,
          model: request.model,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        })) {
          yield {
            content: chunk.content,
            done: chunk.done,
          };
        }
      } else {
        // Fallback to non-streaming
        const response = await this.chat(request);
        yield {
          content: response.content,
          done: true,
        };
      }
    } catch (error) {
      yield {
        error: String(error),
        done: true,
      };
    }
  }

  // ========================================================================
  // CUSTOM PROVIDERS
  // ========================================================================

  registerProvider(provider: CustomAIProvider): void {
    if (this.customProviders.has(provider.id)) {
      throw new Error(`Provider ${provider.id} already registered`);
    }

    // Validate provider
    if (!provider.id || !provider.name) {
      throw new Error('Provider must have id and name');
    }
    if (!provider.models || provider.models.length === 0) {
      throw new Error('Provider must have at least one model');
    }
    if (typeof provider.chat !== 'function') {
      throw new Error('Provider must implement chat method');
    }

    this.customProviders.set(provider.id, provider);
    this.emitEvent('ai:provider:registered', { id: provider.id });
  }

  unregisterProvider(id: string): void {
    if (!this.customProviders.has(id)) {
      throw new Error(`Provider ${id} not found`);
    }
    this.customProviders.delete(id);
    this.emitEvent('ai:provider:unregistered', { id });
  }

  getCustomProvider(id: string): CustomAIProvider | undefined {
    return this.customProviders.get(id);
  }

  getCustomProviders(): CustomAIProvider[] {
    return Array.from(this.customProviders.values());
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  private emitEvent(event: string, data?: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('plugin-ai-event', {
          detail: { event, data },
        })
      );
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new AI API instance
 *
 * @returns AI API instance
 */
export function createAIAPI(): AIAPI {
  return new AIAPIImpl();
}

export default AIAPIImpl;
