/**
 * Environment Variable Validation
 *
 * Validates and ensures required environment variables are set.
 * Provides helpful error messages for missing configuration.
 *
 * @module lib/env-validation
 */

interface EnvVarSpec {
  name: string;
  required: boolean;
  description: string;
  defaultValue?: string;
  isPublic?: boolean;
}

const ENV_SPECS: EnvVarSpec[] = [
  // Application
  {
    name: 'NODE_ENV',
    required: false,
    defaultValue: 'development',
    description: 'Application environment (development, staging, production)',
  },
  {
    name: 'PORT',
    required: false,
    defaultValue: '3002',
    description: 'Server port for local development',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    isPublic: true,
    description: 'Base URL for the application (auto-detected on Vercel)',
  },

  // Build
  {
    name: 'BUILD_WASM',
    required: false,
    defaultValue: 'false',
    description: 'Whether to build WASM during deployment',
  },

  // AI Providers (all optional)
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for GPT models',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key for Claude models',
  },
  {
    name: 'GOOGLE_API_KEY',
    required: false,
    description: 'Google API key for Gemini models',
  },
  {
    name: 'XAI_API_KEY',
    required: false,
    description: 'X.ai API key for Grok models',
  },
  {
    name: 'DEEPSEEK_API_KEY',
    required: false,
    description: 'DeepSeek API key',
  },
  {
    name: 'KIMI_API_KEY',
    required: false,
    description: 'Kimi (Moonshot) API key',
  },
  {
    name: 'ZAI_API_KEY',
    required: false,
    description: 'Z.ai API key',
  },

  // Storage
  {
    name: 'PACKAGES_PATH',
    required: false,
    defaultValue: '../packages',
    description: 'Path to packages directory for dynamic modules',
  },

  // Feature Flags
  {
    name: 'NEXT_PUBLIC_ENABLE_PWA',
    required: false,
    isPublic: true,
    defaultValue: 'true',
    description: 'Enable Progressive Web App features',
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_ANALYTICS',
    required: false,
    isPublic: true,
    defaultValue: 'false',
    description: 'Enable analytics tracking',
  },
  {
    name: 'NEXT_PUBLIC_EXPERIMENTAL_FEATURES',
    required: false,
    isPublic: true,
    defaultValue: 'false',
    description: 'Enable experimental features',
  },
  {
    name: 'NEXT_PUBLIC_HARDWARE_DETECTION',
    required: false,
    isPublic: true,
    defaultValue: 'true',
    description: 'Enable hardware detection and adaptive optimization',
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_KNOWLEDGE',
    required: false,
    isPublic: true,
    defaultValue: 'true',
    description: 'Enable knowledge base features',
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_AI_CONTACTS',
    required: false,
    isPublic: true,
    defaultValue: 'true',
    description: 'Enable AI contact system',
  },

  // Monitoring (optional)
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    required: false,
    isPublic: true,
    description: 'Sentry DSN for error tracking',
  },
  {
    name: 'NEXT_PUBLIC_GA_ID',
    required: false,
    isPublic: true,
    description: 'Google Analytics ID',
  },
  {
    name: 'NEXT_PUBLIC_POSTHOG_KEY',
    required: false,
    isPublic: true,
    description: 'PostHog analytics key',
  },
  {
    name: 'NEXT_PUBLIC_POSTHOG_HOST',
    required: false,
    isPublic: true,
    description: 'PostHog analytics host',
  },
];

/**
 * Get environment variable with default value
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  // Check client-side env vars (NEXT_PUBLIC_*)
  const publicVar = process.env[`NEXT_PUBLIC_${key}`];
  if (publicVar !== undefined) return publicVar;

  // Check server-side env vars
  const serverVar = process.env[key];
  if (serverVar !== undefined) return serverVar;

  return defaultValue;
}

/**
 * Validate environment variables
 *
 * @returns {valid: boolean, errors: string[], warnings: string[]}
 */
export function validateEnv(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = getEnv(spec.name) || spec.defaultValue;

    // Check required variables
    if (spec.required && !value) {
      errors.push(
        `Missing required environment variable: ${spec.name}\n  Description: ${spec.description}`
      );
      continue;
    }

    // Warn about missing optional variables
    if (!spec.required && !value && !spec.defaultValue) {
      // Only warn about certain important optional variables
      if (spec.name.includes('API_KEY') || spec.name.includes('NEXT_PUBLIC_APP_URL')) {
        warnings.push(
          `Optional environment variable not set: ${spec.name}\n  Description: ${spec.description}`
        );
      }
    }
  }

  // Validate NODE_ENV
  const nodeEnv = getEnv('NODE_ENV', 'development');
  if (!['development', 'staging', 'production', 'test'].includes(nodeEnv!)) {
    errors.push(
      `Invalid NODE_ENV: ${nodeEnv}. Must be one of: development, staging, production, test`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get all environment variables as an object
 */
export function getEnvConfig(): Record<string, string | undefined> {
  const config: Record<string, string | undefined> = {};

  for (const spec of ENV_SPECS) {
    const value = getEnv(spec.name, spec.defaultValue);
    if (value !== undefined) {
      config[spec.name] = value;
    }
  }

  return config;
}

/**
 * Validate environment variables and throw if invalid
 *
 * @throws Error with detailed validation messages
 */
export function validateEnvOrThrow(): void {
  const validation = validateEnv();

  if (!validation.valid) {
    const errorMessage = [
      'Environment validation failed:',
      ...validation.errors.map(e => `  ❌ ${e}`),
      '',
      'Please set the required environment variables.',
      'See .env.example for reference.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings
  if (validation.warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('Environment warnings:');
    validation.warnings.forEach(w => console.warn(`  ⚠️  ${w}`));
  }
}

/**
 * Get public environment variables (safe to expose to client)
 */
export function getPublicEnvConfig(): Record<string, string> {
  const publicConfig: Record<string, string> = {};

  for (const spec of ENV_SPECS) {
    if (!spec.isPublic) continue;

    const value = getEnv(spec.name, spec.defaultValue);
    if (value !== undefined) {
      publicConfig[spec.name] = value;
    }
  }

  return publicConfig;
}

/**
 * Log environment configuration (development only)
 */
export function logEnvConfig(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const config = getEnvConfig();
  const publicConfig = getPublicEnvConfig();

  console.log('🔧 Environment Configuration:');
  console.log('  All variables:', Object.keys(config).length);
  console.log('  Public variables:', Object.keys(publicConfig).length);

  // Log redacted values (dev only)
  for (const [key, value] of Object.entries(config)) {
    const isPublic = publicConfig[key] !== undefined;
    const displayValue = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
      ? '***REDACTED***'
      : value;
    console.log(`  ${isPublic ? '🌐' : '🔒'} ${key}:`, displayValue);
  }
}
