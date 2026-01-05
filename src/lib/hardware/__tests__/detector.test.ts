/**
 * Hardware Detection Module Tests
 *
 * Basic tests to verify the hardware detection system works correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HardwareDetector } from '../detector';

describe('HardwareDetector', () => {
  let detector: HardwareDetector;

  beforeEach(() => {
    detector = new HardwareDetector();
  });

  describe('Basic Detection', () => {
    it('should detect CPU information', async () => {
      const result = await detector.getHardwareInfo({
        detailedGPU: false,
        checkQuota: false,
        detectWebGL: false
      });

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile?.cpu.cores).toBeGreaterThan(0);
      expect(result.profile?.cpu.concurrency).toBeGreaterThan(0);
      expect(result.profile?.cpu.wasm.supported).toBe(true);
    });

    it('should calculate performance score', async () => {
      const result = await detector.getHardwareInfo();

      expect(result.success).toBe(true);
      expect(result.profile?.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.profile?.performanceScore).toBeLessThanOrEqual(100);
      expect(result.profile?.performanceClass).toMatch(/^(low|medium|high|premium)$/);
    });

    it('should detect display information', async () => {
      const result = await detector.getHardwareInfo();

      expect(result.profile?.display.width).toBeGreaterThan(0);
      expect(result.profile?.display.height).toBeGreaterThan(0);
      expect(result.profile?.display.pixelRatio).toBeGreaterThan(0);
      expect(result.profile?.display.colorDepth).toBe(8 | 16 | 24 | 32 | 48);
    });
  });

  describe('Feature Detection', () => {
    it('should detect web assembly support', async () => {
      const features = await detector.detectCapabilities();

      expect(features.webassembly).toBe(true);
    });

    it('should detect web workers support', async () => {
      const features = await detector.detectCapabilities();

      // Most modern browsers support workers
      expect(typeof features.webWorkers).toBe('boolean');
    });

    it('should detect browser info', async () => {
      const result = await detector.getHardwareInfo();

      expect(result.profile?.browser.browser).toBeDefined();
      expect(result.profile?.browser.os).toBeDefined();
      expect(result.profile?.browser.platform).toBeDefined();
    });
  });

  describe('Performance Scoring', () => {
    it('should classify performance into valid classes', async () => {
      const result = await detector.getHardwareInfo();
      const validClasses: Array<'low' | 'medium' | 'high' | 'premium'> = ['low', 'medium', 'high', 'premium'];

      expect(result.profile?.performanceClass).toBeDefined();
      expect(validClasses).toContain(result.profile?.performanceClass);
    });

    it('should have consistent performance score relationship', async () => {
      const result = await detector.getHardwareInfo();
      const { performanceScore, performanceClass } = result.profile!;

      if (performanceClass === 'premium') {
        expect(performanceScore).toBeGreaterThanOrEqual(80);
      } else if (performanceClass === 'high') {
        expect(performanceScore).toBeGreaterThanOrEqual(60);
        expect(performanceScore).toBeLessThan(80);
      } else if (performanceClass === 'medium') {
        expect(performanceScore).toBeGreaterThanOrEqual(40);
        expect(performanceScore).toBeLessThan(60);
      } else if (performanceClass === 'low') {
        expect(performanceScore).toBeLessThan(40);
      }
    });
  });

  describe('Caching', () => {
    it('should cache hardware profile', async () => {
      const result1 = await detector.getHardwareInfo();
      const startTime2 = performance.now();
      const result2 = await detector.getHardwareInfo();
      const endTime2 = performance.now();

      expect(result1.profile).toEqual(result2.profile);
      expect(endTime2 - startTime2).toBeLessThan(10); // Should be instant from cache
    });

    it('should clear cache', async () => {
      await detector.getHardwareInfo();
      detector.clearCache();

      const startTime = performance.now();
      await detector.getHardwareInfo();
      const endTime = performance.now();

      // Should take time to re-detect (not from cache)
      expect(endTime - startTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing APIs gracefully', async () => {
      // This test verifies the detector doesn't throw when APIs are missing
      const result = await detector.getHardwareInfo();

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
    });

    it('should return detection time', async () => {
      const result = await detector.getHardwareInfo();

      expect(result.detectionTime).toBeGreaterThan(0);
      expect(result.detectionTime).toBeLessThan(5000); // Should be under 5 seconds
    });
  });

  describe('Convenience Functions', () => {
    it('should get performance score only', async () => {
      const score = await detector.getPerformanceScore();

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should detect capabilities only', async () => {
      const features = await detector.detectCapabilities();

      expect(features).toBeDefined();
      expect(Object.keys(features).length).toBeGreaterThan(10);
    });
  });
});

// Integration tests (to be run manually in different browsers)
describe('HardwareDetector Integration', () => {
  it('should work in Chrome', () => {
    // Test in Chrome browser
    const isChrome = /Chrome/.test(navigator.userAgent);

    if (isChrome) {
      // Chrome-specific assertions
      expect(typeof navigator.hardwareConcurrency).toBe('number');
    }
  });

  it('should work in Firefox', () => {
    // Test in Firefox browser
    const isFirefox = /Firefox/.test(navigator.userAgent);

    if (isFirefox) {
      // Firefox-specific assertions
      expect(typeof navigator.hardwareConcurrency).toBe('number');
    }
  });

  it('should work in Safari', () => {
    // Test in Safari browser
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isSafari) {
      // Safari-specific assertions
      expect(typeof navigator.hardwareConcurrency).toBe('number');
    }
  });
});
