# Vibe-Coding Conversation Engine

A sophisticated system for creating custom AI agents through natural conversation. Users describe what they want, and the system clarifies requirements through a 3-turn process, then generates a complete `AgentDefinition`.

## Overview

The vibe-coding engine enables users to create custom AI agents without touching YAML or configuration files. Through a conversational interface:

1. **User describes** what kind of agent they want
2. **System asks** 2-3 clarifying questions per turn (3 turns total)
3. **Requirements are extracted** from the conversation
4. **Agent definition is generated** with natural language summary
5. **User approves** and the agent is ready to use

## Architecture

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

## Components

### 1. Types (`types.ts`)

Core type definitions:

- **`VibeCodingState`**: State machine enum (IDLE, CLARIFYING_TURN_1, CLARIFYING_TURN_2, GENERATING, PREVIEW, COMPLETED, CANCELLED)
- **`AgentRequirements`**: Extracted requirements from conversation
- **`GeneratedAgent`**: Final result with definition + summary
- **`VibeCodingSession`**: Persisted session data

### 2. Clarifier (`clarifier.ts`)

Generates intelligent clarification questions:

```typescript
const questions = await generateClarificationQuestions(
  conversation,      // Full conversation history
  currentRequirements, // Requirements extracted so far
  turnNumber,        // 1, 2, or 3
  aiProvider,        // AI provider for generation
  {
    maxQuestions: 3,
    focusAreas: ['personality', 'constraints']
  }
)
```

Features:
- AI-powered question generation
- Fallback to template questions if AI fails
- Context-aware based on previous turns

### 3. Parser (`parser.ts`)

Extracts and refines requirements:

```typescript
const requirements = await extractAgentRequirements(
  conversation,
  aiProvider
)

// Enhanced with conversation pattern analysis
const refined = await analyzeConversationPatterns(
  conversation,
  requirements,
  aiProvider
)
```

Extracts:
- **Personality**: tone, verbosity, style
- **Constraints**: brief mode, function permissions, timeouts
- **Capabilities**: web, files, audio, images
- **Use case**: primary purpose
- **Special instructions**: specific requirements

### 4. Generator (`generator.ts`)

Creates complete agent definition:

```typescript
const generated = generateAgentDefinition(requirements)

// Returns:
{
  definition: AgentDefinition,      // Structured definition
  naturalLanguageSummary: string,   // Human-readable description
  confidence: number,               // 0-1 confidence score
  warnings: string[]                // Any validation warnings
}
```

The natural language summary includes:
- Agent name and icon
- Purpose and use case
- Personality traits
- Behavioral details
- Capabilities list
- Special instructions
- Approval prompt

### 5. State Machine (`state-machine.ts`)

Manages the entire flow:

```typescript
// Create state machine
const machine = await createStateMachine(conversationId, aiProvider)

// Start the process
const result1 = await machine.start(conversation)
// → Returns questions for turn 1

// User responds, advance turn
const result2 = await machine.advanceTurn(conversation, userResponses)
// → Returns questions for turn 2

// User responds again, advance to generation
const result3 = await machine.advanceTurn(conversation, userResponses)
// → canGenerate = true

// Generate the agent
const agent = await machine.generate(conversation)

// User approves
await machine.approve()
// → State = COMPLETED
```

**Features:**
- IndexedDB persistence (survives page refresh)
- State validation and error handling
- Session cleanup and management
- Preview before approval

## Usage Example

```typescript
import { createStateMachine } from '@/lib/vibe-coding'
import { ProviderFactory } from '@/lib/ai/provider'

// Setup
const provider = ProviderFactory.createOpenAI(apiKey)
const machine = await createStateMachine('conv-123', provider)

// === Turn 1 ===
const turn1 = await machine.start(conversationMessages)
// Questions:
// 1. Should I be concise in ALL responses, or only when providing information?
// 2. When you say "ask before calling functions", which functions specifically?
// 3. Should I show you what function I'm about to call?

const userResponses1 = [
  'Concise in info responses only',
  'All functions',
  'Show me what function'
]

// === Turn 2 ===
const turn2 = await machine.advanceTurn(conversationMessages, userResponses1)
// Questions:
// 1. How should I handle it if you don't respond to my permission request?
// 2. Do you want me to wait indefinitely, timeout after 30s, or proceed anyway?
// 3. Any specific format for showing function details?

const userResponses2 = [
  'Wait indefinitely',
  'Show function name and parameters'
]

// === Turn 3 (Final) ===
const turn3 = await machine.advanceTurn(conversationMessages, userResponses2)
// → canGenerate = true

// === Generate ===
const agent = await machine.generate(conversationMessages)

console.log(agent.naturalLanguageSummary)
// # Concise Assistant 💬
//
// ## Purpose
// Quick, to-the-point information while maintaining full control
//
// ## Personality
// - Tone: Professional
// - Verbosity: Concise
// - Style: Direct
//
// ## Behavior
// - Provides concise responses when sharing information
// - Asks for permission before calling any function
// - Shows you the function name and parameters before calling
// - Waits indefinitely for your response
//
// ---
//
// Ready to activate? [Yes] [No] [Edit]

// === Approve ===
await machine.approve()

// === Use Agent ===
registerAgent(agent.definition)
```

## Example Generated Agent

```typescript
{
  definition: {
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
  },
  naturalLanguageSummary: '...',
  confidence: 0.85,
  warnings: []
}
```

## Question Strategy

The 3-turn clarification process follows a progressive refinement strategy:

### Turn 1: Initial Understanding
- **Focus**: Basic personality and purpose
- **Example questions**:
  - What tone would you like me to use?
  - Should I be direct and to-the-point, or more conversational?
  - Any specific topics or domains I should focus on?

### Turn 2: Specific Behaviors
- **Focus**: Constraints and permissions
- **Example questions**:
  - How should I handle it if you don't respond to my permission request?
  - Should I ask for clarification when your request is ambiguous?
  - Any specific format for showing function details?

### Turn 3: Final Details
- **Focus**: Edge cases and preferences
- **Example questions**:
  - Anything else I should know about your preferences?
  - Would you like me to learn from our conversations over time?
  - Should I proactively suggest improvements or only respond when asked?

## AI Provider Integration

The vibe-coding engine works with any AI provider:

```typescript
import { ProviderFactory } from '@/lib/ai/provider'

// OpenAI
const openai = ProviderFactory.createOpenAI(apiKey)

// Anthropic
const anthropic = ProviderFactory.createAnthropic(apiKey)

// Local (Ollama)
const local = ProviderFactory.createLocal({
  model: 'llama2',
  baseUrl: 'http://localhost:11434'
})

// All work with vibe-coding
const machine = await createStateMachine(conversationId, openai)
```

## Persistence and Resilience

Sessions are persisted to IndexedDB:

```typescript
// List sessions for a conversation
const sessions = await listSessions('conv-123')

// Load existing session
const machine = await loadStateMachine(sessionId, provider)

// Cleanup old sessions
await cleanupOldSessions(7) // Delete sessions older than 7 days
```

## Error Handling

The system includes comprehensive error handling:

```typescript
import { VibeCodingError } from '@/lib/vibe-coding'

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

## Testing

```bash
# Run tests
npm test src/lib/vibe-coding

# Type checking
npx tsc --noEmit src/lib/vibe-coding/**/*.ts
```

## Success Metrics

- ✅ 3-turn clarification loop works smoothly
- ✅ Questions are relevant and helpful
- ✅ Agent requirements extracted accurately
- ✅ Generated AgentDefinition is valid
- ✅ Natural language summary is clear
- ✅ State machine handles all edge cases
- ✅ Zero TypeScript errors
- ✅ Comprehensive test coverage

## Integration Points

### With Messenger UI

```typescript
// In a conversation component
const [machine, setMachine] = useState<VibeCodingStateMachine | null>(null)
const [stage, setStage] = useState<VibeCodingState>(VibeCodingState.IDLE)

// Start vibe-coding
const startVibeCoding = async () => {
  const m = await createStateMachine(conversation.id, aiProvider)
  setMachine(m)

  const result = await m.start(messages)
  setStage(result.nextState)
  setQuestions(result.questions)
}

// Submit responses
const submitResponses = async (responses: string[]) => {
  const result = await machine.advanceTurn(messages, responses)
  setStage(result.nextState)

  if (result.canGenerate) {
    const agent = await machine.generate(messages)
    setGeneratedAgent(agent)
  } else {
    setQuestions(result.questions)
  }
}
```

### With Agent Registry

```typescript
import { registerAgent } from '@/lib/agents/registry'

// After user approves
await machine.approve()
const { definition } = machine.getSession().generatedAgent!

// Register the agent
registerAgent(definition)

// Agent is now available in the system
```

## Future Enhancements

Potential improvements for future rounds:

1. **Multi-turn refinement**: Allow more than 3 turns for complex agents
2. **Example-driven**: Users can provide example conversations
3. **Iterative editing**: Edit generated agent and regenerate
4. **Template suggestions**: Suggest similar existing agents
5. **Validation testing**: Test agent with sample inputs before approving
6. **Export/Import**: Share agents with others
7. **Version history**: Track iterations of agent definitions

## Files

- `types.ts` - Type definitions
- `clarifier.ts` - Question generation engine
- `parser.ts` - Requirement extraction
- `generator.ts` - Agent definition generator
- `state-machine.ts` - State management
- `index.ts` - Public API exports
- `__tests__/vibe-coding.test.ts` - Test suite
- `README.md` - This file

## License

MIT
