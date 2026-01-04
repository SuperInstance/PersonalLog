# PersonalLog Architecture

Comprehensive architectural documentation for PersonalLog v2.0.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Data Flow](#data-flow)
4. [Component Architecture](#component-architecture)
5. [Storage Architecture](#storage-architecture)
6. [AI Integration](#ai-integration)
7. [Performance Optimization](#performance-optimization)
8. [Security & Privacy](#security--privacy)
9. [Scalability](#scalability)
10. [Technology Decisions](#technology-decisions)

---

## Overview

### Design Philosophy

PersonalLog is built on these core principles:

**1. Local-First**
- All data stored locally by default
- Full functionality without internet
- User owns their data
- Optional sync across devices

**2. Performance**
- WebAssembly for compute-intensive tasks
- Optimistic UI updates
- Intelligent caching
- Hardware-aware optimization

**3. Privacy**
- No third-party tracking
- End-to-end encryption for sync
- User-controlled data sharing
- Transparent data practices

**4. Extensibility**
- Plugin system for customization
- Multiple AI provider support
- Custom export/import formats
- User-defined workflows

**5. Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                           │
│  Messenger | Knowledge | Settings | Setup | Catalog         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  React Components | UI Library | Theme System               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  State Management | Routing | Hooks | Providers             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  AI System | Knowledge | Analytics | Optimization            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  Storage | Cache | Sync | Backup | Import/Export             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  IndexedDB | WebAssembly | Browser APIs | Network            │
└─────────────────────────────────────────────────────────────┘
```

---

## System Architecture

### Module System

PersonalLog uses a modular architecture where each feature is self-contained:

```
src/
├── app/                    # Next.js App Router (presentation)
│   ├── (messenger)/       # Messenger feature module
│   ├── (longform)/        # Longform feature module
│   └── api/               # API endpoints
│
├── components/            # Reusable UI components
│   ├── messenger/         # Messenger-specific components
│   ├── knowledge/         # Knowledge-specific components
│   └── ui/                # Generic UI components
│
└── lib/                   # Business logic libraries
    ├── ai/                # AI provider system
    ├── knowledge/         # Knowledge management
    ├── storage/           # Data persistence
    └── ...                # Other libraries
```

**Module Independence:**
- Each module has minimal dependencies
- Clear boundaries between modules
- Shared functionality in `/lib`
- Communication via well-defined APIs

### Feature Organization

**Layout Groups:**
- `(messenger)`: Chat and conversations
- `(longform)`: Knowledge, notes, tasks
- Unscoped: Setup, settings, catalog

**Shared Layout:**
Root layout provides:
- Theme provider
- Error boundaries
- Global styles
- Metadata

---

## Data Flow

### Request Flow

```
User Action
    │
    ▼
Event Handler (Component)
    │
    ▼
State Update (Hook/Reducer)
    │
    ▼
Side Effects (useEffect)
    │
    ▼
API Call / Storage Operation
    │
    ▼
Response Processing
    │
    ▼
State Update
    │
    ▼
Re-render
```

### Example: Sending a Message

```typescript
// 1. User clicks send button
<button onClick={handleSend}>Send</button>

// 2. Event handler
const handleSend = async () => {
  // Optimistic update
  setMessages(prev => [...prev, { role: 'user', content }]);

  try {
    // 3. API call
    const response = await ai.chat({
      message: content,
      conversationId,
    });

    // 4. Update state with response
    setMessages(prev => [...prev, response]);

    // 5. Save to storage
    await storage.addMessage(conversationId, response);
  } catch (error) {
    // 6. Handle error
    showErrorNotification(error);
  }
};
```

### Data Persistence Flow

```
Component Action
    │
    ▼
Storage API Call
    │
    ├─→ IndexedDB (primary)
    │       │
    │       ├─→ Success
    │       │       │
    │       │       └─→ Cache Update
    │       │               │
    │       │               └─→ UI Update (via subscription)
    │       │
    │       └─→ Error
    │               │
    │               └─→ Retry / Error Notification
    │
    └─→ In-Memory Cache (backup)
```

---

## Component Architecture

### Component Hierarchy

```
AppLayout
├── AppNav
├── ErrorBoundary
│   └── Pages
│       ├── MessengerPage
│       │   ├── ConversationList
│       │   ├── ChatArea
│       │   │   ├── MessageList
│       │   │   │   └── MessageBubble
│       │   │   └── MessageInput
│       │   └── ContextPanel
│       │
│       ├── KnowledgePage
│       │   ├── KnowledgeBrowser
│       │   │   ├── EntryCard
│       │   │   └── SearchBar
│       │   └── EntryEditor
│       │
│       └── SettingsPage
│           ├── SettingsNav
│           └── SettingsSections
│
└── ToastProvider
    └── ToastContainer
```

### Component Patterns

**1. Container/Presenter Pattern**

```typescript
// Container: Logic and state
export function MessengerContainer() {
  const { conversations, activeId, setActive } = useMessenger();
  return (
    <Messenger
      conversations={conversations}
      activeId={activeId}
      onSelect={setActive}
    />
  );
}

// Presenter: Pure UI
export function Messenger({
  conversations,
  activeId,
  onSelect,
}: MessengerProps) {
  return (
    <div className="messenger">
      {conversations.map(conv => (
        <ConversationItem
          key={conv.id}
          {...conv}
          active={conv.id === activeId}
          onClick={() => onSelect(conv.id)}
        />
      ))}
    </div>
  );
}
```

**2. Compound Components**

```typescript
export function Dialog({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

Dialog.Trigger = function DialogTrigger({ children }) {
  const { setOpen } = useContext(DialogContext);
  return <button onClick={() => setOpen(true)}>{children}</button>;
};

Dialog.Content = function DialogContent({ children }) {
  const { open, setOpen } = useContext(DialogContext);
  return open ? (
    <div className="dialog">
      {children}
      <button onClick={() => setOpen(false)}>Close</button>
    </div>
  ) : null;
};
```

**3. Render Props**

```typescript
export function DataFetcher({ url, children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);

  return children({ data, loading });
}

// Usage
<DataFetcher url="/api/data">
  {({ data, loading }) => (
    loading ? <Spinner /> : <Display data={data} />
  )}
</DataFetcher>
```

---

## Storage Architecture

### Storage Layer

```
Storage Abstraction Layer
    │
    ├─→ IndexedDB (primary storage)
│       ├─→ Conversations Store
│       ├─→ Knowledge Store
│       ├─→ Settings Store
│       └─→ Analytics Store
│
├─→ Cache Layer (in-memory)
│       ├─→ LRU Cache
│       ├─→ Query Cache
│       └─→ Computed Values
│
└─→ Backup/Sync Layer
        ├─→ Backup Engine
        ├─→ Sync Manager
        └─→ Import/Export
```

### IndexedDB Schema

**Database:** `personallog`

**Object Stores:**

```typescript
// 1. conversations
{
  keyPath: 'id',
  indexes: {
    updatedAt: { keyPath: 'updatedAt' },
    createdAt: { keyPath: 'createdAt' },
    archived: { keyPath: 'archived' }
  }
}

// 2. messages
{
  keyPath: 'id',
  indexes: {
    conversationId: { keyPath: 'conversationId' },
    createdAt: { keyPath: 'createdAt' }
  }
}

// 3. knowledge
{
  keyPath: 'id',
  indexes: {
    tags: { keyPath: 'tags', multiEntry: true },
    createdAt: { keyPath: 'createdAt' },
    updatedAt: { keyPath: 'updatedAt' }
  }
}

// 4. settings
{
  keyPath: 'key'
}

// 5. analytics
{
  keyPath: 'id',
  indexes: {
    timestamp: { keyPath: 'timestamp' },
    type: { keyPath: 'type' }
  }
}

// 6. contacts
{
  keyPath: 'id',
  indexes: {
    providerId: { keyPath: 'providerId' }
  }
}
```

### Storage API

**High-Level API:**

```typescript
import { storage } from '@/lib/storage';

// Collections
const conversations = storage.collection('conversations');
const messages = storage.collection('messages');
const knowledge = storage.collection('knowledge');

// CRUD Operations
await conversations.add({ title: 'New Chat' });
const conv = await conversations.get(id);
await conversations.update(id, { title: 'Updated' });
await conversations.delete(id);

// Queries
const results = await conversations.query({
  index: 'updatedAt',
  range: IDBKeyRange.lowerBound(date),
  limit: 10,
});

// Observers
const unsubscribe = conversations.onChange((change) => {
  console.log('Change:', change.type, change.doc);
});
```

### Cache Architecture

**Multi-Level Cache:**

```
┌─────────────────────────────────────┐
│         Component State             │ ← Fastest (memory)
│     (useState, useReducer)          │
└──────────────┬──────────────────────┘
               │ Cache Miss
               ▼
┌─────────────────────────────────────┐
│         React Query Cache           │ ← Fast (memory)
│      (stale-while-revalidate)       │
└──────────────┬──────────────────────┘
               │ Cache Miss
               ▼
┌─────────────────────────────────────┐
│         IndexedDB Storage           │ ← Slower (disk)
│         (persistent data)           │
└─────────────────────────────────────┘
```

**Cache Strategies:**

1. **Write-Through**
   - Write to cache and storage simultaneously
   - Ensures consistency
   - Used for critical data

2. **Write-Behind**
   - Write to cache immediately, storage later
   - Better performance
   - Risk of data loss on crash

3. **Cache-Aside**
   - Check cache first, storage on miss
   - Lazy loading
   - Used for read-heavy workloads

---

## AI Integration

### AI Provider Architecture

```
AIProvider Interface
    │
    ├─→ OpenAIProvider
    │       ├─→ GPT-4
    │       └─→ GPT-3.5-Turbo
    │
    ├─→ AnthropicProvider
    │       └─→ Claude 3
    │
    ├─→ GoogleProvider
    │       └─→ Gemini
    │
    ├─→ MistralProvider
    │       └─→ Mistral Large
    │
    └─→ CustomProvider
            └─→ User-defined
```

### AI Request Flow

```
User Message
    │
    ▼
Message Input Component
    │
    ▼
AI Contact (System Prompt + Personality)
    │
    ▼
Context Assembly
    ├─→ Conversation History
    ├─→ Knowledge Entries
    └─→ File Context
    │
    ▼
Provider Selection
    │
    ▼
API Request
    │
    ├─→ Streaming Response (preferred)
    │       │
    │       ├─→ Chunk received
    │       ├─→ Update UI
    │       └─→ Continue until done
    │
    └─→ Single Response (fallback)
            │
            └─→ Complete response received
                │
                ▼
Save to Storage
    │
    ▼
Update UI
```

### Message Processing

**Context Window Management:**

```typescript
async function prepareMessages(
  conversationId: string,
  newMessage: string
): Promise<Message[]> {
  // Get conversation history
  const history = await storage.messages.query({
    index: 'conversationId',
    equal: conversationId,
    order: 'desc',
    limit: MAX_MESSAGES,
  });

  // Reverse to chronological order
  const messages = history.reverse();

  // Calculate total tokens
  let totalTokens = 0;
  const messagesWithinWindow: Message[] = [];

  for (const msg of messages.reverse()) {
    const tokens = estimateTokens(msg);
    if (totalTokens + tokens > MAX_CONTEXT_TOKENS) {
      break;
    }
    totalTokens += tokens;
    messagesWithinWindow.unshift(msg);
  }

  // Add system prompt and new message
  return [
    { role: 'system', content: systemPrompt },
    ...messagesWithinWindow,
    { role: 'user', content: newMessage },
  ];
}
```

**Streaming Implementation:**

```typescript
async function* streamChat(
  request: ChatRequest
): AsyncIterable<string> {
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...request,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        const parsed = JSON.parse(data);
        const content = parsed.choices[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}
```

---

## Performance Optimization

### WebAssembly Integration

**Vector Operations (Rust):**

```rust
// native/rust/src/vector.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot_product: f32 = a.iter()
        .zip(b.iter())
        .map(|(x, y)| x * y)
        .sum();

    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    dot_product / (norm_a * norm_b)
}

#[wasm_bindgen]
pub fn batch_cosine_similarity(
    query: &[f32],
    vectors: Vec<Vec<f32>>
) -> Vec<f32> {
    vectors.iter()
        .map(|v| cosine_similarity(query, v))
        .collect()
}
```

**JavaScript Bridge:**

```typescript
// src/lib/native/bridge.ts
import { cosineSimilarity as wasmCosineSimilarity } from 'personallog-native';

export class VectorStore {
  private wasmModule: typeof import('personallog-native') | null = null;

  async init() {
    try {
      this.wasmModule = await import('personallog-native');
    } catch (error) {
      console.warn('WASM not available, using JS fallback');
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (this.wasmModule) {
      try {
        return this.wasmModule.cosine_similarity(a, b);
      } catch (error) {
        console.warn('WASM computation failed, using JS fallback');
      }
    }
    return cosineSimilarityJS(a, b);
  }
}
```

### Performance Monitoring

**Metrics Tracked:**

```typescript
// Performance metrics
interface PerformanceMetrics {
  // Render performance
  fcp: number;           // First Contentful Paint
  lcp: number;           // Largest Contentful Paint
  cls: number;           // Cumulative Layout Shift
  tti: number;           // Time to Interactive

  // Custom metrics
  messageSendTime: number;
  knowledgeSearchTime: number;
  storageOperationTime: number;
  aiResponseTime: number;

  // Resource usage
  memoryUsage: number;
  cacheHitRate: number;
}
```

**Optimization Strategies:**

1. **Code Splitting**
   - Route-based splitting
   - Component-based splitting
   - Lazy loading

2. **Memoization**
   - React.memo for components
   - useMemo for computations
   - useCallback for functions

3. **Virtual Scrolling**
   - For long lists
   - Only render visible items
   - Reuse DOM nodes

4. **Debouncing/Throttling**
   - Search input
   - Scroll events
   - Resize handlers

---

## Security & Privacy

### Privacy Architecture

**Data Protection:**

```
┌─────────────────────────────────────┐
│         User Data                   │
│  (Conversations, Knowledge, etc.)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Encryption (Optional)            │
│  - AES-256-GCM for sync             │
│  - End-to-end encryption            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Local Storage (IndexedDB)        │
│  - Never sent without permission    │
│  - User controls sharing            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Backup (Optional)                │
│  - User-controlled encryption       │
│  - Choose storage location          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Sync (Optional)                  │
│  - Encrypted end-to-end             │
│  - Zero-knowledge proof             │
└─────────────────────────────────────┘
```

### Security Measures

1. **API Key Storage**
   - Stored locally only
   - Never sent to third parties
   - User-controlled deletion

2. **Plugin Sandboxing**
   - Capability-based permissions
   - No direct filesystem access
   - Limited network access

3. **Content Security Policy**
   - Restricts external resources
   - Prevents XSS attacks
   - Controls script execution

4. **Input Validation**
   - Sanitize all user input
   - Validate API responses
   - Prevent injection attacks

---

## Scalability

### Horizontal Scaling

**Client-Side:**
- Web Workers for parallel processing
- Service Workers for caching
- Broadcast Channel for tab communication

**Vertical Scaling:**
- Hardware detection
- Performance-based feature gating
- Resource optimization

### Performance Tiers

```
┌─────────────────────────────────────┐
│      Ultra (Score: 86-100)          │
│  - All features enabled             │
│  - Maximum quality                  │
│  - Full animations                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      High (Score: 61-85)            │
│  - Most features enabled            │
│  - High quality                     │
│  - Standard animations              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Medium (Score: 31-60)          │
│  - Core features enabled            │
│  - Balanced quality                 │
│  - Reduced animations               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Low (Score: 0-30)              │
│  - Essential features only          │
│  - Basic quality                    │
│  - No animations                    │
└─────────────────────────────────────┘
```

### Database Scaling

**IndexedDB Optimization:**

```typescript
// Use indexes for queries
await messages.createIndex('conversationId', 'conversationId');
await messages.createIndex('timestamp', 'createdAt');

// Batch operations for performance
const transaction = db.transaction(['messages'], 'readwrite');
for (const msg of messages) {
  transaction.store.add(msg);
}
await transaction.complete;

// Use cursors for large datasets
const cursor = messages.openCursor();
while (await cursor.next()) {
  process(cursor.value);
}
```

---

## Technology Decisions

### Why Next.js?

**Chosen for:**
- Server and client components
- API routes for server logic
- Built-in optimization
- Great developer experience
- Strong community

**Alternatives Considered:**
- Remix: Great, but Next.js had better WASM support
- Vite + React: Too manual for our needs
- Pure SPA: Lacked SEO and server capabilities

### Why TypeScript?

**Chosen for:**
- Type safety
- Better IDE support
- Self-documenting code
- Easier refactoring
- Catches bugs early

**Strict Mode:**
- Zero implicit any
- Strict null checks
- Explicit return types
- No unused variables

### Why IndexedDB?

**Chosen for:**
- Large storage capacity
- Structured data
- Async operations
- Browser-native
- Works offline

**Alternatives Considered:**
- localStorage: Too small (5-10MB)
- WebSQL: Deprecated
- OPFS: Good but less support
- File System API: Limited browser support

### Why WebAssembly?

**Chosen for:**
- Near-native performance
- SIMD acceleration
- Browser-native
- Works offline
- Small bundle size

**Use Cases:**
- Vector operations (3-4x faster)
- Embedding calculations
- Cryptographic operations
- Image processing

### Why Tailwind CSS?

**Chosen for:**
- Rapid development
- Consistent design
- Small bundle (purge unused)
- Dark mode support
- Responsive utilities

**Alternatives Considered:**
- CSS-in-JS: Larger bundle, runtime overhead
- SASS: Requires compilation
- Plain CSS: Too verbose

---

## Data Flow Diagrams

### Message Sending Flow

```
┌──────────┐
│   User   │
└─────┬────┘
      │ Type message
      ▼
┌──────────────────┐
│ Message Input    │
└─────┬────────────┘
      │ Click Send
      ▼
┌──────────────────┐
│  Optimistic UI   │──┐
│  Update          │  │ Display immediately
└─────┬────────────┘  │
      │              │
      ▼              │
┌──────────────────┐  │
│ Load Context     │  │
│ - History        │  │
│ - Knowledge      │  │
│ - Files          │  │
└─────┬────────────┘  │
      │              │
      ▼              │
┌──────────────────┐  │
│ Prepare Messages │  │
│ - Token count    │  │
│ - Window         │  │
└─────┬────────────┘  │
      │              │
      ▼              │
┌──────────────────┐  │
│ Call AI Provider │  │
│ - Stream response│  │
└─────┬────────────┘  │
      │              │
      ├──────────────┘
      │ Stream chunks
      ▼
┌──────────────────┐
│  Update UI       │
│  Incrementally   │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Save to Storage  │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│  Complete        │
└──────────────────┘
```

### Knowledge Search Flow

```
┌──────────┐
│   User   │
└─────┬────┘
      │ Search query
      ▼
┌──────────────────┐
│  Search Input    │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Generate         │
│ Embedding        │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Load Knowledge   │
│ from Storage     │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Calculate        │
│ Similarity       │
│ (WASM-accelerated)│
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Sort & Rank      │
│ Results          │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│  Display Results │
└──────────────────┘
```

---

## Summary

PersonalLog's architecture is designed for:

- **Performance**: WASM acceleration, intelligent caching, hardware-aware optimization
- **Privacy**: Local-first, encryption, user-controlled data
- **Extensibility**: Plugin system, multiple AI providers, custom workflows
- **Maintainability**: Modular design, TypeScript, clear separation of concerns
- **Scalability**: Performance tiers, database optimization, async operations

The architecture supports PersonalLog's goal of being a fast, private, and extensible AI companion for everyday use.

---

*Last Updated: 2026-01-03*
*Version: 2.0.0*
