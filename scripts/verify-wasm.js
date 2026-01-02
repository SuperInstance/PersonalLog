#!/usr/bin/env node

/**
 * WASM Build Verification Script
 *
 * This script verifies that the WASM module is correctly built and functional.
 * It runs comprehensive tests to ensure the native module integrates properly.
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

// Verification results
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

async function verifyFileExists(filePath, description) {
  try {
    const fullPath = path.resolve(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      success(`${description} exists (${sizeKB} KB)`);
      results.passed.push(description);
      return true;
    } else {
      error(`${description} not found at ${filePath}`);
      results.failed.push(description);
      return false;
    }
  } catch (err) {
    error(`Failed to check ${description}: ${err.message}`);
    results.failed.push(description);
    return false;
  }
}

async function verifyWasmSize() {
  try {
    const wasmPath = path.resolve(__dirname, '..', 'native/rust/pkg/personallog_native_bg.wasm');
    const stats = fs.statSync(wasmPath);
    const sizeBytes = stats.size;
    const sizeKB = (sizeBytes / 1024).toFixed(2);

    info(`WASM file size: ${sizeKB} KB (${sizeBytes} bytes)`);

    // Warn if file is larger than 500KB
    if (sizeBytes > 512000) {
      warn(`WASM file is large (> 500 KB). Consider optimizing.`);
      results.warnings.push('Large WASM size');
    } else {
      success('WASM file size is acceptable');
      results.passed.push('WASM size check');
    }

    return true;
  } catch (err) {
    error(`Failed to check WASM size: ${err.message}`);
    results.failed.push('WASM size check');
    return false;
  }
}

async function verifyWasmLoading() {
  try {
    info('Testing WASM module loading...');
    const pkgPath = path.resolve(__dirname, '..', 'native/rust/pkg/personallog_native.js');

    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve(pkgPath)];

    const pkg = require(pkgPath);

    // Test version function
    const version = pkg.version();
    info(`WASM module version: ${version}`);
    success('WASM module loaded successfully');
    results.passed.push('WASM loading');

    return { pkg, version };
  } catch (err) {
    error(`Failed to load WASM module: ${err.message}`);
    results.failed.push('WASM loading');
    return null;
  }
}

async function verifyVectorOperations(pkg) {
  if (!pkg) {
    error('Cannot test operations - module not loaded');
    return false;
  }

  info('Testing vector operations...');

  try {
    // Test vectors
    const v1 = new Float32Array([1.0, 2.0, 3.0]);
    const v2 = new Float32Array([4.0, 5.0, 6.0]);
    const v3 = new Float32Array([1.0, 0.0, 0.0]);
    const v4 = new Float32Array([1.0, 0.0, 0.0]);

    // Test dot product
    const dot = pkg.dot_product(v1, v2);
    if (Math.abs(dot - 32.0) < 0.0001) {
      success(`Dot product: ${dot} (expected: 32.0)`);
      results.passed.push('Dot product');
    } else {
      error(`Dot product incorrect: ${dot} (expected: 32.0)`);
      results.failed.push('Dot product');
    }

    // Test cosine similarity (identical vectors)
    const cosIdentical = pkg.cosine_similarity(v3, v4);
    if (Math.abs(cosIdentical - 1.0) < 0.0001) {
      success(`Cosine similarity (identical): ${cosIdentical.toFixed(4)} (expected: 1.0)`);
      results.passed.push('Cosine similarity');
    } else {
      error(`Cosine similarity incorrect: ${cosIdentical} (expected: 1.0)`);
      results.failed.push('Cosine similarity');
    }

    // Test cosine similarity (orthogonal vectors)
    const v5 = new Float32Array([1.0, 0.0, 0.0]);
    const v6 = new Float32Array([0.0, 1.0, 0.0]);
    const cosOrthogonal = pkg.cosine_similarity(v5, v6);
    if (Math.abs(cosOrthogonal - 0.0) < 0.0001) {
      success(`Cosine similarity (orthogonal): ${cosOrthogonal.toFixed(4)} (expected: 0.0)`);
      results.passed.push('Cosine similarity orthogonal');
    } else {
      error(`Cosine similarity incorrect: ${cosOrthogonal} (expected: 0.0)`);
      results.failed.push('Cosine similarity orthogonal');
    }

    // Test Euclidean distance
    const dist = pkg.euclidean_distance(v1, v2);
    const expectedDist = Math.sqrt(27); // sqrt((4-1)^2 + (5-2)^2 + (6-3)^2) = sqrt(27)
    if (Math.abs(dist - expectedDist) < 0.0001) {
      success(`Euclidean distance: ${dist.toFixed(4)} (expected: ${expectedDist.toFixed(4)})`);
      results.passed.push('Euclidean distance');
    } else {
      error(`Euclidean distance incorrect: ${dist} (expected: ${expectedDist})`);
      results.failed.push('Euclidean distance');
    }

    // Test vector normalization
    const v7 = new Float32Array([3.0, 4.0]);
    const normalized = pkg.normalize_vector(v7);
    const magnitude = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
    if (Math.abs(magnitude - 1.0) < 0.0001) {
      success(`Vector normalization: magnitude=${magnitude.toFixed(4)} (expected: 1.0)`);
      results.passed.push('Vector normalization');
    } else {
      error(`Vector normalization incorrect: magnitude=${magnitude} (expected: 1.0)`);
      results.failed.push('Vector normalization');
    }

    // Test batch operations
    const vectors = new Float32Array([
      1.0, 0.0, 0.0,
      0.0, 1.0, 0.0,
      1.0, 1.0, 0.0,
    ]);
    const query = new Float32Array([1.0, 0.0, 0.0]);
    const batchResult = pkg.batch_cosine_similarity(query, vectors, 3);

    if (batchResult.length === 3) {
      success(`Batch cosine similarity: ${batchResult.length} results`);
      results.passed.push('Batch operations');
    } else {
      error(`Batch operations incorrect: ${batchResult.length} results (expected: 3)`);
      results.failed.push('Batch operations');
    }

    // Test top-K search
    const topK = pkg.top_k_similar(query, vectors, 3, 2);
    if (topK.length === 4) { // 2 results * (index + score)
      success(`Top-K search: found ${topK.length / 2} results`);
      results.passed.push('Top-K search');
    } else {
      error(`Top-K search incorrect: ${topK.length} values (expected: 4)`);
      results.failed.push('Top-K search');
    }

    return true;
  } catch (err) {
    error(`Vector operations failed: ${err.message}`);
    results.failed.push('Vector operations');
    return false;
  }
}

async function verifyPerformance(pkg) {
  if (!pkg) {
    return false;
  }

  info('Running performance benchmarks...');

  try {
    const iterations = 1000;
    const dimension = 384;

    const v1 = new Float32Array(dimension);
    const v2 = new Float32Array(dimension);

    // Fill with random values
    for (let i = 0; i < dimension; i++) {
      v1[i] = Math.random();
      v2[i] = Math.random();
    }

    // Benchmark cosine similarity
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      pkg.cosine_similarity(v1, v2);
    }
    const duration = performance.now() - start;
    const opsPerSec = (iterations / duration) * 1000;

    info(`Performance: ${opsPerSec.toFixed(0)} ops/sec (${duration.toFixed(2)}ms for ${iterations} iterations)`);

    // Warn if too slow
    if (opsPerSec < 10000) {
      warn(`Performance seems low (< 10,000 ops/sec)`);
      results.warnings.push('Performance warning');
    } else {
      success('Performance is acceptable');
      results.passed.push('Performance check');
    }

    return true;
  } catch (err) {
    error(`Performance test failed: ${err.message}`);
    results.failed.push('Performance test');
    return false;
  }
}

async function verifyTypeScriptDefinitions() {
  try {
    const dtsPath = path.resolve(__dirname, '..', 'native/rust/pkg/personallog_native.d.ts');

    if (!fs.existsSync(dtsPath)) {
      warn('TypeScript definitions not found');
      results.warnings.push('Missing TypeScript definitions');
      return false;
    }

    const content = fs.readFileSync(dtsPath, 'utf-8');

    // Check for key exports
    const requiredExports = [
      'cosine_similarity',
      'dot_product',
      'euclidean_distance',
      'normalize_vector',
      'batch_cosine_similarity',
      'version',
    ];

    let allFound = true;
    for (const exp of requiredExports) {
      if (content.includes(exp)) {
        success(`TypeScript export found: ${exp}`);
      } else {
        error(`TypeScript export missing: ${exp}`);
        allFound = false;
      }
    }

    if (allFound) {
      results.passed.push('TypeScript definitions');
    } else {
      results.failed.push('TypeScript definitions');
    }

    return allFound;
  } catch (err) {
    error(`Failed to verify TypeScript definitions: ${err.message}`);
    results.failed.push('TypeScript definitions');
    return false;
  }
}

async function runVerification() {
  log('\n========================================', 'cyan');
  log('  WASM Build Verification', 'cyan');
  log('========================================\n', 'cyan');

  // Step 1: Verify file existence
  log('Step 1: Checking WASM artifacts...\n', 'blue');
  await verifyFileExists('native/rust/pkg/personallog_native.js', 'JavaScript glue');
  await verifyFileExists('native/rust/pkg/personallog_native_bg.wasm', 'WASM binary');
  await verifyFileExists('native/rust/pkg/personallog_native.d.ts', 'TypeScript definitions');
  await verifyFileExists('native/rust/pkg/package.json', 'Package metadata');

  // Step 2: Check WASM size
  log('\nStep 2: Checking WASM file size...\n', 'blue');
  await verifyWasmSize();

  // Step 3: Test WASM loading
  log('\nStep 3: Testing WASM module loading...\n', 'blue');
  const { pkg } = await verifyWasmLoading() || {};

  // Step 4: Test vector operations
  log('\nStep 4: Testing vector operations...\n', 'blue');
  await verifyVectorOperations(pkg);

  // Step 5: Test performance
  log('\nStep 5: Running performance benchmarks...\n', 'blue');
  await verifyPerformance(pkg);

  // Step 6: Verify TypeScript definitions
  log('\nStep 6: Verifying TypeScript definitions...\n', 'blue');
  await verifyTypeScriptDefinitions();

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
    process.exit(1);
  } else {
    log('\n✅ All checks passed!', 'green');
    process.exit(0);
  }
}

// Run verification
runVerification().catch(err => {
  error(`Verification script failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
