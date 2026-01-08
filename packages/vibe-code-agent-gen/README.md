# @superinstance/vibe-code-agent-gen

> Create custom AI agents through natural conversation

A sophisticated system for generating AI agent definitions via a 3-turn clarification process. Users describe what they want in plain language, and the system intelligently extracts requirements and generates complete agent configurations.

## Features

- **Natural Conversation Interface** - No YAML or config files needed
- **3-Turn Clarification Process** - Intelligently refines requirements
- **AI-Powered Extraction** - Uses LLMs to understand user intent
- **Fallback Heuristics** - Works even when AI fails
- **IndexedDB Persistence** - Sessions survive page refreshes
- **State Machine** - Robust state management
- **Type-Safe** - Full TypeScript support

## Quick Start

```bash
npm install @superinstance/vibe-code-agent-gen
```

```typescript
import { createStateMachine } from '@superinstance/vibe-code-agent-gen'

// Create an AI provider (any provider that implements the interface)
const provider = {
  id: 'openai',
  name: 'OpenAI',
  type: 'openai',

  async isAvailable() { return true },

  async chat(request) {
    // Call your AI service here
    return { content: '...', model: 'gpt-4', tokens: { ... }, finishReason: 'stop' }
  },

  estimateTokens(text) { return Math.ceil(text.length / 4) },
  getMaxTokens() { return 4000 }
}

// Start vibe-coding process
const machine = await createStateMachine('conv-123', provider)

// === Turn 1: Initial Requirements ===
const turn1 = await machine.start(conversationMessages)
console.log('Questions:', turn1.questions)
// Output: [
//   'Should I be concise in ALL responses, or only when providing information?',
//   'When you say "ask before calling functions", which functions specifically?',
//   'Should I show you what function I\'m about to call?'
// ]

// User responds
const responses1 = [
  'Concise in info responses only',
  'All functions',
  'Show me what function'
]

// === Turn 2: Specific Behaviors ===
const turn2 = await machine.advanceTurn(conversationMessages, responses1)
console.log('Turn 2 Questions:', turn2.questions)
// Output: [
//   'How should I handle it if you don\'t respond to my permission request?',
//   'Do you want me to wait indefinitely, timeout after 30s, or proceed anyway?',
//   'Any specific format for showing function details?'
// ]

// User responds again
const responses2 = [
  'Wait indefinitely',
  'Show function name and parameters'
]

// === Turn 3: Generation Ready ===
const turn3 = await machine.advanceTurn(conversationMessages, responses2)
console.log('Can generate:', turn3.canGenerate) // true

// === Generate Agent ===
const agent = await machine.generate(conversationMessages)

console.log(agent.naturalLanguageSummary)
// # Concise Assistant 💬
//
// ## 🎯 Purpose
// Quick, to-the-point information while maintaining full control
//
// ## 🎭 Personality
// - **Tone:** Professional
// - **Verbosity:** Concise
// - **Style:** Direct
//
// ## ⚙️ Behavior
// - Provides concise responses when sharing information
// - Asks for permission before calling any function
// - Shows you the function name and parameters before calling
// - Waits indefinitely for your response
//
// ---
//
// **Ready to activate?** [Yes] [No] [Edit]

// === Approve and Use ===
await machine.approve()

// Now use the agent definition
const agentDefinition = agent.definition
registerAgent(agentDefinition)
```

## How It Works

### The 3-Turn Clarification Process

```
┌─────────────────────────────────────────────────────────┐
│              Vibe-Coding State Machine                  │
│                                                         │
│  States: IDLE → TURN_1 → TURN_2 → GENERATING → PREVIEW │
│                                                         │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Clarification │  │   Parser     │  │ Generator   │ │
│  │   Engine      │  │              │  │             │ │
│  └───────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Turn 1: Initial Understanding**
- Focus: Basic personality and purpose
- Questions: Tone, verbosity, style, general use case

**Turn 2: Specific Behaviors**
- Focus: Constraints and permissions
- Questions: Function call permissions, timeouts, edge cases

**Turn 3: Generation**
- Analyzes conversation patterns
- Generates complete agent definition
- Produces human-readable summary

### AI Provider Integration

The system works with any AI provider that implements the `AIProvider` interface:

```typescript
interface AIProvider {
  id: string
  name: string
  type: string

  isAvailable(): Promise<boolean>

  chat(request: ChatRequest): Promise<ChatResponse>

  estimateTokens(text: string): number
  getMaxTokens(): number
}
```

This means you can use:
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Local models (Ollama, LM Studio)
- Custom implementations

## API Reference

### createStateMachine

Creates a new vibe-coding session for a conversation.

```typescript
const machine = await createStateMachine(
  conversationId: string,
  provider: AIProvider
): Promise<VibeCodingStateMachine>
```

### VibeCodingStateMachine

#### start(conversation)

Starts the clarification process and extracts initial requirements.

```typescript
const result = await machine.start(conversation: Message[]): Promise<ClarificationResult>
```

Returns:
- `nextState`: The new state (CLARIFYING_TURN_1)
- `questions`: Array of clarification questions
- `canGenerate`: Whether generation can proceed (false)

#### advanceTurn(conversation, userResponses)

Advances to the next turn with user responses.

```typescript
const result = await machine.advanceTurn(
  conversation: Message[],
  userResponses: string[],
  options?: StateTransitionOptions
): Promise<ClarificationResult>
```

Returns:
- `nextState`: The new state
- `questions`: Array of questions (if not yet ready to generate)
- `canGenerate`: Whether generation can proceed

#### generate(conversation)

Generates the final agent definition.

```typescript
const agent = await machine.generate(conversation: Message[]): Promise<GeneratedAgent>
```

Returns:
- `definition`: The complete AgentDefinition
- `naturalLanguageSummary`: Human-readable description
- `confidence`: Confidence score (0-1)
- `warnings`: Any validation warnings

#### approve()

Marks the agent as approved and ready to use.

```typescript
await machine.approve(): Promise<void>
```

#### getSession()

Gets the current session state.

```typescript
const session = machine.getSession(): VibeCodingSession
```

#### updateRequirements(updates)

Manually updates requirements (for editing).

```typescript
await machine.updateRequirements(updates: Partial<AgentRequirements>): Promise<void>
```

#### preview()

Generates a preview without advancing state.

```typescript
const agent = await machine.preview(): Promise<GeneratedAgent>
```

## Generated Agent Definition

The system generates a complete agent definition:

```typescript
{
  id: 'custom-concise-assistant-abc123',
  name: 'Concise Assistant',
  icon: '💬',
  category: 'custom',
  description: 'Concise in information responses, asks permission for all function calls',
  activationMode: 'foreground',
  initialState: {
    status: 'idle',
    lastActive: '2025-01-03T12:00:00.000Z'
  },
  metadata: {
    version: '1.0.0',
    author: 'User (via Vibe-Coding)',
    createdAt: '2025-01-03T12:00:00.000Z',
    updatedAt: '2025-01-03T12:00:00.000Z',
    tags: ['custom', 'vibe-coded', 'professional', 'direct', 'concise', 'clarifying']
  }
}
```

## Persistence

Sessions are automatically persisted to IndexedDB:

```typescript
// List all sessions for a conversation
const sessions = await listSessions('conv-123')

// Load an existing session
const machine = await loadStateMachine(sessionId, provider)

// Cleanup old sessions
await cleanupOldSessions(7) // Delete sessions older than 7 days
```

## Error Handling

```typescript
import { VibeCodingError } from '@superinstance/vibe-code-agent-gen'

try {
  await machine.advanceTurn(conversation, responses)
} catch (error) {
  if (error instanceof VibeCodingError) {
    switch (error.code) {
      case 'INVALID_STATE':
        console.error('Cannot advance from current state')
        break
      case 'INVALID_RESPONSE':
        console.error('Failed to parse user response')
        break
      case 'GENERATION_FAILED':
        console.error('Agent generation failed')
        break
      case 'VALIDATION_FAILED':
        console.error('Generated agent is invalid')
        break
    }
  }
}
```

## Advanced Usage

### Skip Clarification

```typescript
// Skip to generation after turn 1
const result = await machine.advanceTurn(conversation, responses, {
  skipAhead: true
})
```

### Manual Requirement Updates

```typescript
// Update requirements directly
await machine.updateRequirements({
  personality: {
    tone: 'casual',
    verbosity: 'concise',
    style: 'direct'
  }
})

// Preview the changes
const preview = await machine.preview()
```

### Custom Question Generation

```typescript
import { generateClarificationQuestions } from '@superinstance/vibe-code-agent-gen'

const questions = await generateClarificationQuestions(
  conversation,
  currentRequirements,
  1, // turn number
  provider,
  {
    maxQuestions: 5,
    focusAreas: ['personality', 'constraints']
  }
)
```

## Examples

See the `/examples` directory for complete examples:

- **Basic Usage** - Simple agent creation
- **Custom Provider** - Using with different AI providers
- **React Integration** - Building a UI on top
- **Session Management** - Handling persistence and recovery

## Architecture

```
src/
├── types.ts              # Core type definitions
├── vibe-types.ts         # Vibe-coding specific types
├── generator.ts          # Agent definition generator
├── clarifier.ts          # Question generation engine
├── parser.ts             # Requirement extraction
├── state-machine.ts      # State management & persistence
└── index.ts              # Public API exports
```

## Independence

This package is **completely independent** and can be used in any project:

- ✅ Zero PersonalLog dependencies
- ✅ Works with any AI provider
- ✅ Browser and Node.js compatible
- ✅ TypeScript first
- ✅ Tree-shakeable

## Synergy

Works great with other tools in the ecosystem:

- **@superinstance/cascade-router** - Optimize LLM costs during generation
- **@superinstance/hardware-detection** - Adapt agent capabilities based on hardware
- **Agent Registry** - Register and manage generated agents

## License

MIT

## Repository

https://github.com/SuperInstance/Vibe-Code-Agent-Gen

## Contributing

Contributions are welcome! Please see our contributing guidelines.

---

Made with ❤️ by the SuperInstance team
