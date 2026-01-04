/**
 * Theme System - Module Exports
 *
 * Central exports for the PersonalLog theme customization system.
 *
 * @module lib/theme
 */

// Export types
export * from './types';

// Export registry
export { themeRegistry, initializeThemeRegistry } from './registry';

// Export engine utilities
export {
  generateThemeCSS,
  parseHSL,
  hslToString,
  lightenHSL,
  darkenHSL,
  saturateHSL,
  rotateHue,
  createColorScale,
  calculateLuminance,
  calculateContrastRatio,
  checkWCAGCompliance,
  findOptimalTextColor,
  generateThemeFromBaseColor,
  generateHighContrastTheme,
  generateSepiaTheme,
  validateTheme as validateThemeEngine,
  applyThemeToDocument,
  removeThemeFromDocument,
} from './engine';

// Export defaults
export {
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  HIGH_CONTRAST_THEME,
  SEPIA_THEME,
  MINIMAL_THEME,
  DEFAULT_THEMES,
} from './defaults';

// Export validation
export {
  validateTheme,
  validateThemeForExport,
  validateImportedTheme,
  isThemePublishable,
  getThemeQualityScore,
} from './validation';

// Export plugin integration
export {
  themeToPluginManifest,
  pluginManifestToTheme,
  installThemeFromPlugin,
  uninstallThemePlugin,
  exportThemeAsPlugin,
  importThemeFromPlugin,
  discoverThemesFromPlugins,
  getThemePluginInfo,
  prepareThemeForMarketplace,
  searchMarketplaceThemes,
  getThemeStatistics,
} from './plugin';

// Re-export enums
export { ThemeMode, ThemeCategory, ThemeEventType, ThemeState } from './types';

// Export types as type-only
export type {
  ThemeId,
  ThemeConfig,
  ColorPalette,
  HSLColor,
  ContrastRatio,
  ThemeEvent,
  ThemeEventListener,
  ThemeMetadata,
  Typography,
  Spacing,
  Shadows,
  BorderRadius,
  Breakpoints,
  Accessibility,
} from './types';
