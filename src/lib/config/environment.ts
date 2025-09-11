/**
 * WedSync 2.0 - Environment Configuration Management System
 *
 * Centralized environment configuration with type safety, validation,
 * and environment-specific overrides for development, staging, and production.
 *
 * Feature: WS-097 - Environment Management
 * Priority: P0 - Critical Infrastructure
 */

import { z } from 'zod';

// Environment Types
export type Environment = 'development' | 'staging' | 'production';

// Database Configuration Schema
const DatabaseConfigSchema = z.object({
  url: z.string().url('Invalid database URL'),
  serviceRoleKey: z.string().min(1, 'Service role key is required'),
  maxConnections: z.number().int().min(1).max(100).default(10),
  connectionTimeout: z.number().int().min(1000).default(30000),
  enableLogging: z.boolean().default(false),
});

// Authentication Configuration Schema
const AuthConfigSchema = z.object({
  nextAuthUrl: z.string().url('Invalid NextAuth URL'),
  nextAuthSecret: z
    .string()
    .min(32, 'NextAuth secret must be at least 32 characters'),
  sessionMaxAge: z.number().int().min(300).default(2592000), // 30 days
  enableMFA: z.boolean().default(true),
});

// Payment Configuration Schema
const PaymentConfigSchema = z.object({
  stripe: z.object({
    secretKey: z.string().startsWith('sk_', 'Invalid Stripe secret key format'),
    publishableKey: z
      .string()
      .startsWith('pk_', 'Invalid Stripe publishable key format'),
    webhookSecret: z
      .string()
      .startsWith('whsec_', 'Invalid Stripe webhook secret format'),
    environment: z.enum(['test', 'live']),
    // Pricing tiers
    pricing: z.object({
      starter: z.object({
        monthly: z.string().startsWith('price_'),
        annual: z.string().startsWith('price_'),
      }),
      professional: z.object({
        monthly: z.string().startsWith('price_'),
        annual: z.string().startsWith('price_'),
      }),
      scale: z.object({
        monthly: z.string().startsWith('price_'),
        annual: z.string().startsWith('price_'),
      }),
      enterprise: z.object({
        monthly: z.string().startsWith('price_'),
        annual: z.string().startsWith('price_'),
      }),
    }),
  }),
});

// Communication Services Configuration Schema
const CommunicationConfigSchema = z.object({
  email: z.object({
    provider: z.enum(['resend', 'sendgrid']),
    apiKey: z.string().min(1, 'Email API key is required'),
    fromAddress: z.string().email('Invalid from email address'),
    fromName: z.string().min(1).default('WedSync'),
  }),
  sms: z.object({
    twilio: z.object({
      accountSid: z.string().min(1, 'Twilio Account SID is required'),
      authToken: z.string().min(1, 'Twilio Auth Token is required'),
      phoneNumber: z.string().min(1, 'Twilio phone number is required'),
    }),
  }),
});

// Security Configuration Schema
const SecurityConfigSchema = z.object({
  corsOrigins: z.array(z.string().url()).default([]),
  rateLimiting: z.object({
    maxRequests: z.number().int().min(1).default(1000),
    windowMs: z.number().int().min(1000).default(60000),
  }),
  csp: z.object({
    nonce: z.string().optional(),
    allowedOrigins: z.array(z.string()).default([]),
  }),
  encryption: z.object({
    algorithm: z.string().default('aes-256-gcm'),
    keyLength: z.number().int().default(32),
  }),
});

// Monitoring Configuration Schema
const MonitoringConfigSchema = z.object({
  sentry: z.object({
    dsn: z.string().url().optional(),
    environment: z.string(),
    tracesSampleRate: z.number().min(0).max(1).default(0.1),
  }),
  analytics: z.object({
    posthog: z.object({
      apiKey: z.string().optional(),
      host: z.string().url().default('https://app.posthog.com'),
    }),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enableQueryLogging: z.boolean().default(false),
  }),
});

// Feature Flags Configuration Schema
const FeatureFlagsSchema = z.object({
  enableAnalytics: z.boolean().default(true),
  enableErrorReporting: z.boolean().default(true),
  enablePerformanceMonitoring: z.boolean().default(true),
  enableDebugMode: z.boolean().default(false),
  enableAIFeatures: z.boolean().default(false),
  enableAdvancedWorkflows: z.boolean().default(false),
});

// Main Environment Configuration Schema
export const EnvironmentConfigSchema = z.object({
  // Core Environment
  nodeEnv: z.enum(['development', 'staging', 'production']),
  environment: z.enum(['development', 'staging', 'production']),
  appUrl: z.string().url('Invalid app URL'),

  // Service Configurations
  database: DatabaseConfigSchema,
  auth: AuthConfigSchema,
  payment: PaymentConfigSchema,
  communication: CommunicationConfigSchema,
  security: SecurityConfigSchema,
  monitoring: MonitoringConfigSchema,

  // Feature Flags
  features: FeatureFlagsSchema,

  // Vercel-specific (when deployed)
  vercel: z
    .object({
      env: z.enum(['development', 'preview', 'production']).optional(),
      url: z.string().optional(),
      projectId: z.string().optional(),
      orgId: z.string().optional(),
    })
    .optional(),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// Environment Detection
export function detectEnvironment(): Environment {
  // Check Vercel environment first
  if (process.env.VERCEL_ENV) {
    switch (process.env.VERCEL_ENV) {
      case 'production':
        return 'production';
      case 'preview':
        return 'staging';
      default:
        return 'development';
    }
  }

  // Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    // Could be staging or production, check for staging indicators
    if (
      process.env.NEXT_PUBLIC_ENV === 'staging' ||
      process.env.NEXT_PUBLIC_APP_URL?.includes('staging')
    ) {
      return 'staging';
    }
    return 'production';
  }

  return 'development';
}

// Environment-specific defaults
const environmentDefaults = {
  development: {
    database: {
      maxConnections: 5,
      enableLogging: true,
    },
    security: {
      rateLimiting: {
        maxRequests: 10000,
        windowMs: 60000,
      },
    },
    monitoring: {
      logging: {
        level: 'debug' as const,
        enableQueryLogging: true,
      },
    },
    features: {
      enableDebugMode: true,
      enableAnalytics: false,
      enableErrorReporting: false,
    },
  },
  staging: {
    database: {
      maxConnections: 15,
      enableLogging: true,
    },
    security: {
      rateLimiting: {
        maxRequests: 1000,
        windowMs: 60000,
      },
    },
    monitoring: {
      logging: {
        level: 'debug' as const,
        enableQueryLogging: true,
      },
      sentry: {
        tracesSampleRate: 0.5,
      },
    },
    features: {
      enableDebugMode: true,
      enableAnalytics: true,
      enableErrorReporting: true,
      enablePerformanceMonitoring: true,
    },
  },
  production: {
    database: {
      maxConnections: 25,
      enableLogging: false,
    },
    security: {
      rateLimiting: {
        maxRequests: 500,
        windowMs: 60000,
      },
    },
    monitoring: {
      logging: {
        level: 'error' as const,
        enableQueryLogging: false,
      },
      sentry: {
        tracesSampleRate: 0.1,
      },
    },
    features: {
      enableDebugMode: false,
      enableAnalytics: true,
      enableErrorReporting: true,
      enablePerformanceMonitoring: true,
      enableAIFeatures: true,
      enableAdvancedWorkflows: true,
    },
  },
} as const;

// Security validation for critical environment variables
function validateSecurityRequirements(env: Environment, rawConfig: any) {
  const issues: string[] = [];

  // Critical security checks
  if (env === 'production') {
    if (
      !rawConfig.auth?.nextAuthSecret ||
      rawConfig.auth.nextAuthSecret.length < 32
    ) {
      issues.push(
        'NextAuth secret must be at least 32 characters in production',
      );
    }

    if (rawConfig.features?.enableDebugMode) {
      issues.push('Debug mode must be disabled in production');
    }

    if (!rawConfig.appUrl?.startsWith('https://')) {
      issues.push('App URL must use HTTPS in production');
    }

    if (!rawConfig.auth?.nextAuthUrl?.startsWith('https://')) {
      issues.push('NextAuth URL must use HTTPS in production');
    }
  }

  // Check for credential exposure risks
  if (rawConfig.database?.serviceRoleKey?.startsWith('NEXT_PUBLIC_')) {
    issues.push(
      'CRITICAL: Service role key must not be exposed to client (remove NEXT_PUBLIC_ prefix)',
    );
  }

  if (rawConfig.payment?.stripe?.secretKey?.startsWith('NEXT_PUBLIC_')) {
    issues.push(
      'CRITICAL: Stripe secret key must not be exposed to client (remove NEXT_PUBLIC_ prefix)',
    );
  }

  // Validate required security variables
  const requiredSecurityVars = [
    {
      key: 'database.serviceRoleKey',
      value: rawConfig.database?.serviceRoleKey,
    },
    { key: 'auth.nextAuthSecret', value: rawConfig.auth?.nextAuthSecret },
    { key: 'appUrl', value: rawConfig.appUrl },
  ];

  requiredSecurityVars.forEach(({ key, value }) => {
    if (!value || value.trim() === '') {
      issues.push(`CRITICAL: ${key} is required for secure operation`);
    }
  });

  // Report security issues
  if (issues.length > 0) {
    console.error('\n🚨 CRITICAL SECURITY CONFIGURATION ISSUES:');
    issues.forEach((issue) => console.error(`   • ${issue}`));

    if (env === 'production') {
      console.error(
        '\n🚫 APPLICATION STARTUP BLOCKED - SECURITY REQUIREMENTS NOT MET',
      );
      console.error('Fix all security issues before deploying to production.');
      process.exit(1);
    } else {
      console.error(
        '\n⚠️  DEVELOPMENT MODE: Fix these issues before production deployment.',
      );
    }
  }
}

// Load and validate environment configuration
export function loadEnvironmentConfig(): EnvironmentConfig {
  const env = detectEnvironment();
  const defaults = environmentDefaults[env];

  try {
    // Raw configuration from environment variables
    const rawConfig = {
      nodeEnv: process.env.NODE_ENV,
      environment: env,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,

      database: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        maxConnections: defaults.database.maxConnections,
        connectionTimeout: 30000,
        enableLogging: defaults.database.enableLogging,
      },

      auth: {
        nextAuthUrl:
          process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
        nextAuthSecret: process.env.NEXTAUTH_SECRET,
        sessionMaxAge: 2592000, // 30 days
        enableMFA: true,
      },

      payment: {
        stripe: {
          secretKey: process.env.STRIPE_SECRET_KEY,
          publishableKey:
            process.env.STRIPE_PUBLISHABLE_KEY ||
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
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
                process.env.STRIPE_SCALE_ANNUAL_PRICE_ID ||
                'price_scale_annual',
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
          apiKey: process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY,
          fromAddress:
            process.env.NEXT_PUBLIC_FROM_EMAIL || 'hello@wedsync.com',
          fromName: 'WedSync',
        },
        sms: {
          twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            phoneNumber: process.env.TWILIO_PHONE_NUMBER,
          },
        },
      },

      security: {
        corsOrigins: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [],
        rateLimiting: defaults.security.rateLimiting,
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
          tracesSampleRate: defaults.monitoring.sentry.tracesSampleRate,
        },
        analytics: {
          posthog: {
            apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
            host:
              process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          },
        },
        logging: defaults.monitoring.logging,
      },

      features: {
        enableAnalytics:
          process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' ??
          defaults.features.enableAnalytics,
        enableErrorReporting:
          process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true' ??
          defaults.features.enableErrorReporting,
        enablePerformanceMonitoring:
          process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true' ??
          defaults.features.enablePerformanceMonitoring,
        enableDebugMode:
          process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' ??
          defaults.features.enableDebugMode,
        enableAIFeatures:
          process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES === 'true' ??
          defaults.features.enableAIFeatures,
        enableAdvancedWorkflows:
          process.env.NEXT_PUBLIC_ENABLE_ADVANCED_WORKFLOWS === 'true' ??
          defaults.features.enableAdvancedWorkflows,
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

    // Run security validation BEFORE parsing
    validateSecurityRequirements(env, rawConfig);

    // Validate and parse configuration
    const config = EnvironmentConfigSchema.parse(rawConfig);

    // Log successful configuration load (but mask sensitive data)
    if (env === 'development') {
      console.log(
        '✅ Environment configuration loaded and validated successfully',
      );
      console.log(`📍 Environment: ${env}`);
      console.log(`🔗 App URL: ${config.appUrl}`);
      console.log(
        `🗄️  Database: ${config.database.url ? 'Configured' : 'Not configured'}`,
      );
      console.log(
        `💳 Stripe: ${config.payment.stripe.secretKey ? 'Configured' : 'Not configured'}`,
      );
      console.log(
        `📧 Email: ${config.communication.email.apiKey ? 'Configured' : 'Not configured'}`,
      );
      console.log(`🔐 Security validation: PASSED`);
    } else {
      console.log(
        `✅ Environment configuration loaded for: ${env} (security validated)`,
      );
    }

    return config;
  } catch (error) {
    console.error('❌ Failed to load environment configuration:', error);

    if (error instanceof z.ZodError) {
      console.error('Configuration validation errors:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }

    // In development, we can continue with warnings
    if (env === 'development') {
      console.warn(
        '⚠️  Continuing in development mode with invalid configuration',
      );
      throw new Error(
        'Invalid environment configuration - check console for details',
      );
    }

    // In production, fail fast
    process.exit(1);
  }
}

// Cached configuration instance
let cachedConfig: EnvironmentConfig | null = null;

// Get environment configuration (cached)
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = loadEnvironmentConfig();
  }
  return cachedConfig;
}

// Reload configuration (for testing or dynamic updates)
export function reloadEnvironmentConfig(): EnvironmentConfig {
  cachedConfig = null;
  return getEnvironmentConfig();
}

// Helper functions for common configurations
export const config = {
  get env() {
    return getEnvironmentConfig().environment;
  },

  get isDevelopment() {
    return this.env === 'development';
  },

  get isStaging() {
    return this.env === 'staging';
  },

  get isProduction() {
    return this.env === 'production';
  },

  get database() {
    return getEnvironmentConfig().database;
  },

  get auth() {
    return getEnvironmentConfig().auth;
  },

  get payment() {
    return getEnvironmentConfig().payment;
  },

  get communication() {
    return getEnvironmentConfig().communication;
  },

  get security() {
    return getEnvironmentConfig().security;
  },

  get monitoring() {
    return getEnvironmentConfig().monitoring;
  },

  get features() {
    return getEnvironmentConfig().features;
  },

  get vercel() {
    return getEnvironmentConfig().vercel;
  },
};

// Export default configuration object
export default config;
