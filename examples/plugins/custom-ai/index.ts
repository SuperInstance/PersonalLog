/**
 * Custom AI Provider Plugin
 *
 * Demonstrates how to create a custom AI provider plugin.
 * This example creates a mock echo provider that repeats the user's input.
 */

import { Plugin, PluginContext, PluginManifest, CustomAIProvider, ChatRequest, ChatResponse } from '@/sdk';

// ============================================================================
// PLUGIN MANIFEST
// ============================================================================

const manifest: PluginManifest = {
  id: 'custom-ai-provider',
  name: 'Echo AI Provider',
  description: 'A custom AI provider that echoes your input',
  version: '1.0.0',
  author: 'PersonalLog Team',
  capabilities: {
    ai: {
      createProvider: true,
    },
  },
  entryPoints: {
    plugin: 'CustomAIProviderPlugin',
  },
};

// ============================================================================
// ECHO AI PROVIDER
// ============================================================================

/**
 * Echo AI Provider
 *
 * A simple AI provider that repeats the user's input with some variations.
 */
class EchoAIProvider implements CustomAIProvider {
  id = 'echo-ai';
  name = 'Echo AI';
  type = 'local' as const;
  models = [
    {
      id: 'echo-v1',
      name: 'Echo V1',
      contextWindow: 4096,
      maxTokens: 1000,
    },
  ];

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the last user message
    const lastMessage = request.messages[request.messages.length - 1];
    const userContent = lastMessage?.content || '';

    // Create echo response
    const echoContent = this.createEchoResponse(userContent);

    return {
      content: echoContent,
      model: request.model,
      tokens: {
        input: userContent.length,
        output: echoContent.length,
        total: userContent.length + echoContent.length,
      },
      finishReason: 'stop',
    };
  }

  /**
   * Create an echo response with some variations
   */
  private createEchoResponse(input: string): string {
    const variations = [
      `You said: "${input}"`,
      `I heard you say: "${input}"`,
      `Echo: "${input}"`,
      `Repeating back: "${input}"`,
    ];

    const index = Math.floor(Math.random() * variations.length);
    return variations[index];
  }
}

// ============================================================================
// PLUGIN CLASS
// ============================================================================

export class CustomAIProviderPlugin extends Plugin {
  manifest = manifest;

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context;

    context.logger.info('Custom AI Provider Plugin loaded');

    // Register the echo provider
    const echoProvider = new EchoAIProvider();
    context.ai.registerProvider(echoProvider);

    context.logger.info('Registered Echo AI provider');

    // Listen for AI events
    context.events.on('ai:chat:complete', (data: any) => {
      if (data.providerId === 'echo-ai') {
        context.logger.info('Echo provider completed chat:', data);
      }
    });
  }

  async onEnable(context: PluginContext): Promise<void> {
    context.ui.showNotification({
      message: 'Echo AI Provider enabled! Use it from the AI provider dropdown.',
      type: 'success',
      duration: 5000,
    });
  }

  async onDisable(context: PluginContext): Promise<void> {
    // Unregister provider
    try {
      context.ai.unregisterProvider('echo-ai');
      context.logger.info('Unregistered Echo AI provider');
    } catch (error) {
      context.logger.error('Failed to unregister provider:', error);
    }
  }

  async onUnload(context: PluginContext): Promise<void> {
    context.logger.info('Custom AI Provider Plugin unloaded');
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default CustomAIProviderPlugin;
