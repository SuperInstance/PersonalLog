# Hardware Detection Module

Comprehensive hardware capability detection for PersonalLog v1.1, enabling adaptive application behavior based on device capabilities.

## Features

- **CPU Detection**: Cores, architecture, SIMD, WebAssembly support
- **GPU Detection**: WebGL, WebGPU, VRAM estimation, vendor/renderer
- **Memory Detection**: RAM, JS heap, device memory API
- **Storage Detection**: IndexedDB, storage quota, persistence type
- **Network Detection**: Connection type, speed, RTT, data saver mode
- **Display Detection**: Resolution, pixel ratio, color depth, orientation
- **Browser Detection**: Browser name, version, OS, platform, touch support
- **Feature Detection**: 12+ web platform APIs
- **Performance Scoring**: 0-100 score with 4-tier classification

## Installation

The module is part of the PersonalLog project. No additional installation needed.

```bash
# Already included in PersonalLog v1.1
```

## Quick Start

```typescript
import { getHardwareInfo } from '@/lib/hardware';

// Get complete hardware profile
const result = await getHardwareInfo();

if (result.success) {
  const { profile } = result;

  console.log(`Performance Score: ${profile.performanceScore}/100`);
  console.log(`CPU Cores: ${profile.cpu.cores}`);
  console.log(`GPU: ${profile.gpu.renderer}`);
  console.log(`RAM: ${profile.memory.totalGB}GB`);

  // Adaptive behavior based on performance
  if (profile.performanceClass === 'premium') {
    // Enable all features
  } else if (profile.performanceClass === 'low') {
    // Use lightweight alternatives
  }
}
```

## API Reference

### Main Functions

#### `getHardwareInfo(options?: DetectionOptions, useCache?: boolean): Promise<DetectionResult>`

Get complete hardware profile with all detected information.

**Options:**
- `detailedGPU`: Enable detailed GPU detection (slower)
- `checkQuota`: Check storage quota (slower)
- `detectWebGL`: Detect WebGL capabilities (recommended)
- `timeout`: Detection timeout in ms (default: 5000)

**Returns:**
```typescript
{
  success: boolean;
  profile?: HardwareProfile;
  error?: string;
  detectionTime: number; // in milliseconds
}
```

#### `getPerformanceScore(): Promise<number>`

Get only the performance score (faster than full detection).

**Returns:** Performance score from 0-100

#### `detectCapabilities(): Promise<FeatureSupport>`

Get feature support matrix only.

**Returns:**
```typescript
{
  webWorkers: boolean;
  serviceWorker: boolean;
  webrtc: boolean;
  webassembly: boolean;
  websockets: boolean;
  geolocation: boolean;
  notifications: boolean;
  fullscreen: boolean;
  pip: boolean;
  webBluetooth: boolean;
  webusb: boolean;
  fileSystemAccess: boolean;
}
```

#### `clearHardwareCache(): void`

Clear cached hardware profile. Call this if hardware changed (e.g., external GPU connected).

### HardwareProfile Interface

```typescript
interface HardwareProfile {
  timestamp: number;
  cpu: CPUInfo;
  gpu: GPUInfo;
  memory: MemoryInfo;
  storage: StorageInfo;
  network: NetworkInfo;
  display: DisplayInfo;
  browser: BrowserInfo;
  features: FeatureSupport;
  performanceScore: number;        // 0-100
  performanceClass: PerformanceClass; // 'low' | 'medium' | 'high' | 'premium'
}
```

## Usage Examples

### Adaptive AI Model Selection

```typescript
import { getPerformanceScore } from '@/lib/hardware';

const score = await getPerformanceScore();

let modelName: string;
if (score >= 80) {
  modelName = 'gpt-4-turbo';      // Premium
} else if (score >= 60) {
  modelName = 'gpt-4';             // High
} else if (score >= 40) {
  modelName = 'gpt-3.5-turbo';     // Medium
} else {
  modelName = 'gpt-3.5-turbo-16k'; // Low
}
```

### Feature-Based Optimization

```typescript
import { detectCapabilities, getHardwareInfo } from '@/lib/hardware';

const features = await detectCapabilities();
const result = await getHardwareInfo();

// Use Web Workers for parallel processing
if (features.webWorkers) {
  spawnWorkerThreads();
}

// Enable GPU acceleration
if (result.profile?.gpu.webgl.supported) {
  enable3DAcceleration();
}

// Adjust for network
if (result.profile?.network.effectiveType === '4g') {
  enableAggressivePrefetch();
} else if (result.profile?.network.effectiveType === '2g') {
  disablePrefetch();
}
```

### Performance Class Configuration

```typescript
import { getHardwareInfo } from '@/lib/hardware';

const { profile } = await getHardwareInfo();
const config = getConfiguration(profile.performanceClass);

function getConfiguration(perfClass: PerformanceClass) {
  const configs = {
    premium: {
      aiModel: 'gpt-4-turbo',
      maxCacheSizeMB: 500,
      enableAnimations: true,
      enable3D: true,
      enablePrefetch: true,
      maxConcurrentRequests: 10
    },
    high: {
      aiModel: 'gpt-4',
      maxCacheSizeMB: 250,
      enableAnimations: true,
      enable3D: false,
      enablePrefetch: true,
      maxConcurrentRequests: 6
    },
    medium: {
      aiModel: 'gpt-3.5-turbo',
      maxCacheSizeMB: 100,
      enableAnimations: false,
      enable3D: false,
      enablePrefetch: true,
      maxConcurrentRequests: 4
    },
    low: {
      aiModel: 'gpt-3.5-turbo-16k',
      maxCacheSizeMB: 50,
      enableAnimations: false,
      enable3D: false,
      enablePrefetch: false,
      maxConcurrentRequests: 2
    }
  };

  return configs[perfClass];
}
```

### Detect Limitations

```typescript
import { getHardwareInfo } from '@/lib/hardware';

const { profile } = await getHardwareInfo();
const warnings: string[] = [];

// Check for low memory
if (profile.memory.totalGB && profile.memory.totalGB < 4) {
  warnings.push('Low memory detected (<4GB). Some features may be slow.');
}

// Check for slow network
if (profile.network.effectiveType === '2g') {
  warnings.push('Slow network detected. Minimizing data usage.');
}

// Check for lack of GPU
if (!profile.gpu.webgl.supported && !profile.gpu.webgpu.supported) {
  warnings.push('No GPU acceleration available.');
}

if (warnings.length > 0) {
  showWarningsToUser(warnings);
}
```

## Performance Classes

The system classifies devices into 4 performance tiers:

### Premium (80-100)
- **Typical Device:** High-end workstation, gaming PC, M-series MacBook
- **CPU:** 8+ cores, SIMD support
- **GPU:** Discrete GPU with 8GB+ VRAM or Apple Silicon
- **RAM:** 16GB+
- **Network:** 4G+ or fast broadband

### High (60-79)
- **Typical Device:** Modern laptop/desktop (last 3 years)
- **CPU:** 4+ cores
- **GPU:** Decent discrete GPU or good integrated graphics
- **RAM:** 8GB+
- **Network:** 3G/4G

### Medium (40-59)
- **Typical Device:** Average laptop, older desktop
- **CPU:** 2-4 cores
- **GPU:** Integrated graphics
- **RAM:** 4-8GB
- **Network:** 3G

### Low (0-39)
- **Typical Device:** Low-end laptop, old hardware, budget mobile
- **CPU:** 1-2 cores
- **GPU:** Basic or no GPU acceleration
- **RAM:** <4GB
- **Network:** 2G or slow

## Performance Score Calculation

The performance score is calculated as a weighted average:

```typescript
overall = cpu * 0.35 + gpu * 0.30 + memory * 0.20 + network * 0.15
```

### Component Scores

**CPU (35% weight):**
- Base: (cores / 16) * 100
- Bonus: +10 for SIMD support
- Bonus: +10 for WebAssembly threads

**GPU (30% weight):**
- WebGL 1.0: 50 points
- WebGL 2.0: 70 points
- WebGPU: +50 points

**Memory (20% weight):**
- Based on deviceMemory API or hardwareConcurrency
- Scale: 0-16GB → 0-100 points

**Network (15% weight):**
- 4G: 90 points
- 3G: 60 points
- 2G: 30 points
- slow-2g: 10 points

## Cross-Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CPU Cores | ✅ | ✅ | ✅ | ✅ |
| Device Memory | ✅ (Android) | ❌ | ❌ | ✅ |
| WebGL 1.0 | ✅ | ✅ | ✅ | ✅ |
| WebGL 2.0 | ✅ | ✅ | ✅ | ✅ |
| WebGPU | ✅ (113+) | ⚠️ (preview) | ⚠️ (preview) | ✅ |
| Network Info | ✅ (Android) | ❌ | ❌ | ✅ |
| Storage API | ✅ | ⚠️ | ⚠️ | ✅ |

## Limitations

1. **Memory Detection**
   - `deviceMemory` API only available on Android Chrome
   - Values are rounded (2, 4, 8 GB)
   - Desktop access blocked for privacy (fingerprinting)

2. **GPU VRAM**
   - No direct API access (fingerprinting protection)
   - Estimated using heuristics and user agent parsing
   - Accuracy: ~60-70% for common GPUs

3. **Network Information**
   - Only available on mobile Chrome/Edge
   - Desktop users get no network info
   - Values are estimates, not real-time measurements

4. **Private Browsing**
   - IndexedDB may be disabled
   - Storage quota checks may fail
   - Graceful fallbacks implemented

## Best Practices

1. **Use Caching:**
   ```typescript
   // First detection: ~50-150ms
   const result1 = await getHardwareInfo();

   // Subsequent calls: <1ms (from cache)
   const result2 = await getHardwareInfo();
   ```

2. **Lazy Detection:**
   ```typescript
   // Basic info only (fast)
   const fast = await getHardwareInfo({
     detailedGPU: false,
     checkQuota: false
   });

   // Full info when needed
   const detailed = await getHardwareInfo({
     detailedGPU: true,
     checkQuota: true
   });
   ```

3. **Graceful Degradation:**
   ```typescript
   const result = await getHardwareInfo();

   if (result.success && result.profile) {
     // Use hardware info
     configureApp(result.profile);
   } else {
     // Use safe defaults
     configureApp(defaultConfig);
   }
   ```

4. **Handle Permission Denials:**
   ```typescript
   // IndexedDB may be blocked in private browsing
   if (profile.storage.indexedDB.available) {
     useIndexedDB();
   } else {
     useMemoryStorage(); // Fallback
   }
   ```

## Advanced Usage

### Direct Detector Access

```typescript
import { getDetector } from '@/lib/hardware';

const detector = getDetector();

// Clear cache manually
detector.clearCache();

// Custom detection with options
const result = await detector.getHardwareInfo({
  detailedGPU: true,
  checkQuota: true,
  detectWebGL: true
}, false); // Don't use cache
```

### Real-Time Monitoring

```typescript
import { getDetector } from '@/lib/hardware';

const detector = getDetector();

// Monitor network changes
if ('connection' in navigator) {
  const conn = navigator.connection;
  conn.addEventListener('change', async () => {
    const result = await detector.getHardwareInfo();
    updateConfiguration(result.profile!);
  });
}
```

## Troubleshooting

### Detection Returns "Unknown" Values

**Problem:** Many fields showing as undefined or "Unknown"

**Solution:** This is expected due to browser privacy restrictions. The detector provides safe defaults when APIs are unavailable.

### Slow Detection Time

**Problem:** Detection takes >500ms

**Solution:** Disable optional features:
```typescript
const result = await getHardwareInfo({
  detailedGPU: false,
  checkQuota: false,
  detectWebGL: false
});
```

### IndexedDB Fails

**Problem:** `storage.indexedDB.available` is false

**Possible Causes:**
1. Private browsing mode
2. Browser settings disabled storage
3. Storage quota exceeded

**Solution:** Implement fallback to memory storage

## File Structure

```
src/lib/hardware/
├── detector.ts      # Main detection implementation
├── types.ts         # TypeScript type definitions
├── index.ts         # Public API exports
├── example.ts       # Usage examples
└── README.md        # This file
```

## Further Reading

- [Research Documentation](../../../docs/research/hardware-detection.md)
- [MDN: HardwareConcurrency](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency)
- [MDN: WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/GPU)
- [WebAssembly Specification](https://webassembly.github.io/spec/)

## License

Part of PersonalLog v1.1

---

*Last Updated: 2026-01-02*
*Version: 1.0.0*
