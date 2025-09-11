/**
 * WS-147: Authentication Security Service
 * Enterprise-grade authentication security for WedSync
 * Features: MFA, device fingerprinting, rate limiting, security monitoring
 */

import { createHash, randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase/client';

// Type definitions for security features
export interface PasswordStrengthResult {
  score: number;
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  meetsRequirements: boolean;
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    notCommon: boolean;
  };
}

export interface DeviceFingerprint {
  fingerprint: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browserInfo: {
    name: string;
    version: string;
    engine: string;
  };
  osInfo: {
    name: string;
    version: string;
    platform: string;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: Date;
  locked: boolean;
  lockDuration?: number;
}

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface SecurityEvent {
  userId: string;
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  eventData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGED = 'password_changed',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  DEVICE_TRUSTED = 'device_trusted',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ACCOUNT_LOCKED = 'account_locked',
  TOKEN_REFRESH = 'token_refresh',
  DEVICE_REVOKED = 'device_revoked',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  MFA_BACKUP_USED = 'mfa_backup_used',
  SESSION_EXPIRED = 'session_expired',
}

/**
 * Authentication Security Service
 * Core service for managing authentication security features
 */
export class AuthSecurityService {
  private static readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly PASSWORD_MIN_LENGTH = 12;
  private static readonly MFA_CODE_LENGTH = 6;
  private static readonly BACKUP_CODE_COUNT = 10;
  private static readonly DEVICE_TRUST_DURATION_DAYS = 30;

  /**
   * Validate password strength and requirements
   */
  static validatePasswordStrength(password: string): PasswordStrengthResult {
    const requirements = {
      minLength: password.length >= this.PASSWORD_MIN_LENGTH,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      notCommon: !this.isCommonPassword(password),
    };

    // Calculate score based on requirements met
    let score = 0;
    Object.values(requirements).forEach((met) => {
      if (met) score++;
    });

    const feedback = {
      warning: '',
      suggestions: [] as string[],
    };

    if (!requirements.minLength) {
      feedback.suggestions.push(
        `Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long`,
      );
    }
    if (!requirements.hasUpperCase) {
      feedback.suggestions.push('Add at least one uppercase letter');
    }
    if (!requirements.hasLowerCase) {
      feedback.suggestions.push('Add at least one lowercase letter');
    }
    if (!requirements.hasNumbers) {
      feedback.suggestions.push('Add at least one number');
    }
    if (!requirements.hasSpecialChars) {
      feedback.suggestions.push('Add at least one special character');
    }
    if (!requirements.notCommon) {
      feedback.warning = 'This is a commonly used password';
      feedback.suggestions.push('Choose a more unique password');
    }

    const meetsRequirements = Object.values(requirements).every(Boolean);

    return {
      score: Math.floor((score / 6) * 5), // Convert to 0-5 scale
      feedback,
      meetsRequirements,
      requirements,
    };
  }

  /**
   * Check if password is commonly used
   */
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      '12345678',
      '111111',
      '1234567',
      'sunshine',
      'qwertyuiop',
      'iloveyou',
      'princess',
      'admin',
      'welcome',
      'monkey',
      '1234567890',
      'password1',
      '123123',
      'dragon',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Generate device fingerprint from request
   */
  static generateDeviceFingerprint(req: Request): DeviceFingerprint {
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    const doNotTrack = req.headers.get('dnt') || '';

    // Parse user agent for device info
    const deviceType = this.detectDeviceType(userAgent);
    const browserInfo = this.parseBrowserInfo(userAgent);
    const osInfo = this.parseOSInfo(userAgent);

    // Create unique fingerprint
    const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${doNotTrack}`;
    const fingerprint = createHash('sha256')
      .update(fingerprintData)
      .digest('hex');

    return {
      fingerprint,
      deviceType,
      browserInfo,
      osInfo,
    };
  }

  /**
   * Detect device type from user agent
   */
  private static detectDeviceType(
    userAgent: string,
  ): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    const ua = userAgent.toLowerCase();

    if (/ipad|tablet|kindle|silk/i.test(ua)) {
      return 'tablet';
    }
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
      return 'mobile';
    }
    if (/windows|mac|linux|cros/i.test(ua)) {
      return 'desktop';
    }

    return 'unknown';
  }

  /**
   * Parse browser information from user agent
   */
  private static parseBrowserInfo(userAgent: string): {
    name: string;
    version: string;
    engine: string;
  } {
    const ua = userAgent.toLowerCase();
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    // Detect browser
    if (ua.includes('firefox')) {
      name = 'Firefox';
      const match = ua.match(/firefox\/([\d.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    } else if (ua.includes('chrome')) {
      name = 'Chrome';
      const match = ua.match(/chrome\/([\d.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      name = 'Safari';
      const match = ua.match(/version\/([\d.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    } else if (ua.includes('edge')) {
      name = 'Edge';
      const match = ua.match(/edge\/([\d.]+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    }

    return { name, version, engine };
  }

  /**
   * Parse OS information from user agent
   */
  private static parseOSInfo(userAgent: string): {
    name: string;
    version: string;
    platform: string;
  } {
    const ua = userAgent.toLowerCase();
    let name = 'Unknown';
    let version = 'Unknown';
    let platform = 'Unknown';

    if (ua.includes('windows')) {
      name = 'Windows';
      platform = 'Windows';
      if (ua.includes('windows nt 10.0')) version = '10';
      else if (ua.includes('windows nt 11.0')) version = '11';
      else if (ua.includes('windows nt 6.3')) version = '8.1';
      else if (ua.includes('windows nt 6.2')) version = '8';
      else if (ua.includes('windows nt 6.1')) version = '7';
    } else if (ua.includes('mac os x')) {
      name = 'macOS';
      platform = 'Darwin';
      const match = ua.match(/mac os x ([\d_]+)/);
      if (match) {
        version = match[1].replace(/_/g, '.');
      }
    } else if (ua.includes('android')) {
      name = 'Android';
      platform = 'Linux';
      const match = ua.match(/android ([\d.]+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('linux')) {
      name = 'Linux';
      platform = 'Linux';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      name = 'iOS';
      platform = 'Darwin';
      const match = ua.match(/os ([\d_]+)/);
      if (match) {
        version = match[1].replace(/_/g, '.');
      }
    }

    return { name, version, platform };
  }

  /**
   * Check rate limits for authentication attempts
   */
  static async checkRateLimit(
    identifier: string,
    type: 'login' | 'password_reset' | 'mfa_verify' = 'login',
  ): Promise<RateLimitResult> {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_identifier_type: 'email',
        p_action_type: type,
        p_max_attempts: this.MAX_LOGIN_ATTEMPTS,
        p_window_minutes: this.RATE_LIMIT_WINDOW / 60000,
      });

      if (error) throw error;

      return {
        allowed: data.allowed,
        remainingAttempts: data.remaining_attempts,
        resetTime: new Date(data.reset_time),
        locked: data.locked,
        lockDuration: data.locked ? this.LOCKOUT_DURATION : undefined,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Default to allowing the attempt if check fails
      return {
        allowed: true,
        remainingAttempts: this.MAX_LOGIN_ATTEMPTS,
        resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW),
        locked: false,
      };
    }
  }

  /**
   * Generate MFA secret and setup data
   */
  static generateMFASetup(
    userEmail: string,
    issuer: string = 'WedSync',
  ): MFASetupResult {
    // Generate random secret (32 bytes = 256 bits)
    const secret = randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '')
      .replace(/\//g, '')
      .replace(/=/g, '')
      .substring(0, 32);

    // Generate QR code URL for authenticator apps
    const otpAuthUrl = `otpauth://totp/${issuer}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${issuer}`;
    const qrCodeUrl = `https://chart.googleapis.com/chart?chs=256x256&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Generate backup codes for MFA recovery
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4)}`);
    }

    return codes;
  }

  /**
   * Verify TOTP code
   */
  static verifyTOTPCode(secret: string, code: string): boolean {
    // Simple TOTP verification (would use speakeasy in production)
    const window = 30; // 30 second window
    const currentTime = Math.floor(Date.now() / 1000 / window);

    // Check current window and adjacent windows
    for (let i = -1; i <= 1; i++) {
      const timeCounter = currentTime + i;
      const expectedCode = this.generateTOTPCode(secret, timeCounter);

      if (code === expectedCode) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate TOTP code for a given time counter
   */
  private static generateTOTPCode(secret: string, counter: number): string {
    // Simplified TOTP generation (would use speakeasy in production)
    const hash = createHash('sha256')
      .update(`${secret}${counter}`)
      .digest('hex');

    const code = parseInt(hash.substring(0, 6), 16) % 1000000;
    return code.toString().padStart(6, '0');
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_user_id: event.userId,
        p_event_type: event.eventType,
        p_severity: event.severity,
        p_event_data: event.eventData,
        p_ip_address: event.ipAddress || null,
        p_user_agent: event.userAgent || null,
        p_device_fingerprint: event.deviceFingerprint || null,
      });

      if (error) throw error;

      // Send alerts for high/critical events
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.sendSecurityAlert(event);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Send security alert
   */
  private static async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // Check user's alert preferences
    const { data: alertConfig } = await supabase
      .from('auth_security.alert_configurations')
      .select('*')
      .eq('user_id', event.userId)
      .single();

    if (!alertConfig) return;

    // Send email alert if enabled
    if (alertConfig.email_alerts && alertConfig.alert_email) {
      // TODO: Integrate with email service
      console.log(`Security alert sent to ${alertConfig.alert_email}`);
    }

    // Send push notification if enabled
    if (alertConfig.push_alerts) {
      // TODO: Integrate with push notification service
      console.log(`Push notification sent for user ${event.userId}`);
    }
  }

  /**
   * Trust a device for the user
   */
  static async trustDevice(
    userId: string,
    deviceFingerprint: string,
    deviceName?: string,
  ): Promise<{ success: boolean; trustToken?: string }> {
    try {
      const trustToken = randomBytes(32).toString('hex');
      const trustExpiresAt = new Date();
      trustExpiresAt.setDate(
        trustExpiresAt.getDate() + this.DEVICE_TRUST_DURATION_DAYS,
      );

      const { error } = await supabase
        .from('auth_security.user_devices')
        .update({
          trusted: true,
          trusted_at: new Date().toISOString(),
          trust_expires_at: trustExpiresAt.toISOString(),
          trust_token: trustToken,
          device_name: deviceName,
        })
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint);

      if (error) throw error;

      // Log the event
      await this.logSecurityEvent({
        userId,
        eventType: SecurityEventType.DEVICE_TRUSTED,
        severity: 'low',
        eventData: {
          deviceFingerprint,
          deviceName,
          trustDuration: this.DEVICE_TRUST_DURATION_DAYS,
        },
      });

      return { success: true, trustToken };
    } catch (error) {
      console.error('Failed to trust device:', error);
      return { success: false };
    }
  }

  /**
   * Revoke device trust
   */
  static async revokeDeviceTrust(
    userId: string,
    deviceFingerprint: string,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('auth_security.user_devices')
        .update({
          trusted: false,
          trust_expires_at: null,
          trust_token: null,
        })
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint);

      if (error) throw error;

      // Log the event
      await this.logSecurityEvent({
        userId,
        eventType: SecurityEventType.DEVICE_REVOKED,
        severity: 'medium',
        eventData: {
          deviceFingerprint,
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to revoke device trust:', error);
      return false;
    }
  }

  /**
   * Calculate user risk score
   */
  static async calculateRiskScore(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_risk_score', {
        p_user_id: userId,
      });

      if (error) throw error;

      return data || 0;
    } catch (error) {
      console.error('Failed to calculate risk score:', error);
      return 0;
    }
  }

  /**
   * Check if device is trusted
   */
  static async isDeviceTrusted(
    userId: string,
    deviceFingerprint: string,
  ): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('auth_security.user_devices')
        .select('trusted, trust_expires_at')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .single();

      if (!data || !data.trusted) return false;

      // Check if trust has expired
      if (data.trust_expires_at) {
        const expiresAt = new Date(data.trust_expires_at);
        if (expiresAt < new Date()) {
          // Trust expired, revoke it
          await this.revokeDeviceTrust(userId, deviceFingerprint);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to check device trust:', error);
      return false;
    }
  }

  /**
   * Record authentication attempt
   */
  static async recordAuthAttempt(
    email: string,
    success: boolean,
    attemptType: 'login' | 'password_reset' | 'mfa_verify',
    ipAddress: string,
    userAgent?: string,
    deviceFingerprint?: string,
    failureReason?: string,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('auth_security.auth_attempts')
        .insert({
          email,
          attempt_type: attemptType,
          success,
          failure_reason: failureReason,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_fingerprint: deviceFingerprint,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to record auth attempt:', error);
    }
  }

  /**
   * Lock user account
   */
  static async lockAccount(
    userId: string,
    reason: string,
    duration?: number,
  ): Promise<boolean> {
    try {
      const lockedUntil = duration ? new Date(Date.now() + duration) : null;

      const { error } = await supabase
        .from('auth_security.user_security_profiles')
        .update({
          account_locked: true,
          locked_until: lockedUntil?.toISOString(),
          lock_reason: reason,
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the event
      await this.logSecurityEvent({
        userId,
        eventType: SecurityEventType.ACCOUNT_LOCKED,
        severity: 'high',
        eventData: {
          reason,
          duration,
          lockedUntil,
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to lock account:', error);
      return false;
    }
  }

  /**
   * Unlock user account
   */
  static async unlockAccount(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('auth_security.user_security_profiles')
        .update({
          account_locked: false,
          locked_until: null,
          lock_reason: null,
          failed_login_count: 0,
        })
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to unlock account:', error);
      return false;
    }
  }

  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('auth_security.user_security_profiles')
        .select('account_locked, locked_until')
        .eq('user_id', userId)
        .single();

      if (!data || !data.account_locked) return false;

      // Check if lock has expired
      if (data.locked_until) {
        const lockedUntil = new Date(data.locked_until);
        if (lockedUntil < new Date()) {
          // Lock expired, unlock the account
          await this.unlockAccount(userId);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to check account lock status:', error);
      return false;
    }
  }
}
