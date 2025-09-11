/**
 * Environment Variable Validation Utility
 * Prevents runtime errors from missing or invalid environment variables
 */

interface EnvironmentConfig {
  required: string[];
  optional: string[];
  sensitive: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class EnvironmentValidator {
  private static readonly CONFIG: EnvironmentConfig = {
    required: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXTAUTH_SECRET',
      'NEXT_PUBLIC_APP_URL',
    ],
    optional: [
      'STRIPE_SECRET_KEY',
      'SENDGRID_API_KEY',
      'TWILIO_ACCOUNT_SID',
      'GOOGLE_CLOUD_VISION_API_KEY',
    ],
    sensitive: [
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_SECRET',
      'STRIPE_SECRET_KEY',
      'SENDGRID_API_KEY',
    ],
  };

  /**
   * Validate all environment variables
   */
  static validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    this.CONFIG.required.forEach((varName) => {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    });

    // Check for sensitive variables exposed to client
    this.CONFIG.sensitive.forEach((varName) => {
      if (varName.startsWith('NEXT_PUBLIC_')) {
        errors.push(
          `SECURITY: Sensitive variable ${varName} must not be exposed to client (remove NEXT_PUBLIC_ prefix)`,
        );
      }
    });

    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
      this.validateProductionEnvironment(errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate production-specific requirements
   */
  private static validateProductionEnvironment(
    errors: string[],
    warnings: string[],
  ): void {
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (nextAuthSecret && nextAuthSecret.length < 32) {
      errors.push(
        'NEXTAUTH_SECRET must be at least 32 characters in production',
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.startsWith('https://')) {
      errors.push('App URL must use HTTPS in production');
    }

    if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      warnings.push('Debug mode should be disabled in production');
    }
  }

  /**
   * Get environment variable with validation
   */
  static getRequired(varName: string): string {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
    return value;
  }

  /**
   * Get optional environment variable with default
   */
  static getOptional(varName: string, defaultValue: string = ''): string {
    return process.env[varName] || defaultValue;
  }

  /**
   * Validate and throw on startup if critical issues found
   */
  static validateOrThrow(): void {
    const result = this.validate();

    if (!result.isValid) {
      console.error('🚨 CRITICAL ENVIRONMENT CONFIGURATION ERRORS:');
      result.errors.forEach((error) => console.error(`   • ${error}`));

      if (process.env.NODE_ENV === 'production') {
        console.error(
          '\n🚫 APPLICATION STARTUP BLOCKED - Fix all errors before deploying to production.',
        );
        process.exit(1);
      } else {
        console.error(
          '\n⚠️  DEVELOPMENT MODE: Fix these errors before production deployment.',
        );
      }
    }

    if (result.warnings.length > 0) {
      console.warn('\n⚠️  ENVIRONMENT WARNINGS:');
      result.warnings.forEach((warning) => console.warn(`   • ${warning}`));
    }
  }
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production') {
  EnvironmentValidator.validateOrThrow();
}
