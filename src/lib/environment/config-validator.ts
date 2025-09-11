/**
 * WS-194 Environment Configuration Validator
 * Enhanced environment validation with wedding industry requirements
 * Team B - Backend/API Focus
 */

import { z } from 'zod';
import {
  validateEnvironmentConfiguration,
  ValidationResult,
  ValidationError,
  maskSensitiveValue,
} from '../config/validation';

// Wedding-specific environment schema
const WeddingEnvironmentSchema = z.object({
  // Wedding Season Configuration
  WEDDING_SEASON_PEAK_MONTHS: z
    .string()
    .default('5,6,7,8,9,10')
    .describe('Peak wedding months (comma-separated)'),
  WEDDING_DAY_PROTECTION: z
    .enum(['enabled', 'disabled'])
    .default('enabled')
    .describe('Saturday deployment protection'),
  WEDDING_CAPACITY_LIMIT: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().min(1))
    .default('5000')
    .describe('Max concurrent wedding users'),

  // Vendor Integration Requirements
  TAVE_API_ENDPOINT: z
    .string()
    .url()
    .optional()
    .describe('Tave integration endpoint'),
  HONEYBOOK_OAUTH_CLIENT_ID: z
    .string()
    .optional()
    .describe('HoneyBook OAuth client ID'),
  LIGHTBLUE_SCRAPING_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .describe('Light Blue scraping feature'),

  // Wedding Data Protection
  WEDDING_DATA_ENCRYPTION_KEY: z
    .string()
    .min(32)
    .describe('Wedding-specific data encryption key'),
  GDPR_COMPLIANCE_MODE: z
    .enum(['enabled', 'disabled'])
    .default('enabled')
    .describe('GDPR compliance mode'),
  DATA_RETENTION_DAYS: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().min(30))
    .default('2555')
    .describe('Data retention period (7 years)'),

  // Wedding Communication
  SMS_WEDDING_NOTIFICATIONS: z
    .enum(['enabled', 'disabled'])
    .default('enabled')
    .describe('Wedding SMS notifications'),
  EMAIL_TEMPLATE_WEDDING_THEME: z
    .string()
    .default('elegant')
    .describe('Wedding email template theme'),

  // Performance Requirements
  WEDDING_IMAGE_CDN_URL: z
    .string()
    .url()
    .optional()
    .describe('CDN for wedding images'),
  WEDDING_FORM_CACHE_TTL: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().min(300))
    .default('3600')
    .describe('Wedding form cache TTL'),

  // Deployment Safety
  SATURDAY_DEPLOYMENT_BLOCK: z
    .enum(['true', 'false'])
    .default('true')
    .describe('Block Saturday deployments'),
  WEDDING_BLACKOUT_DATES: z
    .string()
    .optional()
    .describe('Comma-separated blackout dates (YYYY-MM-DD)'),

  // Monitoring
  WEDDING_ALERT_WEBHOOK: z
    .string()
    .url()
    .optional()
    .describe('Wedding-specific alert webhook'),
  UPTIME_MONITORING_CRITICAL: z
    .enum(['true', 'false'])
    .default('true')
    .describe('Critical uptime monitoring'),
});

// Extended validation result with wedding-specific checks
interface WeddingValidationResult extends ValidationResult {
  weddingCompliance: {
    seasonReady: boolean;
    dataProtected: boolean;
    deploymentSafe: boolean;
    performanceOptimized: boolean;
  };
  saturdayProtection: boolean;
  peakSeasonReady: boolean;
}

// Wedding-specific validation rules
export class WeddingEnvironmentValidator {
  private static instance: WeddingEnvironmentValidator;

  static getInstance(): WeddingEnvironmentValidator {
    if (!this.instance) {
      this.instance = new WeddingEnvironmentValidator();
    }
    return this.instance;
  }

  /**
   * Validate wedding environment configuration
   */
  async validateWeddingEnvironment(): Promise<WeddingValidationResult> {
    // Start with base validation
    const baseResult = validateEnvironmentConfiguration();

    // Add wedding-specific validations
    const weddingErrors: ValidationError[] = [...baseResult.errors];
    const weddingWarnings: ValidationError[] = [...baseResult.warnings];

    // Validate wedding-specific environment variables
    const weddingValidation = this.validateWeddingSpecificVars();
    weddingErrors.push(...weddingValidation.errors);
    weddingWarnings.push(...weddingValidation.warnings);

    // Check Saturday protection
    const saturdayProtection = this.validateSaturdayProtection();

    // Check peak season readiness
    const peakSeasonReady = this.validatePeakSeasonReadiness();

    // Wedding compliance checks
    const weddingCompliance = {
      seasonReady: this.checkSeasonReadiness(),
      dataProtected: this.checkDataProtection(),
      deploymentSafe: this.checkDeploymentSafety(),
      performanceOptimized: this.checkPerformanceOptimization(),
    };

    const isWeddingValid = baseResult.isValid && weddingErrors.length === 0;

    return {
      ...baseResult,
      isValid: isWeddingValid,
      errors: weddingErrors,
      warnings: weddingWarnings,
      weddingCompliance,
      saturdayProtection,
      peakSeasonReady,
    };
  }

  /**
   * Validate wedding-specific environment variables
   */
  private validateWeddingSpecificVars(): {
    errors: ValidationError[];
    warnings: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check wedding data encryption key
    if (!process.env.WEDDING_DATA_ENCRYPTION_KEY) {
      errors.push({
        field: 'WEDDING_DATA_ENCRYPTION_KEY',
        message: 'Wedding data encryption key is required for GDPR compliance',
        severity: 'error',
        remediation:
          'Generate a 32+ character encryption key: openssl rand -base64 32',
      });
    }

    // Check peak season configuration
    const peakMonths = process.env.WEDDING_SEASON_PEAK_MONTHS;
    if (!peakMonths || !this.validatePeakMonthsFormat(peakMonths)) {
      warnings.push({
        field: 'WEDDING_SEASON_PEAK_MONTHS',
        message: 'Peak wedding months not properly configured',
        severity: 'warning',
        remediation: 'Set to comma-separated months (1-12): "5,6,7,8,9,10"',
      });
    }

    // Check Saturday protection
    if (process.env.SATURDAY_DEPLOYMENT_BLOCK !== 'true') {
      errors.push({
        field: 'SATURDAY_DEPLOYMENT_BLOCK',
        message: 'Saturday deployment protection must be enabled',
        severity: 'error',
        remediation:
          'Set SATURDAY_DEPLOYMENT_BLOCK=true to protect wedding days',
      });
    }

    // Check capacity limits
    const capacityLimit = parseInt(process.env.WEDDING_CAPACITY_LIMIT || '0');
    if (capacityLimit < 1000) {
      warnings.push({
        field: 'WEDDING_CAPACITY_LIMIT',
        message: 'Wedding capacity limit seems low for peak season',
        severity: 'warning',
        remediation:
          'Consider setting to at least 5000 for peak wedding season',
      });
    }

    // Validate vendor integrations
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.TAVE_API_ENDPOINT) {
        warnings.push({
          field: 'TAVE_API_ENDPOINT',
          message: 'Tave integration not configured for production',
          severity: 'warning',
          remediation: 'Configure Tave API endpoint for vendor integrations',
        });
      }
    }

    // Check wedding image CDN
    if (
      !process.env.WEDDING_IMAGE_CDN_URL &&
      process.env.NODE_ENV === 'production'
    ) {
      warnings.push({
        field: 'WEDDING_IMAGE_CDN_URL',
        message: 'Wedding image CDN not configured for production',
        severity: 'warning',
        remediation: 'Configure CDN for optimal wedding image performance',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate Saturday deployment protection
   */
  private validateSaturdayProtection(): boolean {
    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const protectionEnabled = process.env.SATURDAY_DEPLOYMENT_BLOCK === 'true';

    return !isSaturday || protectionEnabled;
  }

  /**
   * Check if system is ready for peak wedding season
   */
  private validatePeakSeasonReadiness(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    const peakMonths = this.getPeakMonths();

    if (!peakMonths.includes(currentMonth)) {
      return true; // Not peak season, always ready
    }

    // Check all peak season requirements
    const capacityLimit = parseInt(process.env.WEDDING_CAPACITY_LIMIT || '0');
    const hasImageCDN = !!process.env.WEDDING_IMAGE_CDN_URL;
    const hasCaching =
      parseInt(process.env.WEDDING_FORM_CACHE_TTL || '0') >= 3600;
    const hasMonitoring = !!process.env.WEDDING_ALERT_WEBHOOK;

    return capacityLimit >= 5000 && hasImageCDN && hasCaching && hasMonitoring;
  }

  /**
   * Check season-specific readiness
   */
  private checkSeasonReadiness(): boolean {
    const peakMonths = this.getPeakMonths();
    const currentMonth = new Date().getMonth() + 1;

    if (peakMonths.includes(currentMonth)) {
      // Peak season requirements
      return !!(
        process.env.WEDDING_CAPACITY_LIMIT &&
        parseInt(process.env.WEDDING_CAPACITY_LIMIT) >= 5000 &&
        process.env.WEDDING_IMAGE_CDN_URL &&
        process.env.WEDDING_ALERT_WEBHOOK
      );
    }

    return true; // Off-season is always ready
  }

  /**
   * Check data protection compliance
   */
  private checkDataProtection(): boolean {
    return !!(
      process.env.WEDDING_DATA_ENCRYPTION_KEY &&
      process.env.WEDDING_DATA_ENCRYPTION_KEY.length >= 32 &&
      process.env.GDPR_COMPLIANCE_MODE === 'enabled' &&
      process.env.DATA_RETENTION_DAYS &&
      parseInt(process.env.DATA_RETENTION_DAYS) >= 30
    );
  }

  /**
   * Check deployment safety measures
   */
  private checkDeploymentSafety(): boolean {
    const saturdayProtection = process.env.SATURDAY_DEPLOYMENT_BLOCK === 'true';
    const weddingProtection = process.env.WEDDING_DAY_PROTECTION === 'enabled';
    const hasBlackoutDates = !!process.env.WEDDING_BLACKOUT_DATES;

    return saturdayProtection && weddingProtection;
  }

  /**
   * Check performance optimization
   */
  private checkPerformanceOptimization(): boolean {
    const hasImageCDN = !!process.env.WEDDING_IMAGE_CDN_URL;
    const hasCaching =
      parseInt(process.env.WEDDING_FORM_CACHE_TTL || '0') >= 3600;
    const hasCapacityLimit =
      parseInt(process.env.WEDDING_CAPACITY_LIMIT || '0') >= 1000;

    return hasImageCDN && hasCaching && hasCapacityLimit;
  }

  /**
   * Get peak wedding months from environment
   */
  private getPeakMonths(): number[] {
    const peakMonthsStr =
      process.env.WEDDING_SEASON_PEAK_MONTHS || '5,6,7,8,9,10';
    return peakMonthsStr
      .split(',')
      .map((m) => parseInt(m.trim()))
      .filter((m) => m >= 1 && m <= 12);
  }

  /**
   * Validate peak months format
   */
  private validatePeakMonthsFormat(peakMonths: string): boolean {
    try {
      const months = peakMonths.split(',').map((m) => parseInt(m.trim()));
      return months.every((m) => m >= 1 && m <= 12) && months.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if it's currently a blackout date
   */
  isBlackoutDate(date?: Date): boolean {
    const targetDate = date || new Date();
    const blackoutDates = process.env.WEDDING_BLACKOUT_DATES;

    if (!blackoutDates) {
      return false;
    }

    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    return blackoutDates
      .split(',')
      .map((d) => d.trim())
      .includes(dateStr);
  }

  /**
   * Generate wedding environment validation report
   */
  generateWeddingValidationReport(result: WeddingValidationResult): string {
    let report = `
=== WEDSYNC WEDDING ENVIRONMENT VALIDATION ===
Environment: ${result.environment.toUpperCase()}
Timestamp: ${result.timestamp.toISOString()}
Overall Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}
Saturday Protection: ${result.saturdayProtection ? '✅ ACTIVE' : '❌ DISABLED'}
Peak Season Ready: ${result.peakSeasonReady ? '✅ READY' : '⚠️ NOT READY'}

🏰 WEDDING COMPLIANCE STATUS:
├── Season Readiness: ${result.weddingCompliance.seasonReady ? '✅' : '❌'} ${result.weddingCompliance.seasonReady ? 'READY' : 'NOT READY'}
├── Data Protected: ${result.weddingCompliance.dataProtected ? '✅' : '❌'} ${result.weddingCompliance.dataProtected ? 'PROTECTED' : 'VULNERABLE'}
├── Deployment Safe: ${result.weddingCompliance.deploymentSafe ? '✅' : '❌'} ${result.weddingCompliance.deploymentSafe ? 'SAFE' : 'UNSAFE'}
└── Performance Optimized: ${result.weddingCompliance.performanceOptimized ? '✅' : '❌'} ${result.weddingCompliance.performanceOptimized ? 'OPTIMIZED' : 'NEEDS WORK'}

`;

    // Current environment assessment
    const currentMonth = new Date().getMonth() + 1;
    const peakMonths = this.getPeakMonths();
    const isPeakSeason = peakMonths.includes(currentMonth);
    const isSaturday = new Date().getDay() === 6;
    const isBlackout = this.isBlackoutDate();

    report += `🎯 CURRENT ENVIRONMENT ASSESSMENT:
├── Current Month: ${currentMonth} ${isPeakSeason ? '(PEAK SEASON)' : '(Off Season)'}
├── Today is Saturday: ${isSaturday ? '⚠️ YES' : '✅ NO'}
├── Blackout Date: ${isBlackout ? '🚫 YES' : '✅ NO'}
└── Deployment Status: ${(isSaturday || isBlackout) && result.saturdayProtection ? '🔒 BLOCKED' : '🟢 ALLOWED'}

`;

    if (result.errors.length > 0) {
      report += `🚨 CRITICAL ERRORS (${result.errors.length}):\n`;
      result.errors.forEach((error, index) => {
        report += `  ${index + 1}. ${error.field}: ${error.message}\n`;
        if (error.remediation) {
          report += `     💡 Fix: ${error.remediation}\n`;
        }
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += `⚠️  WARNINGS (${result.warnings.length}):\n`;
      result.warnings.forEach((warning, index) => {
        report += `  ${index + 1}. ${warning.field}: ${warning.message}\n`;
        if (warning.remediation) {
          report += `     💡 Consider: ${warning.remediation}\n`;
        }
      });
      report += '\n';
    }

    // Wedding-specific recommendations
    if (isPeakSeason && !result.peakSeasonReady) {
      report += `🎪 PEAK SEASON RECOMMENDATIONS:
├── Increase WEDDING_CAPACITY_LIMIT to 5000+
├── Configure WEDDING_IMAGE_CDN_URL for performance
├── Set WEDDING_ALERT_WEBHOOK for monitoring
└── Verify all vendor integrations are active

`;
    }

    if (
      result.isValid &&
      result.weddingCompliance.seasonReady &&
      result.weddingCompliance.dataProtected
    ) {
      report +=
        '✅ WEDDING ENVIRONMENT READY! All systems go for wedding season! 💒\n';
    } else {
      report +=
        '❌ WEDDING ENVIRONMENT NOT READY! Fix critical issues before wedding season.\n';
    }

    return report;
  }

  /**
   * Validate environment and throw on critical wedding errors
   */
  async validateWeddingEnvironmentOrThrow(): Promise<WeddingValidationResult> {
    const result = await this.validateWeddingEnvironment();

    // Check for critical wedding day issues
    const isSaturday = new Date().getDay() === 6;
    const isBlackout = this.isBlackoutDate();

    if ((isSaturday || isBlackout) && !result.saturdayProtection) {
      console.error('🚨 WEDDING DAY DEPLOYMENT BLOCKED!');
      throw new Error(
        'Cannot deploy on wedding days without protection overrides',
      );
    }

    if (!result.isValid) {
      console.error(this.generateWeddingValidationReport(result));
      throw new Error(
        `Wedding environment validation failed with ${result.errors.length} error(s)`,
      );
    }

    if (result.warnings.length > 0) {
      console.warn(this.generateWeddingValidationReport(result));
    }

    return result;
  }
}

// Singleton instance for easy access
export const weddingValidator = WeddingEnvironmentValidator.getInstance();

// Convenience functions
export const validateWeddingEnvironment = () =>
  weddingValidator.validateWeddingEnvironment();
export const validateWeddingEnvironmentOrThrow = () =>
  weddingValidator.validateWeddingEnvironmentOrThrow();
export const isBlackoutDate = (date?: Date) =>
  weddingValidator.isBlackoutDate(date);
export const generateWeddingValidationReport = (
  result: WeddingValidationResult,
) => weddingValidator.generateWeddingValidationReport(result);
