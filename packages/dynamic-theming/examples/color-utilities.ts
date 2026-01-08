/**
 * Color Utilities Example
 *
 * Demonstrates color manipulation and contrast calculation
 */

import {
  parseHSL,
  hslToString,
  lightenHSL,
  darkenHSL,
  saturateHSL,
  rotateHue,
  createColorScale,
  calculateContrastRatio,
  checkWCAGCompliance,
  findOptimalTextColor,
  generateThemeFromBaseColor,
} from '@superinstance/dynamic-theming';

function main() {
  console.log('🎨 Color Utilities Demo\n');

  // 1. Parse HSL color
  console.log('1️⃣ Parse HSL Color');
  const color = parseHSL('270 100% 50%');
  console.log(`   Input: '270 100% 50%'`);
  console.log(`   Parsed:`, color);
  console.log(`   Hue: ${color.h}°`);
  console.log(`   Saturation: ${color.s}%`);
  console.log(`   Lightness: ${color.l}%\n`);

  // 2. Convert back to string
  console.log('2️⃣ Convert to String');
  const colorString = hslToString(color);
  console.log(`   Output: '${colorString}'\n`);

  // 3. Lighten color
  console.log('3️⃣ Lighten Color');
  const lighter = lightenHSL(color, 20);
  console.log(`   Original: ${hslToString(color)}`);
  console.log(`   Lightened (+20%): ${hslToString(lighter)}\n`);

  // 4. Darken color
  console.log('4️⃣ Darken Color');
  const darker = darkenHSL(color, 20);
  console.log(`   Original: ${hslToString(color)}`);
  console.log(`   Darkened (-20%): ${hslToString(darker)}\n`);

  // 5. Saturate color
  console.log('5️⃣ Saturate Color');
  const baseColor = parseHSL('200 50% 50%');
  const saturated = saturateHSL(baseColor, 30);
  console.log(`   Original: ${hslToString(baseColor)}`);
  console.log(`   Saturated (+30%): ${hslToString(saturated)}\n`);

  // 6. Rotate hue
  console.log('6️⃣ Rotate Hue');
  const rotated = rotateHue(color, 90);
  console.log(`   Original: ${hslToString(color)} (${color.h}°)`);
  console.log(`   Rotated (+90°): ${hslToString(rotated)} (${rotated.h}°)\n`);

  // 7. Create color scale
  console.log('7️⃣ Create Color Scale');
  const scale = createColorScale('200 80% 50%', 10);
  console.log('   Scale (0-9):');
  Object.entries(scale).forEach(([key, value]) => {
    console.log(`     ${key}: ${value}`);
  });
  console.log();

  // 8. Calculate contrast ratio
  console.log('8️⃣ Calculate Contrast Ratio');
  const contrast1 = calculateContrastRatio('0 0% 0%', '0 0% 100%');
  console.log(`   Black on White: ${contrast1.ratio}:1`);
  console.log(`   WCAG AA: ${contrast1.aa}`);
  console.log(`   WCAG AAA: ${contrast1.aaa}`);

  const contrast2 = calculateContrastRatio('222.2 84% 4.9%', '0 0% 100%');
  console.log(`\n   Dark Gray on White: ${contrast2.ratio}:1`);
  console.log(`   WCAG AA: ${contrast2.aa}`);
  console.log(`   WCAG AAA: ${contrast2.aaa}\n`);

  // 9. Check WCAG compliance
  console.log('9️⃣ Check WCAG Compliance');
  const compliance1 = checkWCAGCompliance('0 0% 0%', '0 0% 100%');
  console.log(`   Black on White (normal text):`);
  console.log(`     Compliant: ${compliance1.compliant}`);
  console.log(`     Level: ${compliance1.level}`);
  console.log(`     Ratio: ${compliance1.ratio}:1`);

  const compliance2 = checkWCAGCompliance('200 50% 50%', '200 20% 95%', true);
  console.log(`\n   Blue on Light Blue (large text):`);
  console.log(`     Compliant: ${compliance2.compliant}`);
  console.log(`     Level: ${compliance2.level}`);
  console.log(`     Ratio: ${compliance2.ratio}:1\n`);

  // 10. Find optimal text color
  console.log('🔟 Find Optimal Text Color');
  const backgrounds = [
    '0 0% 100%', // White
    '0 0% 0%',   // Black
    '200 80% 95%', // Light blue
    '200 80% 20%', // Dark blue
  ];

  backgrounds.forEach(bg => {
    const textColor = findOptimalTextColor(bg);
    console.log(`   Background: ${bg}`);
    console.log(`   Optimal text: ${textColor}`);
    const contrast = calculateContrastRatio(textColor, bg);
    console.log(`   Contrast: ${contrast.ratio}:1\n`);
  });

  // 11. Generate theme from base color
  console.log('1️⃣1️⃣ Generate Theme from Base Color');
  const baseColor = '210 100% 50%'; // Blue
  const lightTheme = generateThemeFromBaseColor(baseColor, 'light');
  const darkTheme = generateThemeFromBaseColor(baseColor, 'dark');

  console.log('   Light Theme Colors:');
  console.log(`     Background: ${lightTheme.colors?.background}`);
  console.log(`     Foreground: ${lightTheme.colors?.foreground}`);
  console.log(`     Primary: ${lightTheme.colors?.primary}`);
  console.log(`     Secondary: ${lightTheme.colors?.secondary}`);

  console.log('\n   Dark Theme Colors:');
  console.log(`     Background: ${darkTheme.colors?.background}`);
  console.log(`     Foreground: ${darkTheme.colors?.foreground}`);
  console.log(`     Primary: ${darkTheme.colors?.primary}`);
  console.log(`     Secondary: ${darkTheme.colors?.secondary}\n`);

  // 12. Color palette generator
  console.log('1️⃣2️⃣ Generate Color Palette');
  const hue = 280; // Purple
  const saturation = 80;
  const palette = {
    50: hslToString({ h: hue, s: saturation, l: 95 }),
    100: hslToString({ h: hue, s: saturation, l: 90 }),
    200: hslToString({ h: hue, s: saturation, l: 80 }),
    300: hslToString({ h: hue, s: saturation, l: 70 }),
    400: hslToString({ h: hue, s: saturation, l: 60 }),
    500: hslToString({ h: hue, s: saturation, l: 50 }),
    600: hslToString({ h: hue, s: saturation, l: 40 }),
    700: hslToString({ h: hue, s: saturation, l: 30 }),
    800: hslToString({ h: hue, s: saturation, l: 20 }),
    900: hslToString({ h: hue, s: saturation, l: 10 }),
  };

  console.log('   Purple Palette:');
  Object.entries(palette).forEach(([shade, color]) => {
    console.log(`     ${shade}: ${color}`);
  });
}

// Run the example
main();
