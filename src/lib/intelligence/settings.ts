/**
 * Intelligence Settings
 *
 * Unified configuration management for all intelligence systems.
 * Provides master controls and per-system settings.
 */

import { DEFAULT_INTELLIGENCE_SETTINGS, type IntelligenceSettings } from './types';

const SETTINGS_STORAGE_KEY = 'personallog-intelligence-settings';

// ============================================================================
// SETTINGS MANAGER
// ============================================================================

export class IntelligenceSettingsManager {
  private settings: IntelligenceSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Get current settings
   */
  getSettings(): IntelligenceSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<IntelligenceSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.settings = { ...DEFAULT_INTELLIGENCE_SETTINGS };
    this.saveSettings();
  }

  /**
   * Enable/disable entire intelligence system
   */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  /**
   * Set intelligence level
   */
  setLevel(level: IntelligenceSettings['level']): void {
    this.settings.level = level;
    this.applyLevelDefaults();
    this.saveSettings();
  }

  /**
   * Apply defaults based on intelligence level
   */
  private applyLevelDefaults(): void {
    switch (this.settings.level) {
      case 'off':
        this.settings.analytics.enabled = false;
        this.settings.experiments.enabled = false;
        this.settings.optimization.enabled = false;
        this.settings.personalization.enabled = false;
        break;

      case 'basic':
        this.settings.analytics.enabled = true;
        this.settings.experiments.enabled = false;
        this.settings.optimization.enabled = false;
        this.settings.personalization.enabled = true;
        this.settings.personalization.sensitivity = 'low';
        break;

      case 'advanced':
        this.settings.analytics.enabled = true;
        this.settings.experiments.enabled = true;
        this.settings.optimization.enabled = true;
        this.settings.optimization.autoApply = false;
        this.settings.personalization.enabled = true;
        this.settings.personalization.sensitivity = 'medium';
        break;

      case 'full':
        this.settings.analytics.enabled = true;
        this.settings.analytics.sampleRate = 1.0;
        this.settings.experiments.enabled = true;
        this.settings.experiments.autoRollout = true;
        this.settings.optimization.enabled = true;
        this.settings.optimization.autoApply = true;
        this.settings.personalization.enabled = true;
        this.settings.personalization.sensitivity = 'high';
        break;
    }
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[Intelligence Settings] Failed to save:', error);
    }
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): IntelligenceSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_INTELLIGENCE_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[Intelligence Settings] Failed to load:', error);
    }

    return { ...DEFAULT_INTELLIGENCE_SETTINGS };
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  importSettings(json: string): void {
    try {
      const imported = JSON.parse(json);
      this.settings = { ...DEFAULT_INTELLIGENCE_SETTINGS, ...imported };
      this.saveSettings();
    } catch (error) {
      console.error('[Intelligence Settings] Failed to import:', error);
      throw new Error('Invalid settings JSON');
    }
  }

  /**
   * Clear all settings
   */
  clearSettings(): void {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      this.settings = { ...DEFAULT_INTELLIGENCE_SETTINGS };
    } catch (error) {
      console.error('[Intelligence Settings] Failed to clear:', error);
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let settingsManager: IntelligenceSettingsManager | null = null;

/**
 * Get settings manager singleton
 */
export function getSettingsManager(): IntelligenceSettingsManager {
  if (!settingsManager) {
    settingsManager = new IntelligenceSettingsManager();
  }
  return settingsManager;
}

/**
 * Quick access to settings
 */
export function getIntelligenceSettings(): IntelligenceSettings {
  return getSettingsManager().getSettings();
}

/**
 * Update intelligence settings
 */
export function updateIntelligenceSettings(updates: Partial<IntelligenceSettings>): void {
  getSettingsManager().updateSettings(updates);
}

/**
 * Reset intelligence settings to defaults
 */
export function resetIntelligenceSettings(): void {
  getSettingsManager().resetToDefaults();
}
