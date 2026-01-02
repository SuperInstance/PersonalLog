/**
 * Hardware Detection Usage Examples
 *
 * This file demonstrates how to use the hardware detection system
 * to implement adaptive behavior in PersonalLog
 */

import {
  getHardwareInfo,
  getPerformanceScore,
  detectCapabilities,
  type HardwareProfile,
  type PerformanceClass
} from './detector';

/**
 * Example 1: Basic hardware detection
 */
export async function example1_BasicDetection() {
  console.log('=== Basic Hardware Detection ===\n');

  const result = await getHardwareInfo();

  if (!result.success || !result.profile) {
    console.error('Detection failed:', result.error);
    return;
  }

  const profile = result.profile;

  // Log basic information
  console.log('CPU:');
  console.log(`  Cores: ${profile.cpu.cores}`);
  console.log(`  SIMD: ${profile.cpu.simd.supported ? 'Yes' : 'No'}`);
  console.log(`  WASM: ${profile.cpu.wasm.supported ? 'Yes' : 'No'}`);

  console.log('\nGPU:');
  console.log(`  Available: ${profile.gpu.available ? 'Yes' : 'No'}`);
  console.log(`  WebGL: ${profile.gpu.webgl.version > 0 ? `v${profile.gpu.webgl.version}` : 'No'}`);
  console.log(`  WebGPU: ${profile.gpu.webgpu.supported ? 'Yes' : 'No'}`);
  console.log(`  VRAM: ${profile.gpu.vramMB ? `${profile.gpu.vramMB}MB` : 'Unknown'}`);

  console.log('\nMemory:');
  console.log(`  Total RAM: ${profile.memory.totalGB ? `${profile.memory.totalGB}GB` : 'Unknown'}`);

  console.log('\nPerformance:');
  console.log(`  Score: ${profile.performanceScore}/100`);
  console.log(`  Class: ${profile.performanceClass}`);
  console.log(`  Detection Time: ${result.detectionTime.toFixed(2)}ms`);
}

/**
 * Example 2: Adaptive AI model selection
 */
export async function example2_AdaptiveAIModel() {
  console.log('\n=== Adaptive AI Model Selection ===\n');

  const score = await getPerformanceScore();

  let modelName: string;
  let maxTokens: number;
  let enableStreaming: boolean;

  if (score >= 80) {
    // Premium: Use most powerful model
    modelName = 'gpt-4-turbo';
    maxTokens = 8192;
    enableStreaming = true;
  } else if (score >= 60) {
    // High: Use standard model
    modelName = 'gpt-4';
    maxTokens = 4096;
    enableStreaming = true;
  } else if (score >= 40) {
    // Medium: Use lightweight model
    modelName = 'gpt-3.5-turbo';
    maxTokens = 2048;
    enableStreaming = false;
  } else {
    // Low: Use minimal model
    modelName = 'gpt-3.5-turbo-16k';
    maxTokens = 1024;
    enableStreaming = false;
  }

  console.log(`Performance Score: ${score}/100`);
  console.log(`Selected Model: ${modelName}`);
  console.log(`Max Tokens: ${maxTokens}`);
  console.log(`Streaming: ${enableStreaming ? 'Enabled' : 'Disabled'}`);

  return { modelName, maxTokens, enableStreaming };
}

/**
 * Example 3: Feature-based optimization
 */
export async function example3_FeatureOptimization() {
  console.log('\n=== Feature-Based Optimization ===\n');

  const features = await detectCapabilities();
  const optimizations: string[] = [];

  // Check for Web Worker support
  if (features.webWorkers) {
    optimizations.push('Enable background processing with Web Workers');
  } else {
    optimizations.push('Use main thread for all processing');
  }

  // Check for WebGL
  const result = await getHardwareInfo({ detailedGPU: false });
  if (result.profile?.gpu.webgl.supported) {
    optimizations.push('Enable GPU-accelerated visualizations');
  } else {
    optimizations.push('Use CPU-based rendering (slower)');
  }

  // Check for Service Worker
  if (features.serviceWorker) {
    optimizations.push('Enable offline mode with Service Worker');
  }

  // Check for IndexedDB
  if (result.profile?.storage.indexedDB.available) {
    optimizations.push('Use IndexedDB for local storage');
  } else {
    optimizations.push('Fall back to memory storage');
  }

  // Check network
  if (result.profile?.network.effectiveType === '4g') {
    optimizations.push('Enable aggressive prefetching');
  } else if (result.profile?.network.effectiveType === '2g' ||
             result.profile?.network.effectiveType === 'slow-2g') {
    optimizations.push('Disable prefetch, use minimal assets');
  }

  optimizations.forEach(opt => console.log(`• ${opt}`));

  return optimizations;
}

/**
 * Example 4: Performance class-based configuration
 */
export async function example4_PerformanceClassConfig() {
  console.log('\n=== Performance Class Configuration ===\n');

  const result = await getHardwareInfo();
  const profile = result.profile;

  if (!profile) {
    console.error('Failed to get hardware profile');
    return;
  }

  const config = getConfigForPerformanceClass(profile.performanceClass);

  console.log(`Performance Class: ${profile.performanceClass}`);
  console.log('\nConfiguration:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  });

  return config;
}

function getConfigForPerformanceClass(perfClass: PerformanceClass) {
  switch (perfClass) {
    case 'premium':
      return {
        aiModel: 'gpt-4-turbo',
        maxCacheSizeMB: 500,
        enableAnimations: true,
        enable3D: true,
        enablePrefetch: true,
        maxConcurrentRequests: 10,
        batchSize: 100,
        compressionLevel: 'high'
      };

    case 'high':
      return {
        aiModel: 'gpt-4',
        maxCacheSizeMB: 250,
        enableAnimations: true,
        enable3D: false,
        enablePrefetch: true,
        maxConcurrentRequests: 6,
        batchSize: 50,
        compressionLevel: 'medium'
      };

    case 'medium':
      return {
        aiModel: 'gpt-3.5-turbo',
        maxCacheSizeMB: 100,
        enableAnimations: false,
        enable3D: false,
        enablePrefetch: true,
        maxConcurrentRequests: 4,
        batchSize: 25,
        compressionLevel: 'low'
      };

    case 'low':
      return {
        aiModel: 'gpt-3.5-turbo-16k',
        maxCacheSizeMB: 50,
        enableAnimations: false,
        enable3D: false,
        enablePrefetch: false,
        maxConcurrentRequests: 2,
        batchSize: 10,
        compressionLevel: 'none'
      };
  }
}

/**
 * Example 5: Real-time monitoring and adaptation
 */
export class AdaptivePerformanceManager {
  private profile: HardwareProfile | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  async initialize() {
    // Get initial profile
    const result = await getHardwareInfo();
    this.profile = result.profile || null;

    // Monitor network changes
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      conn.addEventListener('change', () => this.handleNetworkChange());
    }

    // Periodically re-check performance
    this.checkInterval = setInterval(() => {
      this.performanceCheck();
    }, 60000); // Every minute
  }

  private handleNetworkChange() {
    console.log('Network changed, updating configuration...');
    this.updateConfiguration();
  }

  private performanceCheck() {
    // Detect performance degradation
    const memoryPressure = this.checkMemoryPressure();
    if (memoryPressure) {
      console.warn('Memory pressure detected, reducing cache...');
      this.reduceCacheSize();
    }
  }

  private checkMemoryPressure(): boolean {
    if (!this.profile?.memory.jsHeap) return false;

    const { used, total } = this.profile.memory.jsHeap;
    const usagePercent = (used / total) * 100;

    return usagePercent > 80; // 80% threshold
  }

  private updateConfiguration() {
    // Re-detect and update app behavior
    getHardwareInfo().then(result => {
      if (result.profile) {
        this.profile = result.profile;
        console.log(`Updated performance class: ${result.profile.performanceClass}`);
        // Emit event or update global config
      }
    });
  }

  private reduceCacheSize() {
    // Implement cache reduction logic
    console.log('Reducing cache size...');
  }

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

/**
 * Example 6: Progressive enhancement
 */
export async function example6_ProgressiveEnhancement() {
  console.log('\n=== Progressive Enhancement ===\n');

  const result = await getHardwareInfo({ detailedGPU: false });
  const profile = result.profile;

  if (!profile) {
    console.error('Failed to get hardware profile');
    return;
  }

  const features = {
    basic: true, // Always available
    enhanced: profile.performanceScore >= 40,
    advanced: profile.performanceScore >= 60,
    premium: profile.performanceScore >= 80
  };

  console.log('Available Feature Tiers:');
  console.log(`  Basic: ${features.basic ? '✓' : '✗'}`);
  console.log(`  Enhanced: ${features.enhanced ? '✓' : '✗'}`);
  console.log(`  Advanced: ${features.advanced ? '✓' : '✗'}`);
  console.log(`  Premium: ${features.premium ? '✓' : '✗'}`);

  return features;
}

/**
 * Example 7: Detect and warn about limitations
 */
export async function example7_DetectLimitations() {
  console.log('\n=== Detecting Limitations ===\n');

  const result = await getHardwareInfo({ detailedGPU: false });
  const profile = result.profile;

  if (!profile) {
    console.error('Failed to get hardware profile');
    return;
  }

  const warnings: string[] = [];

  // Check for low memory
  if (profile.memory.totalGB && profile.memory.totalGB < 4) {
    warnings.push('Low memory detected (<4GB). Some features may be slow.');
  }

  // Check for slow network
  if (profile.network.effectiveType === '2g' || profile.network.effectiveType === 'slow-2g') {
    warnings.push('Slow network detected. Data usage will be minimized.');
  }

  // Check for lack of GPU acceleration
  if (!profile.gpu.webgl.supported && !profile.gpu.webgpu.supported) {
    warnings.push('No GPU acceleration available. Visualizations may be slow.');
  }

  // Check for data saver mode
  if (profile.network.saveData) {
    warnings.push('Data saver mode is enabled. High-quality media disabled.');
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  } else {
    console.log('✓ No limitations detected. Full experience available.');
  }

  return warnings;
}

// Export all examples for testing
export const examples = {
  basic: example1_BasicDetection,
  adaptiveAI: example2_AdaptiveAIModel,
  features: example3_FeatureOptimization,
  perfConfig: example4_PerformanceClassConfig,
  progressive: example6_ProgressiveEnhancement,
  limitations: example7_DetectLimitations
};
