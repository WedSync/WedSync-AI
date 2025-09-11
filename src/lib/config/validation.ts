/**
 * WedSync 2.0 - Environment Configuration Validation System
 *
 * Comprehensive validation, sanitization, and security checks for
 * environment configuration with detailed error reporting and remediation.
 *
 * Feature: WS-097 - Environment Management
 * Priority: P0 - Critical Infrastructure
 */

import { z } from 'zod';
import {
  EnvironmentConfig,
  EnvironmentConfigSchema,
  detectEnvironment,
} from './environment';

// Validation Error Types
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  remediation?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  config?: EnvironmentConfig;
  environment: string;
  timestamp: Date;
}

// Security Classifications for Environment Variables
export enum SecurityClassification {
  PUBLIC = 'PUBLIC', // Can be exposed to client-side
  INTERNAL = 'INTERNAL', // Server-side only, low sensitivity
  CONFIDENTIAL = 'CONFIDENTIAL', // API keys, tokens
  RESTRICTED = 'RESTRICTED', // Database passwords, secrets
}

// Sensitive field patterns for masking
const SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /auth/i,
  /private/i,
  /credential/i,
  /webhook/i,
];

// Required environment variables by environment
const REQUIRED_VARS_BY_ENV = {
  development: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ],
  staging: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'RESEND_API_KEY',
  ],
  production: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'SENTRY_DSN',
  ],
};

// Environment variable security classifications
const SECURITY_CLASSIFICATIONS: Record<string, SecurityClassification> = {
  // Public - Client-side safe
  NEXT_PUBLIC_SUPABASE_URL: SecurityClassification.PUBLIC,
  NEXT_PUBLIC_APP_URL: SecurityClassification.PUBLIC,
  NEXT_PUBLIC_ENABLE_ANALYTICS: SecurityClassification.PUBLIC,
  NEXT_PUBLIC_ENABLE_ERROR_REPORTING: SecurityClassification.PUBLIC,
  NEXT_PUBLIC_POSTHOG_KEY: SecurityClassification.PUBLIC,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: SecurityClassification.PUBLIC,

  // Internal - Server-side, low sensitivity
  NODE_ENV: SecurityClassification.INTERNAL,
  VERCEL_ENV: SecurityClassification.INTERNAL,
  VERCEL_URL: SecurityClassification.INTERNAL,
  LOG_LEVEL: SecurityClassification.INTERNAL,

  // Confidential - API keys and tokens
  RESEND_API_KEY: SecurityClassification.CONFIDENTIAL,
  SENDGRID_API_KEY: SecurityClassification.CONFIDENTIAL,
  TWILIO_ACCOUNT_SID: SecurityClassification.CONFIDENTIAL,
  TWILIO_AUTH_TOKEN: SecurityClassification.CONFIDENTIAL,
  GOOGLE_CLOUD_PROJECT_ID: SecurityClassification.CONFIDENTIAL,
  SENTRY_DSN: SecurityClassification.CONFIDENTIAL,
  NEXT_PUBLIC_POSTHOG_KEY: SecurityClassification.CONFIDENTIAL,

  // Restricted - High security secrets
  SUPABASE_SERVICE_ROLE_KEY: SecurityClassification.RESTRICTED,
  NEXTAUTH_SECRET: SecurityClassification.RESTRICTED,
  STRIPE_SECRET_KEY: SecurityClassification.RESTRICTED,
  STRIPE_WEBHOOK_SECRET: SecurityClassification.RESTRICTED,
  DATABASE_URL: SecurityClassification.RESTRICTED,
  GOOGLE_CLOUD_PRIVATE_KEY: SecurityClassification.RESTRICTED,
};

// Mask sensitive values for logging
export function maskSensitiveValue(key: string, value: string): string {
  const classification =
    SECURITY_CLASSIFICATIONS[key] || SecurityClassification.INTERNAL;

  // Check if field name indicates sensitive data
  const isSensitive =
    SENSITIVE_PATTERNS.some((pattern) => pattern.test(key)) ||
    classification === SecurityClassification.CONFIDENTIAL ||
    classification === SecurityClassification.RESTRICTED;

  if (!isSensitive || !value) {
    return value;
  }

  // Different masking strategies based on value type
  if (value.startsWith('pk_')) {
    // Stripe publishable keys - show prefix and suffix
    return `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
  }

  if (value.startsWith('sk_')) {
    // Stripe secret keys - mask everything except prefix
    return `${value.substring(0, 8)}...[MASKED]`;
  }

  if (value.startsWith('whsec_')) {
    // Webhook secrets - mask everything except prefix
    return `${value.substring(0, 8)}...[MASKED]`;
  }

  if (value.startsWith('https://') || value.startsWith('http://')) {
    // URLs - show domain but mask query params and paths with secrets
    try {
      const url = new URL(value);
      if (url.pathname.includes('key') || url.search.includes('key')) {
        return `${url.protocol}//${url.host}/...[MASKED]`;
      }
      return value;
    } catch {
      return '[INVALID_URL]';
    }
  }

  // Default masking for other sensitive values
  if (value.length <= 8) {
    return '[MASKED]';
  }

  return `${value.substring(0, 4)}...[MASKED]`;
}

// Validate individual environment variable
export function validateEnvironmentVariable(
  key: string,
  value: string | undefined,
  environment: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if required
  if (
    REQUIRED_VARS_BY_ENV[
      environment as keyof typeof REQUIRED_VARS_BY_ENV
    ]?.includes(key)
  ) {
    if (!value || value.trim() === '') {
      errors.push({
        field: key,
        message: `Required environment variable is missing or empty`,
        severity: 'error',
        remediation: `Set ${key} in your .env.${environment} file`,
      });
      return errors;
    }
  }

  if (!value) {
    return errors; // Optional variables that are undefined are OK
  }

  // Format validations
  switch (key) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
    case 'NEXTAUTH_URL':
    case 'NEXT_PUBLIC_APP_URL':
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        errors.push({
          field: key,
          message: 'Must be a valid URL starting with http:// or https://',
          severity: 'error',
          remediation:
            'Ensure the URL includes the protocol (https://your-domain.com)',
        });
      }
      break;

    case 'STRIPE_SECRET_KEY':
      if (!value.startsWith('sk_')) {
        errors.push({
          field: key,
          message: 'Invalid Stripe secret key format',
          severity: 'error',
          remediation: 'Stripe secret keys must start with "sk_"',
        });
      }
      if (environment === 'production' && value.startsWith('sk_test_')) {
        errors.push({
          field: key,
          message: 'Using test Stripe key in production environment',
          severity: 'error',
          remediation:
            'Use a live Stripe secret key (sk_live_...) in production',
        });
      }
      break;

    case 'STRIPE_PUBLISHABLE_KEY':
    case 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY':
      if (!value.startsWith('pk_')) {
        errors.push({
          field: key,
          message: 'Invalid Stripe publishable key format',
          severity: 'error',
          remediation: 'Stripe publishable keys must start with "pk_"',
        });
      }
      break;

    case 'STRIPE_WEBHOOK_SECRET':
      if (!value.startsWith('whsec_')) {
        errors.push({
          field: key,
          message: 'Invalid Stripe webhook secret format',
          severity: 'error',
          remediation: 'Stripe webhook secrets must start with "whsec_"',
        });
      }
      break;

    case 'NEXTAUTH_SECRET':
      if (value.length < 32) {
        errors.push({
          field: key,
          message: 'NextAuth secret must be at least 32 characters long',
          severity: 'error',
          remediation:
            'Generate a longer secret using: openssl rand -base64 32',
        });
      }
      break;

    case 'TWILIO_PHONE_NUMBER':
      if (!value.startsWith('+')) {
        errors.push({
          field: key,
          message: 'Phone number must be in international format',
          severity: 'error',
          remediation: 'Use format: +1234567890',
        });
      }
      break;
  }

  // Security validations
  const classification = SECURITY_CLASSIFICATIONS[key];

  if (classification === SecurityClassification.RESTRICTED) {
    if (value.length < 16) {
      errors.push({
        field: key,
        message: 'Restricted secrets should be at least 16 characters long',
        severity: 'warning',
        remediation: 'Consider using a stronger secret',
      });
    }
  }

  // Environment-specific validations
  if (environment === 'production') {
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      errors.push({
        field: key,
        message: 'Production environment should not use localhost URLs',
        severity: 'error',
        remediation: 'Use production domain names in production environment',
      });
    }

    if (key.startsWith('NEXT_PUBLIC_') && value.includes('test')) {
      errors.push({
        field: key,
        message: 'Production environment may be using test/development values',
        severity: 'warning',
        remediation: 'Verify this is the correct production value',
      });
    }
  }

  return errors;
}

// Validate environment configuration completeness
export function validateEnvironmentConfiguration(): ValidationResult {
  const environment = detectEnvironment();
  const timestamp = new Date();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // Check for required environment variables
    const requiredVars = REQUIRED_VARS_BY_ENV[environment];
    for (const varName of requiredVars) {
      const varErrors = validateEnvironmentVariable(
        varName,
        process.env[varName],
        environment,
      );
      errors.push(...varErrors.filter((e) => e.severity === 'error'));
      warnings.push(...varErrors.filter((e) => e.severity === 'warning'));
    }

    // Validate all present environment variables
    const allEnvVars = Object.keys(process.env);
    for (const varName of allEnvVars) {
      if (
        SECURITY_CLASSIFICATIONS[varName] ||
        varName.startsWith('NEXT_PUBLIC_') ||
        varName.startsWith('STRIPE_') ||
        varName.startsWith('SUPABASE_') ||
        varName.startsWith('TWILIO_') ||
        varName.startsWith('RESEND_') ||
        varName.startsWith('SENDGRID_')
      ) {
        const varErrors = validateEnvironmentVariable(
          varName,
          process.env[varName],
          environment,
        );
        errors.push(...varErrors.filter((e) => e.severity === 'error'));
        warnings.push(...varErrors.filter((e) => e.severity === 'warning'));
      }
    }

    // Environment-specific checks
    if (environment === 'production') {
      // Check for development indicators in production
      if (process.env.NODE_ENV !== 'production') {
        warnings.push({
          field: 'NODE_ENV',
          message:
            'NODE_ENV is not set to production in production environment',
          severity: 'warning',
          remediation: 'Set NODE_ENV=production for optimal performance',
        });
      }

      // Check for debug flags in production
      if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
        warnings.push({
          field: 'NEXT_PUBLIC_DEBUG_MODE',
          message: 'Debug mode is enabled in production',
          severity: 'warning',
          remediation: 'Disable debug mode in production for security',
        });
      }
    }

    // Attempt to parse with Zod schema
    let config: EnvironmentConfig | undefined;
    try {
      const rawConfig = createRawConfigObject();
      config = EnvironmentConfigSchema.parse(rawConfig);
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        for (const error of zodError.errors) {
          errors.push({
            field: error.path.join('.'),
            message: error.message,
            severity: 'error',
            remediation: 'Fix the configuration value according to the schema',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config,
      environment,
      timestamp,
    };
  } catch (error) {
    errors.push({
      field: 'general',
      message: `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      remediation: 'Check your environment configuration and try again',
    });

    return {
      isValid: false,
      errors,
      warnings,
      environment,
      timestamp,
    };
  }
}

// Create raw configuration object for validation
function createRawConfigObject() {
  const env = detectEnvironment();

  return {
    nodeEnv: process.env.NODE_ENV,
    environment: env,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,

    database: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      maxConnections: 10,
      connectionTimeout: 30000,
      enableLogging: false,
    },

    auth: {
      nextAuthUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
      nextAuthSecret: process.env.NEXTAUTH_SECRET,
      sessionMaxAge: 2592000,
      enableMFA: true,
    },

    payment: {
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
        publishableKey:
          process.env.STRIPE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
          'pk_test_placeholder',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
        environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
          ? 'test'
          : 'live',
        pricing: {
          starter: {
            monthly:
              process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ||
              'price_starter_monthly',
            annual:
              process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ||
              'price_starter_annual',
          },
          professional: {
            monthly:
              process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID ||
              'price_professional_monthly',
            annual:
              process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID ||
              'price_professional_annual',
          },
          scale: {
            monthly:
              process.env.STRIPE_SCALE_MONTHLY_PRICE_ID ||
              'price_scale_monthly',
            annual:
              process.env.STRIPE_SCALE_ANNUAL_PRICE_ID || 'price_scale_annual',
          },
          enterprise: {
            monthly:
              process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ||
              'price_enterprise_monthly',
            annual:
              process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ||
              'price_enterprise_annual',
          },
        },
      },
    },

    communication: {
      email: {
        provider: (process.env.RESEND_API_KEY ? 'resend' : 'sendgrid') as
          | 'resend'
          | 'sendgrid',
        apiKey:
          process.env.RESEND_API_KEY ||
          process.env.SENDGRID_API_KEY ||
          'placeholder_key',
        fromAddress: process.env.NEXT_PUBLIC_FROM_EMAIL || 'hello@wedsync.com',
        fromName: 'WedSync',
      },
      sms: {
        twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID || 'placeholder_sid',
          authToken: process.env.TWILIO_AUTH_TOKEN || 'placeholder_token',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        },
      },
    },

    security: {
      corsOrigins: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [],
      rateLimiting: {
        maxRequests: 1000,
        windowMs: 60000,
      },
      csp: {
        nonce: process.env.NEXT_PUBLIC_CSP_NONCE,
        allowedOrigins:
          process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [],
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
      },
    },

    monitoring: {
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: env,
        tracesSampleRate: 0.1,
      },
      analytics: {
        posthog: {
          apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        },
      },
      logging: {
        level: 'info' as const,
        enableQueryLogging: false,
      },
    },

    features: {
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableErrorReporting:
        process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
      enablePerformanceMonitoring:
        process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      enableDebugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
      enableAIFeatures: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES === 'true',
      enableAdvancedWorkflows:
        process.env.NEXT_PUBLIC_ENABLE_ADVANCED_WORKFLOWS === 'true',
    },

    vercel: process.env.VERCEL
      ? {
          env: process.env.VERCEL_ENV as
            | 'development'
            | 'preview'
            | 'production',
          url: process.env.VERCEL_URL,
          projectId: process.env.VERCEL_PROJECT_ID,
          orgId: process.env.VERCEL_ORG_ID,
        }
      : undefined,
  };
}

// Generate validation report
export function generateValidationReport(result: ValidationResult): string {
  const { isValid, errors, warnings, environment, timestamp } = result;

  let report = `
=== WEDSYNC ENVIRONMENT VALIDATION REPORT ===
Environment: ${environment.toUpperCase()}
Timestamp: ${timestamp.toISOString()}
Status: ${isValid ? '✅ VALID' : '❌ INVALID'}

`;

  if (errors.length > 0) {
    report += `🚨 ERRORS (${errors.length}):\n`;
    errors.forEach((error, index) => {
      report += `  ${index + 1}. ${error.field}: ${error.message}\n`;
      if (error.remediation) {
        report += `     💡 Fix: ${error.remediation}\n`;
      }
    });
    report += '\n';
  }

  if (warnings.length > 0) {
    report += `⚠️  WARNINGS (${warnings.length}):\n`;
    warnings.forEach((warning, index) => {
      report += `  ${index + 1}. ${warning.field}: ${warning.message}\n`;
      if (warning.remediation) {
        report += `     💡 Consider: ${warning.remediation}\n`;
      }
    });
    report += '\n';
  }

  if (isValid) {
    report += '✅ All validations passed! Environment is ready.\n';
  } else {
    report += '❌ Fix the errors above before proceeding.\n';
  }

  return report;
}

// Validate and throw on critical errors
export function validateOrThrow(): EnvironmentConfig {
  const result = validateEnvironmentConfiguration();

  if (!result.isValid) {
    console.error(generateValidationReport(result));
    throw new Error(
      `Environment validation failed with ${result.errors.length} error(s)`,
    );
  }

  if (result.warnings.length > 0) {
    console.warn(generateValidationReport(result));
  }

  return result.config!;
}
