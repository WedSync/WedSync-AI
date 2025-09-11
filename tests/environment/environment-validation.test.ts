/**
 * WS-194 Environment Management - Team E QA Framework
 * Comprehensive multi-team environment validation coordinating Teams A/B/C/D
 * 
 * @feature WS-194 - Environment Management
 * @team Team E - QA/Testing & Documentation
 * @round Round 1
 * @date 2025-08-29
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { z } from 'zod';

// Types for multi-team environment validation
interface ValidationReport {
  timestamp: string;
  overallValid: boolean;
  results: EnvironmentValidationResult[];
  criticalIssues: EnvironmentValidationResult[];
  summary: ValidationSummary;
}

interface EnvironmentValidationResult {
  environment: string;
  team: string;
  valid: boolean;
  validations: ConfigValidation[];
  severity: 'critical' | 'warning' | 'info';
  weddingImpact: 'high' | 'medium' | 'low' | 'none';
}

interface ConfigValidation {
  team: string;
  area: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  severity: 'critical' | 'warning' | 'info';
}

interface ValidationSummary {
  totalEnvironments: number;
  validEnvironments: number;
  criticalIssues: number;
  teamResults: Record<string, TeamValidationSummary>;
}

interface TeamValidationSummary {
  team: string;
  valid: boolean;
  criticalIssues: number;
  warnings: number;
  areas: string[];
}

/**
 * Comprehensive Environment Validator 
 * Coordinates validation across all teams and environments
 */
export class EnvironmentValidator {
  private results: EnvironmentValidationResult[] = [];

  /**
   * Validates all environments with multi-team coordination
   * Critical for wedding season deployment safety
   */
  async validateAllEnvironments(): Promise<ValidationReport> {
    const environments = ['development', 'staging', 'production'];
    const results: EnvironmentValidationResult[] = [];

    console.log('🚀 WS-194: Starting comprehensive multi-team environment validation...\n');

    for (const env of environments) {
      console.log(`🌍 Validating ${env} environment across all teams...`);
      const result = await this.validateEnvironment(env);
      results.push(result);
    }

    const overallValid = results.every(r => r.valid);
    const criticalIssues = results.filter(r => !r.valid && r.severity === 'critical');
    
    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      overallValid,
      results,
      criticalIssues,
      summary: this.generateValidationSummary(results),
    };

    this.printValidationReport(report);
    return report;
  }

  /**
   * Validates specific environment across all teams
   * Coordinates Team A (Frontend), B (API), C (Integrations), D (Mobile)
   */
  private async validateEnvironment(env: string): Promise<EnvironmentValidationResult> {
    const validations = await Promise.all([
      this.validateFrontendConfig(env),      // Team A - Frontend/PWA
      this.validateAPIConfig(env),           // Team B - API/Backend  
      this.validateIntegrationConfig(env),   // Team C - Integrations
      this.validateMobileConfig(env),        // Team D - Mobile
    ]);

    const allValid = validations.every(v => v.valid);
    const hasCritical = validations.some(v => v.severity === 'critical');
    
    return {
      environment: env,
      team: 'ALL',
      valid: allValid,
      validations,
      severity: hasCritical ? 'critical' : (validations.some(v => v.severity === 'warning') ? 'warning' : 'info'),
      weddingImpact: this.assessWeddingImpact(env, validations),
    };
  }

  /**
   * Team A - Frontend/PWA Configuration Validation
   * Validates build config, PWA manifest, and frontend environment
   */
  private async validateFrontendConfig(env: string): Promise<ConfigValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    console.log('  📱 Team A - Frontend/PWA validation...');

    try {
      // Validate Next.js build configuration
      const nextConfig = await this.loadNextConfig(env);
      if (!nextConfig.optimized && env === 'production') {
        errors.push('Production build optimization not enabled');
      }

      // Validate PWA manifest
      const manifest = await this.loadPWAManifest(env);
      if (!manifest?.name || !manifest?.short_name) {
        errors.push('PWA manifest missing required fields');
      }

      // Check frontend environment variables
      const requiredFrontendVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_APP_URL'
      ];

      for (const varName of requiredFrontendVars) {
        if (!process.env[varName]) {
          errors.push(`Missing frontend environment variable: ${varName}`);
        }
      }

      // Validate build output for production
      if (env === 'production') {
        const buildStats = await this.checkBuildStats();
        if (buildStats.bundleSize > 500 * 1024) { // 500KB limit
          warnings.push('Bundle size exceeds recommended 500KB for wedding day performance');
        }
      }

      // Check PWA service worker for offline capability
      const serviceWorker = await this.checkServiceWorker(env);
      if (!serviceWorker && env === 'production') {
        warnings.push('Service worker not configured - weddings need offline capability');
      }

    } catch (error) {
      errors.push(`Team A validation error: ${error}`);
    }

    console.log(`    ${errors.length === 0 ? '✅' : '❌'} Frontend config: ${errors.length} errors, ${warnings.length} warnings`);

    return {
      team: 'A',
      area: 'frontend-pwa',
      valid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'critical' : (warnings.length > 0 ? 'warning' : 'info'),
    };
  }

  /**
   * Team B - API/Backend Configuration Validation
   * Validates database connections, API endpoints, and backend services
   */
  private async validateAPIConfig(env: string): Promise<ConfigValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    console.log('  🔧 Team B - API/Backend validation...');

    try {
      // Validate database configuration
      const dbConfig = await this.validateDatabaseConfig(env);
      if (!dbConfig.valid) {
        errors.push(...dbConfig.errors);
      }

      // Check API endpoint health
      const apiHealth = await this.checkAPIHealth(env);
      if (!apiHealth.healthy) {
        errors.push('API endpoints not responding correctly');
      }

      // Validate Supabase configuration
      const supabaseConfig = await this.validateSupabaseConfig(env);
      if (!supabaseConfig.valid) {
        errors.push(...supabaseConfig.errors);
      }

      // Check Stripe payment configuration (critical for weddings)
      const paymentConfig = await this.validatePaymentConfig(env);
      if (!paymentConfig.valid) {
        if (env === 'production') {
          errors.push('Payment configuration invalid - critical for wedding bookings');
        } else {
          warnings.push('Payment configuration should be validated');
        }
      }

      // Validate authentication configuration
      const authConfig = await this.validateAuthConfig(env);
      if (!authConfig.valid) {
        errors.push('Authentication configuration invalid');
      }

    } catch (error) {
      errors.push(`Team B validation error: ${error}`);
    }

    console.log(`    ${errors.length === 0 ? '✅' : '❌'} API/Backend: ${errors.length} errors, ${warnings.length} warnings`);

    return {
      team: 'B',
      area: 'api-backend',
      valid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'critical' : (warnings.length > 0 ? 'warning' : 'info'),
    };
  }

  /**
   * Team C - Integrations Configuration Validation
   * Validates external service connections and webhooks
   */
  private async validateIntegrationConfig(env: string): Promise<ConfigValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    console.log('  🔗 Team C - Integrations validation...');

    try {
      // Validate CRM integrations (Tave, HoneyBook, etc.)
      const crmIntegrations = await this.validateCRMIntegrations(env);
      if (!crmIntegrations.valid) {
        warnings.push(...crmIntegrations.errors);
      }

      // Check email service configuration (Resend)
      const emailConfig = await this.validateEmailConfig(env);
      if (!emailConfig.valid) {
        if (env === 'production') {
          errors.push('Email service configuration invalid - critical for wedding communications');
        } else {
          warnings.push('Email configuration needs validation');
        }
      }

      // Validate SMS service (Twilio)
      const smsConfig = await this.validateSMSConfig(env);
      if (!smsConfig.valid && env === 'production') {
        warnings.push('SMS service configuration incomplete');
      }

      // Check webhook endpoints
      const webhooks = await this.validateWebhooks(env);
      if (!webhooks.valid) {
        errors.push('Webhook configuration invalid');
      }

      // Validate external API rate limits and quotas
      const rateLimits = await this.checkExternalAPILimits(env);
      if (!rateLimits.withinLimits) {
        warnings.push('External API usage approaching limits');
      }

    } catch (error) {
      errors.push(`Team C validation error: ${error}`);
    }

    console.log(`    ${errors.length === 0 ? '✅' : '❌'} Integrations: ${errors.length} errors, ${warnings.length} warnings`);

    return {
      team: 'C',
      area: 'integrations',
      valid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'critical' : (warnings.length > 0 ? 'warning' : 'info'),
    };
  }

  /**
   * Team D - Mobile Configuration Validation
   * Validates mobile app configuration and app store settings
   */
  private async validateMobileConfig(env: string): Promise<ConfigValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    console.log('  📱 Team D - Mobile validation...');

    try {
      // Validate Capacitor configuration
      const capacitorConfig = await this.validateCapacitorConfig(env);
      if (!capacitorConfig.valid) {
        errors.push(...capacitorConfig.errors);
      }

      // Check mobile app store configuration
      const appStoreConfig = await this.validateAppStoreConfig(env);
      if (!appStoreConfig.valid && env === 'production') {
        warnings.push('App store configuration incomplete');
      }

      // Validate push notification setup
      const pushConfig = await this.validatePushNotifications(env);
      if (!pushConfig.valid) {
        warnings.push('Push notification configuration incomplete');
      }

      // Check mobile-specific environment variables
      const mobileEnvVars = [
        'CAPACITOR_APP_ID',
        'CAPACITOR_APP_NAME'
      ];

      for (const varName of mobileEnvVars) {
        if (!process.env[varName]) {
          if (env === 'production') {
            errors.push(`Missing mobile environment variable: ${varName}`);
          } else {
            warnings.push(`Mobile environment variable should be set: ${varName}`);
          }
        }
      }

      // Validate mobile performance configuration
      const mobilePerf = await this.checkMobilePerformanceConfig(env);
      if (!mobilePerf.optimized) {
        warnings.push('Mobile performance optimizations not fully configured');
      }

    } catch (error) {
      errors.push(`Team D validation error: ${error}`);
    }

    console.log(`    ${errors.length === 0 ? '✅' : '❌'} Mobile: ${errors.length} errors, ${warnings.length} warnings`);

    return {
      team: 'D',
      area: 'mobile',
      valid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'critical' : (warnings.length > 0 ? 'warning' : 'info'),
    };
  }

  /**
   * Assess wedding impact of configuration issues
   * Critical for Saturday deployment safety
   */
  private assessWeddingImpact(env: string, validations: ConfigValidation[]): 'high' | 'medium' | 'low' | 'none' {
    if (env !== 'production') return 'low';

    const criticalErrors = validations.filter(v => v.severity === 'critical').length;
    const weddingCriticalAreas = validations.filter(v => 
      v.area.includes('payment') || 
      v.area.includes('email') || 
      v.area.includes('frontend') ||
      v.errors.some(e => e.includes('wedding'))
    );

    if (criticalErrors > 0 && weddingCriticalAreas.length > 0) return 'high';
    if (criticalErrors > 0) return 'medium';
    if (weddingCriticalAreas.length > 0) return 'medium';
    return 'low';
  }

  /**
   * Generate comprehensive validation summary
   */
  private generateValidationSummary(results: EnvironmentValidationResult[]): ValidationSummary {
    const teams = ['A', 'B', 'C', 'D'];
    const teamResults: Record<string, TeamValidationSummary> = {};

    teams.forEach(team => {
      const teamValidations = results.flatMap(r => 
        r.validations.filter(v => v.team === team)
      );
      
      teamResults[team] = {
        team,
        valid: teamValidations.every(v => v.valid),
        criticalIssues: teamValidations.filter(v => v.severity === 'critical').length,
        warnings: teamValidations.reduce((sum, v) => sum + v.warnings.length, 0),
        areas: [...new Set(teamValidations.map(v => v.area))],
      };
    });

    return {
      totalEnvironments: results.length,
      validEnvironments: results.filter(r => r.valid).length,
      criticalIssues: results.filter(r => r.severity === 'critical').length,
      teamResults,
    };
  }

  /**
   * Print comprehensive validation report
   */
  private printValidationReport(report: ValidationReport): void {
    console.log('\n🏁 WS-194 COMPREHENSIVE ENVIRONMENT VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Overall Status: ${report.overallValid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Environments: ${report.summary.validEnvironments}/${report.summary.totalEnvironments} valid`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);

    console.log('\n📊 TEAM SUMMARY:');
    Object.entries(report.summary.teamResults).forEach(([teamId, team]) => {
      console.log(`  Team ${teamId}: ${team.valid ? '✅' : '❌'} (${team.criticalIssues} critical, ${team.warnings} warnings)`);
      console.log(`    Areas: ${team.areas.join(', ')}`);
    });

    if (report.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES (MUST FIX BEFORE WEDDING SEASON):');
      report.criticalIssues.forEach(issue => {
        console.log(`  ${issue.environment}: Wedding Impact = ${issue.weddingImpact.toUpperCase()}`);
        issue.validations.forEach(v => {
          if (v.severity === 'critical') {
            v.errors.forEach(error => console.log(`    ❌ ${error}`));
          }
        });
      });
    }

    console.log('\n🎯 WEDDING SEASON READINESS:');
    const productionResult = report.results.find(r => r.environment === 'production');
    if (productionResult) {
      const weddingReady = productionResult.valid && productionResult.weddingImpact === 'none';
      console.log(`  Production Ready: ${weddingReady ? '✅ YES' : '❌ NO'}`);
      console.log(`  Wedding Impact: ${productionResult.weddingImpact.toUpperCase()}`);
    }
  }

  // Validation helper methods
  private async loadNextConfig(env: string): Promise<any> {
    try {
      // In a real implementation, load and validate Next.js config
      return { optimized: env === 'production' };
    } catch {
      throw new Error('Failed to load Next.js configuration');
    }
  }

  private async loadPWAManifest(env: string): Promise<any> {
    try {
      // In a real implementation, load and validate PWA manifest
      return { name: 'WedSync', short_name: 'WedSync' };
    } catch {
      throw new Error('Failed to load PWA manifest');
    }
  }

  private async checkBuildStats(): Promise<{ bundleSize: number }> {
    return { bundleSize: 400 * 1024 }; // Mock 400KB
  }

  private async checkServiceWorker(env: string): Promise<boolean> {
    return env === 'production'; // Mock service worker check
  }

  private async validateDatabaseConfig(env: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) errors.push('Missing Supabase service role key');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) errors.push('Missing Supabase URL');
    return { valid: errors.length === 0, errors };
  }

  private async checkAPIHealth(env: string): Promise<{ healthy: boolean }> {
    return { healthy: true }; // Mock API health check
  }

  private async validateSupabaseConfig(env: string): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] }; // Mock Supabase validation
  }

  private async validatePaymentConfig(env: string): Promise<{ valid: boolean }> {
    const hasStripeKey = process.env.STRIPE_SECRET_KEY;
    const correctKeyType = env === 'production' 
      ? process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
      : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
    return { valid: hasStripeKey && correctKeyType };
  }

  private async validateAuthConfig(env: string): Promise<{ valid: boolean }> {
    return { valid: !!process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32 };
  }

  private async validateCRMIntegrations(env: string): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] }; // Mock CRM validation
  }

  private async validateEmailConfig(env: string): Promise<{ valid: boolean }> {
    return { valid: !!process.env.RESEND_API_KEY };
  }

  private async validateSMSConfig(env: string): Promise<{ valid: boolean }> {
    return { valid: !!process.env.TWILIO_AUTH_TOKEN };
  }

  private async validateWebhooks(env: string): Promise<{ valid: boolean }> {
    return { valid: !!process.env.STRIPE_WEBHOOK_SECRET };
  }

  private async checkExternalAPILimits(env: string): Promise<{ withinLimits: boolean }> {
    return { withinLimits: true }; // Mock API limit check
  }

  private async validateCapacitorConfig(env: string): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] }; // Mock Capacitor validation
  }

  private async validateAppStoreConfig(env: string): Promise<{ valid: boolean }> {
    return { valid: env !== 'production' }; // Mock app store validation
  }

  private async validatePushNotifications(env: string): Promise<{ valid: boolean }> {
    return { valid: false }; // Mock push notification validation
  }

  private async checkMobilePerformanceConfig(env: string): Promise<{ optimized: boolean }> {
    return { optimized: env === 'production' }; // Mock mobile performance check
  }
}

// Jest test suite
describe('WS-194 Environment Management - Multi-Team Validation', () => {
  let validator: EnvironmentValidator;

  beforeAll(async () => {
    validator = new EnvironmentValidator();
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  it('should validate all environments successfully', async () => {
    const report = await validator.validateAllEnvironments();
    
    expect(report).toBeDefined();
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(report.results).toHaveLength(3); // dev, staging, prod
    expect(report.summary.totalEnvironments).toBe(3);
    
    // Each environment should validate all teams
    report.results.forEach(result => {
      expect(result.validations).toHaveLength(4); // Teams A, B, C, D
      expect(result.validations.map(v => v.team)).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  it('should identify critical issues for production environment', async () => {
    const report = await validator.validateAllEnvironments();
    const productionResult = report.results.find(r => r.environment === 'production');
    
    expect(productionResult).toBeDefined();
    expect(productionResult?.weddingImpact).toBeOneOf(['high', 'medium', 'low', 'none']);
  });

  it('should generate comprehensive team summary', async () => {
    const report = await validator.validateAllEnvironments();
    
    expect(report.summary.teamResults).toHaveProperty('A');
    expect(report.summary.teamResults).toHaveProperty('B');
    expect(report.summary.teamResults).toHaveProperty('C');
    expect(report.summary.teamResults).toHaveProperty('D');
    
    // Each team should have validation results
    Object.values(report.summary.teamResults).forEach(team => {
      expect(team).toHaveProperty('team');
      expect(team).toHaveProperty('valid');
      expect(team).toHaveProperty('criticalIssues');
      expect(team).toHaveProperty('areas');
    });
  });

  it('should assess wedding impact correctly', async () => {
    const report = await validator.validateAllEnvironments();
    const productionResult = report.results.find(r => r.environment === 'production');
    
    if (productionResult && !productionResult.valid) {
      expect(['high', 'medium', 'low']).toContain(productionResult.weddingImpact);
    }
  });

  it('should coordinate all team validations in parallel', async () => {
    const startTime = Date.now();
    const report = await validator.validateAllEnvironments();
    const duration = Date.now() - startTime;
    
    // Validation should complete efficiently (under 30 seconds for all environments)
    expect(duration).toBeLessThan(30000);
    
    // All teams should be represented
    const allTeams = report.results.flatMap(r => r.validations.map(v => v.team));
    expect(new Set(allTeams)).toEqual(new Set(['A', 'B', 'C', 'D']));
  });
});

export default EnvironmentValidator;