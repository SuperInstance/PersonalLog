/**
 * Basic Usage Example
 *
 * Demonstrates how to use @superinstance/vibe-code-agent-gen
 * to create a custom AI agent through conversation.
 */

import { createStateMachine } from '../src'
import type { AIProvider, Message } from '../src'

// Mock AI provider for demonstration
const mockProvider: AIProvider = {
  id: 'demo-provider',
  name: 'Demo Provider',
  type: 'demo',

  async isAvailable() {
    return true
  },

  async chat(request) {
    // In a real implementation, this would call an actual AI service
    console.log('Chat request:', request.prompt?.substring(0, 100) + '...')

    return {
      content: 'Mock AI response',
      model: 'demo-model',
      tokens: { input: 100, output: 50, total: 150 },
      finishReason: 'stop',
    }
  },

  estimateTokens(text) {
    return Math.ceil(text.length / 4)
  },

  getMaxTokens() {
    return 4000
  },
}

async function main() {
  console.log('=== Vibe-Code-Agent-Gen Basic Usage ===\n')

  // Sample conversation where user describes what they want
  const conversation: Message[] = [
    {
      id: '1',
      conversationId: 'demo-conv',
      type: 'text',
      author: 'user',
      content: {
        text: 'I want a concise assistant that asks permission before calling functions',
      },
      timestamp: new Date().toISOString(),
    },
  ]

  // Create state machine
  console.log('1. Creating state machine...')
  const machine = await createStateMachine('demo-conv', mockProvider)
  console.log('✓ Session created:', machine.getSession().sessionId)

  // Start the process
  console.log('\n2. Starting clarification process...')
  const turn1Result = await machine.start(conversation)
  console.log('✓ Turn 1 questions:')
  turn1Result.questions?.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q}`)
  })

  // Simulate user responses for turn 1
  const turn1Responses = [
    'Concise in all responses',
    'Ask for all function calls',
    'Show me the function name and parameters',
  ]

  console.log('\n3. User responds to turn 1...')
  const turn2Result = await machine.advanceTurn(conversation, turn1Responses)
  console.log('✓ Turn 2 questions:')
  turn2Result.questions?.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q}`)
  })

  // Simulate user responses for turn 2
  const turn2Responses = [
    'Wait indefinitely for permission',
    'Show function details in a formatted way',
  ]

  console.log('\n4. User responds to turn 2...')
  const turn3Result = await machine.advanceTurn(conversation, turn2Responses)
  console.log('✓ Ready to generate:', turn3Result.canGenerate)

  // Generate the agent
  console.log('\n5. Generating agent definition...')
  const agent = await machine.generate(conversation)

  console.log('\n=== Generated Agent ===')
  console.log('ID:', agent.definition.id)
  console.log('Name:', agent.definition.name)
  console.log('Icon:', agent.definition.icon)
  console.log('Category:', agent.definition.category)
  console.log('Confidence:', agent.confidence.toFixed(2))

  console.log('\n=== Natural Language Summary ===')
  console.log(agent.naturalLanguageSummary)

  console.log('\n=== Agent Definition ===')
  console.log(JSON.stringify(agent.definition, null, 2))

  // Approve the agent
  console.log('\n6. Approving agent...')
  await machine.approve()
  console.log('✓ Agent approved and ready to use')

  console.log('\n=== Session Complete ===')
  console.log('Final state:', machine.getSession().state)

  // Cleanup
  await machine.cleanup()
  console.log('\n✓ Session cleaned up')
}

// Run the example
main().catch(console.error)
