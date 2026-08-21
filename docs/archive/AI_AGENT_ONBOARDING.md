# AI Agent Onboarding Guide - PersonalLog

**For:** Claude, GPT-4, and other AI agents working on PersonalLog
**Purpose:** Rapid context assimilation and effective contribution
**Last Updated:** 2025-01-07

---

## Table of Contents
1. [Mission Statement](#mission-statement)
2. [Project Overview](#project-overview)
3. [Technical Architecture](#technical-architecture)
4. [Development Workflow](#development-workflow)
5. [Common Patterns](#common-patterns)
6. [Debugging Guide](#debugging-guide)
7. [Quality Checklist](#quality-checklist)
8. [Emergency Procedures](#emergency-procedures)

---

## Mission Statement

### Core Philosophy
> **"Most AI gives people access to the world. We give them access to themselves."**

PersonalLog is an adaptive personal AI system that helps users understand themselves through:
- Real-time emotional intelligence (JEPA)
- Knowledge management and synthesis
- Conversation spreading and parallel processing
- Self-optimization through analytics

### What Makes PersonalLog Different

1. **Local-First Privacy**
   - All data stored locally by default
   - User controls their data
   - Optional sync with user's own Cloudflare account (NOT ours)
   - We never see, touch, or store user conversations

2. **System-Agnostic Architecture**
   - Works on hardware from RTX 4050 to DGX Station
   - Features automatically adjust based on capabilities
   - No user configuration needed - hardware detection handles everything

3. **Plugin Ecosystem**
   - Extensible architecture with marketplace
   - Community-driven development
   - Open source agents (not widgets for sale)

4. **Multi-Agent Orchestration**
   - BMAD method: Backlog → Milestones → Agents → Delivery
   - Systematic autonomous iteration
   - Up to 6 specialized agents per round

---

## Project Overview

### Current Status
- **TypeScript Errors:** 0 (production code)
- **Total Files:** 633 TypeScript/TSX files
- **Test Coverage:** 200+ test cases
- **Build Status:** ✅ PASSING
- **Development Phase:** Feature enhancement

### Tech Stack
```
Frontend:  Next.js 15 + React 19 + TypeScript (strict mode)
Storage:   IndexedDB (7 stores for plugins, emotion storage, etc.)
Audio:     Web Audio API + Web Workers
AI:        JEPA (emotion), Whisper (transcription), LLM providers
Compute:   WebAssembly + Web Workers for performance
Testing:   Vitest (unit), Playwright (E2E)
```

### Core Systems

#### 1. JEPA (Joint Embedded Predictive Architectures)
**Purpose:** Real-time emotion analysis from audio

**Key Components:**
```
src/lib/jepa/
├── audio-capture.ts          # Web Audio API integration
├── audio-state.ts            # Recording state management
├── audio-features.worker.ts  # Background feature extraction
├── stt-engine.ts             # Multi-backend transcription
├── emotion-storage.ts        # VAD emotion persistence
└── markdown-formatter.ts     # Transcript export
```

**Hardware Requirements:**
- Tier 1 (0-30): Disabled - not enough resources
- Tier 2 (31-50): Tiny-JEPA only
- Tier 3 (51-70): JEPA-Large + Whisper
- Tier 4 (71-100): Multimodal JEPA

**Entry Point:** `src/app/jepa/page.tsx`

#### 2. Agents System
**Purpose:** Messenger-style AI agent conversations

**Key Components:**
```
src/lib/agents/
├── registry.ts               # Agent registration
├── validator.ts              # Hardware requirements
├── requirements.ts           # Requirement types
├── message-pipeline.ts       # Message routing
└── handlers.ts               # Handler registration

src/components/agents/
├── AgentSection.tsx          # Sidebar list
├── AgentActivationModal.tsx  # Activation dialog
└── [agent-name]/             # Agent-specific UIs
```

**Built-in Agents:**
- **JEPA:** Emotion analysis from audio
- **Spreader:** Parallel child conversation management

**Entry Point:** `src/components/agents/AgentSection.tsx`

#### 3. Spreader System
**Purpose:** DAG-based parallel conversation processing

**Key Components:**
```
src/lib/agents/spread/
├── spreader-agent.ts         # Main agent
├── dag.ts                    # DAG orchestration
├── dag-executor.ts           # DAG execution
├── optimizer.ts              # Token optimization
└── compression-strategies.ts # Context compression
```

**Features:**
- DAG (Directed Acyclic Graph) execution
- Auto-merge child conversations
- Token usage optimization
- Context compression strategies

**Entry Point:** `src/components/agents/spreader/SpreaderConversation.tsx`

#### 4. Intelligence Hub
**Purpose:** Unified intelligence system

**Key Components:**
```
src/lib/intelligence/
├── hub.ts                    # Central coordinator
├── workflows.ts              # Automated workflows
└── data-flow.ts              # Cross-system pipelines

src/lib/analytics/            # Event tracking
src/lib/experiments/          # A/B testing
src/lib/optimization/         # Auto-tuning
src/lib/personalization/      # Preference learning
```

**Features:**
- Pattern recognition
- Auto-tuning (26+ optimization rules)
- Usage prediction (80%+ accuracy)
- Continuous learning workflows

**Entry Point:** `src/app/settings/intelligence/page.tsx`

#### 5. Plugin System
**Purpose:** Extensibility and marketplace

**Key Components:**
```
src/lib/plugin/
├── storage.ts                # IndexedDB (7 stores, 80 methods)
├── api.ts                    # Complete API (45 functions)
├── manager.ts                # Lifecycle management
├── permissions.ts            # Permission system
└── types.ts                  # Type definitions

src/lib/marketplace/
├── ratings.ts                # Rating system
└── storage.ts                # Marketplace data

src/app/marketplace/          # Marketplace UI
```

**Features:**
- Install, uninstall, enable, disable, update
- Rate and review plugins
- Permission management (3-state)
- Complete API for plugin developers

**Storage:**
```typescript
// 7 IndexedDB stores
manifests      // Plugin metadata
states         // Installed/enabled/disabled
permissions    // User-granted permissions
files          // Plugin code and assets
versions       // Version history
logs           // Installation audit trail
stats          // Usage statistics
```

---

## Technical Architecture

### File Organization

```
src/
├── app/                    # Next.js App Router
│   ├── (messenger)/       # Messenger layout
│   ├── jepa/              # JEPA interface
│   ├── marketplace/       # Plugin marketplace
│   └── settings/          # Settings pages
│
├── components/            # React components
│   ├── agents/           # Agent UIs
│   ├── jepa/             # JEPA components
│   ├── marketplace/      # Marketplace components
│   ├── messenger/        # Chat UI
│   └── ui/               # Generic UI elements
│
└── lib/                   # Business logic
    ├── agents/           # Agent system
    ├── jepa/             # JEPA logic
    ├── plugin/           # Plugin system
    ├── intelligence/     # Intelligence hub
    ├── analytics/        # Event tracking
    ├── experiments/      # A/B testing
    ├── optimization/     # Auto-tuning
    ├── personalization/  # Preference learning
    ├── backup/           # Data safety
    ├── hardware/         # Hardware detection
    └── flags/            # Feature flags
```

### Data Flow

```
User Action (UI)
    ↓
Component Event Handler
    ↓
Business Logic (lib/)
    ↓
Storage Operation (IndexedDB)
    ↓
State Update
    ↓
UI Re-render
```

### Hardware Detection Flow

```
App Startup
    ↓
detectHardwareCapabilities()
    ├── GPU detection (WebGL, WebGPU)
    ├── RAM detection (navigator.deviceMemory)
    ├── CPU detection (hardwareConcurrency)
    └── Storage detection (navigator.storage)
    ↓
calculateJEPAScore(capabilities)
    ├── Returns 0-100 score
    └── Categorizes into 4 tiers
    ↓
adjustFeatures(score)
    ├── Enable features for tier
    └── Disable unavailable features
    ↓
Feature Flags Updated
    ↓
UI Reflects Capabilities
```

### Agent Message Flow

```
User sends message to agent
    ↓
message-pipeline.ts routes message
    ↓
Agent handler receives message
    ↓
Agent processes (JEPA/Spreader/etc.)
    ↓
Handler returns AgentResponse
    ↓
Message displayed in chat
    ↓
State persisted to IndexedDB
```

---

## Development Workflow

### 1. First Actions (Always)

```bash
# Check build status
npm run type-check  # Should be 0 errors
npm run build       # Should pass

# Check recent work
git log --oneline -5
cat .agents/WORK_STATUS.md

# See what's needed
ls -la .agents/roadmaps/
```

### 2. Understanding Requirements

**Before Starting Work:**
1. Read the relevant briefing document (`.agents/round-N/briefing.md`)
2. Check WORK_STATUS.md for context
3. Read related implementation files
4. Check tests for usage patterns

**Key Questions to Answer:**
- What is the specific deliverable?
- What are the success criteria?
- What files will be modified/created?
- Are there hardware requirements?
- Are there dependencies on other systems?

### 3. Implementation Checklist

**Phase 1: Planning**
- [ ] Read all relevant documentation
- [ ] Understand the architecture
- [ ] Identify files to modify/create
- [ ] Check for circular dependencies
- [ ] Plan the implementation approach

**Phase 2: Implementation**
- [ ] Write/update types
- [ ] Implement business logic
- [ ] Add error handling
- [ ] Add JSDoc comments
- [ ] Follow existing patterns

**Phase 3: Testing**
- [ ] Write unit tests
- [ ] Run type-check
- [ ] Run lint
- [ ] Test manually (if applicable)
- [ ] Check for regressions

**Phase 4: Documentation**
- [ ] Update inline comments
- [ ] Create/update implementation docs
- [ ] Update WORK_STATUS.md
- [ ] Commit with proper message

### 4. Git Workflow

**Branch Strategy:**
- Work on `main` branch (this is a solo project with rapid iteration)
- Create feature branches only for experimental work

**Commit Format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

**Example:**
```
feat: Add plugin marketplace rating system

- Implement rating submission and storage
- Add review system with helpful voting
- Create rating statistics with distribution
- Add RatingSummary, ReviewCard, ReviewForm components

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 5. Quality Gates

**Before Marking Work Complete:**
1. ✅ `npm run type-check` passes (0 errors)
2. ✅ `npm run lint` passes (0 warnings)
3. ✅ Relevant tests pass
4. ✅ Code follows existing patterns
5. ✅ JSDoc comments on public functions
6. ✅ Error handling implemented
7. ✅ Edge cases considered

---

## Common Patterns

### Pattern 1: Hardware-Aware Features

**When:** Implementing features that depend on hardware capabilities

```typescript
// 1. Define requirements
const requirements: AgentRequirements = {
  hardware: {
    minRAM: 8,
    minCores: 4,
    requiresGPU: true,
    gpuVRAM: 6, // GB
  },
  features: ['jepa.transcription']
}

// 2. Validate before use
import { validateRequirements } from '@/lib/agents/validator'

const result = await validateRequirements(requirements)
if (!result.valid) {
  // Show user why feature is unavailable
  return <RequirementCheck result={result} />
}

// 3. Enable feature
// Feature will now work within hardware constraints
```

### Pattern 2: IndexedDB Operations

**When:** Persisting data locally

```typescript
// 1. Use existing storage classes
import { PluginStore } from '@/lib/plugin/storage'

const store = new PluginStore()
await store.initialize()

// 2. Use async/await for all operations
const manifest = await store.getManifest(pluginId)

// 3. Handle errors
try {
  await store.install(manifest, files)
} catch (error) {
  if (error instanceof PluginStorageError) {
    // Handle specific error
  }
}
```

### Pattern 3: Agent Handler Implementation

**When:** Creating a new agent

```typescript
// 1. Define agent in presets.ts
export const MY_AGENT: AgentDefinition = {
  id: 'my.agent',
  name: 'My Agent',
  description: 'Does something cool',
  requirements: {
    hardware: { minRAM: 4 }
  },
  handler: 'myAgentHandler'
}

// 2. Implement handler
export async function myAgentHandler(
  message: Message,
  context: HandlerContext
): Promise<AgentResponse> {
  // Process message
  const result = await doWork(message.content.text)

  // Return response
  return {
    type: 'message',
    content: result,
    metadata: {}
  }
}

// 3. Register in handlers.ts
agentHandlers.set('my.agent', myAgentHandler)
```

### Pattern 4: Web Worker for Heavy Computation

**When:** Offloading CPU-intensive tasks

```typescript
// 1. Create worker file
// src/lib/feature/worker.ts
/// <reference lib="webworker" />

self.addEventListener('message', (event) => {
  const { type, data } = event.data

  if (type === 'process') {
    const result = heavyComputation(data)
    self.postMessage({ type: 'result', data: result })
  }
})

// 2. Use worker in main thread
import { extractAudioFeaturesAsync } from '@/lib/jepa/audio-features-async'

const result = await extractAudioFeaturesAsync(samples, sampleRate, {
  cache: true,
  timeout: 10000,
  onStart: () => console.log('Starting...'),
  onComplete: (features, duration) => {
    console.log(`Done in ${duration}ms`)
  }
})
```

### Pattern 5: Error Handling

**When:** Handling errors gracefully

```typescript
// 1. Create custom error class
export class FeatureError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'FeatureError'
  }
}

// 2. Use in functions
export async function doSomething(input: string): Promise<Result> {
  if (!input || input.trim().length === 0) {
    throw new ValidationError('Input is required')
  }

  try {
    const result = await processInput(input)
    return result
  } catch (error) {
    if (error instanceof NetworkError) {
      throw new FeatureError('Network request failed', 'NETWORK_ERROR', error)
    }
    throw error
  }
}

// 3. Handle in UI
try {
  const result = await doSomething(input)
} catch (error) {
  if (error instanceof ValidationError) {
    showToast({ message: error.message, type: 'error' })
  } else if (error instanceof FeatureError) {
    showErrorDialog(error)
  }
}
```

### Pattern 6: Feature Flags

**When:** Conditionally enabling features

```typescript
// 1. Define feature flag
// src/lib/flags/features.ts
export const featureFlags: Record<string, FeatureFlag> = {
  'my.feature': {
    enabled: true,
    description: 'My cool feature',
    hardwareRequirement: {
      minScore: 50, // Requires Tier 3+
    },
    experimental: false
  }
}

// 2. Check before use
import { getFeatureFlags } from '@/lib/flags/features'

const flags = getFeatureFlags()
if (flags['my.feature']?.enabled) {
  // Feature is available
  await useFeature()
}

// 3. Show in UI
import { FeatureFlag } from '@/components/settings/FeatureFlag'

<FeatureFlag
  name="my.feature"
  label="My Feature"
  description="Does something cool"
/>
```

---

## Debugging Guide

### TypeScript Errors

**Common Errors and Fixes:**

1. **Property does not exist on type 'X'**
   ```typescript
   // ❌ Wrong
   const result = api.getFeature()

   // ✅ Right
   const result = await api.getFeature()
   ```

2. **Type 'X' is not assignable to type 'Y'**
   ```typescript
   // ❌ Wrong
   const data: MyType = fetchData()

   // ✅ Right
   const data: MyType = await fetchData() as MyType
   // OR
   const data = await fetchData() as MyType
   ```

3. **Cannot find module 'X'**
   ```bash
   # Check if import path is correct
   grep -r "export.*X" src/

   # Check for typos in import
   # Use @/ alias for src/ root
   import { X } from '@/lib/module'
   ```

4. **Circular dependencies**
   ```bash
   # Detect circular deps
   npx madge --circular src/

   # Fix by:
   # 1. Extract shared code to separate module
   # 2. Use lazy dynamic exports
   # 3. Create interface to break cycle
   ```

### ESLint Errors

**Common Errors and Fixes:**

1. **Unescaped quotes/apostrophes in JSX**
   ```tsx
   // ❌ Wrong
   <div>Click "here" to start</div>

   // ✅ Right
   <div>Click &quot;here&quot; to start</div>
   // OR
   <div>Click {'"here"'} to start</div>
   ```

2. **useEffect missing dependencies**
   ```tsx
   // ❌ Wrong
   useEffect(() => {
     fetchSomething(id)
   }, []) // Missing 'id'

   // ✅ Right
   useEffect(() => {
     fetchSomething(id)
   }, [id])

   // OR (if intentionally omitted)
   useEffect(() => {
     fetchSomething(id)
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [])
   ```

3. **console.log statements**
   ```typescript
   // ❌ Wrong
   console.log('Debug:', value)

   // ✅ Right
   // Remove debug statements before committing
   // OR use proper logging
   logger.debug('Value:', value)
   ```

### Runtime Errors

**Common Issues:**

1. **IndexedDB transaction failed**
   ```typescript
   // Ensure database is initialized
   await store.initialize()

   // Use proper transaction scope
   const transaction = db.transaction(['store'], 'readwrite')
   await transaction.done // Wait for completion
   ```

2. **Web Worker not loading**
   ```typescript
   // Check worker file path
   const worker = new Worker(
     new URL('./worker.ts', import.meta.url),
     { type: 'module' }
   )

   // Handle errors
   worker.addEventListener('error', (error) => {
     console.error('Worker error:', error)
   })
   ```

3. **Feature not available**
   ```typescript
   // Check hardware requirements
   const result = await validateRequirements(requirements)
   if (!result.valid) {
     // Show requirements to user
     return <RequirementCheck result={result} />
   }
   ```

### Debugging Commands

```bash
# Check TypeScript errors
npm run type-check

# Check for circular dependencies
npx madge --circular src/

# Find all imports of a module
grep -r "from.*module" src/

# Find all usages of a function
grep -r "functionName" src/

# Check git diff
git diff
git diff --stat

# View recent commits
git log --oneline -10
git show <commit-hash>

# Check file history
git log --follow -- file.ts
```

---

## Quality Checklist

### Code Quality

- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] No `any` types (use proper typing or `unknown`)
- [ ] JSDoc comments on all public functions
- [ ] Error handling implemented
- [ ] Edge cases considered
- [ ] Follows existing patterns

### Testing

- [ ] Unit tests written for new functions
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests pass (`npm run test:unit`)
- [ ] No regressions in existing tests

### Documentation

- [ ] Inline comments explain complex logic
- [ ] JSDoc describes parameters and return types
- [ ] Usage examples in tests
- [ ] Implementation doc created (if applicable)
- [ ] WORK_STATUS.md updated

### Performance

- [ ] No unnecessary re-renders
- [ ] Heavy computation in Web Workers
- [ ] IndexedDB operations efficient
- [ ] No memory leaks (cleanup on unmount)
- [ ] Hardware requirements appropriate

### Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader support
- [ ] ARIA labels where needed
- [ ] Color contrast sufficient
- [ ] Focus management correct

---

## Emergency Procedures

### When Build Fails

1. **Check TypeScript errors**
   ```bash
   npm run type-check 2>&1 | tee errors.txt
   ```

2. **Identify the error type**
   - Import error? → Check import paths
   - Type error? → Check type definitions
   - Missing module? → Check if file exists

3. **Fix systematically**
   - Fix errors one file at a time
   - Run type-check after each fix
   - Don't move to next error until current is fixed

4. **Verify fix**
   ```bash
   npm run type-check
   npm run build
   ```

### When Tests Fail

1. **Run specific failing test**
   ```bash
   npm run test:unit -- path/to/test.test.ts
   ```

2. **Read error message carefully**
   - What assertion failed?
   - What was expected vs actual?
   - Is the test correct or the code?

3. **Debug the issue**
   - Check test setup/teardown
   - Check mock data
   - Check async handling

4. **Fix and verify**
   ```bash
   npm run test:unit -- path/to/test.test.ts
   ```

### When You Break Something

1. **Don't panic**
2. **Check git diff**
   ```bash
   git diff
   ```

3. **Revert if needed**
   ```bash
   git checkout -- file.ts
   # OR
   git reset --hard HEAD
   ```

4. **Start over**
   - Re-read requirements
   - Plan implementation more carefully
   - Test incrementally

### When You're Stuck

1. **Take a step back**
   - Re-read the problem
   - Check if you're solving the right problem

2. **Look for similar code**
   ```bash
   grep -r "similar-pattern" src/
   ```

3. **Read documentation**
   ```bash
   cat docs/ARCHITECTURE.md
   cat CLAUDE.md
   ```

4. **Check tests for examples**
   ```bash
   cat src/lib/feature/__tests__/file.test.ts
   ```

5. **Ask for clarification**
   - What specifically is unclear?
   - What have you tried?
   - What error are you seeing?

---

## Quick Reference

### File Locations

| What You Need | Where It Is |
|---------------|-------------|
| Agent definitions | `src/lib/agents/presets.ts` |
| Agent handlers | `src/lib/agents/handlers.ts` |
| Agent registry | `src/lib/agents/registry.ts` |
| JEPA system | `src/lib/jepa/` |
| Spreader system | `src/lib/agents/spread/` |
| Plugin storage | `src/lib/plugin/storage.ts` |
| Plugin API | `src/lib/plugin/api.ts` |
| Marketplace | `src/lib/marketplace/` + `src/app/marketplace/` |
| Hardware detection | `src/lib/hardware/detection.ts` |
| Feature flags | `src/lib/flags/features.ts` |
| Intelligence hub | `src/lib/intelligence/hub.ts` |
| Analytics | `src/lib/analytics/` |
| Backup system | `src/lib/backup/` |
| Tests | `src/**/*.test.ts` + `tests/` |

### Common Commands

```bash
# Development
npm run dev                  # Start dev server (port 3002)
npm run build                # Production build
npm run type-check           # TypeScript validation
npm run lint                 # ESLint check

# Testing
npm run test:unit            # Vitest unit tests
npm run test:integration     # Integration tests
npm run test:e2e             # Playwright E2E tests
npm run test:smoke           # Fast smoke tests
npm run test:all             # Full test suite

# Verification
npm run verify:build         # Verify build
npm run verify:deployment    # Verify deployment readiness

# Cleanup
npm run clean                # Remove artifacts
```

### Key Imports

```typescript
// Agent system
import { AgentRegistry } from '@/lib/agents/registry'
import { validateRequirements } from '@/lib/agents/validator'
import type { AgentDefinition, AgentRequirements } from '@/lib/agents/types'

// JEPA system
import { AudioCapture } from '@/lib/jepa/audio-capture'
import { STTEngine } from '@/lib/jepa/stt-engine'
import { analyzeEmotion } from '@/lib/jepa/emotion-analysis'

// Plugin system
import { PluginStore } from '@/lib/plugin/storage'
import { pluginAPI } from '@/lib/plugin/api'

// Hardware
import { detectHardwareCapabilities } from '@/lib/hardware/detection'
import { calculateJEPAScore } from '@/lib/hardware/scoring'

// Feature flags
import { getFeatureFlags, setFeatureFlag } from '@/lib/flags/features'

// Storage
import { ConversationStore } from '@/lib/storage/conversation-store'
import { KnowledgeStore } from '@/lib/storage/knowledge-store'
```

---

## Summary

You are now ready to contribute to PersonalLog! Remember:

1. **Quality First:** Zero TypeScript errors, zero ESLint warnings
2. **User Privacy:** We never see user data
3. **System-Agnostic:** Features work on all hardware tiers
4. **Follow Patterns:** Existing patterns are there for a reason
5. **Test Everything:** Write tests, run tests, verify tests
6. **Document Well:** JSDoc comments, implementation docs
7. **Ask for Help:** When stuck, ask specific questions

**Good luck and happy coding! 🚀**

---

*Last Updated: 2025-01-07*
*Maintained By: Claude Sonnet 4.5*
*Version: 1.0*
