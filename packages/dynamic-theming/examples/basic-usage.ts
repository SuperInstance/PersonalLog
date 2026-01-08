/**
 * Basic Usage Example
 *
 * Demonstrates basic theme switching with built-in themes
 */

import { initializeThemeRegistry, themeRegistry } from '@superinstance/dynamic-theming';

async function main() {
  // 1. Initialize the theme registry
  await initializeThemeRegistry();
  console.log('✅ Theme registry initialized');

  // 2. Get all available themes
  const allThemes = themeRegistry.getAllThemes();
  console.log('\n📋 Available themes:');
  allThemes.forEach(theme => {
    console.log(`  - ${theme.metadata.name} (${theme.mode})`);
  });

  // 3. Apply light theme
  await themeRegistry.setTheme('default' as any);
  console.log('\n🌞 Applied light theme');
  console.log(`   Active: ${themeRegistry.getActiveTheme()?.metadata.name}`);

  // 4. Apply dark theme
  await themeRegistry.setTheme('dark' as any);
  console.log('\n🌙 Applied dark theme');
  console.log(`   Active: ${themeRegistry.getActiveTheme()?.metadata.name}`);

  // 5. Apply high contrast theme
  await themeRegistry.setTheme('high-contrast' as any);
  console.log('\n⚡ Applied high contrast theme');
  console.log(`   Active: ${themeRegistry.getActiveTheme()?.metadata.name}`);

  // 6. Get active theme info
  const activeTheme = themeRegistry.getActiveTheme();
  if (activeTheme) {
    console.log('\nℹ️  Active theme info:');
    console.log(`   Name: ${activeTheme.metadata.name}`);
    console.log(`   Mode: ${activeTheme.mode}`);
    console.log(`   Category: ${activeTheme.metadata.category}`);
    console.log(`   Version: ${activeTheme.metadata.version}`);
    console.log(`   Tags: ${activeTheme.metadata.tags.join(', ')}`);
  }

  // 7. Get theme settings
  const settings = themeRegistry.getSettings();
  console.log('\n⚙️  Theme settings:');
  console.log(`   Auto-switch: ${settings.autoSwitch}`);
  console.log(`   Light theme: ${settings.lightThemeId}`);
  console.log(`   Dark theme: ${settings.darkThemeId}`);
  console.log(`   Font size multiplier: ${settings.fontSizeMultiplier}`);
  console.log(`   Reduced motion: ${settings.reducedMotion}`);
  console.log(`   High contrast: ${settings.highContrast}`);
}

// Run the example
main().catch(console.error);
