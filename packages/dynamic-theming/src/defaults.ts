/**
 * Default Themes - Built-in Theme Definitions
 *
 * Includes all built-in themes that ship with PersonalLog.
 * These themes are carefully designed for accessibility and visual appeal.
 *
 * @module lib/theme/defaults
 */

import { ThemeConfig, ThemeId, ThemeMode, ThemeCategory } from './types';

// ============================================================================
// DEFAULT LIGHT THEME
// ============================================================================

/**
 * Default light theme
 * Clean, modern, and optimized for readability
 */
export const DEFAULT_LIGHT_THEME: ThemeConfig = {
  metadata: {
    id: 'default' as ThemeId,
    name: 'Default Light',
    description: 'Clean, modern light theme optimized for readability',
    version: '1.0.0',
    author: {
      name: 'PersonalLog',
    },
    category: ThemeCategory.BUILT_IN,
    tags: ['light', 'default', 'clean', 'modern'],
    previewColors: {
      primary: '221.2 83.2% 53.3%',
      secondary: '210 40% 96.1%',
      accent: '210 40% 96.1%',
      background: '0 0% 100%',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    featured: true,
  },
  mode: ThemeMode.LIGHT,
  colors: {
    // Background colors
    background: '0 0% 100%',
    card: '0 0% 100%',
    popover: '0 0% 100%',

    // Foreground colors
    foreground: '222.2 84% 4.9%',
    'card-foreground': '222.2 84% 4.9%',
    'popover-foreground': '222.2 84% 4.9%',

    // Primary colors (blue)
    primary: '221.2 83.2% 53.3%',
    'primary-foreground': '210 40% 98%',

    // Secondary colors (gray)
    secondary: '210 40% 96.1%',
    'secondary-foreground': '222.2 47.4% 11.2%',

    // Muted colors
    muted: '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',

    // Accent colors
    accent: '210 40% 96.1%',
    'accent-foreground': '222.2 47.4% 11.2%',

    // Destructive colors (red)
    destructive: '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',

    // Border and input colors
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '221.2 83.2% 53.3%',
  },
  typography: {
    families: {
      sans: {
        name: 'Inter',
        fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
        weights: [400, 500, 600, 700],
      },
    },
    sizes: {
      xs: { name: 'xs', value: 0.75, lineHeight: 1 },
      sm: { name: 'sm', value: 0.875, lineHeight: 1.25 },
      base: { name: 'base', value: 1, lineHeight: 1.5 },
      lg: { name: 'lg', value: 1.125, lineHeight: 1.75 },
      xl: { name: 'xl', value: 1.25, lineHeight: 1.75 },
      '2xl': { name: '2xl', value: 1.5, lineHeight: 2 },
      '3xl': { name: '3xl', value: 1.875, lineHeight: 2.25 },
      '4xl': { name: '4xl', value: 2.25, lineHeight: 2.5 },
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  borderRadius: {
    none: '0',
    sm: 'calc(var(--radius) - 4px)',
    base: '0.5rem',
    md: 'calc(var(--radius) - 2px)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) + 4px)',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  transitions: {
    fast: {
      property: 'all',
      duration: 150,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    base: {
      property: 'all',
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    slow: {
      property: 'all',
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  accessibility: {
    minContrastNormal: 4.5,
    minContrastLarge: 3.0,
    reducedMotion: false,
    highContrast: false,
  },
};

// ============================================================================
// DEFAULT DARK THEME
// ============================================================================

/**
 * Default dark theme
 * Optimized for low-light environments with excellent contrast
 */
export const DEFAULT_DARK_THEME: ThemeConfig = {
  metadata: {
    id: 'dark' as ThemeId,
    name: 'Default Dark',
    description: 'Dark theme optimized for low-light environments',
    version: '1.0.0',
    author: {
      name: 'PersonalLog',
    },
    category: ThemeCategory.BUILT_IN,
    tags: ['dark', 'default', 'night', 'dim'],
    previewColors: {
      primary: '217.2 91.2% 59.8%',
      secondary: '217.2 32.6% 17.5%',
      accent: '217.2 32.6% 17.5%',
      background: '222.2 84% 4.9%',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    featured: true,
  },
  mode: ThemeMode.DARK,
  colors: {
    // Background colors
    background: '222.2 84% 4.9%',
    card: '222.2 84% 4.9%',
    popover: '222.2 84% 4.9%',

    // Foreground colors
    foreground: '210 40% 98%',
    'card-foreground': '210 40% 98%',
    'popover-foreground': '210 40% 98%',

    // Primary colors (blue)
    primary: '217.2 91.2% 59.8%',
    'primary-foreground': '222.2 47.4% 11.2%',

    // Secondary colors (slate)
    secondary: '217.2 32.6% 17.5%',
    'secondary-foreground': '210 40% 98%',

    // Muted colors
    muted: '217.2 32.6% 17.5%',
    'muted-foreground': '215 20.2% 65.1%',

    // Accent colors
    accent: '217.2 32.6% 17.5%',
    'accent-foreground': '210 40% 98%',

    // Destructive colors (red)
    destructive: '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',

    // Border and input colors
    border: '217.2 32.6% 17.5%',
    input: '217.2 32.6% 17.5%',
    ring: '224.3 76.3% 48%',
  },
  typography: DEFAULT_LIGHT_THEME.typography,
  borderRadius: DEFAULT_LIGHT_THEME.borderRadius,
  shadows: DEFAULT_LIGHT_THEME.shadows,
  transitions: DEFAULT_LIGHT_THEME.transitions,
  accessibility: {
    minContrastNormal: 4.5,
    minContrastLarge: 3.0,
    reducedMotion: false,
    highContrast: false,
  },
};

// ============================================================================
// HIGH CONTRAST THEME
// ============================================================================

/**
 * High contrast theme
 * WCAG AAA compliant with maximum contrast for accessibility
 */
export const HIGH_CONTRAST_THEME: ThemeConfig = {
  metadata: {
    id: 'high-contrast' as ThemeId,
    name: 'High Contrast',
    description: 'Maximum contrast theme for accessibility (WCAG AAA)',
    version: '1.0.0',
    author: {
      name: 'PersonalLog',
    },
    category: ThemeCategory.BUILT_IN,
    tags: ['accessibility', 'a11y', 'contrast', 'wcag'],
    previewColors: {
      primary: '0 0% 0%',
      secondary: '0 0% 0%',
      accent: '0 0% 0%',
      background: '0 0% 100%',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    featured: true,
  },
  mode: ThemeMode.LIGHT,
  colors: {
    background: '0 0% 100%',
    foreground: '0 0% 0%',
    card: '0 0% 100%',
    'card-foreground': '0 0% 0%',
    popover: '0 0% 100%',
    'popover-foreground': '0 0% 0%',
    primary: '0 0% 0%',
    'primary-foreground': '0 0% 100%',
    secondary: '0 0% 0%',
    'secondary-foreground': '0 0% 100%',
    muted: '0 0% 95%',
    'muted-foreground': '0 0% 0%',
    accent: '0 0% 0%',
    'accent-foreground': '0 0% 100%',
    destructive: '0 100% 50%',
    'destructive-foreground': '0 0% 100%',
    border: '0 0% 0%',
    input: '0 0% 0%',
    ring: '0 0% 0%',
  },
  typography: DEFAULT_LIGHT_THEME.typography,
  borderRadius: {
    none: '0',
    sm: '0',
    base: '0',
    md: '0',
    lg: '0',
    xl: '0',
    '2xl': '0',
    '3xl': '0',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 0 0 1px 0 0% 0%',
    base: '0 0 0 1px 0 0% 0%',
    md: '0 0 0 1px 0 0% 0%',
    lg: '0 0 0 1px 0 0% 0%',
    xl: '0 0 0 1px 0 0% 0%',
    '2xl': '0 0 0 1px 0 0% 0%',
    inner: 'inset 0 0 0 1px 0 0% 0%',
  },
  transitions: DEFAULT_LIGHT_THEME.transitions,
  accessibility: {
    minContrastNormal: 7.0,
    minContrastLarge: 4.5,
    reducedMotion: false,
    highContrast: true,
  },
};

// ============================================================================
// SEPIA THEME
// ============================================================================

/**
 * Sepia theme
 * Warm, comfort-reading theme with reduced eye strain
 */
export const SEPIA_THEME: ThemeConfig = {
  metadata: {
    id: 'sepia' as ThemeId,
    name: 'Sepia Comfort',
    description: 'Warm comfort theme for extended reading sessions',
    version: '1.0.0',
    author: {
      name: 'PersonalLog',
    },
    category: ThemeCategory.BUILT_IN,
    tags: ['sepia', 'reading', 'warm', 'comfort'],
    previewColors: {
      primary: '30 40% 30%',
      secondary: '30 15% 85%',
      accent: '35 50% 50%',
      background: '38 50% 96%',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    featured: false,
  },
  mode: ThemeMode.LIGHT,
  colors: {
    background: '38 50% 96%',
    foreground: '30 20% 15%',
    card: '38 50% 96%',
    'card-foreground': '30 20% 15%',
    popover: '38 50% 96%',
    'popover-foreground': '30 20% 15%',
    primary: '30 40% 30%',
    'primary-foreground': '38 50% 96%',
    secondary: '30 15% 85%',
    'secondary-foreground': '30 20% 15%',
    muted: '30 15% 85%',
    'muted-foreground': '30 15% 40%',
    accent: '35 50% 50%',
    'accent-foreground': '38 50% 96%',
    destructive: '0 60% 50%',
    'destructive-foreground': '38 50% 96%',
    border: '30 15% 75%',
    input: '30 15% 75%',
    ring: '30 40% 30%',
  },
  typography: DEFAULT_LIGHT_THEME.typography,
  borderRadius: DEFAULT_LIGHT_THEME.borderRadius,
  shadows: DEFAULT_LIGHT_THEME.shadows,
  transitions: DEFAULT_LIGHT_THEME.transitions,
  accessibility: {
    minContrastNormal: 4.5,
    minContrastLarge: 3.0,
    reducedMotion: false,
    highContrast: false,
  },
};

// ============================================================================
// MINIMAL THEME
// ============================================================================

/**
 * Minimal theme
 * Pure black and white design for maximum focus
 */
export const MINIMAL_THEME: ThemeConfig = {
  metadata: {
    id: 'minimal' as ThemeId,
    name: 'Minimal',
    description: 'Pure black and white theme for maximum focus',
    version: '1.0.0',
    author: {
      name: 'PersonalLog',
    },
    category: ThemeCategory.BUILT_IN,
    tags: ['minimal', 'monochrome', 'simple', 'focus'],
    previewColors: {
      primary: '0 0% 0%',
      secondary: '0 0% 95%',
      accent: '0 0% 90%',
      background: '0 0% 100%',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    featured: false,
  },
  mode: ThemeMode.LIGHT,
  colors: {
    background: '0 0% 100%',
    foreground: '0 0% 0%',
    card: '0 0% 100%',
    'card-foreground': '0 0% 0%',
    popover: '0 0% 100%',
    'popover-foreground': '0 0% 0%',
    primary: '0 0% 0%',
    'primary-foreground': '0 0% 100%',
    secondary: '0 0% 95%',
    'secondary-foreground': '0 0% 0%',
    muted: '0 0% 95%',
    'muted-foreground': '0 0% 40%',
    accent: '0 0% 90%',
    'accent-foreground': '0 0% 0%',
    destructive: '0 0% 0%',
    'destructive-foreground': '0 0% 100%',
    border: '0 0% 90%',
    input: '0 0% 90%',
    ring: '0 0% 0%',
  },
  typography: DEFAULT_LIGHT_THEME.typography,
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  transitions: DEFAULT_LIGHT_THEME.transitions,
  accessibility: {
    minContrastNormal: 21.0, // Maximum contrast
    minContrastLarge: 21.0,
    reducedMotion: false,
    highContrast: false,
  },
};

// ============================================================================
// EXPORT ARRAY
// ============================================================================

/**
 * All built-in themes
 */
export const DEFAULT_THEMES: ThemeConfig[] = [
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  HIGH_CONTRAST_THEME,
  SEPIA_THEME,
  MINIMAL_THEME,
];
