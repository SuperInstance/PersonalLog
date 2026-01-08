# Hardware Detection User Guide

**Know Your Users' Capabilities**

---

## What is Hardware Detection?

Hardware Detection is a browser-based tool that comprehensively detects device capabilities: CPU, GPU, memory, storage, network, display, browser, and supported features. It helps you make intelligent decisions about which features to enable based on user hardware.

### What Problem Does It Solve?

**The Problem:** Not all users have powerful devices. Loading heavy ML models or GPU-accelerated features on low-end devices causes crashes, slow performance, and frustrated users.

**The Hardware Detection Solution:**
- Detect exact hardware capabilities
- Calculate performance score (0-100)
- Classify devices (premium, high, medium, low)
- Enable features based on capabilities
- Progressive enhancement approach

### Real-World Example

**Before Hardware Detection:**
```
Developer: "I'll load a 500MB ML model for everyone"
User on cheap phone: [App crashes] 😞
User on gaming PC: [Works fine, but overkill]
```

**After Hardware Detection:**
```
Developer: "I'll check hardware first"

if (performanceScore > 70) {
  // Load 500MB ML model (GPU acceleration)
} else if (performanceScore > 40) {
  // Load 50MB model (CPU only)
} else {
  // Use server-side model (no local processing)
}

User on cheap phone: [Works with server model] ✓
User on gaming PC: [Works with local GPU model] ✓
```

---

## When to Use Hardware Detection

Use Hardware Detection when:

**Perfect For:**
- Building performance-critical web apps
- Running ML models in the browser
- GPU acceleration features
- Progressive enhancement strategies
- Feature detection and graceful degradation
- Analytics and user insights
- Deciding between local vs cloud processing

**Not Ideal For:**
- Simple, static websites (overkill)
- Backend-only applications
- Uniform hardware environments (e.g., corporate intranet)

---

## Installation

### Option 1: CDN (Simplest)

```html
<script src="https://cdn.jsdelivr.net/npm/@superinstance/hardware-detector/dist/hw-detector.min.js"></script>

<script>
  const result = await HardwareDetector.getHardwareInfo()
  console.log('Performance score:', result.profile.performanceScore)
</script>
```

### Option 2: NPM Package

```bash
npm install @superinstance/hardware-detector
```

```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

const result = await getHardwareInfo()
```

### Option 3: ES Modules

```html
<script type="module">
  import { getHardwareInfo } from 'https://cdn.jsdelivr.net/npm/@superinstance/hardware-detector/dist/hw-detector.esm.js'

  const result = await getHardwareInfo()
  console.log(result)
</script>
```

---

## Quick Start Guide

### Your First Hardware Detection

**Step 1: Detect hardware**

```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

const result = await getHardwareInfo()

if (result.success) {
  console.log('Performance Score:', result.profile.performanceScore)
  console.log('Performance Class:', result.profile.performanceClass)
  console.log('CPU Cores:', result.profile.cpu.cores)
  console.log('Memory:', result.profile.memory.totalGB, 'GB')
} else {
  console.error('Detection failed:', result.error)
}
```

**Output:**
```
Performance Score: 72
Performance Class: high
CPU Cores: 8
Memory: 16 GB
GPU: WebGPU supported ✓
Network: 4g
Detection time: 124ms
```

**Step 2: Use performance score**

```javascript
const score = result.profile.performanceScore

if (score > 70) {
  // Premium device - enable all features
  await loadAdvancedFeatures()
  enableGPUAcceleration()
} else if (score > 40) {
  // Medium device - enable some features
  await loadBasicFeatures()
} else {
  // Low-end device - use server-side
  await loadServerSideFeatures()
}
```

**Step 3: Check specific capabilities**

```javascript
const profile = result.profile

// Check WebGPU support
if (profile.gpu.webgpu.supported) {
  console.log('WebGPU available - use GPU acceleration')
}

// Check memory
if (profile.memory.totalGB && profile.memory.totalGB < 4) {
  console.log('Low memory - avoid memory-intensive operations')
}

// Check network
if (profile.network.effectiveType === '4g') {
  console.log('Fast connection - load high-quality assets')
} else if (profile.network.effectiveType === '2g') {
  console.log('Slow connection - load compressed assets')
}
```

---

## Core Concepts

### 1. Performance Score (0-100)

A single number representing overall device capability:

- **0-39 (Low):** Low-end devices, older phones, limited capabilities
- **40-69 (Medium):** Mid-range devices, capable of most features
- **70-89 (High):** High-end devices, can handle advanced features
- **90-100 (Premium):** Top-tier devices, full capabilities

**Score Calculation:**
```
CPU (35%) + GPU (30%) + Memory (20%) + Network (15%) = Overall Score
```

### 2. Performance Classes

Quick categorization for decision-making:

```javascript
const profile = await getHardwareInfo()

switch (profile.performanceClass) {
  case 'premium':
    // Enable all features, use GPU acceleration
    break
  case 'high':
    // Enable most features, optional GPU
    break
  case 'medium':
    // Enable basic features, CPU-only
    break
  case 'low':
    // Use server-side, minimal features
    break
}
```

### 3. Capability Detection

Detailed information about each hardware component:

**CPU:**
- Cores, concurrency
- Architecture (x86, ARM)
- SIMD support
- WebAssembly capabilities

**GPU:**
- WebGPU support
- WebGL/WebGL2 support
- VRAM estimate
- Vendor and renderer

**Memory:**
- Total RAM (if available)
- JS heap limits
- Memory API availability

**Storage:**
- IndexedDB support and availability
- Storage quota
- Storage type (persistent vs session)

**Network:**
- Connection type (4g, 3g, 2g)
- Effective bandwidth
- Round-trip time (RTT)
- Save-data mode

**Display:**
- Resolution
- Pixel ratio (for retina displays)
- Color depth
- Orientation

**Browser:**
- Name and version
- Operating system
- Platform
- Touch support

**Features:**
- Web Workers
- Service Workers
- WebRTC
- WebSockets
- Geolocation
- etc.

### 4. Detection Options

Customize detection behavior:

```javascript
const result = await getHardwareInfo({
  detailedGPU: true,      // Get detailed GPU info
  checkQuota: true,        // Check storage quota
  detectWebGL: true        // Detect WebGL capabilities
})
```

---

## Common Patterns

### Pattern 1: Progressive ML Loading

Load appropriate ML model based on hardware:

```javascript
const { profile } = await getHardwareInfo()

async function loadMLModel() {
  if (profile.gpu.webgpu.supported && profile.performanceScore > 70) {
    // Load large model with GPU acceleration
    return loadModel('model-large.webgpu', { useGPU: true })
  } else if (profile.performanceScore > 50) {
    // Load medium model, CPU only
    return loadModel('model-medium.wasm', { useGPU: false })
  } else {
    // Use server-side model
    return null  // Will use API
  }
}
```

### Pattern 2: Adaptive Video Quality

Adjust video quality based on device and network:

```javascript
const { profile } = await getHardwareInfo()

function getVideoQuality() {
  const score = profile.performanceScore
  const network = profile.network.effectiveType

  if (score > 70 && network === '4g') {
    return '1080p'
  } else if (score > 50 && network === '4g') {
    return '720p'
  } else if (network === '3g') {
    return '480p'
  } else {
    return '360p'
  }
}

const player = loadVideo(getVideoQuality())
```

### Pattern 3: Feature Flagging

Enable/disable features based on capabilities:

```javascript
const { profile } = await getHardwareInfo()

const features = {
  // Basic features (always on)
  darkMode: true,
  offlineSupport: profile.features.serviceWorker,

  // Advanced features (hardware-dependent)
  gpuAcceleration: profile.gpu.webgpu.supported,
  webWorkers: profile.features.webWorkers,
  webgl: profile.gpu.webgl.supported,

  // Performance-dependent features
  animations: profile.performanceScore > 50,
  realTimeCollaboration: profile.performanceScore > 60,
  advancedVisualizations: profile.performanceScore > 70
}

// Use feature flags
if (features.gpuAcceleration) {
  initGPURenderer()
} else {
  initCanvasRenderer()
}
```

### Pattern 4: Analytics & Insights

Track user hardware landscape:

```javascript
const { profile } = await getHardwareInfo()

// Send to analytics
analytics.track('hardware_profile', {
  performanceClass: profile.performanceClass,
  performanceScore: profile.performanceScore,
  cpuCores: profile.cpu.cores,
  memory: profile.memory.totalGB,
  gpu: profile.gpu.webgpu.supported ? 'webgpu' :
        profile.gpu.webgl.supported ? 'webgl' : 'none',
  network: profile.network.effectiveType,
  browser: profile.browser.browser
})

// Use for product decisions
if (averagePerformanceScore < 50) {
  // Most users have low-end devices
  // Optimize for performance over features
}
```

### Pattern 5: Graceful Degradation

Provide alternatives when hardware is limited:

```javascript
async function initApp() {
  const { profile } = await getHardwareInfo()

  // Try advanced features first, fall back gracefully
  try {
    if (profile.gpu.webgpu.supported) {
      await initWebGPURenderer()
    } else if (profile.gpu.webgl.supported) {
      await initWebGLRenderer()
    } else {
      await initCanvasRenderer()
    }
  } catch (error) {
    console.warn('Advanced rendering failed, using basic:', error)
    await initBasicRenderer()
  }

  // ML features
  if (profile.performanceScore > 60) {
    await initLocalML()
  } else {
    await initServerML()  // Use API
  }
}
```

---

## Advanced Usage

### Quick Performance Check

Get performance score only (faster than full detection):

```javascript
import { getPerformanceScore } from '@superinstance/hardware-detector'

const score = await getPerformanceScore()  // 0-100
console.log('Performance score:', score)
```

### Feature Detection Only

Check feature support without full hardware detection:

```javascript
import { detectCapabilities } from '@superinstance/hardware-detector'

const features = await detectCapabilities()

if (features.webWorkers && features.webassembly) {
  console.log('Can use Web Workers + WASM')
}
```

### Custom Performance Scoring

Define your own scoring algorithm:

```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

const { profile } = await getHardwareInfo()

// Custom scoring for your use case
const customScore = calculateCustomScore(profile)

function calculateCustomScore(profile) {
  let score = 0

  // We care about GPU more than CPU
  if (profile.gpu.webgpu.supported) score += 40
  else if (profile.gpu.webgl.supported) score += 20

  // We need lots of memory
  if (profile.memory.totalGB >= 16) score += 40
  else if (profile.memory.totalGB >= 8) score += 20
  else score += 10

  // CPU matters less for us
  score += (profile.cpu.cores / 16) * 20

  return Math.min(100, score)
}
```

### Caching Detection Results

Hardware doesn't change, so cache results:

```javascript
import { getDetector } from '@superinstance/hardware-detector'

const detector = getDetector()

// First call: does detection
const result1 = await detector.getHardwareInfo()

// Subsequent calls: returns cached result
const result2 = await detector.getHardwareInfo({ useCache: true })

// Clear cache if needed
detector.clearCache()
```

---

## Configuration

### Detection Options

```javascript
const result = await getHardwareInfo({
  // Get detailed GPU info (slower)
  detailedGPU: true,

  // Check storage quota (slower)
  checkQuota: true,

  // Detect WebGL capabilities
  detectWebGL: true,

  // Use cached results if available
  useCache: true
})
```

### Performance Thresholds

Define your own thresholds:

```javascript
const { profile } = await getHardwareInfo()

const thresholds = {
  mlModels: profile.performanceScore > 60,      // Can run ML locally
  gpuAcceleration: profile.performanceScore > 70,  // Can use GPU
  advancedFeatures: profile.performanceScore > 80,  // Top-tier features
  basicFeatures: profile.performanceScore > 30     // Minimum viable
}
```

---

## Tips and Tricks

### Tip 1: Use Performance Class for Quick Decisions

```javascript
// Good for most cases
const { profile } = await getHardwareInfo()

if (profile.performanceClass === 'premium') {
  enableEverything()
}
```

### Tip 2: Detect Early

```javascript
// Detect hardware on app load
let hardwareProfile

async function init() {
  hardwareProfile = await getHardwareInfo()
  applyHardwareSettings()
  showUI()
}

// Use profile throughout app
function heavyOperation() {
  if (!hardwareProfile || hardwareProfile.performanceScore < 50) {
    return showUpgradePrompt()
  }
  // Proceed with heavy operation
}
```

### Tip 3: Combine with Network Info

```javascript
const { profile } = await getHardwareInfo()

// Good device + fast network = load everything
if (profile.performanceScore > 70 && profile.network.effectiveType === '4g') {
  await loadHDAssets()
}
// Good device + slow network = optimized assets
else if (profile.performanceScore > 70) {
  await loadOptimizedAssets()
}
// Bad device = minimal assets
else {
  await loadMinimalAssets()
}
```

### Tip 4: Respect User Preferences

```javascript
// Check if user prefers reduced motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const { profile } = await getHardwareInfo()

if (!prefersReducedMotion && profile.performanceScore > 60) {
  enableAnimations()
}
```

### Tip 5: Handle Detection Failures

```javascript
const result = await getHardwareInfo()

if (!result.success) {
  console.error('Hardware detection failed:', result.error)

  // Use conservative defaults
  const safeProfile = {
    performanceScore: 50,
    performanceClass: 'medium'
  }

  // Proceed with safe defaults
  initApp(safeProfile)
} else {
  initApp(result.profile)
}
```

---

## Troubleshooting

### Issue: "Detection is slow"

**Solution:**
```javascript
// Skip detailed GPU detection
const result = await getHardwareInfo({
  detailedGPU: false,
  checkQuota: false
})

// Or use performance score only
const score = await getPerformanceScore()  // Much faster
```

### Issue: "WebGPU not detected even though supported"

**Solution:**
```javascript
// WebGPU requires HTTPS and user gesture
// Check browser compatibility
if (navigator.gpu) {
  const adapter = await navigator.gpu.requestAdapter()
  if (adapter) {
    console.log('WebGPU is available')
  }
}
```

### Issue: "Memory info is undefined"

**Solution:**
```javascript
// Memory API is Chrome-only and not always available
const { profile } = await getHardwareInfo()

if (!profile.memory.totalGB) {
  console.log('Memory API not available, using heuristics')
  // Use performance score as proxy
}
```

---

## Examples

### Example 1: Simple Feature Check

```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

async function canUseWebGPU() {
  const { profile } = await getHardwareInfo()
  return profile.gpu.webgpu.supported
}

// Use in component
if (await canUseWebGPU()) {
  initWebGPURenderer()
} else {
  initFallbackRenderer()
}
```

### Example 2: Adaptive ML Model Loading

```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

async function loadOptimalModel() {
  const { profile } = await getHardwareInfo()

  if (profile.performanceScore > 80 && profile.gpu.webgpu.supported) {
    // High-end device with GPU
    return loadModel('models/large-webgpu.onnx', {
      executionProviders: ['webgpu']
    })
  } else if (profile.performanceScore > 60) {
    // Mid-range device
    return loadModel('models/medium-wasm.onnx', {
      executionProviders: ['wasm']
    })
  } else {
    // Low-end device - use server-side
    return null
  }
}

// Use model
const model = await loadOptimalModel()

if (model) {
  // Run inference locally
  const result = await model.run(input)
} else {
  // Use server API
  const result = await fetch('/api/predict', {
    method: 'POST',
    body: JSON.stringify({ input })
  })
}
```

### Example 3: Quality Settings Menu

```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

async function suggestQualitySettings() {
  const { profile } = await getHardwareInfo()

  const score = profile.performanceScore

  if (score > 80) {
    return {
      graphics: 'ultra',
      effects: 'high',
      resolution: '1080p',
      fps: 60
    }
  } else if (score > 60) {
    return {
      graphics: 'high',
      effects: 'medium',
      resolution: '720p',
      fps: 60
    }
  } else if (score > 40) {
    return {
      graphics: 'medium',
      effects: 'low',
      resolution: '480p',
      fps: 30
    }
  } else {
    return {
      graphics: 'low',
      effects: 'off',
      resolution: '360p',
      fps: 30
    }
  }
}

// Show suggested settings
const suggested = await suggestQualitySettings()

showQualityDialog({
  recommended: suggested,
  current: userSettings,
  onApply: (settings) => applySettings(settings)
})
```

---

## Best Practices

1. **Detect Early:** Run hardware detection on app initialization

2. **Cache Results:** Hardware doesn't change during session, cache it

3. **Progressive Enhancement:** Start with basic features, add more if hardware allows

4. **Provide Options:** Let users override auto-detected settings

5. **Monitor Changes:** Listen for network changes, adjust behavior

6. **Use Conservative Defaults:** If detection fails, assume low-end device

7. **Test on Real Devices:** Test on various devices to validate thresholds

---

## Reference

### API Reference

```javascript
// Get full hardware profile
const result = await getHardwareInfo(options?)

// Get performance score only (faster)
const score = await getPerformanceScore()

// Detect features only
const features = await detectCapabilities()

// Clear cache
clearHardwareCache()

// Get detector instance
const detector = getDetector()
```

### Result Object

```typescript
interface DetectionResult {
  success: boolean
  profile?: HardwareProfile
  error?: string
  detectionTime: number  // ms
}

interface HardwareProfile {
  timestamp: number
  cpu: CPUInfo
  gpu: GPUInfo
  memory: MemoryInfo
  storage: StorageInfo
  network: NetworkInfo
  display: DisplayInfo
  browser: BrowserInfo
  features: FeatureSupport
  performanceScore: number  // 0-100
  performanceClass: 'premium' | 'high' | 'medium' | 'low'
}
```

---

## Next Steps

1. Try basic hardware detection in your app
2. Set performance thresholds for your features
3. Implement progressive enhancement
4. Monitor user hardware landscape
5. Adjust thresholds based on real usage data

**Need help?** [GitHub Discussions](https://github.com/SuperInstance/Hardware-Detection/discussions)

**Want to contribute?** [CONTRIBUTING.md](https://github.com/SuperInstance/Hardware-Detection/blob/main/CONTRIBUTING.md)
