# Spreader Agent Implementation

## Overview

The **Spreader Agent** is a context window management system that helps users work around AI context limits through intelligent schema generation, parallel task spreading, and child conversation merging.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Spreader Agent                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Context Meter   │  │ Schema Gen   │  │ Spread Engine │ │
│  │ - Token tracking│  │ - LLM-based  │  │ - Parallel    │ │
│  │ - Percentage    │  │ - Structure  │  │   tasks       │ │
│  │ - Status colors │  │ - Overview   │  │ - Child mgmt  │ │
│  └─────────────────┘  └──────────────┘  └───────────────┘ │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Merge Handler   │  │ UI Components│  │ Storage       │ │
│  │ - Summarize     │  │ - Dashboard  │  │ - Child convs │ │
│  │ - Schema update │  │ - Meter      │  │ - State       │ │
│  │ - Integration   │  │ - Schema     │  │ - History     │ │
│  └─────────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. Context Window Tracking
- Real-time token counting
- Percentage-based status indicators (healthy/warning/critical)
- Color-coded visual feedback:
  - 🟢 Green: < 60%
  - 🟡 Yellow: 60-85%
  - 🔴 Red: ≥ 85%

### 2. Schema Generation
At 85% context capacity, Spreader automatically generates a structured schema:

```typescript
{
  project: "Building a todo app",
  description: "Full-stack Next.js application",
  completed: ["Requirements", "UI design", "Auth system"],
  inProgress: ["Database schema", "API endpoints"],
  next: ["Testing", "Deployment"],
  decisions: ["Use PostgreSQL", "Next.js 14", "Tailwind CSS"],
  technicalSpecs: {
    stack: ["Next.js", "PostgreSQL", "Prisma"],
    architecture: "Serverless",
    patterns: ["Repository pattern"]
  }
}
```

### 3. Parallel Task Spreading
Users can create parallel child conversations with:

```
User: "Spread this: Research auth, Design DB, Write API"

Spreader: "Creating 3 parallel conversations:
1. Research auth (Working...)
2. Design DB (Working...)
3. Write API (Working...)"
```

Each child conversation:
- Works independently on its task
- Has its own context window
- Can be monitored in real-time
- Shows status (pending, working, complete, error)

### 4. Child Conversation Merging
When a child completes its work:

```
User: "Merge child child_abc123"

Spreader: "✅ Merged child conversation:
[Summary of work completed]

Schema updated with new findings."
```

## File Structure

```
src/lib/agents/spreader/
├── types.ts              # Core type definitions
├── spreader-agent.ts     # Main agent handler
├── schema.ts             # Schema generation utilities
├── spread-commands.ts    # Command parsing & child management
└── index.ts              # Public exports

src/components/agents/spreader/
├── ContextMeter.tsx      # Context usage visualization
├── SpreadDashboard.tsx   # Child conversation manager
├── SpreaderConversation.tsx  # Main UI component
└── index.ts              # Component exports
```

## Usage

### Activation
Spreader is registered in the agent presets and available in the AI Agents section of the sidebar:

```typescript
// Already registered in src/lib/agents/presets.ts
export const SPREADER_AGENT: AgentDefinition = {
  id: 'spreader-v1',
  name: 'Spreader',
  description: 'Context window manager...',
  icon: '📚',
  category: AgentCategory.KNOWLEDGE,
  // ... no hardware requirements - works on all devices
}
```

### Commands

#### Status Check
```
User: "Status"
Spreader: Shows current context usage, active children, schema status
```

#### Spread Tasks
```
User: "Spread this: Task A, Task B, Task C"
Spreader: Creates 3 parallel conversations
```

#### Merge Child
```
User: "Merge child child_123"
Spreader: Merges child summary into parent
```

#### Help
```
User: "Help"
Spreader: Shows command reference and tips
```

## Integration Example

```typescript
import { spreaderHandler, createInitialSpreaderState } from '@/lib/agents/spreader'
import { SpreaderConversation } from '@/components/agents/spreader'

// Initialize state
const spreaderState = createInitialSpreaderState()

// Handle user message
const response = await spreaderHandler(
  userMessage,
  {
    conversationId: currentConversation.id,
    agentState: spreaderState,
    messages: conversationHistory,
    sendMessage: async (content) => { /* ... */ }
  }
)

// Render UI
<SpreaderConversation
  conversationId={conversationId}
  agentState={spreaderState}
  onSendMessage={handleSendMessage}
  onCompact={handleCompactContext}
/>
```

## Configuration Options

```typescript
{
  maxContextPercentage: 80,        // Max context to use (0-100)
  enableParallelSpreading: true,   // Enable parallel tasks
  compressionStrategy: 'summarize' // summarize | extract-key | user-directed
}
```

## Technical Details

### Token Counting
- Uses simple estimation: ~4 characters per token
- Tracks message text and metadata
- Real-time updates on each message

### Schema Generation
- LLM-powered analysis using configured AI provider
- Fallback to rule-based extraction if LLM unavailable
- Validates and normalizes schema structure

### Child Conversations
- Stored as separate conversation records in IndexedDB
- Inherit context from parent (last N messages)
- Independent message histories
- Merged via summary generation

### State Management
```typescript
interface SpreaderState {
  currentTokens: number
  maxTokens: number
  thresholdTokens: number      // 85% threshold
  warningTokens: number        // 60% threshold
  schemaGenerated: boolean
  currentSchema: SessionSchema | null
  childConversations: ChildConversation[]
  activeSpreadId: string | null
  autoCompact: boolean
  autoSpread: boolean
}
```

## UI Components

### ContextMeter
Shows context usage with color-coded progress bar:

```tsx
<ContextMeter
  metrics={metrics}
  onCompact={handleCompact}
  compact={false}
/>
```

### SpreadDashboard
Lists active child conversations with status indicators:

```tsx
<SpreadDashboard
  children={childConversations}
  onViewChild={(id) => window.open(`/conversation/${id}`)}
  onMergeChild={(id) => sendMessage(`Merge child ${id}`)}
/>
```

### SpreaderConversation
Main UI with welcome message, context meter, schema display, and quick actions:

```tsx
<SpreaderConversation
  conversationId={conversationId}
  agentState={spreaderState}
  onSendMessage={sendMessage}
  onCompact={compactContext}
/>
```

## Success Criteria

✅ Click Spreader in sidebar → Opens Spreader conversation
✅ Spreader sends welcome message with explanation
✅ Context meter shows real-time token usage
✅ "Spread this:" command creates parallel conversations
✅ Spread dashboard shows child conversation status
✅ "Merge" button brings child summary into parent
✅ 85% context → Auto-generates schema
✅ Schema updates with merged content
✅ Zero TypeScript errors
✅ Feels like a natural conversation, not a tool

## Future Enhancements

1. **Smart Context Pruning**: AI-powered identification of less important messages
2. **Cross-Conversation Schema**: Global schema spanning multiple conversations
3. **Auto-Merge**: Automatically merge completed children
4. **Schema Search**: Search across generated schemas
5. **Context Recommendations**: Suggest when to compact based on content

## Testing

The implementation includes:
- Type-safe interfaces
- Error handling for LLM failures
- Fallback schema generation
- Edge case handling (empty conversations, etc.)

To test manually:

1. Open Spreader agent
2. Send a message to trigger welcome
3. Check context meter appears
4. Try "Spread this: Task A, Task B"
5. Verify children created
6. Try "Merge child <id>"
7. Verify merge and schema update

## Credits

**Implementation:** Agent 6 - Spreader Agent Implementation
**Date:** 2025-01-05
**Mode:** Autonomous with AutoAccept

The Spreader agent enables users to work around AI context limits through intelligent management of conversation context, parallel task execution, and schema-based summarization.
