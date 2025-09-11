#!/usr/bin/env tsx
/**
 * WedSync 2.0 - Environment Validation Script
 * 
 * Validates environment configuration across all environments
 * Ensures security compliance and proper configuration management
 * 
 * Feature: WS-097 - Environment Management
 * Team: C - Batch 7 Round 1
 */

import { z } from 'zod';
import { config, getEnvironmentConfig, EnvironmentConfigSchema } from '../src/lib/config/environment';
import { validateEnvironmentSecurity, SecurityValidationError } from '../src/lib/config/validation';

interface ValidationResult {
  environment: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: SecurityValidationError[];
  recommendations: string[];
}

class EnvironmentValidator {
  private results: ValidationResult[] = [];

  async validateAll(): Promise<ValidationResult[]> {
    console.log('🔍 Starting comprehensive environment validation...\n');

    // Validate current environment
    await this.validateCurrentEnvironment();

    // Check for common issues
    await this.checkCommonIssues();

    // Generate summary
    this.printSummary();

    return this.results;
  }

  private async validateCurrentEnvironment(): Promise<void> {
    const env = config.env;
    console.log(`🌍 Validating ${env} environment configuration...`);

    const result: ValidationResult = {
      environment: env,
      valid: true,
      errors: [],
      warnings: [],
      securityIssues: [],
      recommendations: []
    };

    try {
      // Test configuration loading
      const envConfig = getEnvironmentConfig();
      console.log('✅ Configuration loaded successfully');

      // Validate schema compliance
      const validatedConfig = EnvironmentConfigSchema.parse(envConfig);
      console.log('✅ Schema validation passed');

      // Security validation
      try {
        const securityResults = await validateEnvironmentSecurity();
        result.securityIssues = securityResults.errors;

        if (securityResults.errors.length > 0) {
          console.log(`⚠️  Found ${securityResults.errors.length} security issues`);
          result.warnings.push(`${securityResults.errors.length} security issues detected`);
        } else {
          console.log('✅ Security validation passed');
        }
      } catch (securityError) {
        result.errors.push(`Security validation failed: ${securityError}`);
        result.valid = false;
      }

      // Environment-specific checks
      await this.performEnvironmentSpecificChecks(env, result);

    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const errorMsg = `${err.path.join('.')}: ${err.message}`;
          result.errors.push(errorMsg);
          console.log(`❌ ${errorMsg}`);
        });
      } else {
        result.errors.push(`Configuration error: ${error}`);
        console.log(`❌ Configuration error: ${error}`);
      }
      result.valid = false;
    }

    this.results.push(result);
    console.log('');
  }

  private async performEnvironmentSpecificChecks(env: string, result: ValidationResult): Promise<void> {
    const envConfig = getEnvironmentConfig();

    // Check database configuration
    if (!envConfig.database.url || !envConfig.database.serviceRoleKey) {
      result.errors.push('Database configuration incomplete');
    }

    // Check authentication setup
    if (!envConfig.auth.nextAuthSecret || envConfig.auth.nextAuthSecret.length < 32) {
      result.errors.push('NextAuth secret is missing or too short (< 32 characters)');
    }

    // Environment-specific validations
    switch (env) {
      case 'development':
        this.validateDevelopment(envConfig, result);
        break;
      case 'staging':
        this.validateStaging(envConfig, result);
        break;
      case 'production':
        this.validateProduction(envConfig, result);
        break;
    }
  }

  private validateDevelopment(config: any, result: ValidationResult): void {
    // Development should have debug features enabled
    if (!config.features.enableDebugMode) {
      result.warnings.push('Debug mode should be enabled in development');
    }

    // Should use test Stripe keys
    if (config.payment.stripe.secretKey && !config.payment.stripe.secretKey.startsWith('sk_test_')) {
      result.errors.push('Development should use test Stripe keys (sk_test_)');
    }

    result.recommendations.push('Ensure all test services are configured for development');
  }

  private validateStaging(config: any, result: ValidationResult): void {
    // Staging should have monitoring enabled
    if (!config.features.enableAnalytics || !config.features.enableErrorReporting) {
      result.warnings.push('Analytics and error reporting should be enabled in staging');
    }

    // Should use test Stripe keys but production-like configuration
    if (config.payment.stripe.secretKey && !config.payment.stripe.secretKey.startsWith('sk_test_')) {
      result.errors.push('Staging should use test Stripe keys (sk_test_)');
    }

    // Should have proper staging URLs
    if (!config.appUrl.includes('staging')) {
      result.warnings.push('App URL should clearly indicate staging environment');
    }

    result.recommendations.push('Ensure staging mimics production configuration with test credentials');
  }

  private validateProduction(config: any, result: ValidationResult): void {
    // Production should have all security features enabled
    if (config.features.enableDebugMode) {
      result.errors.push('Debug mode should be disabled in production');
    }

    // Should use live Stripe keys
    if (config.payment.stripe.secretKey && !config.payment.stripe.secretKey.startsWith('sk_live_')) {
      result.warnings.push('Production should use live Stripe keys (sk_live_)');
    }

    // Should have monitoring configured
    if (!config.monitoring.sentry.dsn) {
      result.warnings.push('Sentry DSN should be configured for production error tracking');
    }

    // Database connection limits should be appropriate for production
    if (config.database.maxConnections < 20) {
      result.recommendations.push('Consider increasing database connection limit for production load');
    }

    result.recommendations.push('Ensure all production services are configured for high availability');
  }

  private async checkCommonIssues(): Promise<void> {
    console.log('🔍 Checking for common configuration issues...');

    // Check for missing environment variables
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_SECRET',
      'NEXT_PUBLIC_APP_URL'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      console.log(`❌ Missing required environment variables: ${missing.join(', ')}`);
    } else {
      console.log('✅ All required environment variables present');
    }

    // Check for insecure configurations
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      console.log('⚠️  Debug mode enabled in production');
    }

    console.log('');
  }

  private printSummary(): void {
    console.log('📊 VALIDATION SUMMARY');
    console.log('=====================');

    this.results.forEach((result) => {
      const status = result.valid ? '✅' : '❌';
      console.log(`${status} ${result.environment.toUpperCase()}: ${result.valid ? 'VALID' : 'INVALID'}`);

      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        result.errors.forEach(error => console.log(`     - ${error}`));
      }

      if (result.warnings.length > 0) {
        console.log(`   Warnings: ${result.warnings.length}`);
        result.warnings.forEach(warning => console.log(`     - ${warning}`));
      }

      if (result.securityIssues.length > 0) {
        console.log(`   Security Issues: ${result.securityIssues.length}`);
        result.securityIssues.forEach(issue => 
          console.log(`     - ${issue.message} (${issue.severity})`)
        );
      }

      if (result.recommendations.length > 0) {
        console.log(`   Recommendations:`);
        result.recommendations.forEach(rec => console.log(`     - ${rec}`));
      }

      console.log('');
    });

    // Overall status
    const allValid = this.results.every(r => r.valid);
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log(`Overall Status: ${allValid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
  }
}

// CLI execution
async function main() {
  const validator = new EnvironmentValidator();
  const results = await validator.validateAll();

  // Exit with error code if validation failed
  const hasErrors = results.some(r => !r.valid);
  process.exit(hasErrors ? 1 : 0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export default EnvironmentValidator;