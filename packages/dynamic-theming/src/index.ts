/**
 * Dynamic Theming System - Module Exports
 *
 * Complete theming system with WCAG accessibility compliance,
 * CSS variable generation, and theme management.
 *
 * @module dynamic-theming
 */

// Export types
export * from './types';

// Export registry
export { themeRegistry, initializeThemeRegistry, cleanupThemeRegistry } from './registry';

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

// Export plugin/distribution integration
export {
  exportThemeAsPlugin,
  importThemeFromPlugin,
  uninstallTheme,
  discoverThemesFromPackages,
  getThemeExportInfo,
  prepareThemeForDistribution,
  searchThemes,
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
  ThemeValidationResult,
  ThemeExport,
  ThemeImportResult,
} from './types';
