# Round 6 Briefing: Advanced Spreader Features

**Date:** 2025-01-05
**Status:** 🚀 IN PROGRESS
**Focus:** DAG task dependencies, automatic merging, context optimization
**Agent Limit:** 6 (max)
**Mode:** AutoAccept ENABLED

---

## Round Overview

Round 6 transforms the Spreader agent from a simple parallel task manager into a sophisticated DAG (Directed Acyclic Graph) orchestration system with automatic result merging and intelligent context optimization.

### Core Vision

> "Complex tasks should execute in parallel with automatic dependencies, and results should merge seamlessly without user intervention."

---

## Goals

### Primary Goals
1. **DAG Task Dependencies** - Define task execution order ("DB must finish before API")
2. **Automatic Merging** - Child results merge without user action
3. **Context Optimization** - Intelligent message prioritization
4. **Progress Visualization** - Show DAG execution in real-time
5. **Error Recovery** - Handle task failures gracefully

### Success Criteria
- ✅ Tasks can define dependencies (DAG structure)
- ✅ Automatic execution in dependency order
- ✅ Child results merge automatically
- ✅ Context optimized intelligently
- ✅ DAG visualization shows execution
- ✅ Zero TypeScript errors
- ✅ All existing tests pass

---

## Agent Assignments

### Agent 1: DAG Task Dependency System
**Focus:** Implement task dependency resolution and execution
**Estimated Time:** 3-4 hours

**Tasks:**
1. Create `src/lib/agents/spreader/dag.ts` - DAG data structures
2. Create `src/lib/agents/spread/dependency-resolver.ts` - Topological sort
3. Enhance `src/lib/agents/spread/spread-commands.ts` - Add "dependsOn" syntax
4. Update spawn logic to respect dependencies
5. Implement parallel execution of independent tasks
6. Add cycle detection (prevent circular dependencies)

**Success Metrics:**
- Tasks define dependencies: "dependsOn": ["task-1", "task-2"]
- Topological sort produces execution order
- Independent tasks run in parallel
- Dependent tasks wait for prerequisites
- Circular dependencies detected and rejected

---

### Agent 2: Automatic Result Merging
**Focus:** Merge child results without user action
**Estimated Time:** 3-4 hours

**Tasks:**
1. Create `src/lib/agents/spread/auto-merge.ts` - Automatic merging
2. Define merge strategies:
   - Concatenation (lists)
   - Merging (objects/maps)
   - Voting (conflicts)
   - Priority (designated primary)
3. Trigger merge when all children complete
4. Update parent conversation automatically
5. Show merge status to user

**Success Metrics:**
- Results merge automatically when children complete
- Multiple merge strategies supported
- Parent conversation updates seamlessly
- User sees merge progress

---

### Agent 3: Context Optimization Engine
**Focus:** Intelligent message prioritization for context
**Estimated Time:** 3-4 hours

**Tasks:**
1. Create `src/lib/agents/spread/context-optimizer.ts`
2. Implement prioritization algorithms:
   - Recency (recent messages more important)
   - Relevance (keywords, semantic similarity)
   - Hierarchy (user messages > agent messages)
   - Token budget management
3. Add context compaction strategies
4. Dynamic context adjustment based on task needs
5. Metrics and logging

**Success Metrics:**
- Context stays within token limits
- Most important messages retained
- Context adapts to task requirements
- Performance metrics available

---

### Agent 4: DAG Visualization UI
**Focus:** Show DAG execution in real-time
**Estimated Time:** 3-4 hours

**Tasks:**
1. Create `src/components/agents/spreader/DAGVisualization.tsx`
2. Render DAG as node-edge graph
3. Show task states (pending, running, complete, failed)
4. Animate state transitions
5. Interactive (click nodes for details)
6. Progress indicators

**Success Metrics:**
- DAG renders clearly
- Task states visible
- Real-time updates
- Smooth animations
- Interactive exploration

---

### Agent 5: Error Recovery & Retry
**Focus:** Handle task failures gracefully
**Estimated Time:** 2-3 hours

**Tasks:**
1. Create `src/lib/agents/spread/error-handler.ts`
2. Implement retry strategies:
   - Exponential backoff
   - Max retry limits
   - Fallback tasks
3. Error aggregation (collect all child errors)
4. User notification of failures
5. Partial success handling (some tasks succeed)

**Success Metrics:**
- Failed tasks retry automatically
- Errors are aggregated and reported
- User can see what failed
- Partial successes handled
- Graceful degradation

---

### Agent 6: Integration & Polish
**Focus:** Connect all Spreader features
**Estimated Time:** 2-3 hours

**Tasks:**
1. Integrate DAG system into Spreader agent
2. Integrate auto-merge into workflow
3. Integrate context optimization
4. Integrate DAG visualization
5. Integrate error handling
6. Add onboarding for DAG features
7. Polish UI and animations
8. Add keyboard shortcuts
9. Ensure accessibility

**Success Metrics:**
- All features work together
- User can create DAGs easily
- Visualization is beautiful
- Error recovery works
- Zero TypeScript errors

---

## Technical Architecture

### DAG Execution Flow

```
User Command: "Spread this: Design DB (1), API (2) depends on DB, Frontend (3) depends on API"
  ↓
Parse Command:
  Task 1: { name: "DB", command: "Design database schema" }
  Task 2: { name: "API", command: "Design REST API", dependsOn: ["DB"] }
  Task 3: { name: "Frontend", command: "Design frontend UI", dependsOn: ["API"] }
  ↓
Build DAG:
  DB ← API ← Frontend
  ↓
Topological Sort: [DB, API, Frontend]
  ↓
Execute (Parallel where possible):
  - Run DB (independent) → Complete
  - Run API (waiting for DB) → Complete
  - Run Frontend (waiting for API) → Complete
  ↓
Auto-Merge:
  - Combine DB schema + API spec + UI designs
  - Update parent conversation
  ↓
Result: Complete system design
```

### Context Optimization

```
Token Budget: 8000 tokens
  ↓
Analyze Messages:
  - User messages (high priority)
  - Recent agent results (high priority)
  - Old agent results (low priority)
  - System messages (lowest priority)
  ↓
Select Messages:
  - Keep: 50 user messages (5000 tokens)
  - Keep: 10 recent results (2500 tokens)
  - Drop: 20 old results (save to disk)
  ↓
Optimized Context (7500 tokens)
```

---

## File Structure

```
src/
├── lib/
│   └── agents/
│       └── spread/
│           ├── dag.ts                    # NEW: DAG structures
│           ├── dependency-resolver.ts    # NEW: Topological sort
│           ├── auto-merge.ts             # NEW: Automatic merging
│           ├── context-optimizer.ts      # NEW: Context optimization
│           ├── error-handler.ts          # NEW: Error recovery
│           └── spreader-agent.ts         # UPDATE: Integrate all
├── components/
│   └── agents/
│       └── spreader/
│           ├── DAGVisualization.tsx      # NEW: DAG UI
│           └── SpreadDashboard.tsx       # UPDATE: Enhanced
```

---

## Success Metrics

### Quantitative
- ✅ 6 agents deployed
- ✅ 0 TypeScript errors
- ✅ DAG execution works
- ✅ Auto-merge functional
- ✅ Context optimization effective
- ✅ All tests passing

### Qualitative
- ✅ DAG creation is intuitive
- ✅ Visualization is beautiful
- ✅ Auto-merge feels magical
- ✅ Context stays manageable
- ✅ Errors handled gracefully

---

## Timeline

**Estimated Total Time:** 18-22 hours (6 agents × 3 hours average)

**Agent 1:** 3-4 hours (DAG Dependencies)
**Agent 2:** 3-4 hours (Auto-Merge)
**Agent 3:** 3-4 hours (Context Optimization)
**Agent 4:** 3-4 hours (DAG Visualization)
**Agent 5:** 2-3 hours (Error Recovery)
**Agent 6:** 2-3 hours (Integration & Polish)

---

**Briefing Status:** ✅ COMPLETE
**Ready for Agent Deployment:** YES
**AutoAccept Mode:** ENABLED

---

*Round 6 Briefing - Advanced Spreader Features*
*Created: 2025-01-05*
*Orchestrator: Claude Sonnet 4.5*
*Method: BMAD*
