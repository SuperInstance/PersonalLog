/**
 * Theme Plugin Integration - Theme as Plugin System
 *
 * Integrates the theme system with the PersonalLog plugin architecture.
 * Allows themes to be installed, managed, and distributed as plugins.
 *
 * @module lib/theme/plugin
 */

import {
  ThemeId,
  ThemeConfig,
  ThemeImportResult,
  ThemeExport,
  ThemeCategory,
} from './types';
import { PluginManifest, PluginType, Permission } from '@/lib/plugin/types';
import { themeRegistry } from './registry';
import { validateImportedTheme, validateThemeForExport } from './validation';
import { DEFAULT_LIGHT_THEME } from './defaults';

// ============================================================================
// THEME TO PLUGIN MANIFEST
// ============================================================================

/**
 * Convert theme configuration to plugin manifest
 */
export function themeToPluginManifest(theme: ThemeConfig): PluginManifest {
  return {
    id: theme.metadata.id as any,
    name: theme.metadata.name,
    description: theme.metadata.description || `Theme: ${theme.metadata.name}`,
    version: theme.metadata.version,
    minAppVersion: '1.0.0',
    author: {
      name: theme.metadata.author?.name || 'Unknown',
      email: theme.metadata.author?.email,
      website: theme.metadata.author?.website,
    },
    license: 'MIT',
    homepage: theme.metadata.author?.website,
    repository: undefined,
    type: [PluginType.THEME],
    keywords: [...theme.metadata.tags, 'theme'],
    categories: theme.metadata.category ? [theme.metadata.category] : [],
    icon: theme.metadata.screenshot,
    screenshots: theme.metadata.screenshot ? [theme.metadata.screenshot] : undefined,
    permissions: [
      Permission.READ_SETTINGS,
      Permission.MODIFY_UI,
    ],
    config: {
      theme: {
        themes: [
          {
            id: theme.metadata.id,
            name: theme.metadata.name,
            description: theme.metadata.description,
            type: theme.mode as any,
            colors: theme.colors,
            fonts: theme.typography ? Object.fromEntries(
              Object.entries(theme.typography.families).map(([key, value]) => [
                key,
                value.name,
              ])
            ) : undefined,
          },
        ],
        variables: theme.customProperties,
      },
    },
  };
}

/**
 * Convert plugin manifest to theme configuration
 */
export function pluginManifestToTheme(manifest: PluginManifest): ThemeConfig | null {
  if (!manifest.type.includes(PluginType.THEME)) {
    return null;
  }

  const themeDef = manifest.config?.theme?.themes?.[0];
  if (!themeDef) {
    return null;
  }

  return {
    metadata: {
      id: manifest.id as unknown as ThemeId,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      author: manifest.author,
      category: ThemeCategory.COMMUNITY,
      tags: manifest.keywords,
      screenshot: manifest.icon,
      previewColors: {
        primary: themeDef.colors.primary || '221.2 83.2% 53.3%',
        secondary: themeDef.colors.secondary || '210 40% 96.1%',
        accent: themeDef.colors.accent || '210 40% 96.1%',
        background: themeDef.colors.background || '0 0% 100%',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    mode: themeDef.type as any,
    colors: themeDef.colors,
    typography: DEFAULT_LIGHT_THEME.typography,
    customProperties: manifest.config?.theme?.variables,
  };
}

// ============================================================================
// THEME PLUGIN INSTALLATION
// ============================================================================

/**
 * Install theme from plugin manifest
 */
export async function installThemeFromPlugin(manifest: PluginManifest): Promise<ThemeImportResult> {
  try {
    // Convert manifest to theme
    const theme = pluginManifestToTheme(manifest);
    if (!theme) {
      return {
        success: false,
        error: 'Plugin manifest does not contain a valid theme definition',
      };
    }

    // Register theme
    await themeRegistry.registerTheme(theme);

    return {
      success: true,
      themeId: theme.metadata.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to install theme',
    };
  }
}

/**
 * Uninstall theme plugin
 */
export async function uninstallThemePlugin(themeId: ThemeId): Promise<void> {
  await themeRegistry.unregisterTheme(themeId);
}

// ============================================================================
// THEME EXPORT/IMPORT
// ============================================================================

/**
 * Export theme as plugin package
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

  // Create plugin manifest
  const manifest = themeToPluginManifest(theme);

  // Create plugin package
  const pluginPackage: ThemeExport = {
    formatVersion: '1.0.0',
    theme,
    exportedAt: Date.now(),
    exportedBy: 'PersonalLog',
    checksum: computeChecksum(theme),
  };

  return JSON.stringify(pluginPackage, null, 2);
}

/**
 * Import theme from plugin package
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

// ============================================================================
// THEME PLUGIN DISCOVERY
// ============================================================================

/**
 * Discover themes from plugin manifests
 */
export function discoverThemesFromPlugins(manifests: PluginManifest[]): ThemeConfig[] {
  const themes: ThemeConfig[] = [];

  for (const manifest of manifests) {
    if (manifest.type.includes(PluginType.THEME)) {
      const theme = pluginManifestToTheme(manifest);
      if (theme) {
        themes.push(theme);
      }
    }
  }

  return themes;
}

/**
 * Get theme plugin info
 */
export function getThemePluginInfo(themeId: ThemeId): {
  isPlugin: boolean;
  manifest?: PluginManifest;
} {
  const theme = themeRegistry.getTheme(themeId);

  if (!theme) {
    return { isPlugin: false };
  }

  // Built-in themes are not plugins
  if (theme.metadata.category === 'builtin') {
    return { isPlugin: false };
  }

  // Custom themes are considered as plugins
  const manifest = themeToPluginManifest(theme);
  return {
    isPlugin: true,
    manifest,
  };
}

// ============================================================================
// MARKETPLACE INTEGRATION
// ============================================================================

/**
 * Prepare theme for marketplace submission
 */
export function prepareThemeForMarketplace(themeId: ThemeId): {
  ready: boolean;
  manifest?: PluginManifest;
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
    errors.push('Theme description is required for marketplace submission');
  }

  if (!theme.metadata.author?.name) {
    errors.push('Author name is required for marketplace submission');
  }

  if (!theme.metadata.screenshot) {
    errors.push('Theme screenshot is required for marketplace submission');
  }

  if (!theme.metadata.tags || theme.metadata.tags.length === 0) {
    errors.push('At least one tag is required for marketplace submission');
  }

  if (errors.length > 0) {
    return {
      ready: false,
      errors,
    };
  }

  // Create plugin manifest
  const manifest = themeToPluginManifest(theme);

  return {
    ready: true,
    manifest,
  };
}

/**
 * Search marketplace themes
 */
export function searchMarketplaceThemes(
  query: string,
  availableThemes: PluginManifest[]
): PluginManifest[] {
  const lowerQuery = query.toLowerCase();

  return availableThemes.filter((manifest) => {
    if (!manifest.type.includes(PluginType.THEME)) {
      return false;
    }

    const nameMatch = manifest.name.toLowerCase().includes(lowerQuery);
    const descMatch = manifest.description?.toLowerCase().includes(lowerQuery);
    const tagMatch = manifest.keywords.some((tag) =>
      tag.toLowerCase().includes(lowerQuery)
    );
    const authorMatch = manifest.author.name.toLowerCase().includes(lowerQuery);

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
