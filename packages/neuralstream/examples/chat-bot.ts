/**
 * Chat Bot Example
 *
 * Real-time conversational AI assistant.
 */

import { NeuralStream } from '@superinstance/neuralstream';

async function chatBotExample() {
  // Create chat session
  const chat = await NeuralStream.createChat(
    'You are a helpful AI assistant. Be concise and friendly.'
  );

  console.log('Chat Bot Started (type "exit" to quit)\n');

  let chatActive = true;

  while (chatActive) {
    // Get user input
    const userInput = await prompt('\nYou: ');

    if (userInput.toLowerCase() === 'exit') {
      chatActive = false;
      break;
    }

    if (!userInput.trim()) continue;

    // Generate response
    process.stdout.write('Assistant: ');
    let response = '';

    const stream = await chat.respond(userInput);

    for await (const token of stream) {
      process.stdout.write(token.token);
      response += token.token;

      if (token.isDone) {
        console.log();
        break;
      }
    }
  }

  // Display session metrics
  const metrics = chat.getMetrics();
  console.log('\n\nSession Statistics:');
  console.log(`Total Tokens: ${metrics.totalTokens}`);
  console.log(`Average FPS: ${metrics.tokensPerSecond.toFixed(2)}`);
  console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);

  await chat.dispose();
}

// Simple prompt function
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run example
chatBotExample().catch(console.error);
