/**
 * Example 7: Multi-turn Conversation
 *
 * Demonstrates handling complex multi-turn conversations with context.
 * Maintains conversation state and references previous messages.
 *
 * SEO Keywords:
 * - multi-turn conversation
 * - contextual AI chat
 * - conversation memory
 * - dialogue management
 * - WebGPU chatbot
 */

async function multiTurnConversation() {
  const conversationalAI = await NeuralStream.init({
    model: 'conversation-model',
    maxHistoryLength: 10, // Remember last 10 turns
  });

  const session = conversationalAI.createSession();

  // Turn 1
  const response1 = await session.chat('My name is Alice');
  console.log('AI:', response1); // "Nice to meet you, Alice!"

  // Turn 2
  const response2 = await session.chat('What is my name?');
  console.log('AI:', response2); // "Your name is Alice, as you mentioned."

  // Turn 3
  const response3 = await session.chat('Tell me a joke');
  console.log('AI:', response3); // "Why did the AI go to therapy?..."

  // Turn 4 (references earlier context)
  const response4 = await session.chat('Remember my name?');
  console.log('AI:', response4); // "Yes, your name is Alice!"
}

// Key features:
// - Conversation session management
// - Context awareness
// - Memory of previous turns
// - Natural dialogue flow
// - Reference resolution
