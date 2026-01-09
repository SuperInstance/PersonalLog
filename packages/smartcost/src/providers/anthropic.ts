/**
 * Anthropic Provider Adapter
 *
 * Drop-in replacement for Anthropic API (Claude) with cost tracking,
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
// ANTHROPIC PROVIDER CLASS
// ============================================================================

export class AnthropicProvider {
  private config: ProviderConfig;
  private apiKey: string;
  private baseURL: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';

    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
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

    // Map to Anthropic API format
    const anthropicRequest = this.mapToAnthropicFormat(request);

    // Make API call
    const response = await this.makeAPICall('/messages', anthropicRequest);

    // Parse response
    const anthropicResponse: any = await response.json();

    // Handle errors
    if (!response.ok) {
      throw new Error(
        `Anthropic API error: ${anthropicResponse.error?.message || 'Unknown error'}`
      );
    }

    // Calculate duration
    const duration = performance.now() - startTime;

    // Map to SmartCost format
    return this.mapFromAnthropicFormat(
      anthropicResponse,
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

    // Map to Anthropic API format
    const anthropicRequest = {
      ...this.mapToAnthropicFormat(request),
      stream: true,
    };

    // Make streaming API call
    const response = await this.makeStreamingAPICall(
      '/messages',
      anthropicRequest,
      onChunk
    );

    // Calculate duration
    const duration = performance.now() - startTime;

    // Map to SmartCost format
    return this.mapFromAnthropicFormat(
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
    // Anthropic uses a similar tokenizer to GPT
    // Rough estimate: 1 token ≈ 4 characters for English text
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
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
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
    let usage: any = { input_tokens: 0, output_tokens: 0 };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        ...this.config.headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(
        `Anthropic API error: ${error.error?.message || 'Unknown error'}`
      );
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
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);

            // Handle content block deltas
            if (parsed.type === 'content_block_delta') {
              const content = parsed.delta?.text;
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            }

            // Capture usage
            if (parsed.type === 'message_stop' && parsed.message?.usage) {
              usage = parsed.message.usage;
            }
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }

    // Return mock response in Anthropic format
    return {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: fullContent,
        },
      ],
      model: data.model,
      stop_reason: 'end_turn',
      usage: {
        input_tokens: usage.input_tokens || this.estimateTokens(JSON.stringify(data.messages)),
        output_tokens: usage.output_tokens || this.estimateTokens(fullContent),
      },
    };
  }

  // ========================================================================
  // PRIVATE METHODS - MAPPING
  // ========================================================================

  /**
   * Map SmartCost request to Anthropic format
   */
  private mapToAnthropicFormat(request: ChatCompletionRequest): any {
    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const system = systemMessage?.content || '';

    // Filter out system message from conversation
    const conversationMessages = request.messages.filter(
      (m) => m.role !== 'system'
    );

    // Map messages to Anthropic format
    const messages = conversationMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const anthropicRequest: any = {
      model: request.model || 'claude-3-opus-20240229',
      messages,
      max_tokens: request.maxTokens || 4096,
    };

    // Add system message if present
    if (system) {
      anthropicRequest.system = system;
    }

    // Optional parameters
    if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      anthropicRequest.top_p = request.topP;
    }

    if (request.stop) {
      anthropicRequest.stop_sequences = Array.isArray(request.stop)
        ? request.stop
        : [request.stop];
    }

    // Anthropic doesn't support function calling in the same way as OpenAI
    // We skip that for now

    return anthropicRequest;
  }

  /**
   * Map Anthropic response to SmartCost format
   */
  private mapFromAnthropicFormat(
    anthropicResponse: any,
    request: ChatCompletionRequest,
    routingDecision: RoutingDecision,
    duration: number
  ): ChatCompletionResponse {
    const textBlock = anthropicResponse.content?.find(
      (block: any) => block.type === 'text'
    );
    const content = textBlock?.text || '';
    const usage = anthropicResponse.usage;

    const model = this.getModel(routingDecision.model);
    if (!model) {
      throw new Error(`Model not found: ${routingDecision.model}`);
    }

    // Calculate token usage
    const tokens: TokenUsage = {
      input: usage.input_tokens,
      output: usage.output_tokens,
      total: usage.input_tokens + usage.output_tokens,
      estimatedInput: this.estimateTokens(JSON.stringify(request.messages)),
    };

    // Calculate cost breakdown
    const inputCost =
      (tokens.input / 1_000_000) * model.inputCostPerMillion;
    const outputCost =
      (tokens.output / 1_000_000) * model.outputCostPerMillion;
    const totalCost = inputCost + outputCost;

    const cost: CostBreakdown = {
      inputCost,
      outputCost,
      totalCost,
    };

    return {
      content,
      model: routingDecision.model,
      provider: this.config.id,
      tokens,
      cost,
      duration,
      finishReason: anthropicResponse.stop_reason || 'stop',
      cached: false,
      routingDecision,
    };
  }
}

// ============================================================================
// DEFAULT MODELS CONFIGURATION
// ============================================================================

export const DEFAULT_ANTHROPIC_MODELS = [
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    maxTokens: 200000,
    inputCostPerMillion: 15,
    outputCostPerMillion: 75,
    avgLatency: 2500,
    qualityScore: 0.96,
    capabilities: {
      functionCalling: false,
      streaming: true,
      vision: true,
      maxOutputTokens: 4096,
      bestFor: ['complex-reasoning', 'analysis', 'writing'],
    },
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    maxTokens: 200000,
    inputCostPerMillion: 3,
    outputCostPerMillion: 15,
    avgLatency: 1500,
    qualityScore: 0.9,
    capabilities: {
      functionCalling: false,
      streaming: true,
      vision: true,
      maxOutputTokens: 4096,
      bestFor: ['balanced', 'code-generation', 'analysis'],
    },
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    maxTokens: 200000,
    inputCostPerMillion: 0.25,
    outputCostPerMillion: 1.25,
    avgLatency: 800,
    qualityScore: 0.82,
    capabilities: {
      functionCalling: false,
      streaming: true,
      vision: true,
      maxOutputTokens: 4096,
      bestFor: ['fast-tasks', 'simple-queries', 'chat'],
    },
  },
];

/**
 * Create default Anthropic provider config
 */
export function createAnthropicConfig(apiKey?: string): ProviderConfig {
  return {
    id: 'anthropic',
    type: 'anthropic',
    name: 'Anthropic',
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    models: DEFAULT_ANTHROPIC_MODELS,
    maxRequestsPerMinute: 1000,
    maxTokensPerMinute: 80000,
    priority: 5,
    enabled: true,
  };
}
