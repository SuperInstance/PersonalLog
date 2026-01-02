/**
 * Hardware Detection Module
 *
 * Comprehensive hardware capability detection for browser environments
 * Provides non-blocking, cross-browser compatible hardware profiling
 */

import type {
  HardwareProfile,
  CPUInfo,
  GPUInfo,
  MemoryInfo,
  StorageInfo,
  NetworkInfo,
  DisplayInfo,
  BrowserInfo,
  FeatureSupport,
  PerformanceScoreBreakdown,
  PerformanceClass,
  DetectionOptions,
  DetectionResult
} from './types';

/**
 * Main hardware detector class
 */
export class HardwareDetector {
  private cache: HardwareProfile | null = null;
  private detectionInProgress = false;

  /**
   * Get complete hardware profile with optional caching
   */
  async getHardwareInfo(options: DetectionOptions = {}, useCache = true): Promise<DetectionResult> {
    const startTime = performance.now();

    // Return cached profile if available
    if (useCache && this.cache) {
      return {
        success: true,
        profile: this.cache,
        detectionTime: performance.now() - startTime
      };
    }

    // Prevent concurrent detections
    if (this.detectionInProgress) {
      return {
        success: false,
        error: 'Detection already in progress',
        detectionTime: performance.now() - startTime
      };
    }

    try {
      this.detectionInProgress = true;

      // Run all detections in parallel for speed
      const [
        cpu,
        gpu,
        memory,
        storage,
        network,
        display,
        browser,
        features
      ] = await Promise.all([
        this.detectCPU(),
        this.detectGPU(options.detailedGPU, options.detectWebGL),
        this.detectMemory(),
        this.detectStorage(options.checkQuota),
        this.detectNetwork(),
        this.detectDisplay(),
        this.detectBrowser(),
        this.detectFeatures()
      ]);

      const profile: HardwareProfile = {
        timestamp: Date.now(),
        cpu,
        gpu,
        memory,
        storage,
        network,
        display,
        browser,
        features,
        performanceScore: 0, // Will be calculated
        performanceClass: 'medium' // Will be calculated
      };

      // Calculate performance metrics
      const scoreBreakdown = this.calculatePerformanceScore(profile);
      profile.performanceScore = scoreBreakdown.overall;
      profile.performanceClass = this.classifyPerformance(scoreBreakdown.overall);

      // Cache the result
      this.cache = profile;

      return {
        success: true,
        profile,
        detectionTime: performance.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        detectionTime: performance.now() - startTime
      };
    } finally {
      this.detectionInProgress = false;
    }
  }

  /**
   * Get performance score only (faster than full profile)
   */
  async getPerformanceScore(): Promise<number> {
    const result = await this.getHardwareInfo({
      detailedGPU: false,
      checkQuota: false,
      detectWebGL: false
    });

    return result.profile?.performanceScore ?? 50;
  }

  /**
   * Detect feature support matrix only
   */
  async detectCapabilities(): Promise<FeatureSupport> {
    return this.detectFeatures();
  }

  /**
   * Clear cached hardware profile
   */
  clearCache(): void {
    this.cache = null;
  }

  // ==================== CPU Detection ====================

  private async detectCPU(): Promise<CPUInfo> {
    const cores = navigator.hardwareConcurrency || 4;

    return {
      cores,
      concurrency: cores,
      architecture: this.detectArchitecture(),
      simd: await this.detectSIMD(),
      wasm: this.detectWasm()
    };
  }

  private detectArchitecture(): string | undefined {
    // Try to detect from user agent
    const ua = navigator.userAgent;
    if (ua.includes('x86_64') || ua.includes('x86-64') || ua.includes('Win64') || ua.includes('WOW64')) {
      return 'x86_64';
    }
    if (ua.includes('i686') || ua.includes('i386')) {
      return 'x86';
    }
    if (ua.includes('arm') || ua.includes('aarch64')) {
      return ua.includes('aarch64') ? 'arm64' : 'arm';
    }
    return undefined;
  }

  private async detectSIMD(): Promise<{ supported: boolean; type?: 'wasm' | 'native' }> {
    // Check for WebAssembly SIMD
    if (this.detectWasm().simd) {
      return { supported: true, type: 'wasm' };
    }

    // Check for native SIMD in performance API
    try {
      const timeline = await performance.measureUserAgentSpecificMemory?.();
      if (timeline) {
        return { supported: true, type: 'native' };
      }
    } catch {}

    return { supported: false };
  }

  private detectWasm(): CPUInfo['wasm'] {
    const supported = typeof WebAssembly === 'object';

    if (!supported) {
      return {
        supported: false,
        simd: false,
        threads: false,
        bulkMemory: false,
        exceptions: false
      };
    }

    // Detect WebAssembly features
    let simd = false;
    let threads = false;
    let bulkMemory = false;
    let exceptions = false;

    try {
      // Check for SIMD (requires compilation test)
      simd = this.testWasmSimd();

      // Check for threads (SharedArrayBuffer)
      threads = typeof SharedArrayBuffer !== 'undefined';

      // Check for bulk memory operations
      bulkMemory = WebAssembly.validate(
        new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x00, 0x01, 0x00, 0x01,
          0x05, 0x03, 0x01, 0x00, 0x01, 0x07, 0x11,
          0x02, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79,
          0x02, 0x00, 0x08, 0x73, 0x68, 0x61, 0x72, 0x65,
          0x64, 0x00, 0x00
        ])
      );

      // Check for exceptions
      exceptions = WebAssembly.validate(
        new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
          0x01, 0x00, 0x01, 0x08, 0x01, 0x00
        ])
      );
    } catch {}

    return { supported: true, simd, threads, bulkMemory, exceptions };
  }

  private testWasmSimd(): boolean {
    try {
      // Simple SIMD test - try to validate a SIMD module
      const simdModule = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x00, 0x01, 0x00,
        0x03, 0x02, 0x01, 0x00,
        0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0xfd, 0x0f, 0xfd, 0x0c, 0x0b
      ]);
      return WebAssembly.validate(simdModule);
    } catch {
      return false;
    }
  }

  // ==================== GPU Detection ====================

  private async detectGPU(detailed = false, detectWebGL = true): Promise<GPUInfo> {
    const info: GPUInfo = {
      available: false,
      webgpu: { supported: false },
      webgl: { supported: false, version: 0 }
    };

    // Detect WebGPU
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          info.webgpu.supported = true;
          info.webgpu.adapter = adapter.adapter?.name || 'unknown';
          info.available = true;
        }
      } catch {}
    }

    // Detect WebGL
    if (detectWebGL) {
      const webglInfo = this.detectWebGL();
      info.webgl = webglInfo;
      if (webglInfo.supported) {
        info.available = true;
        info.vendor = webglInfo.vendor;
        info.renderer = webglInfo.renderer;
      }
    }

    // Estimate VRAM (very rough estimate)
    if (info.webgl.supported || info.webgpu.supported) {
      info.vramMB = this.estimateVRAM();
    }

    return info;
  }

  private detectWebGL(): GPUInfo['webgl'] {
    const result: GPUInfo['webgl'] = { supported: false, version: 0 };

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (gl instanceof WebGLRenderingContext) {
        result.supported = true;
        result.version = gl instanceof WebGL2RenderingContext ? 2 : 1;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }

        result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        result.maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      }
    } catch {}

    return result;
  }

  private estimateVRAM(): number {
    // Rough estimation based on heuristics
    // This is not accurate but gives a ballpark figure
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMac = ua.includes('Macintosh');

    if (isMobile) {
      return 1024; // 1GB typical for mobile
    }

    if (isMac) {
      if (ua.includes('Apple M1') || ua.includes('Apple M2') || ua.includes('Apple M3')) {
        return 7168; // Apple Silicon has unified memory, estimate high
      }
    }

    // Desktop GPUs
    if (ua.includes('NVIDIA')) {
      if (ua.includes('RTX 40') || ua.includes('RTX 30')) return 12288; // High-end
      if (ua.includes('GTX') || ua.includes('RTX 20')) return 8192; // Mid-high
      return 4096; // Mid
    }

    if (ua.includes('AMD') || ua.includes('Radeon')) {
      if (ua.includes('RX 6') || ua.includes('RX 7')) return 8192; // High-end
      return 4096; // Mid
    }

    if (ua.includes('Intel')) {
      return 2048; // Integrated graphics
    }

    return 3072; // Default estimate
  }

  // ==================== Memory Detection ====================

  private async detectMemory(): Promise<MemoryInfo> {
    const info: MemoryInfo = {
      totalGB: undefined,
      hasMemoryAPI: false,
      jsHeap: undefined
    };

    // Check device memory API (Chrome-only)
    if ('deviceMemory' in navigator) {
      info.totalGB = (navigator as any).deviceMemory;
      info.hasMemoryAPI = true;
    }

    // Check JS heap if performance.memory available
    if ('memory' in performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      info.jsHeap = {
        limit: mem.jsHeapSizeLimit,
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize
      };
    }

    return info;
  }

  // ==================== Storage Detection ====================

  private async detectStorage(checkQuota = false): Promise<StorageInfo> {
    const info: StorageInfo = {
      indexedDB: {
        supported: !!window.indexedDB,
        available: false
      }
    };

    // Test IndexedDB availability
    if (window.indexedDB) {
      try {
        const test = await new Promise<boolean>((resolve) => {
          const request = window.indexedDB.open('__hardware_test__');
          request.onerror = () => resolve(false);
          request.onsuccess = () => {
            request.result.close();
            window.indexedDB.deleteDatabase('__hardware_test__');
            resolve(true);
          };
        });
        info.indexedDB.available = test;
      } catch {
        info.indexedDB.available = false;
      }
    }

    // Check storage quota if requested
    if (checkQuota && 'storage' in navigator && 'estimate' in (navigator as any).storage) {
      try {
        const estimate = await (navigator as any).storage.estimate();
        if (estimate) {
          info.quota = {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
            usagePercentage: estimate.quota > 0 ? (estimate.usage / estimate.quota) * 100 : 0
          };
        }
      } catch {}
    }

    // Determine storage type
    if (window.localStorage && window.sessionStorage) {
      try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
        info.storageType = 'persistent';
      } catch {
        info.storageType = 'session';
      }
    }

    return info;
  }

  // ==================== Network Detection ====================

  private async detectNetwork(): Promise<NetworkInfo> {
    const info: NetworkInfo = {
      hasNetworkAPI: false,
      online: navigator.onLine
    };

    // Check Network Information API
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (conn) {
      info.hasNetworkAPI = true;
      info.effectiveType = conn.effectiveType;
      info.downlinkMbps = conn.downlink;
      info.rtt = conn.rtt;
      info.saveData = conn.saveData;

      // Listen for changes (optional)
      conn.addEventListener?.('change', () => {
        // Could trigger updates here
      });
    }

    return info;
  }

  // ==================== Display Detection ====================

  private async detectDisplay(): Promise<DisplayInfo> {
    return {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
      colorDepth: window.screen.colorDepth,
      orientation: this.detectOrientation()
    };
  }

  private detectOrientation(): 'portrait' | 'landscape' {
    const orientation = (screen.orientation || {}).type;
    if (orientation) {
      return orientation.includes('portrait') ? 'portrait' : 'landscape';
    }
    return window.screen.height > window.screen.width ? 'portrait' : 'landscape';
  }

  // ==================== Browser Detection ====================

  private async detectBrowser(): Promise<BrowserInfo> {
    const ua = navigator.userAgent;
    const browser = this.detectBrowserName(ua);
    const version = this.detectBrowserVersion(ua, browser);

    return {
      userAgent: this.sanitizeUserAgent(ua),
      browser,
      version,
      os: this.detectOS(ua),
      platform: navigator.platform,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };
  }

  private detectBrowserName(ua: string): string {
    if (ua.includes('Firefox') && !ua.includes('Seamonkey')) return 'Firefox';
    if (ua.includes('Seamonkey')) return 'Seamonkey';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
  }

  private detectBrowserVersion(ua: string, browser: string): string | undefined {
    try {
      const match = ua.match(new RegExp(`${browser}\\/(\\d+\\.\\d+)`));
      return match?.[1];
    } catch {
      return undefined;
    }
  }

  private detectOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private sanitizeUserAgent(ua: string): string {
    // Truncate for privacy
    return ua.substring(0, 200);
  }

  // ==================== Feature Detection ====================

  private async detectFeatures(): Promise<FeatureSupport> {
    return {
      webWorkers: typeof Worker !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webrtc: typeof RTCPeerConnection !== 'undefined',
      webassembly: typeof WebAssembly !== 'undefined',
      websockets: typeof WebSocket !== 'undefined',
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      fullscreen: 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document,
      pip: 'pictureInPictureEnabled' in document || 'webkitPictureInPictureEnabled' in document,
      webBluetooth: 'bluetooth' in navigator,
      webusb: 'usb' in navigator,
      fileSystemAccess: 'showOpenFilePicker' in window
    };
  }

  // ==================== Performance Scoring ====================

  private calculatePerformanceScore(profile: HardwareProfile): PerformanceScoreBreakdown {
    // CPU Score (0-100)
    const cpuScore = Math.min(100, (profile.cpu.cores / 16) * 100 + (profile.cpu.wasm.simd ? 10 : 0) + (profile.cpu.wasm.threads ? 10 : 0));

    // GPU Score (0-100)
    let gpuScore = 0;
    if (profile.gpu.webgl.supported) {
      gpuScore += 30 + (profile.gpu.webgl.version * 20);
    }
    if (profile.gpu.webgpu.supported) {
      gpuScore += 50;
    }
    gpuScore = Math.min(100, gpuScore);

    // Memory Score (0-100)
    let memoryScore = 50;
    if (profile.memory.totalGB) {
      memoryScore = Math.min(100, (profile.memory.totalGB / 16) * 100);
    }

    // Network Score (0-100)
    let networkScore = 50;
    if (profile.network.effectiveType) {
      const typeScores = { 'slow-2g': 10, '2g': 30, '3g': 60, '4g': 90 };
      networkScore = typeScores[profile.network.effectiveType] || 50;
    }

    // Overall score (weighted average)
    const overall = Math.round(
      cpuScore * 0.35 +
      gpuScore * 0.30 +
      memoryScore * 0.20 +
      networkScore * 0.15
    );

    return {
      cpu: Math.round(cpuScore),
      gpu: Math.round(gpuScore),
      memory: Math.round(memoryScore),
      network: Math.round(networkScore),
      overall: Math.round(overall)
    };
  }

  private classifyPerformance(score: number): PerformanceClass {
    if (score >= 80) return 'premium';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
}

// ==================== Convenience Functions ====================

/**
 * Global detector instance
 */
const detector = new HardwareDetector();

/**
 * Get complete hardware profile
 */
export async function getHardwareInfo(options?: DetectionOptions): Promise<DetectionResult> {
  return detector.getHardwareInfo(options);
}

/**
 * Get performance score (0-100)
 */
export async function getPerformanceScore(): Promise<number> {
  return detector.getPerformanceScore();
}

/**
 * Detect feature support matrix
 */
export async function detectCapabilities(): Promise<FeatureSupport> {
  return detector.detectCapabilities();
}

/**
 * Clear cached hardware profile
 */
export function clearHardwareCache(): void {
  detector.clearCache();
}

/**
 * Get detector instance for advanced usage
 */
export function getDetector(): HardwareDetector {
  return detector;
}
