/**
 * Theme Engine - CSS Variable Generation and Application
 *
 * Converts theme configurations into CSS variables and applies them to the DOM.
 * Provides utilities for theme manipulation and CSS generation.
 *
 * @module lib/theme/engine
 */

import { ThemeConfig, ColorRole, HSLColor, ContrastRatio, ThemeMode } from './types';

// ============================================================================
// CSS VARIABLE GENERATION
// ============================================================================

/**
 * Generate CSS variables from theme configuration
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  const lines: string[] = [];

  // Generate color variables
  lines.push('/* Colors */');
  Object.entries(theme.colors).forEach(([name, value]) => {
    lines.push(`  --${name}: ${value};`);
  });

  // Generate typography variables
  if (theme.typography) {
    lines.push('\n/* Typography */');
    lines.push(`  --font-sans: ${formatFontFamily(theme.typography.families.sans)};`);

    if (theme.typography.families.serif) {
      lines.push(`  --font-serif: ${formatFontFamily(theme.typography.families.serif)};`);
    }

    if (theme.typography.families.mono) {
      lines.push(`  --font-mono: ${formatFontFamily(theme.typography.families.mono)};`);
    }
  }

  // Generate spacing variables
  if (theme.spacing) {
    lines.push('\n/* Spacing */');
    Object.entries(theme.spacing.scale).forEach(([name, spacing]) => {
      lines.push(`  --spacing-${name}: ${spacing.value}rem;`);
    });
  }

  // Generate border radius variables
  if (theme.borderRadius) {
    lines.push('\n/* Border Radius */');
    Object.entries(theme.borderRadius).forEach(([name, value]) => {
      lines.push(`  --radius-${name}: ${value};`);
    });
  }

  // Generate shadow variables
  if (theme.shadows) {
    lines.push('\n/* Shadows */');
    Object.entries(theme.shadows).forEach(([name, value]) => {
      lines.push(`  --shadow-${name}: ${value};`);
    });
  }

  // Generate custom properties
  if (theme.customProperties) {
    lines.push('\n/* Custom */');
    Object.entries(theme.customProperties).forEach(([name, value]) => {
      lines.push(`  ${name}: ${value};`);
    });
  }

  return lines.join('\n');
}

/**
 * Format font family for CSS
 */
function formatFontFamily(font: { name: string; fallbacks: string[] }): string {
  const families = [font.name, ...font.fallbacks];
  return families.map((f) => (f.includes(' ') ? `"${f}"` : f)).join(', ');
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Parse HSL color string
 */
export function parseHSL(hslString: string): HSLColor {
  const match = hslString.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!match) {
    throw new Error(`[ThemeEngine] Invalid HSL format: ${hslString}`);
  }

  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
}

/**
 * Convert HSL to CSS string
 */
export function hslToString(hsl: HSLColor): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Lighten HSL color
 */
export function lightenHSL(hsl: HSLColor, amount: number): HSLColor {
  return {
    ...hsl,
    l: Math.min(100, hsl.l + amount),
  };
}

/**
 * Darken HSL color
 */
export function darkenHSL(hsl: HSLColor, amount: number): HSLColor {
  return {
    ...hsl,
    l: Math.max(0, hsl.l - amount),
  };
}

/**
 * Adjust HSL saturation
 */
export function saturateHSL(hsl: HSLColor, amount: number): HSLColor {
  return {
    ...hsl,
    s: Math.min(100, Math.max(0, hsl.s + amount)),
  };
}

/**
 * Rotate HSL hue
 */
export function rotateHue(hsl: HSLColor, degrees: number): HSLColor {
  return {
    ...hsl,
    h: (hsl.h + degrees) % 360,
  };
}

/**
 * Create color scale from base color
 */
export function createColorScale(
  baseColor: string,
  steps: number = 10
): Record<string, string> {
  const hsl = parseHSL(baseColor);
  const scale: Record<string, string> = {};

  for (let i = 0; i < steps; i++) {
    const lightness = (i / (steps - 1)) * 100;
    scale[i.toString()] = hslToString({ ...hsl, l: lightness });
  }

  return scale;
}

// ============================================================================
// CONTRAST CALCULATION
// ============================================================================

/**
 * Calculate relative luminance (WCAG formula)
 */
export function calculateLuminance(hsl: HSLColor): number {
  // Convert HSL to RGB
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  // Convert to sRGB
  const toLinear = (c: number) => {
    c = c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return c;
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 */
export function calculateContrastRatio(foreground: string, background: string): ContrastRatio {
  const fg = parseHSL(foreground);
  const bg = parseHSL(background);

  const fgLuminance = calculateLuminance(fg);
  const bgLuminance = calculateLuminance(bg);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  // WCAG AA thresholds
  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3.0;
  const aaaNormal = ratio >= 7.0;
  const aaaLarge = ratio >= 4.5;

  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: aaNormal,
    aaa: aaaNormal,
    aaLarge: aaLarge,
    aaaLarge: aaaLarge,
  };
}

/**
 * Check if color contrast meets WCAG standards
 */
export function checkWCAGCompliance(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): { compliant: boolean; level: 'AA' | 'AAA' | 'None'; ratio: number } {
  const contrast = calculateContrastRatio(foreground, background);

  if (isLargeText) {
    if (contrast.aaaLarge) {
      return { compliant: true, level: 'AAA', ratio: contrast.ratio };
    } else if (contrast.aaLarge) {
      return { compliant: true, level: 'AA', ratio: contrast.ratio };
    }
  } else {
    if (contrast.aaa) {
      return { compliant: true, level: 'AAA', ratio: contrast.ratio };
    } else if (contrast.aa) {
      return { compliant: true, level: 'AA', ratio: contrast.ratio };
    }
  }

  return { compliant: false, level: 'None', ratio: contrast.ratio };
}

/**
 * Find optimal text color for background
 */
export function findOptimalTextColor(
  backgroundColor: string,
  lightColor: string = '0 0% 100%',
  darkColor: string = '222.2 84% 4.9%'
): string {
  const contrastLight = calculateContrastRatio(lightColor, backgroundColor);
  const contrastDark = calculateContrastRatio(darkColor, backgroundColor);

  return contrastLight.ratio > contrastDark.ratio ? lightColor : darkColor;
}

// ============================================================================
// THEME GENERATION
// ============================================================================

/**
 * Generate theme from base color
 */
export function generateThemeFromBaseColor(
  baseColor: string,
  mode: 'light' | 'dark' = 'light'
): Partial<ThemeConfig> {
  const baseHSL = parseHSL(baseColor);
  const isLight = mode === 'light';

  // Generate color palette
  const colors: Record<string, string> = {
    background: isLight ? '0 0% 100%' : '222.2 84% 4.9%',
    foreground: isLight ? '222.2 84% 4.9%' : '210 40% 98%',
    primary: hslToString(baseHSL),
    'primary-foreground': findOptimalTextColor(baseColor),
    secondary: isLight ? '210 40% 96.1%' : '217.2 32.6% 17.5%',
    'secondary-foreground': isLight ? '222.2 47.4% 11.2%' : '210 40% 98%',
    muted: isLight ? '210 40% 96.1%' : '217.2 32.6% 17.5%',
    'muted-foreground': isLight ? '215.4 16.3% 46.9%' : '215 20.2% 65.1%',
    accent: hslToString(saturateHSL(baseHSL, 10)),
    'accent-foreground': isLight ? '222.2 47.4% 11.2%' : '210 40% 98%',
    destructive: isLight ? '0 84.2% 60.2%' : '0 62.8% 30.6%',
    'destructive-foreground': isLight ? '210 40% 98%' : '210 40% 98%',
    border: isLight ? '214.3 31.8% 91.4%' : '217.2 32.6% 17.5%',
    input: isLight ? '214.3 31.8% 91.4%' : '217.2 32.6% 17.5%',
    ring: hslToString(baseHSL),
  };

  return {
    mode: (mode === 'light' ? 'light' : 'dark') as ThemeMode,
    colors,
  };
}

/**
 * Generate high contrast theme
 */
export function generateHighContrastTheme(mode: 'light' | 'dark' = 'light'): Partial<ThemeConfig> {
  const isLight = mode === 'light';

  const colors: Record<string, string> = {
    background: isLight ? '0 0% 100%' : '0 0% 0%',
    foreground: isLight ? '0 0% 0%' : '0 0% 100%',
    primary: isLight ? '0 0% 0%' : '0 0% 100%',
    'primary-foreground': isLight ? '0 0% 100%' : '0 0% 0%',
    secondary: isLight ? '0 0% 96%' : '0 0% 10%',
    'secondary-foreground': isLight ? '0 0% 10%' : '0 0% 96%',
    muted: isLight ? '0 0% 96%' : '0 0% 10%',
    'muted-foreground': isLight ? '0 0% 30%' : '0 0% 70%',
    accent: isLight ? '0 0% 96%' : '0 0% 10%',
    'accent-foreground': isLight ? '0 0% 10%' : '0 0% 96%',
    destructive: isLight ? '0 84% 60%' : '0 62% 30%',
    'destructive-foreground': isLight ? '0 0% 100%' : '0 0% 100%',
    border: isLight ? '0 0% 90%' : '0 0% 20%',
    input: isLight ? '0 0% 90%' : '0 0% 20%',
    ring: isLight ? '0 0% 10%' : '0 0% 90%',
  };

  return {
    mode: (mode === 'light' ? 'light' : 'dark') as ThemeMode,
    colors: {
      background: isLight ? '0 0% 100%' : '0 0% 0%',
      foreground: isLight ? '0 0% 0%' : '0 0% 100%',
      primary: isLight ? '0 0% 0%' : '0 0% 100%',
      'primary-foreground': isLight ? '0 0% 100%' : '0 0% 0%',
      secondary: isLight ? '0 0% 96%' : '0 0% 10%',
      'secondary-foreground': isLight ? '0 0% 10%' : '0 0% 96%',
      muted: isLight ? '0 0% 96%' : '0 0% 10%',
      'muted-foreground': isLight ? '0 0% 30%' : '0 0% 70%',
      accent: isLight ? '0 0% 96%' : '0 0% 10%',
      'accent-foreground': isLight ? '0 0% 10%' : '0 0% 96%',
      destructive: '0 100% 50%',
      'destructive-foreground': isLight ? '0 0% 100%' : '0 0% 0%',
      border: isLight ? '0 0% 0%' : '0 0% 100%',
      input: isLight ? '0 0% 0%' : '0 0% 100%',
      ring: isLight ? '0 0% 0%' : '0 0% 100%',
      card: isLight ? '0 0% 100%' : '0 0% 0%',
      'card-foreground': isLight ? '0 0% 0%' : '0 0% 100%',
      popover: isLight ? '0 0% 100%' : '0 0% 0%',
      'popover-foreground': isLight ? '0 0% 0%' : '0 0% 100%',
    },
    accessibility: {
      minContrastNormal: 7.0,
      minContrastLarge: 4.5,
      reducedMotion: false,
      highContrast: true,
    },
  };
}

/**
 * Generate sepia theme (comfort reading)
 */
export function generateSepiaTheme(): Partial<ThemeConfig> {
  return {
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
    accessibility: {
      minContrastNormal: 4.5,
      minContrastLarge: 3.0,
      reducedMotion: false,
      highContrast: false,
    },
  };
}

// ============================================================================
// THEME VALIDATION
// ============================================================================

/**
 * Validate theme configuration
 */
export function validateTheme(theme: ThemeConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!theme.metadata?.id) {
    errors.push('Theme metadata.id is required');
  }

  if (!theme.metadata?.name) {
    errors.push('Theme metadata.name is required');
  }

  if (!theme.colors) {
    errors.push('Theme colors are required');
  }

  // Check required colors
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

  if (theme.colors) {
    for (const color of requiredColors) {
      if (!theme.colors[color]) {
        errors.push(`Required color "${color}" is missing`);
      } else {
        try {
          parseHSL(theme.colors[color]);
        } catch (error) {
          errors.push(`Invalid HSL format for color "${color}"`);
        }
      }
    }

    // Check contrast ratios
    const criticalPairs = [
      ['background', 'foreground'],
      ['primary', 'primary-foreground'],
      ['secondary', 'secondary-foreground'],
    ];

    for (const [bg, fg] of criticalPairs) {
      if (theme.colors[bg] && theme.colors[fg]) {
        const contrast = calculateContrastRatio(theme.colors[fg], theme.colors[bg]);
        if (!contrast.aa) {
          warnings.push(
            `Low contrast ratio (${contrast.ratio}:1) between "${fg}" and "${bg}" (minimum 4.5:1 required for AA)`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// THEME APPLICATION
// ============================================================================

/**
 * Apply theme to document
 */
export function applyThemeToDocument(theme: ThemeConfig): void {
  const root = document.documentElement;

  // Apply all CSS variables
  const css = generateThemeCSS(theme);
  const styleElement = document.getElementById('theme-variables') || document.createElement('style');
  styleElement.id = 'theme-variables';
  styleElement.textContent = `:root {\n${css}\n}`;

  if (!document.getElementById('theme-variables')) {
    document.head.appendChild(styleElement);
  }

  // Apply theme mode class
  root.classList.remove('light', 'dark');
  root.classList.add(theme.mode);

  // Apply accessibility preferences
  if (theme.accessibility?.reducedMotion) {
    root.style.setProperty('--motion-reduce', 'reduce');
  } else {
    root.style.removeProperty('--motion-reduce');
  }

  if (theme.accessibility?.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
}

/**
 * Remove theme from document
 */
export function removeThemeFromDocument(): void {
  const root = document.documentElement;
  const styleElement = document.getElementById('theme-variables');

  if (styleElement) {
    styleElement.remove();
  }

  root.classList.remove('light', 'dark', 'high-contrast');
  root.style.removeProperty('--motion-reduce');
}
