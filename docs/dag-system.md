# DAG Task System Documentation

## Overview

The DAG (Directed Acyclic Graph) Task System enables intelligent orchestration of parallel conversations with dependencies. It automatically determines the optimal execution order, maximizes parallelization, and provides visualization of task execution plans.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DAG Task System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ DAG Builder  │→ │  DAG Graph   │→ │ DAG Executor│      │
│  │              │  │  (Validation)│  │             │      │
│  └──────────────┘  └──────────────┘  └─────────────┘      │
│         │                  │                  │             │
│         ↓                  ↓                  ↓             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ Execution    │  │ Topological  │  │  Task       │      │
│  │ Plan         │  │ Sort         │  │  Execution  │      │
│  └──────────────┘  └──────────────┘  └─────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │          DAG Visualizer (React Component)        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Core Concepts

### DAG Node
A task with dependencies, priority, and estimated duration:
```typescript
interface DAGNode {
  id: string;
  task: string;
  dependencies: string[];
  estimatedDuration?: number;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
}
```

### DAG Graph
A collection of nodes and edges:
```typescript
interface DAGGraph {
  nodes: Map<string, DAGNode>;
  edges: DAGEdge[];
}
```

### Execution Plan
Optimized execution schedule:
```typescript
interface DAGExecutionPlan {
  rounds: Array<{
    round: number;
    parallelTasks: string[];
  }>;
  criticalPath: string[];
  estimatedDuration: number;
}
```

## Usage Examples

### 1. Simple Parallel Tasks

```typescript
import { createParallelDAG } from '@/lib/agents/spread'

// All tasks run in parallel (no dependencies)
const tasks = [
  'Research authentication methods',
  'Design database schema',
  'Write API documentation'
]

const result = createParallelDAG(tasks)
console.log(result.executionPlan)
// Output: 1 round with 3 parallel tasks
```

### 2. Sequential Tasks

```typescript
import { createSequentialDAG } from '@/lib/agents/spread'

// Tasks execute one after another
const tasks = [
  'Setup project structure',
  'Install dependencies',
  'Configure build system'
]

const result = createSequentialDAG(tasks)
console.log(result.executionPlan)
// Output: 3 rounds with 1 task each
```

### 3. Complex Dependencies (Using Builder)

```typescript
import { DAGBuilder } from '@/lib/agents/spread'

const builder = new DAGBuilder()

// Add tasks with dependencies
builder.addTasks([
  {
    task: 'Design database schema',
    id: 'design-db'
  },
  {
    task: 'Create database models',
    id: 'create-models',
    dependsOn: ['design-db']
  },
  {
    task: 'Write API endpoints',
    id: 'write-api',
    dependsOn: ['create-models']
  },
  {
    task: 'Design UI components',
    id: 'design-ui'
    // No dependencies - can run in parallel with database work
  },
  {
    task: 'Implement UI',
    id: 'implement-ui',
    dependsOn: ['design-ui', 'write-api']
  }
])

// Build and validate
const result = builder.build()

console.log('Valid:', result.validation.isValid)
console.log('Rounds:', result.executionPlan.rounds.length)
console.log('Critical Path:', result.executionPlan.criticalPath)
```

### 4. Executing DAG

```typescript
import {
  DAGExecutor,
  type TaskExecutor
} from '@/lib/agents/spread'

// Custom task executor
class MyTaskExecutor implements TaskExecutor {
  async execute(task: DAGNode, conversationId: string): Promise<unknown> {
    console.log(`Executing task: ${task.task}`)
    // Your custom execution logic here
    return { success: true }
  }
}

// Create executor
const executor = new DAGExecutor(
  'parent-conversation-id',
  {
    maxRetries: 3,
    maxParallelTasks: 5,
    onProgress: (progress) => {
      console.log(`Progress: ${progress.percentage.toFixed(0)}%`)
    }
  },
  new MyTaskExecutor()
)

// Execute DAG
const result = await executor.execute(dag)

console.log('Success:', result.success)
console.log('Completed:', result.completedTasks.length)
console.log('Failed:', result.failedTasks.length)
console.log('Duration:', result.executionTime)
```

### 5. Using in React Component

```typescript
import { DAGVisualizer } from '@/components/agents/spreader'
import { useState } from 'react'

export function TaskExecutionView() {
  const [executionState, setExecutionState] = useState(new Map())

  return (
    <DAGVisualizer
      dag={dag}
      executionState={executionState}
      onNodeClick={(nodeId) => {
        console.log('Clicked task:', nodeId)
      }}
    />
  )
}
```

### 6. Natural Language Parsing

```typescript
import { createDAGFromText } from '@/lib/agents/spread'

const text = `
# Project Tasks

Setup database
Design API schema (depends on: Setup database) [high priority]
Implement endpoints (depends on: Design API schema)
Write tests (depends on: Implement endpoints)
Create documentation [low priority]
`

const result = createDAGFromText(text)
console.log(result.validation.isValid)
console.log(result.executionPlan)
```

## API Reference

### DAG Builder

```typescript
const builder = new DAGBuilder(options)

// Add tasks
builder.addTask(definition)
builder.addTasks([definitions])

// Manage dependencies
builder.addDependency(fromTaskId, toTaskId, type)
builder.removeDependency(fromTaskId, toTaskId)

// Configure tasks
builder.setPriority(taskId, priority)
builder.setDuration(taskId, duration)
builder.setMetadata(taskId, metadata)

// Build
const result = builder.build()
```

### DAG Executor

```typescript
const executor = new DAGExecutor(
  parentId,
  config,
  taskExecutor?
)

// Execute
const result = await executor.execute(dag)

// Monitor
executor.getExecutionState()
executor.getTaskStatus(taskId)

// Control
executor.abort()
```

### Validation

```typescript
import { validateDAG, detectCycles } from '@/lib/agents/spreader'

const validation = validateDAG(dag)
console.log('Valid:', validation.isValid)
console.log('Errors:', validation.errors)
console.log('Cycles:', validation.cycles)

// Detect cycles
const cycles = detectCycles(dag)
cycles.forEach(cycle => {
  console.log('Cycle:', cycle.join(' → '))
})
```

### Analysis

```typescript
import {
  getExecutableTasks,
  getDependents,
  calculateCriticalPath,
  getDAGStatistics
} from '@/lib/agents/spreader'

// Tasks ready to run
const ready = getExecutableTasks(dag, completedTasks)

// Tasks that depend on this task
const dependents = getDependents(dag, taskId)

// Statistics
const stats = getDAGStatistics(dag)
console.log('Total tasks:', stats.nodeCount)
console.log('Dependencies:', stats.edgeCount)
console.log('Critical path length:', stats.totalDuration)
```

## Visualization Features

### DAG Visualizer Component

```typescript
<DAGVisualizer
  dag={dag}                    // DAG graph to visualize
  executionState={stateMap}     // Current execution state
  compact={false}              // Show compact view
  onNodeClick={handleClick}    // Node click handler
  className="custom-class"     // Additional CSS classes
/>
```

### Visual Features

- **Node colors by status**:
  - Gray: Pending
  - Blue: Running
  - Green: Complete
  - Red: Failed

- **Edge types**:
  - Solid blue: Hard dependency (must wait)
  - Dashed gray: Soft dependency (preferred order)
  - Thick orange: Critical path

- **Interactive elements**:
  - Click nodes for details
  - Hover for highlighting
  - Priority indicators (red dot for high priority)

- **Execution plan display**:
  - Round-by-round breakdown
  - Parallel task grouping
  - Critical path highlighting

## Best Practices

### 1. Task Granularity
- **Too small**: Too much overhead
- **Too large**: Missed parallelization opportunities
- **Good rule**: 5-15 minutes per task

### 2. Dependency Design
- Minimize dependencies to maximize parallelization
- Use soft dependencies for optional ordering
- Validate DAG early in development

### 3. Priority Usage
```typescript
// High priority for critical path tasks
builder.addTask({
  task: 'Core API implementation',
  priority: 'high'
})

// Low priority for nice-to-have features
builder.addTask({
  task: 'Add analytics',
  priority: 'low'
})
```

### 4. Error Handling
```typescript
const executor = new DAGExecutor(parentId, {
  maxRetries: 3,
  onTaskFailed: (taskId, error) => {
    console.error(`Task ${taskId} failed:`, error)
    // Decide whether to continue or abort
  }
})
```

## Examples in Codebase

### Creating a Multi-Agent Development DAG

```typescript
const builder = new DAGBuilder()

// Phase 1: Foundation (parallel)
builder.addTasks([
  { task: 'Setup project structure', id: 'setup' },
  { task: 'Configure CI/CD', id: 'cicd' },
  { task: 'Setup database', id: 'db-setup' }
])

// Phase 2: Core Development (parallel after Phase 1)
builder.addTasks([
  {
    task: 'Implement auth system',
    id: 'auth',
    dependsOn: ['db-setup']
  },
  {
    task: 'Create API endpoints',
    id: 'api',
    dependsOn: ['setup']
  },
  {
    task: 'Build UI components',
    id: 'ui',
    dependsOn: ['setup']
  }
])

// Phase 3: Integration (after Phase 2)
builder.addTask({
  task: 'Integration testing',
  id: 'integration',
  dependsOn: ['auth', 'api', 'ui']
})

// Phase 4: Deployment
builder.addTask({
  task: 'Deploy to production',
  id: 'deploy',
  dependsOn: ['integration', 'cicd']
})

const result = builder.build()
```

## Performance Considerations

1. **Parallel Tasks**: More parallelism = faster execution
2. **Critical Path**: Determines minimum execution time
3. **Resource Limits**: Configure `maxParallelTasks` based on hardware

## Troubleshooting

### Circular Dependency Error
```typescript
const validation = validateDAG(dag)
if (!validation.isValid) {
  console.error('Circular dependencies:')
  validation.cycles.forEach(cycle => {
    console.error('  ', cycle.join(' → '))
  })
}
```

### Execution Stuck
```typescript
// Check executable tasks
const ready = getExecutableTasks(dag, completedTasks)
console.log('Ready to run:', ready)

// Check if dependencies are satisfied
const state = executor.getExecutionState()
state.forEach((s, id) => {
  console.log(`${id}: ${s.status}`)
})
```

## Future Enhancements

- [ ] Dynamic DAG updates (add/remove tasks during execution)
- [ ] Resource-aware scheduling (CPU, memory constraints)
- [ ] Machine learning-based duration estimation
- [ ] Distributed execution across multiple machines
- [ ] Real-time progress streaming
- [ ] DAG optimization suggestions

## See Also

- **Spreader Agent**: `/src/lib/agents/spreader/`
- **Example Usage**: `/docs/examples/dag-examples.ts`
- **Visualization**: `/src/components/agents/spreader/DAGVisualizer.tsx`
