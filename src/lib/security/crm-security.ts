/**
 * CRM Integration Security Utilities
 * WS-343 - Team A - Round 1
 *
 * Security functions for CRM integrations including input sanitization,
 * token masking, validation, and CSRF protection
 */

import { z } from 'zod';
import crypto from 'crypto';

// Security configuration
const SECURITY_CONFIG = {
  MAX_STRING_LENGTH: 10000,
  MAX_URL_LENGTH: 2048,
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
  API_KEY_MIN_LENGTH: 16,
  TOKEN_MASK_LENGTH: 4,
  CSRF_TOKEN_LENGTH: 32,
};

/**
 * Input sanitization for CRM integration data
 */
export class CRMInputSanitizer {
  /**
   * Sanitize string input by removing potentially dangerous characters
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Limit length
    if (input.length > SECURITY_CONFIG.MAX_STRING_LENGTH) {
      throw new Error('Input string too long');
    }

    // Remove HTML tags and potentially dangerous characters
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        };
        return entities[char] || char;
      })
      .trim();
  }

  /**
   * Sanitize and validate URLs
   */
  static sanitizeUrl(url: string): string {
    if (typeof url !== 'string') {
      throw new Error('URL must be a string');
    }

    // Limit length
    if (url.length > SECURITY_CONFIG.MAX_URL_LENGTH) {
      throw new Error('URL too long');
    }

    try {
      const parsed = new URL(url);

      // Check protocol
      if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        throw new Error('Invalid URL protocol');
      }

      // Prevent common attacks
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.') ||
        parsed.hostname.includes('..')
      ) {
        throw new Error('Invalid URL hostname');
      }

      return parsed.toString();
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email).toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhoneNumber(phone: string): string {
    const sanitized = this.sanitizeString(phone);

    // Remove all non-digit characters except + and spaces
    const cleaned = sanitized.replace(/[^\d+\s()-]/g, '');

    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new Error('Invalid phone number length');
    }

    return cleaned;
  }
}

/**
 * API Key and Token Security
 */
export class CRMTokenSecurity {
  /**
   * Mask sensitive tokens for display/logging
   */
  static maskToken(token: string): string {
    if (!token || typeof token !== 'string') {
      return '[INVALID_TOKEN]';
    }

    if (token.length <= SECURITY_CONFIG.TOKEN_MASK_LENGTH * 2) {
      return '*'.repeat(token.length);
    }

    const start = token.slice(0, SECURITY_CONFIG.TOKEN_MASK_LENGTH);
    const end = token.slice(-SECURITY_CONFIG.TOKEN_MASK_LENGTH);
    const middle = '*'.repeat(
      token.length - SECURITY_CONFIG.TOKEN_MASK_LENGTH * 2,
    );

    return `${start}${middle}${end}`;
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    if (typeof apiKey !== 'string') {
      return false;
    }

    // Check minimum length
    if (apiKey.length < SECURITY_CONFIG.API_KEY_MIN_LENGTH) {
      return false;
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(test|demo|sample|example)/i,
      /^(12345|password|secret)/i,
      /(.)\1{10,}/, // Repeated characters
    ];

    return !weakPatterns.some((pattern) => pattern.test(apiKey));
  }

  /**
   * Generate secure state parameter for OAuth
   */
  static generateSecureState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code verifier
   */
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge
   */
  static generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Validate OAuth state parameter
   */
  static validateOAuthState(
    state: string,
    storedState: string,
    maxAge: number = 300000,
  ): boolean {
    if (!state || !storedState || state !== storedState) {
      return false;
    }

    // Additional timestamp validation would be implemented here
    // For now, just validate the format
    return /^[A-Za-z0-9_-]+$/.test(state);
  }
}

/**
 * CSRF Protection
 */
export class CSRFProtection {
  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    return crypto
      .randomBytes(SECURITY_CONFIG.CSRF_TOKEN_LENGTH)
      .toString('hex');
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken),
    );
  }
}

/**
 * Request validation schemas
 */
export const CRMValidationSchemas = {
  // CRM Provider validation
  crmProvider: z.enum([
    'tave',
    'light_blue',
    'honeybook',
    'dubsado',
    'studio_ninja',
  ]),

  // Connection name validation
  connectionName: z
    .string()
    .min(1, 'Connection name is required')
    .max(100, 'Connection name too long')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Connection name contains invalid characters',
    ),

  // URL validation
  url: z.string().url('Invalid URL format').max(SECURITY_CONFIG.MAX_URL_LENGTH),

  // Email validation
  email: z.string().email('Invalid email format').max(255),

  // Phone validation
  phone: z
    .string()
    .min(10, 'Phone number too short')
    .max(15, 'Phone number too long')
    .regex(/^[+\d\s()-]+$/, 'Invalid phone number format'),

  // API key validation
  apiKey: z
    .string()
    .min(SECURITY_CONFIG.API_KEY_MIN_LENGTH, 'API key too short')
    .max(512, 'API key too long'),

  // OAuth configuration
  oauthConfig: z.object({
    client_id: z.string().min(1, 'Client ID is required'),
    client_secret: z.string().min(1, 'Client secret is required').optional(),
    redirect_uri: z.string().url('Invalid redirect URI'),
    scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  }),

  // Sync configuration
  syncConfig: z.object({
    sync_direction: z.enum(['import_only', 'export_only', 'bidirectional']),
    auto_sync_enabled: z.boolean(),
    sync_interval_minutes: z.number().min(15).max(1440),
  }),

  // Field mapping validation
  fieldMapping: z.object({
    crm_field_id: z.string().min(1),
    wedsync_field_id: z.string().min(1),
    transformation_rules: z.any().optional(),
    is_required: z.boolean(),
  }),
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  // API endpoints
  'GET:/api/crm/integrations': { requests: 100, window: 60000 }, // 100 requests per minute
  'POST:/api/crm/integrations': { requests: 10, window: 60000 }, // 10 requests per minute
  'PUT:/api/crm/integrations/*': { requests: 20, window: 60000 }, // 20 requests per minute
  'POST:/api/crm/sync': { requests: 5, window: 60000 }, // 5 sync requests per minute
  'POST:/api/crm/oauth/*': { requests: 10, window: 300000 }, // 10 OAuth requests per 5 minutes

  // Default limits
  default: { requests: 60, window: 60000 }, // 60 requests per minute
};

/**
 * Security headers for CRM API responses
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Audit logging for security events
 */
export class SecurityAuditLogger {
  /**
   * Log security event
   */
  static async logSecurityEvent(event: {
    type:
      | 'auth_success'
      | 'auth_failure'
      | 'invalid_input'
      | 'rate_limit'
      | 'csrf_violation';
    userId?: string;
    integrationId?: string;
    ipAddress?: string;
    userAgent?: string;
    details: Record<string, any>;
  }): Promise<void> {
    // In production, this would log to a secure audit system
    console.log('[SECURITY_AUDIT]', {
      timestamp: new Date().toISOString(),
      ...event,
      // Sanitize sensitive data
      details: this.sanitizeAuditData(event.details),
    });
  }

  /**
   * Sanitize audit data to remove sensitive information
   */
  private static sanitizeAuditData(
    data: Record<string, any>,
  ): Record<string, any> {
    const sanitized = { ...data };

    // Remove or mask sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'api_key',
      'secret',
      'authorization',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = CRMTokenSecurity.maskToken(String(sanitized[field]));
      }
    }

    return sanitized;
  }
}

/**
 * Encryption utilities for storing sensitive CRM data
 */
export class CRMDataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Generate encryption key from password
   */
  static deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, 'sha512');
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string, key: Buffer): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipher(this.ALGORITHM, key);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine IV + encrypted data + tag
    return iv.toString('hex') + encrypted + tag.toString('hex');
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string, key: Buffer): string {
    const iv = Buffer.from(encryptedData.slice(0, this.IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(-this.TAG_LENGTH * 2), 'hex');
    const encrypted = encryptedData.slice(
      this.IV_LENGTH * 2,
      -this.TAG_LENGTH * 2,
    );

    const decipher = crypto.createDecipher(this.ALGORITHM, key);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

/**
 * Utility function to apply all security measures to CRM integration data
 */
export function secureCRMIntegrationData(data: any): any {
  const secured = { ...data };

  // Sanitize string fields
  const stringFields = ['connection_name', 'description'];
  for (const field of stringFields) {
    if (secured[field]) {
      secured[field] = CRMInputSanitizer.sanitizeString(secured[field]);
    }
  }

  // Sanitize URL fields
  const urlFields = ['webhook_url', 'callback_url', 'base_url'];
  for (const field of urlFields) {
    if (secured[field]) {
      secured[field] = CRMInputSanitizer.sanitizeUrl(secured[field]);
    }
  }

  // Validate API keys
  if (secured.auth_config?.api_key) {
    if (!CRMTokenSecurity.validateApiKey(secured.auth_config.api_key)) {
      throw new Error('Invalid API key format');
    }
  }

  return secured;
}
