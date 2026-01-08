/**
 * Custom Theme Example
 *
 * Demonstrates creating and registering a custom theme
 */

import {
  initializeThemeRegistry,
  themeRegistry,
  ThemeMode,
  ThemeCategory,
  applyThemeToDocument,
  validateTheme,
  getThemeQualityScore
} from '@superinstance/dynamic-theming';

async function main() {
  // 1. Initialize the theme registry
  await initializeThemeRegistry();
  console.log('✅ Theme registry initialized');

  // 2. Create a custom forest theme
  const forestTheme = {
    metadata: {
      id: 'forest-green' as any,
      name: 'Forest Green',
      description: 'Nature-inspired forest green theme',
      version: '1.0.0',
      author: {
        name: 'Your Name',
        email: 'your.email@example.com',
      },
      category: ThemeCategory.CUSTOM,
      tags: ['green', 'nature', 'forest', 'calm'],
      previewColors: {
        primary: '142 76% 36%',
        secondary: '142 20% 90%',
        accent: '142 60% 45%',
        background: '142 20% 98%',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    mode: ThemeMode.LIGHT,
    colors: {
      background: '142 20% 98%',
      foreground: '142 20% 10%',
      card: '142 20% 98%',
      'card-foreground': '142 20% 10%',
      popover: '142 20% 98%',
      'popover-foreground': '142 20% 10%',
      primary: '142 76% 36%',
      'primary-foreground': '142 20% 98%',
      secondary: '142 20% 90%',
      'secondary-foreground': '142 20% 10%',
      muted: '142 20% 90%',
      'muted-foreground': '142 20% 40%',
      accent: '142 60% 45%',
      'accent-foreground': '142 20% 98%',
      destructive: '0 84% 60%',
      'destructive-foreground': '142 20% 98%',
      border: '142 20% 85%',
      input: '142 20% 85%',
      ring: '142 76% 36%',
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
        light: 300 as any,
        normal: 400 as any,
        medium: 500 as any,
        semibold: 600 as any,
        bold: 700 as any,
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

  // 3. Validate the theme
  console.log('\n🔍 Validating theme...');
  const validation = validateTheme(forestTheme);
  console.log(`   Valid: ${validation.valid}`);
  console.log(`   Errors: ${validation.errors.length}`);
  console.log(`   Warnings: ${validation.warnings.length}`);
  console.log(`   WCAG AA: ${validation.accessibility?.wcagAA}`);
  console.log(`   WCAG AAA: ${validation.accessibility?.wcagAAA}`);

  // 4. Get quality score
  const score = getThemeQualityScore(forestTheme);
  console.log(`\n📊 Quality score: ${score}/100`);

  // 5. Register the theme
  console.log('\n📝 Registering theme...');
  await themeRegistry.registerTheme(forestTheme);
  console.log('✅ Theme registered successfully');

  // 6. Apply the theme
  console.log('\n🎨 Applying theme...');
  await themeRegistry.setTheme('forest-green' as any);
  console.log('✅ Theme applied');

  // 7. Apply directly to document (alternative method)
  console.log('\n🖌️  Applying theme to document...');
  applyThemeToDocument(forestTheme);
  console.log('✅ Theme applied to document');

  // 8. Verify it's active
  const activeTheme = themeRegistry.getActiveTheme();
  console.log(`\n✨ Active theme: ${activeTheme?.metadata.name}`);

  // 9. Update the theme
  console.log('\n🔄 Updating theme...');
  await themeRegistry.updateTheme('forest-green' as any, {
    metadata: {
      id: 'forest-green' as any,
      name: 'Forest Green',
      version: '1.0.1',
      category: ThemeCategory.CUSTOM,
      tags: ['green', 'nature', 'forest', 'calm'],
      previewColors: {
        primary: '142 76% 36%',
        secondary: '142 20% 90%',
        accent: '142 60% 45%',
        background: '142 20% 98%',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      description: 'Updated nature-inspired forest green theme',
    },
  });
  console.log('✅ Theme updated');

  // 10. Get custom themes
  const customThemes = themeRegistry.getCustomThemes();
  console.log(`\n🎭 Custom themes: ${customThemes.length}`);
  customThemes.forEach(theme => {
    console.log(`   - ${theme.metadata.name}`);
  });
}

// Run the example
main().catch(console.error);
