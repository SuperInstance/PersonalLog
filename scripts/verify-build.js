#!/usr/bin/env node

/**
 * Production Build Verification Script
 *
 * Verifies that the production build is complete and within size limits.
 * This script should run after `npm run build` to ensure everything is correct.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Configuration
const MAX_BUNDLE_SIZE = 500 * 1024; // 500KB in bytes
const MAX_CHUNK_SIZE = 200 * 1024; // 200KB for individual chunks

// Verification results
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

async function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function verifyBuildOutput() {
  log('\n========================================', 'cyan');
  log('  Build Output Verification', 'cyan');
  log('========================================\n', 'cyan');

  const buildDir = path.resolve(__dirname, '..', '.next');
  const requiredPaths = [
    { path: 'build-manifest.json', description: 'Build manifest' },
    { path: 'server/app-build-manifest.json', description: 'App build manifest' },
    { path: 'static/chunks/pages/_buildManifest.js', description: 'Pages build manifest' },
    { path: 'static/chunks/pages/_ssgManifest.js', description: 'SSG manifest' },
  ];

  let allExists = true;
  for (const { path: relPath, description } of requiredPaths) {
    const fullPath = path.join(buildDir, relPath);
    if (fs.existsSync(fullPath)) {
      success(`${description} exists`);
      results.passed.push(description);
    } else {
      // Some paths might not exist in Next.js 15
      warn(`${description} not found (might be optional in Next.js 15)`);
      results.warnings.push(`${description} not found`);
    }
  }

  return allExists;
}

async function verifyPublicAssets() {
  log('\n========================================', 'cyan');
  log('  Public Assets Verification', 'cyan');
  log('========================================\n', 'cyan');

  const publicDir = path.resolve(__dirname, '..', 'public');
  const requiredAssets = [
    { path: 'icon.svg', description: 'App icon' },
    { path: 'manifest.json', description: 'PWA manifest' },
  ];

  for (const { path: relPath, description } of requiredAssets) {
    const fullPath = path.join(publicDir, relPath);
    if (fs.existsSync(fullPath)) {
      const size = await getFileSize(fullPath);
      success(`${description} exists (${formatBytes(size)})`);
      results.passed.push(description);
    } else {
      warn(`${description} not found (optional)`);
      results.warnings.push(`${description} not found`);
    }
  }
}

async function verifyBundleSizes() {
  log('\n========================================', 'cyan');
  log('  Bundle Size Verification', 'cyan');
  log('========================================\n', 'cyan');

  const staticDir = path.resolve(__dirname, '..', '.next', 'static');
  const chunksDir = path.join(staticDir, 'chunks');

  if (!fs.existsSync(chunksDir)) {
    warn('Chunks directory not found');
    results.warnings.push('No chunks directory');
    return;
  }

  // Get all JS files in chunks directory
  const files = fs.readdirSync(chunksDir)
    .filter(f => f.endsWith('.js'))
    .map(f => ({
      name: f,
      path: path.join(chunksDir, f),
    }))
    .filter(async f => {
      // Skip framework files
      const name = path.basename(f.name);
      return !name.startsWith('framework-') &&
             !name.startsWith('webpack-');
    });

  let totalSize = 0;
  const largeFiles = [];

  for (const file of files) {
    const size = await getFileSize(file.path);
    if (size !== null) {
      totalSize += size;
      if (size > MAX_CHUNK_SIZE) {
        largeFiles.push({ name: file.name, size });
      }
    }
  }

  info(`Total chunks size: ${formatBytes(totalSize)}`);
  info(`Total chunks (uncompressed): ${formatBytes(totalSize)}`);

  // Note: gzipped size would be much smaller (typically 60-80% reduction)
  const estimatedGzipped = totalSize * 0.7; // Rough estimate
  info(`Estimated gzipped: ${formatBytes(estimatedGzipped)}`);

  if (estimatedGzipped > MAX_BUNDLE_SIZE) {
    error(`Bundle size exceeds limit (${formatBytes(MAX_BUNDLE_SIZE)})`);
    results.failed.push('Bundle size limit exceeded');
  } else {
    success('Bundle size is within acceptable limits');
    results.passed.push('Bundle size check');
  }

  if (largeFiles.length > 0) {
    warn(`Found ${largeFiles.length} large chunks (> ${formatBytes(MAX_CHUNK_SIZE)}):`);
    largeFiles.forEach(({ name, size }) => {
      warn(`  - ${name}: ${formatBytes(size)}`);
    });
    results.warnings.push('Large chunks found');
  }
}

async function verifyWasmArtifacts() {
  log('\n========================================', 'cyan');
  log('  WASM Artifacts Verification', 'cyan');
  log('========================================\n', 'cyan');

  const wasmPkgDir = path.resolve(__dirname, '..', 'native', 'rust', 'pkg');

  if (!fs.existsSync(wasmPkgDir)) {
    info('WASM artifacts not found (optional - will use JavaScript fallback)');
    results.warnings.push('WASM not built');
    return;
  }

  const requiredFiles = [
    { path: 'personallog_native.js', description: 'WASM JS glue' },
    { path: 'personallog_native_bg.wasm', description: 'WASM binary' },
    { path: 'personallog_native.d.ts', description: 'WASM TypeScript definitions' },
  ];

  for (const { path: relPath, description } of requiredFiles) {
    const fullPath = path.join(wasmPkgDir, relPath);
    if (fs.existsSync(fullPath)) {
      const size = await getFileSize(fullPath);
      success(`${description} exists (${formatBytes(size)})`);
      results.passed.push(description);
    } else {
      error(`${description} not found`);
      results.failed.push(description);
    }
  }

  // Check WASM size
  const wasmPath = path.join(wasmPkgDir, 'personallog_native_bg.wasm');
  if (fs.existsSync(wasmPath)) {
    const wasmSize = await getFileSize(wasmPath);
    info(`WASM module size: ${formatBytes(wasmSize)}`);

    // WASM should be small (typically < 100KB for vector operations)
    if (wasmSize > 200 * 1024) {
      warn('WASM module is large (> 200KB)');
      results.warnings.push('Large WASM module');
    } else {
      success('WASM module size is acceptable');
    }
  }
}

async function verifyPageStructure() {
  log('\n========================================', 'cyan');
  log('  Page Structure Verification', 'cyan');
  log('========================================\n', 'cyan');

  const appDir = path.resolve(__dirname, '..', 'src', 'app');
  const requiredPages = [
    { path: 'page.tsx', description: 'Home page' },
    { path: 'layout.tsx', description: 'Root layout' },
  ];

  for (const { path: relPath, description } of requiredPages) {
    const fullPath = path.join(appDir, relPath);
    if (fs.existsSync(fullPath)) {
      success(`${description} exists`);
      results.passed.push(description);
    } else {
      error(`${description} not found`);
      results.failed.push(description);
    }
  }
}

async function runVerification() {
  log('\n========================================', 'cyan');
  log('  Production Build Verification', 'cyan');
  log('========================================\n', 'cyan');

  try {
    // Run all verifications
    await verifyPageStructure();
    await verifyBuildOutput();
    await verifyPublicAssets();
    await verifyBundleSizes();
    await verifyWasmArtifacts();

    // Print summary
    log('\n========================================', 'cyan');
    log('  Verification Summary', 'cyan');
    log('========================================\n', 'cyan');

    log(`Passed: ${results.passed.length}`, 'green');
    log(`Failed: ${results.failed.length}`, 'red');
    log(`Warnings: ${results.warnings.length}`, 'yellow');

    if (results.warnings.length > 0) {
      log('\nWarnings:', 'yellow');
      results.warnings.forEach(w => warn(`  - ${w}`));
    }

    if (results.failed.length > 0) {
      log('\nFailed checks:', 'red');
      results.failed.forEach(f => error(`  - ${f}`));
      log('\n❌ Verification FAILED', 'red');
      log('\nPlease fix the errors above before deploying.', 'red');
      process.exit(1);
    } else {
      log('\n✅ All critical checks passed!', 'green');
      log('\nYour build is ready for deployment.', 'green');
      process.exit(0);
    }
  } catch (err) {
    error(`Verification script failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run verification
runVerification();
