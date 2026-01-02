# Integration Layer - Quick Reference

## Files Created

```
src/lib/integration/
├── types.ts      (8.5 KB)  - Type definitions
├── manager.ts    (25 KB)   - Main orchestrator
├── index.ts      (4.8 KB)  - Public API
└── example.ts    (7.5 KB)  - Usage examples

docs/specs/
├── integration-architecture.md          (17 KB) - Full documentation
└── integration-deliverable-summary.md   (9.4 KB) - Deliverable summary
```

## Quick Start

```typescript
import { getIntegrationManager } from '@/lib/integration'

const manager = getIntegrationManager({ debug: true })

// Wait for ready
manager.on('initialization_complete', () => {
  const capabilities = manager.getCapabilities()
  console.log('Ready!', capabilities.performanceClass)
})

// Check features
if (manager.isFeatureEnabled('ai-chat')) {
  // Enable AI chat
}
```

## Main API

| Method | Returns | Description |
|--------|---------|-------------|
| `initialize()` | `Promise<InitResult>` | Initialize all systems |
| `getState()` | `IntegrationState` | Get current state |
| `getCapabilities()` | `Capabilities` | Get capabilities |
| `runDiagnostics()` | `Promise<Diagnostics>` | Run diagnostics |
| `isFeatureEnabled(id)` | `boolean` | Check feature flag |
| `getEnabledFeatures()` | `string[]` | List enabled features |
| `on(event, fn)` | `void` | Add event listener |
| `off(event, fn)` | `void` | Remove event listener |

## Convenience Functions

```typescript
import {
  initializeIntegration,
  getIntegrationState,
  getCapabilities,
  isFeatureEnabled,
  getEnabledFeatures,
  runDiagnostics
} from '@/lib/integration'

// Quick init
const result = await initializeIntegration({ debug: true })

// Get state
const state = getIntegrationState()

// Check features
if (isFeatureEnabled('feature-id')) { /* ... */ }
```

## Events

| Event | When | Data |
|-------|------|------|
| `initialization_started` | Init begins | Config |
| `initialization_progress` | Progress update | Progress info |
| `initialization_complete` | All ready | Result |
| `initialization_failed` | Init failed | Error info |
| `system_status_changed` | System changes | System status |
| `capabilities_updated` | Capabilities change | Capabilities |
| `diagnostics_started` | Diagnostics start | - |
| `diagnostics_complete` | Diagnostics done | Results |
| `error` | Any error | Error details |

## State Structure

```typescript
{
  startedAt: number
  completedAt?: number
  stage: 'initializing' | 'ready' | 'failed'

  systems: {
    hardware: { stage, startedAt, completedAt, initTime, error, active }
    native: { stage, startedAt, completedAt, initTime, error, active }
    flags: { stage, startedAt, completedAt, initTime, error, active }
    benchmarks: { stage, startedAt, completedAt, initTime, error, active }
  }

  progress: {
    total: 4
    completed: number
    failed: number
    percentage: number
    current: string
    eta: number
  }
}
```

## Capabilities Structure

```typescript
{
  hardware?: HardwareProfile
  hardwareCapabilities?: HardwareCapabilities
  wasmFeatures?: WasmFeatures
  usingWasm: boolean
  performanceClass?: 'low' | 'medium' | 'high' | 'premium'
  systemScore: number

  featureFlags: {
    enabled: string[]
    disabled: string[]
    results: Map<string, EvaluationResult>
  }

  benchmarks?: BenchmarkSuite
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoInitialize` | boolean | `true` | Auto-init on creation |
| `runBenchmarks` | boolean | `false` | Run benchmarks during init |
| `debug` | boolean | `false` | Enable debug logging |
| `initializationTimeout` | number | `30000` | Init timeout (ms) |
| `trackMetrics` | boolean | `true` | Track feature metrics |
| `featureFlags.autoPerformanceGate` | boolean | `true` | Auto-disable on slow perf |
| `featureFlags.performanceThreshold` | number | `1000` | Perf threshold (ms) |
| `hardwareDetection.detailedGPU` | boolean | `true` | Get detailed GPU info |
| `hardwareDetection.checkQuota` | boolean | `false` | Check storage quota |
| `hardwareDetection.detectWebGL` | boolean | `true` | Detect WebGL info |

## Initialization Order

1. **Hardware Detection** (~50-200ms)
   - Detects all hardware capabilities
   - Calculates performance score
   - No dependencies

2. **Native WASM Bridge** (~0-5000ms, non-blocking)
   - Loads WASM if available
   - Falls back to JavaScript
   - 5s timeout, doesn't block

3. **Feature Flags** (~10-50ms)
   - Depends on hardware detection
   - Evaluates all features
   - Loads user preferences

4. **Benchmark Suite** (~0-10000ms, optional)
   - Measures performance
   - Only if `runBenchmarks: true`
   - Generates recommendations

**Total Time**: 100-300ms (typical, without benchmarks)

## Common Patterns

### Wait for Initialization

```typescript
const manager = getIntegrationManager()

if (manager.getState().stage !== 'ready') {
  await new Promise(resolve => {
    manager.once('initialization_complete', resolve)
  })
}
```

### Progressive Enhancement

```typescript
// Show basic UI immediately
showBasicUI()

// Enhance when ready
manager.on('initialization_complete', () => {
  const { capabilities } = manager.getCapabilities()

  if (capabilities.performanceClass === 'premium') {
    enableAdvancedFeatures()
  }
})
```

### Error Handling

```typescript
const result = await manager.initialize()

if (!result.success) {
  // Check which systems failed
  for (const [name, status] of Object.entries(result.state.systems)) {
    if (status.stage === 'failed') {
      console.error(`${name} failed: ${status.error}`)
      // Use fallbacks
    }
  }
}
```

### Feature Gating

```typescript
// Component level
function AdvancedSearch() {
  if (!isFeatureEnabled('advanced-search')) {
    return null
  }
  return <AdvancedSearchUI />
}

// Route level
const routes = [
  { path: '/chat', component: Chat, guard: () => isFeatureEnabled('ai-chat') }
]
```

## Performance Notes

- **Memory**: ~25-80KB total
- **Init Time**: 100-300ms typical
- **Non-blocking**: WASM loads in background
- **Caching**: Results cached after first run

## Debugging

Enable debug mode:

```typescript
const manager = getIntegrationManager({ debug: true })
```

This logs:
- Initialization progress
- System status changes
- Capability updates
- Diagnostic results
- Errors with stack traces

Run diagnostics:

```typescript
const diagnostics = await manager.runDiagnostics()
console.log('Health:', diagnostics.health)
console.table(diagnostics.systems)
```

## File Locations

- **Source**: `/mnt/c/users/casey/PersonalLog/src/lib/integration/`
- **Docs**: `/mnt/c/users/casey/PersonalLog/docs/specs/integration-*.md`
- **Example**: `/mnt/c/users/casey/PersonalLog/src/lib/integration/example.ts`

## See Also

- [Full Architecture](./integration-architecture.md) - Complete documentation
- [Deliverable Summary](./integration-deliverable-summary.md) - Implementation details
- [Example Code](../src/lib/integration/example.ts) - 7 usage examples
