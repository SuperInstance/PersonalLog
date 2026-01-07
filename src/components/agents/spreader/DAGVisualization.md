# DAG Visualization Component

Beautiful, real-time DAG (Directed Acyclic Graph) visualization with interactive features for tracking task execution progress.

## Features

### Core Visualization
- **Canvas-based rendering** for high-performance 60fps animations
- **Hierarchical layout** (topological sorting) for clear dependency visualization
- **Force-directed layout** alternative for organic graph arrangement
- **Interactive nodes** with click, hover, and drag support
- **Real-time updates** with smooth state transitions

### Visual Design
- **Color-coded task states:**
  - Gray (pending) - Not started
  - Blue with pulse (running) - Active execution
  - Green (complete) - Successfully finished
  - Red (failed) - Error occurred
- **Pulsing animations** for running tasks
- **Arrow edges** showing dependencies
- **Hover effects** with shadows
- **Dark mode support**

### Interactivity
- **Pan & Zoom** - Drag to pan, scroll to zoom
- **Click nodes** - View task details
- **Reset view** - Return to default viewport
- **Fit to content** - Auto-scale to show all nodes
- **Responsive** - Works on mobile and desktop

## Components

### DAGVisualization

Main visualization component with full interactivity.

```tsx
import { DAGVisualization } from '@/components/agents/spreader/DAGVisualization'
import { DAGNode, DAGExecutionState } from '@/lib/agents/spreader/dag'

function MyComponent() {
  const nodes: DAGNode[] = [...]
  const executionState = new Map<string, DAGExecutionState>()

  return (
    <DAGVisualization
      nodes={nodes}
      executionState={executionState}
      layout="hierarchical"
      onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
      showLabels={true}
      compact={false}
    />
  )
}
```

**Props:**
- `nodes: DAGNode[]` - Nodes to visualize
- `executionState?: Map<string, DAGExecutionState>` - Current execution state
- `layout?: 'hierarchical' | 'force-directed'` - Layout algorithm (default: hierarchical)
- `onNodeClick?: (nodeId: string) => void` - Click callback
- `showLabels?: boolean` - Show task labels (default: true)
- `compact?: boolean` - Compact mode (default: false)
- `theme?: DAGTheme` - Custom color theme

### DAGVisualizationDashboard

Full-featured dashboard with visualization and details panel.

```tsx
import { DAGVisualizationDashboard } from '@/components/agents/spreader/DAGVisualization'

function MyDashboard() {
  return (
    <DAGVisualizationDashboard
      nodes={nodes}
      executionState={executionState}
      onNodeClick={(nodeId) => {
        // Handle node click
      }}
    />
  )
}
```

**Features:**
- Visualization canvas
- Status legend
- Zoom indicator
- Task details panel
- Progress statistics
- View controls (reset, fit)

### DAGVisualizationExample

Demo component with simulated execution for testing and showcasing features.

```tsx
import { DAGVisualizationExample } from '@/components/agents/spreader/DAGVisualizationExample'

function MyPage() {
  return <DAGVisualizationExample />
}
```

**Features:**
- Sample DAG with 8 tasks
- Start/stop execution simulation
- Simulate task failures
- Reset functionality
- Progress tracking
- Task list with status

## Integration with SpreadDashboard

Enhanced `SpreadDashboard` component with DAG view toggle:

```tsx
import { SpreadDashboard } from '@/components/agents/spreader/SpreadDashboard'

function MySpreaderUI() {
  return (
    <SpreadDashboard
      children={childConversations}
      showDAG={true}
      dagNodes={dagNodes}
      dagExecutionState={executionState}
      onDAGNodeClick={handleNodeClick}
    />
  )
}
```

**New Props:**
- `showDAG?: boolean` - Enable DAG view toggle
- `dagNodes?: DAGNode[]` - DAG nodes to visualize
- `dagExecutionState?: Map<string, DAGExecutionState>` - Execution state
- `onDAGNodeClick?: (nodeId: string) => void` - Node click handler

## Usage Examples

### Basic Usage

```tsx
'use client'

import { useState } from 'react'
import { DAGVisualization } from '@/components/agents/spreader/DAGVisualization'
import { DAGNode, createDAGNode } from '@/lib/agents/spreader/dag'

export default function MyDAGView() {
  const [nodes] = useState<DAGNode[]>([
    createDAGNode('task1', 'First task', []),
    createDAGNode('task2', 'Second task', ['task1']),
    createDAGNode('task3', 'Third task', ['task1']),
    createDAGNode('task4', 'Final task', ['task2', 'task3'])
  ])

  return (
    <div style={{ height: '500px' }}>
      <DAGVisualization nodes={nodes} />
    </div>
  )
}
```

### With Execution Tracking

```tsx
'use client'

import { useState, useEffect } from 'react'
import { DAGVisualizationDashboard } from '@/components/agents/spreader/DAGVisualization'
import { DAGNode, DAGExecutionState, createDAGNode } from '@/lib/agents/spreader/dag'

export default function MyExecutionView() {
  const [nodes] = useState<DAGNode[]>([...])
  const [executionState, setExecutionState] = useState<Map<string, DAGExecutionState>>(new Map())

  useEffect(() => {
    // Track execution progress
    const state = new Map<string, DAGExecutionState>()
    nodes.forEach(node => {
      state.set(node.id, {
        status: 'pending',
        retries: 0
      })
    })
    setExecutionState(state)
  }, [nodes])

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    console.log('Task details:', node)
    console.log('Execution state:', executionState.get(nodeId))
  }

  return (
    <div style={{ height: '600px' }}>
      <DAGVisualizationDashboard
        nodes={nodes}
        executionState={executionState}
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
```

### Custom Theme

```tsx
import { DAGVisualization, DAGTheme } from '@/components/agents/spreader/DAGVisualization'

const customTheme: DAGTheme = {
  pending: '#6366f1', // indigo
  running: '#8b5cf6', // violet
  complete: '#10b981', // emerald
  failed: '#ef4444', // red
  background: '#0f172a', // slate-900
  edge: '#334155', // slate-700
  text: '#f1f5f9' // slate-100
}

export default function MyCustomView() {
  return (
    <DAGVisualization
      nodes={nodes}
      theme={customTheme}
    />
  )
}
```

## Layout Algorithms

### Hierarchical (Default)

Topological sorting with layers:
- Nodes arranged in dependency levels
- Clear left-to-right flow
- Easy to understand execution order
- Best for most use cases

```tsx
<DAGVisualization nodes={nodes} layout="hierarchical" />
```

### Force-Directed

Physics-based layout:
- Organic arrangement
- Minimizes edge crossings
- Good for large, complex graphs
- May require more iterations for stability

```tsx
<DAGVisualization nodes={nodes} layout="force-directed" />
```

## Performance

The visualization is optimized for large DAGs:

- **Canvas rendering** - Handles 50+ nodes smoothly
- **RequestAnimationFrame** - 60fps animations
- **Efficient updates** - Only re-renders when state changes
- **Memoization** - Layout calculations cached
- **Lazy rendering** - Nodes only drawn when in viewport

## Accessibility

- Keyboard navigation support (planned)
- Screen reader labels (planned)
- High contrast mode support
- Color-blind friendly palettes (can customize)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Export visualization as image/SVG
- [ ] Filter nodes by status
- [ ] Search functionality
- [ ] Undo/redo support
- [ ] Node grouping/collapsing
- [ ] Custom node rendering
- [ ] Edge labels
- [ ] Minimap overview
- [ ] Timeline view
- [ ] Critical path highlighting

## License

MIT
