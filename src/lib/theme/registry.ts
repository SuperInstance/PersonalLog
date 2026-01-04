/**
 * Theme Registry - Theme Storage and Management
 *
 * Manages theme storage, retrieval, registration, and lifecycle.
 * Provides persistent storage and caching for themes.
 *
 * @module lib/theme/registry
 */

import {
  ThemeId,
  ThemeConfig,
  ThemeMetadata,
  ThemeState,
  ThemeSettings,
  SerializedTheme,
  ThemeEvent,
  ThemeEventType,
  ThemeEventListener,
  ThemeCategory,
  ThemeMode,
} from './types';
import { DEFAULT_THEMES } from './defaults';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  THEMES: 'personallog-themes',
  ACTIVE_THEME: 'personallog-active-theme',
  THEME_SETTINGS: 'personallog-theme-settings',
  CUSTOM_THEMES: 'personallog-custom-themes',
} as const;

// ============================================================================
// THEME REGISTRY CLASS
// ============================================================================

/**
 * Theme registry class
 * Manages all theme storage and retrieval operations
 */
class ThemeRegistry {
  private themes: Map<ThemeId, ThemeConfig> = new Map();
  private activeTheme: ThemeId | null = null;
  private themeSettings: ThemeSettings;
  private eventListeners: Map<ThemeEventType, Set<ThemeEventListener>> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.themeSettings = this.getDefaultSettings();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the theme registry
   * Loads themes from storage and registers built-in themes
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load built-in themes
      for (const theme of DEFAULT_THEMES) {
        this.themes.set(theme.metadata.id, theme);
      }

      // Load custom themes from storage
      await this.loadCustomThemes();

      // Load active theme
      this.activeTheme = this.loadActiveTheme();

      // Load theme settings
      this.themeSettings = this.loadThemeSettings();

      this.initialized = true;
    } catch (error) {
      console.error('[ThemeRegistry] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Ensure registry is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('[ThemeRegistry] Not initialized. Call initialize() first.');
    }
  }

  // ========================================================================
  // THEME REGISTRATION
  // ========================================================================

  /**
   * Register a new theme
   */
  async registerTheme(theme: ThemeConfig): Promise<void> {
    this.ensureInitialized();

    const { id } = theme.metadata;

    // Check if theme already exists
    if (this.themes.has(id)) {
      throw new Error(`[ThemeRegistry] Theme with id "${id}" already exists`);
    }

    // Validate theme
    this.validateTheme(theme);

    // Add to registry
    this.themes.set(id, theme);

    // Save to storage if custom theme
    if (theme.metadata.category === ThemeCategory.CUSTOM) {
      await this.saveCustomTheme(theme);
    }

    // Emit event
    this.emitEvent({
      type: ThemeEventType.THEME_IMPORTED,
      themeId: id,
      timestamp: Date.now(),
    });
  }

  /**
   * Update an existing theme
   */
  async updateTheme(id: ThemeId, updates: Partial<ThemeConfig>): Promise<void> {
    this.ensureInitialized();

    const theme = this.themes.get(id);
    if (!theme) {
      throw new Error(`[ThemeRegistry] Theme "${id}" not found`);
    }

    // Check if theme can be updated (built-in themes are immutable)
    if (theme.metadata.category === ThemeCategory.BUILT_IN) {
      throw new Error(`[ThemeRegistry] Cannot update built-in theme "${id}"`);
    }

    // Merge updates
    const updatedTheme: ThemeConfig = {
      ...theme,
      ...updates,
      metadata: {
        ...theme.metadata,
        ...updates.metadata,
        id, // Ensure ID doesn't change
        updatedAt: Date.now(),
      },
    };

    // Validate updated theme
    this.validateTheme(updatedTheme);

    // Update registry
    this.themes.set(id, updatedTheme);

    // Save to storage
    await this.saveCustomTheme(updatedTheme);

    // Emit event
    this.emitEvent({
      type: ThemeEventType.THEME_UPDATED,
      themeId: id,
      timestamp: Date.now(),
    });

    // Re-apply if this is the active theme
    if (this.activeTheme === id) {
      await this.applyTheme(id);
    }
  }

  /**
   * Unregister a theme
   */
  async unregisterTheme(id: ThemeId): Promise<void> {
    this.ensureInitialized();

    const theme = this.themes.get(id);
    if (!theme) {
      throw new Error(`[ThemeRegistry] Theme "${id}" not found`);
    }

    // Cannot unregister built-in themes
    if (theme.metadata.category === ThemeCategory.BUILT_IN) {
      throw new Error(`[ThemeRegistry] Cannot unregister built-in theme "${id}"`);
    }

    // Cannot unregister active theme
    if (this.activeTheme === id) {
      throw new Error(`[ThemeRegistry] Cannot unregister active theme "${id}"`);
    }

    // Remove from registry
    this.themes.delete(id);

    // Remove from storage
    await this.deleteCustomTheme(id);

    // Emit event
    this.emitEvent({
      type: ThemeEventType.THEME_DELETED,
      themeId: id,
      timestamp: Date.now(),
    });
  }

  // ========================================================================
  // THEME RETRIEVAL
  // ========================================================================

  /**
   * Get a theme by ID
   */
  getTheme(id: ThemeId): ThemeConfig | undefined {
    this.ensureInitialized();
    return this.themes.get(id);
  }

  /**
   * Get all themes
   */
  getAllThemes(): ThemeConfig[] {
    this.ensureInitialized();
    return Array.from(this.themes.values());
  }

  /**
   * Get themes by mode
   */
  getThemesByMode(mode: ThemeMode): ThemeConfig[] {
    this.ensureInitialized();
    return this.getAllThemes().filter((theme) => theme.mode === mode);
  }

  /**
   * Get themes by category
   */
  getThemesByCategory(category: ThemeCategory): ThemeConfig[] {
    this.ensureInitialized();
    return this.getAllThemes().filter((theme) => theme.metadata.category === category);
  }

  /**
   * Get built-in themes
   */
  getBuiltinThemes(): ThemeConfig[] {
    return this.getThemesByCategory(ThemeCategory.BUILT_IN);
  }

  /**
   * Get custom themes
   */
  getCustomThemes(): ThemeConfig[] {
    return this.getThemesByCategory(ThemeCategory.CUSTOM);
  }

  /**
   * Search themes by query
   */
  searchThemes(query: string): ThemeConfig[] {
    this.ensureInitialized();
    const lowerQuery = query.toLowerCase();

    return this.getAllThemes().filter((theme) => {
      const nameMatch = theme.metadata.name.toLowerCase().includes(lowerQuery);
      const descMatch = theme.metadata.description?.toLowerCase().includes(lowerQuery);
      const tagMatch = theme.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
      const authorMatch = theme.metadata.author?.name.toLowerCase().includes(lowerQuery);

      return nameMatch || descMatch || tagMatch || authorMatch;
    });
  }

  // ========================================================================
  // ACTIVE THEME MANAGEMENT
  // ========================================================================

  /**
   * Apply a theme
   */
  async applyTheme(id: ThemeId): Promise<void> {
    this.ensureInitialized();

    const theme = this.themes.get(id);
    if (!theme) {
      throw new Error(`[ThemeRegistry] Theme "${id}" not found`);
    }

    // Apply theme via CSS variables
    this.applyThemeVariables(theme);

    // Update active theme
    this.activeTheme = id;
    this.saveActiveTheme(id);

    // Emit event
    this.emitEvent({
      type: ThemeEventType.THEME_APPLIED,
      themeId: id,
      timestamp: Date.now(),
      data: { theme },
    });
  }

  /**
   * Get the active theme
   */
  getActiveTheme(): ThemeConfig | undefined {
    this.ensureInitialized();
    if (!this.activeTheme) {
      return undefined;
    }
    return this.themes.get(this.activeTheme);
  }

  /**
   * Get active theme ID
   */
  getActiveThemeId(): ThemeId | null {
    return this.activeTheme;
  }

  /**
   * Set active theme by ID
   */
  async setActiveTheme(themeId: ThemeId): Promise<void> {
    if (!this.themes.has(themeId)) {
      throw new Error(`Theme not found: ${themeId}`);
    }

    const previousTheme = this.activeTheme;
    this.activeTheme = themeId;

    // Save to storage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_THEME, themeId);
    }

    // Emit event
    this.emit('theme.changed', {
      type: 'theme.changed',
      themeId,
      previousThemeId: previousTheme,
      timestamp: Date.now(),
    });

    // Apply theme to document
    const theme = this.themes.get(themeId);
    if (theme) {
      const { applyThemeToDocument } = require('./engine');
      applyThemeToDocument(theme);
    }
  }

  /**
   * Alias for setActiveTheme
   */
  async setTheme(themeId: ThemeId): Promise<void> {
    return this.setActiveTheme(themeId);
  }

  // ========================================================================
  // THEME SETTINGS
  // ========================================================================

  /**
   * Get theme settings
   */
  getSettings(): ThemeSettings {
    this.ensureInitialized();
    return { ...this.themeSettings };
  }

  /**
   * Update theme settings
   */
  async updateSettings(updates: Partial<ThemeSettings>): Promise<void> {
    this.ensureInitialized();

    this.themeSettings = {
      ...this.themeSettings,
      ...updates,
    };

    this.saveThemeSettings(this.themeSettings);

    // Auto-switch if enabled
    if (this.themeSettings.autoSwitch) {
      await this.autoSwitchTheme();
    }
  }

  /**
   * Auto-switch theme based on system preference
   */
  public async autoSwitchTheme(): Promise<void> {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const targetThemeId = prefersDark ? this.themeSettings.darkThemeId : this.themeSettings.lightThemeId;

    if (targetThemeId !== this.activeTheme) {
      await this.applyTheme(targetThemeId);
    }
  }

  // ========================================================================
  // CSS VARIABLES
  // ========================================================================

  /**
   * Apply theme variables to DOM
   */
  private applyThemeVariables(theme: ThemeConfig): void {
    const root = document.documentElement;

    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    // Apply custom properties
    if (theme.customProperties) {
      Object.entries(theme.customProperties).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }

    // Apply border radius
    if (theme.borderRadius) {
      root.style.setProperty('--radius', theme.borderRadius.base);
    }

    // Apply accessibility preferences
    if (theme.accessibility) {
      if (theme.accessibility.reducedMotion) {
        root.style.setProperty('--motion-reduce', 'reduce');
      }

      if (theme.accessibility.highContrast) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
    }

    // Update theme mode class
    root.classList.remove('light', 'dark');
    root.classList.add(theme.mode);
  }

  // ========================================================================
  // STORAGE
  // ========================================================================

  /**
   * Load custom themes from localStorage
   */
  private async loadCustomThemes(): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES);
      if (!stored) {
        return;
      }

      const serialized: SerializedTheme[] = JSON.parse(stored);

      for (const item of serialized) {
        // Validate checksum
        const expectedChecksum = this.computeChecksum(item.theme);
        if (expectedChecksum !== item.checksum) {
          console.warn(`[ThemeRegistry] Checksum mismatch for theme "${item.theme.metadata.id}", skipping`);
          continue;
        }

        // Register theme
        this.themes.set(item.theme.metadata.id, item.theme);
      }
    } catch (error) {
      console.error('[ThemeRegistry] Failed to load custom themes:', error);
    }
  }

  /**
   * Save custom theme to localStorage
   */
  private async saveCustomTheme(theme: ThemeConfig): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES);
      const serialized: SerializedTheme[] = stored ? JSON.parse(stored) : [];

      // Update or add theme
      const existingIndex = serialized.findIndex((item) => item.theme.metadata.id === theme.metadata.id);
      const serializedTheme: SerializedTheme = {
        theme,
        serializedAt: Date.now(),
        checksum: this.computeChecksum(theme),
      };

      if (existingIndex >= 0) {
        serialized[existingIndex] = serializedTheme;
      } else {
        serialized.push(serializedTheme);
      }

      localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(serialized));
    } catch (error) {
      console.error(`[ThemeRegistry] Failed to save theme "${theme.metadata.id}":`, error);
      throw error;
    }
  }

  /**
   * Delete custom theme from localStorage
   */
  private async deleteCustomTheme(id: ThemeId): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES);
      if (!stored) {
        return;
      }

      const serialized: SerializedTheme[] = JSON.parse(stored);
      const filtered = serialized.filter((item) => item.theme.metadata.id !== id);

      localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(filtered));
    } catch (error) {
      console.error(`[ThemeRegistry] Failed to delete theme "${id}":`, error);
      throw error;
    }
  }

  /**
   * Load active theme from localStorage
   */
  private loadActiveTheme(): ThemeId | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_THEME) as ThemeId | null;
      return stored || null;
    } catch (error) {
      console.error('[ThemeRegistry] Failed to load active theme:', error);
      return null;
    }
  }

  /**
   * Save active theme to localStorage
   */
  private saveActiveTheme(id: ThemeId): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_THEME, id);
    } catch (error) {
      console.error('[ThemeRegistry] Failed to save active theme:', error);
    }
  }

  /**
   * Load theme settings from localStorage
   */
  private loadThemeSettings(): ThemeSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME_SETTINGS);
      if (!stored) {
        return this.getDefaultSettings();
      }

      return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
    } catch (error) {
      console.error('[ThemeRegistry] Failed to load theme settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Save theme settings to localStorage
   */
  private saveThemeSettings(settings: ThemeSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('[ThemeRegistry] Failed to save theme settings:', error);
    }
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  /**
   * Validate theme configuration
   */
  private validateTheme(theme: ThemeConfig): void {
    // Validate required fields
    if (!theme.metadata?.id) {
      throw new Error('[ThemeRegistry] Theme metadata.id is required');
    }

    if (!theme.metadata?.name) {
      throw new Error('[ThemeRegistry] Theme metadata.name is required');
    }

    if (!theme.colors) {
      throw new Error('[ThemeRegistry] Theme colors are required');
    }

    // Validate required colors
    const requiredColors = [
      'background',
      'foreground',
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
      'destructive-foreground',
      'border',
      'input',
      'ring',
    ];

    for (const color of requiredColors) {
      if (!theme.colors[color]) {
        throw new Error(`[ThemeRegistry] Required color "${color}" is missing`);
      }
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Get default theme settings
   */
  private getDefaultSettings(): ThemeSettings {
    return {
      autoSwitch: false,
      lightThemeId: 'default' as ThemeId,
      darkThemeId: 'dark' as ThemeId,
      fontSizeMultiplier: 1.0,
      reducedMotion: false,
      highContrast: false,
    };
  }

  /**
   * Compute checksum for theme
   */
  private computeChecksum(theme: ThemeConfig): string {
    const str = JSON.stringify(theme);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  /**
   * Add event listener
   */
  on(event: ThemeEventType, listener: ThemeEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: ThemeEventType, listener: ThemeEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: ThemeEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[ThemeRegistry] Error in event listener for "${event.type}":`, error);
        }
      });
    }
  }

  // ========================================================================
  // EXPORT/IMPORT
  // ========================================================================

  /**
   * Export theme to JSON
   */
  exportTheme(id: ThemeId): string {
    this.ensureInitialized();

    const theme = this.themes.get(id);
    if (!theme) {
      throw new Error(`[ThemeRegistry] Theme "${id}" not found`);
    }

    const exportData = {
      formatVersion: '1.0.0',
      theme,
      exportedAt: Date.now(),
      exportedBy: 'PersonalLog',
      checksum: this.computeChecksum(theme),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import theme from JSON
   */
  async importTheme(json: string): Promise<ThemeId> {
    try {
      const importData = JSON.parse(json);

      // Validate format
      if (!importData.formatVersion || !importData.theme) {
        throw new Error('[ThemeRegistry] Invalid theme export format');
      }

      const theme: ThemeConfig = importData.theme;

      // Validate checksum
      const expectedChecksum = this.computeChecksum(theme);
      if (importData.checksum !== expectedChecksum) {
        throw new Error('[ThemeRegistry] Theme checksum mismatch');
      }

      // Register theme
      await this.registerTheme(theme);

      return theme.metadata.id;
    } catch (error) {
      console.error('[ThemeRegistry] Failed to import theme:', error);
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global theme registry instance
 */
export const themeRegistry = new ThemeRegistry();

/**
 * Get theme registry instance
 * @deprecated Use themeRegistry directly instead
 */
export function getThemeRegistry() {
  return themeRegistry;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize theme registry (call once on app startup)
 */
export async function initializeThemeRegistry(): Promise<void> {
  await themeRegistry.initialize();

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const settings = themeRegistry.getSettings();
    if (settings.autoSwitch) {
      themeRegistry.autoSwitchTheme();
    }
  });
}
