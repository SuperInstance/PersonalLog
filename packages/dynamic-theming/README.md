# @superinstance/dynamic-theming

> Dynamic theming system with WCAG accessibility compliance, CSS variable generation, and theme management

## Features

- **Dynamic Theme Switching** - Seamlessly switch between light, dark, and custom themes
- **WCAG Compliance** - Built-in accessibility validation (WCAG AA/AAA)
- **CSS Variable Generation** - Automatic CSS custom property generation
- **Color Utilities** - HSL color manipulation, contrast calculation, and color scales
- **Theme Validation** - Comprehensive theme validation with quality scoring
- **Export/Import** - Share themes as JSON packages
- **Built-in Themes** - 5 production-ready themes included
- **Zero Dependencies** - Works standalone with no external dependencies
- **TypeScript First** - Full TypeScript support with comprehensive types

## Installation

```bash
npm install @superinstance/dynamic-theming
```

## Quick Start

```typescript
import { initializeThemeRegistry, themeRegistry } from '@superinstance/dynamic-theming';

// Initialize the theme registry
await initializeThemeRegistry();

// Apply a theme
await themeRegistry.setTheme('dark');

// Get all available themes
const themes = themeRegistry.getAllThemes();
console.log(themes.map(t => t.metadata.name));
// Output: ['Default Light', 'Default Dark', 'High Contrast', 'Sepia Comfort', 'Minimal']
```

## Basic Usage

### 1. Initialize and Apply Themes

```typescript
import { initializeThemeRegistry, themeRegistry } from '@superinstance/dynamic-theming';

// Initialize on app startup
await initializeThemeRegistry();

// Apply built-in themes
await themeRegistry.setTheme('default');      // Light theme
await themeRegistry.setTheme('dark');         // Dark theme
await themeRegistry.setTheme('high-contrast'); // High contrast theme

// Get active theme
const activeTheme = themeRegistry.getActiveTheme();
console.log(activeTheme?.metadata.name); // 'Default Dark'
```

### 2. Create and Register Custom Themes

```typescript
import { themeRegistry, ThemeMode, ThemeCategory } from '@superinstance/dynamic-theming';

// Create a custom theme
const customTheme = {
  metadata: {
    id: 'my-ocean-theme' as any,
    name: 'Ocean Blue',
    description: 'Calming ocean blue theme',
    version: '1.0.0',
    author: { name: 'Your Name' },
    category: ThemeCategory.CUSTOM,
    tags: ['blue', 'ocean', 'calm'],
    previewColors: {
      primary: '210 100% 50%',
      secondary: '210 20% 90%',
      accent: '180 100% 40%',
      background: '210 20% 98%',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  mode: ThemeMode.LIGHT,
  colors: {
    background: '210 20% 98%',
    foreground: '210 20% 10%',
    card: '210 20% 98%',
    'card-foreground': '210 20% 10%',
    popover: '210 20% 98%',
    'popover-foreground': '210 20% 10%',
    primary: '210 100% 50%',
    'primary-foreground': '210 20% 98%',
    secondary: '210 20% 90%',
    'secondary-foreground': '210 20% 10%',
    muted: '210 20% 90%',
    'muted-foreground': '210 20% 40%',
    accent: '180 100% 40%',
    'accent-foreground': '210 20% 98%',
    destructive: '0 84% 60%',
    'destructive-foreground': '210 20% 98%',
    border: '210 20% 85%',
    input: '210 20% 85%',
    ring: '210 100% 50%',
  },
};

// Register the theme
await themeRegistry.registerTheme(customTheme);

// Apply it
await themeRegistry.setTheme('my-ocean-theme' as any);
```

### 3. Generate Theme from Base Color

```typescript
import { generateThemeFromBaseColor, applyThemeToDocument, ThemeMode } from '@superinstance/dynamic-theming';

// Generate a theme from a base color
const purpleTheme = generateThemeFromBaseColor('270 100% 50%', 'light');

// Apply to document
applyThemeToDocument({
  metadata: {
    id: 'purple' as any,
    name: 'Purple Theme',
    version: '1.0.0',
    author: { name: 'Auto Generated' },
    category: 'custom' as any,
    tags: ['purple'],
    previewColors: {
      primary: '270 100% 50%',
      secondary: '270 20% 90%',
      accent: '270 100% 40%',
      background: '0 0% 100%',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  mode: ThemeMode.LIGHT,
  ...purpleTheme,
});
```

### 4. Validate Themes

```typescript
import { validateTheme, isThemePublishable, getThemeQualityScore } from '@superinstance/dynamic-theming';

// Validate theme configuration
const validation = validateTheme(myTheme);
console.log(validation.valid); // true/false
console.log(validation.errors); // Array of errors
console.log(validation.warnings); // Array of warnings
console.log(validation.accessibility?.wcagAA); // WCAG AA compliance

// Check if theme is ready for publication
const publishable = isThemePublishable(myTheme);
console.log(publishable); // true/false

// Get theme quality score (0-100)
const score = getThemeQualityScore(myTheme);
console.log(score); // 85
```

### 5. Export and Import Themes

```typescript
import { exportThemeAsPlugin, importThemeFromPlugin } from '@superinstance/dynamic-theming';

// Export theme to JSON
const themeJson = exportThemeAsPlugin('my-theme' as any);
console.log(themeJson);
// {
//   "formatVersion": "1.0.0",
//   "theme": { ... },
//   "exportedAt": 1234567890,
//   "exportedBy": "@superinstance/dynamic-theming",
//   "checksum": "abc123"
// }

// Save to file or share

// Import theme from JSON
const result = await importThemeFromPlugin(themeJson);
if (result.success) {
  console.log('Theme imported:', result.themeId);
} else {
  console.error('Import failed:', result.error);
}
```

### 6. Color Utilities

```typescript
import {
  parseHSL,
  hslToString,
  lightenHSL,
  darkenHSL,
  saturateHSL,
  rotateHue,
  createColorScale,
  calculateContrastRatio,
  findOptimalTextColor
} from '@superinstance/dynamic-theming';

// Parse HSL color
const color = parseHSL('270 100% 50%');
// { h: 270, s: 100, l: 50 }

// Manipulate colors
const lighter = lightenHSL(color, 10);
const darker = darkenHSL(color, 20);
const saturated = saturateHSL(color, 15);
const rotated = rotateHue(color, 45);

// Convert back to string
hslToString(lighter); // '270 100% 60%'

// Create color scale
const scale = createColorScale('270 100% 50%', 10);
// { '0': '270 100% 0%', '1': '270 100% 11%', ..., '9': '270 100% 100%' }

// Calculate contrast ratio
const contrast = calculateContrastRatio('0 0% 0%', '255 100% 100%');
console.log(contrast.ratio); // 21.0
console.log(contrast.aa); // true
console.log(contrast.aaa); // true

// Find optimal text color for background
const textColor = findOptimalTextColor('200 20% 90%');
// Returns the color (black or white) with better contrast
```

## Advanced Usage

### Auto-Switch Based on System Preference

```typescript
import { themeRegistry } from '@superinstance/dynamic-theming';

// Enable auto-switching
await themeRegistry.updateSettings({
  autoSwitch: true,
  lightThemeId: 'default' as any,
  darkThemeId: 'dark' as any,
});

// Now theme will automatically switch based on system preference
```

### Listen to Theme Events

```typescript
import { themeRegistry, ThemeEventType } from '@superinstance/dynamic-theming';

// Listen for theme changes
themeRegistry.on(ThemeEventType.THEME_APPLIED, (event) => {
  console.log('Theme applied:', event.themeId);
  console.log('Timestamp:', event.timestamp);
  console.log('Theme data:', event.data);
});

themeRegistry.on(ThemeEventType.THEME_CHANGED, (event) => {
  console.log('Theme changed:', event.themeId);
});

// Remove listener
themeRegistry.off(ThemeEventType.THEME_APPLIED, listener);
```

### Direct CSS Variable Application

```typescript
import { generateThemeCSS, applyThemeToDocument } from '@superinstance/dynamic-theming';

// Generate CSS variables
const css = generateThemeCSS(myTheme);
console.log(css);
/* Colors */
/*   --background: 0 0% 100%; */
/*   --foreground: 222.2 84% 4.9%; */
/* ... */

// Apply directly to document
applyThemeToDocument(myTheme);

// Remove theme from document
import { removeThemeFromDocument } from '@superinstance/dynamic-theming';
removeThemeFromDocument();
```

### Search and Filter Themes

```typescript
import { themeRegistry } from '@superinstance/dynamic-theming';

// Get themes by mode
const lightThemes = themeRegistry.getThemesByMode(ThemeMode.LIGHT);
const darkThemes = themeRegistry.getThemesByMode(ThemeMode.DARK);

// Get themes by category
const customThemes = themeRegistry.getThemesByCategory(ThemeCategory.CUSTOM);
const builtinThemes = themeRegistry.getBuiltinThemes();

// Search themes
const results = themeRegistry.searchThemes('blue');
console.log(results.map(t => t.metadata.name));
// ['Ocean Blue', 'Blue Night', ...]
```

## Built-in Themes

### Default Light
Clean, modern light theme optimized for readability

### Default Dark
Dark theme optimized for low-light environments

### High Contrast
Maximum contrast theme for accessibility (WCAG AAA)

### Sepia Comfort
Warm comfort theme for extended reading sessions

### Minimal
Pure black and white theme for maximum focus

## Accessibility Features

All themes include:

- **WCAG AA Compliance** - Minimum 4.5:1 contrast ratio for normal text
- **WCAG AAA Support** - 7:1 contrast ratio for enhanced accessibility
- **High Contrast Mode** - Special themes with maximum contrast
- **Reduced Motion** - Respects prefers-reduced-motion
- **Text Scaling** - Uses rem units for proper text scaling

## API Reference

### Registry

- `initializeThemeRegistry()` - Initialize theme registry
- `cleanupThemeRegistry()` - Cleanup event listeners
- `themeRegistry.registerTheme(theme)` - Register a new theme
- `themeRegistry.updateTheme(id, updates)` - Update existing theme
- `themeRegistry.unregisterTheme(id)` - Unregister a theme
- `themeRegistry.getTheme(id)` - Get theme by ID
- `themeRegistry.getAllThemes()` - Get all themes
- `themeRegistry.setTheme(id)` - Set active theme
- `themeRegistry.getActiveTheme()` - Get active theme
- `themeRegistry.searchThemes(query)` - Search themes

### Engine

- `generateThemeCSS(theme)` - Generate CSS variables
- `applyThemeToDocument(theme)` - Apply theme to DOM
- `removeThemeFromDocument()` - Remove theme from DOM
- `calculateContrastRatio(fg, bg)` - Calculate contrast ratio
- `generateThemeFromBaseColor(color, mode)` - Generate theme from color
- `generateHighContrastTheme(mode)` - Generate high contrast theme

### Validation

- `validateTheme(theme)` - Validate theme configuration
- `isThemePublishable(theme)` - Check if theme is publishable
- `getThemeQualityScore(theme)` - Get theme quality score (0-100)

### Export/Import

- `exportThemeAsPlugin(id)` - Export theme as JSON
- `importThemeFromPlugin(json)` - Import theme from JSON
- `prepareThemeForDistribution(id)` - Prepare theme for distribution

## Examples

See the `/examples` directory for complete working examples:

- Basic usage - Simple theme switching
- Custom theme - Creating and registering custom themes
- Color utilities - Color manipulation and contrast calculation
- Export/import - Sharing themes as JSON
- Auto-switch - System preference-based theme switching

## License

MIT

## Repository

https://github.com/SuperInstance/Dynamic-Theming

## Support

For issues and questions, please visit:
https://github.com/SuperInstance/Dynamic-Theming/issues
