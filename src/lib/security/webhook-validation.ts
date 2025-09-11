/**
 * WS-159: Enhanced Webhook Security Validation
 * HMAC signature verification for webhook endpoints with timing attack protection
 */

import * as crypto from 'crypto';

/**
 * Verify HMAC-SHA256 webhook signature with timing attack protection
 */
export async function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  body: string,
  secret: string,
): Promise<boolean> {
  try {
    // Create the payload to sign (timestamp + body)
    const payload = timestamp + '.' + body;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Remove any prefix from the signature (e.g., "sha256=")
    const receivedSignature = signature.replace(/^sha256=/, '');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex'),
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Verify Stripe-style webhook signature
 */
export function verifyStripeWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300, // 5 minutes
): boolean {
  try {
    const elements = signature.split(',');

    let timestamp: string | undefined;
    let signatures: string[] = [];

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key.startsWith('v')) {
        signatures.push(value);
      }
    }

    if (!timestamp) {
      throw new Error('Unable to extract timestamp from signature header');
    }

    if (!signatures.length) {
      throw new Error('No signatures found in signature header');
    }

    // Check timestamp tolerance
    const timestampNumber = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);

    if (Math.abs(currentTime - timestampNumber) > tolerance) {
      throw new Error('Timestamp outside the tolerance zone');
    }

    // Generate expected signature
    const payloadForSigning = timestamp + '.' + payload;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadForSigning, 'utf8')
      .digest('hex');

    // Check if any of the signatures match
    const signatureFound = signatures.some((signature) => {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    });

    return signatureFound;
  } catch (error) {
    console.error('Stripe webhook signature verification error:', error);
    return false;
  }
}

/**
 * Verify GitHub-style webhook signature
 */
export function verifyGitHubWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const receivedSignature = signature.replace(/^sha256=/, '');

    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSignature}`),
      Buffer.from(signature),
    );
  } catch (error) {
    console.error('GitHub webhook signature verification error:', error);
    return false;
  }
}

/**
 * Verify Twilio-style webhook signature
 */
export function verifyTwilioWebhookSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): boolean {
  try {
    // Sort parameters and create query string
    const sortedKeys = Object.keys(params).sort();
    let data = url;

    for (const key of sortedKeys) {
      data += key + params[key];
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  } catch (error) {
    console.error('Twilio webhook signature verification error:', error);
    return false;
  }
}

/**
 * Generate webhook signature for outgoing webhooks
 */
export function generateWebhookSignature(
  body: string,
  secret: string,
  timestamp?: string,
): string {
  const ts = timestamp || Math.floor(Date.now() / 1000).toString();
  const payload = ts + '.' + body;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return `t=${ts},v1=${signature}`;
}

/**
 * Validate webhook timestamp to prevent replay attacks
 */
export function isValidWebhookTimestamp(
  timestamp: string,
  toleranceSeconds: number = 300, // 5 minutes
): boolean {
  try {
    const webhookTime = parseInt(timestamp, 10) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeDifference = Math.abs(currentTime - webhookTime);

    return timeDifference <= toleranceSeconds * 1000;
  } catch (error) {
    return false;
  }
}

/**
 * Rate limiting for webhook endpoints
 */
export class WebhookRateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000, // 1 minute
  ) {}

  isAllowed(identifier: string): { allowed: boolean; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const existingRequests = this.requests.get(identifier) || [];

    // Filter out requests outside the window
    const recentRequests = existingRequests.filter(
      (time) => time > windowStart,
    );

    // Check if we're within limits
    const allowed = recentRequests.length < this.maxRequests;

    if (allowed) {
      // Add this request
      recentRequests.push(now);
      this.requests.set(identifier, recentRequests);
    }

    return {
      allowed,
      resetTime: windowStart + this.windowMs,
    };
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }

  getStats(identifier: string): { requests: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const existingRequests = this.requests.get(identifier) || [];
    const recentRequests = existingRequests.filter(
      (time) => time > windowStart,
    );

    return {
      requests: recentRequests.length,
      resetTime: windowStart + this.windowMs,
    };
  }
}

/**
 * Webhook security headers validation
 */
export function validateWebhookHeaders(
  headers: Record<string, string | undefined>,
  requiredHeaders: string[],
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const header of requiredHeaders) {
    const headerValue = headers[header.toLowerCase()];
    if (!headerValue || headerValue.trim() === '') {
      missing.push(header);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize webhook payload to prevent injection attacks
 */
export function sanitizeWebhookPayload(payload: any): any {
  if (typeof payload === 'string') {
    // Basic string sanitization
    return payload
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeWebhookPayload(item));
  }

  if (typeof payload === 'object' && payload !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(payload)) {
      // Sanitize key names to prevent prototype pollution
      const sanitizedKey = key.replace(
        /^__|prototype|constructor$/i,
        `_${key}`,
      );
      sanitized[sanitizedKey] = sanitizeWebhookPayload(value);
    }
    return sanitized;
  }

  return payload;
}

/**
 * Webhook IP whitelist validation
 */
export class WebhookIPValidator {
  private allowedIPs: Set<string>;
  private allowedCIDRs: Array<{ network: string; mask: number }>;

  constructor(allowedIPs: string[] = []) {
    this.allowedIPs = new Set();
    this.allowedCIDRs = [];

    for (const ip of allowedIPs) {
      if (ip.includes('/')) {
        // CIDR notation
        const [network, mask] = ip.split('/');
        this.allowedCIDRs.push({ network, mask: parseInt(mask) });
      } else {
        // Single IP
        this.allowedIPs.add(ip);
      }
    }
  }

  isAllowed(clientIP: string): boolean {
    // Check direct IP match
    if (this.allowedIPs.has(clientIP)) {
      return true;
    }

    // Check CIDR ranges
    for (const { network, mask } of this.allowedCIDRs) {
      if (this.isInCIDR(clientIP, network, mask)) {
        return true;
      }
    }

    return false;
  }

  private isInCIDR(ip: string, network: string, mask: number): boolean {
    try {
      const ipInt = this.ipToInt(ip);
      const networkInt = this.ipToInt(network);
      const maskInt = ~(0xffffffff >>> mask);

      return (ipInt & maskInt) === (networkInt & maskInt);
    } catch {
      return false;
    }
  }

  private ipToInt(ip: string): number {
    return (
      ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet), 0) >>>
      0
    );
  }
}

// Export singleton rate limiter for webhook endpoints
export const webhookRateLimiter = new WebhookRateLimiter(100, 60000); // 100 requests per minute
