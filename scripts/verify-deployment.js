#!/usr/bin/env node

/**
 * Deployment Verification Script
 *
 * Verifies that all deployment configuration is correct.
 * Run this before deploying to production.
 *
 * Usage: node scripts/verify-deployment.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function checkFile(filePath, description) {
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    error(`${description} not found: ${filePath}`);
    return false;
  }

  success(`${description} found: ${filePath}`);
  return true;
}

function checkEnvVar(examplePath, varName) {
  const content = fs.readFileSync(examplePath, 'utf8');

  if (!content.includes(varName)) {
    warning(`Environment variable not documented: ${varName}`);
    return false;
  }

  return true;
}

function checkJSON(filePath, description) {
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    error(`${description} not found: ${filePath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    JSON.parse(content);
    success(`${description} is valid JSON: ${filePath}`);
    return true;
  } catch (err) {
    error(`${description} has invalid JSON: ${filePath}`);
    error(`  Error: ${err.message}`);
    return false;
  }
}

function runChecks() {
  info('Starting deployment verification...\n');

  let allPassed = true;

  // Check required files
  info('Checking required files...\n');

  const requiredFiles = [
    ['vercel.json', 'Vercel configuration'],
    ['.env.example', 'Environment variables template'],
    ['DEPLOYMENT.md', 'Deployment documentation'],
    ['src/lib/env-validation.ts', 'Environment validation utilities'],
    ['next.config.ts', 'Next.js configuration'],
  ];

  requiredFiles.forEach(([file, description]) => {
    if (!checkFile(file, description)) {
      allPassed = false;
    }
  });

  console.log();

  // Check JSON validity
  info('Checking JSON files...\n');

  const jsonFiles = [
    ['vercel.json', 'Vercel configuration'],
    ['public/manifest.json', 'PWA manifest'],
    ['package.json', 'Package manifest'],
  ];

  jsonFiles.forEach(([file, description]) => {
    if (!checkJSON(file, description)) {
      allPassed = false;
    }
  });

  console.log();

  // Check critical environment variables
  info('Checking environment variables...\n');

  const examplePath = path.resolve(process.cwd(), '.env.example');
  const criticalVars = [
    'NEXT_PUBLIC_APP_URL',
    'BUILD_WASM',
    'NODE_ENV',
  ];

  criticalVars.forEach(varName => {
    if (!checkEnvVar(examplePath, varName)) {
      allPassed = false;
    } else {
      success(`${varName} documented`);
    }
  });

  console.log();

  // Check for AI provider variables
  info('Checking AI provider support...\n');

  const aiProviders = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'XAI_API_KEY',
    'DEEPSEEK_API_KEY',
    'KIMI_API_KEY',
    'ZAI_API_KEY',
  ];

  aiProviders.forEach(provider => {
    if (checkEnvVar(examplePath, provider)) {
      success(`${provider} supported`);
    }
  });

  console.log();

  // Check Next.js configuration
  info('Checking Next.js configuration...\n');

  const nextConfigPath = path.resolve(process.cwd(), 'next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

    const requiredOptions = [
      'compress: true',
      'output: \'standalone\'',
      'images:',
    ];

    requiredOptions.forEach(option => {
      if (nextConfig.includes(option)) {
        success(`Next.js option: ${option}`);
      } else {
        warning(`Next.js option missing: ${option}`);
      }
    });
  }

  console.log();

  // Check Vercel configuration
  info('Checking Vercel configuration...\n');

  const vercelConfigPath = path.resolve(process.cwd(), 'vercel.json');
  if (fs.existsSync(vercelConfigPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    if (vercelConfig.buildCommand) {
      success(`Build command: ${vercelConfig.buildCommand}`);
    } else {
      warning('Build command not specified');
    }

    if (vercelConfig.headers && vercelConfig.headers.length > 0) {
      success(`Headers configured: ${vercelConfig.headers.length} rules`);
    } else {
      warning('No custom headers configured');
    }

    if (vercelConfig.rewrites && vercelConfig.rewrites.length > 0) {
      success(`Rewrites configured: ${vercelConfig.rewrites.length} rules`);
    } else {
      warning('No rewrites configured');
    }
  }

  console.log();

  // Check for deployment documentation
  info('Checking deployment documentation...\n');

  const deploymentDocPath = path.resolve(process.cwd(), 'DEPLOYMENT.md');
  if (fs.existsSync(deploymentDocPath)) {
    const deploymentDoc = fs.readFileSync(deploymentDocPath, 'utf8');

    const requiredSections = [
      'Quick Start',
      'Environment Configuration',
      'Deployment Process',
      'Troubleshooting',
      'Rollback Procedures',
    ];

    requiredSections.forEach(section => {
      if (deploymentDoc.includes(section)) {
        success(`Documentation section: ${section}`);
      } else {
        error(`Documentation section missing: ${section}`);
        allPassed = false;
      }
    });
  }

  console.log();

  // Final result
  if (allPassed) {
    success('\n🎉 All deployment checks passed!');
    info('\nYou are ready to deploy to production.');
    info('Run: vercel --prod\n');
    process.exit(0);
  } else {
    error('\n❌ Some deployment checks failed.');
    warning('\nPlease fix the issues above before deploying.\n');
    process.exit(1);
  }
}

// Run the checks
runChecks();
