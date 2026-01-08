# Hardware Detection - Developer Guide

**Version:** 1.0.0  
**Package:** `@superinstance/hardware`  
**Purpose:** Cross-platform hardware capability detection

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [API Reference](#api-reference)
5. [Type Definitions](#type-definitions)
6. [Usage Examples](#usage-examples)
7. [Platform-Specific Notes](#platform-specific-notes)
8. [Best Practices](#best-practices)

---

## Overview

Hardware Detection provides cross-platform capability detection for JavaScript applications. It identifies CPU, GPU, memory, storage, and other hardware capabilities to enable hardware-aware decision making.

### Key Features

- **Cross-Platform:** Works on macOS, Linux, and Windows
- **GPU Detection:** Identify GPUs and compute capabilities
- **CPU Profiling:** Detect cores, threads, frequency
- **Memory Analysis:** Track available and used memory
- **Capability Detection:** Identify hardware features
- **JEPA Scoring:** Calculate JEPA capability score (0-100)

### Use Cases

- **Hardware-Aware Optimization:** Adjust behavior based on hardware
- **Resource Management:** Make intelligent resource allocation decisions
- **Feature Detection:** Enable/disable features based on capabilities
- **Agent Selection:** Choose appropriate agents for hardware
- **Performance Tuning:** Optimize for specific hardware configurations

---

## Installation

```bash
npm install @superinstance/hardware
```

---

## Quick Start

```typescript
import { detectHardware } from '@superinstance/hardware';

// Detect hardware
const profile = await detectHardware();

console.log('Platform:', profile.platform);
console.log('CPU:', profile.cpu.model, `(${profile.cpu.cores} cores)`);
console.log('Memory:', `${profile.memory.available}/${profile.memory.total} GB`);
console.log('GPUs:', profile.gpu.map(g => g.name).join(', '));
console.log('JEPA Score:', profile.jepaScore);

// Check capabilities
if (profile.capabilities.has('gpu-acceleration')) {
  console.log('✅ GPU acceleration available');
}

if (profile.capabilities.has('microphone')) {
  console.log('✅ Microphone available');
}

// Use profile for decisions
if (profile.jepaScore > 50) {
  // Enable JEPA agent
} else {
  // Use text-only mode
}
```

---

## API Reference

### Functions

#### `detectHardware()`

Detect hardware capabilities.

```typescript
async function detectHardware(): Promise<HardwareProfile>
```

**Returns:** Hardware profile

**Example:**

```typescript
const profile = await detectHardware();
```

#### `calculateJEPAScore()`

Calculate JEPA capability score.

```typescript
function calculateJEPAScore(profile: HardwareProfile): number
```

**Parameters:**
- `profile`: Hardware profile

**Returns:** JEPA score (0-100)

**Example:**

```typescript
const score = calculateJEPAScore(profile);
console.log(`JEPA Score: ${score}/100`);
```

---

## Type Definitions

### `HardwareProfile`

```typescript
interface HardwareProfile {
  /** Platform (darwin, linux, windows) */
  platform: 'darwin' | 'linux' | 'windows';
  
  /** CPU profile */
  cpu: CPUProfile;
  
  /** GPU profiles (multiple GPUs possible) */
  gpu: GPUProfile[];
  
  /** Memory profile */
  memory: MemoryProfile;
  
  /** Storage profile */
  storage: StorageProfile;
  
  /** Capabilities */
  capabilities: Set<string>;
  
  /** JEPA capability score (0-100) */
  jepaScore: number;
}
```

### `CPUProfile`

```typescript
interface CPUProfile {
  /** CPU model */
  model: string;
  
  /** Physical cores */
  cores: number;
  
  /** Logical threads */
  threads: number;
  
  /** Frequency (GHz) */
  frequency: number;
  
  /** Architecture */
  architecture: string;
}
```

### `GPUProfile`

```typescript
interface GPUProfile {
  /** GPU name */
  name: string;
  
  /** Vendor (NVIDIA, AMD, Intel) */
  vendor: string;
  
  /** Memory (MB) */
  memory: number;
  
  /** Compute capability (CUDA) */
  computeCapability?: string;
  
  /** Driver version */
  driverVersion?: string;
}
```

### `MemoryProfile`

```typescript
interface MemoryProfile {
  /** Total memory (GB) */
  total: number;
  
  /** Available memory (GB) */
  available: number;
  
  /** Used memory (GB) */
  used: number;
}
```

### `StorageProfile`

```typescript
interface StorageProfile {
  /** Total storage (GB) */
  total: number;
  
  /** Available storage (GB) */
  available: number;
  
  /** Storage type */
  type: 'ssd' | 'hdd' | 'nvme';
}
```

---

## Usage Examples

### Example 1: Hardware-Aware Optimization

```typescript
import { detectHardware } from '@superinstance/hardware';

const profile = await detectHardware();

// Adjust parallelism based on CPU cores
const maxParallel = Math.min(profile.cpu.cores, 8);
console.log(`Using ${maxParallel} parallel workers`);

// Enable GPU acceleration if available
if (profile.capabilities.has('gpu-acceleration')) {
  console.log('Enabling GPU acceleration');
  enableGPUAcceleration();
} else {
  console.log('Using CPU-only mode');
}

// Adjust memory usage based on available memory
const maxMemoryUsage = profile.memory.available * 0.8; // Use 80%
console.log(`Max memory usage: ${maxMemoryUsage} GB`);
```

### Example 2: JEPA Score-Based Decisions

```typescript
const profile = await detectHardware();

if (profile.jepaScore > 70) {
  // High JEPA score - enable full features
  console.log('✅ High-end hardware detected');
  enableAllFeatures();
  enableHighQualityMode();
} else if (profile.jepaScore > 40) {
  // Medium JEPA score - enable basic features
  console.log('⚠️ Mid-range hardware detected');
  enableBasicFeatures();
  enableMediumQualityMode();
} else {
  // Low JEPA score - enable minimal features
  console.log('⚠️ Low-end hardware detected');
  enableMinimalFeatures();
  enableLowQualityMode();
}
```

### Example 3: Resource Management

```typescript
const profile = await detectHardware();

// Calculate safe resource limits
const safeLimits = {
  maxParallelAgents: Math.floor(profile.cpu.cores * 0.75), // Use 75% of cores
  maxMemoryUsage: profile.memory.available * 0.8, // Use 80% of memory
  maxGPUMemoryUsage: profile.gpu[0]?.memory * 0.9 || 0, // Use 90% of GPU memory
};

console.log('Safe resource limits:', safeLimits);

// Use in MPC initialization
await mpcController.initialize({
  maxParallelAgents: safeLimits.maxParallelAgents,
  // ... other config
});
```

---

## Platform-Specific Notes

### macOS (darwin)

- GPU detection requires Metal-supporting GPUs
- Memory detection is accurate
- CPU frequency detection is approximate

### Linux

- GPU detection via `lspci` or CUDA
- Memory detection via `/proc/meminfo`
- CPU info via `/proc/cpuinfo`

### Windows

- GPU detection via WMI or DirectX
- Memory detection via WMI
- CPU info via WMI or environment variables

---

## Best Practices

### 1. Cache Hardware Profile

```typescript
// Detect hardware once and cache
let cachedProfile: HardwareProfile | null = null;

async function getHardwareProfile(): Promise<HardwareProfile> {
  if (!cachedProfile) {
    cachedProfile = await detectHardware();
  }
  return cachedProfile;
}
```

### 2. Use Graceful Degradation

```typescript
const profile = await detectHardware();

// Try to use GPU, fall back to CPU
if (profile.capabilities.has('gpu-acceleration')) {
  try {
    return await runWithGPU();
  } catch (error) {
    console.warn('GPU acceleration failed, falling back to CPU');
    return await runWithCPU();
  }
} else {
  return await runWithCPU();
}
```

### 3. Monitor Resource Usage

```typescript
// Periodically check available resources
setInterval(async () => {
  const profile = await detectHardware();
  
  console.log(`Available memory: ${profile.memory.available} GB`);
  
  if (profile.memory.available < 2) {
    console.warn('⚠️ Low memory, consider reducing usage');
  }
}, 60000); // Check every minute
```

---

## License

MIT License
