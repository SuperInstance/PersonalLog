# Agent Communication Protocol

## Overview

The Agent Communication Protocol is a type-safe, event-driven messaging system that enables agents to communicate and collaborate with each other in real-time. It follows a publish-subscribe pattern, allowing agents to send messages to specific recipients or broadcast to all agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Agent Event Bus                           │
│                    (Singleton)                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   JEPA       │  │  Spreader    │  │  Future      │    │
│  │  Subscriber  │  │  Subscriber  │  │  Agents      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│         └─────────────────┴──────────────────┘             │
│                           │                                │
│                    Message Router                          │
│                  (History, Stats)                          │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Types (`types.ts`)

Defines the message structure and types for type-safe communication.

**Key Types:**
- `AgentMessage` - Message structure with ID, sender, recipient, type, payload, timestamp, priority, and status
- `MessageType` - Enum of all message types (USER_EMOTION_CHANGE, CONTEXT_CRITICAL, etc.)
- `AgentAddress` - Address system for sender and recipient
- `MessagePayloads` - Type-safe payload mapping based on MessageType
- `MessageFilter` - Filter for querying message history
- `MessageStats` - Statistics about message traffic

### 2. Event Bus (`event-bus.ts`)

Singleton pub/sub messaging system that routes messages between agents.

**Key Methods:**
- `subscribe(agentId, handler)` - Subscribe to messages
- `unsubscribe(agentId, handler)` - Unsubscribe from messages
- `publish(message)` - Publish a message to the event bus
- `broadcast(message)` - Broadcast a message to all agents
- `getHistory(filter)` - Get message history with optional filtering
- `getStats()` - Get message statistics

**Features:**
- Message history (last 100 messages)
- Statistics tracking (sent, received, by type, by agent)
- Automatic message routing to specific agents or broadcast
- Debug logging in development mode
- Delivery status tracking

### 3. Protocol (`protocol.ts`)

Message routing, validation, and helper functions.

**Key Functions:**
- `sendMessage(from, to, type, payload, priority)` - Send a message
- `broadcastMessage(from, type, payload, priority)` - Broadcast to all agents
- `sendRequest(from, to, type, payload, timeout)` - Send request and wait for response
- `validateMessage(message)` - Validate message structure
- `createResponse(originalMessage, from, type, payload)` - Create response message
- `sendResponse(originalMessage, from, type, payload)` - Send response

**Features:**
- Message validation (structure, timestamp, fields)
- Request/response pattern with correlation IDs
- Timeout handling for requests
- Acknowledgment system

### 4. Integrations (`integrations.ts`)

Agent-specific message handlers and integration examples.

**Classes:**
- `JEPAAgentCommunicationHandler` - JEPA agent communication handler
- `SpreaderAgentCommunicationHandler` - Spreader agent communication handler

**Function:**
- `setupAgentCommunication(jepaAgent, spreaderAgent)` - Setup communication between JEPA and Spreader

### 5. Message Inspector (`MessageInspector.tsx`)

Debug UI for monitoring agent communication in real-time.

**Features:**
- Real-time message history display
- Filter by agent, type, priority
- Message statistics dashboard
- Detailed message inspection modal
- Send test messages
- Auto-refresh toggle

## Message Types

### User State Changes
- `USER_EMOTION_CHANGE` - User's emotion has changed
- `USER_FRUSTRATION_DETECTED` - User frustration detected
- `USER_ENGAGEMENT_LOW` - User engagement is low

### Context Management
- `CONTEXT_CRITICAL` - Context window is at critical capacity
- `CONTEXT_COMPACTED` - Context has been compacted
- `SCHEMA_GENERATED` - New schema has been generated

### Agent Actions
- `REQUEST_COMPACT` - Request context compaction
- `REQUEST_SPREAD` - Request conversation spreading
- `SPAWN_CHILD` - Spawn a child agent

### Collaboration
- `COLLAB_REQUEST` - Request collaboration from another agent
- `COLLAB_RESPONSE` - Response to collaboration request

### System
- `AGENT_STATUS` - Agent status update
- `HEARTBEAT` - Agent heartbeat signal
- `ERROR` - Error notification

## Usage Examples

### Basic Message Sending

```typescript
import { sendMessage, MessageType } from '@/lib/agents/communication'

// Send a message from JEPA to Spreader
sendMessage(
  'jepa-v1',
  'spreader-v1',
  MessageType.USER_FRUSTRATION_DETECTED,
  {
    valence: 0.2,
    arousal: 0.8,
    confidence: 0.9,
    recentMessages: [
      { emotion: 'frustrated', timestamp: Date.now() - 60000 }
    ]
  },
  'high' // priority
)
```

### Broadcasting

```typescript
import { broadcastMessage, MessageType } from '@/lib/agents/communication'

// Broadcast to all agents
broadcastMessage(
  'jepa-v1',
  MessageType.AGENT_STATUS,
  {
    status: 'active',
    capabilities: ['emotion_analysis'],
    load: 0.5
  },
  'low'
)
```

### Subscribing to Messages

```typescript
import { agentEventBus } from '@/lib/agents/communication'

// Subscribe to messages
const unsubscribe = agentEventBus.subscribe('jepa-v1', (message) => {
  console.log('Received:', message.type, message.payload)
})

// Unsubscribe later
unsubscribe()
```

### Request/Response Pattern

```typescript
import { sendRequest, MessageType } from '@/lib/agents/communication'

try {
  const response = await sendRequest(
    'jepa-v1',
    'spreader-v1',
    MessageType.COLLAB_REQUEST,
    {
      action: 'analyze_emotion',
      params: { transcript: 'User message here' }
    },
    5000 // 5 second timeout
  )

  console.log('Response:', response.payload)
} catch (error) {
  console.error('Request timeout:', error)
}
```

## Message Flow Examples

### Flow 1: JEPA → Spreader (Frustration Detected)

1. **JEPA detects user frustration**
   - Analyzes emotion from user message
   - Detects negative emotion with high intensity
   - Sends USER_FRUSTRATION_DETECTED message to Spreader

2. **Spreader receives message**
   - Checks context usage percentage
   - If >70%, suggests context compaction
   - Sends COLLAB_RESPONSE back to JEPA

3. **JEPA receives response**
   - Logs the compaction suggestion
   - May take further action

```typescript
// JEPA side
if (emotion.valence < 0.3 && emotion.arousal > 0.7) {
  sendMessage('jepa-v1', 'spreader-v1',
    MessageType.USER_FRUSTRATION_DETECTED,
    emotion, 'high')
}

// Spreader side
agentEventBus.subscribe('spreader-v1', (message) => {
  if (message.type === MessageType.USER_FRUSTRATION_DETECTED) {
    if (getContextPercentage() > 70) {
      sendResponse(message, 'spreader-v1',
        MessageType.COLLAB_RESPONSE,
        { action: 'compaction_suggested', ... })
    }
  }
})
```

### Flow 2: Spreader → JEPA (Context Critical)

1. **Spreader hits 85% context**
   - Monitors context usage
   - When threshold reached, notifies JEPA
   - Sends CONTEXT_CRITICAL message

2. **JEPA receives notification**
   - Analyzes recent emotional themes
   - Prepares emotional summary
   - Sends COLLAB_RESPONSE with suggestions

3. **Spreader uses emotional summary**
   - Informs context compaction decisions
   - Prioritizes emotionally relevant content

```typescript
// Spreader side
if (metrics.percentage >= 85) {
  sendMessage('spreader-v1', 'jepa-v1',
    MessageType.CONTEXT_CRITICAL,
    { percentage, tokensUsed, tokensTotal, schema },
    'normal')
}

// JEPA side
agentEventBus.subscribe('jepa-v1', (message) => {
  if (message.type === MessageType.CONTEXT_CRITICAL) {
    const themes = analyzeRecentEmotions()
    sendResponse(message, 'jepa-v1',
      MessageType.COLLAB_RESPONSE,
      { action: 'emotional_summary_provided', themes })
  }
})
```

## Integration with Existing Agents

### JEPA Integration

The JEPA agent automatically subscribes to the event bus on initialization:

```typescript
// In JEPAAgentHandler constructor
this.setupCommunication()

private setupCommunication(): void {
  this.unsubscribeFromEventBus = agentEventBus.subscribe(
    'jepa-v1',
    this.handleAgentMessage.bind(this)
  )

  // Send initial status
  agentEventBus.publish({
    from: { agentId: 'jepa-v1', type: 'agent' },
    to: { agentId: 'broadcast', type: 'broadcast' },
    type: MessageType.AGENT_STATUS,
    payload: { status: 'idle', capabilities: [...], load: 0 },
    timestamp: Date.now(),
    priority: 'low',
    status: 'delivered'
  })
}
```

### Spreader Integration

The Spreader agent also subscribes to the event bus:

```typescript
// In SpreaderAgent constructor
this.setupCommunication()

private setupCommunication(): void {
  this.unsubscribeFromEventBus = agentEventBus.subscribe(
    'spreader-v1',
    this.handleAgentMessage.bind(this)
  )

  // Send initial status
  agentEventBus.publish({
    from: { agentId: 'spreader-v1', type: 'agent' },
    to: { agentId: 'broadcast', type: 'broadcast' },
    type: MessageType.AGENT_STATUS,
    payload: { status: 'active', capabilities: [...], load: 0 },
    timestamp: Date.now(),
    priority: 'low',
    status: 'delivered'
  })
}
```

## Debugging

### Using the Message Inspector

The MessageInspector component provides a real-time view of agent communication:

```tsx
import { MessageInspector } from '@/components/agents/communication/MessageInspector'

export default function DebugPage() {
  return <MessageInspector />
}
```

Features:
- View all messages in real-time
- Filter by agent, type, priority
- Inspect message payloads
- Send test messages
- View statistics

### Console Logging

In development mode, all messages are logged to the console:

```
[AgentEventBus] 🟡 jepa-v1 → spreader-v1: USER_FRUSTRATION_DETECTED
[AgentEventBus] Payload: { valence: 0.2, arousal: 0.8, ... }
```

Priority icons:
- 🔴 High
- 🟡 Normal
- 🟢 Low

## Best Practices

### 1. Type Safety

Always use the `MessageType` enum and `MessagePayloads` type:

```typescript
// ✅ Good - Type-safe
sendMessage('jepa-v1', 'spreader-v1',
  MessageType.USER_FRUSTRATION_DETECTED,
  { valence: 0.2, arousal: 0.8, confidence: 0.9, recentMessages: [] },
  'high')

// ❌ Bad - Not type-safe
agentEventBus.publish({
  type: 'some_random_type',
  payload: {}
})
```

### 2. Error Handling

Always wrap message handlers in try-catch:

```typescript
agentEventBus.subscribe('my-agent', async (message) => {
  try {
    await handleMessage(message)
  } catch (error) {
    console.error('Error handling message:', error)

    // Send error notification
    sendMessage('my-agent', message.from.agentId,
      MessageType.ERROR,
      { error: error.message, stack: error.stack },
      'high')
  }
})
```

### 3. Cleanup

Always unsubscribe when disposing agents:

```typescript
class MyAgent {
  private unsubscribe: (() => void) | null = null

  constructor() {
    this.unsubscribe = agentEventBus.subscribe('my-agent', this.handleMessage)
  }

  dispose() {
    this.unsubscribe?.()
  }
}
```

### 4. Priority Levels

Use appropriate priority levels:
- `high` - Urgent (frustration, errors, critical context)
- `normal` - Standard (status updates, collaboration)
- `low` - Background (heartbeat, statistics)

### 5. Correlation IDs

Use correlation IDs for request/response pairs:

```typescript
// Send request
const request = sendMessage('agent1', 'agent2',
  MessageType.COLLAB_REQUEST,
  { action: 'do_something' },
  'normal')

// Send response with correlation ID
sendResponse(request, 'agent2',
  MessageType.COLLAB_RESPONSE,
  { result: 'done' })
```

## Performance Considerations

### Message History

The event bus maintains a history of the last 100 messages. This can be adjusted:

```typescript
// In event-bus.ts
private maxHistory = 100 // Adjust as needed
```

### Broadcast Overhead

Broadcasting to all agents sends to every subscriber. Use targeted messages when possible:

```typescript
// ✅ Good - Targeted
sendMessage('agent1', 'agent2', MessageType.SOMETHING, payload)

// ⚠️ Use sparingly - Broadcast
broadcastMessage('agent1', MessageType.SOMETHING, payload)
```

### Async Handlers

Message handlers can be async. Consider performance implications:

```typescript
agentEventBus.subscribe('my-agent', async (message) => {
  // Long-running operation
  await processData(message.payload)
})
```

## Testing

### Unit Testing

```typescript
import { agentEventBus, MessageType } from '@/lib/agents/communication'

describe('Agent Communication', () => {
  beforeEach(() => {
    agentEventBus.reset()
  })

  test('sends and receives message', async () => {
    let receivedMessage = null

    agentEventBus.subscribe('test-agent', (message) => {
      receivedMessage = message
    })

    sendMessage('sender', 'test-agent',
      MessageType.AGENT_STATUS,
      { status: 'active', capabilities: [], load: 0 },
      'normal')

    expect(receivedMessage).not.toBeNull()
    expect(receivedMessage.type).toBe(MessageType.AGENT_STATUS)
  })
})
```

### Integration Testing

```typescript
import { setupAgentCommunication } from '@/lib/agents/communication'
import { getJEPAAgent } from '@/lib/agents/jepa-agent'
import { getSpreaderAgent } from '@/lib/agents/spreader/spreader-agent'

test('JEPA and Spreader communicate', async () => {
  const jepa = getJEPAAgent()
  const spreader = getSpreaderAgent()

  setupAgentCommunication(jepa, spreader)

  // Trigger JEPA to send frustration message
  // Verify Spreader responds appropriately
})
```

## Future Enhancements

### Planned Features

1. **Message Persistence** - Store messages in IndexedDB for debugging
2. **Message Replay** - Replay messages for testing
3. **Agent Discovery** - Automatic agent discovery and registration
4. **Message Encryption** - End-to-end encryption for sensitive data
5. **Message Aggregation** - Aggregate similar messages to reduce noise
6. **Circuit Breaker** - Prevent message flooding
7. **Dead Letter Queue** - Handle failed messages
8. **Message Batching** - Batch multiple messages together

### Extensibility

Adding new agents:

```typescript
// 1. Define agent-specific message types
enum CustomMessageType {
  CUSTOM_EVENT = 'custom_event'
}

// 2. Extend MessagePayloads
interface CustomMessagePayloads {
  [CustomMessageType.CUSTOM_EVENT]: { data: string }
}

// 3. Subscribe to event bus
agentEventBus.subscribe('custom-agent-v1', handleMessage)

// 4. Send messages
sendMessage('custom-agent-v1', 'other-agent',
  CustomMessageType.CUSTOM_EVENT,
  { data: 'hello' },
  'normal')
```

## Troubleshooting

### Messages Not Delivered

**Problem:** Messages are sent but not received.

**Solutions:**
1. Check agent ID matches subscription ID
2. Verify agent is subscribed before sending
3. Check console for errors in handler
4. Verify message structure is valid

### Handler Errors

**Problem:** Handler throws an error, breaking subsequent messages.

**Solution:** Always wrap handlers in try-catch:

```typescript
agentEventBus.subscribe('agent', (message) => {
  try {
    // Handle message
  } catch (error) {
    console.error('Handler error:', error)
  }
})
```

### Memory Leaks

**Problem:** Agents not unsubscribing when disposed.

**Solution:** Always unsubscribe in dispose():

```typescript
class Agent {
  private unsubscribe: (() => void) | null = null

  constructor() {
    this.unsubscribe = agentEventBus.subscribe('agent', handler)
  }

  dispose() {
    this.unsubscribe?.()
  }
}
```

## References

- **Agent Types:** `/src/lib/agents/types.ts`
- **JEPA Agent:** `/src/lib/agents/jepa-agent.ts`
- **Spreader Agent:** `/src/lib/agents/spreader/spreader-agent.ts`
- **Event Bus Implementation:** `/src/lib/agents/communication/event-bus.ts`
- **Protocol Functions:** `/src/lib/agents/communication/protocol.ts`

## License

MIT
