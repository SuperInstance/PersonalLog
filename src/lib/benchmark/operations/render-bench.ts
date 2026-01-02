/**
 * Rendering Benchmarks
 *
 * Benchmarks for UI rendering performance including frame rate,
 * interaction latency, and DOM manipulation performance.
 */

import { BenchmarkResult, BenchmarkOptions, BenchmarkOperation } from '../types'

// ============================================================================
// FRAME RATE BENCHMARK
// ============================================================================

async function benchmarkFrameRate(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const frameCount = 60 // Measure 60 frames (~1 second at 60fps)

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    await measureFrames(frameCount)
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const fps = await measureFrames(frameCount)
    measurements.push(fps)
  }

  return calculateStatistics('frame-rate', 'render', measurements, 'fps', {
    targetFrames: frameCount,
    iterations,
  })
}

function measureFrames(frameCount: number): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    const startTime = performance.now()

    function measureFrame() {
      frames++
      if (frames < frameCount) {
        requestAnimationFrame(measureFrame)
      } else {
        const endTime = performance.now()
        const duration = (endTime - startTime) / 1000 // Convert to seconds
        const fps = frameCount / duration
        resolve(fps)
      }
    }

    requestAnimationFrame(measureFrame)
  })
}

// ============================================================================
// DOM MANIPULATION BENCHMARK
// ============================================================================

async function benchmarkDOMManipulation(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const elementCount = 100

  // Create a container
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.visibility = 'hidden'
  document.body.appendChild(container)

  try {
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      createAndDestroyElements(container, elementCount)
    }

    // Measure
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      createAndDestroyElements(container, elementCount)
      const duration = performance.now() - start
      measurements.push(duration)
    }
  } finally {
    document.body.removeChild(container)
  }

  return calculateStatistics('dom-manipulation', 'render', measurements, 'ms', {
    elementCount,
    iterations,
  })
}

function createAndDestroyElements(container: HTMLElement, count: number): void {
  // Create elements
  const fragment = document.createDocumentFragment()
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div')
    div.className = 'benchmark-element'
    div.textContent = `Element ${i}`
    div.style.padding = '10px'
    div.style.margin = '5px'
    div.style.border = '1px solid #ccc'
    fragment.appendChild(div)
  }
  container.appendChild(fragment)

  // Force reflow
  container.offsetHeight

  // Remove elements
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
}

// ============================================================================
// LIST RENDERING BENCHMARK
// ============================================================================

async function benchmarkListRendering(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const itemCount = 200

  // Create a container
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.visibility = 'hidden'
  container.style.width = '400px'
  container.style.height = '600px'
  document.body.appendChild(container)

  try {
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      renderList(container, itemCount)
      container.innerHTML = ''
    }

    // Measure
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      renderList(container, itemCount)
      const duration = performance.now() - start
      measurements.push(duration)
      container.innerHTML = ''
    }
  } finally {
    document.body.removeChild(container)
  }

  return calculateStatistics('list-rendering', 'render', measurements, 'ms', {
    itemCount,
    iterations,
  })
}

function renderList(container: HTMLElement, count: number): void {
  const list = document.createElement('div')
  list.style.display = 'flex'
  list.style.flexDirection = 'column'
  list.style.gap = '8px'

  for (let i = 0; i < count; i++) {
    const item = document.createElement('div')
    item.className = 'list-item'
    item.style.padding = '12px'
    item.style.border = '1px solid #e5e7eb'
    item.style.borderRadius = '4px'
    item.style.backgroundColor = '#ffffff'
    item.innerHTML = `
      <div style="font-weight: 600;">Item ${i}</div>
      <div style="font-size: 14px; color: #6b7280;">Description text for item ${i}</div>
      <div style="font-size: 12px; color: #9ca3af;">${new Date().toISOString()}</div>
    `
    list.appendChild(item)
  }

  container.appendChild(list)
}

// ============================================================================
// SCROLL PERFORMANCE BENCHMARK
// ============================================================================

async function benchmarkScrollPerformance(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []

  // Create a scrollable container with content
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.visibility = 'hidden'
  container.style.width = '400px'
  container.style.height = '300px'
  container.style.overflow = 'auto'
  container.style.border = '1px solid #ccc'

  const content = document.createElement('div')
  content.style.height = '2000px'
  content.style.background = 'linear-gradient(to bottom, #fff, #f0f0f0)'
  container.appendChild(content)
  document.body.appendChild(container)

  try {
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await performScroll(container, 5)
    }

    // Measure
    for (let i = 0; i < iterations; i++) {
      const duration = await performScroll(container, 10)
      measurements.push(duration)
    }
  } finally {
    document.body.removeChild(container)
  }

  return calculateStatistics('scroll-performance', 'render', measurements, 'ms', {
    scrollIterations: 10,
    iterations,
  })
}

function performScroll(container: HTMLElement, iterations: number): Promise<number> {
  return new Promise((resolve) => {
    let currentIteration = 0
    const startTime = performance.now()

    function scrollStep() {
      container.scrollTop = Math.random() * (container.scrollHeight - container.clientHeight)

      currentIteration++
      if (currentIteration < iterations) {
        requestAnimationFrame(scrollStep)
      } else {
        const endTime = performance.now()
        resolve(endTime - startTime)
      }
    }

    requestAnimationFrame(scrollStep)
  })
}

// ============================================================================
// REFLOW BENCHMARK
// ============================================================================

async function benchmarkReflow(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const elementCount = 50

  // Create a container
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.visibility = 'hidden'
  document.body.appendChild(container)

  try {
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      forceReflows(container, elementCount)
    }

    // Measure
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      forceReflows(container, elementCount)
      const duration = performance.now() - start
      measurements.push(duration)
    }
  } finally {
    document.body.removeChild(container)
  }

  return calculateStatistics('reflow-performance', 'render', measurements, 'ms', {
    elementCount,
    iterations,
  })
}

function forceReflows(container: HTMLElement, count: number): void {
  const elements: HTMLElement[] = []

  for (let i = 0; i < count; i++) {
    const div = document.createElement('div')
    div.style.width = `${100 + i * 10}px`
    div.style.height = '50px'
    div.style.margin = '5px'
    div.style.backgroundColor = '#ccc'
    container.appendChild(div)
    elements.push(div)

    // Force reflow
    const height = container.offsetHeight
  }

  // Cleanup
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
}

// ============================================================================
// EVENT HANDLING BENCHMARK
// ============================================================================

async function benchmarkEventHandling(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { iterations = 10, warmupIterations = 2 } = options
  const measurements: number[] = []
  const eventCount = 100

  // Create a button
  const button = document.createElement('button')
  button.textContent = 'Click Me'
  button.style.position = 'absolute'
  button.style.visibility = 'hidden'
  document.body.appendChild(button)

  try {
    let handlerCalls = 0

    const handler = () => {
      handlerCalls++
      // Simulate some work
      const result = Math.random() * 100
      return result
    }

    button.addEventListener('click', handler)

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      handlerCalls = 0
      for (let j = 0; j < eventCount; j++) {
        button.click()
      }
    }

    // Measure
    for (let i = 0; i < iterations; i++) {
      handlerCalls = 0
      const start = performance.now()
      for (let j = 0; j < eventCount; j++) {
        button.click()
      }
      const duration = performance.now() - start
      measurements.push(duration)
    }

    button.removeEventListener('click', handler)
  } finally {
    document.body.removeChild(button)
  }

  return calculateStatistics('event-handling', 'render', measurements, 'ms', {
    eventCount,
    iterations,
  })
}

// ============================================================================
// STATISTICAL CALCULATIONS
// ============================================================================

function calculateStatistics(
  name: string,
  category: string,
  measurements: number[],
  unit: 'ms' | 'ops/sec' | 'fps' | 'bytes/sec',
  metadata?: Record<string, unknown>
): BenchmarkResult {
  const sorted = [...measurements].sort((a, b) => a - b)

  const sum = measurements.reduce((a, b) => a + b, 0)
  const mean = sum / measurements.length

  // Calculate variance and standard deviation
  const variance = measurements.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / measurements.length
  const stdDev = Math.sqrt(variance)

  // Calculate percentiles
  const percentiles = {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }

  return {
    id: name,
    name,
    category: category as any,
    measurements,
    mean,
    median: percentiles.p50,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    percentiles,
    unit,
    timestamp: new Date().toISOString(),
    iterations: measurements.length,
    metadata,
  }
}

// ============================================================================
// EXPORT BENCHMARK OPERATIONS
// ============================================================================

export const renderBenchmarks: BenchmarkOperation[] = [
  {
    id: 'frame-rate',
    name: 'Frame Rate',
    description: 'Measures rendering frame rate (FPS)',
    category: 'render',
    run: benchmarkFrameRate,
    estimatedDuration: 1000,
    expensive: false,
  },
  {
    id: 'dom-manipulation',
    name: 'DOM Manipulation',
    description: 'Measures DOM creation and destruction performance',
    category: 'render',
    run: benchmarkDOMManipulation,
    estimatedDuration: 500,
    expensive: false,
  },
  {
    id: 'list-rendering',
    name: 'List Rendering',
    description: 'Measures performance of rendering large lists',
    category: 'render',
    run: benchmarkListRendering,
    estimatedDuration: 800,
    expensive: false,
  },
  {
    id: 'scroll-performance',
    name: 'Scroll Performance',
    description: 'Measures scroll performance and frame consistency',
    category: 'render',
    run: benchmarkScrollPerformance,
    estimatedDuration: 600,
    expensive: false,
  },
  {
    id: 'reflow-performance',
    name: 'Reflow Performance',
    description: 'Measures layout reflow performance',
    category: 'render',
    run: benchmarkReflow,
    estimatedDuration: 400,
    expensive: false,
  },
  {
    id: 'event-handling',
    name: 'Event Handling',
    description: 'Measures event handler performance',
    category: 'render',
    run: benchmarkEventHandling,
    estimatedDuration: 300,
    expensive: false,
  },
]
