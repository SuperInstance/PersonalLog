# PersonalLog - AI Orchestration Hub

> "Building production-ready AI workflow software with systematic autonomous iteration"

---

## Current Status: 🟢 PRODUCTION READY

**Mode:** Feature Development with Multi-Agent Coordination
**TypeScript Errors:** 0 (production code)
**Total Files:** 633 TypeScript/TSX files
**Test Coverage:** 200+ test cases
**Build Status:** ✅ PASSING

---

## Quick Start for AI Agents

### 1. First Actions (Always Do This)
```bash
# Check current status
npm run type-check  # Should be 0 errors
npm run build       # Should pass

# Check recent work
git log --oneline -5
cat .agents/WORK_STATUS.md

# See what's needed
ls -la .agents/roadmaps/
```

### 2. Understanding the Project

**What is PersonalLog?**
- An adaptive personal AI system with real-time emotional intelligence
- Local-first, privacy-focused, system-agnostic architecture
- Multi-modal AI agent ecosystem (JEPA, Spreader, and more)
- Plugin-powered extensibility with marketplace

**Key Philosophy:**
> "Most AI gives people access to the world. We give them access to themselves."

**Tech Stack:**
- Next.js 15 + React 19 + TypeScript (strict mode)
- IndexedDB for persistence
- WebAssembly + Web Workers for performance
- Web Audio API for JEPA
- Hardware detection for adaptive features

### 3. Core Systems

#### **JEPA (Joint Embedded Predictive Architectures)**
- **Location:** `src/lib/jepa/`
- **Purpose:** Real-time emotion analysis from audio
- **Key Files:**
  - `audio-capture.ts` - Web Audio API integration
  - `stt-engine.ts` - Multi-backend transcription (Whisper, Cloudflare, OpenAI)
  - `audio-features.worker.ts` - Background feature extraction (MFCC, spectral, prosodic)
  - `emotion-storage.ts` - VAD emotion persistence
- **Hardware Tiers:** RTX 4050 (Tiny-JEPA) → RTX 4080+ (Multimodal JEPA)
- **Entry Point:** `src/app/jepa/page.tsx`

#### **Agents System**
- **Location:** `src/lib/agents/`
- **Purpose:** Messenger-style AI agent conversations
- **Key Files:**
  - `registry.ts` - Agent registration and availability
  - `validator.ts` - Hardware requirement validation
  - `requirements.ts` - Requirement type definitions
  - `message-pipeline.ts` - Agent message routing
  - `handlers.ts` - Agent handler registration
- **Built-in Agents:** JEPA (emotion analysis), Spreader (conversation spreading)
- **Entry Point:** `src/components/agents/AgentSection.tsx`

#### **Spreader System**
- **Location:** `src/lib/agents/spreader/`
- **Purpose:** Parallel child conversation management
- **Key Files:**
  - `spreader-agent.ts` - Main agent implementation
  - `dag.ts` - DAG orchestration for complex spreads
  - `dag-executor.ts` - DAG execution engine
  - `optimizer.ts` - Token usage optimization
  - `compression-strategies.ts` - Context compression
- **Features:** DAG-based orchestration, auto-merge, token optimization
- **Entry Point:** `src/components/agents/spreader/SpreaderConversation.tsx`

#### **Intelligence Hub**
- **Location:** `src/lib/intelligence/`
- **Purpose:** Unified intelligence system (analytics + experiments + optimization + personalization)
- **Key Files:**
  - `hub.ts` - Central intelligence coordinator
  - `workflows.ts` - Automated workflows (daily optimization, continuous learning)
  - `data-flow.ts` - Cross-system data pipelines
- **Features:** Pattern recognition, auto-tuning, preference learning
- **Entry Point:** `src/app/settings/intelligence/page.tsx`

#### **Plugin System**
- **Location:** `src/lib/plugin/`
- **Purpose:** Extensibility and marketplace
- **Key Files:**
  - `storage.ts` - IndexedDB plugin storage (7 stores, 80 methods)
  - `api.ts` - Complete plugin API (45 functions)
  - `manager.ts` - Plugin lifecycle management
  - `permissions.ts` - Permission system (3-state: granted/denied/prompt)
- **Marketplace:** `src/lib/marketplace/` + `src/app/marketplace/`
- **Features:** Install, uninstall, enable, disable, update, rate, review

#### **Analytics & Experiments**
- **Locations:** `src/lib/analytics/`, `src/lib/experiments/`, `src/lib/optimization/`, `src/lib/personalization/`
- **Purpose:** Self-optimizing AI system
- **Features:**
  - Event tracking and aggregation
  - A/B testing with statistical significance
  - Auto-tuning with 26+ optimization rules
  - Usage pattern detection with 80%+ prediction accuracy

#### **Backup & Recovery**
- **Location:** `src/lib/backup/`
- **Purpose:** Data safety and disaster recovery
- **Key Files:**
  - `recovery.ts` - Backup creation and restoration
  - `rollback.ts` - Snapshot management with GZIP compression
  - `integrity.ts` - Data integrity validation
- **Features:** Compressed snapshots, pre-restore safety backups, integrity scoring

### 4. Hardware Detection System

**CRITICAL:** PersonalLog is **system-agnostic** - features automatically adjust based on hardware.

**Hardware Tiers:**
```
Tier 1 (0-30):   No GPU, basic features only
Tier 2 (31-50):  RTX 4050+, Tiny-JEPA possible
Tier 3 (51-70):  RTX 4060+, JEPA-Large + Whisper
Tier 4 (71-100): RTX 4080+ or DGX, all features + multimodal
```

**Detection Files:**
- `src/lib/hardware/detection.ts` - GPU, RAM, CPU, storage detection
- `src/lib/hardware/scoring.ts` - JEPA score (0-100)
- `src/lib/hardware/capabilities.ts` - Feature detection
- `src/lib/flags/features.ts` - Feature flag management

**ALWAYS check hardware requirements before implementing features.**

### 5. Working Conventions

#### **Code Style**
- **TypeScript Strict Mode:** Zero tolerance for errors
- **No `any` types:** Use proper typing or `unknown`
- **JSDoc Comments:** Required on all public functions
- **File Organization:** Co-locate components with their logic

#### **Testing**
- **Unit Tests:** `npm run test:unit` (vitest)
- **Integration Tests:** `npm run test:integration`
- **E2E Tests:** `npm run test:e2e` (playwright)
- **Smoke Tests:** `npm run test:smoke` (fast validation)

#### **Git Commits**
- **Format:** Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- **Sign-off:** Add co-authorship line for AI contributions
- **Example:**
  ```
  feat: Add plugin marketplace rating system

  - Implement rating submission and storage
  - Add review system with helpful voting
  - Create rating statistics with distribution

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
  ```

#### **Error Handling**
- **Use Custom Errors:** Extend `Error` class
- **Validation:** Validate inputs at system boundaries
- **User Feedback:** Show user-friendly error messages
- **Logging:** Use structured logging (console.error with context)

### 6. Multi-Agent Orchestration (BMAD Method)

When deploying multiple agents:

**B - Backlog Management**
- Organize work into clear, prioritized backlogs
- Break large features into small, deliverable chunks
- Estimate complexity before assigning

**M - Milestones & Metrics**
- Define clear success criteria
- Track progress quantitatively
- Set measurable outcomes

**A - Agents & Assignments**
- Deploy up to 6 specialized agents per round (NOT MORE)
- Give agents focused, achievable scopes (2-4 hours each)
- **ALWAYS use AutoAccept mode** for autonomous decisions
- Monitor but trust agents to implement

**D - Delivery & Documentation**
- Verify all agent work before marking complete
- Create summary documents
- Commit changes before spawning next round
- Reflect on what worked

### 7. Common Tasks

#### **Add a New Agent**
1. Create definition in `src/lib/agents/presets.ts`
2. Implement handler in `src/lib/agents/handlers.ts`
3. Add UI in `src/components/agents/`
4. Register in `src/lib/agents/registry.ts`
5. Add hardware requirements if needed

#### **Add a New Feature Flag**
1. Add to `src/lib/flags/features.ts`
2. Add hardware score requirement if needed
3. Update detection in `src/lib/hardware/detection.ts`
4. Add UI toggle in settings

#### **Add a New Plugin**
1. Create plugin manifest following `src/lib/plugin/types.ts`
2. Implement plugin logic
3. Add to marketplace storage
4. Test installation/activation flow

#### **Debug TypeScript Errors**
1. Run `npm run type-check` to see all errors
2. Fix errors systematically by file
3. Use `grep -r "import.*from.*file"` to find dependencies
4. Check for circular dependencies with `npx madge --circular src/`

#### **Run Tests**
```bash
# Quick validation
npm run type-check && npm run test:unit

# Full test suite
npm run test:all

# Specific test file
npm run test:unit -- path/to/test.test.ts

# Watch mode during development
npm run test:watch
```

### 8. File Locations Reference

| Category | Location |
|----------|----------|
| **Orchestration** | `CLAUDE.md`, `.agents/WORK_STATUS.md` |
| **Roadmaps** | `.agents/roadmaps/` |
| **Round Briefings** | `.agents/round-N/briefing.md` |
| **Agent Types** | `src/lib/agents/types.ts` |
| **Agent Registry** | `src/lib/agents/registry.ts` |
| **JEPA System** | `src/lib/jepa/` |
| **Spreader System** | `src/lib/agents/spreader/` |
| **Intelligence** | `src/lib/intelligence/` |
| **Analytics** | `src/lib/analytics/` |
| **Experiments** | `src/lib/experiments/` |
| **Optimization** | `src/lib/optimization/` |
| **Personalization** | `src/lib/personalization/` |
| **Plugin System** | `src/lib/plugin/` |
| **Marketplace** | `src/lib/marketplace/` |
| **Backup** | `src/lib/backup/` |
| **Hardware Detection** | `src/lib/hardware/` |
| **Feature Flags** | `src/lib/flags/` |
| **Tests** | `src/**/*.test.ts`, `tests/` |

### 9. Architecture Principles

#### **System-Agnostic Design**
PersonalLog must work across the entire hardware spectrum. Features automatically enable/disable based on:

```typescript
// Hardware detection runs on startup
const capabilities = await detectHardwareCapabilities();
const score = calculateJEPAScore(capabilities);

// Features adjust automatically
if (score < 30) {
  // Low-end: API-only mode
  enableFeature('api_mode');
  disableFeature('jepa.transcription');
} else if (score < 60) {
  // Mid-range: Local models + basic JEPA
  enableFeature('ai.local_models');
  enableFeature('jepa.transcription', { model: 'tiny-jepa' });
} else {
  // High-end: Everything enabled
  enableFeature('jepa.multimodal');
}
```

#### **Privacy-First Data Handling**
- **Tier 1:** Local (IndexedDB) - User's computer
- **Tier 2:** User's Cloudflare - User's account, user's data
- **Tier 3:** Our servers - NOTHING! Zero data storage

We never see, touch, or store user conversations.

#### **Plugin Architecture**
- **Storage:** IndexedDB with 7 stores (manifests, states, permissions, files, versions, logs, stats)
- **API:** 45 functions for complete lifecycle management
- **Marketplace:** Browse, install, rate, review plugins
- **Permissions:** 3-state tracking (granted/denied/prompt)

### 10. Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server on port 3002
npm run build            # Production build
npm run type-check       # TypeScript validation
npm run lint             # ESLint check

# Testing
npm run test             # Type check only
npm run test:unit        # Vitest unit tests
npm run test:smoke       # Fast smoke tests
npm run test:all         # Full test suite

# Verification
npm run verify:build     # Verify production build
npm run verify:deployment # Verify deployment readiness

# Cleanup
npm run clean            # Remove build artifacts
```

### 11. Quality Standards

**All code MUST:**
- ✅ Pass TypeScript strict mode (0 errors)
- ✅ Pass ESLint (0 warnings)
- ✅ Pass relevant tests (100%)
- ✅ Be properly documented (JSDoc)
- ✅ Handle edge cases
- ✅ Include error handling
- ✅ Follow existing patterns

**Zero compromise on quality.**

### 12. Getting Help

**For Context on a Feature:**
```bash
# Search for relevant files
grep -r "keyword" src/

# Read the implementation
cat src/lib/feature/file.ts

# Check tests for usage examples
cat src/lib/feature/__tests__/file.test.ts
```

**For Understanding Architecture:**
```bash
# Read architecture docs
cat docs/ARCHITECTURE.md

# Check recent work
git log --oneline -10

# See what agents exist
ls -la src/lib/agents/
```

**For Debugging:**
1. Check TypeScript errors: `npm run type-check`
2. Check for circular deps: `npx madge --circular src/`
3. Read test files for usage examples
4. Check similar implementations in the codebase

---

## Status: 🟢 PRODUCTION READY

**TypeScript Errors:** 0 (production code)
**Build Status:** ✅ PASSING
**Last Updated:** 2025-01-07
**Orchestrator:** Claude Sonnet 4.5

---

*"We build production software systematically, one feature at a time."*
