/**
 * Hardware Scoring Tests
 *
 * Tests for JEPA-specific hardware scoring algorithm
 */

import { describe, it, expect } from 'vitest';
import { calculateJEPAScore, getJEPARequirements } from '../scoring';
import type { HardwareProfile } from '../types';

describe('Hardware Scoring', () => {
  const createMockProfile = (overrides: Partial<HardwareProfile> = {}): HardwareProfile => ({
    timestamp: Date.now(),
    cpu: {
      cores: 8,
      concurrency: 8,
      simd: { supported: true, type: 'wasm' },
      wasm: {
        supported: true,
        simd: true,
        threads: true,
        bulkMemory: true,
        exceptions: true,
      },
    },
    gpu: {
      available: true,
      webgpu: { supported: true },
      webgl: { supported: true, version: 2 },
      renderer: 'NVIDIA RTX 4050',
      vramMB: 6144,
    },
    memory: {
      totalGB: 16,
      hasMemoryAPI: true,
    },
    storage: {
      indexedDB: { supported: true, available: true },
    },
    network: {
      online: true,
      hasNetworkAPI: true,
      effectiveType: '4g',
      downlinkMbps: 100,
    },
    display: {
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      colorDepth: 24,
    },
    browser: {
      userAgent: 'Mozilla/5.0...',
      browser: 'Chrome',
      os: 'Windows',
      platform: 'Win32',
      touchSupport: false,
    },
    features: {
      webWorkers: true,
      serviceWorker: true,
      webrtc: true,
      webassembly: true,
      websockets: true,
      geolocation: true,
      notifications: true,
      fullscreen: true,
      pip: true,
      webBluetooth: false,
      webusb: false,
      fileSystemAccess: true,
    },
    performanceScore: 70,
    performanceClass: 'high',
    ...overrides,
  });

  describe('Tier Classification', () => {
    it('should classify low-end systems (score 0-20)', () => {
      const profile = createMockProfile({
        cpu: { ...createMockProfile().cpu, cores: 2 },
        gpu: {
          available: false,
          webgpu: { supported: false },
          webgl: { supported: false, version: 0 },
        },
        memory: { totalGB: 4, hasMemoryAPI: true },
      });

      const result = calculateJEPAScore(profile);
      expect(result.score).toBeLessThanOrEqual(20);
      expect(result.tier).toBe('low-end');
    });

    it('should classify mid-range systems (score 20-50)', () => {
      const profile = createMockProfile({
        gpu: {
          ...createMockProfile().gpu,
          renderer: 'NVIDIA RTX 4050',
          vramMB: 6144,
        },
        memory: { totalGB: 16, hasMemoryAPI: true },
      });

      const result = calculateJEPAScore(profile);
      expect(result.score).toBeGreaterThan(20);
      expect(result.score).toBeLessThanOrEqual(50);
      expect(result.tier).toBe('mid-range');
    });

    it('should classify high-end systems (score 50-80)', () => {
      const profile = createMockProfile({
        gpu: {
          ...createMockProfile().gpu,
          renderer: 'NVIDIA RTX 5090',
          vramMB: 24576,
        },
        memory: { totalGB: 32, hasMemoryAPI: true },
        cpu: { ...createMockProfile().cpu, cores: 16 },
      });

      const result = calculateJEPAScore(profile);
      expect(result.score).toBeGreaterThan(50);
      expect(result.score).toBeLessThanOrEqual(80);
      expect(result.tier).toBe('high-end');
    });
  });

  describe('JEPA Capabilities', () => {
    it('should enable Tiny-JEPA for mid-range systems', () => {
      const profile = createMockProfile({
        gpu: {
          ...createMockProfile().gpu,
          renderer: 'NVIDIA RTX 4050',
          vramMB: 6144,
        },
        memory: { totalGB: 16, hasMemoryAPI: true },
      });

      const result = calculateJEPAScore(profile);
      expect(result.jepa.tinyJEPA).toBe(true);
      expect(result.jepa.largeJEPA).toBe(false);
      expect(result.jepa.xlJEPA).toBe(false);
    });

    it('should enable JEPA-Large for high-end systems', () => {
      const profile = createMockProfile({
        gpu: {
          ...createMockProfile().gpu,
          renderer: 'NVIDIA RTX 5090',
          vramMB: 24576,
        },
        memory: { totalGB: 32, hasMemoryAPI: true },
        cpu: { ...createMockProfile().cpu, cores: 16 },
      });

      const result = calculateJEPAScore(profile);
      expect(result.jepa.tinyJEPA).toBe(true);
      expect(result.jepa.largeJEPA).toBe(true);
      expect(result.jepa.multimodalJEPA).toBe(true);
    });

    it('should enable all features for extreme systems', () => {
      const profile = createMockProfile({
        gpu: {
          ...createMockProfile().gpu,
          renderer: 'NVIDIA RTX 5090',
          vramMB: 24576,
          webgpu: { supported: true, adapter: 'NVIDIA' },
        },
        memory: { totalGB: 64, hasMemoryAPI: true },
        cpu: { ...createMockProfile().cpu, cores: 24 },
      });

      const result = calculateJEPAScore(profile);
      expect(result.jepa.tinyJEPA).toBe(true);
      expect(result.jepa.largeJEPA).toBe(true);
      expect(result.jepa.xlJEPA).toBe(true);
      expect(result.jepa.multimodalJEPA).toBe(true);
      expect(result.jepa.realtimeTranscription).toBe(true);
      expect(result.jepa.multiModel).toBe(true);
    });

    it('should disable JEPA for systems without GPU', () => {
      const profile = createMockProfile({
        gpu: {
          available: false,
          webgpu: { supported: false },
          webgl: { supported: false, version: 0 },
        },
        memory: { totalGB: 8, hasMemoryAPI: true },
      });

      const result = calculateJEPAScore(profile);
      expect(result.jepa.tinyJEPA).toBe(false);
      expect(result.jepa.largeJEPA).toBe(false);
    });
  });

  describe('Scoring Components', () => {
    it('should calculate GPU score correctly', () => {
      const profile = createMockProfile({
        gpu: {
          ...createMockProfile().gpu,
          renderer: 'NVIDIA RTX 4090',
          vramMB: 24576,
        },
      });

      const result = calculateJEPAScore(profile);
      expect(result.breakdown.gpu).toBeGreaterThan(30);
      expect(result.breakdown.gpu).toBeLessThanOrEqual(40);
    });

    it('should calculate RAM score correctly', () => {
      const profile = createMockProfile({
        memory: { totalGB: 32, hasMemoryAPI: true },
      });

      const result = calculateJEPAScore(profile);
      expect(result.breakdown.ram).toBeCloseTo(30, 5);
    });

    it('should calculate CPU score correctly', () => {
      const profile = createMockProfile({
        cpu: {
          ...createMockProfile().cpu,
          cores: 16,
          simd: { supported: true, type: 'wasm' },
          wasm: {
            supported: true,
            simd: true,
            threads: true,
            bulkMemory: true,
            exceptions: true,
          },
        },
      });

      const result = calculateJEPAScore(profile);
      expect(result.breakdown.cpu).toBeGreaterThan(15);
    });
  });

  describe('Recommendations', () => {
    it('should provide upgrade recommendations for low-end systems', () => {
      const profile = createMockProfile({
        gpu: {
          available: false,
          webgpu: { supported: false },
          webgl: { supported: false, version: 0 },
        },
        memory: { totalGB: 4, hasMemoryAPI: true },
      });

      const result = calculateJEPAScore(profile);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('GPU'))).toBe(true);
    });

    it('should provide optimization recommendations for mid-range systems', () => {
      const profile = createMockProfile({
        gpu: {
          ...createMockProfile().gpu,
          renderer: 'NVIDIA RTX 4050',
          vramMB: 6144,
        },
        memory: { totalGB: 16, hasMemoryAPI: true },
      });

      const result = calculateJEPAScore(profile);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('JEPA Requirements', () => {
    it('should provide requirements for all JEPA features', () => {
      const requirements = getJEPARequirements();

      expect(requirements.tiny_jepa).toBeDefined();
      expect(requirements.large_jepa).toBeDefined();
      expect(requirements.xl_jepa).toBeDefined();
      expect(requirements.multimodal).toBeDefined();
      expect(requirements.realtime).toBeDefined();
      expect(requirements.multi_model).toBeDefined();
    });

    it('should have correct minimum scores', () => {
      const requirements = getJEPARequirements();

      expect(requirements.tiny_jepa.minScore).toBe(30);
      expect(requirements.large_jepa.minScore).toBe(50);
      expect(requirements.xl_jepa.minScore).toBe(80);
      expect(requirements.multimodal.minScore).toBe(60);
    });
  });
});
