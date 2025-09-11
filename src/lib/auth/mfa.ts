import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// MFA Factor Types
export enum MFAFactorType {
  TOTP = 'totp',
  SMS = 'phone',
}

// MFA Factor Status
export enum MFAFactorStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
}

// Authenticator Assurance Levels
export enum AuthenticatorAssuranceLevel {
  AAL1 = 'aal1',
  AAL2 = 'aal2',
}

export interface MFAFactor {
  id: string;
  factorType: MFAFactorType;
  status: MFAFactorStatus;
  friendlyName?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MFAEnrollResponse {
  data: {
    id: string;
    totp?: {
      qr_code: string;
      secret: string;
      uri: string;
    };
    phone?: {
      phone: string;
    };
  };
  error: Error | null;
}

export interface MFAChallengeResponse {
  data: {
    id: string;
  };
  error: Error | null;
}

export interface MFAVerifyResponse {
  data: {
    user: any;
    session: any;
  };
  error: Error | null;
}

export interface AALResponse {
  data: {
    currentLevel: AuthenticatorAssuranceLevel;
    nextLevel: AuthenticatorAssuranceLevel;
  };
  error: Error | null;
}

/**
 * Multi-Factor Authentication Service
 * Implements comprehensive MFA security with TOTP and SMS support
 * Following OWASP authentication best practices
 */
export class MFAService {
  private static instance: MFAService;
  private failedAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private constructor() {}

  public static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  /**
   * Enroll a new MFA factor for TOTP
   */
  async enrollTOTP(userId: string): Promise<MFAEnrollResponse> {
    try {
      // Check if user already has TOTP enrolled
      const existingFactors = await this.listFactors(userId);
      const totpFactor = existingFactors.data?.totp?.find(
        (f) => f.status === MFAFactorStatus.VERIFIED,
      );

      if (totpFactor) {
        return {
          data: null as any,
          error: new Error('TOTP already enrolled for this user'),
        };
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        await this.logSecurityEvent(
          userId,
          'mfa_enroll_failed',
          'TOTP enrollment failed',
          error.message,
        );
        return { data: null as any, error };
      }

      await this.logSecurityEvent(
        userId,
        'mfa_enroll_initiated',
        'TOTP enrollment initiated',
      );

      return { data, error: null };
    } catch (error) {
      return {
        data: null as any,
        error:
          error instanceof Error ? error : new Error('MFA enrollment failed'),
      };
    }
  }

  /**
   * Enroll a new MFA factor for SMS
   */
  async enrollSMS(
    userId: string,
    phoneNumber: string,
  ): Promise<MFAEnrollResponse> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          data: null as any,
          error: new Error('Invalid phone number format'),
        };
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'phone',
        phone: phoneNumber,
      });

      if (error) {
        await this.logSecurityEvent(
          userId,
          'mfa_enroll_failed',
          'SMS enrollment failed',
          error.message,
        );
        return { data: null as any, error };
      }

      await this.logSecurityEvent(
        userId,
        'mfa_enroll_initiated',
        'SMS enrollment initiated',
        phoneNumber,
      );

      return { data, error: null };
    } catch (error) {
      return {
        data: null as any,
        error:
          error instanceof Error
            ? error
            : new Error('SMS MFA enrollment failed'),
      };
    }
  }

  /**
   * Create a challenge for MFA verification
   */
  async challenge(
    factorId: string,
    userId: string,
  ): Promise<MFAChallengeResponse> {
    try {
      // Check for account lockout
      if (this.isAccountLocked(userId)) {
        await this.logSecurityEvent(
          userId,
          'mfa_challenge_blocked',
          'Account locked - challenge blocked',
        );
        return {
          data: null as any,
          error: new Error(
            'Account temporarily locked due to too many failed attempts',
          ),
        };
      }

      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (error) {
        await this.logSecurityEvent(
          userId,
          'mfa_challenge_failed',
          'Challenge creation failed',
          error.message,
        );
        return { data: null as any, error };
      }

      await this.logSecurityEvent(
        userId,
        'mfa_challenge_created',
        'MFA challenge created',
        factorId,
      );

      return { data, error: null };
    } catch (error) {
      return {
        data: null as any,
        error:
          error instanceof Error ? error : new Error('MFA challenge failed'),
      };
    }
  }

  /**
   * Verify MFA code with enhanced security
   */
  async verify(
    factorId: string,
    challengeId: string,
    code: string,
    userId: string,
  ): Promise<MFAVerifyResponse> {
    try {
      // Check for account lockout
      if (this.isAccountLocked(userId)) {
        await this.logSecurityEvent(
          userId,
          'mfa_verify_blocked',
          'Account locked - verification blocked',
        );
        return {
          data: null as any,
          error: new Error(
            'Account temporarily locked due to too many failed attempts',
          ),
        };
      }

      // Validate code format
      if (!this.isValidMFACode(code)) {
        this.recordFailedAttempt(userId);
        await this.logSecurityEvent(
          userId,
          'mfa_verify_invalid_format',
          'Invalid MFA code format',
        );
        return {
          data: null as any,
          error: new Error('Invalid code format'),
        };
      }

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) {
        this.recordFailedAttempt(userId);
        await this.logSecurityEvent(
          userId,
          'mfa_verify_failed',
          'MFA verification failed',
          error.message,
        );

        // Check if account should be locked
        if (this.shouldLockAccount(userId)) {
          await this.logSecurityEvent(
            userId,
            'account_locked',
            'Account locked due to failed MFA attempts',
          );
        }

        return { data: null as any, error };
      }

      // Success - clear failed attempts
      this.clearFailedAttempts(userId);
      await this.logSecurityEvent(
        userId,
        'mfa_verify_success',
        'MFA verification successful',
      );

      return { data, error: null };
    } catch (error) {
      this.recordFailedAttempt(userId);
      return {
        data: null as any,
        error:
          error instanceof Error ? error : new Error('MFA verification failed'),
      };
    }
  }

  /**
   * List all MFA factors for a user
   */
  async listFactors(userId: string): Promise<{
    data: { totp: MFAFactor[]; phone: MFAFactor[] } | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        await this.logSecurityEvent(
          userId,
          'mfa_list_failed',
          'Failed to list MFA factors',
          error.message,
        );
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to list MFA factors'),
      };
    }
  }

  /**
   * Unenroll an MFA factor
   */
  async unenroll(
    factorId: string,
    userId: string,
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) {
        await this.logSecurityEvent(
          userId,
          'mfa_unenroll_failed',
          'MFA unenrollment failed',
          error.message,
        );
        return { error };
      }

      await this.logSecurityEvent(
        userId,
        'mfa_unenroll_success',
        'MFA factor unenrolled',
        factorId,
      );
      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error('MFA unenrollment failed'),
      };
    }
  }

  /**
   * Get the current Authenticator Assurance Level
   */
  async getAuthenticatorAssuranceLevel(): Promise<AALResponse> {
    try {
      const aalData = supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      return {
        data: aalData,
        error: null,
      };
    } catch (error) {
      return {
        data: null as any,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get assurance level'),
      };
    }
  }

  /**
   * Check if MFA is required for a user
   */
  async isMFARequired(userId: string): Promise<boolean> {
    try {
      const factors = await this.listFactors(userId);
      return (
        factors.data?.totp?.some(
          (f) => f.status === MFAFactorStatus.VERIFIED,
        ) ||
        factors.data?.phone?.some(
          (f) => f.status === MFAFactorStatus.VERIFIED,
        ) ||
        false
      );
    } catch {
      return false;
    }
  }

  /**
   * Security helper methods
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  private isValidMFACode(code: string): boolean {
    const codeRegex = /^\d{6}$/;
    return codeRegex.test(code);
  }

  private recordFailedAttempt(userId: string): void {
    const now = new Date();
    const attempts = this.failedAttempts.get(userId) || {
      count: 0,
      lastAttempt: now,
    };

    this.failedAttempts.set(userId, {
      count: attempts.count + 1,
      lastAttempt: now,
    });
  }

  private clearFailedAttempts(userId: string): void {
    this.failedAttempts.delete(userId);
  }

  private shouldLockAccount(userId: string): boolean {
    const attempts = this.failedAttempts.get(userId);
    return attempts ? attempts.count >= this.MAX_FAILED_ATTEMPTS : false;
  }

  private isAccountLocked(userId: string): boolean {
    const attempts = this.failedAttempts.get(userId);
    if (!attempts || attempts.count < this.MAX_FAILED_ATTEMPTS) {
      return false;
    }

    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    return timeSinceLastAttempt < this.LOCKOUT_DURATION;
  }

  /**
   * Security audit logging
   */
  private async logSecurityEvent(
    userId: string,
    event: string,
    description: string,
    details?: string,
  ): Promise<void> {
    try {
      const logEntry = {
        datetime: new Date().toISOString(),
        appid: 'wedsync.mfa',
        event: `${event}:${userId}`,
        level: this.getLogLevel(event),
        description,
        details,
        user_id: userId,
        ip_address: await this.getClientIP(),
        user_agent: await this.getUserAgent(),
      };

      // In production, send to proper logging service
      console.log('MFA Security Event:', JSON.stringify(logEntry, null, 2));

      // Store in database for audit trail
      await this.storeAuditLog(logEntry);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private getLogLevel(event: string): string {
    const criticalEvents = [
      'account_locked',
      'mfa_verify_failed',
      'suspicious_activity',
    ];
    const warningEvents = ['mfa_enroll_failed', 'mfa_challenge_failed'];

    if (criticalEvents.some((e) => event.includes(e))) return 'CRITICAL';
    if (warningEvents.some((e) => event.includes(e))) return 'WARN';
    return 'INFO';
  }

  private async getClientIP(): Promise<string> {
    // Implementation would extract IP from request headers
    return 'unknown';
  }

  private async getUserAgent(): Promise<string> {
    // Implementation would extract user agent from request headers
    return 'unknown';
  }

  private async storeAuditLog(logEntry: any): Promise<void> {
    // Implementation would store in database audit table
    // For now, just console log
  }

  /**
   * Session management with MFA
   */
  async createSecureSession(
    userId: string,
    aalLevel: AuthenticatorAssuranceLevel,
  ): Promise<any> {
    try {
      // Create session with appropriate AAL level
      const sessionData = {
        userId,
        aalLevel,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
        lastActivity: new Date(),
      };

      await this.logSecurityEvent(
        userId,
        'secure_session_created',
        'Secure session created with MFA',
      );

      return sessionData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh session if AAL2 is maintained
   */
  async refreshSecureSession(sessionId: string, userId: string): Promise<any> {
    try {
      const aalData = await this.getAuthenticatorAssuranceLevel();

      if (aalData.data?.currentLevel !== AuthenticatorAssuranceLevel.AAL2) {
        throw new Error('Session requires MFA re-verification');
      }

      await this.logSecurityEvent(
        userId,
        'session_refreshed',
        'Secure session refreshed',
      );

      return {
        refreshedAt: new Date(),
        expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
      };
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const mfaService = MFAService.getInstance();

/**
 * Middleware helper to check MFA requirements
 */
export async function requireMFA(
  request: NextRequest,
  userId: string,
): Promise<boolean> {
  try {
    const aalData = mfaService.getAuthenticatorAssuranceLevel();
    return (
      (await aalData).data?.currentLevel === AuthenticatorAssuranceLevel.AAL2
    );
  } catch {
    return false;
  }
}

/**
 * Helper function to enforce MFA for sensitive operations
 */
export async function enforceMFAForOperation(
  userId: string,
  operation: string,
): Promise<void> {
  const aalData = await mfaService.getAuthenticatorAssuranceLevel();

  if (aalData.data?.currentLevel !== AuthenticatorAssuranceLevel.AAL2) {
    throw new Error(`Operation "${operation}" requires MFA verification`);
  }
}
