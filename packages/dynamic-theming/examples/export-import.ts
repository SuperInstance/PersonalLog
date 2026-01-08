/**
 * Export/Import Example
 *
 * Demonstrates exporting and importing themes as JSON
 */

import {
  initializeThemeRegistry,
  themeRegistry,
  exportThemeAsPlugin,
  importThemeFromPlugin,
  prepareThemeForDistribution,
  searchThemes,
  ThemeCategory,
  ThemeMode,
} from '@superinstance/dynamic-theming';

async function main() {
  // 1. Initialize the theme registry
  await initializeThemeRegistry();
  console.log('✅ Theme registry initialized\n');

  // 2. Create a custom theme for export
  const customTheme = {
    metadata: {
      id: 'sunset-orange' as any,
      name: 'Sunset Orange',
      description: 'Warm sunset orange theme',
      version: '1.0.0',
      author: {
        name: 'Your Name',
        email: 'your.email@example.com',
      },
      category: ThemeCategory.CUSTOM,
      tags: ['orange', 'sunset', 'warm', 'vibrant'],
      previewColors: {
        primary: '25 100% 50%',
        secondary: '25 20% 90%',
        accent: '25 80% 55%',
        background: '0 0% 100%',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    mode: ThemeMode.LIGHT,
    colors: {
      background: '0 0% 100%',
      foreground: '25 20% 10%',
      card: '0 0% 100%',
      'card-foreground': '25 20% 10%',
      popover: '0 0% 100%',
      'popover-foreground': '25 20% 10%',
      primary: '25 100% 50%',
      'primary-foreground': '0 0% 100%',
      secondary: '25 20% 90%',
      'secondary-foreground': '25 20% 10%',
      muted: '25 20% 90%',
      'muted-foreground': '25 20% 40%',
      accent: '25 80% 55%',
      'accent-foreground': '0 0% 100%',
      destructive: '0 84% 60%',
      'destructive-foreground': '0 0% 100%',
      border: '25 20% 85%',
      input: '25 20% 85%',
      ring: '25 100% 50%',
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
  };

  // 3. Register the theme
  console.log('📝 Registering theme...');
  await themeRegistry.registerTheme(customTheme);
  console.log('✅ Theme registered\n');

  // 4. Export theme to JSON
  console.log('📦 Exporting theme to JSON...');
  const themeJson = exportThemeAsPlugin('sunset-orange' as any);
  console.log('✅ Theme exported\n');
  console.log('Exported JSON:');
  console.log(themeJson.substring(0, 300) + '...\n');

  // 5. Save to file (in a real app)
  // fs.writeFileSync('sunset-orange-theme.json', themeJson);
  console.log('💡 Tip: Save this JSON to a file for sharing\n');

  // 6. Unregister the theme (to test import)
  console.log('🗑️  Unregistering theme...');
  await themeRegistry.unregisterTheme('sunset-orange' as any);
  console.log('✅ Theme unregistered\n');

  // 7. Import theme from JSON
  console.log('📥 Importing theme from JSON...');
  const importResult = await importThemeFromPlugin(themeJson);

  if (importResult.success) {
    console.log('✅ Theme imported successfully');
    console.log(`   Theme ID: ${importResult.themeId}\n`);
  } else {
    console.error('❌ Import failed:', importResult.error);
    return;
  }

  // 8. Verify the imported theme
  const importedTheme = themeRegistry.getTheme('sunset-orange' as any);
  if (importedTheme) {
    console.log('🔍 Imported theme info:');
    console.log(`   Name: ${importedTheme.metadata.name}`);
    console.log(`   Description: ${importedTheme.metadata.description}`);
    console.log(`   Version: ${importedTheme.metadata.version}`);
    console.log(`   Author: ${importedTheme.metadata.author?.name}`);
    console.log(`   Category: ${importedTheme.metadata.category}`);
    console.log(`   Tags: ${importedTheme.metadata.tags.join(', ')}\n`);
  }

  // 9. Prepare for distribution
  console.log('📤 Preparing theme for distribution...');
  const distribution = prepareThemeForDistribution('sunset-orange' as any);

  if (distribution.ready) {
    console.log('✅ Theme is ready for distribution');
    console.log('   Export package:', distribution.exportPackage ? '✓' : '✗\n');
  } else {
    console.log('⚠️  Theme needs attention before distribution:');
    distribution.errors?.forEach(error => {
      console.log(`   - ${error}`);
    });
    console.log();
  }

  // 10. Search themes
  console.log('🔎 Searching themes...');
  const allThemes = themeRegistry.getAllThemes();
  const orangeThemes = searchThemes('orange', allThemes);
  console.log(`   Found ${orangeThemes.length} theme(s) matching "orange":`);
  orangeThemes.forEach(theme => {
    console.log(`   - ${theme.metadata.name}`);
  });
  console.log();

  // 11. Export all custom themes
  console.log('📦 Exporting all custom themes...');
  const customThemes = themeRegistry.getCustomThemes();
  console.log(`   Found ${customThemes.length} custom theme(s)`);

  for (const theme of customThemes) {
    try {
      const json = exportThemeAsPlugin(theme.metadata.id);
      console.log(`   ✓ ${theme.metadata.name} exported`);
      // In a real app: fs.writeFileSync(`${theme.metadata.id}.json`, json);
    } catch (error) {
      console.error(`   ✗ ${theme.metadata.name} export failed:`, error);
    }
  }
  console.log();

  // 12. Batch import
  console.log('📥 Batch import example...');
  const themeExports = [
    // Imagine these were loaded from files
    JSON.parse(themeJson),
    // ... more themes
  ];

  let imported = 0;
  for (const exportData of themeExports) {
    const result = await importThemeFromPlugin(JSON.stringify(exportData));
    if (result.success) {
      imported++;
    }
  }
  console.log(`   Imported ${imported} theme(s)\n`);

  // 13. Theme statistics
  console.log('📊 Theme statistics:');
  const stats = {
    total: themeRegistry.getAllThemes().length,
    builtin: themeRegistry.getBuiltinThemes().length,
    custom: themeRegistry.getCustomThemes().length,
    light: themeRegistry.getThemesByMode(ThemeMode.LIGHT).length,
    dark: themeRegistry.getThemesByMode(ThemeMode.DARK).length,
  };

  console.log(`   Total themes: ${stats.total}`);
  console.log(`   Built-in: ${stats.builtin}`);
  console.log(`   Custom: ${stats.custom}`);
  console.log(`   Light themes: ${stats.light}`);
  console.log(`   Dark themes: ${stats.dark}\n`);

  console.log('✨ Export/Import demo complete!');
}

// Run the example
main().catch(console.error);
