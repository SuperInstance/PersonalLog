/**
 * Validator Integration Tests
 *
 * Tests for the validator's integration with the feature flag system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateRequirements, getRequirementChecks } from '../validator';
import type { ValidationRequirement } from '../requirements';
import type { HardwareProfile } from '@/lib/hardware/types';

// Mock the feature check module
vi.mock('../feature-check', () => ({
  checkFeature: vi.fn((featureId: string) => {
    const results: Record<string, any> = {
      'jepa.transcription': {
        available: true,
        featureId: 'jepa.transcription',
        featureName: 'JEPA Transcription',
        reason: undefined,
        userOverridable: true,
        hardwareScore: 50,
        missingHardware: [],
        experimental: true,
        suggestion: undefined,
      },
      'ai.multimodal': {
        available: false,
        featureId: 'ai.multimodal',
        featureName: 'Multimodal AI',
        reason: 'Hardware score too low (30 < 60)',
        userOverridable: true,
        hardwareScore: 30,
        missingHardware: ['Hardware score', 'GPU'],
        experimental: true,
        suggestion: 'Upgrade your hardware',
      },
    };

    return Promise.resolve(results[featureId] || {
      available: false,
      featureId,
      featureName: featureId,
      reason: 'Unknown feature',
      userOverridable: false,
      hardwareScore: 0,
      missingHardware: [],
      experimental: false,
      suggestion: 'Contact support',
    });
  }),
  checkAgentFeatures: vi.fn(() =>
    Promise.resolve({
      canRun: true,
      features: [],
      missingRequirements: {
        flags: [],
        hardware: [],
      },
      suggestions: [],
    })
  ),
}));

describe('Validator Integration with Feature Flags', () => {
  let mockHardwareProfile: HardwareProfile;

  beforeEach(() => {
    mockHardwareProfile = {
      cpu: {
        cores: 8,
        model: 'Test CPU',
        architecture: 'x64',
        frequency: 3.0,
      },
      memory: {
        totalGB: 16,
        availableGB: 8,
      },
      gpu: {
        available: true,
        renderer: 'Test GPU',
        vendor: 'NVIDIA',
        vramMB: 8192,
        webgpu: { supported: true },
        webgl: { supported: true },
      },
      network: {
        downlinkMbps: 100,
        effectiveType: '4g',
        rtt: 50,
      },
      storage: {
        quota: {
          quota: 1000 * 1024 * 1024 * 1024, // 1TB
          usage: 100 * 1024 * 1024 * 1024, // 100GB
        },
        indexedDB: { supported: true },
      },
      features: {
        webWorkers: true,
        serviceWorker: true,
        webrtc: true,
        websockets: true,
        geolocation: true,
        notifications: true,
        fullscreen: true,
        webassembly: true,
      },
    };

    vi.clearAllMocks();
  });

  describe('validateRequirements with feature flags', () => {
    it('should pass when all requirements are met', async () => {
      const requirements: ValidationRequirement = {
        hardware: {
          minRAM: 8,
          minCores: 4,
          requiresGPU: true,
        },
        flags: [
          {
            name: 'jepa.transcription',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBe(1);
    });

    it('should fail when feature flag is disabled', async () => {
      const requirements: ValidationRequirement = {
        hardware: {
          minRAM: 8,
          minCores: 4,
          requiresGPU: true,
        },
        flags: [
          {
            name: 'ai.multimodal',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('FLAG_DISABLED');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should include suggestions in warnings', async () => {
      const requirements: ValidationRequirement = {
        hardware: {},
        flags: [
          {
            name: 'ai.multimodal',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(false);
      const suggestions = result.warnings.filter((w) => w.includes('Upgrade'));
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should warn about experimental features', async () => {
      const requirements: ValidationRequirement = {
        hardware: {},
        flags: [
          {
            name: 'jepa.transcription',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(true);
      const experimentalWarnings = result.warnings.filter((w) =>
        w.includes('experimental')
      );
      expect(experimentalWarnings.length).toBeGreaterThan(0);
    });

    it('should warn about user-overridable features', async () => {
      const requirements: ValidationRequirement = {
        hardware: {},
        flags: [
          {
            name: 'ai.multimodal',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(false);
      const overrideWarnings = result.warnings.filter((w) =>
        w.includes('Settings')
      );
      expect(overrideWarnings.length).toBeGreaterThan(0);
    });

    it('should validate hardware and flags together', async () => {
      const requirements: ValidationRequirement = {
        hardware: {
          minRAM: 32, // More than available
          minCores: 4,
        },
        flags: [
          {
            name: 'jepa.transcription',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Should have hardware error
      const hardwareErrors = result.errors.filter((e) =>
        e.message.includes('RAM')
      );
      expect(hardwareErrors.length).toBeGreaterThan(0);
    });
  });

  describe('getRequirementChecks with feature flags', () => {
    it('should include feature flag checks', async () => {
      const requirements: ValidationRequirement = {
        hardware: {
          minRAM: 8,
          minCores: 4,
        },
        flags: [
          {
            name: 'jepa.transcription',
            enabled: true,
          },
        ],
      };

      const checks = await getRequirementChecks(requirements, mockHardwareProfile);

      expect(checks.length).toBeGreaterThan(0);

      const flagChecks = checks.filter((c) => c.name.includes('Feature Flag'));
      expect(flagChecks.length).toBeGreaterThan(0);
      expect(flagChecks[0].passed).toBe(true);
    });

    it('should show failed feature flags', async () => {
      const requirements: ValidationRequirement = {
        hardware: {},
        flags: [
          {
            name: 'ai.multimodal',
            enabled: true,
          },
        ],
      };

      const checks = await getRequirementChecks(requirements, mockHardwareProfile);

      const flagCheck = checks.find((c) => c.name.includes('ai.multimodal'));
      expect(flagCheck).toBeDefined();
      expect(flagCheck?.passed).toBe(false);
      expect(flagCheck?.details).toContain('disabled');
    });

    it('should handle feature check errors gracefully', async () => {
      const requirements: ValidationRequirement = {
        hardware: {},
        flags: [
          {
            name: 'unknown.feature',
            enabled: true,
          },
        ],
      };

      const checks = await getRequirementChecks(requirements, mockHardwareProfile);

      const flagCheck = checks.find((c) => c.name.includes('unknown.feature'));
      expect(flagCheck).toBeDefined();
      expect(flagCheck?.passed).toBe(false);
      expect(flagCheck?.message).toContain('Unable to check');
    });
  });

  describe('validation score calculation', () => {
    it('should calculate score with all passing checks', async () => {
      const requirements: ValidationRequirement = {
        hardware: {
          minRAM: 8,
          minCores: 4,
        },
        flags: [
          {
            name: 'jepa.transcription',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(true);
      expect(result.score).toBe(1);
      expect(result.checked.total).toBe(result.checked.passed);
      expect(result.checked.failed).toBe(0);
    });

    it('should calculate score with some failing checks', async () => {
      const requirements: ValidationRequirement = {
        hardware: {
          minRAM: 32, // Fail
          minCores: 4, // Pass
        },
        flags: [
          {
            name: 'ai.multimodal', // Fail
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(false);
      expect(result.score).toBeLessThan(1);
      expect(result.score).toBeGreaterThan(0);
      expect(result.checked.failed).toBeGreaterThan(0);
    });

    it('should handle empty requirements', async () => {
      const requirements: ValidationRequirement = {};

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.valid).toBe(true);
      expect(result.score).toBe(1);
      expect(result.checked.total).toBe(0);
    });
  });

  describe('error messages and details', () => {
    it('should provide detailed error messages', async () => {
      const requirements: ValidationRequirement = {
        hardware: {},
        flags: [
          {
            name: 'ai.multimodal',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors[0];

      expect(error.message).toContain('ai.multimodal');
      expect(error.details).toBeDefined();
      expect(error.requirement).toBeDefined();
      expect(error.currentValue).toBeDefined();
      expect(error.requiredValue).toBeDefined();
    });

    it('should include helpful suggestions in warnings', async () => {
      const requirements: ValidationRequirement = {
        hardware: {},
        flags: [
          {
            name: 'ai.multimodal',
            enabled: true,
          },
        ],
      };

      const result = await validateRequirements(requirements, mockHardwareProfile);

      const suggestionWarnings = result.warnings.filter((w) =>
        w.includes('Upgrade') || w.includes('hardware')
      );
      expect(suggestionWarnings.length).toBeGreaterThan(0);
    });
  });
});
