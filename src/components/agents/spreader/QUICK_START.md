# DAG Visualization - Quick Start Guide

## 1. Basic Usage

The simplest way to use the DAG visualization:

```tsx
'use client'

import { DAGVisualization } from '@/components/agents/spreader/DAGVisualization'
import { createDAGNode } from '@/lib/agents/spreader/dag'

export default function MyDAGPage() {
  const nodes = [
    createDAGNode('1', 'Task 1', []),
    createDAGNode('2', 'Task 2', ['1']),
    createDAGNode('3', 'Task 3', ['1']),
    createDAGNode('4', 'Task 4', ['2', '3'])
  ]

  return (
    <div style={{ height: '500px' }}>
      <DAGVisualization nodes={nodes} />
    </div>
  )
}
```

## 2. With Execution Tracking

Track real-time task execution:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { DAGVisualizationDashboard } from '@/components/agents/spreader/DAGVisualization'
import { DAGNode, DAGExecutionState, createDAGNode } from '@/lib/agents/spreader/dag'

export default function MyExecutionPage() {
  const [nodes] = useState<DAGNode[]>([
    createDAGNode('1', 'Design DB', [], { estimatedDuration: 5 }),
    createDAGNode('2', 'Design API', [], { estimatedDuration: 8 }),
    createDAGNode('3', 'Build DB', ['1'], { estimatedDuration: 15 }),
    createDAGNode('4', 'Build API', ['2'], { estimatedDuration: 20 }),
    createDAGNode('5', 'Test', ['3', '4'], { estimatedDuration: 10 })
  ])

  const [executionState, setExecutionState] = useState<Map<string, DAGExecutionState>>(new Map())

  // Initialize state
  useEffect(() => {
    const state = new Map<string, DAGExecutionState>()
    nodes.forEach(node => {
      state.set(node.id, {
        status: 'pending',
        retries: 0
      })
    })
    setExecutionState(state)
  }, [nodes])

  return (
    <div style={{ height: '600px' }}>
      <DAGVisualizationDashboard
        nodes={nodes}
        executionState={executionState}
        onNodeClick={(nodeId) => {
          console.log('Clicked:', nodeId)
          const node = nodes.find(n => n.id === nodeId)
          alert(`Task: ${node?.task}\nStatus: ${executionState.get(nodeId)?.status}`)
        }}
      />
    </div>
  )
}
```

## 3. Demo Component

For quick testing and demonstration:

```tsx
'use client'

import { DAGVisualizationExample } from '@/components/agents/spreader/DAGVisualizationExample'

export default function DemoPage() {
  return <DAGVisualizationExample />
}
```

This provides:
- Sample DAG with 8 tasks
- Start/stop/reset controls
- Simulate failure button
- Progress tracking
- Task list view

## 4. Integration with Spreader

Enhance existing spreader dashboard with DAG view:

```tsx
'use client'

import { SpreadDashboard } from '@/components/agents/spreader/SpreadDashboard'

export default function SpreaderPage() {
  return (
    <SpreadDashboard
      children={childConversations}
      showDAG={true}  // Enable DAG toggle
      dagNodes={dagNodes}
      dagExecutionState={executionState}
      onDAGNodeClick={handleNodeClick}
    />
  )
}
```

## 5. Custom Styling

Apply custom theme:

```tsx
import { DAGVisualization, DAGTheme } from '@/components/agents/spreader/DAGVisualization'

const myTheme: DAGTheme = {
  pending: '#6366f1',
  running: '#8b5cf6',
  complete: '#10b981',
  failed: '#ef4444',
  background: '#0f172a',
  edge: '#334155',
  text: '#f1f5f9'
}

export default function CustomPage() {
  return (
    <DAGVisualization
      nodes={nodes}
      theme={myTheme}
      layout="force-directed"
    />
  )
}
```

## Key Props Reference

### DAGVisualization
- `nodes` - Required array of DAGNode
- `executionState` - Optional Map of execution states
- `layout` - "hierarchical" (default) or "force-directed"
- `onNodeClick` - Callback when node clicked
- `showLabels` - Show task labels (default: true)
- `compact` - Compact mode (default: false)
- `theme` - Custom color theme

### DAGVisualizationDashboard
- `nodes` - Required array of DAGNode
- `executionState` - Optional Map of execution states
- `onNodeClick` - Callback when node clicked

## Common Patterns

### Update Task Status

```tsx
const updateStatus = (nodeId: string, status: 'pending' | 'running' | 'complete' | 'failed') => {
  setExecutionState(prev => {
    const next = new Map(prev)
    const current = next.get(nodeId)

    next.set(nodeId, {
      ...current,
      status,
      startTime: status === 'running' ? Date.now() : current?.startTime,
      endTime: status === 'complete' || status === 'failed' ? Date.now() : current?.endTime
    })

    return next
  })
}
```

### Handle Task Completion

```tsx
const handleComplete = (nodeId: string, result: any) => {
  setExecutionState(prev => {
    const next = new Map(prev)
    next.set(nodeId, {
      status: 'complete',
      endTime: Date.now(),
      result,
      retries: 0
    })
    return next
  })
}
```

### Handle Task Failure

```tsx
const handleFailed = (nodeId: string, error: Error) => {
  setExecutionState(prev => {
    const next = new Map(prev)
    const current = next.get(nodeId)

    next.set(nodeId, {
      status: 'failed',
      endTime: Date.now(),
      error,
      retries: (current?.retries || 0) + 1
    })

    return next
  })
}
```

## Performance Tips

1. **Large DAGs** - Use hierarchical layout for better performance
2. **Real-time updates** - Batch state updates to reduce re-renders
3. **Mobile** - Enable compact mode for smaller screens
4. **Custom themes** - Pre-define themes to avoid recreation

## Troubleshooting

### DAG not rendering
- Check container has explicit height
- Verify nodes array is not empty
- Check for console errors

### Nodes overlapping
- Try "force-directed" layout
- Ensure dependencies are correct
- Check for circular dependencies

### Performance issues
- Reduce number of nodes (virtualization planned)
- Use hierarchical layout
- Disable labels with `showLabels={false}`

## Next Steps

1. Read full documentation: `DAGVisualization.md`
2. Try the demo: `DAGVisualizationExample`
3. Check spreader integration: `SpreadDashboard.tsx`
4. Explore DAG types: `src/lib/agents/spreader/dag.ts`
