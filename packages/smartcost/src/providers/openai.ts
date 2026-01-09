/**
 * OpenAI Provider Adapter
 *
 * Drop-in replacement for OpenAI API with cost tracking,
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
// OPENAI PROVIDER CLASS
// ============================================================================

export class OpenAIProvider {
  private config: ProviderConfig;
  private apiKey: string;
  private baseURL: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
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

    // Map to OpenAI API format
    const openaiRequest = this.mapToOpenAIFormat(request);

    // Make API call
    const response = await this.makeAPICall(
      '/chat/completions',
      openaiRequest
    );

    // Parse response
    const openaiResponse: any = await response.json();

    // Handle errors
    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${openaiResponse.error?.message || 'Unknown error'}`
      );
    }

    // Calculate duration
    const duration = performance.now() - startTime;

    // Map to SmartCost format
    return this.mapFromOpenAIFormat(
      openaiResponse,
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

    // Map to OpenAI API format
    const openaiRequest = {
      ...this.mapToOpenAIFormat(request),
      stream: true,
    };

    // Make streaming API call
    const response = await this.makeStreamingAPICall(
      '/chat/completions',
      openaiRequest,
      onChunk
    );

    // Calculate duration
    const duration = performance.now() - startTime;

    // Map to SmartCost format
    return this.mapFromOpenAIFormat(
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
    // Rough estimate: 1 token ≈ 4 characters for English text
    // OpenAI uses cl100k_base tokenizer for GPT-4
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
        'Authorization': `Bearer ${this.apiKey}`,
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
    let usage: any = { prompt_tokens: 0, completion_tokens: 0 };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...this.config.headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(
        `OpenAI API error: ${error.error?.message || 'Unknown error'}`
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

          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;

            if (content) {
              fullContent += content;
              onChunk(content);
            }

            // Capture usage if available
            if (parsed.usage) {
              usage = parsed.usage;
            }
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }

    // Return mock response in OpenAI format
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: data.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: fullContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: usage.prompt_tokens || this.estimateTokens(JSON.stringify(data.messages)),
        completion_tokens: usage.completion_tokens || this.estimateTokens(fullContent),
        total_tokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      },
    };
  }

  // ========================================================================
  // PRIVATE METHODS - MAPPING
  // ========================================================================

  /**
   * Map SmartCost request to OpenAI format
   */
  private mapToOpenAIFormat(request: ChatCompletionRequest): any {
    const openaiRequest: any = {
      model: request.model || 'gpt-4',
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
      })),
    };

    // Optional parameters
    if (request.temperature !== undefined) {
      openaiRequest.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      openaiRequest.max_tokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      openaiRequest.top_p = request.topP;
    }

    if (request.stop) {
      openaiRequest.stop = request.stop;
    }

    // Function calling
    if (request.functions && request.functions.length > 0) {
      openaiRequest.functions = request.functions.map((fn) => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      }));

      if (request.functionCall) {
        openaiRequest.function_call = request.functionCall;
      }
    }

    return openaiRequest;
  }

  /**
   * Map OpenAI response to SmartCost format
   */
  private mapFromOpenAIFormat(
    openaiResponse: any,
    request: ChatCompletionRequest,
    routingDecision: RoutingDecision,
    duration: number
  ): ChatCompletionResponse {
    const choice = openaiResponse.choices[0];
    const usage = openaiResponse.usage;

    const model = this.getModel(routingDecision.model);
    if (!model) {
      throw new Error(`Model not found: ${routingDecision.model}`);
    }

    // Calculate token usage
    const tokens: TokenUsage = {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens,
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
      content: choice.message.content,
      model: routingDecision.model,
      provider: this.config.id,
      tokens,
      cost,
      duration,
      finishReason: choice.finish_reason,
      cached: false,
      routingDecision,
    };
  }
}

// ============================================================================
// DEFAULT MODELS CONFIGURATION
// ============================================================================

export const DEFAULT_OPENAI_MODELS = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    maxTokens: 8192,
    inputCostPerMillion: 30,
    outputCostPerMillion: 60,
    avgLatency: 3000,
    qualityScore: 0.95,
    capabilities: {
      functionCalling: true,
      streaming: true,
      vision: false,
      maxOutputTokens: 4096,
      bestFor: ['complex-reasoning', 'code-generation', 'analysis'],
    },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    maxTokens: 128000,
    inputCostPerMillion: 10,
    outputCostPerMillion: 30,
    avgLatency: 2000,
    qualityScore: 0.94,
    capabilities: {
      functionCalling: true,
      streaming: true,
      vision: true,
      maxOutputTokens: 4096,
      bestFor: ['complex-reasoning', 'code-generation', 'analysis', 'vision'],
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    maxTokens: 16385,
    inputCostPerMillion: 0.5,
    outputCostPerMillion: 1.5,
    avgLatency: 1000,
    qualityScore: 0.8,
    capabilities: {
      functionCalling: true,
      streaming: true,
      vision: false,
      maxOutputTokens: 4096,
      bestFor: ['simple-tasks', 'chat', 'quick-tasks'],
    },
  },
];

/**
 * Create default OpenAI provider config
 */
export function createOpenAIConfig(apiKey?: string): ProviderConfig {
  return {
    id: 'openai',
    type: 'openai',
    name: 'OpenAI',
    apiKey: apiKey || process.env.OPENAI_API_KEY,
    models: DEFAULT_OPENAI_MODELS,
    maxRequestsPerMinute: 3000,
    maxTokensPerMinute: 90000,
    priority: 10,
    enabled: true,
  };
}
