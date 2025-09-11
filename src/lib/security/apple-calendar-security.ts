/**
 * Apple Calendar Security Manager
 * Comprehensive security framework for CalDAV integration
 * Team E Implementation - WS-218
 */

import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto';

export interface AppleCalendarSecurityConfig {
  maxFailedAttempts: number;
  lockoutDuration: number;
  encryptionKey?: string;
  auditLogEnabled: boolean;
}

export interface CalDAVCredentials {
  appleId: string;
  appSpecificPassword: string;
  serverUrl: string;
}

export interface SecurityValidationResult {
  isValid: boolean;
  securityIssues: string[];
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  auditId: string;
}

export class AppleCalendarSecurityManager {
  private config: AppleCalendarSecurityConfig;
  private failedAttempts: Map<string, number> = new Map();
  private lockouts: Map<string, Date> = new Map();
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';

  constructor(config: AppleCalendarSecurityConfig) {
    this.config = {
      maxFailedAttempts: 3,
      lockoutDuration: 900000, // 15 minutes
      encryptionKey:
        process.env.APPLE_CALENDAR_ENCRYPTION_KEY ||
        this.generateEncryptionKey(),
      auditLogEnabled: true,
      ...config,
    };
  }

  /**
   * Validate CalDAV authentication credentials
   * Implements RFC 4791 compliance with security hardening
   */
  async validateCalDAVAuth(
    credentials: CalDAVCredentials,
  ): Promise<SecurityValidationResult> {
    const auditId = this.generateAuditId();
    const securityIssues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check for lockout
      if (this.isLockedOut(credentials.appleId)) {
        return {
          isValid: false,
          securityIssues: ['Account temporarily locked due to failed attempts'],
          riskAssessment: 'HIGH',
          recommendations: ['Wait for lockout period to expire'],
          auditId,
        };
      }

      // Validate Apple ID format
      if (!this.validateAppleIdFormat(credentials.appleId)) {
        securityIssues.push('Invalid Apple ID format');
      }

      // Validate app-specific password format
      if (
        !this.validateAppSpecificPasswordFormat(credentials.appSpecificPassword)
      ) {
        securityIssues.push('Invalid app-specific password format');
        recommendations.push(
          'Generate new app-specific password in Apple ID settings',
        );
      }

      // Validate server URL security
      const serverValidation = this.validateServerUrl(credentials.serverUrl);
      if (!serverValidation.isSecure) {
        securityIssues.push(...serverValidation.issues);
        recommendations.push(...serverValidation.recommendations);
      }

      // Test CalDAV connection (simulated - would be actual HTTPS request in production)
      const connectionResult = await this.testCalDAVConnection(credentials);
      if (!connectionResult.success) {
        this.recordFailedAttempt(credentials.appleId);
        securityIssues.push('CalDAV authentication failed');
        recommendations.push('Verify credentials in Apple Calendar app');
      }

      // Assess risk level
      const riskAssessment = this.assessRiskLevel(securityIssues);

      // Log audit event
      if (this.config.auditLogEnabled) {
        await this.logAuditEvent(
          auditId,
          credentials.appleId,
          securityIssues,
          riskAssessment,
        );
      }

      return {
        isValid: securityIssues.length === 0,
        securityIssues,
        riskAssessment,
        recommendations,
        auditId,
      };
    } catch (error) {
      console.error('Apple Calendar security validation error:', error);
      return {
        isValid: false,
        securityIssues: ['Internal security validation error'],
        riskAssessment: 'CRITICAL',
        recommendations: ['Contact system administrator'],
        auditId,
      };
    }
  }

  /**
   * Encrypt sensitive calendar data
   */
  encryptCalendarData(data: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      this.ENCRYPTION_ALGORITHM,
      Buffer.from(this.config.encryptionKey!, 'hex'),
      iv,
    );

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  /**
   * Decrypt calendar data
   */
  decryptCalendarData(encrypted: string, iv: string, tag: string): string {
    const decipher = createDecipheriv(
      this.ENCRYPTION_ALGORITHM,
      Buffer.from(this.config.encryptionKey!, 'hex'),
      Buffer.from(iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private validateAppleIdFormat(appleId: string): boolean {
    const appleIdRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return appleIdRegex.test(appleId) && appleId.length <= 254;
  }

  private validateAppSpecificPasswordFormat(password: string): boolean {
    // App-specific passwords are 16 characters, groups of 4 separated by hyphens
    const appPasswordRegex = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/;
    return appPasswordRegex.test(password);
  }

  private validateServerUrl(url: string): {
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const parsedUrl = new URL(url);

      // Must use HTTPS
      if (parsedUrl.protocol !== 'https:') {
        issues.push('Server URL must use HTTPS protocol');
        recommendations.push('Use https:// instead of http://');
      }

      // Validate Apple CalDAV servers
      const validAppleHosts = [
        'caldav.icloud.com',
        'p01-caldav.icloud.com',
        'p02-caldav.icloud.com',
        'p03-caldav.icloud.com',
      ];

      if (!validAppleHosts.some((host) => parsedUrl.hostname.includes(host))) {
        issues.push('Invalid Apple CalDAV server hostname');
        recommendations.push(
          'Use official Apple CalDAV server: https://caldav.icloud.com',
        );
      }

      return {
        isSecure: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        isSecure: false,
        issues: ['Invalid server URL format'],
        recommendations: ['Provide valid HTTPS URL for Apple CalDAV server'],
      };
    }
  }

  private async testCalDAVConnection(
    credentials: CalDAVCredentials,
  ): Promise<{ success: boolean; error?: string }> {
    // In production, this would make actual HTTPS request to CalDAV server
    // For testing purposes, we'll simulate the connection

    try {
      // Simulate CalDAV PROPFIND request
      const isValidCredentials = credentials.appSpecificPassword.match(
        /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/,
      );
      const isValidAppleId = this.validateAppleIdFormat(credentials.appleId);

      return {
        success: isValidCredentials && isValidAppleId,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown connection error',
      };
    }
  }

  private isLockedOut(appleId: string): boolean {
    const lockoutTime = this.lockouts.get(appleId);
    if (!lockoutTime) return false;

    const now = new Date();
    if (now.getTime() - lockoutTime.getTime() > this.config.lockoutDuration) {
      this.lockouts.delete(appleId);
      this.failedAttempts.delete(appleId);
      return false;
    }

    return true;
  }

  private recordFailedAttempt(appleId: string): void {
    const attempts = this.failedAttempts.get(appleId) || 0;
    const newAttempts = attempts + 1;

    this.failedAttempts.set(appleId, newAttempts);

    if (newAttempts >= this.config.maxFailedAttempts) {
      this.lockouts.set(appleId, new Date());
    }
  }

  private assessRiskLevel(
    securityIssues: string[],
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (securityIssues.length === 0) return 'LOW';
    if (
      securityIssues.some(
        (issue) =>
          issue.includes('password') || issue.includes('authentication'),
      )
    )
      return 'HIGH';
    if (
      securityIssues.some(
        (issue) => issue.includes('HTTPS') || issue.includes('protocol'),
      )
    )
      return 'CRITICAL';
    if (securityIssues.length > 2) return 'MEDIUM';
    return 'LOW';
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  private async logAuditEvent(
    auditId: string,
    appleId: string,
    securityIssues: string[],
    riskLevel: string,
  ): Promise<void> {
    const auditEntry = {
      auditId,
      timestamp: new Date().toISOString(),
      appleId: this.hashAppleId(appleId), // Hash for privacy
      securityIssues,
      riskLevel,
      source: 'AppleCalendarSecurityManager',
    };

    // In production, this would write to audit log system
    console.log('[AUDIT]', JSON.stringify(auditEntry, null, 2));
  }

  private hashAppleId(appleId: string): string {
    return createHash('sha256').update(appleId).digest('hex').substring(0, 16);
  }
}

export default AppleCalendarSecurityManager;
