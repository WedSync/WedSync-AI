import { NextRequest, NextResponse } from 'next/server';
// SENIOR CODE REVIEWER FIX: Corrected import paths to match actual file structure
import { createServerClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/middleware/audit';
import { pciDSSHandler } from '@/lib/compliance/pci-dss-handler';
import * as crypto from 'crypto';

// Enterprise Authentication with Multi-Factor Support
export enum MFAMethod {
  SMS = 'sms',
  EMAIL = 'email',
  TOTP = 'totp', // Time-based One-Time Password (Google Authenticator)
  HARDWARE_TOKEN = 'hardware_token', // YubiKey, RSA tokens
  BIOMETRIC = 'biometric', // Fingerprint, Face ID
  BACKUP_CODES = 'backup_codes', // Recovery codes
}

export enum AuthenticationRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface MFAChallenge {
  challenge_id: string;
  user_id: string;
  method: MFAMethod;
  challenge_code?: string;
  expires_at: Date;
  attempts: number;
  max_attempts: number;
  verified: boolean;
}

export interface AuthenticationContext {
  user_id: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint: string;
  risk_level: AuthenticationRisk;
  requires_mfa: boolean;
  mfa_methods_available: MFAMethod[];
}

export interface EnterpriseAuthConfig {
  mfa_required_for_roles?: string[];
  mfa_required_for_financial?: boolean;
  max_failed_attempts?: number;
  session_timeout_minutes?: number;
  require_device_trust?: boolean;
  allow_concurrent_sessions?: boolean;
  password_policy?: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    max_age_days: number;
    prevent_reuse_count: number;
  };
}

export class EnterpriseAuthenticationManager {
  private static instance: EnterpriseAuthenticationManager;
  private supabase = createServerClient();
  private mfaSecret = process.env.MFA_SECRET_KEY || '';

  private config: EnterpriseAuthConfig = {
    mfa_required_for_roles: ['admin', 'finance_manager', 'compliance_officer'],
    mfa_required_for_financial: true,
    max_failed_attempts: 5,
    session_timeout_minutes: 480, // 8 hours
    require_device_trust: true,
    allow_concurrent_sessions: false,
    password_policy: {
      min_length: 12,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special_chars: true,
      max_age_days: 90,
      prevent_reuse_count: 12,
    },
  };

  public static getInstance(): EnterpriseAuthenticationManager {
    if (!EnterpriseAuthenticationManager.instance) {
      EnterpriseAuthenticationManager.instance =
        new EnterpriseAuthenticationManager();
    }
    return EnterpriseAuthenticationManager.instance;
  }

  // Main enterprise authentication middleware
  async authenticateRequest(
    request: NextRequest,
  ): Promise<NextResponse | AuthenticationContext> {
    try {
      const supabase = createServerClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return this.createAuthenticationError('No valid session', 401);
      }

      // Create authentication context
      const authContext = await this.createAuthenticationContext(
        session,
        request,
      );

      // Risk-based authentication
      const riskAssessment = await this.assessAuthenticationRisk(
        authContext,
        request,
      );
      authContext.risk_level = riskAssessment.risk_level;
      authContext.requires_mfa = riskAssessment.requires_mfa;

      // Check if MFA is required
      if (authContext.requires_mfa) {
        const mfaStatus = await this.checkMFAStatus(authContext.user_id);

        if (!mfaStatus.verified) {
          return this.createMFARequiredResponse(
            authContext,
            mfaStatus.available_methods,
          );
        }
      }

      // Validate session security
      const sessionValidation = await this.validateSessionSecurity(authContext);
      if (!sessionValidation.valid) {
        await this.terminateSession(session.access_token);
        return this.createAuthenticationError(sessionValidation.reason, 403);
      }

      // Log successful authentication
      await this.logAuthenticationEvent(authContext, 'success', request);

      // Update session activity
      await this.updateSessionActivity(authContext.session_id);

      return authContext;
    } catch (error) {
      console.error('Enterprise authentication error:', error);
      return this.createAuthenticationError('Authentication system error', 500);
    }
  }

  // MFA Challenge Generation and Verification
  async initiiateMFAChallenge(
    userId: string,
    method: MFAMethod,
  ): Promise<MFAChallenge> {
    try {
      const challenge: MFAChallenge = {
        challenge_id: crypto.randomUUID(),
        user_id: userId,
        method,
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        attempts: 0,
        max_attempts: 3,
        verified: false,
      };

      // Generate challenge code based on method
      switch (method) {
        case MFAMethod.SMS:
        case MFAMethod.EMAIL:
          challenge.challenge_code = this.generateNumericCode(6);
          await this.sendMFACode(userId, method, challenge.challenge_code);
          break;

        case MFAMethod.TOTP:
          // TOTP doesn't need a challenge code - user generates it
          break;

        case MFAMethod.HARDWARE_TOKEN:
          challenge.challenge_code = this.generateAlphanumericCode(8);
          break;

        case MFAMethod.BACKUP_CODES:
          // Backup codes are pre-generated
          break;
      }

      // Store challenge
      const { error } = await this.supabase.from('mfa_challenges').insert([
        {
          challenge_id: challenge.challenge_id,
          user_id: challenge.user_id,
          method: challenge.method,
          challenge_code_hash: challenge.challenge_code
            ? crypto
                .createHash('sha256')
                .update(challenge.challenge_code)
                .digest('hex')
            : null,
          expires_at: challenge.expires_at.toISOString(),
          attempts: challenge.attempts,
          max_attempts: challenge.max_attempts,
          verified: challenge.verified,
        },
      ]);

      if (error) throw error;

      // Log MFA challenge initiation
      await auditLog.logEvent({
        user_id: userId,
        action: 'MFA_CHALLENGE_INITIATED',
        resource_type: 'authentication',
        resource_id: challenge.challenge_id,
        metadata: {
          method: method,
          expires_at: challenge.expires_at.toISOString(),
          security_level: 'high',
        },
        timestamp: new Date().toISOString(),
      });

      return challenge;
    } catch (error) {
      console.error('Failed to initiate MFA challenge:', error);
      throw error;
    }
  }

  async verifyMFAChallenge(
    challengeId: string,
    userCode: string,
  ): Promise<{ verified: boolean; reason?: string }> {
    try {
      // Get challenge
      const { data: challenge, error } = await this.supabase
        .from('mfa_challenges')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('verified', false)
        .single();

      if (error || !challenge) {
        return { verified: false, reason: 'Invalid or expired challenge' };
      }

      // Check expiration
      if (new Date() > new Date(challenge.expires_at)) {
        return { verified: false, reason: 'Challenge expired' };
      }

      // Check attempts
      if (challenge.attempts >= challenge.max_attempts) {
        return { verified: false, reason: 'Maximum attempts exceeded' };
      }

      // Increment attempts
      await this.supabase
        .from('mfa_challenges')
        .update({ attempts: challenge.attempts + 1 })
        .eq('challenge_id', challengeId);

      // Verify code based on method
      let isValid = false;
      switch (challenge.method) {
        case MFAMethod.SMS:
        case MFAMethod.EMAIL:
        case MFAMethod.HARDWARE_TOKEN:
          const codeHash = crypto
            .createHash('sha256')
            .update(userCode)
            .digest('hex');
          isValid = codeHash === challenge.challenge_code_hash;
          break;

        case MFAMethod.TOTP:
          isValid = await this.verifyTOTP(challenge.user_id, userCode);
          break;

        case MFAMethod.BACKUP_CODES:
          isValid = await this.verifyBackupCode(challenge.user_id, userCode);
          break;
      }

      if (isValid) {
        // Mark challenge as verified
        await this.supabase
          .from('mfa_challenges')
          .update({
            verified: true,
            verified_at: new Date().toISOString(),
          })
          .eq('challenge_id', challengeId);

        // Log successful MFA verification
        await auditLog.logEvent({
          user_id: challenge.user_id,
          action: 'MFA_VERIFICATION_SUCCESS',
          resource_type: 'authentication',
          resource_id: challengeId,
          metadata: {
            method: challenge.method,
            attempts_used: challenge.attempts + 1,
            security_level: 'high',
          },
          timestamp: new Date().toISOString(),
        });

        return { verified: true };
      } else {
        // Log failed verification
        await auditLog.logEvent({
          user_id: challenge.user_id,
          action: 'MFA_VERIFICATION_FAILED',
          resource_type: 'authentication',
          resource_id: challengeId,
          metadata: {
            method: challenge.method,
            attempts_used: challenge.attempts + 1,
            security_level: 'high',
          },
          timestamp: new Date().toISOString(),
        });

        return {
          verified: false,
          reason:
            challenge.attempts + 1 >= challenge.max_attempts
              ? 'Maximum attempts exceeded'
              : 'Invalid code',
        };
      }
    } catch (error) {
      console.error('Failed to verify MFA challenge:', error);
      return { verified: false, reason: 'Verification system error' };
    }
  }

  // Device Trust and Management
  async registerTrustedDevice(
    userId: string,
    deviceInfo: {
      device_name: string;
      device_type: string;
      browser: string;
      os: string;
      fingerprint: string;
    },
  ): Promise<string> {
    try {
      const deviceId = crypto.randomUUID();
      const registrationToken = this.generateSecureToken(32);

      const { error } = await this.supabase.from('trusted_devices').insert([
        {
          device_id: deviceId,
          user_id: userId,
          device_name: deviceInfo.device_name,
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device_fingerprint: deviceInfo.fingerprint,
          registration_token: registrationToken,
          is_trusted: false, // Requires confirmation
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      // Send device registration confirmation
      await this.sendDeviceRegistrationEmail(
        userId,
        deviceInfo.device_name,
        registrationToken,
      );

      // Log device registration
      await auditLog.logEvent({
        user_id: userId,
        action: 'DEVICE_REGISTRATION_INITIATED',
        resource_type: 'device_trust',
        resource_id: deviceId,
        metadata: {
          device_name: deviceInfo.device_name,
          device_type: deviceInfo.device_type,
          fingerprint_hash: crypto
            .createHash('sha256')
            .update(deviceInfo.fingerprint)
            .digest('hex'),
          security_level: 'medium',
        },
        timestamp: new Date().toISOString(),
      });

      return deviceId;
    } catch (error) {
      console.error('Failed to register trusted device:', error);
      throw error;
    }
  }

  async confirmDeviceRegistration(registrationToken: string): Promise<boolean> {
    try {
      const { data: device, error } = await this.supabase
        .from('trusted_devices')
        .select('*')
        .eq('registration_token', registrationToken)
        .eq('is_trusted', false)
        .single();

      if (error || !device) {
        return false;
      }

      // Mark device as trusted
      await this.supabase
        .from('trusted_devices')
        .update({
          is_trusted: true,
          confirmed_at: new Date().toISOString(),
          registration_token: null, // Remove token after confirmation
        })
        .eq('device_id', device.device_id);

      // Log device confirmation
      await auditLog.logEvent({
        user_id: device.user_id,
        action: 'DEVICE_REGISTRATION_CONFIRMED',
        resource_type: 'device_trust',
        resource_id: device.device_id,
        metadata: {
          device_name: device.device_name,
          security_level: 'high',
        },
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Failed to confirm device registration:', error);
      return false;
    }
  }

  // Password Policy Enforcement
  async validatePassword(
    password: string,
    userId?: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const policy = this.config.password_policy!;

    // Length check
    if (password.length < policy.min_length) {
      errors.push(
        `Password must be at least ${policy.min_length} characters long`,
      );
    }

    // Character requirements
    if (policy.require_uppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.require_lowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.require_numbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (
      policy.require_special_chars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    // Check against common passwords
    if (await this.isCommonPassword(password)) {
      errors.push(
        'Password is too common - please choose a more secure password',
      );
    }

    // Check password history if user is provided
    if (userId && (await this.isPasswordReused(userId, password))) {
      errors.push(
        `Password was used recently - please choose a different password`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Session Security Validation
  private async validateSessionSecurity(
    context: AuthenticationContext,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check session timeout
    const { data: session, error } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('session_id', context.session_id)
      .single();

    if (error || !session) {
      return { valid: false, reason: 'Session not found' };
    }

    // Check if session is expired
    const sessionAge = Date.now() - new Date(session.last_activity).getTime();
    const maxAge = this.config.session_timeout_minutes! * 60 * 1000;

    if (sessionAge > maxAge) {
      return { valid: false, reason: 'Session expired' };
    }

    // Check for concurrent sessions if not allowed
    if (!this.config.allow_concurrent_sessions) {
      const { data: activeSessions } = await this.supabase
        .from('user_sessions')
        .select('session_id')
        .eq('user_id', context.user_id)
        .eq('is_active', true);

      if (activeSessions && activeSessions.length > 1) {
        return { valid: false, reason: 'Concurrent sessions not allowed' };
      }
    }

    return { valid: true };
  }

  // Risk-based Authentication
  private async assessAuthenticationRisk(
    context: AuthenticationContext,
    request: NextRequest,
  ): Promise<{
    risk_level: AuthenticationRisk;
    requires_mfa: boolean;
    risk_factors: string[];
  }> {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Check for new device/location
    if (await this.isNewDevice(context.user_id, context.device_fingerprint)) {
      riskScore += 3;
      riskFactors.push('New device');
    }

    if (await this.isNewLocation(context.user_id, context.ip_address)) {
      riskScore += 2;
      riskFactors.push('New location');
    }

    // Check for suspicious patterns
    if (await this.hasRecentFailedAttempts(context.user_id)) {
      riskScore += 2;
      riskFactors.push('Recent failed attempts');
    }

    // Check user role
    const userRole = await this.getUserRole(context.user_id);
    if (this.config.mfa_required_for_roles?.includes(userRole)) {
      riskScore += 1;
      riskFactors.push('Privileged role');
    }

    // Determine risk level
    let risk_level: AuthenticationRisk;
    if (riskScore >= 5) risk_level = AuthenticationRisk.CRITICAL;
    else if (riskScore >= 3) risk_level = AuthenticationRisk.HIGH;
    else if (riskScore >= 1) risk_level = AuthenticationRisk.MEDIUM;
    else risk_level = AuthenticationRisk.LOW;

    // Determine MFA requirement
    const requires_mfa =
      risk_level === AuthenticationRisk.HIGH ||
      risk_level === AuthenticationRisk.CRITICAL ||
      this.config.mfa_required_for_roles?.includes(userRole) ||
      false;

    return {
      risk_level,
      requires_mfa,
      risk_factors: riskFactors,
    };
  }

  // Utility Methods
  private async createAuthenticationContext(
    session: any,
    request: NextRequest,
  ): Promise<AuthenticationContext> {
    const deviceFingerprint = await this.generateDeviceFingerprint(request);

    return {
      user_id: session.user.id,
      session_id: session.access_token.substring(0, 16), // Use part of token as session ID
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      device_fingerprint: deviceFingerprint,
      risk_level: AuthenticationRisk.LOW, // Will be updated by risk assessment
      requires_mfa: false, // Will be updated by risk assessment
      mfa_methods_available: await this.getAvailableMFAMethods(session.user.id),
    };
  }

  private async generateDeviceFingerprint(
    request: NextRequest,
  ): Promise<string> {
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';

    const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return realIP || cfConnectingIP || 'unknown';
  }

  private createAuthenticationError(
    message: string,
    status: number,
  ): NextResponse {
    return new NextResponse(
      JSON.stringify({
        error: message,
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private createMFARequiredResponse(
    context: AuthenticationContext,
    availableMethods: MFAMethod[],
  ): NextResponse {
    return new NextResponse(
      JSON.stringify({
        mfa_required: true,
        available_methods: availableMethods,
        challenge_endpoint: '/api/auth/mfa/challenge',
        user_id: context.user_id,
        session_id: context.session_id,
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  private generateNumericCode(length: number): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join(
      '',
    );
  }

  private generateAlphanumericCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  }

  private generateSecureToken(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  private async sendMFACode(
    userId: string,
    method: MFAMethod,
    code: string,
  ): Promise<void> {
    // Implementation would integrate with email/SMS service
    console.log(`MFA code ${code} sent via ${method} to user ${userId}`);
  }

  private async sendDeviceRegistrationEmail(
    userId: string,
    deviceName: string,
    token: string,
  ): Promise<void> {
    // Implementation would integrate with email service
    console.log(
      `Device registration email sent to user ${userId} for device ${deviceName}`,
    );
  }

  private async verifyTOTP(userId: string, code: string): Promise<boolean> {
    // Implementation would verify TOTP code against user's secret
    return false; // Placeholder
  }

  private async verifyBackupCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    // Implementation would verify backup code and mark it as used
    return false; // Placeholder
  }

  // Additional helper methods
  private async checkMFAStatus(
    userId: string,
  ): Promise<{ verified: boolean; available_methods: MFAMethod[] }> {
    return {
      verified: false,
      available_methods: [MFAMethod.EMAIL, MFAMethod.SMS],
    };
  }

  private async getAvailableMFAMethods(userId: string): Promise<MFAMethod[]> {
    return [MFAMethod.EMAIL, MFAMethod.SMS, MFAMethod.TOTP];
  }

  private async logAuthenticationEvent(
    context: AuthenticationContext,
    result: string,
    request: NextRequest,
  ): Promise<void> {
    await pciDSSHandler.logAuthenticationEvent(
      context.user_id,
      result as any,
      'enterprise_auth',
      request,
    );
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    await this.supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_id', sessionId);
  }

  private async terminateSession(accessToken: string): Promise<void> {
    const supabase = createServerClient();
    await supabase.auth.signOut();
  }

  private async isNewDevice(
    userId: string,
    fingerprint: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('trusted_devices')
      .select('device_id')
      .eq('user_id', userId)
      .eq('device_fingerprint', fingerprint)
      .eq('is_trusted', true)
      .single();

    return !data;
  }

  private async isNewLocation(
    userId: string,
    ipAddress: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_sessions')
      .select('ip_address')
      .eq('user_id', userId)
      .eq('ip_address', ipAddress)
      .single();

    return !data;
  }

  private async hasRecentFailedAttempts(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('audit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('action', 'AUTHENTICATION_FAILED')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .limit(3);

    return (data?.length || 0) >= 3;
  }

  private async getUserRole(userId: string): Promise<string> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    return data?.role || 'user';
  }

  private async isCommonPassword(password: string): Promise<boolean> {
    // Check against common password list
    const commonPasswords = [
      'password',
      '123456',
      'password123',
      'admin',
      'qwerty',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  private async isPasswordReused(
    userId: string,
    password: string,
  ): Promise<boolean> {
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    const { data } = await this.supabase
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(this.config.password_policy!.prevent_reuse_count);

    return (
      data?.some((record) => record.password_hash === passwordHash) || false
    );
  }
}

export const enterpriseAuthManager =
  EnterpriseAuthenticationManager.getInstance();
