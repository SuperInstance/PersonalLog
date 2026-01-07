/**
 * Feature Check Tests
 *
 * Tests for agent feature checking utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkFeature,
  checkAgentFeatures,
  getAvailableFeatures,
  getDisabledFeatures,
  checkJEPATranscription,
  checkLocalAI,
  checkMultimodalAI,
  formatFeatureCheckResult,
  formatAgentFeatureCheck,
  resetFeatureCheckerCache,
} from '../feature-check';

// Mock the feature flag manager
vi.mock('@/lib/flags', () => ({
  initializeFeatureFlags: vi.fn(() =>
    Promise.resolve({
      evaluate: vi.fn((featureId: string) => {
        // Mock evaluation results
        const mockResults: Record<string, any> = {
          'jepa.transcription': {
            featureId: 'jepa.transcription',
            enabled: true,
            reason: 'All requirements met',
            hardwareScore: 50,
            userOverride: false,
            missingDependencies: [],
          },
          'ai.local_models': {
            featureId: 'ai.local_models',
            enabled: true,
            reason: 'All requirements met',
            hardwareScore: 50,
            userOverride: false,
            missingDependencies: [],
          },
          'ai.multimodal': {
            featureId: 'ai.multimodal',
            enabled: false,
            reason: 'Hardware score too low (30 < 60)',
            hardwareScore: 30,
            userOverride: false,
            missingDependencies: [],
          },
          'unknown.feature': {
            featureId: 'unknown.feature',
            enabled: false,
            reason: 'Feature not found',
            hardwareScore: 30,
            userOverride: false,
            missingDependencies: [],
          },
        };

        return mockResults[featureId] || {
          featureId,
          enabled: false,
          reason: 'Unknown feature',
          hardwareScore: 30,
          userOverride: false,
          missingDependencies: [],
        };
      }),
      getEnabledFeatures: vi.fn(() => ['jepa.transcription', 'ai.local_models', 'ui.dark_mode']),
      getDisabledFeatures: vi.fn(() => ['ai.multimodal', 'jepa.multimodal']),
      'registry': {
        getFeature: vi.fn((featureId: string) => {
          const features: Record<string, any> = {
            'jepa.transcription': {
              id: 'jepa.transcription',
              name: 'JEPA Transcription',
              experimental: true,
              userOverridable: true,
              minHardwareScore: 30,
              minRAM: 8,
              requiresGPU: true,
            },
            'ai.local_models': {
              id: 'ai.local_models',
              name: 'Local AI Models',
              experimental: false,
              userOverridable: true,
              minHardwareScore: 30,
              minRAM: 8,
            },
            'ai.multimodal': {
              id: 'ai.multimodal',
              name: 'Multimodal AI',
              experimental: true,
              userOverridable: true,
              minHardwareScore: 60,
              minRAM: 16,
              requiresGPU: true,
            },
          };
          return features[featureId] || null;
        }),
        getAllFeatures: vi.fn(() => []),
      },
    })
  ),
}));

describe('Feature Check', () => {
  beforeEach(() => {
    // Reset cache before each test
    resetFeatureCheckerCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkFeature', () => {
    it('should return available for enabled feature', async () => {
      const result = await checkFeature('jepa.transcription');

      expect(result.available).toBe(true);
      expect(result.featureId).toBe('jepa.transcription');
      expect(result.featureName).toBe('JEPA Transcription');
      expect(result.hardwareScore).toBe(50);
      expect(result.experimental).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return unavailable for disabled feature', async () => {
      const result = await checkFeature('ai.multimodal');

      expect(result.available).toBe(false);
      expect(result.featureId).toBe('ai.multimodal');
      expect(result.featureName).toBe('Multimodal AI');
      expect(result.hardwareScore).toBe(30);
      expect(result.reason).toBe('Hardware score too low (30 < 60)');
      expect(result.missingHardware).toContain('Hardware score');
      expect(result.suggestion).toBeDefined();
    });

    it('should handle unknown features', async () => {
      const result = await checkFeature('unknown.feature');

      expect(result.available).toBe(false);
      expect(result.featureId).toBe('unknown.feature');
      expect(result.reason).toBe('Feature flag not found in registry');
    });

    it('should include user overridable information', async () => {
      const result = await checkFeature('jepa.transcription');

      expect(result.userOverridable).toBe(true);
    });
  });

  describe('checkAgentFeatures', () => {
    it('should pass when all features are available', async () => {
      const result = await checkAgentFeatures(['jepa.transcription', 'ai.local_models']);

      expect(result.canRun).toBe(true);
      expect(result.features).toHaveLength(2);
      expect(result.missingRequirements.flags).toHaveLength(0);
      expect(result.missingRequirements.hardware).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should fail when any feature is unavailable', async () => {
      const result = await checkAgentFeatures(['jepa.transcription', 'ai.multimodal']);

      expect(result.canRun).toBe(false);
      expect(result.features).toHaveLength(2);
      expect(result.missingRequirements.flags).toContain('ai.multimodal');
      expect(result.missingRequirements.hardware).toContain('Hardware score');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for unavailable features', async () => {
      const result = await checkAgentFeatures(['ai.multimodal']);

      expect(result.canRun).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain('upgrade');
    });

    it('should aggregate missing hardware requirements', async () => {
      const result = await checkAgentFeatures(['ai.multimodal', 'jepa.multimodal']);

      expect(result.canRun).toBe(false);
      expect(result.missingRequirements.hardware.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableFeatures', () => {
    it('should return list of enabled features', async () => {
      const features = await getAvailableFeatures();

      expect(features).toContain('jepa.transcription');
      expect(features).toContain('ai.local_models');
      expect(features).toContain('ui.dark_mode');
    });

    it('should not include disabled features', async () => {
      const features = await getAvailableFeatures();

      expect(features).not.toContain('ai.multimodal');
      expect(features).not.toContain('jepa.multimodal');
    });
  });

  describe('getDisabledFeatures', () => {
    it('should return map of disabled features to reasons', async () => {
      const disabled = await getDisabledFeatures();

      expect(disabled.has('ai.multimodal')).toBe(true);
      expect(disabled.has('jepa.multimodal')).toBe(true);
      expect(disabled.get('ai.multimodal')).toBeDefined();
    });

    it('should not include enabled features', async () => {
      const disabled = await getDisabledFeatures();

      expect(disabled.has('jepa.transcription')).toBe(false);
      expect(disabled.has('ai.local_models')).toBe(false);
    });
  });

  describe('checkJEPATranscription', () => {
    it('should check JEPA transcription availability', async () => {
      const result = await checkJEPATranscription();

      expect(result.featureId).toBe('jepa.transcription');
      expect(result.available).toBe(true);
    });
  });

  describe('checkLocalAI', () => {
    it('should check local AI availability', async () => {
      const result = await checkLocalAI();

      expect(result.featureId).toBe('ai.local_models');
      expect(result.available).toBe(true);
    });
  });

  describe('checkMultimodalAI', () => {
    it('should check multimodal AI availability', async () => {
      const result = await checkMultimodalAI();

      expect(result.featureId).toBe('ai.multimodal');
      expect(result.available).toBe(false);
    });
  });

  describe('formatFeatureCheckResult', () => {
    it('should format available feature', () => {
      const result = {
        available: true,
        featureId: 'test',
        featureName: 'Test Feature',
        userOverridable: true,
        hardwareScore: 50,
        missingHardware: [],
        experimental: false,
      };

      const formatted = formatFeatureCheckResult(result);

      expect(formatted).toBe('Test Feature: Available');
    });

    it('should format unavailable feature with reason', () => {
      const result = {
        available: false,
        featureId: 'test',
        featureName: 'Test Feature',
        reason: 'Hardware score too low',
        userOverridable: true,
        hardwareScore: 20,
        missingHardware: ['Hardware score'],
        experimental: false,
        suggestion: 'Upgrade your hardware',
      };

      const formatted = formatFeatureCheckResult(result);

      expect(formatted).toContain('Test Feature: Not available');
      expect(formatted).toContain('Reason: Hardware score too low');
      expect(formatted).toContain('Suggestion: Upgrade your hardware');
      expect(formatted).toContain('Missing: Hardware score');
    });

    it('should handle missing suggestion', () => {
      const result = {
        available: false,
        featureId: 'test',
        featureName: 'Test Feature',
        reason: 'Disabled',
        userOverridable: true,
        hardwareScore: 20,
        missingHardware: [],
        experimental: false,
      };

      const formatted = formatFeatureCheckResult(result);

      expect(formatted).toContain('Test Feature: Not available');
      expect(formatted).toContain('Reason: Disabled');
      expect(formatted).not.toContain('Suggestion:');
    });
  });

  describe('formatAgentFeatureCheck', () => {
    it('should format successful check', () => {
      const check = {
        canRun: true,
        features: [],
        missingRequirements: {
          flags: [],
          hardware: [],
        },
        suggestions: [],
      };

      const formatted = formatAgentFeatureCheck(check);

      expect(formatted).toBe('All required features are available.');
    });

    it('should format failed check with details', () => {
      const check = {
        canRun: false,
        features: [],
        missingRequirements: {
          flags: ['ai.multimodal'],
          hardware: ['GPU', 'RAM'],
        },
        suggestions: [
          'Upgrade to a system with NVIDIA RTX',
          'Increase RAM to at least 16GB',
        ],
      };

      const formatted = formatAgentFeatureCheck(check);

      expect(formatted).toContain('Agent cannot run:');
      expect(formatted).toContain('Missing features: ai.multimodal');
      expect(formatted).toContain('Missing hardware: GPU, RAM');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('1. Upgrade to a system with NVIDIA RTX');
      expect(formatted).toContain('2. Increase RAM to at least 16GB');
    });

    it('should handle check with only missing flags', () => {
      const check = {
        canRun: false,
        features: [],
        missingRequirements: {
          flags: ['jepa.multimodal'],
          hardware: [],
        },
        suggestions: ['Enable experimental features'],
      };

      const formatted = formatAgentFeatureCheck(check);

      expect(formatted).toContain('Missing features: jepa.multimodal');
      expect(formatted).not.toContain('Missing hardware:');
    });

    it('should handle check with only missing hardware', () => {
      const check = {
        canRun: false,
        features: [],
        missingRequirements: {
          flags: [],
          hardware: ['GPU'],
        },
        suggestions: ['Upgrade to a system with GPU'],
      };

      const formatted = formatAgentFeatureCheck(check);

      expect(formatted).not.toContain('Missing features:');
      expect(formatted).toContain('Missing hardware: GPU');
    });
  });

  describe('resetFeatureCheckerCache', () => {
    it('should reset the flag manager cache', () => {
      // This is a basic sanity check
      expect(() => resetFeatureCheckerCache()).not.toThrow();
    });
  });
});
