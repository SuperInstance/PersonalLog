/**
 * Theme Validation - Comprehensive Theme Validation
 *
 * Validates theme configurations for correctness, accessibility,
 * and WCAG compliance.
 *
 * @module lib/theme/validation
 */

import {
  ThemeConfig,
  ThemeValidationResult,
  ThemeValidationError,
  ThemeValidationWarning,
  AccessibilityValidationResult,
  ContrastRatio,
} from './types';
import { calculateContrastRatio, parseHSL } from './engine';

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;
const WCAG_AAA_NORMAL = 7.0;
const WCAG_AAA_LARGE = 4.5;

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate theme configuration
 */
export function validateTheme(theme: ThemeConfig): ThemeValidationResult {
  const errors: ThemeValidationError[] = [];
  const warnings: ThemeValidationWarning[] = [];

  // Validate metadata
  validateMetadata(theme, errors, warnings);

  // Validate colors
  validateColors(theme, errors, warnings);

  // Validate typography
  if (theme.typography) {
    validateTypography(theme, errors, warnings);
  }

  // Validate accessibility
  const accessibility = validateAccessibility(theme);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    accessibility,
  };
}

// ============================================================================
// METADATA VALIDATION
// ============================================================================

function validateMetadata(
  theme: ThemeConfig,
  errors: ThemeValidationError[],
  warnings: ThemeValidationWarning[]
): void {
  if (!theme.metadata) {
    errors.push({
      field: 'metadata',
      message: 'Theme metadata is required',
      code: 'METADATA_MISSING',
      severity: 'critical',
    });
    return;
  }

  // Validate ID
  if (!theme.metadata.id) {
    errors.push({
      field: 'metadata.id',
      message: 'Theme ID is required',
      code: 'ID_MISSING',
      severity: 'critical',
    });
  } else if (!/^[a-z0-9-]+$/.test(theme.metadata.id)) {
    errors.push({
      field: 'metadata.id',
      message: 'Theme ID must contain only lowercase letters, numbers, and hyphens',
      code: 'ID_INVALID',
      severity: 'error',
    });
  }

  // Validate name
  if (!theme.metadata.name) {
    errors.push({
      field: 'metadata.name',
      message: 'Theme name is required',
      code: 'NAME_MISSING',
      severity: 'critical',
    });
  } else if (theme.metadata.name.length < 3) {
    errors.push({
      field: 'metadata.name',
      message: 'Theme name must be at least 3 characters long',
      code: 'NAME_TOO_SHORT',
      severity: 'error',
    });
  }

  // Validate version
  if (!theme.metadata.version) {
    warnings.push({
      field: 'metadata.version',
      message: 'Theme version is recommended',
      code: 'VERSION_MISSING',
      severity: 'warning',
    });
  } else if (!/^\d+\.\d+\.\d+$/.test(theme.metadata.version)) {
    warnings.push({
      field: 'metadata.version',
      message: 'Theme version should follow semver format (e.g., 1.0.0)',
      code: 'VERSION_INVALID',
      severity: 'info',
    });
  }

  // Validate tags
  if (!theme.metadata.tags || theme.metadata.tags.length === 0) {
    warnings.push({
      field: 'metadata.tags',
      message: 'Theme tags are recommended for better searchability',
      code: 'TAGS_MISSING',
      severity: 'warning',
    });
  }
}

// ============================================================================
// COLOR VALIDATION
// ============================================================================

function validateColors(
  theme: ThemeConfig,
  errors: ThemeValidationError[],
  warnings: ThemeValidationWarning[]
): void {
  if (!theme.colors) {
    errors.push({
      field: 'colors',
      message: 'Theme colors are required',
      code: 'COLORS_MISSING',
      severity: 'critical',
    });
    return;
  }

  // Required colors
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
      errors.push({
        field: `colors.${color}`,
        message: `Required color "${color}" is missing`,
        code: 'COLOR_MISSING',
        severity: 'critical',
      });
    } else {
      // Validate HSL format
      try {
        parseHSL(theme.colors[color]);
      } catch (error) {
        errors.push({
          field: `colors.${color}`,
          message: `Invalid HSL format for color "${color}" (expected: "H S% L%")`,
          code: 'COLOR_FORMAT_INVALID',
          severity: 'error',
        });
      }
    }
  }

  // Validate critical color contrast ratios
  const criticalPairs = [
    { bg: 'background', fg: 'foreground', name: 'Background/Foreground' },
    { bg: 'primary', fg: 'primary-foreground', name: 'Primary/Primary Foreground' },
    { bg: 'secondary', fg: 'secondary-foreground', name: 'Secondary/Secondary Foreground' },
    { bg: 'accent', fg: 'accent-foreground', name: 'Accent/Accent Foreground' },
    { bg: 'destructive', fg: 'destructive-foreground', name: 'Destructive/Destructive Foreground' },
  ];

  for (const { bg, fg, name } of criticalPairs) {
    if (theme.colors[bg] && theme.colors[fg]) {
      try {
        const contrast = calculateContrastRatio(theme.colors[fg], theme.colors[bg]);

        if (!contrast.aa) {
          errors.push({
            field: `colors.${fg}`,
            message: `Low contrast ratio (${contrast.ratio}:1) for ${name}. WCAG AA requires 4.5:1 for normal text`,
            code: 'CONTRAST_TOO_LOW',
            severity: 'critical',
          });
        } else if (!contrast.aaa) {
          warnings.push({
            field: `colors.${fg}`,
            message: `Moderate contrast ratio (${contrast.ratio}:1) for ${name}. WCAG AAA requires 7:1 for normal text`,
            code: 'CONTRAST_MODERATE',
            severity: 'warning',
          });
        }
      } catch (error) {
        // Skip if color parsing failed (already reported above)
      }
    }
  }
}

// ============================================================================
// TYPOGRAPHY VALIDATION
// ============================================================================

function validateTypography(
  theme: ThemeConfig,
  errors: ThemeValidationError[],
  warnings: ThemeValidationWarning[]
): void {
  if (!theme.typography) {
    return;
  }

  // Validate font families
  if (!theme.typography.families) {
    warnings.push({
      field: 'typography.families',
      message: 'Font families are recommended',
      code: 'FONT_FAMILIES_MISSING',
      severity: 'info',
    });
    return;
  }

  if (!theme.typography.families.sans) {
    warnings.push({
      field: 'typography.families.sans',
      message: 'Sans-serif font family is recommended',
      code: 'SANS_FONT_MISSING',
      severity: 'warning',
    });
  }

  // Validate font sizes
  if (!theme.typography.sizes) {
    warnings.push({
      field: 'typography.sizes',
      message: 'Font sizes are recommended',
      code: 'FONT_SIZES_MISSING',
      severity: 'info',
    });
  } else {
    // Check for reasonable size ranges
    const baseSize = theme.typography.sizes.base?.value || 1;
    if (baseSize < 0.875 || baseSize > 1.125) {
      warnings.push({
        field: 'typography.sizes.base',
        message: 'Base font size should be between 0.875rem and 1.125rem for optimal readability',
        code: 'BASE_SIZE_OUT_OF_RANGE',
        severity: 'warning',
      });
    }
  }
}

// ============================================================================
// ACCESSIBILITY VALIDATION
// ============================================================================

function validateAccessibility(theme: ThemeConfig): AccessibilityValidationResult {
  const contrastRatios: Record<string, ContrastRatio> = {};
  let wcagAA = true;
  let wcagAAA = true;

  // Calculate all critical contrast ratios
  const colorPairs = [
    { bg: 'background', fg: 'foreground' },
    { bg: 'primary', fg: 'primary-foreground' },
    { bg: 'secondary', fg: 'secondary-foreground' },
    { bg: 'accent', fg: 'accent-foreground' },
    { bg: 'muted', fg: 'muted-foreground' },
    { bg: 'destructive', fg: 'destructive-foreground' },
  ];

  for (const { bg, fg } of colorPairs) {
    if (theme.colors[bg] && theme.colors[fg]) {
      try {
        const contrast = calculateContrastRatio(theme.colors[fg], theme.colors[bg]);
        contrastRatios[`${fg}-on-${bg}`] = contrast;

        if (!contrast.aa) wcagAA = false;
        if (!contrast.aaa) wcagAAA = false;
      } catch (error) {
        // Skip if color parsing failed
      }
    }
  }

  return {
    wcagAA,
    wcagAAA,
    contrastRatios,
    keyboardSupport: true, // Themes don't affect keyboard support
    screenReaderSupport: true, // Themes don't affect screen reader support
    textScalingSupport: true, // Themes using rem units support text scaling
  };
}

// ============================================================================
// THEME EXPORT VALIDATION
// ============================================================================

/**
 * Validate theme for export
 */
export function validateThemeForExport(theme: ThemeConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required export fields
  if (!theme.metadata?.id) {
    errors.push('Theme ID is required for export');
  }

  if (!theme.metadata?.name) {
    errors.push('Theme name is required for export');
  }

  if (!theme.metadata?.version) {
    errors.push('Theme version is required for export');
  }

  if (!theme.metadata?.author?.name) {
    errors.push('Theme author name is required for export');
  }

  // Validate all colors are present and valid
  const requiredColors = [
    'background',
    'foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'destructive',
    'destructive-foreground',
    'border',
    'input',
  ];

  for (const color of requiredColors) {
    if (!theme.colors?.[color]) {
      errors.push(`Required color "${color}" is missing`);
    }
  }

  // Check accessibility compliance
  if (theme.colors?.background && theme.colors?.foreground) {
    try {
      const contrast = calculateContrastRatio(
        theme.colors.foreground,
        theme.colors.background
      );
      if (!contrast.aa) {
        errors.push(
          `Theme does not meet WCAG AA standards (contrast ratio: ${contrast.ratio}:1, required: 4.5:1)`
        );
      }
    } catch (error) {
      errors.push('Failed to validate color contrast');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// THEME IMPORT VALIDATION
// ============================================================================

/**
 * Validate imported theme data
 */
export function validateImportedTheme(data: any): {
  valid: boolean;
  errors: string[];
  theme?: ThemeConfig;
} {
  const errors: string[] = [];

  // Check data structure
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Invalid theme data: not an object'],
    };
  }

  // Check format version
  if (!data.formatVersion) {
    errors.push('Missing format version');
  }

  // Check theme object
  if (!data.theme) {
    errors.push('Missing theme object');
    return {
      valid: false,
      errors,
    };
  }

  const theme: ThemeConfig = data.theme;

  // Validate theme structure
  const validation = validateTheme(theme);
  if (!validation.valid) {
    errors.push(
      ...validation.errors.map((e) => `${e.field}: ${e.message}`)
    );
  }

  // Check checksum
  if (data.checksum) {
    const computedChecksum = computeChecksum(theme);
    if (computedChecksum !== data.checksum) {
      errors.push('Checksum mismatch - theme may have been corrupted');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    theme: errors.length === 0 ? theme : undefined,
  };
}

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if theme is valid for publication
 */
export function isThemePublishable(theme: ThemeConfig): boolean {
  const validation = validateTheme(theme);
  const exportValidation = validateThemeForExport(theme);

  return (
    validation.valid &&
    validation.accessibility?.wcagAA === true &&
    exportValidation.valid
  );
}

/**
 * Get theme quality score (0-100)
 */
export function getThemeQualityScore(theme: ThemeConfig): number {
  const validation = validateTheme(theme);
  let score = 0;

  // Base score: must be valid
  if (!validation.valid) {
    return 0;
  }

  score = 50;

  // Accessibility bonus
  if (validation.accessibility?.wcagAA) score += 20;
  if (validation.accessibility?.wcagAAA) score += 10;

  // Completeness bonus
  if (theme.typography) score += 5;
  if (theme.borderRadius) score += 3;
  if (theme.shadows) score += 3;
  if (theme.transitions) score += 2;
  if (theme.accessibility) score += 2;

  // Metadata bonus
  if (theme.metadata?.description) score += 2;
  if (theme.metadata?.tags?.length > 0) score += 2;
  if (theme.metadata?.screenshot) score += 1;

  // Deduct for warnings
  score -= validation.warnings.length * 2;

  return Math.min(100, Math.max(0, score));
}
