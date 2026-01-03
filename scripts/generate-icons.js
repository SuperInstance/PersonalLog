#!/usr/bin/env node
/**
 * Generate PWA icons from SVG source
 * Run: node scripts/generate-icons.js
 *
 * Requirements:
 * - npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

// Try to load sharp
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ sharp not found!');
  console.error('');
  console.error('To generate icons, install sharp:');
  console.error('  npm install --save-dev sharp');
  console.error('');
  console.error('Or use an online tool like https://favicon.io/');
  process.exit(1);
}

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.dirname(SCRIPT_DIR);
const SVG_SOURCE = path.join(PROJECT_ROOT, 'public', 'icon.svg');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

console.log('🎨 Generating PWA icons from', SVG_SOURCE);
console.log('');

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Additional sizes for favicon
const faviconSizes = [16, 32, 48];

async function generateIcons() {
  try {
    // Check if source SVG exists
    if (!fs.existsSync(SVG_SOURCE)) {
      throw new Error(`Source SVG not found: ${SVG_SOURCE}`);
    }

    // Generate standard PWA icons
    console.log('Generating PWA icons:');
    for (const size of sizes) {
      const output = path.join(PUBLIC_DIR, `icon-${size}x${size}.png`);
      console.log(`  → Generating ${size}x${size}...`);

      await sharp(SVG_SOURCE)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(output);
    }

    // Generate favicon sizes
    console.log('');
    console.log('Generating favicon sizes:');
    for (const size of faviconSizes) {
      const output = path.join(PUBLIC_DIR, `favicon-${size}x${size}.png`);
      console.log(`  → Generating favicon-${size}x${size}.png...`);

      await sharp(SVG_SOURCE)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(output);
    }

    // Note: favicon.ico requires special handling
    // For now, we'll use the PNG files and let browsers pick the right size
    console.log('');
    console.log('✅ Icons generated successfully!');
    console.log('');
    console.log('Generated files:');
    const files = fs.readdirSync(PUBLIC_DIR)
      .filter(f => f.startsWith('icon-') || f.startsWith('favicon-'))
      .sort();

    files.forEach(file => {
      const filePath = path.join(PUBLIC_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${file} (${formatBytes(stats.size)})`);
    });

    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Update manifest.json icon paths');
    console.log('  2. Update layout.tsx metadata');
    console.log('  3. Test icons in different browsers');
    console.log('');
    console.log('💡 Tip: For favicon.ico, use an online converter:');
    console.log('   https://favicon.io/favicon-converter/');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run the script
generateIcons();
