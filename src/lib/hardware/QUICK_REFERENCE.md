# Hardware Detection - Quick Reference

## Import

```typescript
import {
  getHardwareInfo,
  getPerformanceScore,
  detectCapabilities,
  clearHardwareCache
} from '@/lib/hardware';
```

## Common Usage Patterns

### Get Performance Score Only

```typescript
const score = await getPerformanceScore(); // 0-100
```

### Get Full Hardware Profile

```typescript
const result = await getHardwareInfo();

if (result.success) {
  const { profile } = result;

  // CPU
  console.log(profile.cpu.cores);
  console.log(profile.cpu.wasm.simd);

  // GPU
  console.log(profile.gpu.webgl.version);
  console.log(profile.gpu.vramMB);

  // Memory
  console.log(profile.memory.totalGB);

  // Performance
  console.log(profile.performanceScore);    // 0-100
  console.log(profile.performanceClass);    // 'low' | 'medium' | 'high' | 'premium'
}
```

### Check Feature Support

```typescript
const features = await detectCapabilities();

if (features.webWorkers) {
  // Use Web Workers
}

if (features.serviceWorker) {
  // Register Service Worker
}

if (profile.gpu.webgl.supported) {
  // Enable GPU acceleration
}
```

### Adaptive Configuration

```typescript
const { profile } = await getHardwareInfo();

// AI Model Selection
const aiModel = profile.performanceScore >= 80 ? 'gpt-4' : 'gpt-3.5-turbo';

// Cache Size (MB)
const cacheSize = profile.memory.totalGB
  ? profile.memory.totalGB * 50
  : 100;

// Feature Flags
const config = {
  enableAnimations: profile.performanceScore >= 60,
  enablePrefetch: profile.network.effectiveType === '4g',
  enable3D: profile.gpu.webgl.supported,
  useWebWorkers: profile.features.webWorkers
};
```

## Performance Classes

| Class | Score Range | Typical Device | Recommended Config |
|-------|-------------|----------------|-------------------|
| **Premium** | 80-100 | High-end workstation, M-series MacBook | All features enabled |
| **High** | 60-79 | Modern laptop (last 3 years) | Most features enabled |
| **Medium** | 40-59 | Average laptop, older desktop | Selective features |
| **Low** | 0-39 | Low-end laptop, old hardware | Minimal features |

## API Reference

### `getHardwareInfo(options?, useCache?)`

Get complete hardware profile.

**Options:**
- `detailedGPU`: boolean - Enable detailed GPU detection (default: false)
- `checkQuota`: boolean - Check storage quota (default: false)
- `detectWebGL`: boolean - Detect WebGL (default: true)
- `timeout`: number - Timeout in ms (default: 5000)

**Returns:** `Promise<DetectionResult>`

### `getPerformanceScore()`

Get performance score only (faster).

**Returns:** `Promise<number>` (0-100)

### `detectCapabilities()`

Get feature support matrix.

**Returns:** `Promise<FeatureSupport>`

### `clearHardwareCache()`

Clear cached profile.

**Returns:** `void`

## Detection Speed

- **Basic** (no GPU/quota): ~50ms
- **Standard** (with WebGL): ~150ms
- **Full** (with quota): ~300ms
- **Cached**: <1ms

## Type Definitions

```typescript
interface HardwareProfile {
  cpu: {
    cores: number;
    concurrency: number;
    wasm: { supported: boolean; simd: boolean; threads: boolean };
  };
  gpu: {
    available: boolean;
    webgl: { supported: boolean; version: 1 | 2 };
    webgpu: { supported: boolean };
    vramMB?: number;
  };
  memory: {
    totalGB?: number;
    jsHeap?: { limit: number; used: number; total: number };
  };
  network: {
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
    downlinkMbps?: number;
    rtt?: number;
    online: boolean;
  };
  performanceScore: number;        // 0-100
  performanceClass: PerformanceClass;
  // ... plus display, browser, storage, features
}
```

## Common Patterns

### Adaptive AI Model

```typescript
const score = await getPerformanceScore();

const models = {
  premium: 'gpt-4-turbo',
  high: 'gpt-4',
  medium: 'gpt-3.5-turbo',
  low: 'gpt-3.5-turbo-16k'
};

const model = models[profile.performanceClass];
```

### Network-Based Prefetching

```typescript
const { profile } = await getHardwareInfo();

if (profile.network.effectiveType === '4g') {
  enableAggressivePrefetch();
} else if (profile.network.effectiveType === '2g') {
  disablePrefetch();
}
```

### Memory-Based Cache Size

```typescript
const { profile } = await getHardwareInfo();

const cacheSizes = {
  premium: 500,   // MB
  high: 250,
  medium: 100,
  low: 50
};

const cacheSize = cacheSizes[profile.performanceClass];
```

### Feature Detection

```typescript
const features = await detectCapabilities();

const enableWorkers = features.webWorkers;
const enableOffline = features.serviceWorker;
const enableGPU = profile.gpu.webgl.supported;
```

## Best Practices

1. **Use Caching**
   ```typescript
   // First call: ~50ms
   await getHardwareInfo();

   // Subsequent calls: <1ms
   await getHardwareInfo(); // Uses cache
   ```

2. **Lazy Detection**
   ```typescript
   // Fast detection for initial load
   const fast = await getHardwareInfo({
     detailedGPU: false,
     checkQuota: false
   });

   // Full detection later
   const full = await getHardwareInfo({
     detailedGPU: true,
     checkQuota: true
   });
   ```

3. **Graceful Degradation**
   ```typescript
   const result = await getHardwareInfo();

   if (result.success) {
     configureApp(result.profile);
   } else {
     configureApp(defaultConfig); // Fallback
   }
   ```

4. **Handle Private Browsing**
   ```typescript
   if (profile.storage.indexedDB.available) {
     useIndexedDB();
   } else {
     useMemoryStorage(); // Fallback
   }
   ```

## Troubleshooting

### Detection Returns Unknown Values
**Expected:** APIs restricted for privacy (fingerprinting protection)
**Solution:** System provides safe defaults

### Slow Detection
**Solution:** Disable optional features:
```typescript
await getHardwareInfo({
  detailedGPU: false,
  checkQuota: false
});
```

### IndexedDB Unavailable
**Cause:** Private browsing mode
**Solution:** Use memory storage fallback

## Testing

```typescript
// Mock tests
const mockProfile = {
  cpu: { cores: 8, wasm: { simd: true } },
  gpu: { webgl: { supported: true } },
  performanceScore: 75,
  performanceClass: 'high'
};
```

---

*For full documentation, see [README.md](./README.md)*
*For research details, see [docs/research/hardware-detection.md](../../../docs/research/hardware-detection.md)*
