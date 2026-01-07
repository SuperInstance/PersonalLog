/**
 * DAG Visualization Component
 *
 * Beautiful, real-time visualization of DAG execution with interactive features.
 * Renders nodes and edges with smooth animations and task state tracking.
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { DAGNode, DAGNodeStatus, DAGExecutionState } from '@/lib/agents/spreader/dag'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface DAGVisualizationProps {
  /** Nodes to visualize */
  nodes: DAGNode[]
  /** Current execution state for each node */
  executionState?: Map<string, DAGExecutionState>
  /** Layout algorithm to use */
  layout?: 'hierarchical' | 'force-directed'
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void
  /** Show labels on nodes */
  showLabels?: boolean
  /** Compact mode for smaller displays */
  compact?: boolean
  /** Custom theme colors */
  theme?: DAGTheme
}

export interface DAGTheme {
  pending: string
  running: string
  complete: string
  failed: string
  background: string
  edge: string
  text: string
}

export interface ViewportState {
  scale: number
  offsetX: number
  offsetY: number
}

// ============================================================================
// DEFAULT THEME
// ============================================================================

const defaultTheme: DAGTheme = {
  pending: '#9ca3af', // gray-400
  running: '#3b82f6', // blue-500
  complete: '#22c55e', // green-500
  failed: '#ef4444', // red-500
  background: '#ffffff',
  edge: '#d1d5db', // gray-300
  text: '#374151' // gray-700
}

const darkTheme: DAGTheme = {
  pending: '#6b7280', // gray-500
  running: '#60a5fa', // blue-400
  complete: '#4ade80', // green-400
  failed: '#f87171', // red-400
  background: '#1f2937', // gray-800
  edge: '#4b5563', // gray-600
  text: '#f3f4f6' // gray-100
}

// ============================================================================
// LAYOUT CALCULATIONS
// ============================================================================

interface PositionedNode {
  id: string
  x: number
  y: number
  node: DAGNode
  status: DAGNodeStatus
}

function calculateHierarchicalLayout(
  nodes: DAGNode[],
  executionState?: Map<string, DAGExecutionState>
): PositionedNode[] {
  const positioned: PositionedNode[] = []
  const levels = new Map<string, number>()
  const NODE_WIDTH = 200
  const NODE_HEIGHT = 80
  const LAYER_SPACING = 120
  const NODE_SPACING = 40

  // Calculate levels using topological sort
  function getLevel(nodeId: string, visited = new Set<string>()): number {
    if (visited.has(nodeId)) {
      return 0
    }
    visited.add(nodeId)

    const node = nodes.find(n => n.id === nodeId)
    if (!node || node.dependencies.length === 0) {
      return 0
    }

    const depLevels = node.dependencies.map(depId => getLevel(depId, visited))
    return Math.max(...depLevels) + 1
  }

  // Assign levels to all nodes
  for (const node of nodes) {
    levels.set(node.id, getLevel(node.id))
  }

  // Group nodes by level
  const levelGroups = new Map<number, DAGNode[]>()
  for (const node of nodes) {
    const level = levels.get(node.id) || 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(node)
  }

  // Position nodes within each level
  const maxLevel = Math.max(...levels.values())
  for (let level = 0; level <= maxLevel; level++) {
    const levelNodes = levelGroups.get(level) || []
    const totalWidth = levelNodes.length * NODE_WIDTH + (levelNodes.length - 1) * NODE_SPACING
    const startX = -totalWidth / 2

    levelNodes.forEach((node, index) => {
      positioned.push({
        id: node.id,
        x: startX + index * (NODE_WIDTH + NODE_SPACING) + NODE_WIDTH / 2,
        y: level * LAYER_SPACING,
        node,
        status: executionState?.get(node.id)?.status || 'pending'
      })
    })
  }

  return positioned
}

function calculateForceDirectedLayout(
  nodes: DAGNode[],
  executionState?: Map<string, DAGExecutionState>,
  iterations = 50
): PositionedNode[] {
  const positioned: PositionedNode[] = []
  const NODE_SIZE = 50
  const IDEAL_EDGE_LENGTH = 150
  const REPULSION = 10000
  const ATTRACTION = 0.01

  // Initialize with random positions
  const positions = new Map<string, { x: number; y: number }>()
  const velocities = new Map<string, { vx: number; vy: number }>()

  for (const node of nodes) {
    positions.set(node.id, {
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400
    })
    velocities.set(node.id, { vx: 0, vy: 0 })
  }

  // Force-directed layout algorithm
  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    const forces = new Map<string, { fx: number; fy: number }>()
    for (const node of nodes) {
      forces.set(node.id, { fx: 0, fy: 0 })
    }

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i]
        const n2 = nodes[j]
        const p1 = positions.get(n1.id)!
        const p2 = positions.get(n2.id)!

        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = REPULSION / (dist * dist)

        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        forces.get(n1.id)!.fx += fx
        forces.get(n1.id)!.fy += fy
        forces.get(n2.id)!.fx -= fx
        forces.get(n2.id)!.fy -= fy
      }
    }

    // Attraction along edges
    for (const node of nodes) {
      for (const depId of node.dependencies) {
        const p1 = positions.get(node.id)!
        const p2 = positions.get(depId)!

        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        const force = (dist - IDEAL_EDGE_LENGTH) * ATTRACTION
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        forces.get(node.id)!.fx += fx
        forces.get(node.id)!.fy += fy
        forces.get(depId)!.fx -= fx
        forces.get(depId)!.fy -= fy
      }
    }

    // Update positions
    for (const node of nodes) {
      const force = forces.get(node.id)!
      const vel = velocities.get(node.id)!
      const pos = positions.get(node.id)!

      vel.vx = (vel.vx + force.fx) * 0.9
      vel.vy = (vel.vy + force.fy) * 0.9

      pos.x += vel.vx
      pos.y += vel.vy
    }
  }

  // Convert to positioned nodes
  for (const node of nodes) {
    const pos = positions.get(node.id)!
    positioned.push({
      id: node.id,
      x: pos.x,
      y: pos.y,
      node,
      status: executionState?.get(node.id)?.status || 'pending'
    })
  }

  return positioned
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DAGVisualization({
  nodes,
  executionState,
  layout = 'hierarchical',
  onNodeClick,
  showLabels = true,
  compact = false,
  theme: customTheme
}: DAGVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const pulsePhaseRef = useRef(0)

  // Detect dark mode
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const theme = customTheme || (isDark ? darkTheme : defaultTheme)

  // Calculate node positions
  const positionedNodes = React.useMemo(() => {
    const layoutFn =
      layout === 'hierarchical' ? calculateHierarchicalLayout : calculateForceDirectedLayout
    return layoutFn(nodes, executionState)
  }, [nodes, executionState, layout])

  // Get node status
  const getNodeStatus = useCallback((nodeId: string): DAGNodeStatus => {
    return executionState?.get(nodeId)?.status || 'pending'
  }, [executionState])

  // Get status color
  const getStatusColor = useCallback((status: DAGNodeStatus): string => {
    switch (status) {
      case 'pending':
        return theme.pending
      case 'running':
        return theme.running
      case 'complete':
        return theme.complete
      case 'failed':
        return theme.failed
      default:
        return theme.pending
    }
  }, [theme])

  // Canvas rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply viewport transform
    ctx.save()
    ctx.translate(canvas.width / 2 + viewport.offsetX, canvas.height / 2 + viewport.offsetY)
    ctx.scale(viewport.scale, viewport.scale)

    // Draw edges first (so they appear behind nodes)
    for (const node of nodes) {
      for (const depId of node.dependencies) {
        const fromNode = positionedNodes.find(n => n.id === depId)
        const toNode = positionedNodes.find(n => n.id === node.id)

        if (fromNode && toNode) {
          drawEdge(ctx, fromNode, toNode, theme.edge)
        }
      }
    }

    // Draw nodes
    for (const pNode of positionedNodes) {
      const isHovered = hoveredNode === pNode.id
      const status = getNodeStatus(pNode.id)
      const color = getStatusColor(status)
      const isRunning = status === 'running'

      drawNode(
        ctx,
        pNode,
        color,
        showLabels ? pNode.node.task : '',
        isHovered,
        isRunning ? pulsePhaseRef.current : 0,
        compact
      )
    }

    ctx.restore()
  }, [viewport, positionedNodes, nodes, theme, hoveredNode, getNodeStatus, getStatusColor, showLabels, compact])

  // Draw edge
  const drawEdge = (
    ctx: CanvasRenderingContext2D,
    from: PositionedNode,
    to: PositionedNode,
    color: string
  ) => {
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const arrowSize = 10
    ctx.beginPath()
    ctx.moveTo(to.x - 30 * Math.cos(angle), to.y - 30 * Math.sin(angle))
    ctx.lineTo(
      to.x - 30 * Math.cos(angle) - arrowSize * Math.cos(angle - Math.PI / 6),
      to.y - 30 * Math.sin(angle) - arrowSize * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      to.x - 30 * Math.cos(angle) - arrowSize * Math.cos(angle + Math.PI / 6),
      to.y - 30 * Math.sin(angle) - arrowSize * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }

  // Draw node
  const drawNode = (
    ctx: CanvasRenderingContext2D,
    node: PositionedNode,
    color: string,
    label: string,
    isHovered: boolean,
    pulsePhase: number,
    compact: boolean
  ) => {
    const nodeSize = compact ? 30 : 40
    const isRunning = getNodeStatus(node.id) === 'running'

    // Draw pulse effect for running nodes
    if (isRunning && pulsePhase > 0) {
      const pulseRadius = nodeSize + Math.sin(pulsePhase) * 10
      const gradient = ctx.createRadialGradient(node.x, node.y, nodeSize, node.x, node.y, pulseRadius)
      gradient.addColorStop(0, color + '40')
      gradient.addColorStop(1, color + '00')

      ctx.beginPath()
      ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Draw node shadow if hovered
    if (isHovered) {
      ctx.shadowColor = color
      ctx.shadowBlur = 20
    }

    // Draw node background
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    ctx.shadowBlur = 0

    // Draw node border
    ctx.strokeStyle = isHovered ? '#fff' : color + '80'
    ctx.lineWidth = isHovered ? 3 : 2
    ctx.stroke()

    // Draw status icon
    ctx.fillStyle = '#fff'
    ctx.font = `${compact ? 16 : 20}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const icon = getStatusIcon(getNodeStatus(node.id))
    ctx.fillText(icon, node.x, node.y)

    // Draw label
    if (label && !compact) {
      ctx.fillStyle = theme.text
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      // Word wrap
      const maxWidth = 120
      const words = label.split(' ')
      const lines: string[] = []
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word
        const metrics = ctx.measureText(testLine)

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      lines.push(currentLine)

      // Draw lines
      const lineHeight = 14
      const labelY = node.y + nodeSize + 8
      lines.forEach((line, index) => {
        ctx.fillText(line, node.x, labelY + index * lineHeight)
      })
    }
  }

  // Get status icon
  const getStatusIcon = (status: DAGNodeStatus): string => {
    switch (status) {
      case 'pending':
        return '○'
      case 'running':
        return '●'
      case 'complete':
        return '✓'
      case 'failed':
        return '✕'
      default:
        return '?'
    }
  }

  // Animation loop
  useEffect(() => {
    const animate = () => {
      pulsePhaseRef.current += 0.1
      render()
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [render])

  // Handle canvas interactions
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Convert to canvas coordinates
    const canvasX = (x - canvas.width / 2 - viewport.offsetX) / viewport.scale
    const canvasY = (y - canvas.height / 2 - viewport.offsetY) / viewport.scale

    // Check if clicked on a node
    for (const pNode of positionedNodes) {
      const dx = canvasX - pNode.x
      const dy = canvasY - pNode.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 40) {
        onNodeClick?.(pNode.id)
        return
      }
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Handle dragging
    if (isDragging) {
      const dx = x - dragStart.x
      const dy = y - dragStart.y

      setViewport(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy
      }))

      setDragStart({ x, y })
      return
    }

    // Check if hovering over a node
    const canvasX = (x - canvas.width / 2 - viewport.offsetX) / viewport.scale
    const canvasY = (y - canvas.height / 2 - viewport.offsetY) / viewport.scale

    let hovered: string | null = null
    for (const pNode of positionedNodes) {
      const dx = canvasX - pNode.x
      const dy = canvasY - pNode.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 40) {
        hovered = pNode.id
        break
      }
    }

    setHoveredNode(hovered)
    canvas.style.cursor = hovered ? 'pointer' : 'grab'
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    setDragStart({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    })
    setIsDragging(true)
    canvas.style.cursor = 'grabbing'
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hoveredNode ? 'pointer' : 'grab'
    }
  }

  const handleCanvasMouseLeave = () => {
    setIsDragging(false)
    setHoveredNode(null)
  }

  // Handle wheel zoom
  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    setViewport(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale * zoomFactor))
    }))
  }

  // Reset viewport
  const resetViewport = () => {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 })
  }

  // Fit to content
  const fitToContent = () => {
    if (positionedNodes.length === 0) return

    const xs = positionedNodes.map(n => n.x)
    const ys = positionedNodes.map(n => n.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const contentWidth = maxX - minX + 200
    const contentHeight = maxY - minY + 200

    const canvas = canvasRef.current
    if (!canvas) return

    const scaleX = canvas.width / contentWidth
    const scaleY = canvas.height / contentHeight
    const scale = Math.min(scaleX, scaleY, 1)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setViewport({
      scale,
      offsetX: -centerX * scale,
      offsetY: -centerY * scale
    })
  }

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  return (
    <div className="dag-visualization relative w-full h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onWheel={handleWheel}
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={resetViewport}
          className="p-2 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          title="Reset view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={fitToContent}
          className="p-2 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          title="Fit to content"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-700 rounded-lg shadow p-3">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Task Status</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.pending }} />
            <span className="text-gray-600 dark:text-gray-400">Pending</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: theme.running }} />
            <span className="text-gray-600 dark:text-gray-400">Running</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.complete }} />
            <span className="text-gray-600 dark:text-gray-400">Complete</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.failed }} />
            <span className="text-gray-600 dark:text-gray-400">Failed</span>
          </div>
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-700 rounded-lg shadow px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
        {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  )
}

// ============================================================================
// DASHBOARD INTEGRATION
// ============================================================================

export interface DAGVisualizationDashboardProps {
  nodes: DAGNode[]
  executionState?: Map<string, DAGExecutionState>
  onNodeClick?: (nodeId: string) => void
}

export function DAGVisualizationDashboard({
  nodes,
  executionState,
  onNodeClick
}: DAGVisualizationDashboardProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId)
    onNodeClick?.(nodeId)
  }

  const selectedNodeData = nodes.find(n => n.id === selectedNode)
  const selectedState = executionState?.get(selectedNode || '')

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = nodes.length
    const pending = Array.from(executionState?.values() || []).filter(s => s.status === 'pending').length
    const running = Array.from(executionState?.values() || []).filter(s => s.status === 'running').length
    const complete = Array.from(executionState?.values() || []).filter(s => s.status === 'complete').length
    const failed = Array.from(executionState?.values() || []).filter(s => s.status === 'failed').length

    return { total, pending, running, complete, failed }
  }, [nodes, executionState])

  return (
    <div className="dag-visualization-dashboard flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            DAG Execution
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {stats.pending}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              {stats.running}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {stats.complete}
            </span>
            {stats.failed > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {stats.failed}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* DAG visualization */}
        <div className="flex-1 min-w-0">
          <DAGVisualization
            nodes={nodes}
            executionState={executionState}
            onNodeClick={handleNodeClick}
          />
        </div>

        {/* Node details panel */}
        {selectedNodeData && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Task Details
                </h5>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">ID:</span>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedNodeData.id}</p>
                </div>

                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Task:</span>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedNodeData.task}</p>
                </div>

                {selectedState && (
                  <>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Status:</span>
                      <p className="text-gray-900 dark:text-gray-100 mt-1 capitalize">{selectedState.status}</p>
                    </div>

                    {selectedState.startTime && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Started:</span>
                        <p className="text-gray-900 dark:text-gray-100 mt-1">
                          {new Date(selectedState.startTime).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {selectedState.endTime && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Completed:</span>
                        <p className="text-gray-900 dark:text-gray-100 mt-1">
                          {new Date(selectedState.endTime).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {selectedState.error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                        <span className="font-medium text-red-700 dark:text-red-400">Error:</span>
                        <p className="text-red-700 dark:text-red-400 mt-1 text-xs">{selectedState.error.message}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedNodeData.dependencies.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Dependencies:</span>
                    <ul className="mt-1 space-y-1">
                      {selectedNodeData.dependencies.map(depId => (
                        <li
                          key={depId}
                          className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400"
                          onClick={() => handleNodeClick(depId)}
                        >
                          {depId}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedNodeData.estimatedDuration && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Est. Duration:</span>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {selectedNodeData.estimatedDuration}s
                    </p>
                  </div>
                )}

                {selectedNodeData.priority && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Priority:</span>
                    <p className="text-gray-900 dark:text-gray-100 mt-1 capitalize">
                      {selectedNodeData.priority}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
