/**
 * Theme System - Core Types
 *
 * Complete type definitions for the PersonalLog theme customization system.
 * Supports color schemes, typography, spacing, and accessibility features.
 *
 * @module lib/theme/types
 */

// ============================================================================
// THEME IDENTIFICATION
// ============================================================================

/**
 * Unique theme identifier
 */
export type ThemeId = string & { readonly __brand: unique symbol };

/**
 * Theme version (semver format)
 */
export type ThemeVersion = string;

/**
 * Theme mode
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  CUSTOM = 'custom',
}

/**
 * Theme category
 */
export enum ThemeCategory {
  BUILT_IN = 'builtin',
  CUSTOM = 'custom',
  COMMUNITY = 'community',
  PREMIUM = 'premium',
}

// ============================================================================
// COLOR TYPES
// ============================================================================

/**
 * HSL color value
 */
export interface HSLColor {
  /** Hue (0-360) */
  h: number;

  /** Saturation (0-100) */
  s: number;

  /** Lightness (0-100) */
  l: number;
}

/**
 * RGB color value
 */
export interface RGBColor {
  /** Red (0-255) */
  r: number;

  /** Green (0-255) */
  g: number;

  /** Blue (0-255) */
  b: number;

  /** Alpha (0-1) */
  a?: number;
}

/**
 * Color value (multiple formats supported)
 */
export type ColorValue = string | HSLColor | RGBColor;

/**
 * Color role for semantic naming
 */
export enum ColorRole {
  // Background colors
  BACKGROUND = 'background',
  CARD = 'card',
  POPOVER = 'popover',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  MUTED = 'muted',
  ACCENT = 'accent',
  DESTRUCTIVE = 'destructive',

  // Foreground colors
  FOREGROUND = 'foreground',
  CARD_FOREGROUND = 'card-foreground',
  POPOVER_FOREGROUND = 'popover-foreground',
  PRIMARY_FOREGROUND = 'primary-foreground',
  SECONDARY_FOREGROUND = 'secondary-foreground',
  MUTED_FOREGROUND = 'muted-foreground',
  ACCENT_FOREGROUND = 'accent-foreground',
  DESTRUCTIVE_FOREGROUND = 'destructive-foreground',

  // Border colors
  BORDER = 'border',
  INPUT = 'input',
  RING = 'ring',

  // Additional colors
  SUCCESS = 'success',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Color palette
 */
export interface ColorPalette {
  /** Map of color roles to HSL values */
  [role: string]: string;
}

// ============================================================================
// TYPOGRAPHY
// ============================================================================

/**
 * Font family
 */
export interface FontFamily {
  /** Font name */
  name: string;

  /** Font fallbacks */
  fallbacks: string[];

  /** Font weights available */
  weights: number[];
}

/**
 * Font size scale
 */
export interface FontSize {
  /** Size name */
  name: string;

  /** Size value (rem) */
  value: number;

  /** Line height */
  lineHeight: number;

  /** Letter spacing */
  letterSpacing?: string;
}

/**
 * Font weight scale
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/**
 * Typography configuration
 */
export interface Typography {
  /** Font families */
  families: {
    sans: FontFamily;
    serif?: FontFamily;
    mono?: FontFamily;
  };

  /** Font sizes */
  sizes: {
    xs: FontSize;
    sm: FontSize;
    base: FontSize;
    lg: FontSize;
    xl: FontSize;
    '2xl': FontSize;
    '3xl': FontSize;
    '4xl': FontSize;
  };

  /** Font weights */
  weights: {
    light: FontWeight;
    normal: FontWeight;
    medium: FontWeight;
    semibold: FontWeight;
    bold: FontWeight;
  };

  /** Line heights */
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
}

// ============================================================================
// SPACING
// ============================================================================

/**
 * Spacing scale
 */
export interface SpacingScale {
  /** Spacing step name */
  name: string;

  /** Spacing value (rem) */
  value: number;
}

/**
 * Spacing configuration
 */
export interface Spacing {
  /** Base spacing unit */
  base: number;

  /** Spacing scale */
  scale: {
    '0': SpacingScale;
    px: SpacingScale;
    '0.5': SpacingScale;
    '1': SpacingScale;
    '1.5': SpacingScale;
    '2': SpacingScale;
    '2.5': SpacingScale;
    '3': SpacingScale;
    '3.5': SpacingScale;
    '4': SpacingScale;
    '5': SpacingScale;
    '6': SpacingScale;
    '7': SpacingScale;
    '8': SpacingScale;
    '9': SpacingScale;
    '10': SpacingScale;
    '12': SpacingScale;
    '16': SpacingScale;
    '20': SpacingScale;
    '24': SpacingScale;
    '32': SpacingScale;
    '40': SpacingScale;
    '48': SpacingScale;
    '56': SpacingScale;
    '64': SpacingScale;
  };
}

// ============================================================================
// BORDER RADIUS
// ============================================================================

/**
 * Border radius scale
 */
export interface BorderRadius {
  /** Radius name */
  name: string;

  /** Radius value (rem or px) */
  value: string;
}

/**
 * Border radius configuration
 */
export interface BorderRadiusConfig {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

// ============================================================================
// SHADOWS
// ============================================================================

/**
 * Shadow configuration
 */
export interface Shadow {
  /** Shadow name */
  name: string;

  /** Shadow CSS value */
  value: string;
}

/**
 * Shadow scale
 */
export interface Shadows {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

// ============================================================================
// BREAKPOINTS
// ============================================================================

/**
 * Breakpoint configuration
 */
export interface Breakpoint {
  /** Breakpoint name */
  name: string;

  /** Minimum width (px) */
  minWidth: number;

  /** Maximum width (px, optional) */
  maxWidth?: number;
}

/**
 * Breakpoint scale
 */
export interface Breakpoints {
  sm: Breakpoint;
  md: Breakpoint;
  lg: Breakpoint;
  xl: Breakpoint;
  '2xl': Breakpoint;
}

// ============================================================================
// TRANSITIONS
// ============================================================================

/**
 * Transition configuration
 */
export interface Transition {
  /** Property */
  property: string;

  /** Duration (ms) */
  duration: number;

  /** Easing function */
  easing: string;
}

/**
 * Transition presets
 */
export interface Transitions {
  fast: Transition;
  base: Transition;
  slow: Transition;
}

// ============================================================================
// Z-INDEX
// ============================================================================

/**
 * Z-index scale
 */
export interface ZIndex {
  /** Layer name */
  name: string;

  /** Z-index value */
  value: number;
}

/**
 * Z-index configuration
 */
export interface ZIndexConfig {
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
}

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/**
 * Contrast ratio result
 */
export interface ContrastRatio {
  /** Ratio value */
  ratio: number;

  /** WCAG AA compliance */
  aa: boolean;

  /** WCAG AAA compliance */
  aaa: boolean;

  /** Font size threshold for AA */
  aaLarge: boolean;

  /** Font size threshold for AAA */
  aaaLarge: boolean;
}

/**
 * Accessibility configuration
 */
export interface Accessibility {
  /** Minimum contrast ratio for normal text */
  minContrastNormal: number;

  /** Minimum contrast ratio for large text */
  minContrastLarge: number;

  /** Reduced motion support */
  reducedMotion: boolean;

  /** High contrast mode */
  highContrast: boolean;
}

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

/**
 * Theme metadata
 */
export interface ThemeMetadata {
  /** Theme ID */
  id: ThemeId;

  /** Theme name */
  name: string;

  /** Theme description */
  description?: string;

  /** Theme version */
  version: ThemeVersion;

  /** Theme author */
  author?: {
    name: string;
    email?: string;
    website?: string;
  };

  /** Theme category */
  category: ThemeCategory;

  /** Theme tags */
  tags: string[];

  /** Theme screenshot (base64 or URL) */
  screenshot?: string;

  /** Theme preview colors */
  previewColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };

  /** Created timestamp */
  createdAt: number;

  /** Updated timestamp */
  updatedAt: number;

  /** Download count (for community themes) */
  downloads?: number;

  /** Rating (for community themes) */
  rating?: number;

  /** Featured flag */
  featured?: boolean;
}

/**
 * Complete theme configuration
 */
export interface ThemeConfig {
  /** Theme metadata */
  metadata: ThemeMetadata;

  /** Theme mode */
  mode: ThemeMode;

  /** Color palette */
  colors: ColorPalette;

  /** Typography */
  typography: Typography;

  /** Spacing */
  spacing?: Spacing;

  /** Border radius */
  borderRadius?: BorderRadiusConfig;

  /** Shadows */
  shadows?: Shadows;

  /** Breakpoints */
  breakpoints?: Breakpoints;

  /** Transitions */
  transitions?: Transitions;

  /** Z-index */
  zIndex?: ZIndexConfig;

  /** Custom CSS variables */
  customProperties?: Record<string, string>;

  /** Accessibility settings */
  accessibility?: Accessibility;

  /** Inherits from parent theme (for extensions) */
  extends?: ThemeId;
}

/**
 * Serialized theme (for storage/export)
 */
export interface SerializedTheme {
  /** Theme configuration */
  theme: ThemeConfig;

  /** Serialized timestamp */
  serializedAt: number;

  /** Checksum for validation */
  checksum: string;
}

// ============================================================================
// THEME STATE
// ============================================================================

/**
 * Theme application state
 */
export enum ThemeState {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOADING = 'loading',
  ERROR = 'error',
}

/**
 * Active theme configuration
 */
export interface ActiveTheme {
  /** Theme ID */
  themeId: ThemeId;

  /** Theme state */
  state: ThemeState;

  /** Custom overrides */
  overrides?: Partial<ThemeConfig>;

  /** Applied timestamp */
  appliedAt: number;
}

/**
 * Theme settings (user preferences)
 */
export interface ThemeSettings {
  /** Auto-switch based on system preference */
  autoSwitch: boolean;

  /** Light theme ID */
  lightThemeId: ThemeId;

  /** Dark theme ID */
  darkThemeId: ThemeId;

  /** Font size multiplier */
  fontSizeMultiplier: number;

  /** Reduced motion preference */
  reducedMotion: boolean;

  /** High contrast mode */
  highContrast: boolean;

  /** Custom theme overrides */
  customOverrides?: Partial<ThemeConfig>;
}

// ============================================================================
// THEME VALIDATION
// ============================================================================

/**
 * Theme validation result
 */
export interface ThemeValidationResult {
  /** Valid flag */
  valid: boolean;

  /** Validation errors */
  errors: ThemeValidationError[];

  /** Validation warnings */
  warnings: ThemeValidationWarning[];

  /** Accessibility results */
  accessibility?: AccessibilityValidationResult;
}

/**
 * Theme validation error
 */
export interface ThemeValidationError {
  /** Error field */
  field: string;

  /** Error message */
  message: string;

  /** Error code */
  code: string;

  /** Severity */
  severity: 'critical' | 'error';
}

/**
 * Theme validation warning
 */
export interface ThemeValidationWarning {
  /** Warning field */
  field: string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: string;

  /** Severity */
  severity: 'warning' | 'info';
}

/**
 * Accessibility validation result
 */
export interface AccessibilityValidationResult {
  /** Overall WCAG AA compliance */
  wcagAA: boolean;

  /** Overall WCAG AAA compliance */
  wcagAAA: boolean;

  /** Color contrast results */
  contrastRatios: Record<string, ContrastRatio>;

  /** Keyboard navigation support */
  keyboardSupport: boolean;

  /** Screen reader support */
  screenReaderSupport: boolean;

  /** Text scaling support */
  textScalingSupport: boolean;
}

// ============================================================================
// THEME EXPORT/IMPORT
// ============================================================================

/**
 * Theme export format
 */
export interface ThemeExport {
  /** Format version */
  formatVersion: string;

  /** Theme configuration */
  theme: ThemeConfig;

  /** Export timestamp */
  exportedAt: number;

  /** Exported by */
  exportedBy: string;

  /** Checksum */
  checksum: string;
}

/**
 * Theme import result
 */
export interface ThemeImportResult {
  /** Success flag */
  success: boolean;

  /** Theme ID */
  themeId?: ThemeId;

  /** Validation result */
  validation?: ThemeValidationResult;

  /** Import warnings */
  warnings?: string[];

  /** Error message */
  error?: string;
}

// ============================================================================
// THEME EVENTS
// ============================================================================

/**
 * Theme event types
 */
export enum ThemeEventType {
  THEME_APPLIED = 'theme.applied',
  THEME_CHANGED = 'theme.changed',
  THEME_UPDATED = 'theme.updated',
  THEME_DELETED = 'theme.deleted',
  THEME_IMPORTED = 'theme.imported',
  THEME_ERROR = 'theme.error',
}

/**
 * Theme event
 */
export interface ThemeEvent {
  /** Event type */
  type: ThemeEventType;

  /** Theme ID */
  themeId: ThemeId;

  /** Event timestamp */
  timestamp: number;

  /** Event data */
  data?: any;
}

/**
 * Theme event listener
 */
export type ThemeEventListener = (event: ThemeEvent) => void;

// ============================================================================
// THEME PREVIEW
// ============================================================================

/**
 * Theme preview configuration
 */
export interface ThemePreview {
  /** Theme ID */
  themeId: ThemeId;

  /** Preview size */
  size: 'small' | 'medium' | 'large';

  /** Show contrast ratios */
  showContrast: boolean;

  /** Show color palette */
  showPalette: boolean;

  /** Custom content */
  customContent?: React.ReactNode;
}

// ============================================================================
// THEME DIFF
// ============================================================================

/**
 * Theme difference
 */
export interface ThemeDiff {
  /** Field path */
  path: string;

  /** Old value */
  oldValue: any;

  /** New value */
  newValue: any;

  /** Change type */
  type: 'added' | 'removed' | 'modified';
}

/**
 * Theme comparison result
 */
export interface ThemeComparison {
  /** Theme 1 ID */
  theme1Id: ThemeId;

  /** Theme 2 ID */
  theme2Id: ThemeId;

  /** Differences */
  differences: ThemeDiff[];

  /** Similarity score (0-1) */
  similarityScore: number;
}
