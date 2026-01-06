# Round 3: Agent Conversation Interface

**Status:** Active
**Date:** 2025-01-04
**Mission:** Transform JEPA, Spreader, and other agents from background features into interactive messenger-style conversations

---

## Vision

Users should be able to interact with specialized agents (JEPA, Spreader, etc.) the same way they interact with human contacts - as conversations in tabs or items in a conversation list.

**User Experience:**
```
[Messenger Sidebar]
├── Dad (human contact)
├── Mom (human contact)
├── JEPA 🎙️ (agent - requires RTX 4050+)
├── Spreader 📚 (agent - available)
└── Research Assistant (custom agent)
```

**When user clicks "JEPA":**
1. System checks hardware requirements
2. If passes → Opens JEPA conversation tab
3. JEPA: "Hi! I'm ready to analyze your conversation for emotional subtext.
         Start a conversation, and I'll listen in the background."
4. User: "Great, let's try it"
5. [JEPA starts analyzing audio in real-time]

---

## Architecture

### Agent Registry
Central registry of all available agents with metadata:
```typescript
interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'analysis' | 'knowledge' | 'custom';
  requirements: {
    hardware?: HardwareRequirement;
    apis?: string[];
    flags?: string[];
  };
  activationMode: 'background' | 'foreground' | 'hybrid';
  initialState?: AgentState;
}
```

### Agent Conversation Model
Agents participate in conversations like humans:
- Messages flow through same chat pipeline
- Agents can respond, not just humans
- Background agents don't show in chat (like JEPA)
- Foreground agents show responses (like Spreader)

### Hardware Requirements Gate
Before activating agent:
1. Check hardware score (from Round 2)
2. Check required APIs (Cloudflare, OpenAI, etc.)
3. Check feature flags
4. If any fail → Show friendly error message
5. If all pass → Activate agent

---

## Agent Deployment (6 with AutoAccept)

### Agent 1: Agent Registry System
**Mission:** Create central agent registry and persistence layer
**Scope:**
- Create `src/lib/agents/registry.ts`
- Define `AgentDefinition` type
- Create `src/lib/agents/presets.ts` with JEPA, Spreader definitions
- Add IndexedDB persistence for user-created agents
- CRUD operations for agent management

**Deliverables:**
- Agent registry with 2 preset agents (JEPA, Spreader)
- Type-safe agent definitions
- IndexedDB integration
- Export/import agent definitions

### Agent 2: Hardware Requirements Validator
**Mission:** Build hardware requirements checker before agent activation
**Scope:**
- Create `src/lib/agents/requirements.ts`
- Integrate with existing `src/lib/hardware/scoring.ts`
- Build requirement checker function
- Create friendly error messages for failed requirements
- Add "System Compatibility" indicator

**Deliverables:**
- Requirements checker that validates before activation
- User-friendly "You need RTX 4050 or better" messages
- Compatibility UI component
- Integration with agent registry

### Agent 3: Agent Conversation UI
**Mission:** Integrate agents into messenger sidebar and conversation list
**Scope:**
- Update `src/components/layout/Sidebar.tsx` (or create if not exists)
- Add agent section to conversation list
- Create `src/components/agents/AgentCard.tsx`
- Different styling for agents vs humans
- Add agent activation modal

**Deliverables:**
- Agents appear in sidebar alongside contacts
- Agent cards with icons, names, status indicators
- Click to activate (with requirements check)
- Active agent conversations appear as tabs

### Agent 4: Agent Message Pipeline
**Mission:** Integrate agents into chat message flow
**Scope:**
- Create `src/lib/agents/message-pipeline.ts`
- Add `agentId` field to conversation model
- Route messages through agent handlers
- Background agents: process silently (JEPA)
- Foreground agents: respond in chat (Spreader)
- Create agent response UI component

**Deliverables:**
- Messages from agents display correctly in chat
- Agent responses styled distinctly
- Background agents show subtle "processing" indicator
- Agent messages saved to conversation history

### Agent 5: JEPA Agent Implementation
**Mission:** Wire up JEPA as interactive agent conversation
**Scope:**
- Create `src/lib/agents/jepa-agent.ts`
- Implement JEPA message handler
- Add JEPA-specific UI (transcript panel, emotion indicators)
- Integrate existing Round 2 JEPA components
- Add JEPA welcome message and help

**Deliverables:**
- Click JEPA in sidebar → Opens JEPA conversation
- JEPA: "I'm analyzing for emotional subtext..."
- Real-time emotion analysis shown in conversation
- JEPA controls embedded in conversation
- Export transcripts from JEPA conversation

### Agent 6: Spreader Agent Implementation
**Mission:** Wire up Spreader as interactive agent conversation
**Scope:**
- Create `src/lib/agents/spreader-agent.ts`
- Implement Spreader message handler
- Add Spreader UI (context meter, spread dashboard)
- Create spread command parser ("Spread this: task1, task2, task3")
- Add Spreader welcome message and help

**Deliverables:**
- Click Spreader in sidebar → Opens Spreader conversation
- Spreader: "I'm managing your context window..."
- Context percentage indicator in conversation
- Spread command triggers parallel tasks
- Spread dashboard shows child conversations

---

## Success Criteria

**Functional:**
- ✅ JEPA and Spreader appear in messenger sidebar
- ✅ Clicking agent opens conversation tab
- ✅ Hardware requirements checked before activation
- ✅ JEPA analyzes conversation in real-time
- ✅ Spreader manages context and spawns parallel tasks
- ✅ Agents work alongside human contacts

**Technical:**
- ✅ Zero TypeScript errors
- ✅ Agent registry persists to IndexedDB
- ✅ Message flow works for both humans and agents
- ✅ Hardware detection prevents crashes
- ✅ UI matches messenger design patterns

**User Experience:**
- ✅ Agents feel like contacts, not features
- ✅ Clear indication of agent vs human
- ✅ Friendly error messages for missing requirements
- ✅ Easy to understand what each agent does
- ✅ Seamless switching between agents and humans

---

## Round Dependencies

**Requires (Round 2):**
- ✅ Hardware detection system
- ✅ JEPA audio capture
- ✅ JEPA transcription pipeline
- ✅ Feature flags system

**Enables (Future Rounds):**
- Round 4: Advanced agent features (vibe-coding, agent-to-agent)
- Round 5: Cloud agent APIs (Cloudflare Workers agents)
- Round 6: Agent marketplace and community sharing

---

## AutoAccept Mode

All 6 agents deployed with **AutoAccept ENABLED** for autonomous decision-making.

Agents are authorized to:
- Make architectural decisions
- Write/refactor code
- Add necessary dependencies
- Run tests and fix errors
- Update documentation
- Adjust scope if needed (within reason)

Agents should NOT:
- Delete user data
- Break existing features
- Make drastic UI changes without cause

---

## Timeline

**Agent Execution:** Parallel deployment of all 6 agents
**Integration:** After all agents complete, integrate changes
**Testing:** Verify agent activation, message flow, hardware checks
**Documentation:** Update CLAUDE.md with Round 3 progress

---

**Round 3 Status:** 🟢 ACTIVE
**Next:** Deploy 6 agents with AutoAccept
**Goal:** Agents as conversations, not features

---

*"Transforming agents from background tools into conversational partners - making AI feel like a contact, not a feature."*
