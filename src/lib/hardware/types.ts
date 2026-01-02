/**
 * Hardware Detection Types
 *
 * Defines comprehensive hardware profile information for browser environments
 */

/**
 * CPU information and capabilities
 */
export interface CPUInfo {
  /** Number of logical processor cores */
  cores: number;
  /** Estimated concurrency capability (hardwareConcurrency) */
  concurrency: number;
  /** CPU architecture (if available) */
  architecture?: string;
  /** SIMD support detection */
  simd: {
    supported: boolean;
    type?: 'wasm' | 'native';
  };
  /** WebAssembly support */
  wasm: {
    supported: boolean;
    simd: boolean;
    threads: boolean;
    bulkMemory: boolean;
    exceptions: boolean;
  };
}

/**
 * GPU information and capabilities
 */
export interface GPUInfo {
  /** GPU availability flag */
  available: boolean;
  /** GPU vendor (if detectable) */
  vendor?: string;
  /** GPU renderer/model (if detectable) */
  renderer?: string;
  /** Estimated VRAM in MB (may be undefined) */
  vramMB?: number;
  /** WebGPU support */
  webgpu: {
    supported: boolean;
    adapter?: string;
  };
  /** WebGL support and version */
  webgl: {
    supported: boolean;
    version: 1 | 2 | 0;
    maxTextureSize?: number;
    maxRenderBufferSize?: number;
    vendor?: string;
    renderer?: string;
  };
}

/**
 * Memory information
 */
export interface MemoryInfo {
  /** Total RAM in GB (estimated from deviceMemory API) */
  totalGB?: number;
  /** Available memory flag (if API supported) */
  hasMemoryAPI: boolean;
  /** JS heap size limit (if available) */
  jsHeap?: {
    limit: number;
    used: number;
    total: number;
  };
}

/**
 * Storage information
 */
export interface StorageInfo {
  /** IndexedDB availability */
  indexedDB: {
    supported: boolean;
    available: boolean;
  };
  /** Storage quota and usage (if Storage API available) */
  quota?: {
    usage: number;
    quota: number;
    usagePercentage: number;
  };
  /** Estimated storage type */
  storageType?: 'persistent' | 'session' | 'unknown';
}

/**
 * Network information
 */
export interface NetworkInfo {
  /** Connection type (effectiveType) */
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  /** Estimated downlink speed in Mbps */
  downlinkMbps?: number;
  /** Round-trip time in ms */
  rtt?: number;
  /** Whether data saver is enabled */
  saveData?: boolean;
  /** Network API availability */
  hasNetworkAPI: boolean;
  /** Online status */
  online: boolean;
}

/**
 * Display and viewport information
 */
export interface DisplayInfo {
  /** Screen width in pixels */
  width: number;
  /** Screen height in pixels */
  height: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Color depth */
  colorDepth: number;
  /** Screen orientation */
  orientation?: 'portrait' | 'landscape';
}

/**
 * Browser and platform information
 */
export interface BrowserInfo {
  /** User agent (truncated for privacy) */
  userAgent: string;
  /** Browser name (detected) */
  browser: string;
  /** Browser version (major) */
  version?: string;
  /** Operating system */
  os: string;
  /** Platform type */
  platform: string;
  /** Touch support */
  touchSupport: boolean;
}

/**
 * Feature support matrix
 */
export interface FeatureSupport {
  /** Web Workers support */
  webWorkers: boolean;
  /** Service Worker support */
  serviceWorker: boolean;
  /** WebRTC support */
  webrtc: boolean;
  /** WebAssembly support */
  webassembly: boolean;
  /** WebSockets support */
  websockets: boolean;
  /** Geolocation support */
  geolocation: boolean;
  /** Notification support */
  notifications: boolean;
  /** Fullscreen API support */
  fullscreen: boolean;
  /** Picture-in-Picture support */
  pip: boolean;
  /** Web Bluetooth support */
  webBluetooth: boolean;
  /** Web USB support */
  webusb: boolean;
  /** File System Access API support */
  fileSystemAccess: boolean;
}

/**
 * Performance classification
 */
export type PerformanceClass =
  | 'low'        // Minimal device, limited resources
  | 'medium'     // Average device, moderate resources
  | 'high'       // Good device, capable hardware
  | 'premium';   // High-end device, excellent resources

/**
 * Complete hardware profile
 */
export interface HardwareProfile {
  /** Timestamp of detection */
  timestamp: number;
  /** CPU information */
  cpu: CPUInfo;
  /** GPU information */
  gpu: GPUInfo;
  /** Memory information */
  memory: MemoryInfo;
  /** Storage information */
  storage: StorageInfo;
  /** Network information */
  network: NetworkInfo;
  /** Display information */
  display: DisplayInfo;
  /** Browser information */
  browser: BrowserInfo;
  /** Feature support matrix */
  features: FeatureSupport;
  /** Calculated performance score (0-100) */
  performanceScore: number;
  /** Performance classification */
  performanceClass: PerformanceClass;
}

/**
 * Performance score breakdown
 */
export interface PerformanceScoreBreakdown {
  /** CPU component score (0-100) */
  cpu: number;
  /** GPU component score (0-100) */
  gpu: number;
  /** Memory component score (0-100) */
  memory: number;
  /** Network component score (0-100) */
  network: number;
  /** Overall score (0-100) */
  overall: number;
}

/**
 * Detection options
 */
export interface DetectionOptions {
  /** Whether to include detailed GPU info (may be slower) */
  detailedGPU?: boolean;
  /** Whether to check storage quota (may be slower) */
  checkQuota?: boolean;
  /** Whether to detect WebGL info */
  detectWebGL?: boolean;
  /** Timeout for detection operations in ms */
  timeout?: number;
}

/**
 * Detection result
 */
export interface DetectionResult {
  /** Success flag */
  success: boolean;
  /** Hardware profile (if successful) */
  profile?: HardwareProfile;
  /** Error message (if failed) */
  error?: string;
  /** Detection time in ms */
  detectionTime: number;
}
