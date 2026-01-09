/**
 * Ollama Provider Adapter
 *
 * Adapter for local Ollama models with cost tracking,
 * intelligent routing, and semantic caching
 */

import type {
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  TokenUsage,
  CostBreakdown,
  RoutingDecision,
} from '../types/index.js';

// ============================================================================
// OLLAMA PROVIDER CLASS
// ============================================================================

export class OllamaProvider {
  private config: ProviderConfig;
  private baseURL: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.baseURL = config.baseURL || 'http://localhost:11434';
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Create chat completion
   */
  public async chat(
    request: ChatCompletionRequest,
    routingDecision: RoutingDecision
  ): Promise<ChatCompletionResponse> {
    const startTime = performance.now();

    // Map to Ollama API format
    const ollamaRequest = this.mapToOllamaFormat(request);

    // Make API call
    const response = await this.makeAPICall('/api/chat', ollamaRequest);

    // Parse response
    const ollamaResponse: any = await response.json();

    // Handle errors
    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${ollamaResponse.error || 'Unknown error'}`
      );
    }

    // Calculate duration
    const duration = performance.now() - startTime;

    // Map to SmartCost format
    return this.mapFromOllamaFormat(
      ollamaResponse,
      request,
      routingDecision,
      duration
    );
  }

  /**
   * Create streaming chat completion
   */
  public async chatStream(
    request: ChatCompletionRequest,
    routingDecision: RoutingDecision,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    const startTime = performance.now();

    // Map to Ollama API format
    const ollamaRequest = {
      ...this.mapToOllamaFormat(request),
      stream: true,
    };

    // Make streaming API call
    const response = await this.makeStreamingAPICall(
      '/api/chat',
      ollamaRequest,
      onChunk
    );

    // Calculate duration
    const duration = performance.now() - startTime;

    // Map to SmartCost format
    return this.mapFromOllamaFormat(
      response,
      request,
      routingDecision,
      duration
    );
  }

  /**
   * Estimate token count for text
   */
  public estimateTokens(text: string): number {
    // Ollama models vary, but this is a rough estimate
    return Math.ceil(text.length / 4);
  }

  /**
   * Get model configuration
   */
  public getModel(modelId: string) {
    return this.config.models.find((m) => m.id === modelId);
  }

  // ========================================================================
  // PRIVATE METHODS - API CALLS
  // ========================================================================

  /**
   * Make non-streaming API call
   */
  private async makeAPICall(endpoint: string, data: any): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(data),
    });

    return response;
  }

  /**
   * Make streaming API call
   */
  private async makeStreamingAPICall(
    endpoint: string,
    data: any,
    onChunk: (chunk: string) => void
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    let fullContent = '';
    let promptEvalCount = 0;
    let evalCount = 0;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    // Read stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);

      try {
        const parsed = JSON.parse(chunk);
        const content = parsed.response;

        if (content) {
          fullContent += content;
          onChunk(content);
        }

        // Capture token counts
        if (parsed.prompt_eval_count) {
          promptEvalCount = parsed.prompt_eval_count;
        }
        if (parsed.eval_count) {
          evalCount = parsed.eval_count;
        }

        // Check if done
        if (parsed.done) {
          break;
        }
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }

    // Return mock response in Ollama format
    return {
      model: data.model,
      created_at: new Date().toISOString(),
      response: fullContent,
      done: true,
      prompt_eval_count: promptEvalCount,
      eval_count: evalCount,
    };
  }

  // ========================================================================
  // PRIVATE METHODS - MAPPING
  // ========================================================================

  /**
   * Map SmartCost request to Ollama format
   */
  private mapToOllamaFormat(request: ChatCompletionRequest): any {
    // Convert messages to prompt
    const prompt = this.messagesToPrompt(request.messages);

    const ollamaRequest: any = {
      model: request.model || 'llama2',
      prompt,
    };

    // Optional parameters
    if (request.temperature !== undefined) {
      ollamaRequest.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      ollamaRequest.num_predict = request.maxTokens;
    }

    if (request.topP !== undefined) {
      ollamaRequest.top_p = request.topP;
    }

    return ollamaRequest;
  }

  /**
   * Convert messages to prompt format
   */
  private messagesToPrompt(messages: ChatCompletionRequest['messages']): string {
    const parts: string[] = [];

    messages.forEach((msg) => {
      if (msg.role === 'system') {
        parts.push(`System: ${msg.content}`);
      } else if (msg.role === 'user') {
        parts.push(`User: ${msg.content}`);
      } else if (msg.role === 'assistant') {
        parts.push(`Assistant: ${msg.content}`);
      }
    });

    return parts.join('\n\n') + '\n\nAssistant:';
  }

  /**
   * Map Ollama response to SmartCost format
   */
  private mapFromOllamaFormat(
    ollamaResponse: any,
    request: ChatCompletionRequest,
    routingDecision: RoutingDecision,
    duration: number
  ): ChatCompletionResponse {
    const model = this.getModel(routingDecision.model);
    if (!model) {
      throw new Error(`Model not found: ${routingDecision.model}`);
    }

    // Calculate token usage
    const inputTokens = ollamaResponse.prompt_eval_count ||
      this.estimateTokens(JSON.stringify(request.messages));
    const outputTokens = ollamaResponse.eval_count ||
      this.estimateTokens(ollamaResponse.response);

    const tokens: TokenUsage = {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
      estimatedInput: this.estimateTokens(JSON.stringify(request.messages)),
    };

    // Calculate cost breakdown (Ollama is free)
    const cost: CostBreakdown = {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };

    return {
      content: ollamaResponse.response,
      model: routingDecision.model,
      provider: this.config.id,
      tokens,
      cost,
      duration,
      finishReason: 'stop',
      cached: false,
      routingDecision,
    };
  }
}

// ============================================================================
// DEFAULT MODELS CONFIGURATION
// ============================================================================

export const DEFAULT_OLLAMA_MODELS = [
  {
    id: 'llama2',
    name: 'Llama 2',
    maxTokens: 4096,
    inputCostPerMillion: 0, // Free (local)
    outputCostPerMillion: 0, // Free (local)
    avgLatency: 2000,
    qualityScore: 0.75,
    capabilities: {
      functionCalling: false,
      streaming: true,
      vision: false,
      maxOutputTokens: 2048,
      bestFor: ['general', 'chat', 'offline'],
    },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    maxTokens: 8192,
    inputCostPerMillion: 0,
    outputCostPerMillion: 0,
    avgLatency: 1500,
    qualityScore: 0.82,
    capabilities: {
      functionCalling: false,
      streaming: true,
      vision: false,
      maxOutputTokens: 4096,
      bestFor: ['fast-tasks', 'code-generation', 'offline'],
    },
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    maxTokens: 16384,
    inputCostPerMillion: 0,
    outputCostPerMillion: 0,
    avgLatency: 2500,
    qualityScore: 0.85,
    capabilities: {
      functionCalling: false,
      streaming: true,
      vision: false,
      maxOutputTokens: 8192,
      bestFor: ['code-generation', 'code-analysis', 'offline'],
    },
  },
];

/**
 * Create default Ollama provider config
 */
export function createOllamaConfig(baseURL?: string): ProviderConfig {
  return {
    id: 'ollama',
    type: 'ollama',
    name: 'Ollama',
    baseURL: baseURL || 'http://localhost:11434',
    models: DEFAULT_OLLAMA_MODELS,
    priority: 1, // Highest priority (free)
    enabled: true,
  };
}
