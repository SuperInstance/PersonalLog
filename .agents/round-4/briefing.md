# Round 4: Vibe-Coding & Agent Marketplace

**Status:** Active
**Date:** 2025-01-04
**Mission:** Enable agent creation through natural conversation and build community sharing infrastructure

---

## Vision

Users should be able to create custom agents simply by talking to PersonalLog, just like they would with a human developer. No YAML editing, no configuration files - just natural conversation.

**User Experience:**
```
[User to PersonalLog]: "I want you to be more concise and always ask before calling functions"

[PersonalLog]: "I'll help you create a custom agent. Let me clarify a few things:

  1. Should I be concise in ALL responses, or only when providing information?
  2. When you say 'ask before calling functions', which functions specifically?
  3. Should I show you what function I'm about to call, or ask permission in general?"

[User]: "1. Concise in info responses only. 2. All functions. 3. Show me what function."

[PersonalLog]: "Perfect! One more question:

  How should I handle it if you don't respond to my permission request?
  Should I: (a) wait indefinitely, (b) timeout after 30s, or (c) proceed anyway?"

[User]: "Wait indefinitely"

[PersonalLog]: "Great! Last question:

  Do you want this agent to have a specific name and icon?
  If not, I'll call it 'Concise Assistant' with a 💬 icon."

[User]: "That works"

[PersonalLog]: "✅ I've created your custom agent! Here's what it does:

  **Name:** Concise Assistant 💬
  **Behavior:** Concise information responses, asks permission for all functions
  **Timeout:** Waits indefinitely for permission

  [Preview agent definition...]

  Activate this agent now? [Yes] [No] [Edit]"
```

---

## Architecture

### Vibe-Coding System

**3-Turn Clarification Loop:**
1. **Turn 1:** Agent asks 2-3 clarification questions
2. **Turn 2:** User answers, agent asks 2-3 follow-up questions
3. **Turn 3:** User answers, agent generates final definition
4. **Confirmation:** Agent shows preview, user approves/edits

**Agent Generation:**
- Parse conversation for constraints
- Generate AgentDefinition YAML
- Show preview with natural language summary
- Save to IndexedDB on approval
- Register in agent registry

### Agent-to-Agent Communication

**Protocol:**
- Agents send messages to each other through event bus
- JEPA → Spreader: "User frustrated (valence: 0.2), suggest context compaction"
- Spreader → JEPA: "Context at 85%, can you detect emotional themes?"
- Message format: `{ from, to, type, payload, timestamp }`

### Agent Marketplace

**Infrastructure:**
- Agent template library (community contributions)
- Import/export (JSON, YAML)
- Rating system (⭐ 1-5 stars)
- Usage statistics
- Version control

---

## Agent Deployment (6 with AutoAccept)

### Agent 1: Vibe-Coding Conversation Engine
**Mission:** Build the 3-turn clarification loop system
**Scope:**
- Create `src/lib/vibe-coding/types.ts` - Conversation state types
- Create `src/lib/vibe-coding/clarifier.ts` - Question generation engine
- Create `src/lib/vibe-coding/parser.ts` - Extract agent requirements from conversation
- Create `src/lib/vibe-coding/generator.ts` - Generate AgentDefinition from requirements
- LLM-based question generation (use existing AI provider)
- Conversation history tracking
- State machine for 3-turn process

**Deliverables:**
- Vibe-coding engine that generates clarification questions
- Agent requirement parser
- Agent definition generator
- State management for clarification loop

### Agent 2: Vibe-Coding UI & Preview
**Mission:** Build user interface for agent creation
**Scope:**
- Create `src/components/vibe-coding/VibeCodingConversation.tsx` - Chat interface
- Create `src/components/vibe-coding/ClarificationQuestions.tsx` - Display questions
- Create `src/components/vibe-coding/AgentPreview.tsx` - Show generated agent
- Create `src/components/vibe-coding/ApprovalButtons.tsx` - Approve/Edit/Cancel
- Integrate with existing messenger UI
- Edit mode for refining agent definition

**Deliverables:**
- Natural conversation UI for creating agents
- Clarification question display
- Agent preview with natural language summary
- Approval workflow
- Edit capabilities

### Agent 3: Agent-to-Agent Communication Protocol
**Mission:** Build event bus for inter-agent messaging
**Scope:**
- Create `src/lib/agents/communication/types.ts` - Message types
- Create `src/lib/agents/communication/event-bus.ts` - Pub/sub system
- Create `src/lib/agents/communication/protocol.ts` - Message routing
- Integrate JEPA → Spreader communication
- Integrate Spreader → JEPA communication
- Message history and debugging tools

**Deliverables:**
- Event bus for agent-to-agent messaging
- Message protocol with type safety
- JEPA/Spreader integration examples
- Message inspection UI

**Example Use Cases:**
```typescript
// JEPA detects frustration
eventBus.emit('agent-message', {
  from: 'jepa-v1',
  to: 'spreader-v1',
  type: 'user-state-change',
  payload: { emotion: 'frustrated', valence: 0.2, arousal: 0.8 },
  timestamp: Date.now()
});

// Spreader receives and acts
spreaderHandler.onMessage = (message) => {
  if (message.payload.emotion === 'frustrated') {
    suggestContextCompaction();
  }
};
```

### Agent 4: Agent Marketplace Backend
**Mission:** Build marketplace infrastructure for sharing agents
**Scope:**
- Create `src/lib/marketplace/types.ts` - Marketplace types
- Create `src/lib/marketplace/storage.ts` - IndexedDB for shared agents
- Create `src/lib/marketplace/export.ts` - Export agents to JSON/YAML
- Create `src/lib/marketplace/import.ts` - Import agents with validation
- Create `src/lib/marketplace/ratings.ts` - Rating system
- Create `src/lib/marketplace/search.ts` - Search and filter agents
- Version control for agent definitions

**Deliverables:**
- Export agents to JSON/YAML formats
- Import agents with validation
- Rating system (1-5 stars)
- Usage statistics tracking
- Search by name, category, tags
- Version management

### Agent 5: Agent Marketplace UI
**Mission:** Build user interface for marketplace
**Scope:**
- Create `src/app/marketplace/page.tsx` - Marketplace page
- Create `src/components/marketplace/AgentGallery.tsx` - Browse agents
- Create `src/components/marketplace/AgentCard.tsx` - Agent preview card
- Create `src/components/marketplace/ImportExport.tsx` - Import/export interface
- Create `src/components/marketplace/RatingStars.tsx` - Rating component
- Create `src/components/marketplace/SearchBar.tsx` - Search and filter
- Agent detail view with full description
- "Install Agent" button

**Deliverables:**
- Marketplace page with agent gallery
- Agent cards with ratings, usage stats
- Import/export UI
- Search and filter functionality
- Install/uninstall workflow

### Agent 6: Agent Templates & Community Library
**Mission:** Create initial agent templates and community sharing system
**Scope:**
- Create `src/lib/agents/templates.ts` - Built-in agent templates
- Create 10+ example agent templates:
  - Research Assistant (concise, focused on research)
  - Writing Coach (detailed feedback, suggestions)
  - Code Reviewer (technical, critical)
  - Meeting Note Taker (structured, concise)
  - Creative Writer (imaginative, expansive)
  - Data Analyst (precise, data-driven)
  - Language Tutor (patient, educational)
  - Fitness Coach (motivational, goal-oriented)
  - Meditation Guide (calm, reflective)
  - Problem Solver (analytical, systematic)
- Create `src/lib/marketplace/community.ts` - Community sharing infrastructure
- Template selection UI
- Template customization wizard

**Deliverables:**
- 10+ pre-built agent templates
- Community sharing infrastructure
- Template gallery
- Template customization workflow
- Documentation for each template

---

## Success Criteria

**Functional:**
- ✅ User can create agent through 3-turn conversation
- ✅ Generated agent definition is valid and functional
- ✅ JEPA and Spreader communicate with each other
- ✅ Agents can be exported to JSON/YAML
- ✅ Agents can be imported from file
- ✅ Marketplace shows 10+ templates
- ✅ Users can rate and review agents

**Technical:**
- ✅ Zero TypeScript errors
- ✅ Vibe-coding state machine handles edge cases
- ✅ Agent-to-agent messages are type-safe
- ✅ Export/import validates agent definitions
- ✅ Marketplace storage uses IndexedDB
- ✅ Template system is extensible

**User Experience:**
- ✅ Agent creation feels natural and conversational
- ✅ Clarification questions are relevant and helpful
- ✅ Agent preview is clear and accurate
- ✅ Marketplace is easy to browse and search
- ✅ Import/export is straightforward
- ✅ Templates cover common use cases

---

## Round Dependencies

**Requires (Rounds 1-3):**
- ✅ Agent registry system
- ✅ Agent message pipeline
- ✅ Hardware requirements validator
- ✅ Agent conversation UI
- ✅ JEPA and Spreader implementations

**Enables (Future Rounds):**
- Round 5: Advanced JEPA (emotion-aware agents)
- Round 6: Advanced Spreader (multi-agent orchestration)
- Community growth and agent sharing

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
- Break existing agents
- Remove existing features
- Make breaking changes to agent registry

---

## Example Agent Templates

### Template 1: Research Assistant
```yaml
name: Research Assistant
icon: 🔍
category: knowledge
description: Helps with research, summarizing papers, finding information
constraints:
  brief_by_default: true
  ask_for_clarification: true
  max_response_tokens: 500
capabilities:
  - web_search
  - summarization
  - citation_generation
personality:
  tone: professional
  style: concise
  expertise: academic_research
```

### Template 2: Writing Coach
```yaml
name: Writing Coach
icon: ✍️
category: creative
description: Provides feedback on writing, suggests improvements
constraints:
  brief_by_default: false
  ask_for_clarification: true
  max_response_tokens: 1000
capabilities:
  - grammar_check
  - style_suggestions
  - tone_analysis
personality:
  tone: encouraging
  style: detailed
  expertise: writing_education
```

---

## Timeline

**Agent Execution:** Parallel deployment of all 6 agents
**Integration:** After all agents complete, integrate vibe-coding with messenger
**Testing:** Verify agent creation flow, marketplace, agent-to-agent communication
**Documentation:** Update CLAUDE.md with Round 4 progress

---

**Round 4 Status:** 🟢 ACTIVE
**Next:** Deploy 6 agents with AutoAccept
**Goal:** Agent creation through conversation + community marketplace

---

*"Democratizing agent creation - anyone can create a custom AI agent just by talking to PersonalLog, no coding required."*

**End of Round 4 Briefing**
