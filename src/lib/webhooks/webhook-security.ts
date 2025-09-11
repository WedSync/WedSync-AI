/**
 * WS-201: Webhook Security System
 * Team B - Backend/API Implementation
 *
 * Provides enterprise-grade security for webhook delivery including:
 * - HMAC-SHA256 signature generation and validation
 * - Timing-safe signature comparison to prevent timing attacks
 * - Timestamp validation to prevent replay attacks
 * - Secure secret generation and management
 */

import crypto from 'crypto';
import { z } from 'zod';

// ================================================
// TYPES AND INTERFACES
// ================================================

export interface WebhookSecurityConfig {
  secret: string;
  algorithm: 'sha256' | 'sha512';
  timestampTolerance: number; // seconds
  enableTimestampValidation: boolean;
}

export interface SignatureValidationResult {
  isValid: boolean;
  error?: string;
  timestamp?: number;
}

export interface WebhookSignature {
  signature: string;
  timestamp: number;
  algorithm: string;
}

// ================================================
// VALIDATION SCHEMAS
// ================================================

const webhookSecurityConfigSchema = z.object({
  secret: z.string().min(32, 'Webhook secret must be at least 32 characters'),
  algorithm: z.enum(['sha256', 'sha512']).default('sha256'),
  timestampTolerance: z.number().min(60).max(3600).default(300), // 5 minutes default
  enableTimestampValidation: z.boolean().default(true),
});

const webhookEndpointUrlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine((url) => url.startsWith('https://'), 'Webhook URLs must use HTTPS');

const webhookHeadersSchema = z.object({
  'x-webhook-signature-256': z.string().optional(),
  'x-webhook-timestamp': z.string().optional(),
  'content-type': z.string().default('application/json'),
  'user-agent': z.string().default('WedSync-Webhooks/1.0'),
});

// ================================================
// WEBHOOK SECURITY CLASS
// ================================================

class WebhookSecurity {
  private config: WebhookSecurityConfig;

  constructor(config: Partial<WebhookSecurityConfig>) {
    this.config = webhookSecurityConfigSchema.parse(config);
  }

  /**
   * Generate cryptographically secure webhook secret
   */
  static generateSecureSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate HMAC signature for webhook payload
   * Uses constant-time operations to prevent timing attacks
   */
  generateSignature(
    payload: string | Buffer,
    timestamp?: number,
  ): WebhookSignature {
    const payloadString =
      typeof payload === 'string' ? payload : payload.toString('utf8');
    const signatureTimestamp = timestamp || Math.floor(Date.now() / 1000);

    // Create signing payload with timestamp if enabled
    let signingPayload = payloadString;
    if (this.config.enableTimestampValidation) {
      signingPayload = `${signatureTimestamp}.${payloadString}`;
    }

    // Generate HMAC signature
    const hmac = crypto.createHmac(this.config.algorithm, this.config.secret);
    hmac.update(signingPayload, 'utf8');
    const signature = hmac.digest('hex');

    return {
      signature,
      timestamp: signatureTimestamp,
      algorithm: this.config.algorithm,
    };
  }

  /**
   * Validate webhook signature with timing-safe comparison
   * Prevents timing attacks by using crypto.timingSafeEqual
   */
  validateSignature(
    payload: string | Buffer,
    receivedSignature: string,
    timestamp?: number,
  ): SignatureValidationResult {
    try {
      // Remove algorithm prefix if present (e.g., 'sha256=')
      const cleanSignature = receivedSignature.replace(/^(sha256|sha512)=/, '');

      // Generate expected signature
      const expected = this.generateSignature(payload, timestamp);

      // Timing-safe signature comparison
      const signatureValid = crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expected.signature, 'hex'),
      );

      if (!signatureValid) {
        return {
          isValid: false,
          error: 'Invalid signature',
        };
      }

      // Validate timestamp if enabled
      if (this.config.enableTimestampValidation && timestamp !== undefined) {
        const timestampValid = this.validateTimestamp(timestamp);
        if (!timestampValid.isValid) {
          return timestampValid;
        }
      }

      return {
        isValid: true,
        timestamp: expected.timestamp,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Signature validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate timestamp to prevent replay attacks
   */
  validateTimestamp(timestamp: number): SignatureValidationResult {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - timestamp);

    if (timeDifference > this.config.timestampTolerance) {
      return {
        isValid: false,
        error: `Timestamp outside tolerance window. Difference: ${timeDifference}s, Max: ${this.config.timestampTolerance}s`,
      };
    }

    return { isValid: true, timestamp };
  }

  /**
   * Generate webhook headers for delivery
   */
  generateWebhookHeaders(
    payload: string | Buffer,
    customHeaders: Record<string, string> = {},
  ): Record<string, string> {
    const signature = this.generateSignature(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WedSync-Webhooks/1.0',
      [`X-Webhook-Signature-${this.config.algorithm.toUpperCase()}`]:
        signature.signature,
      ...customHeaders,
    };

    if (this.config.enableTimestampValidation) {
      headers['X-Webhook-Timestamp'] = signature.timestamp.toString();
    }

    return headers;
  }

  /**
   * Validate incoming webhook URL for security
   */
  static validateWebhookUrl(url: string): { isValid: boolean; error?: string } {
    try {
      webhookEndpointUrlSchema.parse(url);

      const urlObj = new URL(url);

      // Additional security checks
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        return {
          isValid: false,
          error: 'Localhost URLs are not allowed for security reasons',
        };
      }

      // Check for private IP ranges (basic check)
      if (
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.')
      ) {
        return {
          isValid: false,
          error: 'Private IP addresses are not allowed for security reasons',
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid webhook URL: ${error.message}`,
      };
    }
  }

  /**
   * Generate webhook configuration for new endpoints
   */
  static generateWebhookConfig(
    url: string,
    events: string[],
    options: {
      description?: string;
      integrationType?: string;
      businessCritical?: boolean;
      timeout?: number;
      retryCount?: number;
    } = {},
  ): {
    isValid: boolean;
    config?: {
      endpoint_url: string;
      secret_key: string;
      subscribed_events: string[];
      description: string;
      integration_type: string;
      business_critical: boolean;
      timeout_seconds: number;
      retry_count: number;
    };
    error?: string;
  } {
    // Validate URL
    const urlValidation = this.validateWebhookUrl(url);
    if (!urlValidation.isValid) {
      return { isValid: false, error: urlValidation.error };
    }

    // Validate events array
    if (!Array.isArray(events) || events.length === 0) {
      return { isValid: false, error: 'At least one event must be specified' };
    }

    // Generate secure configuration
    return {
      isValid: true,
      config: {
        endpoint_url: url,
        secret_key: this.generateSecureSecret(),
        subscribed_events: events,
        description: options.description || 'Webhook endpoint',
        integration_type: options.integrationType || 'custom',
        business_critical: options.businessCritical || false,
        timeout_seconds: options.timeout || 30,
        retry_count: options.retryCount || 5,
      },
    };
  }
}

// ================================================
// WEBHOOK SIGNATURE VALIDATOR
// Simplified interface for common use cases
// ================================================

class WebhookSignatureValidator {
  private security: WebhookSecurity;

  constructor(secret: string, options: Partial<WebhookSecurityConfig> = {}) {
    this.security = new WebhookSecurity({
      secret,
      ...options,
    });
  }

  /**
   * Quick signature generation
   */
  sign(payload: string | Buffer): string {
    const signature = this.security.generateSignature(payload);
    return `${this.security['config'].algorithm}=${signature.signature}`;
  }

  /**
   * Quick signature validation
   */
  verify(
    payload: string | Buffer,
    signature: string,
    timestamp?: number,
  ): boolean {
    const result = this.security.validateSignature(
      payload,
      signature,
      timestamp,
    );
    return result.isValid;
  }

  /**
   * Generate headers for webhook delivery
   */
  getHeaders(
    payload: string | Buffer,
    customHeaders: Record<string, string> = {},
  ): Record<string, string> {
    return this.security.generateWebhookHeaders(payload, customHeaders);
  }
}

// ================================================
// SECURITY EVENT LOGGER
// ================================================

export interface SecurityEventData {
  eventType:
    | 'invalid_signature'
    | 'expired_timestamp'
    | 'rate_limit_exceeded'
    | 'suspicious_activity'
    | 'unauthorized_access'
    | 'malformed_request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  organizationId?: string;
  webhookEndpointId?: string;
  sourceIp?: string;
  userAgent?: string;
  requestHeaders?: Record<string, string>;
  signatureValid?: boolean;
  timestampValid?: boolean;
  rateLimitExceeded?: boolean;
  actionTaken?: string;
  blocked?: boolean;
  metadata?: Record<string, any>;
}

class WebhookSecurityLogger {
  /**
   * Log security event to database
   * This would integrate with your Supabase client
   */
  static async logSecurityEvent(eventData: SecurityEventData): Promise<void> {
    // This would be implemented with your Supabase client
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Webhook Security Event]', {
        timestamp: new Date().toISOString(),
        ...eventData,
      });
    }

    // TODO: Implement actual database logging
    // const { error } = await supabase
    //   .from('webhook_security_events')
    //   .insert({
    //     organization_id: eventData.organizationId,
    //     webhook_endpoint_id: eventData.webhookEndpointId,
    //     event_type: eventData.eventType,
    //     severity: eventData.severity,
    //     description: eventData.description,
    //     source_ip: eventData.sourceIp,
    //     user_agent: eventData.userAgent,
    //     request_headers: eventData.requestHeaders,
    //     signature_valid: eventData.signatureValid,
    //     timestamp_valid: eventData.timestampValid,
    //     rate_limit_exceeded: eventData.rateLimitExceeded,
    //     action_taken: eventData.actionTaken,
    //     blocked: eventData.blocked,
    //     security_metadata: eventData.metadata
    //   });
  }

  /**
   * Log invalid signature attempt
   */
  static async logInvalidSignature(
    organizationId: string,
    webhookEndpointId: string,
    sourceIp: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'invalid_signature',
      severity: 'medium',
      description: 'Webhook delivered with invalid HMAC signature',
      organizationId,
      webhookEndpointId,
      sourceIp,
      userAgent,
      signatureValid: false,
      actionTaken: 'Request rejected',
      blocked: true,
    });
  }

  /**
   * Log expired timestamp attempt
   */
  static async logExpiredTimestamp(
    organizationId: string,
    webhookEndpointId: string,
    sourceIp: string,
    timestamp: number,
    userAgent?: string,
  ): Promise<void> {
    const timeDiff = Math.floor(Date.now() / 1000) - timestamp;

    await this.logSecurityEvent({
      eventType: 'expired_timestamp',
      severity: timeDiff > 3600 ? 'high' : 'medium', // High severity if > 1 hour old
      description: `Webhook delivered with expired timestamp (${timeDiff}s old)`,
      organizationId,
      webhookEndpointId,
      sourceIp,
      userAgent,
      timestampValid: false,
      actionTaken: 'Request rejected',
      blocked: true,
      metadata: { timestamp, timeDifference: timeDiff },
    });
  }

  /**
   * Log rate limit exceeded
   */
  static async logRateLimitExceeded(
    organizationId: string,
    webhookEndpointId: string,
    sourceIp: string,
    requestCount: number,
    userAgent?: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'rate_limit_exceeded',
      severity: requestCount > 1000 ? 'high' : 'medium',
      description: `Webhook endpoint exceeded rate limit (${requestCount} requests)`,
      organizationId,
      webhookEndpointId,
      sourceIp,
      userAgent,
      rateLimitExceeded: true,
      actionTaken: 'Rate limited',
      blocked: true,
      metadata: { requestCount },
    });
  }
}

// ================================================
// EXPORTS
// ================================================

// Export all classes and types for easy importing
export { WebhookSecurity, WebhookSignatureValidator, WebhookSecurityLogger };

// Export validation schemas for API use
export {
  webhookSecurityConfigSchema,
  webhookEndpointUrlSchema,
  webhookHeadersSchema,
};
