/**
 * Theme Plugin Integration - Theme Distribution System
 *
 * Provides theme export/import functionality for distribution.
 * Allows themes to be packaged and shared as standalone JSON files.
 *
 * @module dynamic-theming/plugin
 */

import {
  ThemeId,
  ThemeConfig,
  ThemeImportResult,
  ThemeExport,
  ThemeCategory,
} from './types';
import { themeRegistry } from './registry';
import { validateImportedTheme, validateThemeForExport } from './validation';
import { DEFAULT_LIGHT_THEME } from './defaults';

// ============================================================================
// THEME EXPORT/IMPORT
// ============================================================================

/**
 * Export theme as JSON package
 */
export function exportThemeAsPlugin(themeId: ThemeId): string {
  const theme = themeRegistry.getTheme(themeId);
  if (!theme) {
    throw new Error(`Theme "${themeId}" not found`);
  }

  // Validate theme for export
  const validation = validateThemeForExport(theme);
  if (!validation.valid) {
    throw new Error(`Theme export validation failed:\n${validation.errors.join('\n')}`);
  }

  // Create export package
  const pluginPackage: ThemeExport = {
    formatVersion: '1.0.0',
    theme,
    exportedAt: Date.now(),
    exportedBy: '@superinstance/dynamic-theming',
    checksum: computeChecksum(theme),
  };

  return JSON.stringify(pluginPackage, null, 2);
}

/**
 * Import theme from JSON package
 */
export async function importThemeFromPlugin(json: string): Promise<ThemeImportResult> {
  try {
    // Parse JSON
    const data = JSON.parse(json);

    // Validate import
    const validation = validateImportedTheme(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Import validation failed:\n${validation.errors.join('\n')}`,
      };
    }

    if (!validation.theme) {
      return {
        success: false,
        error: 'Failed to parse theme from package',
      };
    }

    // Register theme
    await themeRegistry.registerTheme(validation.theme);

    return {
      success: true,
      themeId: validation.theme.metadata.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import theme',
    };
  }
}

/**
 * Uninstall theme
 */
export async function uninstallTheme(themeId: ThemeId): Promise<void> {
  await themeRegistry.unregisterTheme(themeId);
}

// ============================================================================
// THEME DISCOVERY
// ============================================================================

/**
 * Discover themes from export packages
 */
export function discoverThemesFromPackages(packages: ThemeExport[]): ThemeConfig[] {
  const themes: ThemeConfig[] = [];

  for (const pkg of packages) {
    const validation = validateImportedTheme(pkg);
    if (validation.valid && validation.theme) {
      themes.push(validation.theme);
    }
  }

  return themes;
}

/**
 * Get theme export info
 */
export function getThemeExportInfo(themeId: ThemeId): {
  isInstalled: boolean;
  isActive: boolean;
  category: string;
  mode: string;
  hasCustomColors: boolean;
  hasCustomFonts: boolean;
  version: string;
} {
  const theme = themeRegistry.getTheme(themeId);

  if (!theme) {
    return {
      isInstalled: false,
      isActive: false,
      category: 'unknown',
      mode: 'unknown',
      hasCustomColors: false,
      hasCustomFonts: false,
      version: 'unknown',
    };
  }

  const activeThemeId = themeRegistry.getActiveThemeId();

  return {
    isInstalled: true,
    isActive: activeThemeId === themeId,
    category: theme.metadata.category,
    mode: theme.mode,
    hasCustomColors: theme.metadata.category === 'custom',
    hasCustomFonts: !!theme.typography,
    version: theme.metadata.version,
  };
}

// ============================================================================
// MARKETPLACE PREPARATION
// ============================================================================

/**
 * Prepare theme for distribution
 */
export function prepareThemeForDistribution(themeId: ThemeId): {
  ready: boolean;
  exportPackage?: ThemeExport;
  errors?: string[];
} {
  const theme = themeRegistry.getTheme(themeId);
  if (!theme) {
    return {
      ready: false,
      errors: ['Theme not found'],
    };
  }

  const errors: string[] = [];

  // Validate theme
  const validation = validateThemeForExport(theme);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  // Check required metadata
  if (!theme.metadata.description) {
    errors.push('Theme description is required for distribution');
  }

  if (!theme.metadata.author?.name) {
    errors.push('Author name is required for distribution');
  }

  if (!theme.metadata.screenshot) {
    errors.push('Theme screenshot is recommended for distribution');
  }

  if (!theme.metadata.tags || theme.metadata.tags.length === 0) {
    errors.push('At least one tag is required for distribution');
  }

  if (errors.length > 0) {
    return {
      ready: false,
      errors,
    };
  }

  // Create export package
  const exportPackage: ThemeExport = {
    formatVersion: '1.0.0',
    theme,
    exportedAt: Date.now(),
    exportedBy: '@superinstance/dynamic-theming',
    checksum: computeChecksum(theme),
  };

  return {
    ready: true,
    exportPackage,
  };
}

/**
 * Search themes by query
 */
export function searchThemes(
  query: string,
  availableThemes: ThemeConfig[]
): ThemeConfig[] {
  const lowerQuery = query.toLowerCase();

  return availableThemes.filter((theme) => {
    const nameMatch = theme.metadata.name.toLowerCase().includes(lowerQuery);
    const descMatch = theme.metadata.description?.toLowerCase().includes(lowerQuery);
    const tagMatch = theme.metadata.tags.some((tag) =>
      tag.toLowerCase().includes(lowerQuery)
    );
    const authorMatch = theme.metadata.author?.name.toLowerCase().includes(lowerQuery);

    return nameMatch || descMatch || tagMatch || authorMatch;
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Compute theme checksum
 */
function computeChecksum(theme: ThemeConfig): string {
  const str = JSON.stringify(theme);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get theme statistics
 */
export function getThemeStatistics(themeId: ThemeId): {
  installed: boolean;
  isActive: boolean;
  category: string;
  mode: string;
  hasCustomColors: boolean;
  hasCustomFonts: boolean;
  version: string;
} {
  const theme = themeRegistry.getTheme(themeId);

  if (!theme) {
    return {
      installed: false,
      isActive: false,
      category: 'unknown',
      mode: 'unknown',
      hasCustomColors: false,
      hasCustomFonts: false,
      version: 'unknown',
    };
  }

  const activeThemeId = themeRegistry.getActiveThemeId();

  return {
    installed: true,
    isActive: activeThemeId === themeId,
    category: theme.metadata.category,
    mode: theme.mode,
    hasCustomColors: theme.metadata.category === 'custom',
    hasCustomFonts: !!theme.typography,
    version: theme.metadata.version,
  };
}
