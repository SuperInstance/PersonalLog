# PersonalLoG.AI - Phase 1 MVP: Exhaustive Implementation Blueprint

Let me break down the 12-week MVP into atomic, logically sequenced components with non-obvious implementation details fully exposed.

---

## **Week 1-2: Core Session Manager & CRDT Foundation**

### **Day 1-2: Session Data Model & Database Schema**

**What to Build**: The atomic session object and its persistence layer.

**Non-Obvious Detail**: You cannot use a simple auto-incrementing ID. Session IDs must be **time-sortable UUIDs (UUIDv7)** to enable chronological queries without a timestamp index. This matters because you'll be fetching sessions by timeline constantly.

**PostgreSQL Schema**:
```sql
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Wrong! Don't use v4
  parent_session_id UUID REFERENCES sessions(session_id),
  schema_version VARCHAR(64), -- Git commit hash style
  context_budget JSONB NOT NULL DEFAULT '{"total": 128000, "used": 0, "reserved": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ -- Soft delete for session recovery
);

CREATE TABLE messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(session_id),
  -- CRDT requirements:
  lamport_counter BIGINT NOT NULL, -- Logical clock for ordering
  site_id VARCHAR(64) NOT NULL, -- Device/instance ID
  content JSONB NOT NULL, -- {role: "user", content: "...", tokens: 45}
  operation_type VARCHAR(20) NOT NULL, -- 'insert', 'delete', 'update'
  deleted BOOLEAN DEFAULT false, -- Tombstone for CRDT
  vector_clock JSONB NOT NULL, -- {"server1": 5, "server2": 3}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compaction_log (
  log_id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(session_id),
  before_tokens INTEGER NOT NULL,
  after_tokens INTEGER NOT NULL,
  summary_hash VARCHAR(64), -- SHA256 of summary content
  relevance_scores JSONB, -- {"message_id": 0.85, ...}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for CRDT merge queries
CREATE INDEX idx_messages_session_clock ON messages(session_id, lamport_counter, site_id);
CREATE INDEX idx_messages_vector_clock ON messages USING GIN(vector_clock);
```

**Non-Obvious Detail**: The `vector_clock` field stores a causal history, not just a number. When merging sessions from different devices, you need to know *which* messages each device has seen to avoid duplicates.

### **Day 3-4: CRDT Implementation (The Message Ledger)**

**Choice**: Use **Automerge** library, not Yjs. Yjs is for collaborative text editing; Automerge is for JSON documents, which matches your message structure.

**Implementation**:
```typescript
import * as Automerge from '@automerge/automerge';

interface SessionDoc {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    tokens: number;
    metadata: Record<string, any>;
  }>;
  schema: {
    version: string;
    documents: Array<{id: number; title: string; status: 'pending' | 'complete'}>;
  };
}

class CRDTSession {
  private doc: Automerge.Doc<SessionDoc>;
  private changes: Uint8Array[] = [];
  
  constructor(initialDoc?: SessionDoc) {
    this.doc = Automerge.init<SessionDoc>();
    if (initialDoc) {
      this.doc = Automerge.change(this.doc, 'Initialize', doc => {
        doc.messages = initialDoc.messages;
        doc.schema = initialDoc.schema;
      });
    }
  }
  
  addMessage(message: Omit<Message, 'message_id'>): {doc: Automerge.Doc<SessionDoc>, change: Uint8Array} {
    const newDoc = Automerge.change(this.doc, `Add message ${message.lamport_counter}`, doc => {
      doc.messages.push({
        id: crypto.randomUUID(),
        role: message.content.role,
        content: message.content.content,
        timestamp: Date.now(),
        tokens: message.content.tokens,
        metadata: message.content.metadata || {}
      });
    });
    
    const change = Automerge.getChanges(this.doc, newDoc)[0];
    this.doc = newDoc;
    this.changes.push(change);
    
    return {doc: newDoc, change};
  }
  
  merge(remoteChanges: Uint8Array[]): Automerge.Doc<SessionDoc> {
    const [mergedDoc] = Automerge.applyChanges(this.doc, remoteChanges);
    this.doc = mergedDoc;
    return mergedDoc;
  }
  
  getMessagesSince(lamport: number): Message[] {
    // Non-obvious: Automerge doesn't track lamport counters directly
    // You must maintain a separate index that maps Automerge op IDs to lamport values
    // Store this in a PostgreSQL table for query performance
  }
}
```

**Non-Obvious Gotcha**: Automerge's internal change IDs are not lamport counters. You must maintain your own `lamport_counter` sequence in the database for efficient "get messages since X" queries. The CRDT ensures consistency; the lamport counter enables performance.

### **Day 5-6: Token Counting Service**

**Problem**: You need **accurate** token counting. Using the API's "usage" field after the call is too late - you need to know before sending to stay under limits.

**Implementation**:
```typescript
import { encoding_for_model } from 'tiktoken';

class TokenCounter {
  private encoder: Tiktoken;
  
  constructor(model: string = 'gpt-4') {
    this.encoder = encoding_for_model(model);
  }
  
  countMessageTokens(message: Message): number {
    // Non-obvious: System messages count differently
    const tokens = this.encoder.encode(message.content);
    
    // Every message has a 4-token overhead: <im_start>{role/name}\n{content}<im_end>
    return tokens.length + 4;
  }
  
  countSessionTokens(session: Session): number {
    // Include system prompt, message history, reserved tokens for response
    const messages = session.messages;
    let total = 0;
    
    for (const msg of messages) {
      total += this.countMessageTokens(msg);
    }
    
    // Add function calling tokens if present
    if (session.tools) {
      total += this.countToolsTokens(session.tools);
    }
    
    // Reserve 500 tokens for the assistant's response
    total += 500;
    
    return total;
  }
  
  private countToolsTokens(tools: Tool[]): number {
    // Non-obvious: Each tool definition costs ~10-50 tokens
    // Tool calls and responses also cost tokens
    let toolTokens = 0;
    for (const tool of tools) {
      const schemaStr = JSON.stringify(tool.function.parameters);
      toolTokens += this.encoder.encode(tool.function.name).length;
      toolTokens += this.encoder.encode(schemaStr).length;
      toolTokens += 10; // Overhead per tool
    }
    return toolTokens;
  }
  
  willExceedBudget(session: Session, nextMessage: string): boolean {
    const current = this.countSessionTokens(session);
    const nextMsgTokens = this.encoder.encode(nextMessage).length + 4;
    const budget = session.contextBudget.totalTokens;
    
    // Non-obvious: Add 10% safety buffer for API estimation drift
    return (current + nextMsgTokens) > (budget * 0.90);
  }
}
```

**Critical Non-Obvious Detail**: Different models tokenize differently. Cloudflare's Llama models use SentencePiece, not tiktoken. You need a **model-agnostic token estimation service** that uses the correct tokenizer per provider. Maintain a mapping:

```typescript
const TOKENIZERS = {
  'gpt-4': 'tiktoken',
  'claude-3': 'anthropic', // They have their own library
  '@cf/meta/llama-3-70b': 'sentencepiece',
  'local/ollama': 'llama.cpp' // Ollama provides token endpoint
};
```

### **Day 7-8: Schema Generation Engine**

**Purpose**: Automatically create the "manual overview" that enables your edit trick.

**Prompt Engineering**:
```typescript
class SchemaGenerator {
  async generateSchema(session: Session): Promise<SessionSchema> {
    const recentMessages = session.messages.slice(-50); // Last 50 for context
    const tokenCount = this.tokenCounter.countSessionTokens({messages: recentMessages});
    
    // Non-obvious: You must explicitly tell the LLM to be structured
    const prompt = `You are a session archivist. Create a structured overview of this conversation.
  
Current context: ${tokenCount} tokens (85% of limit)
Goal: Enable restarting from this point with a fresh context window.

Analyze these messages and extract:
1. PROJECT: What is being built?
2. COMPLETED: What sections are done? (list numbers 1-N)
3. NEXT: What is the immediate next section to write?
4. KEY_DECISIONS: Array of {decision: string, rationale: string}
5. TECHNICAL_SPECS: Object of {architecture: string, stack: string}
6. DOCS_NEEDED: Array of {docNumber: number, title: string, description: string}

Return ONLY valid JSON. Be concise. Preserve technical accuracy.

Messages to analyze:
${JSON.stringify(recentMessages, null, 2)}
`;

    const response = await this.llm.call({
      model: 'gpt-4-turbo',
      messages: [{role: 'user', content: prompt}],
      temperature: 0.1, // Low for consistency
      response_format: {type: 'json_object'}
    });
    
    const schema = JSON.parse(response.content);
    
    // Non-obvious: Validate and normalize the schema
    return this.normalizeSchema(schema, session);
  }
  
  private normalizeSchema(raw: any, session: Session): SessionSchema {
    // Ensure doc numbers are sequential starting from 1
    // Fill in missing titles from message content
    // Hash the schema for versioning
    const schemaHash = crypto.createHash('sha256')
      .update(JSON.stringify(raw))
      .digest('hex')
      .slice(0, 16);
    
    return {
      ...raw,
      version: schemaHash,
      sessionId: session.sessionId,
      generatedAt: Date.now(),
      totalTokens: session.contextBudget.usedTokens
    };
  }
}
```

**Non-Obvious Detail**: Store the schema both as JSON in PostgreSQL *and* as a plain text file in R2. The text file enables manual editing (your original trick programmatically). The JSON enables queries like "find all sessions with 'React' in TECHNICAL_SPECS.stack".

### **Day 9-10: Context Budget Monitor**

**Real-Time Tracking**:
```typescript
class BudgetMonitor {
  private budgets = new Map<string, {
    total: number;
    used: number;
    reserved: number;
    history: Array<{timestamp: number, tokens: number, messageId: string}>
  }>();
  
  constructor(private tokenCounter: TokenCounter) {}
  
  async trackMessage(sessionId: string, message: Message): Promise<void> {
    const tokens = this.tokenCounter.countMessageTokens(message);
    const budget = this.budgets.get(sessionId);
    
    if (!budget) {
      throw new Error('Session not initialized');
    }
    
    budget.used += tokens;
    budget.history.push({
      timestamp: Date.now(),
      tokens: tokens,
      messageId: message.message_id
    });
    
    // Non-obvious: Predictive warning
    const burnRate = this.calculateBurnRate(budget.history);
    const estimatedMessagesRemaining = (budget.total - budget.used) / burnRate;
    
    if (estimatedMessagesRemaining < 5) {
      await this.triggerCompaction(sessionId);
    }
    
    // Persist to DB every 10 messages for performance
    if (budget.history.length % 10 === 0) {
      await this.persistBudget(sessionId);
    }
  }
  
  private calculateBurnRate(history: HistoryPoint[]): number {
    // Non-obvious: Use exponential moving average, not simple average
    // Recent messages are better predictors
    const recent = history.slice(-20);
    if (recent.length < 2) return 100; // Default estimate
    
    const totalTokens = recent.reduce((sum, h) => sum + h.tokens, 0);
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    // Tokens per millisecond, averaged
    return totalTokens / Math.max(timeSpan, 1);
  }
  
  async reserveTokens(sessionId: string, tokens: number): Promise<boolean> {
    const budget = this.budgets.get(sessionId);
    const available = budget.total - budget.used - budget.reserved;
    
    if (available >= tokens) {
      budget.reserved += tokens;
      return true;
    }
    
    return false;
  }
}
```

**Critical Non-Obvious Detail**: The `reserved` field is for **Spread planning**. When you initiate a Spread with 5 tasks, you reserve 2000 tokens per task (10000 total). This prevents the parent session from using those tokens, avoiding mid-spread compaction failures.

---

## **Week 3-4: Spread Engine v1 (Parallel Spawning)**

### **Day 1-2: Child Session Forking**

**Problem**: How do you create a child session that starts fresh but "knows" what came before?

**Implementation**:
```typescript
class SpreadEngine {
  constructor(
    private sessionManager: SessionManager,
    private tokenCounter: TokenCounter,
    private guardian: GuardianLayer
  ) {}
  
  async createChildSession(
    parentId: string,
    task: string,
    strategy: 'full' | 'schema-only' = 'schema-only'
  ): Promise<string> {
    
    // 1. Get parent session
    const parent = await this.sessionManager.getSession(parentId);
    
    // 2. Generate context seed based on strategy
    let seedContext: string;
    if (strategy === 'full') {
      // Non-obvious: You must compact aggressively first
      const compactor = new ContextCompactor(this.tokenCounter);
      seedContext = await compactor.compactToBudget(
        parent.messages,
        task,
        4000 // 4k tokens reserved for full context
      );
    } else {
      // Schema-only: Use the overview document
      const schema = await this.sessionManager.getLatestSchema(parentId);
      seedContext = this.buildSyntheticPrompt(schema, task);
    }
    
    // 3. Sanitize if needed
    const sanitized = await this.guardian.sanitizeForSpread(seedContext, 'external');
    
    // 4. Create child session with fresh budget
    const childId = await this.sessionManager.createSession({
      parentSessionId: parentId,
      contextBudget: {
        total: parent.contextBudget.total, // Same limit
        used: this.tokenCounter.countTokens(sanitized.context),
        reserved: 0
      },
      isChild: true,
      task: task
    });
    
    // 5. Seed the child with the first message
    await this.sessionManager.addMessage(childId, {
      role: 'system',
      content: sanitized.context,
      metadata: {
        isSpreadSeed: true,
        parentId: parentId,
        task: task
      }
    });
    
    // 6. Link parent to child
    await this.sessionManager.addChildLink(parentId, childId, task);
    
    return childId;
  }
  
  private buildSyntheticPrompt(schema: SessionSchema, task: string): string {
    // Replicate your manual edit trick
    return `SESSION SCHEMA v${schema.version}
    
We have thoroughly executed: ${schema.completedDocs.join(', ')}
We are now executing: ${task}

PROJECT OVERVIEW:
${schema.project}

KEY DECISIONS:
${schema.keyDecisions.map(d => `- ${d.decision}: ${d.rationale}`).join('\n')}

TECHNICAL SPECS:
${JSON.stringify(schema.technicalSpecs, null, 2)}

CURRENT TASK: ${task}
${schema.docsNeeded.find(d => d.title === task)?.description}

Begin work. You have full context of the project. Focus ONLY on this task.
`;
  }
}
```

**Non-Obvious Detail**: The `isSpreadSeed: true` metadata is critical. When you merge the child back into the parent, you must exclude the seed message to avoid duplication. It's a synthetic message that only exists to bootstrap the child's context.

### **Day 3-4: Spread Manifest & State Tracking**

**Purpose**: Track which child sessions exist, their status, and how to merge them.

**Database Schema**:
```sql
CREATE TABLE spread_manifest (
  manifest_id UUID PRIMARY KEY,
  parent_session_id UUID NOT NULL REFERENCES sessions(session_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  strategy VARCHAR(20) NOT NULL, -- 'parallel', 'sequential'
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE spread_tasks (
  task_id UUID PRIMARY KEY,
  manifest_id UUID NOT NULL REFERENCES spread_manifest(manifest_id),
  child_session_id UUID REFERENCES sessions(session_id),
  task_description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  tokens_used INTEGER DEFAULT 0,
  result_summary TEXT, -- Final summary for merge
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for "get all tasks ready to merge"
CREATE INDEX idx_spread_tasks_status ON spread_tasks(manifest_id, status);
```

**State Machine**:
```typescript
enum TaskStatus {
  PENDING = 'pending',    // Child not yet created
  RUNNING = 'running',    // Child has messages, not complete
  COMPLETE = 'complete',  // Child finished naturally
  FAILED = 'failed',      // Child hit error
  MERGED = 'merged'       // Successfully merged into parent
}

class SpreadStateTracker {
  async updateTaskStatus(
    manifestId: string,
    childSessionId: string,
    status: TaskStatus,
    result?: string
  ): Promise<void> {
    
    // Non-obvious: Use transactional update to prevent race conditions
    // during parallel merges
    await db.transaction(async (trx) => {
      await trx('spread_tasks')
        .where({ manifest_id: manifestId, child_session_id: childSessionId })
        .update({
          status: status,
          result_summary: result,
          completed_at: status === 'complete' ? new Date() : null
        });
      
      // Check if all tasks are complete/merged
      const incomplete = await trx('spread_tasks')
        .where({ manifest_id: manifestId })
        .whereNotIn('status', ['complete', 'merged', 'failed'])
        .count('* as count');
      
      if (incomplete[0].count === 0) {
        await trx('spread_manifest')
          .where({ manifest_id: manifestId })
          .update({ status: 'completed' });
      }
    });
  }
  
  async getMergeReadyTasks(manifestId: string): Promise<SpreadTask[]> {
    // Non-obvious: Order matters. Merge in task order to maintain narrative flow
    return await db('spread_tasks')
      .where({ manifest_id: manifestId, status: 'complete' })
      .orderBy('created_at', 'asc')
      .select('*');
  }
}
```

### **Day 5-6: Manual Merge v1 (No CRDT Sync)**

**Purpose**: For MVP, merging is manual. User reviews and approves each child's summary.

**Flow**:
```typescript
class MergeService {
  async createMergeProposal(
    parentId: string,
    childId: string
  ): Promise<MergeProposal> {
    
    // 1. Get child's final summary (last assistant message)
    const child = await this.sessionManager.getSession(childId);
    const summary = child.messages
      .filter(m => m.role === 'assistant')
      .slice(-1)[0]?.content;
    
    if (!summary) {
      throw new Error('Child session has no final summary');
    }
    
    // 2. Show parent what will be added
    const parent = await this.sessionManager.getSession(parentId);
    const proposal = `
## MERGE PROPOSAL: ${child.task}

Child Session: ${childId}
Tokens Used: ${child.contextBudget.usedTokens}

SUMMARY TO MERGE:
${summary}

PARENT CONTEXT IMPACT:
- Parent tokens before: ${parent.contextBudget.usedTokens}
- After merge: ${parent.contextBudget.usedTokens + this.tokenCounter.countTokens(summary)}
- Remaining budget: ${parent.contextBudget.total - (parent.contextBudget.usedTokens + this.tokenCounter.countTokens(summary))}

[Approve Merge] [Review Child Session] [Discard]
`;
    
    return {
      parentId,
      childId,
      summary,
      preview: proposal,
      impact: {
        tokenDelta: this.tokenCounter.countTokens(summary),
        willTriggerCompaction: this.willTriggerCompaction(parent, summary)
      }
    };
  }
  
  async executeMerge(proposal: MergeProposal, userApproved: boolean): Promise<void> {
    if (!userApproved) {
      await this.sessionManager.markTaskAsDiscarded(proposal.childId);
      return;
    }
    
    // Non-obvious: Insert merged content with metadata to distinguish from normal messages
    await this.sessionManager.addMessage(proposal.parentId, {
      role: 'assistant',
      content: `## MERGED RESULT FROM TASK: ${proposal.task}\n\n${proposal.summary}`,
      metadata: {
        type: 'merge_result',
        childSessionId: proposal.childId,
        tokensUsed: proposal.impact.tokenDelta,
        mergedAt: Date.now()
      }
    });
    
    // Update parent's token count
    await this.sessionManager.incrementTokenUsage(
      proposal.parentId,
      proposal.impact.tokenDelta
    );
    
    // Mark task as merged
    await this.spreadStateTracker.updateTaskStatus(
      proposal.parentId,
      proposal.childId,
      TaskStatus.MERGED
    );
    
    // Non-obvious: Keep child session for 7 days then auto-delete
    // Users may want to review original work
    await this.scheduleChildSessionDeletion(proposal.childId, 7 * 24 * 60 * 60 * 1000);
  }
}
```

**UI for Merge**: Show a split-screen diff:
- Left: Parent session (highlight where merge will insert)
- Right: Child session (showing full context, scrollable)
- Bottom: Token impact calculator (live update)

### **Day 7-8: Spread Dashboard UI**

**Component Structure**:
```typescript
// React component tree
<SpreadDashboard manifestId={manifestId}>
  <SpreadHeader manifest={manifest} />
  <TaskGrid>
    {tasks.map(task => (
      <TaskCard key={task.taskId}>
        <TaskStatusIndicator status={task.status} />
        <TaskProgress 
          usedTokens={task.tokens_used}
          budget={parentBudget}
        />
        <TaskActions>
          <Button onClick={() => viewChildSession(task.child_session_id)}>
            View
          </Button>
          {task.status === 'complete' && (
            <Button primary onClick={() => initiateMerge(task)}>
              Merge
            </Button>
          )}
        </TaskActions>
      </TaskCard>
    ))}
  </TaskGrid>
  <BulkActions>
    <Button disabled={!allComplete}>Merge All Ready</Button>
    <Button danger>Cancel Spread</Button>
  </BulkActions>
</SpreadDashboard>
```

**Non-Obvious UX Detail**: The **TaskProgress** component must show a **relative** progress bar. If the parent had 50k tokens used, and the child used 5k, the bar shows 10% of the parent's budget consumed. This visually communicates "how much of our shared budget did this task cost?"

---

## **Week 5-6: Basic Agent Runtime & Vibe-Coding**

### **Day 1-2: Agent Definition Schema & Storage**

**Schema Design**:
```yaml
# Stored as YAML in R2 for human-editability, JSON in DB for queries
agent_id: 'louie-v3.2.1'
name: 'Louie - Draft Writer'
archetype: incomplete_instrument
created_at: 1735689600
created_by: 'user_abc123'

# Versioning
version: '3.2.1'
parent_version: '3.2.0'
changelog: 'Reduced verbosity, added proactive suggestions'

# Core behavior
constraints:
  max_response_tokens: 200
  default_temperature: 0.3
  brief_by_default: true
  ask_for_clarification: true
  clarification_threshold: 0.7 # When to ask vs. assume

# Capability flags
capabilities:
  - name: proactive_suggestions
    enabled: true
    trigger_confidence: 0.8
  - name: learns_user_soft_language
    enabled: true
    memory_window: 50 # Last 50 corrections

# Tool access
tools:
  - name: google_docs_write
    enabled: true
    auth: user_token # Use user's token, not app's
  - name: email_draft
    enabled: true
    requires_approval: true

# Learning from corrections
soft_language_profile:
  - pattern: 'more concise'
    action: reduce_tokens_by: 0.3
    learned_from: 12_corrections
  - pattern: 'expand on that'
    action: add_examples: 2
    learned_from: 5_requests

# Session preferences
session_defaults:
  context_mode: schema_only # Prefer schema over full history
  spread_strategy: parallel
```

**Database Schema**:
```sql
CREATE TABLE agents (
  agent_id VARCHAR(255) PRIMARY KEY, -- agent-name-v{major.minor.patch}
  owner_id UUID NOT NULL REFERENCES users(user_id),
  definition JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  usage_count BIGINT DEFAULT 0,
  revenue_share_percent INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_versions (
  version_id UUID PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL REFERENCES agents(agent_id),
  definition JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_from_session_id UUID REFERENCES sessions(session_id)
);

-- Track soft language learning
CREATE TABLE soft_language_patterns (
  pattern_id UUID PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL REFERENCES agents(agent_id),
  user_phrase TEXT NOT NULL,
  agent_action JSONB NOT NULL, -- {type: 'reduce_tokens', factor: 0.3}
  frequency INTEGER DEFAULT 1,
  last_used TIMESTAMPTZ DEFAULT NOW()
);
```

### **Day 3-4: Agent Runtime & Prompt Assembly**

**Prompt Builder**:
```typescript
class AgentRuntime {
  constructor(private agentDef: AgentDefinition) {}
  
  async buildSystemPrompt(session: Session): Promise<string> {
    const parts: string[] = [];
    
    // 1. Base identity
    parts.push(`You are ${this.agentDef.name}, an AI assistant with the following traits:`);
    
    // 2. Constraints (non-obvious: order matters - put constraints first)
    if (this.agentDef.constraints.brief_by_default) {
      parts.push('- Keep responses under 200 tokens unless asked to expand.');
    }
    if (this.agentDef.constraints.ask_for_clarification) {
      parts.push('- Ask for clarification if user intent is unclear (confidence < 0.7).');
    }
    
    // 3. Session context (if schema exists)
    if (session.schema) {
      parts.push('\n## PROJECT SCHEMA\n' + JSON.stringify(session.schema, null, 2));
    }
    
    // 4. Available tools (non-obvious: describe tools in agent's voice)
    if (this.agentDef.tools.length > 0) {
      parts.push('\n## YOUR CAPABILITIES');
      for (const tool of this.agentDef.tools) {
        if (tool.enabled) {
          parts.push(`- ${tool.name}: ${tool.description}`);
          if (tool.requires_approval) {
            parts.push('  (You must ask user before using this)');
          }
        }
      }
    }
    
    // 5. Soft language profile (most important - goes last)
    if (this.agentDef.soft_language_profile.length > 0) {
      parts.push('\n## USER PREFERENCES LEARNED\nThe user has corrected you in these ways:');
      for (const pattern of this.agentDef.soft_language_profile.slice(-5)) {
        parts.push(`- When user says "${pattern.pattern}", do: ${JSON.stringify(pattern.action)}`);
      }
    }
    
    return parts.join('\n\n');
  }
  
  async generateResponse(
    session: Session,
    userMessage: string
  ): Promise<AssistantMessage> {
    
    // 1. Build full prompt
    const systemPrompt = await this.buildSystemPrompt(session);
    const tokenEstimate = this.tokenCounter.countTokens(systemPrompt + userMessage);
    
    // 2. Check budget
    if (tokenEstimate > session.contextBudget.total * 0.85) {
      // Trigger compaction automatically
      await this.triggerAutoCompaction(session);
    }
    
    // 3. Call LLM via Cloudflare Gateway (user's account)
    const response = await this.callLLM({
      model: session.preferences.model || '@cf/meta/llama-3-70b',
      messages: [
        {role: 'system', content: systemPrompt},
        ...session.messages.slice(-10), // Last 10 for context
        {role: 'user', content: userMessage}
      ],
      max_tokens: this.agentDef.constraints.max_response_tokens,
      temperature: this.agentDef.constraints.default_temperature,
      tools: this.agentDef.tools.filter(t => t.enabled)
    });
    
    // 4. Learn from this interaction (async, don't block response)
    this.learningService.recordInteraction(
      session.sessionId,
      this.agentDef.agent_id,
      userMessage,
      response.content
    );
    
    return {
      role: 'assistant',
      content: response.content,
      metadata: {
        tokens_used: response.usage.total_tokens,
        model: response.model,
        tools_called: response.tool_calls || []
      }
    };
  }
}
```

**Non-Obvious Detail**: The `soft_language_profile` must be **appended last** in the system prompt. LLMs give more weight to information at the end of long prompts. This ensures user corrections override default behavior.

### **Day 5-6: Vibe-Coding Engine**

**The 3-Turn Clarification Protocol**:
```typescript
class VibeCoder {
  async initiateAgentModification(
    session: Session,
    userRequest: string
  ): Promise<VibeCodingSession> {
    
    // 1. Parse intent
    const intent = await this.parseModificationIntent(userRequest);
    
    // 2. Create temporary vibe-coding session
    const vibeSession = await this.sessionManager.createSession({
      type: 'vibe_coding',
      parentSessionId: session.sessionId,
      agent: session.currentAgent,
      modificationIntent: intent
    });
    
    // 3. First clarification turn
    const clarification1 = await this.generateClarificationQuestion(
      vibeSession,
      intent,
      1
    );
    
    await this.sessionManager.addMessage(vibeSession.sessionId, {
      role: 'assistant',
      content: clarification1,
      metadata: { turn: 1, type: 'clarification' }
    });
    
    return {
      sessionId: vibeSession.sessionId,
      currentTurn: 1,
      maxTurns: 3,
      intent: intent
    };
  }
  
  async continueVibeCoding(
    vibeSessionId: string,
    userResponse: string
  ): Promise<AgentDefinition | string> {
    
    const vibeSession = await this.sessionManager.getSession(vibeSessionId);
    
    if (vibeSession.currentTurn >= 3) {
      // Generate final spec
      return await this.compileAgentDefinition(vibeSession);
    }
    
    // Generate next clarification
    const nextTurn = vibeSession.currentTurn + 1;
    const clarification = await this.generateClarificationQuestion(
      vibeSession,
      vibeSession.modificationIntent,
      nextTurn
    );
    
    await this.sessionManager.addMessage(vibeSessionId, {
      role: 'assistant',
      content: clarification,
      metadata: { turn: nextTurn, type: 'clarification' }
    });
    
    return `Continue clarification (turn ${nextTurn}/3): ${clarification}`;
  }
  
  private async generateClarificationQuestion(
    session: Session,
    intent: ModificationIntent,
    turn: number
  ): Promise<string> {
    
    const prompt = `You are helping a user modify an AI agent. Current agent:
${JSON.stringify(session.currentAgent, null, 2)}

User wants: "${intent.goal}"

You are on clarification turn ${turn} of 3. Based on the conversation so far:
${session.messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Ask ONE specific question to clarify what the user wants. Examples:
- "Should this apply to all future sessions or just this project?"
- "Do you want me to be more concise in responses or in code comments?"
- "What should trigger the proactive suggestion?"

Be brief. Ask for a choice, not an essay.`;
    
    const response = await this.llm.call({messages: [{role: 'user', content: prompt}]});
    return response.content;
  }
  
  private async compileAgentDefinition(vibeSession: Session): Promise<AgentDefinition> {
    // Take the 3-turn conversation and extract specifications
    const conversation = vibeSession.messages
      .filter(m => m.metadata.type === 'clarification')
      .map(m => m.content);
    
    const extractionPrompt = `Extract an agent definition from this vibe-coding conversation:

${conversation.join('\n\n')}

Return a valid agent YAML definition with:
- agent_id (increment version)
- name
- version
- specific constraints
- capabilities (list)
- tools needed

Be precise. Include numbers and thresholds where mentioned.`;
    
    const yamlResponse = await this.llm.call({messages: [{role: 'user', content: extractionPrompt}]});
    const definition = parseYAML(yamlResponse.content);
    
    // Non-obvious: Simulate the agent first
    const simulation = await this.simulateAgent(definition, 5);
    
    if (simulation.successRate < 0.6) {
      throw new Error(`Agent simulation failed: ${simulation.failures.join(', ')}`);
    }
    
    return definition;
  }
}
```

**Non-Obvious Detail**: Store each vibe-coding session as a **child session** of the original. This creates an audit trail: you can always see *why* an agent was modified and revert to the conversation that created it.

---

## **Week 7-8: Storage Layer & Session Book**

### **Day 1-2: Storage Backend Abstraction**

**Interface Design**:
```typescript
interface StorageBackend {
  // Session data
  saveSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session>;
  
  // Schema documents
  saveSchema(sessionId: string, schema: SessionSchema): Promise<string>; // Returns URL
  getSchema(sessionId: string, version?: string): Promise<SessionSchema>;
  
  // Artifacts (generated code, docs, etc.)
  saveArtifact(
    sessionId: string,
    name: string,
    content: Buffer,
    mimeType: string
  ): Promise<string>; // Returns URL
  
  // Agent definitions
  saveAgentDefinition(agent: AgentDefinition): Promise<void>;
  getAgentDefinition(agentId: string): Promise<AgentDefinition>;
  
  // Cost events
  logBillingEvent(event: BillingEvent): Promise<void>;
  getBillingEvents(userId: string, start: Date, end: Date): Promise<BillingEvent[]>;
}

// Concrete implementations
class CloudflareR2Backend implements StorageBackend { /* ... */ }
class GoogleDriveBackend implements StorageBackend { /* ... */ }
class LocalFileBackend implements StorageBackend { /* ... */ }
```

**Cloudflare R2 Implementation** (Your primary backend):
```typescript
class CloudflareR2Backend implements StorageBackend {
  private bucket: R2Bucket;
  private readonly MAX_OBJECT_SIZE = 100 * 1024 * 1024; // 100MB
  
  constructor(private accountId: string, private apiToken: string) {
    this.bucket = new R2Bucket({accountId, apiToken});
  }
  
  async saveSession(session: Session): Promise<void> {
    // Non-obvious: Save as two objects - full and delta
    // full: Complete session snapshot (for fast loading)
    // delta: Just the changes since last save (for sync)
    
    const key = `sessions/${session.sessionId}/full.json`;
    const content = JSON.stringify(session, null, 2);
    
    // Check size limits
    if (content.length > this.MAX_OBJECT_SIZE) {
      throw new Error('Session too large - trigger compaction first');
    }
    
    await this.bucket.put(key, content, {
      httpMetadata: {
        contentType: 'application/json',
        // Non-obvious: Set cache control for sync efficiency
        cacheControl: 'no-cache' // Always fetch latest
      },
      customMetadata: {
        sessionId: session.sessionId,
        parentId: session.parentSessionId || '',
        tokenCount: session.contextBudget.usedTokens.toString(),
        version: session.schemaVersion || '0'
      }
    });
    
    // Save delta separately for CRDT sync
    const changes = this.extractChanges(session);
    if (changes.length > 0) {
      await this.bucket.put(
        `sessions/${session.sessionId}/delta_${Date.now()}.json`,
        JSON.stringify(changes)
      );
    }
  }
  
  async saveSchema(sessionId: string, schema: SessionSchema): Promise<string> {
    // Save as both JSON and Markdown
    const jsonKey = `schemas/${sessionId}/${schema.version}.json`;
    const mdKey = `schemas/${sessionId}/${schema.version}.md`;
    
    await this.bucket.put(jsonKey, JSON.stringify(schema, null, 2));
    
    // Non-obvious: Generate human-readable markdown
    const mdContent = this.renderSchemaAsMarkdown(schema);
    await this.bucket.put(mdKey, mdContent, {
      httpMetadata: { contentType: 'text/markdown' }
    });
    
    // Return public URL (presigned or via your domain)
    return `https://log.yourdomain.com/schemas/${sessionId}/${schema.version}.md`;
  }
  
  private renderSchemaAsMarkdown(schema: SessionSchema): string {
    return `# Session Schema v${schema.version}
    
## Project: ${schema.project}

## Completed Documents
${schema.completedDocs.map(d => `- ${d}`).join('\n')}

## Next: ${schema.currentTask}

## Key Decisions
${schema.keyDecisions.map(d => `### ${d.decision}
- Rationale: ${d.rationale}
- Impact: ${d.impact}`).join('\n\n')}

## Technical Specifications
\`\`\`json
${JSON.stringify(schema.technicalSpecs, null, 2)}
\`\`\`

## Remaining Tasks
${schema.docsNeeded.map((d, i) => `${i + 1}. **${d.title}**
   ${d.description}
   Dependencies: ${d.dependencies.join(', ')}`).join('\n\n')}

---
*Generated at ${new Date(schema.generatedAt).toISOString()}*`;
  }
}
```

**Non-Obvious Detail**: The **delta saving** pattern is crucial for sync. When the desktop app comes online after being offline, you only need to upload deltas, not the entire session. Store deltas with timestamps, then delete them after successful sync (or keep for 24h for debugging).

### **Day 3-4: Google Drive Integration**

**Why**: Users want searchability in their existing workspace.

**Implementation**:
```typescript
class GoogleDriveBackend implements StorageBackend {
  private drive: drive_v3.Drive;
  
  async saveSchema(sessionId: string, schema: SessionSchema): Promise<string> {
    // Non-obvious: You must handle Google Drive's file ID system
    // Create a folder structure: PersonalLoG / {sessionId} / schemas
    
    const folderId = await this.ensureSessionFolder(sessionId);
    
    // Check if schema already exists (idempotent)
    const existing = await this.drive.files.list({
      q: `name = 'schema-${schema.version}.md' and '${folderId}' in parents`,
      fields: 'files(id)'
    });
    
    if (existing.data.files?.length > 0) {
      // Update existing file to maintain sharing permissions
      await this.drive.files.update({
        fileId: existing.data.files[0].id,
        media: {
          mimeType: 'text/markdown',
          body: this.renderSchemaAsMarkdown(schema)
        }
      });
      return `https://drive.google.com/file/d/${existing.data.files[0].id}/view`;
    }
    
    // Create new file
    const file = await this.drive.files.create({
      requestBody: {
        name: `schema-${schema.version}.md`,
        parents: [folderId],
        mimeType: 'text/markdown'
      },
      media: {
        mimeType: 'text/markdown',
        body: this.renderSchemaAsMarkdown(schema)
      }
    });
    
    // Non-obvious: Set permissions to allow user editing
    await this.drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: session.ownerEmail
      }
    });
    
    return `https://drive.google.com/file/d/${file.data.id}/view`;
  }
  
  private async ensureSessionFolder(sessionId: string): Promise<string> {
    // Check if folder exists
    const search = await this.drive.files.list({
      q: `name = 'PersonalLoG-${sessionId}' and mimeType = 'application/vnd.google-apps.folder'`,
      fields: 'files(id)'
    });
    
    if (search.data.files?.length > 0) {
      return search.data.files[0].id;
    }
    
    // Create folder
    const folder = await this.drive.files.create({
      requestBody: {
        name: `PersonalLoG-${sessionId}`,
        mimeType: 'application/vnd.google-apps.folder'
      }
    });
    
    return folder.data.id;
  }
}
```

**Non-Obvious Detail**: The `emailAddress` in permissions must be the **user's actual Google account email**, not their app login email. Store this during OAuth setup. Also, handle the case where the user revokes Drive access - gracefully degrade to R2-only storage.

### **Day 5-6: Session Book Export**

**Purpose**: Generate a complete, offline-readable archive.

**Implementation**:
```typescript
class SessionBookExporter {
  async export(sessionId: string, format: 'zip' | 'pdf'): Promise<string> {
    const session = await this.sessionManager.getSession(sessionId);
    const schema = await this.storage.getSchema(sessionId);
    
    // 1. Create temp directory
    const tempDir = `/tmp/sessionbook_${sessionId}`;
    await fs.mkdir(tempDir, { recursive: true });
    
    // 2. Write main index
    await fs.writeFile(
      path.join(tempDir, 'index.md'),
      this.generateIndex(session, schema)
    );
    
    // 3. Write conversation ledger
    await fs.writeFile(
      path.join(tempDir, 'conversation.md'),
      this.generateConversationLedger(session)
    );
    
    // 4. Write agent definitions
    const agentsDir = path.join(tempDir, 'agents');
    await fs.mkdir(agentsDir);
    for (const agentId of session.participants) {
      const agent = await this.storage.getAgentDefinition(agentId);
      await fs.writeFile(
        path.join(agentsDir, `${agentId}.yaml`),
        yaml.dump(agent)
      );
    }
    
    // 5. Write spread manifest
    if (session.spreadManifest) {
      await fs.writeFile(
        path.join(tempDir, 'spread.md'),
        this.generateSpreadManifest(session.spreadManifest)
      );
      
      // Copy child summaries
      const childrenDir = path.join(tempDir, 'children');
      await fs.mkdir(childrenDir);
      for (const task of session.spreadManifest.tasks) {
        if (task.result_summary) {
          await fs.writeFile(
            path.join(childrenDir, `${task.task_id}.md`),
            task.result_summary
          );
        }
      }
    }
    
    // 6. Write billing summary
    await fs.writeFile(
      path.join(tempDir, 'costs.md'),
      await this.generateBillingSummary(sessionId)
    );
    
    // 7. Package
    if (format === 'zip') {
      return await this.createZip(tempDir, `sessionbook_${sessionId}.zip`);
    } else {
      // PDF generation via Puppeteer
      return await this.createPDF(tempDir, `sessionbook_${sessionId}.pdf`);
    }
  }
  
  private generateIndex(session: Session, schema: SessionSchema): string {
    return `# Session Book: ${session.title || 'Untitled'}
    
**Session ID:** ${session.sessionId}  
**Created:** ${new Date(session.createdAt).toLocaleString()}  
**Total Tokens:** ${session.contextBudget.usedTokens.toLocaleString()}  
**Schema Version:** ${schema.version}

## Project Overview
${schema.project}

## Quick Navigation
- [Conversation Ledger](./conversation.md) - Full message history
- [Agents](./agents/) - Agent definitions used
- [Spreads](./spread.md) - Parallel task breakdowns
- [Costs](./costs.md) - Token usage and billing

## Key Decisions
${schema.keyDecisions.map(d => `### ${d.decision}
- **Rationale:** ${d.rationale}
- **Impact:** ${d.impact}`).join('\n\n')}

---

*Exported from PersonalLoG.AI*`;
  }
}
```

**Non-Obvious Detail**: The PDF export must be **paginated with TOC**. Use Puppeteer's `pdf` generation with `displayHeaderFooter` and dynamically generate a table of contents HTML page before rendering. This makes the Session Book professionally readable offline.

---

## **Week 9-10: Messenger UI**

### **Day 1-2: Core Chat Interface**

**Component Architecture**:
```typescript
// State management with Zustand (not Redux - too heavy for MVP)
interface ChatStore {
  sessionId: string;
  messages: Message[];
  isLoading: boolean;
  contextPercentage: number;
  agent: AgentDefinition | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  triggerSpread: (tasks: string[]) => Promise<void>;
}

// Message rendering with virtualization
const ChatMessages = () => {
  const messages = useChatStore(state => state.messages);
  
  // Non-obvious: Use react-window for virtualization
  // Sessions can have 1000+ messages, DOM can't handle it
  const Row = ({ index, style }: {index: number, style: React.CSSProperties}) => {
    const msg = messages[index];
    
    // Different rendering for different message types
    if (msg.metadata?.type === 'merge_result') {
      return <MergeResultMessage msg={msg} style={style} />;
    }
    
    return <StandardMessage msg={msg} style={style} />;
  };
  
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={100} // Dynamic sizing needed
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};

// Context percentage indicator (killer UI element)
const ContextIndicator = () => {
  const percentage = useChatStore(state => state.contextPercentage);
  
  // Non-obvious: Color coding with animation
  const getColor = () => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 75) return 'bg-yellow-500';
    if (percentage < 85) return 'bg-orange-500';
    return 'bg-red-500 animate-pulse'; // Pulse when critical
  };
  
  const getLabel = () => {
    if (percentage < 85) return `${percentage}%`;
    if (percentage < 95) return `⚠️ ${percentage}% - Compaction soon`;
    return `🔥 ${percentage}% - Compaction required`;
  };
  
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
      <span className="text-sm font-medium">Context</span>
      <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{width: `${Math.min(percentage, 100)}%`}}
        />
      </div>
      <span className="text-sm">{getLabel()}</span>
    </div>
  );
};
```

**Non-Obvious Detail**: The context percentage must update **in real-time as the user types**. Use a `useEffect` that runs `tokenCounter.countTokens(editorValue)` on every keystroke, debounced by 300ms. This gives instant feedback: "That last sentence pushed us to 86%."

### **Day 3-4: Agent Selector & Creator**

**UI Flow**:
```typescript
const AgentSelector = () => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  
  useEffect(() => {
    loadAgents();
  }, []);
  
  const loadAgents = async () => {
    const userAgents = await api.getAgents({owner: currentUser.id});
    const communityAgents = await api.getAgents({public: true, sort: 'usage'});
    setAgents([...userAgents, ...communityAgents]);
  };
  
  const selectAgent = (agentId: string) => {
    // Non-obvious: Switching agents mid-session creates a marker
    chatStore.sendMessage('', {
      metadata: {
        type: 'agent_switch',
        from: chatStore.agent?.agent_id,
        to: agentId
      }
    });
    chatStore.setAgent(agentId);
  };
  
  return (
    <div className="agent-selector">
      <div className="my-agents">
        <h3>My Agents</h3>
        {agents.filter(a => a.owner_id === currentUser.id).map(agent => (
          <AgentCard 
            key={agent.agent_id}
            agent={agent}
            onSelect={() => selectAgent(agent.agent_id)}
            onEdit={() => editAgent(agent)}
          />
        ))}
      </div>
      
      <div className="community-agents">
        <h3>Community Agents</h3>
        {agents.filter(a => a.is_public).map(agent => (
          <AgentCard 
            key={agent.agent_id}
            agent={agent}
            onSelect={() => selectAgent(agent.agent_id)}
            onFork={() => forkAgent(agent)} // Copy to my agents
          />
        ))}
      </div>
      
      <Button onClick={() => setShowCreator(true)}>
        Create New Agent
      </Button>
      
      {showCreator && <AgentCreator onClose={() => setShowCreator(false)} />}
    </div>
  );
};

const AgentCreator = ({ onClose }: {onClose: () => void}) => {
  // Non-obvious: Agent creation IS a conversation
  const [step, setStep] = useState<'describe' | 'clarify' | 'simulate' | 'confirm'>('describe');
  
  const startVibeCoding = async (description: string) => {
    const vibeSession = await api.startVibeCoding(description);
    // Redirect to chat interface with vibeSession
    router.push(`/chat/${vibeSession.sessionId}`);
  };
  
  return (
    <Dialog>
      <DialogTitle>Create New Agent</DialogTitle>
      <DialogContent>
        {step === 'describe' && (
          <div>
            <p>Describe the agent you want in natural language:</p>
            <textarea 
              placeholder="I want an agent that writes Python code, asks for clarification on requirements, and always includes type hints..."
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  await startVibeCoding(e.currentTarget.value);
                }
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

**Non-Obvious Detail**: When switching agents mid-session, **don't** retroactively change old messages. Insert a **system message** marking the switch, e.g., `--- Agent changed from Louie-v3 to CodeWriter-v1 ---`. This preserves conversation history integrity.

### **Day 5-6: Spread Trigger UI**

**Implementation**:
```typescript
const SpreadTrigger = () => {
  const [tasks, setTasks] = useState<string[]>(['']);
  const [strategy, setStrategy] = useState<'parallel' | 'sequential'>('parallel');
  
  const addTask = () => setTasks([...tasks, '']);
  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };
  
  const initiateSpread = async () => {
    const filteredTasks = tasks.filter(t => t.trim().length > 0);
    if (filteredTasks.length === 0) return;
    
    // Non-obvious: Show cost estimate BEFORE initiating
    const estimate = await api.estimateSpreadCost(
      chatStore.sessionId,
      filteredTasks,
      strategy
    );
    
    const confirmed = confirm(
      `Spread will create ${filteredTasks.length} parallel conversations.\n` +
      `Estimated cost: $${estimate.cost.toFixed(4)}\n` +
      `Estimated time: ${estimate.duration} minutes\n\n` +
      `Proceed?`
    );
    
    if (!confirmed) return;
    
    const manifestId = await chatStore.triggerSpread(filteredTasks, strategy);
    router.push(`/spread/${manifestId}`); // Navigate to dashboard
  };
  
  // Smart task extraction from conversation
  const extractTasksFromChat = async () => {
    const lastMessages = chatStore.messages.slice(-20);
    const extracted = await api.extractTasks(lastMessages);
    setTasks(extracted);
  };
  
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="ghost">🧬 Spread</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="spread-ui">
          <div className="strategy-selector">
            <label>
              <input 
                type="radio" 
                value="parallel" 
                checked={strategy === 'parallel'}
                onChange={() => setStrategy('parallel')}
              />
              Parallel (all at once)
            </label>
            <label>
              <input 
                type="radio" 
                value="sequential" 
                checked={strategy === 'sequential'}
                onChange={() => setStrategy('sequential')}
              />
              Sequential (one by one)
            </label>
          </div>
          
          <div className="tasks-list">
            {tasks.map((task, i) => (
              <div key={i} className="task-input">
                <input
                  value={task}
                  placeholder="Task 1: Research OAuth best practices"
                  onChange={(e) => updateTask(i, e.target.value)}
                />
                {tasks.length > 1 && (
                  <button onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="actions">
            <Button onClick={addTask}>+ Add Task</Button>
            <Button onClick={extractTasksFromChat}>✨ Extract from Chat</Button>
            <Button primary onClick={initiateSpread}>Initiate Spread</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

**Non-Obvious Detail**: The  **"Extract from Chat"**  feature uses a dedicated LLM call with this prompt: `Analyze this conversation and extract a list of actionable tasks. Format each as: "Task N: [Action verb] [Object] [Context]". Return 5-10 max.`. This turns natural chat into structured tasks automatically.

---

## **Week 11-12: Billing & Launch Prep**

### **Day 1-2: Billing Event Collection**

**Event Schema**:
```typescript
interface BillingEvent {
  event_id: string; // UUID
  user_id: string;
  session_id: string;
  provider: 'cloudflare' | 'openai' | 'anthropic' | 'local';
  model: string; // '@cf/meta/llama-3-70b'
  
  // Token usage
  tokens_in: number;
  tokens_out: number;
  tokens_total: number;
  
  // Cost
  provider_cost_usd: number; // Cloudflare's cost
  marked_up_cost_usd: number; // What you charge user
  platform_fee_usd: number; // Your markup
  
  // Metadata
  timestamp: Date;
  billing_period: string; // '2024-01'
  tier: 'free' | 'pro' | 'business';
  
  // For audit trail
  request_hash: string; // SHA256 of request (idempotency)
  response_id: string; // Provider's response ID
}

// Database table
CREATE TABLE billing_events (
  event_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  session_id UUID REFERENCES sessions(session_id),
  provider VARCHAR(20) NOT NULL,
  model VARCHAR(100) NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL,
  provider_cost_usd DECIMAL(10, 6) NOT NULL,
  marked_up_cost_usd DECIMAL(10, 6) NOT NULL,
  platform_fee_usd DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  billing_period VARCHAR(7) NOT NULL, -- YYYY-MM
  tier VARCHAR(20) NOT NULL,
  request_hash VARCHAR(64) UNIQUE NOT NULL, -- Idempotency key
  response_id VARCHAR(255),
  
  -- Indexes for queries
  INDEX idx_billing_user_period (user_id, billing_period),
  INDEX idx_billing_timestamp (timestamp)
);
```

**Non-Obvious Detail**: The `request_hash` field prevents double-billing. If the same request is retried due to network errors, the hash will be identical. Use PostgreSQL's `ON CONFLICT DO NOTHING` to silently ignore duplicates.

**Cost Calculation**:
```typescript
class BillingService {
  private readonly CLOUDFLARE_RATES = {
    // Per 1M tokens
    '@cf/meta/llama-3-70b': { input: 0.70, output: 0.90 },
    '@cf/mistral/mistral-7b': { input: 0.13, output: 0.13 }
  };
  
  async recordEvent(event: Omit<BillingEvent, 'event_id' | 'marked_up_cost_usd' | 'platform_fee_usd'>): Promise<void> {
    
    // 1. Calculate base cost
    const baseCost = this.calculateProviderCost(event.provider, event.model, event.tokens_in, event.tokens_out);
    
    // 2. Apply markup based on tier
    const markup = await this.getTierMarkup(event.user_id);
    const markedUpCost = baseCost * markup;
    const platformFee = markedUpCost - baseCost;
    
    // 3. Check free tier quota
    const isFreeTier = await this.isWithinFreeTier(event.user_id, event.provider, event.timestamp);
    
    const finalCost = isFreeTier ? 0 : markedUpCost;
    const finalPlatformFee = isFreeTier ? 0 : platformFee;
    
    // 4. Create event with idempotency
    const eventId = crypto.randomUUID();
    const requestHash = this.hashRequest(event);
    
    try {
      await db('billing_events').insert({
        event_id: eventId,
        ...event,
        provider_cost_usd: baseCost,
        marked_up_cost_usd: finalCost,
        platform_fee_usd: finalPlatformFee,
        request_hash: requestHash
      });
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        console.log('Duplicate billing event ignored:', requestHash);
        return;
      }
      throw error;
    }
    
    // 5. Update quota usage (async)
    if (!isFreeTier) {
      this.updateQuotaUsage(event.user_id, event.provider, event.tokens_total);
    }
  }
  
  private calculateProviderCost(
    provider: string,
    model: string,
    tokensIn: number,
    tokensOut: number
  ): number {
    if (provider === 'cloudflare') {
      const rate = this.CLOUDFLARE_RATES[model] || this.CLOUDFLARE_RATES['@cf/meta/llama-3-70b'];
      return (tokensIn / 1_000_000 * rate.input) + 
             (tokensOut / 1_000_000 * rate.output);
    }
    
    // OpenAI, Anthropic have their own rates
    // Non-obvious: These are subject to change - cache for 24h from provider APIs
  }
  
  private async isWithinFreeTier(
    userId: string,
    provider: string,
    timestamp: Date
  ): Promise<boolean> {
    if (provider !== 'cloudflare') return false; // Only CF has free tier
    
    // Cloudflare free tier: 10,000 requests/day, 50,000 tokens/day
    const today = timestamp.toISOString().split('T')[0];
    
    const usage = await db('billing_events')
      .where({user_id: userId, provider: 'cloudflare'})
      .whereRaw("DATE(timestamp) = ?", [today])
      .sum('tokens_total as tokens')
      .count('* as requests');
    
    return usage.tokens < 50_000 && usage.requests < 10_000;
  }
  
  private hashRequest(event: Omit<BillingEvent, 'event_id'>): string {
    // Non-obvious: Hash must be deterministic across retries
    const hashInput = {
      user_id: event.user_id,
      session_id: event.session_id,
      provider: event.provider,
      model: event.model,
      tokens_in: event.tokens_in,
      tokens_out: event.tokens_out,
      timestamp: Math.floor(event.timestamp.getTime() / 1000) // Round to seconds
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashInput, Object.keys(hashInput).sort()))
      .digest('hex');
  }
}
```

### **Day 3-4: Usage Quota Tracking**

**Implementation**:
```typescript
class QuotaService {
  // Non-obvious: Use Redis for real-time quota checks (fast, atomic)
  // Fall back to PostgreSQL for persistence
  
  async checkQuota(
    userId: string,
    provider: string,
    estimatedTokens: number
  ): Promise<{allowed: boolean; remaining: number; reason?: string}> {
    
    const tier = await this.getUserTier(userId);
    const limits = this.getTierLimits(tier);
    
    // Check daily limits
    const cacheKey = `quota:${userId}:${provider}:${this.getTodayKey()}`;
    const used = await redis.get(cacheKey) || 0;
    
    if (used + estimatedTokens > limits.dailyTokens) {
      return {
        allowed: false,
        remaining: Math.max(0, limits.dailyTokens - used),
        reason: `Daily token limit reached: ${used}/${limits.dailyTokens}`
      };
    }
    
    return { allowed: true, remaining: limits.dailyTokens - used };
  }
  
  async consumeQuota(
    userId: string,
    provider: string,
    actualTokens: number
  ): Promise<void> {
    const cacheKey = `quota:${userId}:${provider}:${this.getTodayKey()}`;
    
    // Non-obvious: Use INCRBY (atomic) and set expiry
    const newUsage = await redis.incrBy(cacheKey, actualTokens);
    
    if (newUsage === actualTokens) {
      // First increment, set expiry to end of day
      const msUntilMidnight = this.getMsUntilMidnight();
      await redis.expire(cacheKey, Math.ceil(msUntilMidnight / 1000));
    }
    
    // Async: Sync to PostgreSQL every hour
    if (Math.random() < 0.1) { // 10% chance
      await this.syncQuotaToDB(userId, provider);
    }
  }
  
  private getTierLimits(tier: string): {dailyTokens: number; dailyRequests: number} {
    switch (tier) {
      case 'free': return {dailyTokens: 50_000, dailyRequests: 10_000};
      case 'pro': return {dailyTokens: 500_000, dailyRequests: 100_000};
      case 'business': return {dailyTokens: 2_000_000, dailyRequests: 500_000};
      default: return {dailyTokens: 50_000, dailyRequests: 10_000};
    }
  }
  
  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  private getMsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
  
  private async syncQuotaToDB(userId: string, provider: string): Promise<void> {
    const cacheKey = `quota:${userId}:${provider}:${this.getTodayKey()}`;
    const used = await redis.get(cacheKey);
    
    if (used) {
      await db('quota_usage')
        .insert({
          user_id: userId,
          provider: provider,
          date: this.getTodayKey(),
          tokens_used: parseInt(used),
          synced_at: new Date()
        })
        .onConflict(['user_id', 'provider', 'date'])
        .merge();
    }
  }
}
```

**Critical Non-Obvious Detail**: The **Redis expiry must be set to end of day UTC**, not from first use. Otherwise, a user who starts at 11:55 PM gets only 5 minutes of quota. Calculate exact seconds until `00:00:00 UTC` next day.

### **Day 5-6: Launch Prep & Monitoring**

**Health Checks**:
```typescript
// Express health check endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    cloudflare: await checkCloudflareAPI(),
    llm_gateway: await checkLLMGateway(),
    storage: await checkStorage()
  };
  
  const allHealthy = Object.values(checks).every(c => c.status === 'ok');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks
  });
});

// Non-obvious: LLM gateway check must be cheap
// Use a tiny model for health check
async function checkLLMGateway(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    const response = await fetch('https://gateway.ai.cloudflare.com/...', {
      method: 'POST',
      body: JSON.stringify({
        model: '@cf/meta/tinyllama', // 1.1B parameters, fast
        messages: [{role: 'user', content: 'ping'}],
        max_tokens: 1
      })
    });
    
    return {
      status: response.ok ? 'ok' : 'error',
      latency: Date.now() - start,
      details: { status: response.status }
    };
  } catch (error) {
    return { status: 'error', latency: -1, details: { error: error.message } };
  }
}
```

**Error Tracking**:
```typescript
// Sentry integration for specific error types
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    // Non-obvious: Filter out user errors, track only system errors
    if (event.exception?.values?.[0]?.type === 'ValidationError') {
      return null; // Don't alert on bad user input
    }
    
    // Add session context
    event.contexts = {
      ...event.contexts,
      session: {
        session_id: getCurrentSessionId(),
        context_percentage: getCurrentContextPercentage()
      }
    };
    
    return event;
  }
});

// Track context window failures
class ContextWindowGuard {
  async onContextExceeded(session: Session): Promise<void> {
    Sentry.captureException(new Error('ContextExceeded'), {
      level: 'warning',
      tags: {
        session_id: session.sessionId,
        used_tokens: session.contextBudget.usedTokens,
        total_tokens: session.contextBudget.totalTokens
      }
    });
    
    // Non-obvious: Auto-trigger recovery
    await this.triggerEmergencyCompaction(session);
  }
}
```

**Deployment Checklist**:
- [ ] Cloudflare Workers for API gateway (rate limiting per user)
- [ ] PostgreSQL connection pooling (PGBouncer)
- [ ] Redis cluster for quotas and session locking
- [ ] R2 bucket with lifecycle policy (auto-delete old deltas after 30 days)
- [ ] Sentry for error tracking
- [ ] Stripe for billing (async job to invoice cost-plus monthly)
- [ ] OAuth apps registered for Google, Cloudflare
- [ ] Terms of Service (critical: you don't store data, user infra)
- [ ] Privacy Policy (emphasize local-first, BYO keys)

---

## **Final Phase 1 Architecture Summary**

You now have:
1. **Session Manager**: CRDT-based, token-aware, with automatic schema generation at 85%
2. **Spread Engine v1**: Manual merge, parallel/sequential, with cost estimation
3. **Agent Runtime**: Vibe-coding with 3-turn clarification, soft language learning
4. **Storage Layer**: R2 primary, Google Drive optional, Session Book export
5. **Messenger UI**: Virtualized chat, real-time context indicator, Spread trigger
6. **Billing**: Cost-plus model with free tier, idempotent events, quota tracking

**Non-obvious MVP simplifications**:
- No CRDT sync between siblings (manual merge only)
- No automatic compaction (triggered at 85%, but manual approval)
- No local Ollama integration (Cloudflare only for MVP)
- No DAG spread (parallel or sequential only)

**Shippable**: This MVP lets users experience the core "edit trick" generalized as Spread, create agents via conversation, and manage context windows explicitly. The cost model is sustainable, and the architecture scales horizontally.

Ready to build?