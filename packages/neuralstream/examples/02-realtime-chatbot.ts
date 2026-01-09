/**
 * Example 2: Real-time Chat Bot
 *
 * Demonstrates building a real-time chatbot using streaming text generation.
 * Maintains conversation context and streams responses token by token.
 *
 * SEO Keywords:
 * - real-time chatbot
 * - streaming AI chat
 * - browser chatbot
 * - conversational AI
 * - WebGPU chat
 */

async function realTimeChatbot() {
  const chatBot = await NeuralStream.init({
    model: 'chat-model',
    streaming: true,
  });

  const conversationHistory = [];

  // Handle user message
  async function onUserMessage(message: string) {
    // Add to history
    conversationHistory.push({ role: 'user', content: message });

    // Stream response
    const response = await chatBot.stream(conversationHistory, {
      onToken: (token) => {
        // Update UI with each token
        displayToken(token);
      },
      onComplete: (fullResponse) => {
        conversationHistory.push({ role: 'assistant', content: fullResponse });
      },
    });
  }

  // Example conversation
  await onUserMessage('What is WebGPU?');
  // Streams: "WebGPU is a modern web API that enables..."
}

// Key features:
// - Streaming token generation
// - Conversation history management
// - Real-time UI updates
// - Efficient memory usage
