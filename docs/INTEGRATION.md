# Integration Architecture

This document describes how all systems in PersonalLog integrate together, including the initialization flow, provider architecture, and context API usage.

## Table of Contents

- [Overview](#overview)
- [Integration Manager](#integration-manager)
- [Initialization Flow](#initialization-flow)
- [Provider Architecture](#provider-architecture)
- [System Dependencies](#system-dependencies)
- [Event System](#event-system)
- [Error Handling](#error-handling)
- [Testing](#testing)

## Overview

PersonalLog uses a layered architecture with the **Integration Manager** at its core. The Integration Manager orchestrates all subsystems and provides a unified API for the application.

```
┌─────────────────────────────────────────────────────────────┐
│                        Application Layer                      │
│                  (Pages, Components, UI)                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    Context Providers Layer                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Analytics │ │Experiment│ │Optimiz-  │ │Personal- │       │
│  │          │ │          │ │ation     │ │ization   │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
┌───────┴────────────┴────────────┴────────────┴──────────────┐
│                   Integration Manager                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Hardware │ │  Native  │ │   Flags  │ │Benchmark │       │
│  │ Detection│ │   WASM   │ │ Manager  │ │  Suite   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    Storage Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │  Local   │ │ Indexed  │ │  Cache   │                    │
│  │ Storage  │ │   DB     │ │ Manager  │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Integration Manager

The Integration Manager (`src/lib/integration/manager.ts`) is the central orchestrator for all hardware-aware systems.

### Responsibilities

- **System Initialization**: Initialize all subsystems in the correct order
- **Capability Detection**: Detect and expose hardware and software capabilities
- **Feature Flag Management**: Determine which features should be enabled
- **State Management**: Maintain the state of all integrated systems
- **Event Emission**: Emit events for system state changes
- **Diagnostics**: Run health checks on all systems

### Basic Usage

```typescript
import { getIntegrationManager } from '@/lib/integration'

// Get the singleton instance
const manager = getIntegrationManager()

// Initialize all systems
await manager.initialize()

// Check if a feature is enabled
if (manager.isFeatureEnabled('ai-chat')) {
  // Enable AI chat feature
}

// Get current capabilities
const capabilities = manager.getCapabilities()
console.log('Performance Class:', capabilities.performanceClass)

// Run diagnostics
const diagnostics = await manager.runDiagnostics()
console.log('Health:', diagnostics.health)
```

### Configuration

```typescript
const manager = getIntegrationManager({
  autoInitialize: false,      // Don't auto-initialize
  runBenchmarks: false,       // Skip expensive benchmarks
  debug: true,                // Enable debug logging
  trackMetrics: true,         // Track performance metrics
  initializationTimeout: 30000, // 30 second timeout

  featureFlags: {
    autoPerformanceGate: true,    // Auto-disable features on low-end devices
    performanceThreshold: 1000,   // Performance score threshold
  },

  hardwareDetection: {
    detailedGPU: true,        // Get detailed GPU info
    checkQuota: false,        // Check storage quota
    detectWebGL: true,        // Detect WebGL support
  },
})
```

## Initialization Flow

The Integration Manager initializes systems in a specific order to handle dependencies correctly:

### Initialization Order

```
1. Hardware Detection
   ↓
2. Native Bridge (WASM)
   ↓
3. Feature Flags
   ↓
4. Benchmarks (optional)
   ↓
5. All Systems Ready
```

### Detailed Flow

```typescript
// 1. Hardware Detection
// - Detects CPU, GPU, Memory
// - Calculates performance score
// - Determines performance class

const hardware = await getHardwareInfo({
  detailedGPU: true,
  checkQuota: false,
  detectWebGL: true,
})

// 2. Native Bridge
// - Loads WASM modules if available
// - Falls back to JavaScript if not
// - Detects SIMD support

await loadWasmModule()
const features = getWasmFeatures()

// 3. Feature Flags
// - Initializes feature flag manager
// - Evaluates all flags based on hardware
// - Auto-disables expensive features on low-end devices

const flagManager = await initializeFeatureFlags({
  autoPerformanceGate: true,
  performanceThreshold: 1000,
})

// 4. Benchmarks (optional)
// - Runs performance benchmarks
// - Validates hardware detection
// - Generates recommendations

if (runBenchmarks) {
  const suite = getBenchmarkSuite()
  const results = await suite.runAll()
}

// 5. Build Capabilities
// - Aggregates all system capabilities
// - Exposes feature flag results
// - Provides hardware capabilities

const capabilities = {
  usingWasm: true,
  systemScore: 85,
  performanceClass: 'high',
  hardware: hardwareProfile,
  featureFlags: {
    enabled: ['messenger', 'knowledge', 'ai-chat'],
    disabled: ['ar-mode'],
    results: featureFlagResults,
  },
}
```

### Event Timeline

```typescript
// Application starts
manager.on('initialization_started', (event) => {
  console.log('Initialization started at:', event.timestamp)
})

// Each system initializes
manager.on('system_status_changed', (event) => {
  console.log(`${event.data.system} is now ${event.data.status.stage}`)
})

// Progress updates
manager.on('initialization_progress', (event) => {
  console.log(`Progress: ${event.data.progress.percentage}%`)
})

// Completion
manager.on('initialization_complete', (event) => {
  console.log('Initialized in:', event.data.duration, 'ms')
})
```

## Provider Architecture

PersonalLog uses React Context to provide state and functionality throughout the application.

### Available Providers

| Provider | Purpose | Location |
|----------|---------|----------|
| `IntegrationProvider` | Core integration state | `src/components/providers/` |
| `AnalyticsProvider` | Event tracking and analytics | `src/lib/analytics/` |
| `ExperimentsProvider` | A/B testing and experiments | `src/lib/experiments/` |
| `OptimizationProvider` | Performance optimization | `src/lib/optimization/` |
| `PersonalizationProvider` | User preference learning | `src/lib/personalization/` |

### Integration Provider

The IntegrationProvider wraps the application and provides access to the Integration Manager.

```typescript
'use client'

import { getIntegrationManager } from '@/lib/integration'
import { useEffect, useState } from 'react'

export function IntegrationProvider({ children }) {
  const [state, setState] = useState(null)
  const [capabilities, setCapabilities] = useState(null)

  useEffect(() => {
    const manager = getIntegrationManager()

    // Get initial state
    setState(manager.getState())
    setCapabilities(manager.getCapabilities())

    // Listen for updates
    manager.on('initialization_complete', () => {
      setState(manager.getState())
      setCapabilities(manager.getCapabilities())
    })

    manager.on('capabilities_updated', () => {
      setCapabilities(manager.getCapabilities())
    })
  }, [])

  return (
    <IntegrationContext.Provider value={{ state, capabilities }}>
      {children}
    </IntegrationContext.Provider>
  )
}
```

### Analytics Provider

```typescript
'use client'

import { AnalyticsCollector } from '@/lib/analytics'

export function AnalyticsProvider({ children, config }) {
  const collector = new AnalyticsCollector(config)

  useEffect(() => {
    collector.initialize()

    return () => {
      collector.cleanup()
    }
  }, [])

  // Track page views
  useEffect(() => {
    collector.trackPageView(window.location.pathname)
  }, [pathname])

  return (
    <AnalyticsContext.Provider value={collector}>
      {children}
    </AnalyticsContext.Provider>
  )
}
```

### Using Providers in Components

```typescript
'use client'

import { useIntegration } from '@/hooks/use-integration'
import { useAnalytics } from '@/hooks/use-analytics'

export function MyComponent() {
  const { capabilities, isFeatureEnabled } = useIntegration()
  const { trackEvent } = useAnalytics()

  const handleClick = () => {
    // Check if feature is enabled
    if (isFeatureEnabled('advanced-feature')) {
      trackEvent('advanced_feature_used', {
        method: 'click',
      })
    }
  }

  return (
    <div>
      <p>Performance Class: {capabilities.performanceClass}</p>
      <button onClick={handleClick}>Use Feature</button>
    </div>
  )
}
```

## System Dependencies

Different systems have dependencies on each other. The Integration Manager handles these dependencies automatically.

### Dependency Graph

```
Feature Flags
    ↓ depends on
Hardware Detection
    ↓ enables
Native Bridge (WASM)
    ↓ informs
Benchmarks
    ↓ provides data for
Analytics, Experiments, Optimization, Personalization
```

### Hardware Detection

**Dependencies:** None

**Provides:**
- Performance score
- Performance class
- Feature support flags
- GPU/CPU/Memory info

**Used by:**
- Feature Flags (for auto-performance gating)
- Optimization (for strategy selection)

### Native Bridge

**Dependencies:** None

**Provides:**
- WASM module loading
- SIMD detection
- Fallback to JavaScript

**Used by:**
- All systems (transparent acceleration)

### Feature Flags

**Dependencies:** Hardware Detection

**Provides:**
- Feature enable/disable decisions
- Hardware capabilities
- Performance-based gating

**Used by:**
- UI components (conditional rendering)
- Analytics (tracking feature usage)
- Experiments (variant assignment)

### Benchmarks

**Dependencies:** Hardware Detection, Native Bridge

**Provides:**
- Performance validation
- System-specific metrics
- Optimization recommendations

**Used by:**
- Optimization (strategy tuning)
- Analytics (performance tracking)

## Event System

The Integration Manager uses an event-driven architecture for communication between systems.

### Event Types

```typescript
type IntegrationEvent =
  | { type: 'initialization_started', timestamp: number, data: any }
  | { type: 'initialization_complete', timestamp: number, data: InitializationResult }
  | { type: 'initialization_failed', timestamp: number, data: InitializationResult }
  | { type: 'initialization_progress', timestamp: number, data: { progress: InitializationProgress, system: string } }
  | { type: 'system_status_changed', timestamp: number, data: { system: string, status: SystemStatus, previousStatus: SystemStatus } }
  | { type: 'capabilities_updated', timestamp: number, data: Capabilities }
  | { type: 'diagnostics_started', timestamp: number, data: any }
  | { type: 'diagnostics_complete', timestamp: number, data: DiagnosticResults }
  | { type: 'error', timestamp: number, data: { error: string, details?: any } }
```

### Listening to Events

```typescript
const manager = getIntegrationManager()

// Listen to specific events
manager.on('initialization_complete', (event) => {
  console.log('Initialized!', event.data)
})

// Listen to all events
manager.on('*', (event) => {
  console.log('Event:', event.type, event.data)
})

// Remove listener
const handler = (event) => console.log(event)
manager.on('initialization_complete', handler)
manager.off('initialization_complete', handler)
```

## Error Handling

The Integration Manager handles errors gracefully to ensure the application remains functional.

### Error Recovery Strategy

1. **Non-Critical Systems**: Log error, mark system as failed, continue initialization
2. **Critical Systems**: Log error, mark initialization as failed, show fallback UI
3. **Runtime Errors**: Emit error event, attempt recovery, degrade gracefully

### Example: Hardware Detection Failure

```typescript
try {
  const result = await getHardwareInfo()
  if (!result.success) {
    throw new Error(result.error)
  }
} catch (error) {
  // Mark hardware as failed
  this.state.systems.hardware = {
    stage: 'failed',
    active: false,
    error: error.message,
  }

  // Use defaults
  this.capabilities = {
    systemScore: 50, // Default to medium
    performanceClass: 'medium',
    // ... other defaults
  }

  // Emit error event
  this.emit({
    type: 'error',
    timestamp: Date.now(),
    data: { error: 'Hardware detection failed', details: error },
  })

  // Continue with other systems
  this.log('Continuing with default hardware capabilities')
}
```

### Error Event Handling

```typescript
manager.on('error', (event) => {
  console.error('Integration error:', event.data.error)

  // Show user-friendly message
  if (event.data.error.includes('WASM')) {
    showNotification('WASM not available, using JavaScript fallback')
  }

  // Log to analytics
  trackEvent('integration_error', {
    error: event.data.error,
    context: event.data.details,
  })
})
```

## Testing

See [`docs/TESTING.md`](./TESTING.md) for comprehensive testing documentation.

### Quick Test

```typescript
import { getIntegrationManager, resetIntegrationManager } from '@/lib/integration'

describe('Integration Manager', () => {
  beforeEach(() => {
    resetIntegrationManager()
  })

  it('should initialize successfully', async () => {
    const manager = getIntegrationManager({ autoInitialize: false })
    const result = await manager.initialize()

    expect(result.success).toBe(true)
    expect(result.state.stage).toBe('ready')
  })

  it('should handle hardware detection failure', async () => {
    // Mock hardware detection to fail
    vi.mock('@/lib/hardware', () => ({
      getHardwareInfo: async () => ({
        success: false,
        error: 'Hardware detection failed',
      }),
    }))

    const manager = getIntegrationManager({ autoInitialize: false })
    const result = await manager.initialize()

    // Should still complete with fallbacks
    expect(result.state.systems.hardware.stage).toBe('failed')
    expect(result.capabilities.systemScore).toBeGreaterThan(0)
  })
})
```

---

For more details, see:
- [Settings Guide](./SETTINGS_GUIDE.md) - User-facing settings documentation
- [Testing Guide](./TESTING.md) - Comprehensive testing documentation
- [README](../README.md) - Project overview
