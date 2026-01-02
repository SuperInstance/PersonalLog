# Integration Architecture

## Overview

The Integration Layer is the central orchestrator for all hardware-aware systems in PersonalLog. It provides a unified API for initializing, managing, and observing the state of four core systems:

1. **Hardware Detection** - Detects device capabilities and performance characteristics
2. **Native WASM Bridge** - Provides high-performance vector operations with JavaScript fallback
3. **Feature Flags** - Manages feature availability based on hardware and user preferences
4. **Benchmark Suite** - Measures and tracks system performance

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Integration Manager                          │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Hardware   │  │    Native    │  │ Feature Flags│             │
│  │  Detection   │  │ WASM Bridge  │  │    System    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌──────────────┐                                                    │
│  │  Benchmark   │                                                    │
│  │    Suite     │                                                    │
│  └──────────────┘                                                    │
│                                                                      │
│  State Management │ Event System │ Diagnostics                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Unified API
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Application Layer                            │
│                                                                      │
│  • React Components                                                 │
│  • Business Logic                                                   │
│  • UI Controllers                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Initialization Flow

### Automatic Initialization

By default, the Integration Manager auto-initializes when created:

```typescript
import { getIntegrationManager } from '@/lib/integration'

const manager = getIntegrationManager() // Starts initialization automatically
```

### Manual Initialization

For more control, disable auto-initialization:

```typescript
const manager = getIntegrationManager({ autoInitialize: false })

// Later...
await manager.initialize()
```

### Initialization Order

Systems are initialized in a specific order to handle dependencies:

1. **Hardware Detection** (fast, no dependencies)
   - Detects CPU, GPU, memory, network, display capabilities
   - Calculates performance score and class
   - Results used by other systems

2. **Native WASM Bridge** (async, non-blocking)
   - Attempts to load WASM module
   - Falls back to JavaScript if unavailable
   - 5-second timeout before using fallback
   - Doesn't block initialization if slow

3. **Feature Flags** (depends on hardware)
   - Uses hardware detection results
   - Evaluates feature availability
   - Loads user preferences from localStorage

4. **Benchmark Suite** (optional, user-triggered)
   - Only runs if `runBenchmarks: true` in config
   - Measures actual system performance
   - Generates recommendations

### Initialization State

```typescript
interface IntegrationState {
  startedAt: number
  completedAt?: number
  stage: 'initializing' | 'ready' | 'failed'

  systems: {
    hardware: SystemStatus
    native: SystemStatus
    flags: SystemStatus
    benchmarks: SystemStatus
  }

  progress: {
    total: number
    completed: number
    failed: number
    percentage: number
    current: string
    eta: number
  }
}
```

## Capabilities

After initialization, the Integration Manager provides computed capabilities:

```typescript
interface Capabilities {
  // Hardware profile from detection
  hardware?: HardwareProfile

  // Hardware capabilities for feature flags
  hardwareCapabilities?: HardwareCapabilities

  // WASM feature support
  wasmFeatures?: WasmFeatures
  usingWasm: boolean

  // Performance classification
  performanceClass?: 'low' | 'medium' | 'high' | 'premium'
  systemScore: number

  // Feature flag results
  featureFlags: {
    enabled: string[]
    disabled: string[]
    results: Map<string, EvaluationResult>
  }

  // Benchmark results (if run)
  benchmarks?: BenchmarkSuite
}
```

## Event System

The Integration Manager emits events for observability:

### Event Types

- `initialization_started` - Initialization has begun
- `initialization_progress` - Progress update during initialization
- `initialization_complete` - All systems initialized successfully
- `initialization_failed` - Initialization encountered errors
- `system_status_changed` - A system's status changed
- `capabilities_updated` - Capabilities were recomputed
- `diagnostics_started` - Diagnostic suite started
- `diagnostics_complete` - Diagnostic suite finished
- `error` - An error occurred

### Listening to Events

```typescript
manager.on('initialization_complete', (event) => {
  console.log('Initialized!', event.data)
})

manager.on('system_status_changed', (event) => {
  const { system, status } = event.data
  console.log(`${system} is now ${status.stage}`)
})
```

## Diagnostics

The Integration Manager provides comprehensive diagnostics:

```typescript
const diagnostics = await manager.runDiagnostics()

console.log('Overall health:', diagnostics.health)
// 'healthy' | 'degraded' | 'unhealthy'

diagnostics.systems.hardware.checks.forEach(check => {
  console.log(`${check.name}: ${check.passed ? '✓' : '✗'}`)
})

diagnostics.recommendations.forEach(rec => {
  console.log(`[${rec.priority}] ${rec.recommendation}`)
  if (rec.action) {
    console.log(`  Action: ${rec.action}`)
  }
})
```

### Diagnostic Checks

Each system runs diagnostic checks:

**Hardware Detection**
- `hardware_detection` - Basic detection works
- `performance_score` - Performance score is acceptable (>30)
- `feature_support` - Critical features are supported (WASM, Web Workers)

**Native Bridge**
- `wasm_support` - WASM is supported
- `wasm_loaded` - WASM module is loaded (if supported)

**Feature Flags**
- `manager_initialized` - Manager is initialized
- `hardware_capabilities` - Hardware capabilities detected

**Benchmarks**
- `benchmarks_completed` - Benchmarks finished (if enabled)
- `benchmarks_status` - Current benchmark status

## API Reference

### Main Methods

#### `initialize(): Promise<InitializationResult>`
Initialize all systems. Returns result with state, capabilities, and duration.

#### `getState(): IntegrationState`
Get current integration state.

#### `getCapabilities(): Capabilities`
Get current system capabilities.

#### `runDiagnostics(): Promise<DiagnosticResults>`
Run full diagnostic suite on all systems.

#### `isFeatureEnabled(featureId: string): boolean`
Check if a feature flag is enabled.

#### `getEnabledFeatures(): string[]`
Get list of all enabled feature flags.

### Event Methods

#### `on(eventType, listener): void`
Add event listener.

#### `off(eventType, listener): void`
Remove event listener.

### Convenience Functions

```typescript
// Quick initialization
const { success, capabilities } = await initializeIntegration({ debug: true })

// Get state
const state = getIntegrationState()

// Get capabilities
const capabilities = getCapabilities()

// Check features
if (isFeatureEnabled('ai-chat')) { /* ... */ }

// Run diagnostics
const diagnostics = await runDiagnostics()
```

## Configuration

```typescript
interface IntegrationConfig {
  // Auto-initialize on creation (default: true)
  autoInitialize?: boolean

  // Run benchmarks during init (default: false)
  runBenchmarks?: boolean

  // Enable debug logging (default: false)
  debug?: boolean

  // Initialization timeout (default: 30000ms)
  initializationTimeout?: number

  // Track feature flag metrics (default: true)
  trackMetrics?: boolean

  // Feature flags configuration
  featureFlags?: {
    autoPerformanceGate?: boolean
    performanceThreshold?: number
  }

  // Hardware detection options
  hardwareDetection?: {
    detailedGPU?: boolean
    checkQuota?: boolean
    detectWebGL?: boolean
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { getIntegrationManager } from '@/lib/integration'

const manager = getIntegrationManager({ debug: true })

// Wait for initialization
await manager.initialize()

// Check system status
const state = manager.getState()
console.log('System status:', state.stage)

// Get capabilities
const capabilities = manager.getCapabilities()
console.log('Performance class:', capabilities.performanceClass)
console.log('System score:', capabilities.systemScore)
```

### Feature Flag Usage

```typescript
import { isFeatureEnabled, getEnabledFeatures } from '@/lib/integration'

// Check specific feature
if (isFeatureEnabled('ai-chat')) {
  // Show AI chat interface
  showAIChat()
}

// Get all enabled features
const features = getEnabledFeatures()
console.log('Enabled features:', features)
```

### React Integration

```typescript
import { useEffect, useState } from 'react'
import { getIntegrationManager } from '@/lib/integration'

export function SystemStatus() {
  const [state, setState] = useState(null)
  const [capabilities, setCapabilities] = useState(null)

  useEffect(() => {
    const manager = getIntegrationManager()

    // Get current state
    setState(manager.getState())
    setCapabilities(manager.getCapabilities())

    // Listen to updates
    const handleComplete = () => {
      setState(manager.getState())
      setCapabilities(manager.getCapabilities())
    }

    manager.on('initialization_complete', handleComplete)

    return () => {
      manager.off('initialization_complete', handleComplete)
    }
  }, [])

  if (!state) return <div>Loading...</div>

  return (
    <div>
      <h2>System Status</h2>
      <p>Stage: {state.stage}</p>
      <p>Progress: {state.progress.percentage.toFixed(1)}%</p>

      {capabilities && (
        <>
          <h3>Capabilities</h3>
          <p>Performance Class: {capabilities.performanceClass}</p>
          <p>System Score: {capabilities.systemScore}</p>
          <p>WASM: {capabilities.usingWasm ? 'Enabled' : 'Disabled'}</p>
        </>
      )}
    </div>
  )
}
```

### Error Handling

```typescript
import { initializeIntegration } from '@/lib/integration'

try {
  const result = await initializeIntegration({
    debug: true,
    initializationTimeout: 10000,
  })

  if (!result.success) {
    console.error('Initialization failed:', result.error)

    // Check which systems failed
    const failedSystems = Object.entries(result.state.systems)
      .filter(([_, status]) => status.stage === 'failed')
      .map(([name, _]) => name)

    console.error('Failed systems:', failedSystems)

    // Graceful degradation
    if (failedSystems.includes('hardware')) {
      // Use default hardware profile
      console.warn('Using default hardware profile')
    }
  }
} catch (error) {
  console.error('Critical error:', error)
}
```

### Progressive Enhancement

```typescript
import { getIntegrationManager } from '@/lib/integration'

const manager = getIntegrationManager({ autoInitialize: false })

// Start initialization
manager.initialize().then(result => {
  if (result.success) {
    const { capabilities } = result

    // Enable features based on capabilities
    if (capabilities.performanceClass === 'premium') {
      enableAdvancedFeatures()
    } else if (capabilities.performanceClass === 'high') {
      enableStandardFeatures()
    } else {
      enableBasicFeatures()
    }

    // Use WASM if available
    if (capabilities.usingWasm) {
      useWasmVectorOps()
    } else {
      useJsVectorOps()
    }
  }
})

// Show UI immediately, enhance later
showBasicUI()
```

## Best Practices

### 1. **Never Block on Initialization**

The Integration Manager initializes asynchronously. Your app should:

- Show a loading state if needed
- Provide progressive enhancement
- Degrade gracefully if systems fail

### 2. **Use Event Listeners for Updates**

Instead of polling, listen to events:

```typescript
manager.on('capabilities_updated', (event) => {
  updateUI(event.data.capabilities)
})
```

### 3. **Check Feature Flags, Don't Assume**

Always check feature flags before using features:

```typescript
if (isFeatureEnabled('advanced-search')) {
  // Enable advanced search
}
```

### 4. **Run Diagnostics for Debugging**

When something goes wrong, run diagnostics:

```typescript
const diagnostics = await manager.runDiagnostics()
console.log('Health:', diagnostics.health)
console.log('Recommendations:', diagnostics.recommendations)
```

### 5. **Cache Results**

The Integration Manager caches results after initialization:

```typescript
// Fast - returns cached capabilities
const capabilities = manager.getCapabilities()

// Don't call initialize() multiple times
await manager.initialize() // ✓ Good
await manager.initialize() // ✗ Unnecessary
```

## Performance Considerations

### Initialization Time

- **Hardware Detection**: ~50-200ms
- **Native WASM**: ~0-5000ms (non-blocking, 5s timeout)
- **Feature Flags**: ~10-50ms
- **Benchmarks**: ~0-10000ms (optional, usually disabled)

Total typical initialization time: **100-300ms**

### Memory Usage

- Integration Manager: ~10-50KB
- Hardware Profile: ~5-10KB
- Feature Flag State: ~10-20KB
- Total: ~25-80KB

### Optimization Tips

1. **Disable benchmarks** in production (default: disabled)
2. **Use caching** - don't re-initialize unnecessarily
3. **Lazy load** heavy components after initialization
4. **Monitor diagnostics** for performance degradation

## Troubleshooting

### Common Issues

**1. Initialization hangs**
- Check `initializationTimeout` in config
- Look for errors in console
- Run diagnostics to identify stuck system

**2. Feature flags not working**
- Ensure hardware detection succeeded
- Check localStorage for corrupted preferences
- Verify feature is registered in registry

**3. WASM not loading**
- Check browser console for WASM errors
- Verify WASM files are built and accessible
- Check CORS headers for WASM files
- System will fall back to JS automatically

**4. Benchmarks timeout**
- Increase timeout in config (default: 10s)
- Skip expensive benchmarks
- Run benchmarks on-demand instead

### Debug Mode

Enable debug logging:

```typescript
const manager = getIntegrationManager({ debug: true })
```

This logs:
- Initialization progress
- System status changes
- Capability updates
- Diagnostic results
- Errors with stack traces

## Future Enhancements

Planned improvements to the Integration Layer:

1. **Hot Reload Support** - Reload systems without full re-initialization
2. **Remote Config** - Fetch feature flags from server
3. **A/B Testing** - Built-in experiment framework
4. **Performance Monitoring** - Continuous performance tracking
5. **Offline Support** - Detect and handle offline state
6. **Service Worker Integration** - Periodic sync and cache management

## Conclusion

The Integration Layer provides a robust, observable foundation for hardware-aware features in PersonalLog. By centralizing initialization and state management, it simplifies application code while providing powerful capabilities for adaptive user experiences.

For questions or issues, refer to the diagnostic tools and debug logging built into the Integration Manager.
